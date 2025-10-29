import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface SalesActivity {
  id: number;
  approachDate: string;
  customerName: string;
  productService: string;
  proposedPrice: number;
  outcome: 'Converted' | 'Not Converted' | 'In Progress' | 'Follow Up';
  actualRevenue: number;
  nextFollowUp?: string;
  notes?: string;
}

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <!-- Header Section -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-900 flex items-center">
            <i class="fas fa-handshake text-green-600 mr-3"></i>
            Sales & Customer Relationships
          </h2>
          <p class="text-gray-600 mt-1">
            Track sales activities, customer interactions, and revenue conversion
          </p>
        </div>
        <div class="text-right">
          <div class="text-sm text-gray-500">Total Revenue</div>
          <div class="text-2xl font-bold text-green-600">
            R {{ getTotalRevenue() | number:'1.0-0' }}
          </div>
        </div>
      </div>

      <!-- Add New Button -->
      <div class="mb-6">
        <button
          class="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
          (click)="onAddNew()"
        >
          <i class="fas fa-plus mr-2"></i>
          Add New Sales Activity
        </button>
      </div>

      <!-- Sales Activities Table -->
      <div class="overflow-x-auto">
        <table class="min-w-full border border-gray-200 rounded-lg overflow-hidden">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-calendar mr-2"></i>Date
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-user mr-2"></i>Customer
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-box mr-2"></i>Product/Service
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-tag mr-2"></i>Proposed Price
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-chart-pie mr-2"></i>Outcome
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-dollar-sign mr-2"></i>Actual Revenue
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-clock mr-2"></i>Follow Up
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-sticky-note mr-2"></i>Notes
              </th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-cog mr-2"></i>Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              *ngFor="let activity of activities; trackBy: trackByFn"
              class="hover:bg-gray-50 transition-colors"
              [class.border-l-4]="activity.id === editingId"
              [class.border-green-500]="activity.id === editingId">

              <!-- Approach Date -->
              <td class="px-6 py-4 whitespace-nowrap">
                <input
                  type="date"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  [(ngModel)]="activity.approachDate"
                  (focus)="setEditing(activity.id)"
                />
              </td>

              <!-- Customer Name -->
              <td class="px-6 py-4 whitespace-nowrap">
                <input
                  type="text"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  [(ngModel)]="activity.customerName"
                  (focus)="setEditing(activity.id)"
                  placeholder="Customer name"
                />
              </td>

              <!-- Product/Service -->
              <td class="px-6 py-4 whitespace-nowrap">
                <input
                  type="text"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  [(ngModel)]="activity.productService"
                  (focus)="setEditing(activity.id)"
                  placeholder="Product or service"
                />
              </td>

              <!-- Proposed Price -->
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <div class="relative">
                  <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">R</span>
                  <input
                    type="number"
                    class="w-full border border-gray-300 rounded-md pl-8 pr-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    [(ngModel)]="activity.proposedPrice"
                    (focus)="setEditing(activity.id)"
                    min="0"
                    step="100"
                    placeholder="0"
                  />
                </div>
              </td>

              <!-- Outcome -->
              <td class="px-6 py-4 whitespace-nowrap">
                <select
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  [(ngModel)]="activity.outcome"
                  (ngModelChange)="onOutcomeChange(activity)"
                  (focus)="setEditing(activity.id)"
                >
                  <option value="In Progress">In Progress</option>
                  <option value="Follow Up">Follow Up</option>
                  <option value="Converted">Converted</option>
                  <option value="Not Converted">Not Converted</option>
                </select>
              </td>

              <!-- Actual Revenue -->
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <div class="relative">
                  <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">R</span>
                  <input
                    type="number"
                    class="w-full border border-gray-300 rounded-md pl-8 pr-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    [(ngModel)]="activity.actualRevenue"
                    (focus)="setEditing(activity.id)"
                    min="0"
                    step="100"
                    placeholder="0"
                    [disabled]="activity.outcome !== 'Converted'"
                  />
                </div>
              </td>

              <!-- Next Follow Up -->
              <td class="px-6 py-4 whitespace-nowrap">
                <input
                  type="date"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  [(ngModel)]="activity.nextFollowUp"
                  (focus)="setEditing(activity.id)"
                  [disabled]="activity.outcome === 'Converted' || activity.outcome === 'Not Converted'"
                />
              </td>

              <!-- Notes -->
              <td class="px-6 py-4">
                <textarea
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                  [(ngModel)]="activity.notes"
                  (focus)="setEditing(activity.id)"
                  placeholder="Add notes..."
                  rows="2"
                ></textarea>
              </td>

              <!-- Actions -->
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <div class="flex items-center justify-center space-x-2">
                  <button
                    class="inline-flex items-center px-3 py-1 border border-red-300 text-red-700 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors text-sm"
                    (click)="onDelete(activity)"
                    title="Delete activity"
                  >
                    <i class="fas fa-trash text-xs"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div *ngIf="activities.length === 0" class="text-center py-12">
        <i class="fas fa-handshake text-gray-400 text-4xl mb-4"></i>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No sales activities yet</h3>
        <p class="text-gray-500 mb-4">Start tracking your customer interactions and sales pipeline</p>
        <button
          class="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
          (click)="onAddNew()"
        >
          <i class="fas fa-plus mr-2"></i>
          Add Your First Activity
        </button>
      </div>

      <!-- Summary Stats -->
      <div *ngIf="activities.length > 0" class="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Sales Performance</h3>
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">{{ activities.length }}</div>
            <div class="text-sm text-gray-500">Total Activities</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">{{ getConvertedCount() }}</div>
            <div class="text-sm text-gray-500">Converted</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-yellow-600">{{ getInProgressCount() }}</div>
            <div class="text-sm text-gray-500">In Progress</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-purple-600">{{ getConversionRate() | number:'1.1-1' }}%</div>
            <div class="text-sm text-gray-500">Conversion Rate</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">R {{ getTotalRevenue() | number:'1.0-0' }}</div>
            <div class="text-sm text-gray-500">Total Revenue</div>
          </div>
        </div>
      </div>

      <!-- Upcoming Follow-ups -->
      <div *ngIf="getUpcomingFollowUps().length > 0" class="mt-8 bg-yellow-50 rounded-lg p-6 border border-yellow-200">
        <h3 class="text-lg font-semibold text-yellow-800 mb-4 flex items-center">
          <i class="fas fa-bell mr-2"></i>
          Upcoming Follow-ups
        </h3>
        <div class="space-y-3">
          <div *ngFor="let activity of getUpcomingFollowUps()" class="flex items-center justify-between bg-white p-3 rounded-md">
            <div class="flex items-center">
              <div class="font-medium text-gray-900">{{ activity.customerName }}</div>
              <div class="ml-2 text-gray-500">- {{ activity.productService }}</div>
            </div>
            <div class="text-sm text-yellow-600 font-medium">{{ activity.nextFollowUp }}</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Custom scrollbar for table */
    .overflow-x-auto::-webkit-scrollbar {
      height: 8px;
    }

    .overflow-x-auto::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 4px;
    }

    .overflow-x-auto::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
    }

    .overflow-x-auto::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }
  `]
})
export class SalesComponent implements OnInit {
  activities: SalesActivity[] = [];
  editingId: number | null = null;
  private nextId = 1;

  ngOnInit(): void {
    this.loadMockData();
  }

  loadMockData(): void {
    const today = new Date();
    const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

    this.activities = [
      {
        id: this.nextId++,
        approachDate: pastDate.toISOString().split('T')[0],
        customerName: 'ABC Enterprises',
        productService: 'E-commerce Platform Setup',
        proposedPrice: 25000,
        outcome: 'Converted',
        actualRevenue: 25000,
        notes: 'Signed contract after demo. Very satisfied with our proposal.'
      },
      {
        id: this.nextId++,
        approachDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        customerName: 'StartupCorp',
        productService: 'Basic Website Build',
        proposedPrice: 15000,
        outcome: 'In Progress',
        actualRevenue: 0,
        nextFollowUp: futureDate.toISOString().split('T')[0],
        notes: 'Waiting for their final decision. Proposal sent last week.'
      },
      {
        id: this.nextId++,
        approachDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        customerName: 'Tech Solutions Ltd',
        productService: 'Monthly SEO Retainer',
        proposedPrice: 3500,
        outcome: 'Converted',
        actualRevenue: 3500,
        notes: 'Monthly retainer started. Very happy with initial SEO audit.'
      },
      {
        id: this.nextId++,
        approachDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        customerName: 'Local Restaurant',
        productService: 'Digital Marketing Course',
        proposedPrice: 1200,
        outcome: 'Follow Up',
        actualRevenue: 0,
        nextFollowUp: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Interested but wants to discuss with their team first.'
      },
      {
        id: this.nextId++,
        approachDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        customerName: 'Manufacturing Co',
        productService: 'Business Consultation',
        proposedPrice: 2400,
        outcome: 'Not Converted',
        actualRevenue: 0,
        notes: 'Decided to go with internal team instead. Price was not the issue.'
      },
      {
        id: this.nextId++,
        approachDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        customerName: 'Online Retailer',
        productService: 'E-commerce Platform Setup',
        proposedPrice: 22000,
        outcome: 'Follow Up',
        actualRevenue: 0,
        nextFollowUp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Very interested. Requested additional features in proposal.'
      }
    ];
  }

  onOutcomeChange(activity: SalesActivity): void {
    if (activity.outcome === 'Converted') {
      if (activity.actualRevenue === 0) {
        activity.actualRevenue = activity.proposedPrice;
      }
      activity.nextFollowUp = undefined;
    } else if (activity.outcome === 'Not Converted') {
      activity.actualRevenue = 0;
      activity.nextFollowUp = undefined;
    }
  }

  setEditing(id: number): void {
    this.editingId = id;
  }

  onAddNew(): void {
    const today = new Date();
    const followUpDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const newActivity: SalesActivity = {
      id: this.nextId++,
      approachDate: today.toISOString().split('T')[0],
      customerName: '',
      productService: '',
      proposedPrice: 0,
      outcome: 'In Progress',
      actualRevenue: 0,
      nextFollowUp: followUpDate.toISOString().split('T')[0],
      notes: ''
    };

    this.activities.unshift(newActivity);
    this.setEditing(newActivity.id);
  }

  onDelete(activity: SalesActivity): void {
    const confirmed = confirm(`Are you sure you want to delete the activity for "${activity.customerName || 'this customer'}"?`);
    if (confirmed) {
      this.activities = this.activities.filter(a => a.id !== activity.id);
      if (this.editingId === activity.id) {
        this.editingId = null;
      }
    }
  }

  getTotalRevenue(): number {
    return this.activities.reduce((total, activity) => total + activity.actualRevenue, 0);
  }

  getConvertedCount(): number {
    return this.activities.filter(activity => activity.outcome === 'Converted').length;
  }

  getInProgressCount(): number {
    return this.activities.filter(activity =>
      activity.outcome === 'In Progress' || activity.outcome === 'Follow Up'
    ).length;
  }

  getConversionRate(): number {
    const totalActivities = this.activities.length;
    if (totalActivities === 0) return 0;

    const convertedCount = this.getConvertedCount();
    return (convertedCount / totalActivities) * 100;
  }

  getUpcomingFollowUps(): SalesActivity[] {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return this.activities
      .filter(activity =>
        activity.nextFollowUp &&
        activity.nextFollowUp >= today &&
        activity.nextFollowUp <= nextWeek
      )
      .sort((a, b) => (a.nextFollowUp! > b.nextFollowUp!) ? 1 : -1);
  }

  trackByFn(index: number, activity: SalesActivity): number {
    return activity.id;
  }
}
