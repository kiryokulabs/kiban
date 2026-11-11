import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { EventsHeaderComponent } from '../activity/events-header.component';
import { AuthService } from '../auth/auth.service';
import { ServerImagesApiService } from '../server/server-images-api.service';
import type { ServerImageRow } from '../server/server-images.models';
import { ConfirmModalComponent } from '../shared/confirm-modal.component';
import { IconsComponent } from '../shared/icons.component';
import { ToastService } from '../shared/toast.service';
import { SystemMetricsPresenter } from '../system/system-metrics.presenter';

/** Explicit server maintenance; never automatically prunes images or other runtime data. */
@Component({
  selector: 'kiban-server-images-page',
  standalone: true,
  imports: [DatePipe, EventsHeaderComponent, ConfirmModalComponent, IconsComponent],
  template: `
    <div class="space-y-6">
      <kiban-events-header active="images" />
      <section class="card overflow-hidden" aria-labelledby="docker-images-heading">
        <div class="flex items-start justify-between gap-3 border-b kb-border px-5 py-3">
          <div>
            <h2 id="docker-images-heading" class="text-sm font-medium kb-text">Docker Images</h2>
            <p class="mt-1 text-xs c-muted">All images on this server, including images not managed by Kiban. Images referenced by running or stopped containers cannot be deleted.</p>
          </div>
          <button type="button" class="btn-icon shrink-0" title="Refresh images" aria-label="Refresh images" [disabled]="loading() || deleting() !== null" (click)="loadImages()">
            <kiban-icon name="refresh" [size]="14" />
          </button>
        </div>
        @if (loading()) {
          <p class="px-5 py-8 text-sm c-muted" role="status">Loading images...</p>
        } @else if (error()) {
          <p class="px-5 py-8 text-sm text-red-500" role="alert">{{ error() }}</p>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full min-w-[40rem] text-left text-xs">
              <thead class="border-b kb-border c-muted">
                <tr>
                  <th scope="col" class="px-5 py-3 font-medium">Image</th>
                  <th scope="col" class="px-5 py-3 font-medium">Service</th>
                  <th scope="col" class="px-5 py-3 font-medium">Size</th>
                  <th scope="col" class="px-5 py-3 font-medium">Created</th>
                  <th scope="col" class="px-5 py-3 font-medium">Usage</th>
                  @if (isAdmin()) { <th scope="col" class="px-5 py-3 text-right font-medium">Actions</th> }
                </tr>
              </thead>
              <tbody class="divide-y kb-border">
                @for (image of images(); track image.id + ':' + (image.tag ?? '')) {
                  <tr>
                    <td class="max-w-md px-5 py-4">
                      <p class="break-all font-medium kb-text">{{ image.tag ?? 'Untagged' }}</p>
                      <p class="mt-1 font-mono text-[11px] c-subtle" [title]="image.id">{{ image.id.slice(0, 19) }}</p>
                    </td>
                    <td class="px-5 py-4 kb-text">
                      @if (image.isKibanCore) {
                        <p class="flex items-center gap-1.5" title="Required by KibanOS. Removing this image may prevent KibanOS from starting.">KibanOS <span class="badge">Core</span></p>
                      }
                      @for (service of image.services; track service.id) {
                        <p class="break-words">{{ service.name }}</p>
                      }
                    </td>
                    <td class="whitespace-nowrap px-5 py-4 kb-text">{{ sizes.bytesLabel(image.sizeBytes) }}</td>
                    <td class="whitespace-nowrap px-5 py-4 c-muted">{{ image.createdAt | date:'medium' }}</td>
                    <td class="whitespace-nowrap px-5 py-4">
                      <span class="badge" [class.badge-success]="image.references > 0">{{ image.references > 0 ? 'In use' : 'Unused' }}</span>
                      @if (image.references > 0) { <p class="mt-1 c-muted">{{ image.references }} {{ image.references === 1 ? 'reference' : 'references' }}</p> }
                    </td>
                    @if (isAdmin()) {
                      <td class="px-5 py-4 text-right">
                        <button type="button" class="btn-danger btn gap-1.5" [disabled]="image.isKibanCore || image.references > 0 || deleting() !== null" [title]="image.isKibanCore ? 'Required by KibanOS. Removing this image may prevent KibanOS from starting.' : image.references > 0 ? 'Referenced images cannot be deleted' : 'Delete unused image'" (click)="requestDelete(image)">
                          <kiban-icon name="trash" [size]="12" />
                          {{ deleting() === image.id + ':' + (image.tag ?? '') ? 'Deleting...' : 'Delete' }}
                        </button>
                      </td>
                    }
                  </tr>
                } @empty {
                  <tr><td [attr.colspan]="isAdmin() ? 6 : 5" class="px-5 py-10 text-center c-muted">No images found.</td></tr>
                }
              </tbody>
            </table>
          </div>
        }
        <footer class="border-t kb-border px-5 py-3 text-xs c-muted">
          Tags sharing an ID share the same image data and usage. Sizes include shared layers; deleting an image may reclaim less space than shown. Only administrators can delete images.
        </footer>
      </section>
      @if (pendingDelete(); as image) {
        <kiban-confirm-modal
          [title]="image.tag ? 'Delete image tag' : 'Delete Docker image'"
          [message]="'Delete ' + (image.tag || image.id) + '? This affects the entire server. Other tags sharing the image are preserved. Space is only reclaimed when no remaining tag or container needs the data. Future installations may need to download it again.'"
          confirmLabel="Delete image"
          [destructive]="true"
          (cancel)="pendingDelete.set(null)"
          (confirm)="confirmDelete()"
        />
      }
    </div>
  `
})
export class ServerImagesPageComponent {
  private readonly api = inject(ServerImagesApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly sizes = new SystemMetricsPresenter();
  protected readonly isAdmin = computed(() => this.auth.user()?.role === 'admin');
  protected readonly images = signal<readonly ServerImageRow[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly pendingDelete = signal<ServerImageRow | null>(null);
  protected readonly deleting = signal<string | null>(null);

  public constructor() { this.loadImages(); }

  protected loadImages(): void {
    if (this.loading() || this.deleting()) return;
    this.loading.set(true);
    this.error.set('');
    this.api.list().subscribe({
      next: images => { this.images.set(images.flatMap<ServerImageRow>(image => image.tags.length > 0 ? image.tags.map(tag => ({ ...image, tag })) : [{ ...image, tag: null }])); this.loading.set(false); },
      error: (error: unknown) => { this.loading.set(false); this.error.set(this.errorMessage(error, 'Could not load Docker images. Check Docker availability and socket permissions.')); }
    });
  }

  protected requestDelete(image: ServerImageRow): void {
    if (!this.isAdmin() || image.isKibanCore || image.references > 0 || this.loading() || this.deleting()) return;
    this.pendingDelete.set(image);
  }

  protected confirmDelete(): void {
    const image = this.pendingDelete();
    if (!this.isAdmin() || !image || image.isKibanCore || image.references > 0 || this.deleting()) return;
    this.deleting.set(image.id + ':' + (image.tag ?? ''));
    this.pendingDelete.set(null);
    this.api.remove(image.id, image.tag ?? undefined).subscribe({
      next: () => { this.deleting.set(null); this.toast.success(image.tag ? 'Image tag deleted.' : 'Image deleted.'); this.loadImages(); },
      error: (error: unknown) => { this.deleting.set(null); this.toast.error(this.errorMessage(error, 'Could not delete the image. Refresh the list and try again.')); }
    });
  }

  private errorMessage(error: unknown, fallback: string): string {
    const body: unknown = error instanceof HttpErrorResponse ? error.error : null;
    return body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' ? body.message : fallback;
  }
}
