import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { ServerImage } from './server-images.models';

@Injectable({ providedIn: 'root' })
export class ServerImagesApiService {
  public constructor(private readonly http: HttpClient) {}

  public list(): Observable<readonly ServerImage[]> {
    return this.http.get<readonly ServerImage[]>('/api/server/images', { withCredentials: true });
  }

  public remove(id: string, tag?: string): Observable<void> {
    return this.http.delete<void>(`/api/server/images/${encodeURIComponent(id)}`, { withCredentials: true, ...(tag === undefined ? {} : { params: { tag } }) });
  }
}
