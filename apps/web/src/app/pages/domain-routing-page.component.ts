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
          <p>Every installed service gets a domain URL automatically. Traefik routes traffic from that domain to the correct container.</p>
          <p>You don't need to configure anything — Kiban writes the Traefik labels and manages the routing for you.</p>
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
          <p><strong class="kb-text">Example</strong> with Wildcard Domain <code class="kb-text">apps.example.com</code>:</p>
          <div class="rounded-lg border kb-border bg-surface p-3 space-y-1">
            <p><code class="kb-text">grafana.development.myapp.apps.example.com</code></p>
            <p><code class="kb-text">n8n.production.crm.apps.example.com</code></p>
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
            <p class="mt-1 text-xs c-muted">Replace <code class="kb-text">IP:8080</code> with a hostname for the dashboard.</p>
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
            <p class="mt-1 text-xs c-muted">The base domain for all installed service URLs.</p>
            <div class="mt-3 rounded-lg border kb-border bg-surface p-3">
              <p class="text-xs c-muted">Go to <strong class="kb-text">Settings → Wildcard Domain</strong> and enter:</p>
              <p class="text-xs kb-text mt-1">apps.example.com</p>
            </div>
            <div class="mt-2 text-xs c-muted">
              <p>DNS required: <code class="kb-text">A *.apps.example.com → your-server-ip</code></p>
            </div>
            <p class="mt-2 text-xs c-muted">Newly installed services will use this domain automatically.</p>
          </div>
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
        <p class="text-sm c-muted">Domain routing only works in the installed runtime (Docker). In development mode (<code class="kb-text">pnpm start</code>), access services through their autoassigned URL.</p>
      </div>
    </div>
  `
})
export class DomainRoutingPageComponent {}
