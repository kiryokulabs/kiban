import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

export interface SystemVersionInfo {
  readonly currentVersion: string;
  readonly latestVersion: string | null;
  readonly updateAvailable: boolean;
  readonly checkedAt: string;
}

@Injectable({ providedIn: 'root' })
export class SystemVersionService {
  public constructor(private readonly http: HttpClient) {}

  /** Loads installed and latest Kiban version information. */
  public getVersion(): Observable<SystemVersionInfo> {
    return this.http.get<SystemVersionInfo>('/api/system/version', { withCredentials: true });
  }
}
