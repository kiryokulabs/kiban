import { Component } from '@angular/core';
import { IconsComponent } from '../shared/icons.component';

@Component({
  selector: 'kiban-remote-access-page',
  standalone: true,
  imports: [IconsComponent],
  template: `
    <div class="space-y-6 max-w-3xl">
      <!-- Header -->
      <div>
        <div class="flex items-center gap-2.5">
          <div class="grid h-7 w-7 place-items-center rounded-lg bg-brand/20 text-brand-light">
            <kiban-icon name="external-link" [size]="15" />
          </div>
          <h1 class="text-xl font-semibold kb-text">Remote Access</h1>
        </div>
        <p class="mt-0.5 text-sm c-muted">Access Kiban and services from other devices.</p>
      </div>

      <!-- Overview -->
      <div class="card p-5">
        <div class="flex items-center gap-3 mb-4">
          <div class="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand-light">
            <kiban-icon name="info" [size]="16" />
          </div>
          <div>
            <p class="text-sm font-medium kb-text">When do you need remote access?</p>
            <p class="text-xs c-muted">Kiban works locally out of the box.</p>
          </div>
        </div>
        <div class="space-y-3 text-sm c-muted">
          <p>When Kiban runs on your own machine, the dashboard is at <code class="kb-text">localhost:8080</code> and service URLs use <code class="kb-text">.localhost</code>. This works only on that machine.</p>
          <p>You need remote access when:</p>
          <div class="space-y-2">
            <div class="flex items-start gap-2">
              <span class="text-brand-light mt-0.5">—</span>
              <span>Kiban is on a VPS and you want to access it from your laptop</span>
            </div>
            <div class="flex items-start gap-2">
              <span class="text-brand-light mt-0.5">—</span>
              <span>Multiple team members need to use the same Kiban instance</span>
            </div>
            <div class="flex items-start gap-2">
              <span class="text-brand-light mt-0.5">—</span>
              <span>You want to access services from a phone or tablet</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Option 1: VPS -->
      <div class="card p-5">
        <div class="flex items-start gap-4">
          <div class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/20 text-sm font-semibold text-brand-light">1</div>
          <div class="flex-1">
            <p class="text-sm font-medium kb-text">Install on a VPS</p>
            <p class="mt-1 text-xs c-muted">The simplest option — Kiban on a public server.</p>
            <div class="mt-3 space-y-3">
              <div class="space-y-2">
                <p class="text-xs font-medium kb-text">Step 1: Install Kiban on the VPS</p>
                <div class="rounded-lg border kb-border bg-surface p-3">
                  <code class="text-xs kb-text">curl -fsSL https://get.kibanos.com | sh</code>
                </div>
              </div>
              <div class="space-y-2">
                <p class="text-xs font-medium kb-text">Step 2: Create DNS records</p>
                <div class="rounded-lg border kb-border bg-surface p-3 space-y-1">
                  <p class="text-xs c-muted">Dashboard:</p>
                  <p class="text-xs kb-text">A  kiban.example.com  →  VPS_IP</p>
                  <p class="text-xs c-muted mt-2">Services:</p>
                  <p class="text-xs kb-text">A  *.apps.example.com  →  VPS_IP</p>
                </div>
              </div>
              <div class="space-y-2">
                <p class="text-xs font-medium kb-text">Step 3: Configure domains in Settings</p>
                <div class="space-y-1">
                  <div class="flex items-center gap-2 text-xs c-muted">
                    <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                    <span>Instance Domain: <code class="kb-text">kiban.example.com</code></span>
                  </div>
                  <div class="flex items-center gap-2 text-xs c-muted">
                    <kiban-icon name="arrow-left" [size]="12" class="shrink-0" />
                    <span>Wildcard Domain: <code class="kb-text">apps.example.com</code></span>
                  </div>
                </div>
              </div>
            </div>
            <div class="mt-3 rounded-lg border border-brand/20 bg-brand/5 p-3">
              <p class="text-xs c-muted">After this, the dashboard is at <code class="kb-text">https://kiban.example.com</code> and services are at <code class="kb-text">https://grafana.development.myapp.apps.example.com</code>.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Option 2: Cloudflare Tunnel -->
      <div class="card p-5">
        <div class="flex items-start gap-4">
          <div class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/20 text-sm font-semibold text-brand-light">2</div>
          <div class="flex-1">
            <p class="text-sm font-medium kb-text">Use a tunnel (Cloudflare, ngrok, etc.)</p>
            <p class="mt-1 text-xs c-muted">Expose Kiban without opening ports.</p>
            <div class="mt-3 space-y-3">
              <div class="space-y-2">
                <p class="text-xs font-medium kb-text">How it works</p>
                <p class="text-xs c-muted">A tunnel agent runs on your machine and connects to a cloud provider. The provider gives you a public hostname that routes traffic to your local Kiban.</p>
              </div>
              <div class="space-y-2">
                <p class="text-xs font-medium kb-text">With wildcard support</p>
                <p class="text-xs c-muted">If your tunnel provider supports wildcard DNS (e.g., <code class="kb-text">*.trycloudflare.com</code>), configure a matching Wildcard Domain in Settings. All services will be accessible automatically.</p>
              </div>
              <div class="space-y-2">
                <p class="text-xs font-medium kb-text">Without wildcard support</p>
                <p class="text-xs c-muted">If the tunnel only provides individual routes, you'd need to add a route per service. This is why wildcard DNS is recommended.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Option 3: Home NAS -->
      <div class="card p-5">
        <div class="flex items-start gap-4">
          <div class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/20 text-sm font-semibold text-brand-light">3</div>
          <div class="flex-1">
            <p class="text-sm font-medium kb-text">Home NAS / local network</p>
            <p class="mt-1 text-xs c-muted">Access from devices on the same network.</p>
            <div class="mt-3 space-y-3">
              <div class="space-y-2">
                <p class="text-xs font-medium kb-text">Same network access</p>
                <p class="text-xs c-muted">Use your machine's local IP (e.g., <code class="kb-text">192.168.1.100:8080</code>). Service URLs with <code class="kb-text">.localhost</code> won't work from other devices.</p>
              </div>
              <div class="space-y-2">
                <p class="text-xs font-medium kb-text">External access</p>
                <p class="text-xs c-muted">For access from outside your home network, use a tunnel or configure a real domain with DNS pointing to your public IP.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SSL -->
      <div class="card p-5">
        <div class="flex items-center gap-3 mb-4">
          <div class="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand-light">
            <kiban-icon name="check" [size]="16" />
          </div>
          <div>
            <p class="text-sm font-medium kb-text">SSL / HTTPS</p>
            <p class="text-xs c-muted">Kiban doesn't manage certificates.</p>
          </div>
        </div>
        <div class="space-y-3 text-sm c-muted">
          <p>Kiban runs HTTP by default. For HTTPS, use one of these approaches:</p>
          <div class="space-y-2">
            <div class="flex items-start gap-2">
              <span class="text-brand-light mt-0.5">—</span>
              <span><strong class="kb-text">Cloudflare proxy</strong> — enables HTTPS automatically, no config needed on Kiban</span>
            </div>
            <div class="flex items-start gap-2">
              <span class="text-brand-light mt-0.5">—</span>
              <span><strong class="kb-text">Cloudflare Tunnel</strong> — HTTPS handled by the tunnel</span>
            </div>
            <div class="flex items-start gap-2">
              <span class="text-brand-light mt-0.5">—</span>
              <span><strong class="kb-text">Your own reverse proxy</strong> — put nginx/Caddy in front of Kiban with Let's Encrypt</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div class="card-subtle flex items-center gap-3 px-4 py-3">
        <kiban-icon name="check" [size]="14" class="shrink-0 text-green-500" />
        <p class="text-sm c-muted">For most users: install on a VPS, configure DNS, set Wildcard Domain. That's all you need.</p>
      </div>
    </div>
  `
})
export class RemoteAccessPageComponent {}
