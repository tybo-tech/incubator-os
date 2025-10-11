import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  CompanyProfitSummary,
  ProfitDisplayRow,
  ProfitSectionData,
  ProfitType
} from '../../../../../models/financial.models';
import { CompanyProfitSummaryService } from '../../../../../services/company-profit-summary.service';
import { YearModalComponent } from '../../../shared/year-modal/year-modal.component';

@Component({
  selector: 'app-profits',
  standalone: true,
  imports: [CommonModule, FormsModule, YearModalComponent],
  template: `
    <div class="bg-white rounded-lg shadow-sm p-6">

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center">
          <i class="fas fa-coins text-yellow-600 text-2xl mr-3"></i>
          <h2 class="text-xl font-bold text-gray-900">Profit Summary</h2>
        </div>
        <button
          (click)="openYearModal()"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500">
          <i class="fas fa-plus mr-2"></i>
          Year
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="flex justify-center items-center py-10">
        <div class="animate-spin h-8 w-8 border-4 border-yellow-500 border-t-transparent rounded-full"></div>
      </div>

      <!-- Tables -->
      <div *ngIf="!loading && profitSections.length > 0" class="space-y-10">

        <div *ngFor="let section of profitSections" class="overflow-x-auto">
          <h3 class="text-lg font-semibold text-gray-800 mb-3 flex items-center">
            <i [ngClass]="{
              'fa-chart-line text-green-600': section.type === 'gross',
              'fa-briefcase text-blue-600': section.type === 'operating',
              'fa-money-bill-wave text-yellow-600': section.type === 'npbt'
            }" class="fas mr-2"></i>
            {{ section.displayName }}
          </h3>

          <table class="min-w-full divide-y divide-gray-200 table-fixed">
            <thead class="bg-gray-50">
              <tr>
                <th class="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Year
                </th>
                <th class="w-28 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Q1</th>
                <th class="w-28 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Q2</th>
                <th class="w-28 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Q3</th>
                <th class="w-28 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Q4</th>
                <th class="w-32 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th class="w-24 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
              </tr>
            </thead>

            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let row of section.rows">
                <td class="px-4 py-4 text-sm font-medium text-gray-900">{{ row.year }}</td>
                <td class="px-4 py-4 text-sm text-center">{{ formatCurrency(row.q1) }}</td>
                <td class="px-4 py-4 text-sm text-center">{{ formatCurrency(row.q2) }}</td>
                <td class="px-4 py-4 text-sm text-center">{{ formatCurrency(row.q3) }}</td>
                <td class="px-4 py-4 text-sm text-center">{{ formatCurrency(row.q4) }}</td>
                <td class="px-4 py-4 text-sm text-center font-semibold">{{ formatCurrency(row.total) }}</td>
                <td class="px-4 py-4 text-sm text-center text-blue-600 font-semibold">
                  {{ formatPercentage(row.margin_pct) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>

      <!-- Empty -->
      <div *ngIf="!loading && allSectionsEmpty" class="text-center py-12">
        <i class="fas fa-chart-pie text-gray-400 text-4xl mb-3"></i>
        <h3 class="text-lg font-medium text-gray-900">No Profit Data</h3>
        <p class="text-gray-600 mb-4">Start by adding your first year's profit data.</p>
        <button
          (click)="openYearModal()"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700">
          <i class="fas fa-plus mr-2"></i>
          Add Year
        </button>
      </div>

      <!-- Year Modal -->
      <app-year-modal
        #yearModal
        [existingYears]="existingYears"
        (yearSelected)="onYearSelected($event)"
        (modalClosed)="onModalClosed()">
      </app-year-modal>

    </div>
  `
})
export class ProfitsComponent implements OnInit {
  @ViewChild('yearModal') yearModal!: YearModalComponent;

  companyId!: number;
  clientId!: number;
  programId!: number;
  cohortId!: number;
  profitSections: ProfitSectionData[] = [];
  loading = false;

  constructor(
    private profitService: CompanyProfitSummaryService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Extract IDs
    const companyId = this.route.parent?.parent?.snapshot.params['id'];
    const queryParams = this.route.parent?.parent?.snapshot.queryParams;

    if (companyId) {
      this.companyId = parseInt(companyId, 10);
      this.clientId = queryParams?.['clientId'] ? parseInt(queryParams['clientId'], 10) : 0;
      this.programId = queryParams?.['programId'] ? parseInt(queryParams['programId'], 10) : 0;
      this.cohortId = queryParams?.['cohortId'] ? parseInt(queryParams['cohortId'], 10) : 0;

      console.log('Profit Summary IDs:', {
        companyId: this.companyId,
        clientId: this.clientId,
        programId: this.programId,
        cohortId: this.cohortId
      });

      this.initializeSections();
      this.loadProfitData();
    }
  }

  initializeSections(): void {
    this.profitSections = [
      {
        type: 'gross',
        displayName: 'Gross Profit',
        rows: [],
        icon: 'fas fa-chart-line',
        color: 'green'
      },
      {
        type: 'operating',
        displayName: 'Operating Profit',
        rows: [],
        icon: 'fas fa-cogs',
        color: 'blue'
      },
      {
        type: 'npbt',
        displayName: 'Net Profit Before Tax',
        rows: [],
        icon: 'fas fa-calculator',
        color: 'purple'
      }
    ];
  }

  get existingYears(): number[] {
    const years = new Set<number>();
    this.profitSections.forEach(section => section.rows.forEach(row => years.add(row.year)));
    return Array.from(years);
  }

  get allSectionsEmpty(): boolean {
    return this.profitSections.every(section => section.rows.length === 0);
  }

  async loadProfitData(): Promise<void> {
    this.loading = true;
    try {
      const data = await this.profitService.listAllCompanyProfitSummary(this.companyId).toPromise();
      if (data && Array.isArray(data)) {
        const groupedRows = this.groupRowsByType(data);
        this.profitSections.forEach(section => {
          section.rows = groupedRows.get(section.type) || [];
        });
      }
    } catch (error) {
      console.error('Error loading profit data:', error);
    } finally {
      this.loading = false;
    }
  }

  /** Groups rows by gross/operating/npbt */
  groupRowsByType(rows: ProfitDisplayRow[]): Map<ProfitType, ProfitDisplayRow[]> {
    const grouped = new Map<ProfitType, ProfitDisplayRow[]>();
    const profitTypes: ProfitType[] = ['gross', 'operating', 'npbt'];

    for (const type of profitTypes) {
      const typeRows = rows.filter(row => row.type === type);
      grouped.set(type, typeRows);
    }
    return grouped;
  }

  openYearModal(): void {
    this.yearModal.open();
  }

  onYearSelected(year: number): void {
    console.log('Selected Year:', year);
  }

  onModalClosed(): void {
    console.log('Modal Closed');
  }

  /** Formatting helpers */
  formatCurrency(value: number | null): string {
    if (value == null || isNaN(value)) return '-';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  formatPercentage(value: number | null): string {
    if (value == null || isNaN(value)) return '-%';
    return `${Math.round(value)}%`;
  }
}
