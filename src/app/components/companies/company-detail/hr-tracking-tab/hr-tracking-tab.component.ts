import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { INode } from '../../../../../models/schema';
import { Company, HRSnapshot, initHRSnapshot } from '../../../../../models/business.models';
import { NodeService } from '../../../../../services';

@Component({
  selector: 'app-hr-tracking-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-7xl mx-auto px-6 py-8">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">👥 HR Tracking</h2>
            <p class="text-gray-600">Track team size and growth over time</p>
          </div>
          <button
            (click)="showAddModal = true"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <i class="fas fa-plus"></i>
            <span>Log HR Data</span>
          </button>
        </div>
      </div>

      <!-- HR Overview Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
          <div class="flex items-center">
            <div class="p-2 bg-blue-500 rounded-lg">
              <i class="fas fa-users text-white"></i>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-blue-600">Current Team Size</p>
              <p class="text-2xl font-bold text-blue-900">{{ getCurrentTeamSize() }}</p>
            </div>
          </div>
        </div>

        <div class="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
          <div class="flex items-center">
            <div class="p-2 bg-green-500 rounded-lg">
              <i class="fas fa-user-tie text-white"></i>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-green-600">Permanent Staff</p>
              <p class="text-2xl font-bold text-green-900">{{ getCurrentPermanentStaff() }}</p>
            </div>
          </div>
        </div>

        <div class="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
          <div class="flex items-center">
            <div class="p-2 bg-orange-500 rounded-lg">
              <i class="fas fa-user-clock text-white"></i>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-orange-600">Temporary Staff</p>
              <p class="text-2xl font-bold text-orange-900">{{ getCurrentTemporaryStaff() }}</p>
            </div>
          </div>
        </div>

        <div class="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
          <div class="flex items-center">
            <div class="p-2 bg-purple-500 rounded-lg">
              <i class="fas fa-chart-line text-white"></i>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-purple-600">Growth Trend</p>
              <p class="text-2xl font-bold text-purple-900">{{ getGrowthTrend() }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- HR History Chart Area (Placeholder for future chart) -->
      <div class="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Team Growth Visualization</h3>
        <div class="bg-gray-50 rounded-lg p-8 text-center">
          <i class="fas fa-chart-area text-4xl text-gray-400 mb-4"></i>
          <p class="text-gray-600">Growth chart will be displayed here</p>
          <p class="text-sm text-gray-500 mt-2">Chart component can be added later with libraries like Chart.js or D3</p>
        </div>
      </div>

      <!-- HR Snapshots Table -->
      <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">HR Snapshots History</h3>
        </div>

        <div *ngIf="hrSnapshots.length === 0" class="text-center py-12">
          <div class="p-4 bg-blue-100 rounded-full mx-auto w-20 h-20 flex items-center justify-center mb-4">
            <i class="fas fa-users text-blue-600 text-2xl"></i>
          </div>
          <h4 class="text-lg font-medium text-gray-900 mb-2">No HR Data Yet</h4>
          <p class="text-gray-600 mb-6">Start tracking your team size and growth by logging your first HR snapshot.</p>
          <button
            (click)="showAddModal = true"
            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
          >
            Log First HR Data
          </button>
        </div>

        <div *ngIf="hrSnapshots.length > 0" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permanent</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temporary</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interns</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payroll</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let snapshot of hrSnapshots" class="hover:bg-gray-50 cursor-pointer"
                  (click)="editSnapshot(snapshot)">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">{{ snapshot.data.month }} {{ snapshot.data.year }}</div>
                  <div class="text-sm text-gray-500">{{ snapshot.data.recorded_date | date:'shortDate' }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">{{ snapshot.data.permanent_employees }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">{{ snapshot.data.temporary_employees }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">{{ snapshot.data.interns_volunteers }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-blue-900">{{ snapshot.data.total_employees }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div *ngIf="snapshot.data.payroll_cost" class="text-sm font-medium text-gray-900">
                    R {{ snapshot.data.payroll_cost | number:'1.0-0' }}
                  </div>
                  <div *ngIf="!snapshot.data.payroll_cost" class="text-sm text-gray-400">-</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    (click)="editSnapshot(snapshot)"
                    class="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    (click)="deleteSnapshot(snapshot)"
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
              {{ editingSnapshot ? 'Edit' : 'Log' }} HR Snapshot
            </h3>
            <button (click)="closeModal()" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- Modal Content -->
          <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <form (ngSubmit)="saveSnapshot()" #snapshotForm="ngForm">
              <!-- Month and Year -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Month <span class="text-red-500">*</span>
                  </label>
                  <select
                    [(ngModel)]="formData.month"
                    name="month"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="January">January</option>
                    <option value="February">February</option>
                    <option value="March">March</option>
                    <option value="April">April</option>
                    <option value="May">May</option>
                    <option value="June">June</option>
                    <option value="July">July</option>
                    <option value="August">August</option>
                    <option value="September">September</option>
                    <option value="October">October</option>
                    <option value="November">November</option>
                    <option value="December">December</option>
                  </select>
                </div>

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
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <!-- Employee Counts -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Permanent Employees <span class="text-red-500">*</span>
                  </label>
                  <input
                    [(ngModel)]="formData.permanent_employees"
                    name="permanent_employees"
                    type="number"
                    required
                    min="0"
                    (ngModelChange)="calculateTotal()"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Temporary Employees
                  </label>
                  <input
                    [(ngModel)]="formData.temporary_employees"
                    name="temporary_employees"
                    type="number"
                    min="0"
                    (ngModelChange)="calculateTotal()"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Interns & Volunteers
                  </label>
                  <input
                    [(ngModel)]="formData.interns_volunteers"
                    name="interns_volunteers"
                    type="number"
                    min="0"
                    (ngModelChange)="calculateTotal()"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <!-- Total Display -->
              <div class="mb-4 p-3 bg-blue-50 rounded-lg">
                <div class="text-sm font-medium text-blue-900">
                  Total Team Size: {{ formData.total_employees }}
                </div>
              </div>

              <!-- Payroll Cost -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Payroll Cost (Optional)
                </label>
                <input
                  [(ngModel)]="formData.payroll_cost"
                  name="payroll_cost"
                  type="number"
                  min="0"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 150000"
                />
              </div>

              <!-- Key Hires -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Key Hires This Month
                </label>
                <textarea
                  [(ngModel)]="formData.key_hires"
                  name="key_hires"
                  rows="2"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Marketing Manager, Senior Developer"
                ></textarea>
              </div>

              <!-- Departures -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Departures This Month
                </label>
                <textarea
                  [(ngModel)]="formData.departures"
                  name="departures"
                  rows="2"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Junior Developer (resignation)"
                ></textarea>
              </div>

              <!-- Growth Notes -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Growth Notes & Strategy
                </label>
                <textarea
                  [(ngModel)]="formData.growth_notes"
                  name="growth_notes"
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Notes about HR strategy, upcoming hires, team structure changes..."
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
              (click)="saveSnapshot()"
              [disabled]="!formData.month || !formData.year || formData.permanent_employees < 0 || saving"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg"
            >
              <span *ngIf="saving" class="inline-flex items-center">
                <i class="fas fa-spinner fa-spin mr-2"></i>
                Saving...
              </span>
              <span *ngIf="!saving">
                {{ editingSnapshot ? 'Update' : 'Save' }} Snapshot
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class HRTrackingTabComponent implements OnInit, OnDestroy {
  @Input() company: INode<Company> | null = null;

  private destroy$ = new Subject<void>();

  hrSnapshots: INode<HRSnapshot>[] = [];
  showAddModal = false;
  editingSnapshot: INode<HRSnapshot> | null = null;
  formData: HRSnapshot = initHRSnapshot();
  loading = false;
  saving = false;

  constructor(private nodeService: NodeService<HRSnapshot>) {}

  ngOnInit() {
    this.loadHRSnapshots();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadHRSnapshots() {
    if (!this.company?.id) return;

    this.loading = true;
    this.nodeService.getNodesByCompany(this.company.id, 'hr_snapshot')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (snapshots) => {
          this.hrSnapshots = snapshots as INode<HRSnapshot>[];
          // Sort by year and month
          this.hrSnapshots.sort((a, b) => {
            if (a.data.year !== b.data.year) {
              return b.data.year - a.data.year; // Newest year first
            }
            const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June',
                              'July', 'August', 'September', 'October', 'November', 'December'];
            return monthOrder.indexOf(b.data.month) - monthOrder.indexOf(a.data.month); // Newest month first
          });
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading HR snapshots:', error);
          this.loading = false;
        }
      });
  }

  getCurrentTeamSize(): number {
    if (this.hrSnapshots.length === 0) return 0;
    const latest = this.hrSnapshots[this.hrSnapshots.length - 1];
    return latest.data.total_employees;
  }

  getCurrentPermanentStaff(): number {
    if (this.hrSnapshots.length === 0) return 0;
    const latest = this.hrSnapshots[this.hrSnapshots.length - 1];
    return latest.data.permanent_employees;
  }

  getCurrentTemporaryStaff(): number {
    if (this.hrSnapshots.length === 0) return 0;
    const latest = this.hrSnapshots[this.hrSnapshots.length - 1];
    return latest.data.temporary_employees;
  }

  getGrowthTrend(): string {
    if (this.hrSnapshots.length < 2) return '-';

    const latest = this.hrSnapshots[this.hrSnapshots.length - 1];
    const previous = this.hrSnapshots[this.hrSnapshots.length - 2];
    const growth = latest.data.total_employees - previous.data.total_employees;

    if (growth > 0) return `+${growth}`;
    if (growth < 0) return `${growth}`;
    return '0';
  }

  calculateTotal() {
    this.formData.total_employees =
      (this.formData.permanent_employees || 0) +
      (this.formData.temporary_employees || 0) +
      (this.formData.interns_volunteers || 0);
  }

  editSnapshot(snapshot: INode<HRSnapshot>) {
    this.editingSnapshot = snapshot;
    this.formData = { ...snapshot.data };
    this.showAddModal = true;
  }

  deleteSnapshot(snapshot: INode<HRSnapshot>) {
    if (confirm('Are you sure you want to delete this HR snapshot?')) {
      this.nodeService.deleteNode(snapshot.id!)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.hrSnapshots = this.hrSnapshots.filter(s => s.id !== snapshot.id);
          },
          error: (error) => {
            console.error('Error deleting HR snapshot:', error);
          }
        });
    }
  }

  closeModal() {
    this.showAddModal = false;
    this.editingSnapshot = null;
    this.formData = initHRSnapshot();
  }

  saveSnapshot() {
    if (!this.formData.month || !this.formData.year || this.formData.permanent_employees < 0) {
      return;
    }

    this.calculateTotal();

    if (this.company) {
      this.formData.company_id = String(this.company.id);
    }
    this.formData.recorded_date = new Date().toISOString().split('T')[0];

    this.saving = true;

    if (this.editingSnapshot) {
      // Update existing
      const updatedSnapshot: INode<HRSnapshot> = {
        ...this.editingSnapshot,
        data: { ...this.formData }
      };

      this.nodeService.updateNode(updatedSnapshot)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            const index = this.hrSnapshots.findIndex(s => s.id === this.editingSnapshot!.id);
            if (index >= 0) {
              this.hrSnapshots[index] = result;
            }
            this.saving = false;
            this.closeModal();
          },
          error: (error) => {
            console.error('Error updating HR snapshot:', error);
            this.saving = false;
          }
        });
    } else {
      // Add new
      const newSnapshot: INode<HRSnapshot> = {
        id: 0, // Will be set by backend
        data: { ...this.formData },
        type: 'hr_snapshot',
        company_id: this.company?.id || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      this.nodeService.addNode(newSnapshot)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            this.hrSnapshots.push(result);
            // Re-sort after adding
            this.sortSnapshots();
            this.saving = false;
            this.closeModal();
          },
          error: (error) => {
            console.error('Error saving HR snapshot:', error);
            this.saving = false;
          }
        });
    }
  }

  sortSnapshots() {
    this.hrSnapshots.sort((a, b) => {
      if (a.data.year !== b.data.year) {
        return b.data.year - a.data.year; // Newest year first
      }
      const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
      return monthOrder.indexOf(b.data.month) - monthOrder.indexOf(a.data.month); // Newest month first
    });
  }
}
