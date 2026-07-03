import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Constants } from '../../services/service';
import { User } from '../../models/simple.schema';
import { ActivityLogService } from '../services/activity-log.service';

export interface LoginResponse {
  success: boolean;
  user: User;
}

export interface SessionValidationResponse {
  success: boolean;
  valid: boolean;
  user?: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = Constants.LocalUser;
  private readonly apiUrl = `${Constants.ApiBase}api-nodes/user`;

  private _currentUser = signal<User | null>(this.loadFromStorage());

  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this._currentUser() !== null);

  private logSvc = inject(ActivityLogService);

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login.php`, { username, password }, { withCredentials: true }).pipe(
      tap(res => {
        if (res?.success && res.user) {
          this._currentUser.set(res.user);
          localStorage.setItem(this.storageKey, JSON.stringify(res.user));
        }
      })
    );
  }

  logout(): void {
    const user = this._currentUser();
    this.http.post<{ success: boolean }>(`${this.apiUrl}/logout.php`, {}, { withCredentials: true }).subscribe({
      error: () => {
        // Ignore logout API errors; local logout still proceeds.
      },
    });
    this._currentUser.set(null);
    localStorage.removeItem(this.storageKey);
    if (user) {
      this.logSvc.log({ action: 'logout', user_id: user.id, user_name: user.full_name || user.username }).subscribe();
    }
  }

  validateSession(): Observable<SessionValidationResponse> {
    return this.http.get<SessionValidationResponse>(`${this.apiUrl}/validate-session.php`, { withCredentials: true }).pipe(
      tap(res => {
        if (res?.valid && res.user) {
          this._currentUser.set(res.user);
          localStorage.setItem(this.storageKey, JSON.stringify(res.user));
          return;
        }

        this._currentUser.set(null);
        localStorage.removeItem(this.storageKey);
      })
    );
  }

  getUser(): User | null {
    return this._currentUser();
  }

  hasRole(...roles: string[]): boolean {
    const user = this._currentUser();
    return user !== null && roles.includes(user.role);
  }

  isAdmin(): boolean {
    return this.hasRole('System Administrator', 'Coordinator');
  }

  private loadFromStorage(): User | null {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
}
