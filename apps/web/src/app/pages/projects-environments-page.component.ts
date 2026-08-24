import { Component } from '@angular/core';
import { IconsComponent } from '../shared/icons.component';

@Component({
  selector: 'kiban-projects-environments-page',
  standalone: true,
  imports: [IconsComponent],
  template: `
    <div class="space-y-6 max-w-3xl">
      <!-- Header -->
      <div>
        <div class="flex items-center gap-2.5">
          <div class="grid h-7 w-7 place-items-center rounded-lg bg-brand/20 text-brand-light">
            <kiban-icon name="projects" [size]="15" />
          </div>
          <h1 class="text-xl font-semibold kb-text">Projects & Environments</h1>
        </div>
        <p class="mt-0.5 text-sm c-muted">Understand how Kiban organizes your infrastructure.</p>
      </div>

      <!-- Projects overview -->
      <div class="card p-5">
        <div class="flex items-center gap-3 mb-4">
          <div class="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand-light">
            <kiban-icon name="folder" [size]="16" />
          </div>
          <div>
            <p class="text-sm font-medium kb-text">What is a Project?</p>
            <p class="text-xs c-muted">A logical group for related services.</p>
          </div>
        </div>
        <div class="space-y-3 text-sm c-muted">
          <p>A project represents an application, a team, or a purpose. Examples: "CRM", "My SaaS App", "Homelab", "Client Project".</p>
          <p>Each project contains its own services and environments. Services in different projects are completely isolated.</p>
        </div>
      </div>

      <!-- Environments overview -->
      <div class="card p-5">
        <div class="flex items-center gap-3 mb-4">
          <div class="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand-light">
            <kiban-icon name="grid" [size]="16" />
          </div>
          <div>
            <p class="text-sm font-medium kb-text">What is an Environment?</p>
            <p class="text-xs c-muted">A deployment stage within a project.</p>
          </div>
        </div>
        <div class="space-y-3 text-sm c-muted">
          <p>Environments separate your infrastructure by stage. When you create a project, Kiban creates three default environments:</p>
          <div class="rounded-lg border kb-border bg-surface p-3 space-y-2">
            <div class="flex items-center gap-2">
              <span class="badge text-[10px] px-1.5 py-0.5 leading-none badge-success">Development</span>
              <span class="text-xs c-muted">Local work, testing, experiments</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="badge text-[10px] px-1.5 py-0.5 leading-none badge-warning">Staging</span>
              <span class="text-xs c-muted">Pre-production validation</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="badge text-[10px] px-1.5 py-0.5 leading-none badge-danger">Production</span>
              <span class="text-xs c-muted">Live services for end users</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Creating a project -->
      <div class="card p-5">
        <div class="flex items-start gap-4">
          <div class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/20 text-sm font-semibold text-brand-light">1</div>
          <div class="flex-1">
            <p class="text-sm font-medium kb-text">Create a project</p>
            <div class="mt-3 space-y-2">
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Go to <strong class="kb-text">Projects</strong></span>
              </div>
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Click <strong class="kb-text">Create project</strong></span>
              </div>
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Enter a name and optional description</span>
              </div>
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Click <strong class="kb-text">Create</strong> — the three default environments are created automatically</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Managing environments -->
      <div class="card p-5">
        <div class="flex items-start gap-4">
          <div class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/20 text-sm font-semibold text-brand-light">2</div>
          <div class="flex-1">
            <p class="text-sm font-medium kb-text">Manage environments</p>
            <div class="mt-3 space-y-2">
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Click on a project to see its environments</span>
              </div>
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Create custom environments (e.g., "QA", "Preview")</span>
              </div>
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Each environment is independent — services don't share data between them</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Installing services -->
      <div class="card p-5">
        <div class="flex items-start gap-4">
          <div class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/20 text-sm font-semibold text-brand-light">3</div>
          <div class="flex-1">
            <p class="text-sm font-medium kb-text">Install services into environments</p>
            <div class="mt-3 space-y-2">
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Go to <strong class="kb-text">Catalog</strong> and select a service</span>
              </div>
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Choose the target project and environment</span>
              </div>
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Configure settings and install</span>
              </div>
            </div>
            <p class="mt-2 text-xs c-muted">You can install the same service in multiple environments (e.g., PostgreSQL in both Development and Production).</p>
          </div>
        </div>
      </div>

      <!-- Organizing tips -->
      <div class="card p-5">
        <div class="flex items-center gap-3 mb-4">
          <div class="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand-light">
            <kiban-icon name="info" [size]="16" />
          </div>
          <div>
            <p class="text-sm font-medium kb-text">Organizing tips</p>
            <p class="text-xs c-muted">Best practices for structuring projects.</p>
          </div>
        </div>
        <div class="space-y-2 text-xs c-muted">
          <div class="flex items-start gap-2">
            <span class="text-brand-light mt-0.5">—</span>
            <span>One project per application or team</span>
          </div>
          <div class="flex items-start gap-2">
            <span class="text-brand-light mt-0.5">—</span>
            <span>Use the default environments unless you need more stages</span>
          </div>
          <div class="flex items-start gap-2">
            <span class="text-brand-light mt-0.5">—</span>
            <span>Services in different projects are fully isolated</span>
          </div>
          <div class="flex items-start gap-2">
            <span class="text-brand-light mt-0.5">—</span>
            <span>You can install the same service type in multiple environments</span>
          </div>
        </div>
      </div>

      <!-- Next steps -->
      <div class="card-subtle flex items-center gap-3 px-4 py-3">
        <kiban-icon name="check" [size]="14" class="shrink-0 text-green-500" />
        <p class="text-sm c-muted">Projects are the foundation of Kiban. Once you create one, you can install any service from the catalog.</p>
      </div>
    </div>
  `
})
export class ProjectsEnvironmentsPageComponent {}
