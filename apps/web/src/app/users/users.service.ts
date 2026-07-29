import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { CreateOperatorRequest, UserListItem } from './users.models';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly apiUrl = 'http://localhost:3000';

  public constructor(private readonly http: HttpClient) {}

  /** Lists users. Only admin can call this endpoint successfully. */
  public listUsers(): Observable<readonly UserListItem[]> {
    return this.http.get<readonly UserListItem[]>(`${this.apiUrl}/users`, { withCredentials: true });
  }

  /** Creates an operator account. */
  public createOperator(request: CreateOperatorRequest): Observable<UserListItem> {
    return this.http.post<UserListItem>(`${this.apiUrl}/users/operators`, request, { withCredentials: true });
  }

  /** Deletes an operator account. */
  public deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${userId}`, { withCredentials: true });
  }
}
