import { SlicePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { ProjectSummary } from '../projects/projects.models';
import { ProjectsService } from '../projects/projects.service';
import { ConfirmModalComponent } from '../shared/confirm-modal.component';
import { ModalComponent } from '../shared/modal.component';
import { IconsComponent } from '../shared/icons.component';

@Component({
  selector: 'kiban-projects-page',
  standalone: true,
  imports: [FormsModule, RouterLink, SlicePipe, ModalComponent, ConfirmModalComponent, IconsComponent],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2.5">
            <div class="grid h-7 w-7 place-items-center rounded-lg bg-brand/20 text-brand-light">
              <kiban-icon name="projects" [size]="15" />
            </div>
            <h1 class="text-xl font-semibold kb-text">Projects</h1>
          </div>
          <p class="mt-0.5 text-sm c-muted">Manage your infrastructure projects.</p>
        </div>
        <button class="btn-primary btn gap-1.5" type="button" (click)="openCreateModal()">
          <kiban-icon name="plus" [size]="14" />
          New Project
        </button>
      </div>

      @if (message()) {
        <div class="card-subtle flex items-center gap-2.5 px-4 py-3">
          <kiban-icon name="info" [size]="14" class="c-muted shrink-0" />
          <p class="text-sm c-muted">{{ message() }}</p>
        </div>
      }

      @if (projects().length === 0 && !loading()) {
        <div class="card flex flex-col items-center justify-center py-16 text-center">
          <div class="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-brand/10 text-brand-light">
            <kiban-icon name="projects" [size]="24" />
          </div>
          <p class="text-sm font-medium kb-text">No projects yet</p>
          <p class="mt-1 text-xs c-muted">Create your first project to get started.</p>
          <button class="btn-primary btn gap-1.5 mt-5" type="button" (click)="openCreateModal()">
            <kiban-icon name="plus" [size]="14" />
            Create Project
          </button>
        </div>
      } @else {
        <div class="card overflow-hidden">
          <!-- Table header -->
          <div class="hidden md:grid grid-cols-[2fr_1.5fr_100px_140px_160px] gap-4 border-b kb-border px-5 py-2.5">
            <span class="text-[11px] font-medium uppercase tracking-wider c-subtle">Name</span>
            <span class="text-[11px] font-medium uppercase tracking-wider c-subtle">Description</span>
            <span class="text-[11px] font-medium uppercase tracking-wider c-subtle">Envs</span>
            <span class="text-[11px] font-medium uppercase tracking-wider c-subtle">Services</span>
            <span class="text-[11px] font-medium uppercase tracking-wider c-subtle">Actions</span>
          </div>
          <!-- Table rows -->
          @for (project of projects(); track project.id) {
            <div class="grid grid-cols-1 md:grid-cols-[2fr_1.5fr_100px_140px_160px] gap-3 border-b kb-border px-5 py-3.5 last:border-b-0 hover:bg-hover/50 transition-colors">
              <!-- Mobile: name + date | Desktop: name -->
              <div class="md:flex md:items-center">
                <a [routerLink]="['/projects', project.id]" class="flex items-center gap-2.5 group cursor-pointer">
                  <div class="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-brand/10 text-brand-light group-hover:bg-brand/20 transition-colors">
                    <kiban-icon name="folder" [size]="14" />
                  </div>
                  <div>
                    <p class="text-sm font-medium kb-text group-hover:text-brand-light transition-colors">{{ project.name }}</p>
                    <p class="text-[11px] c-subtle md:hidden">{{ project.createdAt | slice:0:10 }}</p>
                  </div>
                </a>
              </div>
              <!-- Description -->
              <p class="text-xs c-muted hidden md:block truncate">{{ project.description || '—' }}</p>
              <!-- Environments count -->
              <div class="flex items-center gap-1.5">
                <kiban-icon name="server" [size]="12" class="c-subtle shrink-0" />
                <span class="text-xs c-muted">{{ project.environmentCount }}</span>
              </div>
              <!-- Services health -->
              <div class="flex items-center gap-2 text-xs">
                <span class="status-dot shrink-0" [class.status-dot-success]="project.healthStatus === 'healthy'" [class.status-dot-danger]="project.healthStatus === 'degraded'" [class.status-dot-muted]="project.healthStatus === 'empty'"></span>
                <span class="c-muted">{{ project.runningServiceCount }}/{{ project.serviceCount }} running</span>
              </div>
              <!-- Actions -->
              <div class="flex items-center gap-1.5">
                <a [routerLink]="['/projects', project.id]" class="btn-secondary btn gap-1 text-xs">
                  <kiban-icon name="eye" [size]="12" />
                  <span class="hidden sm:inline">Open</span>
                </a>
                <button class="btn-ghost btn text-xs" type="button" (click)="openEditModal(project)">
                  <kiban-icon name="edit" [size]="12" />
                </button>
                <button class="btn-danger btn text-xs" type="button" (click)="requestDeleteProject(project)">
                  <kiban-icon name="trash" [size]="12" />
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- Create/Edit modal -->
    @if (modalOpen()) {
      <kiban-modal [title]="editingProject() ? 'Edit Project' : 'Create Project'" (close)="closeModal()">
        <form (ngSubmit)="submitProject()">
          <label class="block text-xs"><span class="mb-1.5 block c-muted">Project Name</span><input name="name" [(ngModel)]="name" class="input" required maxlength="100" /></label>
          <label class="mt-3 block text-xs"><span class="mb-1.5 block c-muted">Description</span><textarea name="description" [(ngModel)]="description" class="input min-h-[5rem]"></textarea></label>
          <div class="mt-5 flex justify-end gap-2">
            <button class="btn-ghost btn" type="button" (click)="closeModal()">Cancel</button>
            <button class="btn-primary btn" type="submit">{{ editingProject() ? 'Save' : 'Create' }}</button>
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
