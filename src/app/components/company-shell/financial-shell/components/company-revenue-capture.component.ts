import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { YearGroupComponent } from './year-group.component';
import { YearGroup, AccountRecord } from '../models/revenue-capture.interface';

@Component({
  selector: 'app-company-revenue-capture',
  standalone: true,
  imports: [CommonModule, FormsModule, YearGroupComponent],
  template: `
    <div class="p-6 space-y-6 bg-gray-50 min-h-screen">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-semibold text-gray-800">Yearly Revenue Capture</h1>
          <p class="text-gray-600 mt-1">Manage monthly revenue data across financial years</p>
        </div>
        <button 
          (click)="addYear()" 
          class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 shadow-sm flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Add Year
        </button>
      </div>

      <!-- Summary Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div class="text-sm text-gray-500">Total Years</div>
          <div class="text-2xl font-semibold text-gray-800">{{ years().length }}</div>
        </div>
        <div class="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div class="text-sm text-gray-500">Total Revenue</div>
          <div class="text-2xl font-semibold text-purple-600">R {{ totalRevenue() | number:'1.0-2' }}</div>
        </div>
        <div class="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div class="text-sm text-gray-500">Active Years</div>
          <div class="text-2xl font-semibold text-green-600">{{ activeYears() }}</div>
        </div>
      </div>

      <!-- Year Groups -->
      <div class="space-y-4">
        <div *ngIf="years().length === 0" class="text-center py-12 bg-white rounded-lg border border-gray-200">
          <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No financial years yet</h3>
          <p class="text-gray-500 mb-4">Get started by adding your first financial year</p>
          <button 
            (click)="addYear()" 
            class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            Add First Year
          </button>
        </div>

        <app-year-group
          *ngFor="let year of years(); trackBy: trackYear"
          [year]="year"
          (yearChanged)="onYearChanged($event)"
          (deleteYear)="deleteYear($event)">
        </app-year-group>
      </div>

      <!-- Footer -->
      <div class="text-center text-gray-500 text-sm py-4">
        💡 Click on year headers to expand/collapse. Use tab to navigate between inputs.
      </div>
    </div>
  `
})
export class CompanyRevenueCaptureComponent {
  // Reactive signals
  years = signal<YearGroup[]>([]);
  
  // Computed values
  totalRevenue = computed(() => {
    return this.years().reduce((total, year) => {
      return total + this.getYearTotal(year);
    }, 0);
  });

  activeYears = computed(() => {
    return this.years().filter(year => year.isActive).length;
  });

  constructor() {
    this.initializeSampleData();
  }

  trackYear(index: number, year: YearGroup): number {
    return year.id;
  }

  addYear(): void {
    const currentYear = new Date().getFullYear();
    const newId = Math.max(...this.years().map(y => y.id), 0) + 1;
    
    const newYear: YearGroup = {
      id: newId,
      name: `FY ${currentYear}/${(currentYear + 1).toString().slice(-2)}`,
      startMonth: 3, // March
      endMonth: 2,   // February
      expanded: true,
      isActive: true,
      accounts: [this.createEmptyAccount(1)]
    };

    this.years.update(years => [...years, newYear]);
  }

  deleteYear(yearId: number): void {
    this.years.update(years => years.filter(y => y.id !== yearId));
  }

  onYearChanged(updatedYear: YearGroup): void {
    this.years.update(years => 
      years.map(year => year.id === updatedYear.id ? updatedYear : year)
    );
  }

  getYearTotal(year: YearGroup): number {
    return year.accounts.reduce((total, account) => total + (account.total || 0), 0);
  }

  private createEmptyAccount(id: number): AccountRecord {
    return {
      id,
      accountName: '',
      months: {
        m1: null, m2: null, m3: null, m4: null,
        m5: null, m6: null, m7: null, m8: null,
        m9: null, m10: null, m11: null, m12: null
      },
      total: 0
    };
  }

  private initializeSampleData(): void {
    const sampleYears: YearGroup[] = [
      {
        id: 1,
        name: 'FY 2024/2025',
        startMonth: 3,
        endMonth: 2,
        expanded: true,
        isActive: true,
        accounts: [
          {
            id: 1,
            accountName: 'Main Account',
            months: {
              m1: 570, m2: 4928, m3: 2860, m4: 1380,
              m5: 2775, m6: 0, m7: 9455, m8: 4090,
              m9: 3770, m10: 1680, m11: 0, m12: 0
            },
            total: 31508
          },
          {
            id: 2,
            accountName: 'Revenue Account',
            months: {
              m1: 1200, m2: 1500, m3: 1800, m4: 2100,
              m5: 2400, m6: 2700, m7: 3000, m8: 3300,
              m9: 3600, m10: 3900, m11: 4200, m12: 4500
            },
            total: 34200
          }
        ]
      },
      {
        id: 2,
        name: 'FY 2023/2024',
        startMonth: 3,
        endMonth: 2,
        expanded: false,
        isActive: false,
        accounts: [
          {
            id: 3,
            accountName: 'Main Account',
            months: {
              m1: 800, m2: 950, m3: 1100, m4: 1250,
              m5: 1400, m6: 1550, m7: 1700, m8: 1850,
              m9: 2000, m10: 2150, m11: 2300, m12: 2450
            },
            total: 19500
          }
        ]
      }
    ];

    this.years.set(sampleYears);
  }
}