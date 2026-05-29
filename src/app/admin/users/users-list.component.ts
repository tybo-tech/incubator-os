import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, UserListResponse } from '../../../services/user.service';
import { catchError, EMPTY, debounceTime, distinctUntilChanged, Subject, switchMap, of } from 'rxjs';
import { User, UserRole, UserStatus, initUser } from '../../../models/simple.schema';
import { Constants } from '../../../services/service';
import { EmailService } from '../../../services/email/email.service';

// ── Constants ──────────────────────────────────────────────────────────────────

export const SYSTEM_ROLES: UserRole[] = [
  'System Administrator',
  'Coordinator',
  'Judge',
  'External Judge',
  'Advisor',
  'Director',
  'Staff',
];

const ROLE_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  'System Administrator': { bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-500'    },
  'Coordinator':          { bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500' },
  'Judge':                { bg: 'bg-violet-100', text: 'text-violet-800', dot: 'bg-violet-500' },
  'External Judge':       { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
  'Advisor':              { bg: 'bg-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-500'   },
  'Director':             { bg: 'bg-teal-100',   text: 'text-teal-800',   dot: 'bg-teal-500'   },
  'Staff':                { bg: 'bg-gray-100',   text: 'text-gray-700',   dot: 'bg-gray-400'   },
};

const AVATAR_COLOR: Record<string, string> = {
  'System Administrator': 'bg-red-500',
  'Coordinator':          'bg-orange-500',
  'Judge':                'bg-violet-600',
  'External Judge':       'bg-purple-500',
  'Advisor':              'bg-blue-500',
  'Director':             'bg-teal-600',
  'Staff':                'bg-gray-500',
};

interface UserRow extends User { }

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="min-h-screen bg-gray-50">
  <div class="max-w-7xl mx-auto px-6 py-8">

    <!-- ── Header ──────────────────────────────────────────────────── -->
    <div class="flex items-start justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Users</h1>
        <p class="text-sm text-gray-500 mt-0.5">Manage system users and their roles</p>
      </div>
      <button (click)="openCreate()"
        class="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors shadow-sm">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
        </svg>
        Add User
      </button>
    </div>

    <!-- ── Role stat pills ─────────────────────────────────────────── -->
    <div class="flex flex-wrap gap-2 mb-5">
      <button type="button"
        (click)="roleFilter = ''; onFilterChange()"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
        [class.bg-violet-600]="roleFilter === ''"
        [class.text-white]="roleFilter === ''"
        [class.border-violet-600]="roleFilter === ''"
        [class.bg-white]="roleFilter !== ''"
        [class.text-gray-600]="roleFilter !== ''"
        [class.border-gray-200]="roleFilter !== ''">
        All <span class="font-bold">{{ pagination()?.total ?? users().length }}</span>
      </button>
      <button *ngFor="let r of roles" type="button"
        (click)="roleFilter = r; onFilterChange()"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
        [class.bg-violet-600]="roleFilter === r"
        [class.text-white]="roleFilter === r"
        [class.border-violet-600]="roleFilter === r"
        [class.bg-white]="roleFilter !== r"
        [class.border-gray-200]="roleFilter !== r"
        [ngClass]="roleFilter !== r ? roleTextClass(r) : ''">
        <span class="w-1.5 h-1.5 rounded-full" [ngClass]="roleDotClass(r)"></span>
        {{ r }}
      </button>
    </div>

    <!-- ── Search + status filter ──────────────────────────────────── -->
    <div class="flex gap-3 mb-5">
      <div class="relative flex-1">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input type="text" placeholder="Search by name or email…"
          [(ngModel)]="searchQuery" (input)="onSearchChange()"
          class="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent">
      </div>
      <select [(ngModel)]="statusFilter" (ngModelChange)="onFilterChange()"
        class="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="invited">Invited</option>
      </select>
    </div>

    <!-- ── Loading ─────────────────────────────────────────────────── -->
    <div *ngIf="isLoading()" class="flex justify-center py-20">
      <div class="flex flex-col items-center gap-3">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        <span class="text-sm text-gray-400">Loading users…</span>
      </div>
    </div>

    <!-- ── Error ───────────────────────────────────────────────────── -->
    <div *ngIf="error() && !isLoading()" class="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
      <p class="text-red-600 text-sm font-medium mb-3">{{ error() }}</p>
      <button (click)="loadUsers()" class="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">Retry</button>
    </div>

    <!-- ── Empty ───────────────────────────────────────────────────── -->
    <div *ngIf="!isLoading() && !error() && users().length === 0" class="text-center py-20">
      <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
      </div>
      <h3 class="text-sm font-semibold text-gray-900 mb-1">No users found</h3>
      <p class="text-xs text-gray-400">Try adjusting your filters or add a new user.</p>
    </div>

    <!-- ── User cards grid ─────────────────────────────────────────── -->
    <div *ngIf="!isLoading() && !error() && users().length > 0"
         class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <div *ngFor="let user of users()"
           class="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col">

        <!-- Card top: avatar + name + role badge -->
        <div class="p-4 flex items-start gap-3">
          <div class="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold"
               [ngClass]="avatarBg(user.role)">
            {{ initials(user.full_name || user.username || user.email || '') }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-gray-900 truncate">
              {{ user.full_name || user.username || user.email || 'Unknown' }}
            </p>
            <p class="text-xs text-gray-400 truncate">{{ user.email || user.username }}</p>
            <span class="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  [ngClass]="roleBg(user.role) + ' ' + roleText(user.role)">
              <span class="w-1.5 h-1.5 rounded-full" [ngClass]="roleDotClass(user.role)"></span>
              {{ user.role }}
            </span>
          </div>
        </div>

        <!-- Card body: status + phone -->
        <div class="px-4 pb-3 flex items-center gap-3 text-xs text-gray-500">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium"
                [ngClass]="statusClass(user.status)">
            {{ user.status }}
          </span>
          <span *ngIf="user.phone" class="truncate">{{ user.phone }}</span>
        </div>

        <!-- Card footer: actions -->
        <div class="mt-auto border-t border-gray-100 px-3 py-2.5 flex items-center justify-between gap-1">
          <span class="text-[10px] text-gray-300 font-mono shrink-0">ID {{ user.id }}</span>
          <div class="flex items-center gap-1">

            <!-- Invite to set password -->
            <button (click)="sendInvite(user)" title="Send invite email"
              [disabled]="invitingId() === user.id"
              class="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold
                     rounded-lg transition-colors
                     text-sky-700 bg-sky-50 hover:bg-sky-100
                     disabled:opacity-50 disabled:cursor-not-allowed">
              <svg *ngIf="invitingId() !== user.id" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              <svg *ngIf="invitingId() === user.id" class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Invite
            </button>

            <!-- Admin set password -->
            <button (click)="openSetPassword(user)" title="Set password manually"
              class="p-1.5 text-gray-400 bg-gray-50 rounded-lg hover:bg-amber-50 hover:text-amber-600 transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </button>

            <!-- Edit -->
            <button (click)="openEdit(user)"
              class="p-1.5 text-violet-600 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors" title="Edit user">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>

            <!-- Delete -->
            <button (click)="confirmDelete(user)"
              class="p-1.5 text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors" title="Delete user">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- ── Pagination ──────────────────────────────────────────────── -->
    <div *ngIf="pagination() && !isLoading() && !error() && users().length > 0"
         class="mt-6 flex items-center justify-between text-sm text-gray-500">
      <div class="flex items-center gap-3">
        <span>
          {{ (pagination()!.current_page - 1) * pagination()!.per_page + 1 }}–{{ Math.min(pagination()!.current_page * pagination()!.per_page, pagination()!.total) }}
          of {{ pagination()!.total }} users
        </span>
        <select [(ngModel)]="pageSize" (ngModelChange)="onPageSizeChange()"
          class="text-xs border border-gray-200 rounded px-2 py-1 bg-white">
          <option [value]="20">20 / page</option>
          <option [value]="50">50 / page</option>
          <option [value]="100">100 / page</option>
        </select>
      </div>
      <div class="flex items-center gap-1">
        <button (click)="goToPage(pagination()!.current_page - 1)" [disabled]="!pagination()!.has_prev"
          class="px-3 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
          ← Prev
        </button>
        <button *ngFor="let p of visiblePages()" (click)="goToPage(p)"
          class="px-3 py-1.5 border rounded-lg text-xs transition-colors"
          [class.bg-violet-600]="p === pagination()!.current_page"
          [class.text-white]="p === pagination()!.current_page"
          [class.border-violet-600]="p === pagination()!.current_page"
          [class.border-gray-200]="p !== pagination()!.current_page"
          [class.hover:bg-gray-50]="p !== pagination()!.current_page">
          {{ p }}
        </button>
        <button (click)="goToPage(pagination()!.current_page + 1)" [disabled]="!pagination()!.has_more"
          class="px-3 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
          Next →
        </button>
      </div>
    </div>
  </div>
</div>

<!-- ══ Create / Edit modal ════════════════════════════════════════════════ -->
<div *ngIf="showModal()"
     class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
     (click)="closeModal()">
  <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
       (click)="$event.stopPropagation()">

    <!-- Modal header -->
    <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
      <h3 class="text-base font-semibold text-gray-900">
        {{ editing() ? 'Edit User' : 'Add User' }}
      </h3>
      <button (click)="closeModal()" class="text-gray-400 hover:text-gray-600 transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <!-- Modal body -->
    <div class="px-6 py-5 space-y-4">

      <!-- Role (prominent — most important for our use case) -->
      <div>
        <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Role</label>
        <div class="flex flex-wrap gap-2">
          <button *ngFor="let r of roles" type="button"
            (click)="form.role = r"
            class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
            [class.border-violet-500]="form.role === r"
            [class.bg-violet-600]="form.role === r"
            [class.text-white]="form.role === r"
            [class.bg-white]="form.role !== r"
            [class.border-gray-200]="form.role !== r"
            [ngClass]="form.role !== r ? roleTextClass(r) : ''">
            {{ r }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <!-- Full name -->
        <div class="col-span-2">
          <label class="block text-xs font-medium text-gray-600 mb-1">Full name</label>
          <input type="text" [(ngModel)]="form.full_name" placeholder="e.g. Marius Williams"
            class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500">
        </div>

        <!-- Email -->
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input type="email" [(ngModel)]="form.email" placeholder="name@domain.com"
            class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500">
        </div>

        <!-- Phone -->
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Phone</label>
          <input type="tel" [(ngModel)]="form.phone" placeholder="0821234567"
            class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500">
        </div>

        <!-- Username -->
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Username <span class="text-red-400">*</span></label>
          <input type="text" [(ngModel)]="form.username" placeholder="username or email"
            class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500">
        </div>

        <!-- Status -->
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select [(ngModel)]="form.status"
            class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="invited">Invited</option>
          </select>
        </div>

        <!-- ID Type -->
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">ID type</label>
          <select [(ngModel)]="form.id_type"
            class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
            <option value="RSA_ID">SA ID</option>
            <option value="Passport">Passport</option>
          </select>
        </div>

        <!-- ID Number -->
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">ID number</label>
          <input type="text" [(ngModel)]="form.id_number" placeholder="ID or passport number"
            class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500">
        </div>
      </div>
    </div>

    <!-- Modal footer -->
    <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
      <button (click)="closeModal()"
        class="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
        Cancel
      </button>
      <button (click)="saveUser()" [disabled]="isSaving() || !form.username"
        class="px-5 py-2 text-sm font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">
        {{ isSaving() ? 'Saving…' : (editing() ? 'Update' : 'Create User') }}
      </button>
    </div>
  </div>
</div>

<!-- ══ Set Password modal ═══════════════════════════════════════════════ -->
<div *ngIf="passwordTarget()"
     class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
     (click)="closePasswordModal()">
  <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
       (click)="$event.stopPropagation()">

    <!-- header -->
    <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
          <svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-gray-900">Set Password</h3>
          <p class="text-xs text-gray-400">{{ passwordTarget()!.full_name || passwordTarget()!.username }}</p>
        </div>
      </div>
      <button (click)="closePasswordModal()" class="text-gray-400 hover:text-gray-600">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <!-- body -->
    <div class="px-6 py-5 space-y-4">

      <!-- error -->
      <div *ngIf="pwError()" class="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
        <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01"/>
        </svg>
        {{ pwError() }}
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">New Password</label>
        <input type="password" [(ngModel)]="pwForm.password" placeholder="Min. 6 characters"
          autocomplete="new-password"
          class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500">
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">Confirm Password</label>
        <input type="password" [(ngModel)]="pwForm.confirm" placeholder="Repeat the password"
          autocomplete="new-password"
          class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500">
      </div>
    </div>

    <!-- footer -->
    <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
      <button (click)="closePasswordModal()"
        class="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
        Cancel
      </button>
      <button (click)="savePassword()" [disabled]="isSavingPw() || !pwForm.password || !pwForm.confirm"
        class="px-5 py-2 text-sm font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors">
        {{ isSavingPw() ? 'Saving…' : 'Set Password' }}
      </button>
    </div>
  </div>
</div>
<!-- ══ Invite toast ═════════════════════════════════════════════════════════════ -->
<div *ngIf="inviteToast()"
     class="fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-sm font-medium"
     [ngClass]="inviteToast()!.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'">
  <svg *ngIf="inviteToast()!.type === 'success'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
  </svg>
  <svg *ngIf="inviteToast()!.type === 'error'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
      d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
  </svg>
  {{ inviteToast()!.message }}
</div>
<!-- ══ Delete confirm modal ═══════════════════════════════════════════════ -->
<div *ngIf="deleteTarget()"
     class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
  <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
    <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
      <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
    </div>
    <h3 class="text-base font-semibold text-gray-900 text-center mb-2">Delete user?</h3>
    <p class="text-sm text-gray-500 text-center mb-5">
      <strong>{{ deleteTarget()!.full_name || deleteTarget()!.username }}</strong> will lose access immediately. This cannot be undone.
    </p>
    <div class="flex gap-3">
      <button (click)="cancelDelete()"
        class="flex-1 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
        Cancel
      </button>
      <button (click)="doDelete()" [disabled]="isDeleting()"
        class="flex-1 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
        {{ isDeleting() ? 'Deleting…' : 'Delete' }}
      </button>
    </div>
  </div>
</div>
  `,
})
export class UsersListComponent implements OnInit {
  readonly roles = SYSTEM_ROLES;
  readonly Math = Math;

  users      = signal<UserRow[]>([]);
  isLoading  = signal(false);
  error      = signal<string | null>(null);
  pagination = signal<UserListResponse['pagination'] | null>(null);
  currentPage = signal(1);
  pageSize    = 20;

  searchQuery  = '';
  statusFilter = '';
  roleFilter   = '';

  showModal  = signal(false);
  editing    = signal<UserRow | null>(null);
  isSaving   = signal(false);

  deleteTarget = signal<UserRow | null>(null);
  isDeleting   = signal(false);

  passwordTarget = signal<UserRow | null>(null);
  isSavingPw     = signal(false);
  pwError        = signal<string | null>(null);
  pwForm         = { password: '', confirm: '' };

  invitingId  = signal<number | null>(null);
  inviteToast = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  form = this.emptyForm();

  private searchSubject = new Subject<string>();

  visiblePages = computed(() => {
    const p = this.pagination();
    if (!p) return [];
    const cur = p.current_page, total = p.pages;
    const pages = new Set<number>([1]);
    for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.add(i);
    if (total > 1) pages.add(total);
    return [...pages].sort((a, b) => a - b);
  });

  constructor(private userService: UserService, private emailService: EmailService) {
    this.searchSubject.pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => { this.currentPage.set(1); this.loadUsers(); });
  }

  ngOnInit(): void { this.loadUsers(); }

  loadUsers(): void {
    this.isLoading.set(true);
    this.error.set(null);
    const opts: Record<string, any> = {
      page:     this.currentPage(),
      per_page: this.pageSize,
      q:        this.searchQuery.trim() || undefined,
      role:     this.roleFilter   || undefined,
      status:   this.statusFilter || undefined,
    };
    Object.keys(opts).forEach(k => opts[k] === undefined && delete opts[k]);

    this.userService.searchUsersAdvanced(opts).pipe(
      catchError(err => { this.error.set(err.message || 'Failed to load users'); this.isLoading.set(false); return EMPTY; })
    ).subscribe((res: UserListResponse) => {
      this.users.set(res.data.map(u => ((u as any).data || u) as UserRow));
      this.pagination.set(res.pagination);
      this.isLoading.set(false);
    });
  }

  onSearchChange()   { this.searchSubject.next(this.searchQuery); }
  onFilterChange()   { this.currentPage.set(1); this.loadUsers(); }
  onPageSizeChange() { this.currentPage.set(1); this.loadUsers(); }
  goToPage(p: number) {
    if (p >= 1 && p <= (this.pagination()?.pages || 1)) { this.currentPage.set(p); this.loadUsers(); }
  }

  // ── Modal ────────────────────────────────────────────────────────────────────
  openCreate() { this.form = this.emptyForm(); this.editing.set(null); this.showModal.set(true); }
  openEdit(u: UserRow) {
    this.form = { ...initUser(u.company_id), ...u };
    this.editing.set(u);
    this.showModal.set(true);
  }
  closeModal() { this.showModal.set(false); this.editing.set(null); this.isSaving.set(false); }

  saveUser() {
    if (!this.form.username) return;
    this.isSaving.set(true);
    const payload = {
      full_name: this.form.full_name || null,
      username:  this.form.username,
      email:     this.form.email    || null,
      phone:     this.form.phone    || null,
      id_type:   this.form.id_type,
      id_number: this.form.id_number,
      role:      this.form.role,
      status:    this.form.status,
      company_id: Constants.MainCompanyId,
    };
    const u = this.editing();
    const op$ = u ? this.userService.updateUser(u.id, payload) : this.userService.addUser(payload);
    op$.pipe(catchError(() => { this.isSaving.set(false); return EMPTY; }))
       .subscribe(() => { this.isSaving.set(false); this.closeModal(); this.loadUsers(); });
  }
  // ── Invite ───────────────────────────────────────────────────────────────
  sendInvite(u: UserRow): void {
    if (this.invitingId() === u.id) return;
    this.invitingId.set(u.id);
    this.userService.inviteUser(u.id).pipe(
      switchMap(res => {
        const dispatch = res.dispatch;
        if (!dispatch?.recipient_email || !dispatch?.token) {
          this.showToast('error', 'Failed to generate invite token.');
          return EMPTY;
        }

        // Build invite link dynamically using the current host
        const inviteLink = window.location.origin + '/set-password?token=' + encodeURIComponent(dispatch.token);

        return this.emailService.sendInvite(
          dispatch.recipient_name || dispatch.recipient_email,
          dispatch.recipient_email,
          inviteLink,
        ).pipe(
          catchError(() => {
            this.showToast('error', 'Token created but email delivery failed.');
            return of(null);
          }),
        );
      }),
      catchError(err => {
        this.showToast('error', err?.error?.error || 'Failed to send invite.');
        return EMPTY;
      }),
    ).subscribe(() => {
      this.invitingId.set(null);
      this.showToast('success', 'Invite sent!');
      this.loadUsers();
    });
  }

  private showToast(type: 'success' | 'error', message: string): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.inviteToast.set({ type, message });
    this.toastTimer = setTimeout(() => this.inviteToast.set(null), 4000);
  }

  // ── Set Password ───────────────────────────────────────────────────────────────
  openSetPassword(u: UserRow) {
    this.passwordTarget.set(u);
    this.pwForm = { password: '', confirm: '' };
    this.pwError.set(null);
  }

  closePasswordModal() {
    this.passwordTarget.set(null);
    this.isSavingPw.set(false);
    this.pwError.set(null);
  }

  savePassword() {
    const target = this.passwordTarget();
    if (!target) return;

    if (this.pwForm.password.length < 6) {
      this.pwError.set('Password must be at least 6 characters.');
      return;
    }
    if (this.pwForm.password !== this.pwForm.confirm) {
      this.pwError.set('Passwords do not match.');
      return;
    }

    this.isSavingPw.set(true);
    this.pwError.set(null);

    this.userService.changePassword(target.id, this.pwForm.password).pipe(
      catchError(err => {
        this.pwError.set(err?.error?.error || 'Failed to set password.');
        this.isSavingPw.set(false);
        return EMPTY;
      })
    ).subscribe(() => {
      this.isSavingPw.set(false);
      this.closePasswordModal();
    });
  }
  // ── Delete ───────────────────────────────────────────────────────────────────
  confirmDelete(u: UserRow) { this.deleteTarget.set(u); }
  cancelDelete()            { this.deleteTarget.set(null); this.isDeleting.set(false); }
  doDelete() {
    const t = this.deleteTarget(); if (!t) return;
    this.isDeleting.set(true);
    this.userService.deleteUser(t.id).pipe(
      catchError(() => { this.isDeleting.set(false); return EMPTY; })
    ).subscribe(() => { this.isDeleting.set(false); this.cancelDelete(); this.loadUsers(); });
  }

  // ── Style helpers ────────────────────────────────────────────────────────────
  private emptyForm(): User {
    return initUser(Constants.MainCompanyId);
  }

  initials(name: string): string {
    if (!name) return '?';
    if (name.includes('@')) {
      const part = name.split('@')[0];
      return (part.includes('.') ? part.split('.').map(p => p[0]).join('') : part.substring(0, 2)).toUpperCase();
    }
    return name.trim().split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
  }

  avatarBg(role: string)   { return AVATAR_COLOR[role] ?? 'bg-gray-500'; }
  roleBg(role: string)     { return (ROLE_STYLE[role] ?? ROLE_STYLE['Staff']).bg; }
  roleText(role: string)   { return (ROLE_STYLE[role] ?? ROLE_STYLE['Staff']).text; }
  roleDotClass(role: string)  { return (ROLE_STYLE[role] ?? ROLE_STYLE['Staff']).dot; }
  roleTextClass(role: string) { return (ROLE_STYLE[role] ?? ROLE_STYLE['Staff']).text; }

  statusClass(status: string): string {
    switch (status) {
      case 'active':   return 'bg-green-100 text-green-700';
      case 'inactive': return 'bg-red-100 text-red-700';
      case 'invited':  return 'bg-amber-100 text-amber-700';
      default:         return 'bg-gray-100 text-gray-600';
    }
  }
}
