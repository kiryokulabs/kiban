import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { CreateEnvironmentRequest, CreateProjectRequest, EnvironmentItem, ProjectDetails, ProjectSummary, UpdateProjectRequest } from './projects.models';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly apiUrl = '/api';

  public constructor(private readonly http: HttpClient) {}

  /** Lists every project. */
  public listProjects(): Observable<readonly ProjectSummary[]> {
    return this.http.get<readonly ProjectSummary[]>(`${this.apiUrl}/projects`, { withCredentials: true });
  }

  /** Gets one project including environments. */
  public getProject(id: string): Observable<ProjectDetails> {
    return this.http.get<ProjectDetails>(`${this.apiUrl}/projects/${id}`, { withCredentials: true });
  }

  /** Creates a project. */
  public createProject(request: CreateProjectRequest): Observable<ProjectDetails> {
    return this.http.post<ProjectDetails>(`${this.apiUrl}/projects`, request, { withCredentials: true });
  }

  /** Updates a project. */
  public updateProject(id: string, request: UpdateProjectRequest): Observable<ProjectDetails> {
    return this.http.patch<ProjectDetails>(`${this.apiUrl}/projects/${id}`, request, { withCredentials: true });
  }

  /** Deletes a project. */
  public deleteProject(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/projects/${id}`, { withCredentials: true });
  }

  /** Lists environments for a project. */
  public listEnvironments(projectId: string): Observable<readonly EnvironmentItem[]> {
    return this.http.get<readonly EnvironmentItem[]>(`${this.apiUrl}/projects/${projectId}/environments`, { withCredentials: true });
  }

  /** Creates a custom environment for a project. */
  public createEnvironment(projectId: string, request: CreateEnvironmentRequest): Observable<EnvironmentItem> {
    return this.http.post<EnvironmentItem>(`${this.apiUrl}/projects/${projectId}/environments`, request, { withCredentials: true });
  }

  /** Deletes a custom environment for a project. */
  public deleteEnvironment(projectId: string, environmentId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/projects/${projectId}/environments/${environmentId}`, { withCredentials: true });
  }
}
