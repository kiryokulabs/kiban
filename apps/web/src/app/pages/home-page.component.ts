import { DatePipe, SlicePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ProjectSummary } from '../projects/projects.models';
import { ActivityApiService } from '../activity/activity-api.service';
import { ACTIVITY_PRESENTATION, type ActivityEvent } from '../activity/activity.models';
import { ProjectsService } from '../projects/projects.service';
import { IconsComponent } from '../shared/icons.component';

@Component({
  selector: 'kiban-home-page',
  standalone: true,
  imports: [RouterLink, SlicePipe, IconsComponent, DatePipe],
  template: `
    <div class="space-y-6">
      <!-- Welcome -->
      <div>
        <div class="flex items-center gap-2.5">
          <div class="grid h-7 w-7 place-items-center rounded-lg bg-brand/20 text-brand-light">
            <kiban-icon name="home" [size]="15" />
          </div>
          <div>
            <h1 class="text-xl font-semibold kb-text">Dashboard</h1>
          </div>
        </div>
      </div>

      <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
      <div class="min-w-0 space-y-6">
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
          <h2 class="text-sm font-semibold kb-text mb-3">Projects</h2>
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            @for (project of projects(); track project.id) {
              <a [routerLink]="['/projects', project.id]" class="card p-4 transition hover:border-brand/30 hover:bg-hover/30 group">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <div class="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-md bg-brand/10 text-brand-light group-hover:bg-brand/20 transition-colors">
                        @if (!projectImageFailed(project.id)) {
                          <img [src]="projectImageUrl(project.id)" alt="Project image" class="h-full w-full object-cover" (error)="markProjectImageFailed(project.id)" />
                        } @else {
                          <kiban-icon name="folder" [size]="13" />
                        }
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

      <aside class="card min-w-0 overflow-hidden" aria-labelledby="recent-activity-heading">
        <div class="flex items-center justify-between gap-3 border-b kb-border px-5 py-3">
          <div class="flex items-center gap-2">
            <kiban-icon name="activity" [size]="14" class="c-muted" />
            <h2 id="recent-activity-heading" class="text-sm font-medium kb-text">Recent activity</h2>
          </div>
        </div>
        @if (activityLoading()) {
          <p class="px-5 py-4 text-xs c-muted" role="status">Loading recent activity...</p>
        } @else if (activityError()) {
          <p class="px-5 py-4 text-xs text-red-500" role="alert">Could not load recent activity. Reload the page to try again.</p>
        } @else {
          <ol class="divide-y kb-border">
            @for (event of activity(); track event.id) {
              <li class="flex items-start gap-3 px-5 py-4">
                <div class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand-light">
                  <kiban-icon [name]="activityPresentation[event.action].icon" [size]="15" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="break-words text-sm font-medium kb-text">{{ event.resourceName }} {{ activityPresentation[event.action].verb }}</p>
                  <p class="mt-1 break-words text-xs c-muted">{{ event.projectName }}@if (event.environmentName) { / {{ event.environmentName }} }</p>
                  <!-- <p class="mt-2 truncate text-xs c-subtle" [title]="event.actorEmail">{{ event.actorEmail }}</p>
                  <p class="mt-1 text-[11px] c-subtle">{{ event.createdAt | date:'medium' }}</p> -->
                </div>
              </li>
            } @empty {
              <li class="px-5 py-8 text-center text-xs c-muted">No activity yet.</li>
            }
          </ol>
        }
        <footer class="border-t kb-border px-5 py-3">
          <a routerLink="/events" class="inline-flex items-center gap-1.5 text-xs text-brand-light hover:underline">
            View all events
            <kiban-icon name="chevron-right" [size]="12" />
          </a>
        </footer>
      </aside>
      </div>
    </div>
  `
})
export class HomePageComponent {
  private readonly projectsService = inject(ProjectsService);
  private readonly activityApi = inject(ActivityApiService);
  protected readonly activityPresentation = ACTIVITY_PRESENTATION;
  protected readonly activity = signal<readonly ActivityEvent[]>([]);
  protected readonly activityLoading = signal(true);
  protected readonly activityError = signal(false);
  protected readonly projects = signal<readonly ProjectSummary[]>([]);
  private readonly failedProjectImages = signal<ReadonlySet<string>>(new Set());

  protected readonly totalEnvironments = () => this.projects().reduce((acc, p) => acc + p.environmentCount, 0);
  protected readonly totalRunning = () => this.projects().reduce((acc, p) => acc + p.runningServiceCount, 0);
  protected readonly totalDegraded = () => this.projects().filter((p) => p.healthStatus === 'degraded').length;

  protected projectImageUrl(projectId: string): string {
    return this.projectsService.projectImageUrl(projectId);
  }

  protected projectImageFailed(projectId: string): boolean {
    return this.failedProjectImages().has(projectId);
  }

  protected markProjectImageFailed(projectId: string): void {
    this.failedProjectImages.set(new Set([...this.failedProjectImages(), projectId]));
  }

  public constructor() {
    this.activityApi.recent().subscribe({
      next: events => { this.activity.set(events); this.activityLoading.set(false); },
      error: () => { this.activityError.set(true); this.activityLoading.set(false); }
    });
    this.projectsService.listProjects().subscribe({ next: (projects) => { this.projects.set(projects); this.failedProjectImages.set(new Set()); }, error: () => undefined });
  }
}
