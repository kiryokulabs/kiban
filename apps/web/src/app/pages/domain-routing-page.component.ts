import { Component } from '@angular/core';
import { IconsComponent } from '../shared/icons.component';

@Component({
  selector: 'kiban-domain-routing-page',
  standalone: true,
  imports: [IconsComponent],
  template: `
    <div class="space-y-6 max-w-3xl">
      <!-- Header -->
      <div>
        <div class="flex items-center gap-2.5">
          <div class="grid h-7 w-7 place-items-center rounded-lg bg-brand/20 text-brand-light">
            <kiban-icon name="server" [size]="15" />
          </div>
          <h1 class="text-xl font-semibold kb-text">Domain Routing</h1>
        </div>
        <p class="mt-0.5 text-sm c-muted">How Kiban routes traffic to your services.</p>
      </div>

      <!-- How it works -->
      <div class="card p-5">
        <div class="flex items-center gap-3 mb-4">
          <div class="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand-light">
            <kiban-icon name="info" [size]="16" />
          </div>
          <div>
            <p class="text-sm font-medium kb-text">How domain routing works</p>
            <p class="text-xs c-muted">Kiban uses Traefik as a built-in reverse proxy.</p>
          </div>
        </div>
        <div class="space-y-3 text-sm c-muted">
          <p>Every installed service gets a domain URL automatically. Traefik routes traffic from that hostname to the correct service.</p>
          <p>You don't need to configure anything — Kiban writes the Traefik labels and manages the routing for you.</p>
        </div>
      </div>

      <!-- Dashboard vs services -->
      <div class="card p-5">
        <div class="flex items-center gap-3 mb-4">
          <div class="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand-light">
            <kiban-icon name="external-link" [size]="16" />
          </div>
          <div>
            <p class="text-sm font-medium kb-text">Dashboard access is separate from service access</p>
            <p class="text-xs c-muted">Kiban and installed services use different routing rules.</p>
          </div>
        </div>
        <div class="space-y-3 text-sm c-muted">
          <p>The Kiban dashboard must remain reachable at <code class="kb-text">IP:8080</code>. This is what you use for the first setup and as a fallback if DNS is wrong.</p>
          <p>Installed services are not opened as <code class="kb-text">IP:8080/service-name</code>. They are opened through hostnames generated from the Wildcard Domain.</p>
          <div class="rounded-lg border kb-border bg-surface p-3 space-y-1">
            <p class="text-xs c-muted">Dashboard:</p>
            <p><code class="text-xs kb-text">http://100.16.16.18:8080</code></p>
            <p class="text-xs c-muted pt-2">Service:</p>
            <p><code class="text-xs kb-text">http://grafana.development.myapp.services.example.com</code></p>
          </div>
        </div>
      </div>

      <!-- Domain format -->
      <div class="card p-5">
        <div class="flex items-center gap-3 mb-4">
          <div class="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand-light">
            <kiban-icon name="grid" [size]="16" />
          </div>
          <div>
            <p class="text-sm font-medium kb-text">Domain format</p>
            <p class="text-xs c-muted">The pattern Kiban uses to generate service URLs.</p>
          </div>
        </div>
        <div class="rounded-lg border kb-border bg-surface p-3 mb-3">
          <code class="text-xs kb-text">&#123;service&#125;.<wbr>&#123;environment&#125;.<wbr>&#123;project&#125;.<wbr>&#123;base-domain&#125;</code>
        </div>
        <div class="space-y-2 text-xs c-muted">
          <p><strong class="kb-text">Example</strong> with Wildcard Domain <code class="kb-text">services.example.com</code>:</p>
          <div class="rounded-lg border kb-border bg-surface p-3 space-y-1">
            <p><code class="kb-text">grafana.development.myapp.services.example.com</code></p>
            <p><code class="kb-text">n8n.production.crm.services.example.com</code></p>
          </div>
          <p class="mt-2"><strong class="kb-text">Example</strong> with no Wildcard Domain (default):</p>
          <div class="rounded-lg border kb-border bg-surface p-3 space-y-1">
            <p><code class="kb-text">grafana.development.myapp.localhost</code></p>
          </div>
        </div>
      </div>

      <!-- Instance Domain -->
      <div class="card p-5">
        <div class="flex items-start gap-4">
          <div class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/20 text-sm font-semibold text-brand-light">1</div>
          <div class="flex-1">
            <p class="text-sm font-medium kb-text">Instance Domain</p>
            <p class="mt-1 text-xs c-muted">Add a hostname for the dashboard while keeping <code class="kb-text">IP:8080</code> available.</p>
            <div class="mt-3 rounded-lg border kb-border bg-surface p-3">
              <p class="text-xs c-muted">Go to <strong class="kb-text">Settings → Instance Domain</strong> and enter:</p>
              <p class="text-xs kb-text mt-1">kiban.example.com</p>
            </div>
            <div class="mt-2 text-xs c-muted">
              <p>DNS required: <code class="kb-text">A kiban.example.com → your-server-ip</code></p>
            </div>
          </div>
        </div>
      </div>

      <!-- Wildcard Domain -->
      <div class="card p-5">
        <div class="flex items-start gap-4">
          <div class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/20 text-sm font-semibold text-brand-light">2</div>
          <div class="flex-1">
            <p class="text-sm font-medium kb-text">Wildcard Domain</p>
            <p class="mt-1 text-xs c-muted">The base domain for all installed service URLs. This is required for remote service access.</p>
            <div class="mt-3 rounded-lg border kb-border bg-surface p-3">
              <p class="text-xs c-muted">Go to <strong class="kb-text">Settings → Wildcard Domain</strong> and enter:</p>
              <p class="text-xs kb-text mt-1">services.example.com</p>
            </div>
            <div class="mt-2 text-xs c-muted">
              <p>DNS required: <code class="kb-text">A *.services.example.com → your-server-ip</code></p>
            </div>
            <p class="mt-2 text-xs c-muted">The name is up to you. <code class="kb-text">services.example.com</code> is only an example; any domain base you control works if you can create the matching wildcard DNS record.</p>
            <p class="mt-2 text-xs c-muted">Newly installed services will use this domain automatically. Without it, services fall back to <code class="kb-text">.localhost</code>, which only works on the machine running Kiban.</p>
          </div>
        </div>
      </div>

      <!-- Why not path routing -->
      <div class="card p-5">
        <div class="flex items-center gap-3 mb-4">
          <div class="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand-light">
            <kiban-icon name="warning" [size]="16" />
          </div>
          <div>
            <p class="text-sm font-medium kb-text">Why not IP:8080/service-name?</p>
            <p class="text-xs c-muted">Path-based service access is fragile.</p>
          </div>
        </div>
        <div class="space-y-3 text-sm c-muted">
          <p>Many services assume they run at the root path <code class="kb-text">/</code>. If Kiban exposed them under a subpath like <code class="kb-text">/grafana</code>, redirects, static assets, cookies, APIs, or WebSockets could break.</p>
          <p>Hostname-based routing keeps each service isolated and gives it the root path it expects.</p>
        </div>
      </div>

      <!-- Per-service override -->
      <div class="card p-5">
        <div class="flex items-start gap-4">
          <div class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/20 text-sm font-semibold text-brand-light">3</div>
          <div class="flex-1">
            <p class="text-sm font-medium kb-text">Per-service domain override</p>
            <p class="mt-1 text-xs c-muted">Give any service a custom hostname.</p>
            <div class="mt-3 space-y-2">
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Open the service detail page</span>
              </div>
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Find the <strong class="kb-text">Service domain</strong> section</span>
              </div>
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Enter a custom hostname (e.g., <code class="kb-text">n8n.example.com</code>)</span>
              </div>
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Save — Kiban updates Traefik labels and restarts the service</span>
              </div>
            </div>
            <div class="mt-3 rounded-lg border border-brand/20 bg-brand/5 p-3">
              <p class="text-xs c-muted">Your data is preserved. Kiban uses <code class="kb-text">--force-recreate</code>, never <code class="kb-text">down -v</code>.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Traefik -->
      <div class="card p-5">
        <div class="flex items-center gap-3 mb-4">
          <div class="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand-light">
            <kiban-icon name="server" [size]="16" />
          </div>
          <div>
            <p class="text-sm font-medium kb-text">Traefik status</p>
            <p class="text-xs c-muted">Check what Traefik is routing.</p>
          </div>
        </div>
        <div class="space-y-2 text-xs c-muted">
          <div class="flex items-center gap-2">
            <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
            <span>Go to <strong class="kb-text">Settings → Traefik Info</strong></span>
          </div>
          <div class="flex items-center gap-2">
            <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
            <span>See active routers and their target containers</span>
          </div>
        </div>
      </div>

      <!-- Limitations -->
      <div class="badge-warning card-subtle flex items-center gap-3 px-4 py-3">
        <kiban-icon name="warning" [size]="14" class="shrink-0 text-amber-500" />
        <p class="text-sm c-muted">Remote service access requires a Wildcard Domain with DNS. Domain routing only works in the installed runtime. In development mode (<code class="kb-text">pnpm start</code>), access services through their autoassigned URL.</p>
      </div>
    </div>
  `
})
export class DomainRoutingPageComponent {}
