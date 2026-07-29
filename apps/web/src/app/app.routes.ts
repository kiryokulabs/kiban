import type { Routes } from '@angular/router';
import { CatalogPageComponent } from './pages/catalog-page.component';
import { HomePageComponent } from './pages/home-page.component';
import { InstalledPageComponent } from './pages/installed-page.component';
import { LogsPageComponent } from './pages/logs-page.component';
import { ProfilePageComponent } from './pages/profile-page.component';
import { ProjectsPageComponent } from './pages/projects-page.component';
import { SettingsPageComponent } from './pages/settings-page.component';

export const routes: Routes = [
  { path: '', component: HomePageComponent, title: 'Kiban' },
  { path: 'projects', component: ProjectsPageComponent, title: 'Projects · Kiban' },
  { path: 'profile', component: ProfilePageComponent, title: 'Profile · Kiban' },
  { path: 'catalog', component: CatalogPageComponent, title: 'Catalog · Kiban' },
  { path: 'installed', component: InstalledPageComponent, title: 'Installed · Kiban' },
  { path: 'logs', component: LogsPageComponent, title: 'Logs · Kiban' },
  { path: 'settings', component: SettingsPageComponent, title: 'Settings · Kiban' }
];
