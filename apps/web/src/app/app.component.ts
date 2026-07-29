import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface NavigationItem { readonly label: string; readonly path: string; }

@Component({
  selector: 'kiban-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="min-h-screen bg-surface text-zinc-100">
      <aside class="fixed inset-y-0 left-0 w-64 border-r border-line bg-panel p-4">
        <div class="mb-8 flex items-center gap-3"><div class="grid h-9 w-9 place-items-center rounded-xl bg-zinc-100 text-sm font-bold text-zinc-950">K</div><div><p class="font-semibold">Kiban</p><p class="text-xs text-zinc-500">Infrastructure platform</p></div></div>
        <nav class="space-y-1">
          @for (item of navigation(); track item.path) {
            <a [routerLink]="item.path" routerLinkActive="bg-zinc-800 text-white" [routerLinkActiveOptions]="{ exact: item.path === '/' }" class="block rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white">{{ item.label }}</a>
          }
        </nav>
      </aside>
      <main class="pl-64">
        <header class="sticky top-0 z-10 border-b border-line bg-surface/95 px-8 py-4"><div class="flex items-center justify-between"><p class="text-sm text-zinc-500">Foundation v0.1</p><button class="rounded-lg border border-line px-3 py-2 text-sm text-zinc-300">Create Project</button></div></header>
        <section class="p-8"><router-outlet /></section>
      </main>
    </div>
  `
})
export class AppComponent {
  protected readonly navigation = signal<readonly NavigationItem[]>([
    { label: 'Home', path: '/' },
    { label: 'Projects', path: '/projects' },
    { label: 'Catalog', path: '/catalog' },
    { label: 'Installed', path: '/installed' },
    { label: 'Logs', path: '/logs' },
    { label: 'Settings', path: '/settings' }
  ]);
}
