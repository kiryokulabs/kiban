import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { EnvironmentItem, ProjectDetails } from '../projects/projects.models';
import { EnvironmentCardPresenter } from '../projects/environment-card.presenter';
import { ProjectsService } from '../projects/projects.service';
import { ConfirmModalComponent } from '../shared/confirm-modal.component';
import { ModalComponent } from '../shared/modal.component';

@Component({
  selector: 'kiban-project-details-page',
  standalone: true,
  imports: [FormsModule, RouterLink, ConfirmModalComponent, ModalComponent],
  template: `
    <a routerLink="/projects" class="text-sm kb-muted">← Projects</a>
    @if (project()) {
      <div class="mt-6 flex items-start justify-between gap-6">
        <div><h1 class="text-3xl font-semibold tracking-tight kb-text">{{ project()?.name }}</h1><p class="mt-3 kb-muted">{{ project()?.description || 'No description' }}</p></div>
        <button type="button" class="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950" (click)="openEnvironmentModal()">Add Environment</button>
      </div>
      @if (message()) { <p class="mt-5 rounded-lg border kb-border kb-panel px-3 py-2 text-sm kb-muted">{{ message() }}</p> }
      <div class="mt-8 grid gap-4 lg:grid-cols-3">
        @for (environment of project()?.environments; track environment.id) {
          <article class="rounded-xl border kb-border kb-panel p-5">
            <div class="flex items-start justify-between gap-4">
              <div><h2 class="font-medium kb-text">{{ environment.name }}</h2><p class="mt-1 text-xs uppercase tracking-wide kb-muted">{{ environment.type }}</p></div>
              <span class="rounded-full border kb-border px-2 py-1 text-xs kb-muted">{{ environment.status }}</span>
            </div>
            <p class="mt-4 text-sm leading-6 kb-muted">{{ environmentCardDescription(environment) }}</p>
            <div class="mt-6 grid gap-2 text-sm kb-muted">
              <div class="rounded-lg border kb-border p-3">Services — future</div>
              <div class="rounded-lg border kb-border p-3">Secrets — future</div>
              <div class="rounded-lg border kb-border p-3">Variables — future</div>
              <div class="rounded-lg border kb-border p-3">Backups — future</div>
              <div class="rounded-lg border kb-border p-3">Logs — future</div>
            </div>
            @if (environment.type === 'custom') {
              <button type="button" class="mt-5 rounded-lg border border-red-900/60 px-3 py-2 text-sm text-red-300" (click)="requestDeleteEnvironment(environment)">Delete Environment</button>
            }
          </article>
        }
      </div>

      @if (environmentModalOpen()) {
        <kiban-modal title="Create Environment" (close)="closeEnvironmentModal()">
          <form (ngSubmit)="createEnvironment()">
            <p class="mb-5 text-sm leading-6 kb-muted">Create an isolated custom environment for this project. Default environments are managed by Kiban and cannot be deleted.</p>
            <label class="block text-sm"><span class="mb-2 block kb-muted">Environment Name</span><input name="environmentName" [(ngModel)]="environmentName" placeholder="QA, Demo, Preview..." class="w-full rounded-lg border kb-border bg-surface px-3 py-2 kb-text outline-none" required maxlength="100" /></label>
            <label class="mt-4 block text-sm"><span class="mb-2 block kb-muted">Description</span><textarea name="environmentDescriptionText" [(ngModel)]="environmentDescriptionText" placeholder="What is this environment for?" class="min-h-24 w-full rounded-lg border kb-border bg-surface px-3 py-2 kb-text outline-none"></textarea></label>
            <div class="mt-6 flex justify-end gap-3">
              <button class="rounded-lg border kb-border px-4 py-2 text-sm kb-muted transition hover:kb-text" type="button" (click)="closeEnvironmentModal()">Cancel</button>
              <button class="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60" type="submit" [disabled]="!environmentName.trim()">Create</button>
            </div>
          </form>
        </kiban-modal>
      }
      @if (environmentPendingDelete()) {
        <kiban-confirm-modal
          title="Delete environment"
          [message]="deleteEnvironmentMessage()"
          confirmLabel="Delete environment"
          [destructive]="true"
          (cancel)="cancelDeleteEnvironment()"
          (confirm)="confirmDeleteEnvironment()"
        />
      }

    } @else {
      <div class="mt-8 rounded-xl border kb-border kb-panel p-8 kb-muted">Loading project…</div>
    }
  `
})
export class ProjectDetailsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly projectsService = inject(ProjectsService);
  private readonly environmentPresenter = new EnvironmentCardPresenter();
  protected readonly project = signal<ProjectDetails | null>(null);
  protected readonly message = signal<string | null>(null);
  protected readonly environmentPendingDelete = signal<EnvironmentItem | null>(null);
  protected readonly environmentModalOpen = signal(false);
  protected environmentName = '';
  protected environmentDescriptionText = '';
  private readonly projectId: string | null;

  public constructor() {
    this.projectId = this.route.snapshot.paramMap.get('id');
    this.loadProject();
  }

  protected loadProject(): void {
    if (this.projectId) {
      this.projectsService.getProject(this.projectId).subscribe({ next: (project) => this.project.set(project), error: () => this.message.set('Could not load project.') });
    }
  }

  protected openEnvironmentModal(): void {
    this.environmentName = '';
    this.environmentDescriptionText = '';
    this.environmentModalOpen.set(true);
  }

  protected closeEnvironmentModal(): void {
    this.environmentModalOpen.set(false);
  }

  protected environmentCardDescription(environment: EnvironmentItem): string {
    return this.environmentPresenter.description(environment);
  }

  protected createEnvironment(): void {
    if (!this.projectId) return;
    const name = this.environmentName.trim();
    if (!name) {
      this.message.set('Environment name is required.');
      return;
    }
    this.projectsService.createEnvironment(this.projectId, { name, description: this.environmentDescriptionText.trim() || null }).subscribe({ next: () => { this.environmentName = ''; this.environmentDescriptionText = ''; this.environmentModalOpen.set(false); this.message.set(null); this.loadProject(); }, error: () => this.message.set('Could not create environment. Check the name and try again.') });
  }

  protected requestDeleteEnvironment(environment: EnvironmentItem): void {
    if (environment.type !== 'custom') {
      return;
    }
    this.environmentPendingDelete.set(environment);
  }

  protected cancelDeleteEnvironment(): void {
    this.environmentPendingDelete.set(null);
  }

  protected deleteEnvironmentMessage(): string {
    const environment = this.environmentPendingDelete();
    return environment ? `Delete environment "${environment.name}"? This cannot be undone.` : '';
  }

  protected confirmDeleteEnvironment(): void {
    const environment = this.environmentPendingDelete();
    if (!this.projectId || !environment || environment.type !== 'custom') {
      return;
    }
    this.projectsService.deleteEnvironment(this.projectId, environment.id).subscribe({ next: () => { this.environmentPendingDelete.set(null); this.loadProject(); }, error: () => this.message.set('Could not delete environment.') });
  }
}
