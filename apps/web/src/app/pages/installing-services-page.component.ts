import { Component } from '@angular/core';
import { IconsComponent } from '../shared/icons.component';

@Component({
  selector: 'kiban-installing-services-page',
  standalone: true,
  imports: [IconsComponent],
  template: `
    <div class="space-y-6 max-w-3xl">
      <!-- Header -->
      <div>
        <div class="flex items-center gap-2.5">
          <div class="grid h-7 w-7 place-items-center rounded-lg bg-brand/20 text-brand-light">
            <kiban-icon name="installed" [size]="15" />
          </div>
          <h1 class="text-xl font-semibold kb-text">Installing Services</h1>
        </div>
        <p class="mt-0.5 text-sm c-muted">How to install and manage services from the catalog.</p>
      </div>

      <!-- Catalog overview -->
      <div class="card p-5">
        <div class="flex items-center gap-3 mb-4">
          <div class="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand-light">
            <kiban-icon name="catalog" [size]="16" />
          </div>
          <div>
            <p class="text-sm font-medium kb-text">The Catalog</p>
            <p class="text-xs c-muted">Ready-to-use services you can install with one click.</p>
          </div>
        </div>
        <div class="space-y-3 text-sm c-muted">
          <p>Kiban includes a curated catalog of self-hosted services: databases, monitoring tools, automation platforms, AI tools, and more.</p>
          <p>Each service has a default configuration. You can customize ports, credentials, and other settings before installing.</p>
        </div>
      </div>

      <!-- Step 1: Browse -->
      <div class="card p-5">
        <div class="flex items-start gap-4">
          <div class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/20 text-sm font-semibold text-brand-light">1</div>
          <div class="flex-1">
            <p class="text-sm font-medium kb-text">Browse the catalog</p>
            <div class="mt-3 space-y-2">
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Go to <strong class="kb-text">Catalog</strong> in the sidebar</span>
              </div>
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Browse by category or search for a specific service</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 2: Configure -->
      <div class="card p-5">
        <div class="flex items-start gap-4">
          <div class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/20 text-sm font-semibold text-brand-light">2</div>
          <div class="flex-1">
            <p class="text-sm font-medium kb-text">Configure the service</p>
            <div class="mt-3 space-y-2">
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Select the <strong class="kb-text">project</strong> and <strong class="kb-text">environment</strong></span>
              </div>
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Review default settings (ports, volumes, credentials)</span>
              </div>
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Change anything you need before installing</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3: Install -->
      <div class="card p-5">
        <div class="flex items-start gap-4">
          <div class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/20 text-sm font-semibold text-brand-light">3</div>
          <div class="flex-1">
            <p class="text-sm font-medium kb-text">Install</p>
            <div class="mt-3 space-y-2">
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Click <strong class="kb-text">Install</strong></span>
              </div>
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Kiban prepares the runtime, starts the service, and configures networking</span>
              </div>
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Watch the progress in real time</span>
              </div>
            </div>
            <p class="mt-2 text-xs c-muted">Installation usually takes 30-60 seconds depending on image size.</p>
          </div>
        </div>
      </div>

      <!-- Step 4: Access -->
      <div class="card p-5">
        <div class="flex items-start gap-4">
          <div class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/20 text-sm font-semibold text-brand-light">4</div>
          <div class="flex-1">
            <p class="text-sm font-medium kb-text">Access the service</p>
            <div class="mt-3 space-y-2">
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Go to <strong class="kb-text">Installed</strong> and click on your service</span>
              </div>
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Copy the URL from the <strong class="kb-text">Access</strong> section</span>
              </div>
              <div class="flex items-center gap-2 text-xs c-muted">
                <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                <span>Open it in your browser</span>
              </div>
            </div>
            <div class="mt-3 rounded-lg border border-brand/20 bg-brand/5 p-3">
              <p class="text-xs c-muted"><strong class="kb-text">Local install:</strong> service URLs usually end in <code class="kb-text">.localhost</code> and only work on the machine running Kiban.</p>
              <p class="text-xs c-muted mt-1"><strong class="kb-text">Remote install:</strong> configure a Wildcard Domain with DNS before expecting service URLs to work from your laptop, phone, or team members' devices.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Remote URL requirements -->
      <div class="card p-5">
        <div class="flex items-center gap-3 mb-4">
          <div class="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand-light">
            <kiban-icon name="external-link" [size]="16" />
          </div>
          <div>
            <p class="text-sm font-medium kb-text">Remote service URLs need a Wildcard Domain</p>
            <p class="text-xs c-muted">The dashboard IP is not a service gateway.</p>
          </div>
        </div>
        <div class="space-y-3 text-sm c-muted">
          <p>You can open the Kiban dashboard at <code class="kb-text">IP:8080</code>, especially during first setup.</p>
          <p>Installed services are opened through generated hostnames, not through paths such as <code class="kb-text">IP:8080/service-name</code>.</p>
          <p>For remote access, set a Wildcard Domain you control, for example <code class="kb-text">services.example.com</code> or <code class="kb-text">example.com</code>, and create the matching wildcard DNS record pointing to the server.</p>
        </div>
      </div>

      <!-- Managing services -->
      <div class="card p-5">
        <div class="flex items-center gap-3 mb-4">
          <div class="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand-light">
            <kiban-icon name="settings" [size]="16" />
          </div>
          <div>
            <p class="text-sm font-medium kb-text">Managing services</p>
            <p class="text-xs c-muted">Control your services after installation.</p>
          </div>
        </div>
        <div class="space-y-2 text-xs c-muted">
          <div class="flex items-start gap-2">
            <span class="text-brand-light mt-0.5">—</span>
            <span><strong class="kb-text">Start / Stop / Restart</strong> — control from the service detail page</span>
          </div>
          <div class="flex items-start gap-2">
            <span class="text-brand-light mt-0.5">—</span>
            <span><strong class="kb-text">Update domain</strong> — change the service's hostname</span>
          </div>
          <div class="flex items-start gap-2">
            <span class="text-brand-light mt-0.5">—</span>
            <span><strong class="kb-text">View logs</strong> — see real-time output from the container</span>
          </div>
          <div class="flex items-start gap-2">
            <span class="text-brand-light mt-0.5">—</span>
            <span><strong class="kb-text">Delete</strong> — remove the service and its data</span>
          </div>
        </div>
      </div>

      <!-- Tip -->
      <div class="card-subtle flex items-center gap-3 px-4 py-3">
        <kiban-icon name="info" [size]="14" class="shrink-0 c-muted" />
        <p class="text-sm c-muted">You can install the same service in multiple environments (e.g., PostgreSQL in Development and Production).</p>
      </div>
    </div>
  `
})
export class InstallingServicesPageComponent {}
