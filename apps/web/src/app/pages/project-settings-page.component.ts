import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { ProjectSettings } from '../projects/projects.models';
import { ProjectsService } from '../projects/projects.service';
import { IconsComponent } from '../shared/icons.component';
import { SkeletonComponent } from '../shared/skeleton.component';

@Component({
  selector: 'kiban-project-settings-page',
  standalone: true,
  imports: [FormsModule, RouterLink, IconsComponent, SkeletonComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center gap-3 text-sm">
        <a [routerLink]="['/projects', projectId]" class="btn-ghost btn gap-1.5">
          <kiban-icon name="arrow-left" [size]="14" />
          Project
        </a>
      </div>

      @if (settings()) {
        <div class="card p-5">
          <div class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div class="flex min-w-0 items-center gap-3">
              <div class="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border kb-border bg-brand/10 text-brand-light">
                @if (settings()?.hasImage && !imageFailed()) {
                  <img [src]="projectImageUrl()" alt="Project image" class="h-full w-full object-cover" (error)="imageFailed.set(true)" />
                } @else {
                  <kiban-icon name="projects" [size]="22" />
                }
              </div>
              <div class="min-w-0">
                <h1 class="truncate text-xl font-semibold kb-text">Project settings</h1>
                <p class="mt-1 text-sm c-muted">{{ settings()?.name }}</p>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm sm:min-w-64">
              <div class="rounded-lg border kb-border p-3">
                <span class="block text-xs c-muted">Environments</span>
                <span class="mt-1 block text-lg font-semibold kb-text">{{ settings()?.environmentCount }}</span>
              </div>
              <div class="rounded-lg border kb-border p-3">
                <span class="block text-xs c-muted">Installed services</span>
                <span class="mt-1 block text-lg font-semibold kb-text">{{ settings()?.serviceCount }}</span>
              </div>
            </div>
          </div>
        </div>

        @if (message()) {
          <div class="card-subtle flex items-center gap-2.5 px-4 py-3">
            <kiban-icon name="info" [size]="14" class="c-muted shrink-0" />
            <p class="text-sm c-muted">{{ message() }}</p>
          </div>
        }

        <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <form class="card p-5" (ngSubmit)="saveProject()">
            <h2 class="text-sm font-semibold kb-text">Project information</h2>
            <p class="mt-1 text-xs c-muted">Update the public name and description for this project.</p>

            <label class="mt-5 block text-xs">
              <span class="mb-1.5 block c-muted">Title</span>
              <input name="projectName" [(ngModel)]="projectName" class="input" required maxlength="100" />
            </label>
            <label class="mt-3 block text-xs">
              <span class="mb-1.5 block c-muted">Description</span>
              <textarea name="projectDescription" [(ngModel)]="projectDescription" class="input min-h-[7rem]"></textarea>
            </label>
            <div class="mt-5 flex justify-end">
              <button class="btn-primary btn" type="submit" [disabled]="saving() || !projectName.trim()">
                {{ saving() ? 'Saving…' : 'Save changes' }}
              </button>
            </div>
          </form>

          <div class="card p-5">
            <h2 class="text-sm font-semibold kb-text">Project image</h2>
            <p class="mt-1 text-xs leading-5 c-muted">Upload a PNG, JPG, WebP or SVG image. If no image exists, Kiban uses the default project icon.</p>

            <div class="mt-5 grid place-items-center rounded-xl border border-dashed kb-border p-6">
              <div class="grid h-24 w-24 place-items-center overflow-hidden rounded-2xl border kb-border bg-brand/10 text-brand-light">
                @if (settings()?.hasImage && !imageFailed()) {
                  <img [src]="projectImageUrl()" alt="Project image preview" class="h-full w-full object-cover" (error)="imageFailed.set(true)" />
                } @else {
                  <kiban-icon name="projects" [size]="32" />
                }
              </div>
            </div>

            <label class="mt-4 block text-xs">
              <span class="mb-1.5 block c-muted">Image file</span>
              <input class="input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" (change)="onImageSelected($event)" />
            </label>
          </div>
        </div>
      } @else {
        <div class="card p-5 space-y-3">
          <kiban-skeleton width="35%" height="1.25rem" />
          <kiban-skeleton width="55%" height="0.875rem" />
          <kiban-skeleton width="100%" height="12rem" />
        </div>
      }
    </div>
  `
})
export class ProjectSettingsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly projects = inject(ProjectsService);
  protected readonly projectId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly settings = signal<ProjectSettings | null>(null);
  protected readonly message = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly imageFailed = signal(false);
  private readonly imageVersion = signal(Date.now());
  protected projectName = '';
  protected projectDescription = '';

  public constructor() { this.load(); }

  protected load(): void {
    if (!this.projectId) return;
    this.projects.getProjectSettings(this.projectId).subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.projectName = settings.name;
        this.projectDescription = settings.description ?? '';
        this.imageFailed.set(false);
      },
      error: () => this.message.set('Could not load project settings.')
    });
  }

  protected saveProject(): void {
    const name = this.projectName.trim();
    if (!this.projectId || !name) return;
    this.saving.set(true);
    this.projects.updateProject(this.projectId, { name, description: this.projectDescription.trim() || null }).subscribe({
      next: () => { this.saving.set(false); this.message.set('Project updated.'); this.load(); },
      error: () => { this.saving.set(false); this.message.set('Could not update project.'); }
    });
  }

  protected onImageSelected(event: Event): void {
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    const file = input?.files?.[0];
    if (!file || !this.projectId) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const dataBase64 = result.includes(',') ? result.split(',')[1] ?? '' : result;
      this.projects.saveProjectImage(this.projectId, { contentType: file.type, dataBase64 }).subscribe({
        next: () => { this.message.set('Project image updated.'); this.imageFailed.set(false); this.imageVersion.set(Date.now()); this.load(); },
        error: () => this.message.set('Could not update project image.')
      });
    };
    reader.readAsDataURL(file);
  }

  protected projectImageUrl(): string {
    return `${this.projects.projectImageUrl(this.projectId)}?v=${this.imageVersion()}`;
  }
}
