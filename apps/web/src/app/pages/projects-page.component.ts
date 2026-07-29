import { Component } from '@angular/core';

@Component({ selector: 'kiban-projects-page', standalone: true, template: `<div class="flex items-center justify-between"><div><p class="mb-3 text-sm font-medium text-zinc-500">Projects</p><h1 class="text-3xl font-semibold tracking-tight">Projects</h1></div><button class="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950">Create Project</button></div><div class="mt-8 rounded-xl border border-line bg-panel p-10 text-center text-zinc-500">Empty state</div>` })
export class ProjectsPageComponent {}
