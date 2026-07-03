import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';
import { ActivityLogService } from '../../services/activity-log.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
<div class="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 flex items-center justify-center p-4">
  <div class="w-full max-w-md">

    <!-- Logo / Brand -->
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg mb-4">
        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
        </svg>
      </div>
      <h1 class="text-2xl font-bold text-white">incubator-os</h1>
      <p class="text-sm text-slate-400 mt-1">Sign in to continue</p>
    </div>

    <!-- Card -->
    <div class="bg-white rounded-2xl shadow-2xl p-8">

      <!-- Error message -->
      <div *ngIf="errorMsg()"
           class="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
        <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        </svg>
        <p class="text-sm text-red-700">{{ errorMsg() }}</p>
      </div>

      <form (ngSubmit)="submit()" #loginForm="ngForm">

        <!-- Username -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1.5" for="username">
            Username or Email
          </label>
          <input
            id="username"
            type="text"
            [(ngModel)]="username"
            name="username"
            autocomplete="username"
            required
            placeholder="Enter your username"
            class="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors"
            [class.border-red-300]="errorMsg()">
        </div>

        <!-- Password -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-1.5" for="password">
            Password
          </label>
          <div class="relative">
            <input
              id="password"
              [type]="showPassword() ? 'text' : 'password'"
              [(ngModel)]="password"
              name="password"
              autocomplete="current-password"
              required
              placeholder="Enter your password"
              class="w-full px-4 py-2.5 pr-10 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors"
              [class.border-red-300]="errorMsg()">
            <button type="button" (click)="showPassword.set(!showPassword())"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg *ngIf="!showPassword()" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              <svg *ngIf="showPassword()" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Forgot password -->
        <div class="mb-5 text-right">
          <a routerLink="/set-password"
             class="text-xs text-violet-600 hover:text-violet-800 font-medium">
            Forgot password?
          </a>
        </div>

        <!-- Submit -->
        <button type="submit"
          [disabled]="isLoading() || !username || !password"
          class="w-full py-2.5 px-4 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          <svg *ngIf="isLoading()" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          {{ isLoading() ? 'Signing in…' : 'Sign in' }}
        </button>

      </form>
    </div>

    <p class="text-center text-xs text-slate-500 mt-6">
      incubator-os {{ version }}
    </p>
  </div>
</div>
  `,
})
export class LoginComponent {
  username = '';
  password = '';

  isLoading = signal(false);
  errorMsg  = signal<string | null>(null);
  showPassword = signal(false);

  readonly version = 'v2.0.0';

  private logSvc = inject(ActivityLogService);

  constructor(private auth: AuthService, private router: Router) {}

  submit(): void {
    if (!this.username || !this.password) return;

    this.isLoading.set(true);
    this.errorMsg.set(null);

    this.auth.login(this.username.trim(), this.password).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.logSvc.log({ action: 'login', details: `User ${this.username.trim()} logged in` }).subscribe();
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err?.error?.error || err?.message || 'Login failed. Please try again.';
        this.errorMsg.set(msg);
      },
    });
  }
}
