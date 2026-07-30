import { SlicePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ProjectSummary } from '../projects/projects.models';
import { ProjectsService } from '../projects/projects.service';

@Component({
  selector: 'kiban-home-page',
  standalone: true,
  imports: [RouterLink, SlicePipe],
  template: `
    <div class="max-w-full">
      <div class="flex items-center justify-between gap-6"><div>
        <h1 class="text-3xl font-semibold tracking-tight kb-text">Welcome to Kiban</h1>
        <p class="mt-3 kb-muted">Your projects and environments at a glance.</p>
      </div>
      </div>

      @if (projects().length === 0) {
        <div class="mt-8 rounded-xl border kb-border kb-panel p-8 text-center kb-muted">No projects yet</div>
      } @else {
        <section class="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          @for (project of projects(); track project.id) {
            <a [routerLink]="['/projects', project.id]" class="rounded-xl border kb-border kb-panel p-5 transition-colors hover:opacity-90">
              <h2 class="font-medium kb-text">{{ project.name }}</h2>
              <p class="mt-2 text-sm kb-muted">{{ project.description || 'No description' }}</p>
              <div class="mt-5 flex items-center justify-between text-xs kb-muted"><span>{{ project.environmentCount }} environments</span><span>{{ project.createdAt | slice:0:10 }}</span></div>
            </a>
          }
        </section>
      }
    </div>
  `
})
export class HomePageComponent {
  private readonly projectsService = inject(ProjectsService);
  protected readonly projects = signal<readonly ProjectSummary[]>([]);

  public constructor() {
    this.projectsService.listProjects().subscribe({ next: (projects) => this.projects.set(projects), error: () => undefined });
  }
}
