import { Component } from '@angular/core';
import { IconsComponent } from '../shared/icons.component';

@Component({
  selector: 'kiban-getting-started-page',
  standalone: true,
  imports: [IconsComponent],
  template: `
    <div class="space-y-6 max-w-3xl">
      <!-- Header -->
      <div>
        <div class="flex items-center gap-2.5">
          <div class="grid h-7 w-7 place-items-center rounded-lg bg-brand/20 text-brand-light">
            <kiban-icon name="info" [size]="15" />
          </div>
          <h1 class="text-xl font-semibold kb-text">Getting Started</h1>
        </div>
        <p class="mt-0.5 text-sm c-muted">Learn the basics of Kiban in a few minutes.</p>
      </div>

      <!-- What is Kiban -->
      <div class="card p-5">
        <div class="flex items-center gap-3 mb-4">
          <div class="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand-light">
            <kiban-icon name="home" [size]="16" />
          </div>
          <div>
            <p class="text-sm font-medium kb-text">What is Kiban?</p>
            <p class="text-xs c-muted">Developers build software. Kiban builds infrastructure.</p>
          </div>
        </div>
        <div class="space-y-3 text-sm c-muted">
          <p>Kiban is an open-source infrastructure platform. It lets you install and manage self-hosted services like databases, monitoring tools, AI platforms, and more — without writing Docker Compose files or managing containers manually.</p>
          <p>You interact with <strong class="kb-text">Projects</strong>, <strong class="kb-text">Environments</strong>, and <strong class="kb-text">Services</strong>. Docker is just the engine underneath.</p>
        </div>
      </div>

      <!-- Step 1 -->
      <div class="card p-5">
        <div class="flex items-start gap-4">
          <div class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/20 text-sm font-semibold text-brand-light">1</div>
          <div class="flex-1">
            <p class="text-sm font-medium kb-text">Install Kiban</p>
            <p class="mt-1 text-xs c-muted">Run a single command on your machine or VPS. Kiban requires Docker.</p>
            <div class="mt-3 rounded-lg border kb-border bg-surface p-3">
              <code class="text-xs kb-text">curl -fsSL https://get.kibanos.com | sh</code>
            </div>
            <p class="mt-2 text-xs c-muted">This installs Kiban, starts the dashboard on port 8080, and sets up the reverse proxy.</p>
          </div>
        </div>
      </div>

      <!-- Step 2 -->
      <div class="card p-5">
        <div class="flex items-start gap-4">
          <div class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/20 text-sm font-semibold text-brand-light">2</div>
          <div class="flex-1">
            <p class="text-sm font-medium kb-text">Open the dashboard</p>
            <p class="mt-1 text-xs c-muted">Access Kiban from your browser.</p>
            <div class="mt-3 rounded-lg border kb-border bg-surface p-3">
              <code class="text-xs kb-text">http://localhost:8080</code>
            </div>
            <p class="mt-2 text-xs c-muted">On a VPS, replace <code class="kb-text">localhost</code> with your server's IP, for example <code class="kb-text">http://100.16.16.18:8080</code>. This direct dashboard URL is required for first setup and recovery.</p>
          </div>
        </div>
      </div>

      <!-- Step 3 -->
      <div class="card p-5">
        <div class="flex items-start gap-4">
          <div class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/20 text-sm font-semibold text-brand-light">3</div>
          <div class="flex-1">
            <p class="text-sm font-medium kb-text">Create a project</p>
            <p class="mt-1 text-xs c-muted">Projects group related infrastructure.</p>
            <div class="mt-3 space-y-2">
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Go to <strong class="kb-text">Projects</strong> and click <strong class="kb-text">Create project</strong></span>
              </div>
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Name it (e.g., "My App", "CRM", "Playground")</span>
              </div>
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Kiban creates default environments: Development, Staging, Production</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 4 -->
      <div class="card p-5">
        <div class="flex items-start gap-4">
          <div class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/20 text-sm font-semibold text-brand-light">4</div>
          <div class="flex-1">
            <p class="text-sm font-medium kb-text">Install a service</p>
            <p class="mt-1 text-xs c-muted">Browse the catalog and install what you need.</p>
            <div class="mt-3 space-y-2">
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Go to <strong class="kb-text">Catalog</strong> and pick a service (e.g., PostgreSQL, Grafana, n8n)</span>
              </div>
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Select the project and environment</span>
              </div>
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Configure and click <strong class="kb-text">Install</strong></span>
              </div>
            </div>
            <p class="mt-2 text-xs c-muted">Kiban handles Docker Compose, networking, and reverse proxy automatically.</p>
          </div>
        </div>
      </div>

      <!-- Step 5 -->
      <div class="card p-5">
        <div class="flex items-start gap-4">
          <div class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/20 text-sm font-semibold text-brand-light">5</div>
          <div class="flex-1">
            <p class="text-sm font-medium kb-text">Access your service</p>
            <p class="mt-1 text-xs c-muted">Find the URL in the service details page.</p>
            <div class="mt-3 space-y-2">
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Go to <strong class="kb-text">Installed</strong> and click on your service</span>
              </div>
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Copy the URL from the <strong class="kb-text">Access</strong> section</span>
              </div>
            </div>
            <div class="mt-3 rounded-lg border border-brand/20 bg-brand/5 p-3">
              <p class="text-xs c-muted"><strong class="kb-text">Local:</strong> URLs use <code class="kb-text">.localhost</code> and work only on your machine.</p>
              <p class="text-xs c-muted mt-1"><strong class="kb-text">Remote:</strong> configure a Wildcard Domain with DNS in Settings. Without it, service URLs stay on <code class="kb-text">.localhost</code> and other devices cannot open them.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Service access rule -->
      <div class="card p-5">
        <div class="flex items-center gap-3 mb-4">
          <div class="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand-light">
            <kiban-icon name="external-link" [size]="16" />
          </div>
          <div>
            <p class="text-sm font-medium kb-text">Dashboard URL vs service URLs</p>
            <p class="text-xs c-muted">Kiban does not serve installed services under dashboard paths.</p>
          </div>
        </div>
        <div class="space-y-3 text-sm c-muted">
          <p>The dashboard can be opened at <code class="kb-text">IP:8080</code>, but services are opened through their own hostnames.</p>
          <div class="rounded-lg border kb-border bg-surface p-3 space-y-1">
            <p class="text-xs c-muted">Correct remote service URL:</p>
            <p><code class="text-xs kb-text">grafana.development.myapp.services.example.com</code></p>
            <p class="text-xs c-muted pt-2">Not recommended:</p>
            <p><code class="text-xs kb-text">100.16.16.18:8080/grafana</code></p>
          </div>
          <p>Path-based service access often breaks apps because redirects, assets, cookies, and WebSockets commonly assume the service is running at <code class="kb-text">/</code>.</p>
        </div>
      </div>

      <!-- Next steps -->
      <div class="card-subtle flex items-center gap-3 px-4 py-3">
        <kiban-icon name="check" [size]="14" class="shrink-0 text-green-500" />
        <p class="text-sm c-muted">That's it! You now have a working Kiban installation with your first service running.</p>
      </div>
    </div>
  `
})
export class GettingStartedPageComponent {}
