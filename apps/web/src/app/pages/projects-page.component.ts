import { SlicePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { ProjectSummary } from '../projects/projects.models';
import { ProjectsService } from '../projects/projects.service';
import { ConfirmModalComponent } from '../shared/confirm-modal.component';
import { ModalComponent } from '../shared/modal.component';

@Component({
  selector: 'kiban-projects-page',
  standalone: true,
  imports: [FormsModule, RouterLink, SlicePipe, ModalComponent, ConfirmModalComponent],
  template: `
    <div class="flex items-center justify-between">
      <div><h1 class="text-3xl font-semibold tracking-tight kb-text">Projects</h1></div>
      <button class="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950" type="button" (click)="openCreateModal()">Create Project</button>
    </div>

    @if (message()) {
      <p class="mt-6 rounded-lg border kb-border kb-panel px-3 py-2 text-sm kb-muted">{{ message() }}</p>
    }

    @if (projects().length === 0 && !loading()) {
      <div class="mt-8 rounded-xl border kb-border kb-panel p-10 text-center">
        <p class="kb-muted">No projects yet</p>
        <button class="mt-5 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950" type="button" (click)="openCreateModal()">Create Project</button>
      </div>
    } @else {
      <div class="mt-8 overflow-hidden rounded-xl border kb-border kb-panel">
        <div class="grid grid-cols-[1.2fr_1fr_150px_180px_180px] gap-4 border-b kb-border px-6 py-3 text-xs uppercase tracking-wide kb-muted">
          <span>Name</span><span>Description</span><span>Environments</span><span>Services</span><span>Actions</span>
        </div>
        @for (project of projects(); track project.id) {
          <div class="grid grid-cols-[1.2fr_1fr_150px_180px_180px] items-center gap-4 border-b kb-border px-6 py-4 last:border-b-0">
            <div><p class="font-medium kb-text">{{ project.name }}</p><p class="mt-1 text-xs kb-muted">{{ project.createdAt | slice:0:10 }}</p></div>
            <p class="text-sm kb-muted">{{ project.description || '—' }}</p>
            <p class="text-sm kb-muted">{{ project.environmentCount }}</p>
            <div class="flex items-center gap-2 text-sm">
              <span class="h-2.5 w-2.5 rounded-full" [class.bg-emerald-500]="project.healthStatus === 'healthy'" [class.bg-red-500]="project.healthStatus === 'degraded'" [class.bg-zinc-500]="project.healthStatus === 'empty'"></span>
              <span class="kb-muted">{{ project.runningServiceCount }}/{{ project.serviceCount }} running</span>
            </div>
            <div class="flex gap-2">
              <a [routerLink]="['/projects', project.id]" class="rounded-lg border kb-border px-3 py-2 text-sm kb-muted">Open</a>
              <button class="rounded-lg border kb-border px-3 py-2 text-sm kb-muted" type="button" (click)="openEditModal(project)">Edit</button>
              <button class="rounded-lg border border-red-900/60 px-3 py-2 text-sm text-red-300" type="button" (click)="requestDeleteProject(project)">Delete</button>
            </div>
          </div>
        }
      </div>
    }

    @if (modalOpen()) {
      <kiban-modal [title]="editingProject() ? 'Edit Project' : 'Create Project'" (close)="closeModal()">
        <form (ngSubmit)="submitProject()">
          <label class="block text-sm"><span class="mb-2 block kb-muted">Project Name</span><input name="name" [(ngModel)]="name" class="w-full rounded-lg border kb-border bg-surface px-3 py-2 kb-text outline-none" required maxlength="100" /></label>
          <label class="mt-4 block text-sm"><span class="mb-2 block kb-muted">Description</span><textarea name="description" [(ngModel)]="description" class="min-h-24 w-full rounded-lg border kb-border bg-surface px-3 py-2 kb-text outline-none"></textarea></label>
          <div class="mt-6 flex justify-end gap-3">
            <button class="rounded-lg border kb-border px-4 py-2 text-sm kb-muted transition hover:kb-text" type="button" (click)="closeModal()">Cancel</button>
            <button class="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950" type="submit">{{ editingProject() ? 'Save' : 'Create' }}</button>
          </div>
        </form>
      </kiban-modal>
    }

    @if (projectPendingDelete()) {
      <kiban-confirm-modal
        title="Delete project"
        [message]="deleteProjectMessage()"
        confirmLabel="Delete project"
        [destructive]="true"
        (cancel)="cancelDeleteProject()"
        (confirm)="confirmDeleteProject()"
      />
    }
  `
})
export class ProjectsPageComponent {
  private readonly projectsService = inject(ProjectsService);
  private readonly router = inject(Router);

  protected readonly projects = signal<readonly ProjectSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly message = signal<string | null>(null);
  protected readonly modalOpen = signal(false);
  protected readonly editingProject = signal<ProjectSummary | null>(null);
  protected readonly projectPendingDelete = signal<ProjectSummary | null>(null);

  protected name = '';
  protected description = '';

  public constructor() {
    this.loadProjects();
  }

  protected loadProjects(): void {
    this.loading.set(true);
    this.projectsService.listProjects().subscribe({ next: (projects) => { this.projects.set(projects); this.loading.set(false); }, error: () => { this.message.set('Could not load projects.'); this.loading.set(false); } });
  }

  protected openCreateModal(): void {
    this.editingProject.set(null);
    this.name = '';
    this.description = '';
    this.modalOpen.set(true);
  }

  protected openEditModal(project: ProjectSummary): void {
    this.editingProject.set(project);
    this.name = project.name;
    this.description = project.description ?? '';
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    this.modalOpen.set(false);
  }

  protected submitProject(): void {
    const editing = this.editingProject();
    const payload = { name: this.name, description: this.description || null };
    const request = editing ? this.projectsService.updateProject(editing.id, payload) : this.projectsService.createProject(payload);
    request.subscribe({ next: (project) => { this.closeModal(); this.loadProjects(); if (!editing) void this.router.navigate(['/projects', project.id]); }, error: () => this.message.set('Could not save project.') });
  }

  protected requestDeleteProject(project: ProjectSummary): void {
    this.projectPendingDelete.set(project);
  }

  protected cancelDeleteProject(): void {
    this.projectPendingDelete.set(null);
  }

  protected deleteProjectMessage(): string {
    const project = this.projectPendingDelete();
    return project ? `Delete project "${project.name}"? This will delete all environments and cannot be undone.` : '';
  }

  protected confirmDeleteProject(): void {
    const project = this.projectPendingDelete();
    if (!project) {
      return;
    }
    this.projectsService.deleteProject(project.id).subscribe({ next: () => { this.projectPendingDelete.set(null); this.loadProjects(); }, error: () => this.message.set('Could not delete project.') });
  }
}
