import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { KibanLogsResponse } from './logs.models';

@Injectable({ providedIn: 'root' })
export class LogsService {
  private readonly apiUrl = '/api';

  public constructor(private readonly http: HttpClient) {}

  /** Fetches Kiban platform logs from the installed core runtime. */
  public kiban(): Observable<KibanLogsResponse> {
    return this.http.get<KibanLogsResponse>(`${this.apiUrl}/logs`, { withCredentials: true });
  }
}
