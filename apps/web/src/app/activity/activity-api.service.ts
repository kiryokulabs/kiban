import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { ActivityEvent, ActivityPage } from './activity.models';

@Injectable({ providedIn: 'root' })
export class ActivityApiService {
  public constructor(private readonly http: HttpClient) {}

  /** Returns the five most recent successful operations visible to authenticated users. */
  public recent(): Observable<readonly ActivityEvent[]> {
    return this.http.get<readonly ActivityEvent[]>('/api/activity', { withCredentials: true });
  }

  /** Reads retained events in fixed-size pages, independently of the dashboard summary. */
  public history(page: number): Observable<ActivityPage> {
    return this.http.get<ActivityPage>('/api/activity/history', { withCredentials: true, params: { page } });
  }

}
