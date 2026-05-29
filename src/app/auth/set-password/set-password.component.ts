import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Constants } from '../../../services/service';
import { EmailService } from '../../../services/email/email.service';
import { catchError, EMPTY, switchMap, of } from 'rxjs';

type ViewState = 'request' | 'validating' | 'set-password' | 'invalid-token' | 'done';

interface ValidateTokenResponse {
  valid: boolean;
  type?: 'reset' | 'invite';
  user?: { id: number; full_name: string; email: string };
  message?: string;
}

interface RequestResetResponse {
  success: boolean;
  message: string;
  dispatch?: {
    recipient_name: string;
    recipient_email: string;
    token: string;
  } | null;
}

@Component({
  selector: 'app-set-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
<div class="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900
            flex items-center justify-center p-4">
  <div class="w-full max-w-md">

    <!-- Brand header -->
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br
                  from-violet-500 to-purple-600 rounded-2xl shadow-lg mb-4">
        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
        </svg>
      </div>
      <h1 class="text-2xl font-bold text-white">incubator-os</h1>
    </div>

    <!-- Card -->
    <div class="bg-white rounded-2xl shadow-2xl p-8">

      <!-- ── State: validating token ──────────────────────────── -->
      <div *ngIf="state() === 'validating'" class="flex flex-col items-center gap-3 py-6">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        <p class="text-sm text-gray-500">Validating your link…</p>
      </div>

      <!-- ── State: invalid / expired token ─────────────────── -->
      <div *ngIf="state() === 'invalid-token'" class="text-center">
        <div class="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg class="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
        </div>
        <h2 class="text-lg font-bold text-gray-900 mb-2">Link invalid or expired</h2>
        <p class="text-sm text-gray-500 mb-6">{{ tokenError() }}</p>
        <button (click)="goToRequest()"
          class="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold
                 rounded-xl transition-colors">
          Request a new link
        </button>
        <a routerLink="/login"
          class="block mt-3 text-sm text-gray-500 hover:text-gray-700 text-center">
          Back to sign in
        </a>
      </div>

      <!-- ── State: request reset (enter email) ─────────────── -->
      <div *ngIf="state() === 'request'">
        <h2 class="text-lg font-bold text-gray-900 mb-1">Forgot your password?</h2>
        <p class="text-sm text-gray-500 mb-6">
          Enter your email address and we'll send you a link to set a new password.
        </p>

        <!-- Success banner -->
        <div *ngIf="requestSent()"
             class="mb-5 flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
          <svg class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <p class="text-sm text-green-700">
            If that email is registered, a reset link has been sent. Check your inbox.
          </p>
        </div>

        <!-- Error banner -->
        <div *ngIf="errorMsg()"
             class="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
          <p class="text-sm text-red-700">{{ errorMsg() }}</p>
        </div>

        <form (ngSubmit)="submitRequest()" *ngIf="!requestSent()">
          <div class="mb-5">
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
            <input type="email" [(ngModel)]="email" name="email" required
              placeholder="you@example.com"
              class="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl
                     focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent
                     transition-colors">
          </div>
          <button type="submit" [disabled]="isLoading() || !email"
            class="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold
                   rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center justify-center gap-2">
            <svg *ngIf="isLoading()" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            {{ isLoading() ? 'Sending…' : 'Send reset link' }}
          </button>
        </form>

        <a routerLink="/login"
          class="block mt-4 text-sm text-gray-500 hover:text-gray-700 text-center">
          Back to sign in
        </a>
      </div>

      <!-- ── State: set new password ─────────────────────────── -->
      <div *ngIf="state() === 'set-password'">
        <h2 class="text-lg font-bold text-gray-900 mb-1">
          {{ tokenType() === 'invite' ? 'Set your password' : 'Choose a new password' }}
        </h2>
        <p class="text-sm text-gray-500 mb-1">
          {{ tokenType() === 'invite' ? 'Welcome to incubator-os!' : 'Almost done.' }}
        </p>
        <p *ngIf="tokenUser()?.email" class="text-xs text-violet-600 font-medium mb-6">
          {{ tokenUser()?.full_name || tokenUser()?.email }}
        </p>

        <!-- Error banner -->
        <div *ngIf="errorMsg()"
             class="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
          <p class="text-sm text-red-700">{{ errorMsg() }}</p>
        </div>

        <form (ngSubmit)="submitPassword()">
          <!-- New password -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
            <div class="relative">
              <input [type]="showPw() ? 'text' : 'password'"
                [(ngModel)]="newPassword" name="newPassword" required
                placeholder="At least 6 characters"
                class="w-full px-4 py-2.5 pr-10 text-sm border border-gray-200 rounded-xl
                       focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent
                       transition-colors">
              <button type="button" (click)="showPw.set(!showPw())"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg *ngIf="!showPw()" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
                <svg *ngIf="showPw()" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                </svg>
              </button>
            </div>
            <!-- Strength bar -->
            <div class="mt-2 flex gap-1">
              <div *ngFor="let i of [0,1,2,3]"
                class="h-1 flex-1 rounded-full transition-colors"
                [ngClass]="strengthColor(i)"></div>
            </div>
            <p class="text-xs mt-1" [ngClass]="strengthLabelColor()">{{ strengthLabel() }}</p>
          </div>

          <!-- Confirm password -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
            <input type="password"
              [(ngModel)]="confirmPassword" name="confirmPassword" required
              placeholder="Re-enter your password"
              class="w-full px-4 py-2.5 text-sm border rounded-xl focus:outline-none
                     focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors"
              [ngClass]="confirmPassword && confirmPassword !== newPassword
                          ? 'border-red-300' : 'border-gray-200'">
            <p *ngIf="confirmPassword && confirmPassword !== newPassword"
               class="text-xs text-red-500 mt-1">Passwords do not match.</p>
          </div>

          <button type="submit"
            [disabled]="isLoading() || !newPassword || newPassword !== confirmPassword || newPassword.length < 6"
            class="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold
                   rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center justify-center gap-2">
            <svg *ngIf="isLoading()" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            {{ isLoading() ? 'Saving…' : (tokenType() === 'invite' ? 'Activate my account' : 'Set new password') }}
          </button>
        </form>
      </div>

      <!-- ── State: done ─────────────────────────────────────── -->
      <div *ngIf="state() === 'done'" class="text-center">
        <div class="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg class="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h2 class="text-lg font-bold text-gray-900 mb-2">Password set!</h2>
        <p class="text-sm text-gray-500 mb-6">
          Your password has been set successfully. You can now sign in.
        </p>
        <a routerLink="/login"
          class="block w-full py-2.5 text-center bg-violet-600 hover:bg-violet-700 text-white
                 text-sm font-semibold rounded-xl transition-colors">
          Go to sign in
        </a>
      </div>

    </div>

    <p class="text-center text-xs text-slate-500 mt-6">
      incubator-os &copy; {{ year }}
    </p>
  </div>
</div>
  `,
})
export class SetPasswordComponent implements OnInit {
  private readonly apiBase = `${Constants.ApiBase}api-nodes/user`;

  state       = signal<ViewState>('request');
  isLoading   = signal(false);
  errorMsg    = signal<string | null>(null);
  requestSent = signal(false);
  tokenError  = signal<string | null>(null);
  tokenType   = signal<'reset' | 'invite'>('reset');
  tokenUser   = signal<{ id: number; full_name: string; email: string } | null>(null);
  showPw      = signal(false);

  email           = '';
  newPassword     = '';
  confirmPassword = '';
  private token   = '';

  readonly year = new Date().getFullYear();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private emailService: EmailService,
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.token = token;
      this.state.set('validating');
      this.validateToken(token);
    }
  }

  private validateToken(token: string): void {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    this.http.get<ValidateTokenResponse>(
      `${this.apiBase}/validate-token.php?token=${encodeURIComponent(token)}`,
      { headers },
    ).subscribe({
      next: (res) => {
        if (res.valid) {
          this.tokenType.set(res.type ?? 'reset');
          this.tokenUser.set(res.user ?? null);
          this.state.set('set-password');
        } else {
          this.tokenError.set(res.message ?? 'This link is invalid or has expired.');
          this.state.set('invalid-token');
        }
      },
      error: () => {
        this.tokenError.set('Could not validate the link. Please try again or request a new one.');
        this.state.set('invalid-token');
      },
    });
  }

  submitRequest(): void {
    if (!this.email || this.isLoading()) return;
    this.isLoading.set(true);
    this.errorMsg.set(null);
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    this.http.post<RequestResetResponse>(
      `${this.apiBase}/request-reset.php`,
      { email: this.email.trim() },
      { headers },
    ).pipe(
      switchMap((res) => {
        const dispatch = res.dispatch;
        if (!dispatch?.recipient_email || !dispatch?.token) {
          return of(null);
        }

        // Build reset link dynamically using the current host
        // This ensures the link works in local, staging, and production environments
        const resetLink = window.location.origin + '/set-password?token=' + encodeURIComponent(dispatch.token);

        return this.emailService.sendPasswordReset(
          dispatch.recipient_name || dispatch.recipient_email,
          dispatch.recipient_email,
          resetLink,
        ).pipe(
          catchError(() => of(null)),
        );
      }),
      catchError((err) => {
        this.errorMsg.set(err?.error?.error || 'Something went wrong. Please try again.');
        return EMPTY;
      }),
    ).subscribe(() => {
      this.isLoading.set(false);
      if (!this.errorMsg()) this.requestSent.set(true);
    });
  }

  submitPassword(): void {
    if (!this.newPassword || this.newPassword !== this.confirmPassword || this.isLoading()) return;
    if (this.newPassword.length < 6) {
      this.errorMsg.set('Password must be at least 6 characters.');
      return;
    }
    this.isLoading.set(true);
    this.errorMsg.set(null);
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    this.http.post<{ success: boolean; message: string }>(
      `${this.apiBase}/reset-password.php`,
      { token: this.token, password: this.newPassword },
      { headers },
    ).subscribe({
      next: () => { this.isLoading.set(false); this.state.set('done'); },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMsg.set(err?.error?.error || 'Failed to set password. Please try again.');
      },
    });
  }

  goToRequest(): void {
    this.state.set('request');
    this.tokenError.set(null);
    this.errorMsg.set(null);
    // Clear token from URL
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  // ── Password strength ────────────────────────────────────────────────────────

  private get strength(): number {
    const p = this.newPassword;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 6)  score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;
    return score;
  }

  strengthColor(i: number): string {
    const s = this.strength;
    if (!this.newPassword) return 'bg-gray-100';
    if (s <= 1) return i < s ? 'bg-red-400'    : 'bg-gray-100';
    if (s === 2) return i < s ? 'bg-amber-400'  : 'bg-gray-100';
    if (s === 3) return i < s ? 'bg-blue-400'   : 'bg-gray-100';
    return i < s ? 'bg-green-500' : 'bg-gray-100';
  }

  strengthLabel(): string {
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    return this.newPassword ? (labels[this.strength] ?? '') : '';
  }

  strengthLabelColor(): string {
    const colors = ['', 'text-red-500', 'text-amber-500', 'text-blue-500', 'text-green-600'];
    return colors[this.strength] ?? 'text-gray-400';
  }
}
