import { SlicePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ProjectSummary } from '../projects/projects.models';
import { ProjectsService } from '../projects/projects.service';
import { IconsComponent } from '../shared/icons.component';

@Component({
  selector: 'kiban-home-page',
  standalone: true,
  imports: [RouterLink, SlicePipe, IconsComponent],
  template: `
    <div class="space-y-6">
      <!-- Welcome -->
      <div>
        <div class="flex items-center gap-2.5">
          <div class="grid h-7 w-7 place-items-center rounded-lg bg-brand/20 text-brand-light">
            <kiban-icon name="home" [size]="15" />
          </div>
          <div>
            <h1 class="text-xl font-semibold kb-text">Welcome to Kiban</h1>
            <p class="mt-0.5 text-sm c-muted">Your projects and environments at a glance.</p>
          </div>
        </div>
      </div>

      <!-- Dashboard stats -->
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="card p-4">
          <div class="flex items-center gap-2.5">
            <div class="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand-light">
              <kiban-icon name="projects" [size]="16" />
            </div>
            <div>
              <p class="text-2xl font-semibold kb-text">{{ projects().length }}</p>
              <p class="text-xs c-muted">Projects</p>
            </div>
          </div>
        </div>
        <div class="card p-4">
          <div class="flex items-center gap-2.5">
            <div class="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand-light">
              <kiban-icon name="server" [size]="16" />
            </div>
            <div>
              <p class="text-2xl font-semibold kb-text">{{ totalEnvironments() }}</p>
              <p class="text-xs c-muted">Environments</p>
            </div>
          </div>
        </div>
        <div class="card p-4">
          <div class="flex items-center gap-2.5">
            <div class="grid h-8 w-8 place-items-center rounded-lg bg-success/10" style="color: var(--color-success)">
              <kiban-icon name="box" [size]="16" />
            </div>
            <div>
              <p class="text-2xl font-semibold kb-text">{{ totalRunning() }}</p>
              <p class="text-xs c-muted">Running</p>
            </div>
          </div>
        </div>
        <div class="card p-4">
          <div class="flex items-center gap-2.5">
            <div class="grid h-8 w-8 place-items-center rounded-lg bg-danger/10" style="color: var(--color-danger)">
              <kiban-icon name="box" [size]="16" />
            </div>
            <div>
              <p class="text-2xl font-semibold kb-text">{{ totalDegraded() }}</p>
              <p class="text-xs c-muted">Degraded</p>
            </div>
          </div>
        </div>
      </div>

      @if (projects().length === 0) {
        <div class="card flex flex-col items-center justify-center py-12 text-center">
          <div class="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand-light">
            <kiban-icon name="projects" [size]="20" />
          </div>
          <p class="text-sm font-medium kb-text">No projects yet</p>
          <p class="mt-1 text-xs c-muted">Create a project to get started with Kiban.</p>
          <a routerLink="/projects" class="btn-primary btn gap-1.5 mt-4">
            <kiban-icon name="plus" [size]="14" />
            Go to Projects
          </a>
        </div>
      } @else {
        <div>
          <h2 class="text-sm font-semibold kb-text mb-3">Recent Projects</h2>
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            @for (project of projects(); track project.id) {
              <a [routerLink]="['/projects', project.id]" class="card p-4 transition hover:border-brand/30 hover:bg-hover/30 group">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <div class="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-brand/10 text-brand-light group-hover:bg-brand/20 transition-colors">
                        <kiban-icon name="folder" [size]="13" />
                      </div>
                      <h3 class="text-sm font-medium kb-text truncate group-hover:text-brand-light transition-colors">{{ project.name }}</h3>
                    </div>
                    <p class="mt-1.5 text-xs c-muted line-clamp-2">{{ project.description || 'No description' }}</p>
                  </div>
                </div>
                <div class="mt-4 flex items-center justify-between text-xs c-subtle border-t kb-border pt-3">
                  <span>{{ project.environmentCount }} environments</span>
                  <span>{{ project.createdAt | slice:0:10 }}</span>
                </div>
                <div class="mt-2 flex items-center gap-2 text-xs">
                  <span class="status-dot" [class.status-dot-success]="project.healthStatus === 'healthy'" [class.status-dot-danger]="project.healthStatus === 'degraded'" [class.status-dot-muted]="project.healthStatus === 'empty'"></span>
                  <span class="c-muted">{{ project.runningServiceCount }}/{{ project.serviceCount }} services running</span>
                </div>
              </a>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class HomePageComponent {
  private readonly projectsService = inject(ProjectsService);
  protected readonly projects = signal<readonly ProjectSummary[]>([]);

  protected readonly totalEnvironments = () => this.projects().reduce((acc, p) => acc + p.environmentCount, 0);
  protected readonly totalRunning = () => this.projects().reduce((acc, p) => acc + p.runningServiceCount, 0);
  protected readonly totalDegraded = () => this.projects().filter((p) => p.healthStatus === 'degraded').length;

  public constructor() {
    this.projectsService.listProjects().subscribe({ next: (projects) => this.projects.set(projects), error: () => undefined });
  }
}
