import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { INode } from '../../../../../models/schema';
import { FinancialTarget, initFinancialTarget } from '../../../../../models/business.models';
import { NodeService } from '../../../../../services';
import { ICompany } from '../../../../../models/simple.schema';

@Component({
  selector: 'app-financial-targets-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-7xl mx-auto px-6 py-8">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">💰 Financial Targets</h2>
            <p class="text-gray-600">Set and track revenue and profitability goals</p>
          </div>
          <button
            (click)="showAddModal = true"
            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <i class="fas fa-plus"></i>
            <span>Add Target</span>
          </button>
        </div>
      </div>

      <!-- Progress Overview Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
          <div class="flex items-center">
            <div class="p-2 bg-green-500 rounded-lg">
              <i class="fas fa-chart-line text-white"></i>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-green-600">Current Year Target</p>
              <p class="text-2xl font-bold text-green-900">R {{ getCurrentYearTarget() | number:'1.0-0' }}</p>
            </div>
          </div>
        </div>

        <div class="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
          <div class="flex items-center">
            <div class="p-2 bg-blue-500 rounded-lg">
              <i class="fas fa-target text-white"></i>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-blue-600">Active Targets</p>
              <p class="text-2xl font-bold text-blue-900">{{ financialTargets.length }}</p>
            </div>
          </div>
        </div>

        <div class="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
          <div class="flex items-center">
            <div class="p-2 bg-purple-500 rounded-lg">
              <i class="fas fa-percentage text-white"></i>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-purple-600">Avg. Profit Margin Target</p>
              <p class="text-2xl font-bold text-purple-900">{{ getAvgProfitMargin() }}%</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Targets Table -->
      <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Financial Targets History</h3>
        </div>

        <div *ngIf="financialTargets.length === 0" class="text-center py-12">
          <div class="p-4 bg-green-100 rounded-full mx-auto w-20 h-20 flex items-center justify-center mb-4">
            <i class="fas fa-chart-line text-green-600 text-2xl"></i>
          </div>
          <h4 class="text-lg font-medium text-gray-900 mb-2">No Financial Targets Yet</h4>
          <p class="text-gray-600 mb-6">Start by setting your first revenue and profitability targets.</p>
          <button
            (click)="showAddModal = true"
            class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg"
          >
            Add First Target
          </button>
        </div>

        <div *ngIf="financialTargets.length > 0" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target Revenue</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target Profit</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GP Margin</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let target of financialTargets" class="hover:bg-gray-50 cursor-pointer"
                  (click)="editTarget(target)">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">{{ target.data.year }}</div>
                  <div *ngIf="target.data.quarter" class="text-sm text-gray-500">{{ target.data.quarter }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">R {{ target.data.target_turnover | number:'1.0-0' }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">R {{ target.data.target_net_profit | number:'1.0-0' }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">{{ target.data.gp_margin_target }}%</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    [ngClass]="{
                      'bg-green-100 text-green-800': isCurrentPeriod(target.data),
                      'bg-gray-100 text-gray-800': !isCurrentPeriod(target.data)
                    }">
                    {{ isCurrentPeriod(target.data) ? 'Active' : 'Past' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    (click)="editTarget(target)"
                    class="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    (click)="deleteTarget(target)"
                    class="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Add/Edit Modal -->
      <div *ngIf="showAddModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div class="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
          <!-- Modal Header -->
          <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 class="text-lg font-semibold text-gray-900">
              {{ editingTarget ? 'Edit' : 'Add' }} Financial Target
            </h3>
            <button (click)="closeModal()" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- Modal Content -->
          <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <form (ngSubmit)="saveTarget()" #targetForm="ngForm">
              <!-- Year and Quarter -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Year <span class="text-red-500">*</span>
                  </label>
                  <input
                    [(ngModel)]="formData.year"
                    name="year"
                    type="number"
                    required
                    min="2020"
                    max="2030"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Quarter (Optional)
                  </label>
                  <select
                    [(ngModel)]="formData.quarter"
                    name="quarter"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Full Year</option>
                    <option value="Q1">Q1 (Jan-Mar)</option>
                    <option value="Q2">Q2 (Apr-Jun)</option>
                    <option value="Q3">Q3 (Jul-Sep)</option>
                    <option value="Q4">Q4 (Oct-Dec)</option>
                  </select>
                </div>
              </div>

              <!-- Financial Targets -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Target Revenue <span class="text-red-500">*</span>
                  </label>
                  <input
                    [(ngModel)]="formData.target_turnover"
                    name="target_turnover"
                    type="number"
                    required
                    min="0"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="e.g., 1200000"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Target Net Profit <span class="text-red-500">*</span>
                  </label>
                  <input
                    [(ngModel)]="formData.target_net_profit"
                    name="target_net_profit"
                    type="number"
                    required
                    min="0"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="e.g., 300000"
                  />
                </div>
              </div>

              <!-- GP Margin -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Gross Profit Margin Target (%) <span class="text-red-500">*</span>
                </label>
                <input
                  [(ngModel)]="formData.gp_margin_target"
                  name="gp_margin_target"
                  type="number"
                  required
                  min="0"
                  max="100"
                  step="0.1"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="e.g., 40.5"
                />
              </div>

              <!-- Target Description -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Strategy & Description
                </label>
                <textarea
                  [(ngModel)]="formData.target_description"
                  name="target_description"
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Describe the strategy behind these targets..."
                ></textarea>
              </div>

              <!-- Milestone Notes -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Key Milestones
                </label>
                <textarea
                  [(ngModel)]="formData.milestone_notes"
                  name="milestone_notes"
                  rows="2"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Key milestones to achieve these targets..."
                ></textarea>
              </div>
            </form>
          </div>

          <!-- Modal Footer -->
          <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              (click)="closeModal()"
              class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              (click)="saveTarget()"
              [disabled]="!formData.year || !formData.target_turnover || !formData.target_net_profit || !formData.gp_margin_target || saving"
              class="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg"
            >
              <span *ngIf="saving" class="inline-flex items-center">
                <i class="fas fa-spinner fa-spin mr-2"></i>
                Saving...
              </span>
              <span *ngIf="!saving">
                {{ editingTarget ? 'Update' : 'Add' }} Target
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class FinancialTargetsTabComponent implements OnInit, OnDestroy {
  @Input() company: ICompany | null = null;

  private destroy$ = new Subject<void>();

  financialTargets: INode<FinancialTarget>[] = [];
  showAddModal = false;
  editingTarget: INode<FinancialTarget> | null = null;
  formData: FinancialTarget = initFinancialTarget();
  loading = false;
  saving = false;

  constructor(private nodeService: NodeService<FinancialTarget>) {}

  ngOnInit() {
    this.loadFinancialTargets();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadFinancialTargets() {
    if (!this.company?.id) return;

    this.loading = true;
    this.nodeService.getNodesByCompany(this.company.id, 'financial_target')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (targets) => {
          this.financialTargets = targets as INode<FinancialTarget>[];
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading financial targets:', error);
          this.loading = false;
        }
      });
  }

  getCurrentYearTarget(): number {
    const currentYear = new Date().getFullYear();
    const currentYearTarget = this.financialTargets.find(t => t.data.year === currentYear);
    return currentYearTarget?.data.target_turnover || 0;
  }

  getAvgProfitMargin(): number {
    if (this.financialTargets.length === 0) return 0;
    const total = this.financialTargets.reduce((sum, t) => sum + t.data.gp_margin_target, 0);
    return Math.round(total / this.financialTargets.length * 10) / 10;
  }

  isCurrentPeriod(target: FinancialTarget): boolean {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    if (target.year !== currentYear) return false;

    if (!target.quarter) return true; // Full year target

    // Check if current month falls in the quarter
    switch (target.quarter) {
      case 'Q1': return currentMonth >= 1 && currentMonth <= 3;
      case 'Q2': return currentMonth >= 4 && currentMonth <= 6;
      case 'Q3': return currentMonth >= 7 && currentMonth <= 9;
      case 'Q4': return currentMonth >= 10 && currentMonth <= 12;
      default: return false;
    }
  }

  editTarget(target: INode<FinancialTarget>) {
    this.editingTarget = target;
    this.formData = { ...target.data };
    this.showAddModal = true;
  }

  deleteTarget(target: INode<FinancialTarget>) {
    if (confirm('Are you sure you want to delete this financial target?')) {
      this.nodeService.deleteNode(target.id!)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.financialTargets = this.financialTargets.filter(t => t.id !== target.id);
          },
          error: (error) => {
            console.error('Error deleting financial target:', error);
          }
        });
    }
  }

  closeModal() {
    this.showAddModal = false;
    this.editingTarget = null;
    this.formData = initFinancialTarget();
  }

  saveTarget() {
    if (!this.formData.year || !this.formData.target_turnover || !this.formData.target_net_profit || !this.formData.gp_margin_target) {
      return;
    }

    if (this.company) {
      this.formData.company_id = String(this.company.id);
    }
    this.formData.last_updated = new Date().toISOString().split('T')[0];

    this.saving = true;

    if (this.editingTarget) {
      // Update existing
      const updatedTarget: INode<FinancialTarget> = {
        ...this.editingTarget,
        data: { ...this.formData }
      };

      this.nodeService.updateNode(updatedTarget)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            const index = this.financialTargets.findIndex(t => t.id === this.editingTarget!.id);
            if (index >= 0) {
              this.financialTargets[index] = result;
            }
            this.saving = false;
            this.closeModal();
          },
          error: (error) => {
            console.error('Error updating financial target:', error);
            this.saving = false;
          }
        });
    } else {
      // Add new
      if (!this.formData.created_date) {
        this.formData.created_date = new Date().toISOString().split('T')[0];
      }

      const newTarget: INode<FinancialTarget> = {
        id: 0, // Will be set by backend
        data: { ...this.formData },
        type: 'financial_target',
        company_id: this.company?.id || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      this.nodeService.addNode(newTarget)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            this.financialTargets.push(result);
            this.saving = false;
            this.closeModal();
          },
          error: (error) => {
            console.error('Error saving financial target:', error);
            this.saving = false;
          }
        });
    }
  }
}
