import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LineChartComponent } from '../../../../charts/line-chart/line-chart.component';
import { ILineChart } from '../../../../../models/Charts';

interface EmployeeCountRecord {
  id: number;
  year: number;
  quarter: string;
  employeeType: string;
  count: number;
  date: string;
  notes: string;
}

@Component({
  selector: 'app-employee-count',
  standalone: true,
  imports: [CommonModule, FormsModule, LineChartComponent],
  template: `
    <div class="bg-white rounded-xl shadow-sm p-6 w-full">
      <!-- Page Header -->
      <div class="mb-6">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <i class="fas fa-users text-orange-600 text-xl"></i>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-gray-900">Employee Count</h2>
              <p class="text-gray-600">Track workforce trends and employee distribution over time</p>
            </div>
          </div>
          <button
            (click)="openAddModal()"
            class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
          >
            <i class="fas fa-plus"></i>
            Add Record
          </button>
        </div>

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div class="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-orange-600 font-medium">Total Employees</p>
                <p class="text-2xl font-bold text-orange-900">{{ getCurrentTotal() }}</p>
                <p class="text-xs text-orange-600 mt-1">Latest quarter</p>
              </div>
              <i class="fas fa-users text-orange-400 text-3xl"></i>
            </div>
          </div>

          <div class="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-blue-600 font-medium">Permanent</p>
                <p class="text-2xl font-bold text-blue-900">{{ getLatestCountByType('Permanent') }}</p>
                <p class="text-xs text-blue-600 mt-1">{{ getGrowth('Permanent') }}</p>
              </div>
              <i class="fas fa-user-tie text-blue-400 text-3xl"></i>
            </div>
          </div>

          <div class="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-green-600 font-medium">Temporary</p>
                <p class="text-2xl font-bold text-green-900">{{ getLatestCountByType('Temporary') }}</p>
                <p class="text-xs text-green-600 mt-1">{{ getGrowth('Temporary') }}</p>
              </div>
              <i class="fas fa-user-clock text-green-400 text-3xl"></i>
            </div>
          </div>

          <div class="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-purple-600 font-medium">Growth Rate</p>
                <p class="text-2xl font-bold text-purple-900">{{ getOverallGrowthRate() }}%</p>
                <p class="text-xs text-purple-600 mt-1">Year over year</p>
              </div>
              <i class="fas fa-chart-line text-purple-400 text-3xl"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Employee Trend Chart -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <app-line-chart
          [componentTitle]="'Employee Count Trends'"
          [data]="employeeTrendChart"
        >
        </app-line-chart>
      </div>

      <!-- Quarterly Data Table -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div class="flex items-center mb-4">
          <i class="fas fa-table text-gray-600 text-xl mr-3"></i>
          <h3 class="text-lg font-semibold text-gray-900">Quarterly Employee Data</h3>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Year
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quarter
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee Type
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Count
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let record of getSortedRecords()" class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {{ record.year }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        [class]="getQuarterBadgeClass(record.quarter)">
                    {{ record.quarter }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center mr-3"
                         [class]="getEmployeeTypeIconBg(record.employeeType)">
                      <i [class]="getEmployeeTypeIcon(record.employeeType)"></i>
                    </div>
                    <span class="text-sm text-gray-900">{{ record.employeeType }}</span>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="text-sm font-semibold text-orange-600">{{ record.count }}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ record.date }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    (click)="editRecord(record)"
                    class="text-blue-600 hover:text-blue-900 mr-3"
                    title="Edit record"
                  >
                    <i class="fas fa-edit"></i>
                  </button>
                  <button
                    (click)="deleteRecord(record.id)"
                    class="text-red-600 hover:text-red-900"
                    title="Delete record"
                  >
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Employee Type Distribution -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div *ngFor="let type of employeeTypes"
             class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center"
                   [class]="getEmployeeTypeIconBg(type)">
                <i [class]="getEmployeeTypeIcon(type) + ' text-sm'"></i>
              </div>
              <h4 class="font-semibold text-gray-900">{{ type }}</h4>
            </div>
          </div>
          <div class="text-2xl font-bold text-orange-600">
            {{ getLatestCountByType(type) }}
          </div>
          <div class="text-xs text-gray-500 mt-1">
            {{ ((getLatestCountByType(type) / getCurrentTotal()) * 100) | number:'1.0-1' }}% of workforce
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div *ngIf="showModal()"
         class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
         (click)="closeModal()">
      <div class="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6"
           (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold text-gray-900">
            {{ editingRecord() ? 'Edit Employee Count' : 'Add Employee Count' }}
          </h3>
          <button (click)="closeModal()" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>

        <form (ngSubmit)="saveRecord()" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Year *</label>
            <input
              [(ngModel)]="formData.year"
              name="year"
              type="number"
              min="2020"
              max="2030"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Quarter *</label>
            <select
              [(ngModel)]="formData.quarter"
              name="quarter"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">Select quarter</option>
              <option value="Q1">Q1 (Jan-Mar)</option>
              <option value="Q2">Q2 (Apr-Jun)</option>
              <option value="Q3">Q3 (Jul-Sep)</option>
              <option value="Q4">Q4 (Oct-Dec)</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Employee Type *</label>
            <select
              [(ngModel)]="formData.employeeType"
              name="employeeType"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">Select type</option>
              <option value="Permanent">Permanent</option>
              <option value="Temporary">Temporary</option>
              <option value="Casual">Casual</option>
              <option value="Contract">Contract</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Count *</label>
            <input
              [(ngModel)]="formData.count"
              name="count"
              type="number"
              min="0"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Date *</label>
            <input
              [(ngModel)]="formData.date"
              name="date"
              type="date"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              [(ngModel)]="formData.notes"
              name="notes"
              rows="2"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Additional information..."
            ></textarea>
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              (click)="closeModal()"
              class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
            >
              <i class="fas fa-save"></i>
              {{ editingRecord() ? 'Update' : 'Add Record' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class EmployeeCountComponent {
  employeeTypes = ['Permanent', 'Temporary', 'Casual', 'Contract'];

  // Mock quarterly data
  employeeRecords = signal<EmployeeCountRecord[]>([
    // 2024 Data
    { id: 1, year: 2024, quarter: 'Q1', employeeType: 'Permanent', count: 15, date: '2024-03-31', notes: 'Post-training recruitment' },
    { id: 2, year: 2024, quarter: 'Q1', employeeType: 'Temporary', count: 5, date: '2024-03-31', notes: '' },
    { id: 3, year: 2024, quarter: 'Q1', employeeType: 'Casual', count: 3, date: '2024-03-31', notes: '' },
    { id: 4, year: 2024, quarter: 'Q1', employeeType: 'Contract', count: 2, date: '2024-03-31', notes: '' },

    { id: 5, year: 2024, quarter: 'Q2', employeeType: 'Permanent', count: 18, date: '2024-06-30', notes: 'Expansion phase' },
    { id: 6, year: 2024, quarter: 'Q2', employeeType: 'Temporary', count: 6, date: '2024-06-30', notes: '' },
    { id: 7, year: 2024, quarter: 'Q2', employeeType: 'Casual', count: 4, date: '2024-06-30', notes: '' },
    { id: 8, year: 2024, quarter: 'Q2', employeeType: 'Contract', count: 2, date: '2024-06-30', notes: '' },

    { id: 9, year: 2024, quarter: 'Q3', employeeType: 'Permanent', count: 20, date: '2024-09-30', notes: '' },
    { id: 10, year: 2024, quarter: 'Q3', employeeType: 'Temporary', count: 8, date: '2024-09-30', notes: 'Peak season' },
    { id: 11, year: 2024, quarter: 'Q3', employeeType: 'Casual', count: 5, date: '2024-09-30', notes: '' },
    { id: 12, year: 2024, quarter: 'Q3', employeeType: 'Contract', count: 3, date: '2024-09-30', notes: '' },

    { id: 13, year: 2024, quarter: 'Q4', employeeType: 'Permanent', count: 22, date: '2024-12-31', notes: '' },
    { id: 14, year: 2024, quarter: 'Q4', employeeType: 'Temporary', count: 7, date: '2024-12-31', notes: '' },
    { id: 15, year: 2024, quarter: 'Q4', employeeType: 'Casual', count: 4, date: '2024-12-31', notes: '' },
    { id: 16, year: 2024, quarter: 'Q4', employeeType: 'Contract', count: 3, date: '2024-12-31', notes: '' },

    // 2025 Data
    { id: 17, year: 2025, quarter: 'Q1', employeeType: 'Permanent', count: 25, date: '2025-03-31', notes: 'New department' },
    { id: 18, year: 2025, quarter: 'Q1', employeeType: 'Temporary', count: 8, date: '2025-03-31', notes: '' },
    { id: 19, year: 2025, quarter: 'Q1', employeeType: 'Casual', count: 5, date: '2025-03-31', notes: '' },
    { id: 20, year: 2025, quarter: 'Q1', employeeType: 'Contract', count: 4, date: '2025-03-31', notes: '' },

    { id: 21, year: 2025, quarter: 'Q2', employeeType: 'Permanent', count: 28, date: '2025-06-30', notes: '' },
    { id: 22, year: 2025, quarter: 'Q2', employeeType: 'Temporary', count: 10, date: '2025-06-30', notes: '' },
    { id: 23, year: 2025, quarter: 'Q2', employeeType: 'Casual', count: 6, date: '2025-06-30', notes: '' },
    { id: 24, year: 2025, quarter: 'Q2', employeeType: 'Contract', count: 5, date: '2025-06-30', notes: '' },
  ]);

  showModal = signal(false);
  editingRecord = signal<EmployeeCountRecord | null>(null);

  formData: Partial<EmployeeCountRecord> = {
    year: 2025,
    quarter: '',
    employeeType: '',
    count: 0,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  };

  // Generate chart data
  get employeeTrendChart(): ILineChart {
    const quarters = ['2024 Q1', '2024 Q2', '2024 Q3', '2024 Q4', '2025 Q1', '2025 Q2'];

    return {
      labels: quarters,
      datasets: this.employeeTypes.map((type, index) => ({
        label: type,
        data: quarters.map(q => {
          const [year, quarter] = q.split(' ');
          const record = this.employeeRecords().find(
            r => r.year === parseInt(year) && r.quarter === quarter && r.employeeType === type
          );
          return record ? record.count : 0;
        }),
        borderColor: this.getChartColor(index),
        backgroundColor: this.getChartColor(index),
        fill: false,
        tension: 0.4
      }))
    };
  }

  getChartColor(index: number): string {
    const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'];
    return colors[index % colors.length];
  }

  getSortedRecords(): EmployeeCountRecord[] {
    return [...this.employeeRecords()].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      const quarterOrder = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
      return quarterOrder[b.quarter as keyof typeof quarterOrder] - quarterOrder[a.quarter as keyof typeof quarterOrder];
    });
  }

  getCurrentTotal(): number {
    const latestRecords = this.getLatestQuarterRecords();
    return latestRecords.reduce((sum, r) => sum + r.count, 0);
  }

  getLatestQuarterRecords(): EmployeeCountRecord[] {
    const sorted = this.getSortedRecords();
    if (sorted.length === 0) return [];

    const latest = sorted[0];
    return this.employeeRecords().filter(
      r => r.year === latest.year && r.quarter === latest.quarter
    );
  }

  getLatestCountByType(type: string): number {
    const latest = this.getLatestQuarterRecords();
    const record = latest.find(r => r.employeeType === type);
    return record ? record.count : 0;
  }

  getGrowth(type: string): string {
    const records = this.employeeRecords().filter(r => r.employeeType === type);
    if (records.length < 2) return 'N/A';

    const sorted = records.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      const quarterOrder = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
      return quarterOrder[b.quarter as keyof typeof quarterOrder] - quarterOrder[a.quarter as keyof typeof quarterOrder];
    });

    const latest = sorted[0].count;
    const previous = sorted[1].count;
    const growth = ((latest - previous) / previous) * 100;

    return growth >= 0 ? `+${growth.toFixed(0)}%` : `${growth.toFixed(0)}%`;
  }

  getOverallGrowthRate(): number {
    const sorted = this.getSortedRecords();
    if (sorted.length < 8) return 0;

    // Get total for latest quarter
    const latestQuarter = this.getLatestQuarterRecords();
    const latestTotal = latestQuarter.reduce((sum, r) => sum + r.count, 0);

    // Get total for same quarter previous year
    const latestYear = latestQuarter[0].year;
    const latestQ = latestQuarter[0].quarter;
    const previousYear = this.employeeRecords().filter(
      r => r.year === latestYear - 1 && r.quarter === latestQ
    );
    const previousTotal = previousYear.reduce((sum, r) => sum + r.count, 0);

    if (previousTotal === 0) return 0;
    return parseFloat((((latestTotal - previousTotal) / previousTotal) * 100).toFixed(1));
  }

  getEmployeeTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'Permanent': 'fas fa-user-tie text-blue-600',
      'Temporary': 'fas fa-user-clock text-green-600',
      'Casual': 'fas fa-user text-purple-600',
      'Contract': 'fas fa-file-signature text-orange-600'
    };
    return icons[type] || 'fas fa-user text-gray-600';
  }

  getEmployeeTypeIconBg(type: string): string {
    const classes: { [key: string]: string } = {
      'Permanent': 'bg-blue-100',
      'Temporary': 'bg-green-100',
      'Casual': 'bg-purple-100',
      'Contract': 'bg-orange-100'
    };
    return classes[type] || 'bg-gray-100';
  }

  getQuarterBadgeClass(quarter: string): string {
    const classes: { [key: string]: string } = {
      'Q1': 'bg-blue-100 text-blue-800',
      'Q2': 'bg-green-100 text-green-800',
      'Q3': 'bg-purple-100 text-purple-800',
      'Q4': 'bg-orange-100 text-orange-800'
    };
    return classes[quarter] || 'bg-gray-100 text-gray-800';
  }

  openAddModal(): void {
    this.editingRecord.set(null);
    this.formData = {
      year: 2025,
      quarter: '',
      employeeType: '',
      count: 0,
      date: new Date().toISOString().split('T')[0],
      notes: ''
    };
    this.showModal.set(true);
  }

  editRecord(record: EmployeeCountRecord): void {
    this.editingRecord.set(record);
    this.formData = { ...record };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingRecord.set(null);
  }

  saveRecord(): void {
    if (!this.formData.year || !this.formData.quarter || !this.formData.employeeType || this.formData.count === undefined) {
      return;
    }

    const editingRecordValue = this.editingRecord();
    if (editingRecordValue) {
      // Update existing record
      const records = this.employeeRecords();
      const index = records.findIndex(r => r.id === editingRecordValue.id);
      if (index !== -1) {
        records[index] = { ...records[index], ...this.formData as EmployeeCountRecord };
        this.employeeRecords.set([...records]);
      }
    } else {
      // Add new record
      const newId = Math.max(...this.employeeRecords().map(r => r.id), 0) + 1;
      const newRecord: EmployeeCountRecord = {
        ...(this.formData as Omit<EmployeeCountRecord, 'id'>),
        id: newId
      };
      this.employeeRecords.set([...this.employeeRecords(), newRecord]);
    }

    this.closeModal();
  }

  deleteRecord(id: number): void {
    if (confirm('Are you sure you want to delete this record?')) {
      this.employeeRecords.set(this.employeeRecords().filter(record => record.id !== id));
    }
  }
}
