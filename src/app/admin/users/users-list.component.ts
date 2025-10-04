import { Component, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService, UserListResponse } from '../../../services/user.service';
import { catchError, EMPTY, debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { User, UserRole, UserStatus } from '../../../models/simple.schema';
import { INode } from '../../../models/schema';

interface UserWithCompany extends User {
  companyName?: string;
}

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900">Users</h1>
              <p class="text-gray-600 mt-2">Manage system users and their access</p>
            </div>
            <button
              (click)="openCreateModal()"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Add User
            </button>
          </div>

          <!-- Filters and Search -->
          <div class="mt-6 flex flex-wrap gap-4">
            <!-- Search -->
            <div class="flex-1 min-w-64">
              <input
                type="text"
                placeholder="Search users by name, email, or username..."
                [(ngModel)]="searchQuery"
                (input)="onSearchChange()"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>

            <!-- Status Filter -->
            <select
              [(ngModel)]="statusFilter"
              (ngModelChange)="onFilterChange()"
              class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="invited">Invited</option>
            </select>

            <!-- Role Filter -->
            <select
              [(ngModel)]="roleFilter"
              (ngModelChange)="onFilterChange()"
              class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Director">Director</option>
              <option value="Advisor">Advisor</option>
              <option value="Staff">Staff</option>
            </select>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading()" class="flex justify-center items-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span class="ml-3 text-gray-600">Loading users...</span>
        </div>

        <!-- Error State -->
        <div *ngIf="error()" class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div class="text-red-600 text-lg font-medium mb-2">Failed to load users</div>
          <p class="text-red-500 mb-4">{{ error() }}</p>
          <button
            (click)="loadUsers()"
            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
            Try Again
          </button>
        </div>

        <!-- Empty State -->
        <div *ngIf="!isLoading() && !error() && filteredUsers().length === 0"
             class="text-center py-12">
          <div class="text-gray-400 text-6xl mb-4">👥</div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            {{ users().length === 0 ? 'No users yet' : 'No users found' }}
          </h3>
          <p class="text-gray-500 mb-6">
            {{ users().length === 0 ? 'Get started by creating your first user account.' : 'Try adjusting your search criteria or filters.' }}
          </p>
          <button
            *ngIf="users().length === 0"
            (click)="openCreateModal()"
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Create First User
          </button>
        </div>

        <!-- Users Table -->
        <div *ngIf="!isLoading() && !error() && filteredUsers().length > 0"
             class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr *ngFor="let user of filteredUsers()" class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="flex-shrink-0 h-10 w-10">
                        <div class="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                          {{ getInitials(user.fullName || user.username || user.email || 'User') }}
                        </div>
                      </div>
                      <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">
                          {{ user.fullName || user.username || user.email || 'Unknown User' }}
                        </div>
                        <div class="text-sm text-gray-500">{{ '@' + user.username }}</div>
                        <div class="text-xs text-gray-400">ID: {{ user.id }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span [class]="getRoleClasses(user.role)">
                      {{ user.role }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">{{ user.companyName || 'N/A' }}</div>
                    <div class="text-xs text-gray-500">Company ID: {{ user.companyId || 'None' }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span [class]="getStatusClasses(user.status)">
                      {{ user.status }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">{{ user.email || 'No email' }}</div>
                    <div class="text-sm text-gray-500">{{ user.phone || 'No phone' }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex justify-end space-x-2">
                      <button
                        (click)="openEditModal(user)"
                        class="text-blue-600 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-50">
                        Edit
                      </button>
                      <button
                        (click)="confirmDelete(user)"
                        class="text-red-600 hover:text-red-900 px-2 py-1 rounded hover:bg-red-50">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Pagination Controls -->
        <div *ngIf="!isLoading() && !error() && users().length > 0"
             class="bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-2">
              <span class="text-sm text-gray-700">Show:</span>
              <select
                [(ngModel)]="pageSize"
                (ngModelChange)="onPageSizeChange()"
                class="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span class="text-sm text-gray-700">per page</span>
            </div>
            <div class="text-sm text-gray-500" *ngIf="pagination()">
              Showing {{ ((pagination()!.current_page - 1) * pagination()!.per_page) + 1 }} to
              {{ Math.min(pagination()!.current_page * pagination()!.per_page, pagination()!.total) }}
              of {{ pagination()!.total }} users
            </div>
          </div>

          <div class="flex items-center space-x-1" *ngIf="pagination()">
            <!-- Previous Page -->
            <button
              (click)="goToPage(pagination()!.current_page - 1)"
              [disabled]="!pagination()!.has_prev"
              class="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
              Previous
            </button>

            <!-- Page Numbers -->
            <div class="flex space-x-1">
              <button
                *ngFor="let page of getVisiblePages()"
                (click)="goToPage(page)"
                [class]="page === pagination()!.current_page
                  ? 'px-3 py-1 bg-blue-600 text-white rounded text-sm'
                  : 'px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50'">
                {{ page }}
              </button>
            </div>

            <!-- Next Page -->
            <button
              (click)="goToPage(pagination()!.current_page + 1)"
              [disabled]="!pagination()!.has_more"
              class="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
              Next
            </button>
          </div>
        </div>

        <!-- Create/Edit User Modal -->
        <div *ngIf="showModal()"
             class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div class="px-6 py-4 border-b border-gray-200">
              <h3 class="text-lg font-semibold text-gray-900">
                {{ editingUser() ? 'Edit User' : 'Create New User' }}
              </h3>
            </div>

            <div class="px-6 py-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Basic Information -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    [(ngModel)]="modalForm.fullName"
                    placeholder="Enter full name"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                  <input
                    type="text"
                    [(ngModel)]="modalForm.username"
                    placeholder="Enter username"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    [(ngModel)]="modalForm.email"
                    placeholder="Enter email address"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    [(ngModel)]="modalForm.phone"
                    placeholder="Enter phone number"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>

                <!-- ID Information -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">ID Type *</label>
                  <select
                    [(ngModel)]="modalForm.idType"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="RSA_ID">South African ID</option>
                    <option value="Passport">Passport</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">ID Number *</label>
                  <input
                    type="text"
                    [(ngModel)]="modalForm.idNumber"
                    placeholder="Enter ID number"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>

                <!-- Role & Status -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                  <select
                    [(ngModel)]="modalForm.role"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="Admin">Admin</option>
                    <option value="Director">Director</option>
                    <option value="Advisor">Advisor</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                  <select
                    [(ngModel)]="modalForm.status"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="invited">Invited</option>
                  </select>
                </div>

                <!-- Company ID -->
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Company ID</label>
                  <input
                    type="number"
                    [(ngModel)]="modalForm.companyId"
                    placeholder="Enter company ID (optional)"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
              </div>
            </div>

            <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                (click)="closeModal()"
                class="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                (click)="saveUser()"
                [disabled]="isSaving() || !modalForm.username || !modalForm.idNumber || !modalForm.idType"
                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50">
                {{ isSaving() ? 'Saving...' : (editingUser() ? 'Update User' : 'Create User') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Delete Confirmation Modal -->
        <div *ngIf="showDeleteModal()"
             class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div class="px-6 py-4 border-b border-gray-200">
              <h3 class="text-lg font-semibold text-red-700">Confirm Delete</h3>
            </div>

            <div class="px-6 py-4">
              <p class="text-gray-700">
                Are you sure you want to delete user "<strong>{{ deleteTarget()?.fullName || deleteTarget()?.username }}</strong>"?
              </p>
              <p class="text-sm text-red-600 mt-2">
                This action cannot be undone. The user will lose access to the system immediately.
              </p>
            </div>

            <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                (click)="cancelDelete()"
                class="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                (click)="deleteUser()"
                [disabled]="isDeleting()"
                class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50">
                {{ isDeleting() ? 'Deleting...' : 'Delete User' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class UsersListComponent implements OnInit {
  users = signal<UserWithCompany[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Pagination state
  pagination = signal<UserListResponse['pagination'] | null>(null);
  currentPage = signal(1);
  pageSize = 20;

  // Filter state
  searchQuery = '';
  statusFilter = '';
  roleFilter = '';

  // Search debouncing
  private searchSubject = new Subject<string>();

  // Modal state
  showModal = signal(false);
  editingUser = signal<UserWithCompany | null>(null);
  isSaving = signal(false);
  modalForm = {
    fullName: '',
    username: '',
    email: '',
    phone: '',
    idType: 'RSA_ID' as string,
    idNumber: '',
    role: 'Staff' as UserRole,
    status: 'active' as UserStatus,
    companyId: null as number | null
  };

  // Delete modal state
  showDeleteModal = signal(false);
  deleteTarget = signal<UserWithCompany | null>(null);
  isDeleting = signal(false);

  // Computed
  filteredUsers = computed(() => {
    // With pagination, we don't filter on the frontend anymore
    // The backend handles all filtering
    return this.users();
  });

  // Expose Math for template
  Math = Math;

  constructor(
    private userService: UserService,
    private router: Router
  ) {
    // Setup search debouncing
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.currentPage.set(1); // Reset to first page on search
      this.loadUsers();
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.error.set(null);

    const options = {
      page: this.currentPage(),
      per_page: this.pageSize,
      q: this.searchQuery.trim() || undefined,
      role: this.roleFilter || undefined,
      status: this.statusFilter || undefined
    };

    // Remove undefined values
    Object.keys(options).forEach(key =>
      options[key as keyof typeof options] === undefined && delete options[key as keyof typeof options]
    );

    this.userService.searchUsersAdvanced(options)
      .pipe(
        catchError(error => {
          this.error.set(error.message || 'Failed to load users');
          this.isLoading.set(false);
          return EMPTY;
        })
      )
      .subscribe((response: UserListResponse) => {
        const users: UserWithCompany[] = response.data.map(user => {
          // Handle both INode format and direct user data
          const userData = (user.data || user) as any;

          return {
            id: userData.id,
            idType: userData.id_type || userData.idType || '',
            idNumber: userData.id_number || userData.idNumber || '',
            companyId: userData.company_id || userData.companyId || 0,
            fullName: userData.full_name || userData.fullName || null,
            email: userData.email || null,
            phone: userData.phone || null,
            username: userData.username,
            role: userData.role,
            race: userData.race || null,
            gender: userData.gender || null,
            status: userData.status,
            createdAt: userData.created_at || userData.createdAt,
            updatedAt: userData.updated_at || userData.updatedAt,
            companyName: undefined // Will be populated later if needed
          };
        });

        this.users.set(users);
        this.pagination.set(response.pagination);
        this.isLoading.set(false);
      });
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchQuery);
  }

  onFilterChange(): void {
    this.currentPage.set(1); // Reset to first page on filter change
    this.loadUsers();
  }

  onPageSizeChange(): void {
    this.currentPage.set(1); // Reset to first page when changing page size
    this.loadUsers();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= (this.pagination()?.pages || 1)) {
      this.currentPage.set(page);
      this.loadUsers();
    }
  }

  getVisiblePages(): number[] {
    const current = this.pagination()?.current_page || 1;
    const total = this.pagination()?.pages || 1;
    const visible: number[] = [];

    // Always show first page
    if (total > 0) visible.push(1);

    // Show pages around current
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      if (!visible.includes(i)) visible.push(i);
    }

    // Always show last page
    if (total > 1 && !visible.includes(total)) visible.push(total);

    return visible.sort((a, b) => a - b);
  }

  openCreateModal(): void {
    this.modalForm = {
      fullName: '',
      username: '',
      email: '',
      phone: '',
      idType: 'RSA_ID',
      idNumber: '',
      role: 'Staff',
      status: 'active',
      companyId: null
    };
    this.editingUser.set(null);
    this.showModal.set(true);
  }

  openEditModal(user: UserWithCompany): void {
    this.modalForm = {
      fullName: user.fullName || '',
      username: user.username,
      email: user.email || '',
      phone: user.phone || '',
      idType: user.idType,
      idNumber: user.idNumber,
      role: user.role,
      status: user.status,
      companyId: user.companyId
    };
    this.editingUser.set(user);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingUser.set(null);
    this.isSaving.set(false);
  }

  saveUser(): void {
    if (!this.modalForm.username || !this.modalForm.idNumber || !this.modalForm.idType) return;

    this.isSaving.set(true);

    const userData = {
      fullName: this.modalForm.fullName || null,
      username: this.modalForm.username,
      email: this.modalForm.email || null,
      phone: this.modalForm.phone || null,
      idType: this.modalForm.idType,
      idNumber: this.modalForm.idNumber,
      role: this.modalForm.role,
      status: this.modalForm.status,
      companyId: this.modalForm.companyId || 0
    };

    const editingUser = this.editingUser();
    const operation = editingUser
      ? this.userService.updateUser(editingUser.id, userData)
      : this.userService.addUser(userData);

    operation.pipe(
      catchError(error => {
        console.error('Failed to save user:', error);
        this.isSaving.set(false);
        return EMPTY;
      })
    ).subscribe(() => {
      this.isSaving.set(false);
      this.closeModal();
      this.loadUsers();
    });
  }

  confirmDelete(user: UserWithCompany): void {
    this.deleteTarget.set(user);
    this.showDeleteModal.set(true);
  }

  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.deleteTarget.set(null);
    this.isDeleting.set(false);
  }

  deleteUser(): void {
    const target = this.deleteTarget();
    if (!target) return;

    this.isDeleting.set(true);

    this.userService.deleteUser(target.id)
      .pipe(
        catchError(error => {
          console.error('Failed to delete user:', error);
          this.isDeleting.set(false);
          return EMPTY;
        })
      )
      .subscribe(() => {
        this.isDeleting.set(false);
        this.cancelDelete();
        this.loadUsers();
      });
  }

  getInitials(name: string | null | undefined): string {
    if (!name || name.trim() === '') {
      return '??'; // Default when no name available
    }

    const cleanName = name.trim();

    // If it looks like an email, use the part before @
    if (cleanName.includes('@')) {
      const emailPart = cleanName.split('@')[0];
      // If email part has dots, treat as first.last
      if (emailPart.includes('.')) {
        return emailPart
          .split('.')
          .map(part => part.charAt(0))
          .join('')
          .substring(0, 2)
          .toUpperCase();
      }
      // Otherwise just use first 2 characters
      return emailPart.substring(0, 2).toUpperCase();
    }

    // For regular names, split by space
    return cleanName
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  getRoleClasses(role: string): string {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800';
      case 'director':
        return 'inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800';
      case 'advisor':
        return 'inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800';
      default:
        return 'inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800';
    }
  }

  getStatusClasses(status: string): string {
    switch (status.toLowerCase()) {
      case 'active':
        return 'inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800';
      case 'inactive':
        return 'inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800';
      case 'invited':
        return 'inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800';
      default:
        return 'inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800';
    }
  }
}
