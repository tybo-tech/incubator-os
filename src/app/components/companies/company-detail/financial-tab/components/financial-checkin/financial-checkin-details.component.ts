import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { INode } from '../../../../../../../models/schema';
import { FinancialCheckIn } from '../../../../../../../models/busines.financial.checkin.models';

interface MonthDetails {
  month: number;
  monthName: string;
  year: number;
}

@Component({
  selector: 'app-financial-checkin-details',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Modal Backdrop -->
    <div *ngIf="isVisible" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">

        <!-- Modal Header -->
        <div class="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
          <h2 class="text-xl font-semibold flex items-center">
            <i class="fas fa-calendar-alt mr-3"></i>
            {{ monthDetails?.monthName }} {{ monthDetails?.year }} - Financial Check-ins
          </h2>
          <button (click)="onClose()" class="text-white hover:text-gray-200 text-xl">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">

          <!-- Has Records - Show Table -->
          <div *ngIf="monthCheckIns.length > 0">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-medium text-gray-900">
                {{ monthCheckIns.length }} Check-in{{ monthCheckIns.length !== 1 ? 's' : '' }} Found
              </h3>
              <button (click)="onAddNew()"
                      class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <i class="fas fa-plus mr-2"></i>
                Add Another Check-in
              </button>
            </div>

            <!-- Records Table -->
            <div class="overflow-x-auto border rounded-lg">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Turnover</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Profit</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cash</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr *ngFor="let checkIn of monthCheckIns; let i = index"
                      class="hover:bg-gray-50 transition-colors">

                    <!-- Date -->
                    <td class="px-4 py-3 whitespace-nowrap text-sm">
                      <div class="text-gray-900 font-medium">
                        {{ formatDate(checkIn.created_at) }}
                      </div>
                      <div class="text-gray-500 text-xs">
                        {{ checkIn.data.quarter }}{{ checkIn.data.is_pre_ignition ? ' (Pre-ignition)' : '' }}
                      </div>
                    </td>

                    <!-- Turnover -->
                    <td class="px-4 py-3 whitespace-nowrap text-sm">
                      <div class="text-gray-900 font-medium">
                        R {{ checkIn.data.turnover_monthly_avg | number:'1.0-0' }}
                      </div>
                    </td>

                    <!-- Net Profit -->
                    <td class="px-4 py-3 whitespace-nowrap text-sm">
                      <div class="font-medium"
                           [class]="(checkIn.data.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'">
                        R {{ checkIn.data.net_profit | number:'1.0-0' }}
                      </div>
                    </td>

                    <!-- Margin -->
                    <td class="px-4 py-3 whitespace-nowrap text-sm">
                      <div class="flex items-center">
                        <span class="font-medium"
                              [class]="(checkIn.data.np_margin || 0) >= 0 ? 'text-green-600' : 'text-red-600'">
                          {{ checkIn.data.np_margin | number:'1.1-1' }}%
                        </span>
                        <i class="ml-1"
                           [class]="(checkIn.data.np_margin || 0) >= 0 ? 'fas fa-arrow-up text-green-500' : 'fas fa-arrow-down text-red-500'"></i>
                      </div>
                    </td>

                    <!-- Cash -->
                    <td class="px-4 py-3 whitespace-nowrap text-sm">
                      <div class="text-gray-900">
                        R {{ checkIn.data.cash_on_hand | number:'1.0-0' }}
                      </div>
                      <div class="text-xs text-gray-500 flex items-center">
                        WC: {{ checkIn.data.working_capital_ratio | number:'1.1-1' }}
                        <i class="ml-1" [class]="getWorkingCapitalIcon(checkIn.data.working_capital_ratio || 0)"></i>
                      </div>
                    </td>

                    <!-- Notes Preview -->
                    <td class="px-4 py-3 text-sm text-gray-600 max-w-xs">
                      <div class="truncate" [title]="checkIn.data.notes || ''">
                        {{ checkIn.data.notes || 'No notes' }}
                      </div>
                    </td>

                    <!-- Actions -->
                    <td class="px-4 py-3 whitespace-nowrap text-sm space-x-2">
                      <button (click)="onEdit(checkIn)"
                              class="text-blue-600 hover:text-blue-800 font-medium">
                        <i class="fas fa-edit mr-1"></i>
                        Edit
                      </button>
                      <button (click)="onDelete(checkIn)"
                              class="text-red-600 hover:text-red-800 font-medium">
                        <i class="fas fa-trash mr-1"></i>
                        Delete
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Summary Card -->
            <div class="mt-6 bg-blue-50 rounded-lg p-4">
              <h4 class="font-medium text-blue-900 mb-2">Month Summary</h4>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div class="text-blue-600 font-medium">Avg Turnover</div>
                  <div class="text-gray-900">R {{ getAverageTurnover() | number:'1.0-0' }}</div>
                </div>
                <div>
                  <div class="text-blue-600 font-medium">Avg Net Profit</div>
                  <div class="text-gray-900">R {{ getAverageNetProfit() | number:'1.0-0' }}</div>
                </div>
                <div>
                  <div class="text-blue-600 font-medium">Avg Margin</div>
                  <div class="text-gray-900">{{ getAverageMargin() | number:'1.1-1' }}%</div>
                </div>
                <div>
                  <div class="text-blue-600 font-medium">Latest Cash</div>
                  <div class="text-gray-900">R {{ getLatestCash() | number:'1.0-0' }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State - No Records -->
          <div *ngIf="monthCheckIns.length === 0" class="text-center py-12">
            <div class="text-6xl text-gray-300 mb-4">
              <i class="fas fa-calendar-plus"></i>
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">
              No Check-ins for {{ monthDetails?.monthName }} {{ monthDetails?.year }}
            </h3>
            <p class="text-gray-600 mb-6 max-w-md mx-auto">
              Create your first financial check-in for this month to start tracking your business performance.
            </p>
            <button (click)="onAddNew()"
                    class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
              <i class="fas fa-plus mr-2"></i>
              Create First Check-in for {{ monthDetails?.monthName }}
            </button>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="bg-gray-50 px-6 py-4 flex justify-end">
          <button type="button"
                  (click)="onClose()"
                  class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .truncate {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `]
})
export class FinancialCheckinDetailsComponent {
  @Input() isVisible = false;
  @Input() monthDetails: MonthDetails | null = null;
  @Input() monthCheckIns: INode<FinancialCheckIn>[] = [];

  @Output() onCloseModal = new EventEmitter<void>();
  @Output() onAddNewCheckIn = new EventEmitter<MonthDetails>();
  @Output() onEditCheckIn = new EventEmitter<INode<FinancialCheckIn>>();
  @Output() onDeleteCheckIn = new EventEmitter<INode<FinancialCheckIn>>();

  onClose() {
    this.onCloseModal.emit();
  }

  onAddNew() {
    if (this.monthDetails) {
      this.onAddNewCheckIn.emit(this.monthDetails);
    }
  }

  onEdit(checkIn: INode<FinancialCheckIn>) {
    this.onEditCheckIn.emit(checkIn);
  }

  onDelete(checkIn: INode<FinancialCheckIn>) {
    // TODO: Add confirmation dialog
    this.onDeleteCheckIn.emit(checkIn);
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  }

  getWorkingCapitalIcon(ratio: number): string {
    if (ratio >= 1.5) return 'fas fa-check-circle text-green-600 text-xs';
    if (ratio >= 1.0) return 'fas fa-exclamation-triangle text-yellow-600 text-xs';
    return 'fas fa-times-circle text-red-600 text-xs';
  }

  // Summary calculations
  getAverageTurnover(): number {
    if (this.monthCheckIns.length === 0) return 0;
    const sum = this.monthCheckIns.reduce((acc, ci) => acc + (ci.data.turnover_monthly_avg || 0), 0);
    return sum / this.monthCheckIns.length;
  }

  getAverageNetProfit(): number {
    if (this.monthCheckIns.length === 0) return 0;
    const sum = this.monthCheckIns.reduce((acc, ci) => acc + (ci.data.net_profit || 0), 0);
    return sum / this.monthCheckIns.length;
  }

  getAverageMargin(): number {
    if (this.monthCheckIns.length === 0) return 0;
    const sum = this.monthCheckIns.reduce((acc, ci) => acc + (ci.data.np_margin || 0), 0);
    return sum / this.monthCheckIns.length;
  }

  getLatestCash(): number {
    if (this.monthCheckIns.length === 0) return 0;
    // Sort by created_at and get the latest
    const sorted = [...this.monthCheckIns].sort((a, b) =>
      new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
    );
    return sorted[0]?.data.cash_on_hand || 0;
  }
}
