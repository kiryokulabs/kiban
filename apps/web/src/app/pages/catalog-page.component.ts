import { Component, signal } from '@angular/core';

@Component({ selector: 'kiban-catalog-page', standalone: true, template: `<h1 class="text-3xl font-semibold tracking-tight">Catalog</h1><div class="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">@for (category of categories(); track category) { <article class="rounded-xl border border-line bg-panel p-5"><h2 class="font-medium">{{ category }}</h2><p class="mt-2 text-sm text-zinc-500">Coming soon</p></article> }</div>` })
export class CatalogPageComponent { protected readonly categories = signal(['Databases', 'Storage', 'Messaging', 'AI', 'Automation', 'Monitoring', 'Security']); }
