import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user.service';
import { IPickerConfig } from '../../admin/form-templates/interfaces/form-template.interfaces';

export interface UserPickerValue {
  id: number;
  full_name: string;
  email: string;
  role: string;
}

interface UserRecord {
  id: number;
  full_name: string;
  email: string;
  role: string;
  status: string;
}

const ROLE_BADGE: Record<string, string> = {
  'System Administrator': 'bg-red-100 text-red-700',
  'Coordinator':          'bg-orange-100 text-orange-700',
  'Judge':                'bg-violet-100 text-violet-700',
  'External Judge':       'bg-purple-100 text-purple-700',
  'Advisor':              'bg-blue-100 text-blue-700',
  'Director':             'bg-teal-100 text-teal-700',
  'Staff':                'bg-gray-100 text-gray-600',
};

@Component({
  selector: 'app-user-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative">

      <!-- Selected state -->
      <div *ngIf="selected" class="flex items-center gap-3 px-4 py-3 bg-violet-50 border border-violet-300
                                  rounded-xl mb-2">
        <div class="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center
                    text-violet-700 font-bold text-sm flex-shrink-0">
          {{ (selected!.full_name || '?').charAt(0) }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-gray-900 truncate">{{ selected!.full_name }}</p>
          <p class="text-xs text-gray-500">{{ selected!.role }} · {{ selected!.email }}</p>
        </div>
        <button type="button" (click)="clearSelection()"
          class="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Search input -->
      <div *ngIf="!selected" class="relative">
        <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <svg *ngIf="!isLoading()" class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
          <svg *ngIf="isLoading()" class="w-4 h-4 text-violet-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </div>
        <input
          type="text"
          [(ngModel)]="query"
          (input)="onQueryChange()"
          (focus)="showDropdown = true"
          [placeholder]="config?.placeholder ?? 'Search for a person...'"
          class="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm
                 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent">
      </div>

      <!-- Role filter pills (when multiple roles available) -->
      <div *ngIf="!selected && availableRoles().length > 1" class="flex flex-wrap gap-1.5 mt-2">
        <button type="button"
          (click)="activeRole = ''"
          [class]="!activeRole
            ? 'px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-violet-600 text-white'
            : 'px-2.5 py-0.5 text-[11px] font-medium rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200'">
          All
        </button>
        <button *ngFor="let role of availableRoles()" type="button"
          (click)="activeRole = role"
          [class]="activeRole === role
            ? 'px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-violet-600 text-white'
            : 'px-2.5 py-0.5 text-[11px] font-medium rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200'">
          {{ role }}
        </button>
      </div>

      <!-- Dropdown -->
      <div *ngIf="!selected && showDropdown && (filtered().length > 0 || (config?.allowFreeText && query.trim()))"
           class="absolute z-20 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-lg
                  max-h-60 overflow-y-auto">

        <!-- Free-text option -->
        <button *ngIf="config?.allowFreeText && query.trim()"
          type="button"
          (click)="selectFreeText()"
          class="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-2
                 border-b border-gray-100 text-sm">
          <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          <span class="text-gray-600">Use "<strong>{{ query }}</strong>" as name</span>
        </button>

        <!-- Results -->
        <button *ngFor="let user of filtered()"
          type="button"
          (click)="selectUser(user)"
          class="w-full text-left px-4 py-2.5 hover:bg-violet-50 flex items-center gap-3 transition-colors">
          <div class="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center
                      text-violet-700 font-bold text-sm flex-shrink-0">
            {{ user.full_name.charAt(0) }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">{{ user.full_name }}</p>
            <p class="text-xs text-gray-400 truncate">{{ user.email }}</p>
          </div>
          <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                [ngClass]="roleBadge(user.role)">
            {{ user.role }}
          </span>
        </button>

        <!-- No results -->
        <div *ngIf="filtered().length === 0 && !config?.allowFreeText"
             class="px-4 py-4 text-sm text-gray-400 text-center">
          No users found{{ query ? ' for "' + query + '"' : '' }}.
        </div>
      </div>

      <!-- Click-outside overlay -->
      <div *ngIf="showDropdown" class="fixed inset-0 z-10" (click)="showDropdown = false"></div>

    </div>
  `,
})
export class UserPickerComponent implements OnInit {
  @Input() config?: IPickerConfig;
  @Input() value?: UserPickerValue | null;
  @Output() valueChange = new EventEmitter<UserPickerValue | null>();

  isLoading = signal(false);
  private allUsers = signal<UserRecord[]>([]);

  query = '';
  activeRole = '';
  showDropdown = false;
  selected: UserPickerValue | null = null;

  availableRoles = computed(() => {
    const roles = [...new Set(this.allUsers().map(u => u.role).filter(Boolean))].sort();
    return roles;
  });

  filtered = computed(() => {
    const users = this.allUsers();
    const q = this.query.toLowerCase().trim();
    return users.filter(u => {
      const matchRole = !this.activeRole || u.role === this.activeRole;
      const matchQuery = !q ||
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      return matchRole && matchQuery;
    }).slice(0, 30);
  });

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    // Guard: only accept a proper UserPickerValue (must have a full_name string).
    // Stale submissions may have stored a plain string in the answers map.
    if (this.value && typeof (this.value as any).full_name === 'string') {
      this.selected = this.value;
    }
    this.loadUsers();
  }

  private loadUsers(): void {
    this.isLoading.set(true);
    // Always fetch all active users; role filtering is done client-side
    // so multi-role configs (Judge + Admin etc.) work without extra API calls.
    this.userService.searchUsersAdvanced({ per_page: 200, status: 'active' }).subscribe({
      next: (res) => {
        let users: UserRecord[] = (res.data as any[]).map((u: any) => ({
          id: u.id,
          full_name: u.full_name ?? u.username ?? '',
          email: u.email ?? '',
          role: u.role ?? '',
          status: u.status ?? '',
        }));
        // Client-side role filter (supports any number of roles)
        const roles = this.config?.roles;
        if (roles?.length) {
          users = users.filter(u => roles.includes(u.role));
        }
        users.sort((a, b) => a.full_name.localeCompare(b.full_name));
        this.allUsers.set(users);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  onQueryChange(): void {
    this.showDropdown = true;
  }

  selectUser(user: UserRecord): void {
    this.selected = { id: user.id, full_name: user.full_name, email: user.email, role: user.role };
    this.query = '';
    this.showDropdown = false;
    this.valueChange.emit(this.selected);
  }

  selectFreeText(): void {
    this.selected = { id: 0, full_name: this.query.trim(), email: '', role: '' };
    this.query = '';
    this.showDropdown = false;
    this.valueChange.emit(this.selected);
  }

  clearSelection(): void {
    this.selected = null;
    this.valueChange.emit(null);
  }

  roleBadge(role: string): string {
    return ROLE_BADGE[role] ?? 'bg-gray-100 text-gray-600';
  }
}
