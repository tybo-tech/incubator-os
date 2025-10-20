import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ICompany } from '../../../../../models/simple.schema';
import { CompanyService } from '../../../../../services/company.service';
import { ToastService } from '../../../../services/toast.service';

// GPS Targets interfaces (you may need to import/define these in your models)
interface GpsTarget {
  id?: number;
  title: string;
  description: string;
  target_value: number;
  current_value: number;
  unit: string;
  category: 'growth' | 'profitability' | 'sustainability';
  target_date: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  company_id: number;
}

@Component({
  selector: 'app-gps-targets-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Loading State -->
    <div *ngIf="loading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>

    <!-- Error State -->
    <div *ngIf="error && !loading" class="bg-red-50 border border-red-200 rounded-lg p-4">
      <div class="text-red-800">{{ error }}</div>
    </div>

    <!-- Main Content -->
    <div *ngIf="company && !loading" class="space-y-6">
      <!-- Header -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold text-gray-900 flex items-center">
              <i class="fas fa-bullseye text-blue-600 mr-3"></i>
              GPS Targets
            </h2>
            <p class="text-sm text-gray-600 mt-1">
              Set and track Growth, Profitability, and Sustainability targets for {{ company.name }}
            </p>
          </div>
          <div class="flex items-center space-x-3">
            <button
              (click)="addTarget()"
              class="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <i class="fas fa-plus mr-2"></i>
              Add Target
            </button>
            <button
              (click)="exportTargetsPdf()"
              [disabled]="isExporting"
              class="flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
            >
              <i *ngIf="!isExporting" class="fas fa-file-pdf mr-2"></i>
              <i *ngIf="isExporting" class="fas fa-spinner fa-spin mr-2"></i>
              {{ isExporting ? 'Generating PDF...' : 'Export PDF' }}
            </button>
          </div>
        </div>

        <!-- Summary Stats -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div class="bg-blue-50 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-blue-600">{{ getTotalTargets() }}</div>
            <div class="text-sm text-blue-700">Total Targets</div>
          </div>
          <div class="bg-green-50 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-green-600">{{ getCompletedTargets() }}</div>
            <div class="text-sm text-green-700">Completed</div>
          </div>
          <div class="bg-yellow-50 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-yellow-600">{{ getInProgressTargets() }}</div>
            <div class="text-sm text-yellow-700">In Progress</div>
          </div>
          <div class="bg-red-50 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-red-600">{{ getOverdueTargets() }}</div>
            <div class="text-sm text-red-700">Overdue</div>
          </div>
        </div>
      </div>

      <!-- Targets by Category -->
      <div class="space-y-6">
        <!-- Growth Targets -->
        <div class="bg-white rounded-lg shadow-sm border">
          <div class="p-4 border-b bg-green-50">
            <h3 class="text-lg font-medium text-green-800 flex items-center">
              <i class="fas fa-chart-line mr-2"></i>
              Growth Targets ({{ getTargetsByCategory('growth').length }})
            </h3>
          </div>
          <div class="p-4">
            <div *ngIf="getTargetsByCategory('growth').length === 0" class="text-center py-8 text-gray-500">
              <i class="fas fa-target text-4xl text-gray-300 mb-4"></i>
              <p>No growth targets set yet</p>
              <button
                (click)="addTargetByCategory('growth')"
                class="mt-2 text-blue-600 hover:text-blue-800"
              >
                Add your first growth target
              </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div *ngFor="let target of getTargetsByCategory('growth')"
                   class="border border-green-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="font-medium text-gray-900">{{ target.title }}</h4>
                  <span [class]="getStatusClass(target.status)" class="px-2 py-1 text-xs rounded-full">
                    {{ getStatusLabel(target.status) }}
                  </span>
                </div>
                <p class="text-sm text-gray-600 mb-3">{{ target.description }}</p>

                <!-- Progress Bar -->
                <div class="mb-3">
                  <div class="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{{ target.current_value }} / {{ target.target_value }} {{ target.unit }}</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div
                      class="bg-green-600 h-2 rounded-full transition-all duration-300"
                      [style.width.%]="getProgressPercentage(target)">
                    </div>
                  </div>
                  <div class="text-right text-xs text-gray-500 mt-1">
                    {{ getProgressPercentage(target) }}%
                  </div>
                </div>

                <div class="flex items-center justify-between text-sm text-gray-500">
                  <span>Target: {{ target.target_date | date:'shortDate' }}</span>
                  <div class="flex space-x-2">
                    <button (click)="editTarget(target)" class="text-blue-600 hover:text-blue-800">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button (click)="deleteTarget(target)" class="text-red-600 hover:text-red-800">
                      <i class="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Profitability Targets -->
        <div class="bg-white rounded-lg shadow-sm border">
          <div class="p-4 border-b bg-blue-50">
            <h3 class="text-lg font-medium text-blue-800 flex items-center">
              <i class="fas fa-dollar-sign mr-2"></i>
              Profitability Targets ({{ getTargetsByCategory('profitability').length }})
            </h3>
          </div>
          <div class="p-4">
            <div *ngIf="getTargetsByCategory('profitability').length === 0" class="text-center py-8 text-gray-500">
              <i class="fas fa-target text-4xl text-gray-300 mb-4"></i>
              <p>No profitability targets set yet</p>
              <button
                (click)="addTargetByCategory('profitability')"
                class="mt-2 text-blue-600 hover:text-blue-800"
              >
                Add your first profitability target
              </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div *ngFor="let target of getTargetsByCategory('profitability')"
                   class="border border-blue-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="font-medium text-gray-900">{{ target.title }}</h4>
                  <span [class]="getStatusClass(target.status)" class="px-2 py-1 text-xs rounded-full">
                    {{ getStatusLabel(target.status) }}
                  </span>
                </div>
                <p class="text-sm text-gray-600 mb-3">{{ target.description }}</p>

                <!-- Progress Bar -->
                <div class="mb-3">
                  <div class="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{{ target.current_value }} / {{ target.target_value }} {{ target.unit }}</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div
                      class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      [style.width.%]="getProgressPercentage(target)">
                    </div>
                  </div>
                  <div class="text-right text-xs text-gray-500 mt-1">
                    {{ getProgressPercentage(target) }}%
                  </div>
                </div>

                <div class="flex items-center justify-between text-sm text-gray-500">
                  <span>Target: {{ target.target_date | date:'shortDate' }}</span>
                  <div class="flex space-x-2">
                    <button (click)="editTarget(target)" class="text-blue-600 hover:text-blue-800">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button (click)="deleteTarget(target)" class="text-red-600 hover:text-red-800">
                      <i class="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sustainability Targets -->
        <div class="bg-white rounded-lg shadow-sm border">
          <div class="p-4 border-b bg-purple-50">
            <h3 class="text-lg font-medium text-purple-800 flex items-center">
              <i class="fas fa-leaf mr-2"></i>
              Sustainability Targets ({{ getTargetsByCategory('sustainability').length }})
            </h3>
          </div>
          <div class="p-4">
            <div *ngIf="getTargetsByCategory('sustainability').length === 0" class="text-center py-8 text-gray-500">
              <i class="fas fa-target text-4xl text-gray-300 mb-4"></i>
              <p>No sustainability targets set yet</p>
              <button
                (click)="addTargetByCategory('sustainability')"
                class="mt-2 text-blue-600 hover:text-blue-800"
              >
                Add your first sustainability target
              </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div *ngFor="let target of getTargetsByCategory('sustainability')"
                   class="border border-purple-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="font-medium text-gray-900">{{ target.title }}</h4>
                  <span [class]="getStatusClass(target.status)" class="px-2 py-1 text-xs rounded-full">
                    {{ getStatusLabel(target.status) }}
                  </span>
                </div>
                <p class="text-sm text-gray-600 mb-3">{{ target.description }}</p>

                <!-- Progress Bar -->
                <div class="mb-3">
                  <div class="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{{ target.current_value }} / {{ target.target_value }} {{ target.unit }}</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div
                      class="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      [style.width.%]="getProgressPercentage(target)">
                    </div>
                  </div>
                  <div class="text-right text-xs text-gray-500 mt-1">
                    {{ getProgressPercentage(target) }}%
                  </div>
                </div>

                <div class="flex items-center justify-between text-sm text-gray-500">
                  <span>Target: {{ target.target_date | date:'shortDate' }}</span>
                  <div class="flex space-x-2">
                    <button (click)="editTarget(target)" class="text-blue-600 hover:text-blue-800">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button (click)="deleteTarget(target)" class="text-red-600 hover:text-red-800">
                      <i class="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./gps-targets.component.scss']
})
export class GpsTargetsComponent implements OnInit, OnDestroy {
  // Route-based properties
  companyId: number | null = null;
  company: ICompany | null = null;
  loading = true;
  error: string | null = null;

  // GPS Targets data
  targets: GpsTarget[] = [];

  // UI state
  isExporting = false;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private companyService: CompanyService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    // Get company ID from parent route parameters (/company/:id)
    this.route.parent?.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = params['id'];
      if (id) {
        this.companyId = parseInt(id, 10);
        this.loadCompany();
      } else {
        this.error = 'No company ID provided in parent route';
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCompany(): void {
    if (!this.companyId) return;

    this.loading = true;
    this.error = null;

    this.companyService.getCompanyById(this.companyId).subscribe({
      next: (company) => {
        this.company = company;
        this.loading = false;
        this.loadTargetsData();
      },
      error: (err) => {
        console.error('Error loading company:', err);
        this.error = 'Failed to load company details';
        this.loading = false;
      }
    });
  }

  private loadTargetsData(): void {
    if (!this.company) return;

    // TODO: Load GPS targets data from API
    // For now, initialize empty array
    this.targets = [];
  }

  // Helper methods
  getTotalTargets(): number {
    return this.targets.length;
  }

  getCompletedTargets(): number {
    return this.targets.filter(t => t.status === 'completed').length;
  }

  getInProgressTargets(): number {
    return this.targets.filter(t => t.status === 'in_progress').length;
  }

  getOverdueTargets(): number {
    return this.targets.filter(t => t.status === 'overdue').length;
  }

  getTargetsByCategory(category: 'growth' | 'profitability' | 'sustainability'): GpsTarget[] {
    return this.targets.filter(t => t.category === category);
  }

  getProgressPercentage(target: GpsTarget): number {
    if (target.target_value === 0) return 0;
    const percentage = (target.current_value / target.target_value) * 100;
    return Math.min(Math.max(percentage, 0), 100);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'not_started':
        return 'Not Started';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'overdue':
        return 'Overdue';
      default:
        return 'Unknown';
    }
  }

  // Action methods
  addTarget(): void {
    // TODO: Open modal to add new target
    this.toastService.show('Add target functionality will be implemented', 'info');
  }

  addTargetByCategory(category: 'growth' | 'profitability' | 'sustainability'): void {
    // TODO: Open modal to add new target with pre-selected category
    this.toastService.show(`Add ${category} target functionality will be implemented`, 'info');
  }

  editTarget(target: GpsTarget): void {
    // TODO: Open modal to edit target
    this.toastService.show('Edit target functionality will be implemented', 'info');
  }

  deleteTarget(target: GpsTarget): void {
    // TODO: Confirm and delete target
    if (confirm('Are you sure you want to delete this target?')) {
      this.targets = this.targets.filter(t => t !== target);
      this.toastService.show('Target deleted', 'success');
    }
  }

  exportTargetsPdf(): void {
    if (!this.company) return;

    this.isExporting = true;
    // TODO: Implement PDF export
    setTimeout(() => {
      this.isExporting = false;
      this.toastService.show('GPS Targets PDF export functionality will be implemented', 'info');
    }, 1000);
  }
}
