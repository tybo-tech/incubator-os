import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CompanyProfitSummaryService, ProfitDisplayRow, ProfitSectionData, ProfitType } from '../../../../../services/company-profit-summary.service';
import { CompanyProfitSummary } from '../../../../../models/financial.models';
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
          <h2 class="text-xl font-bold text-gray-900">Profits</h2>
        </div>
        <button
          (click)="openYearModal()"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500">
          <i class="fas fa-plus mr-2"></i>
          Year
        </button>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
      </div>

      <!-- Testing Message -->
      <div *ngIf="!loading" class="text-center">
        <p class="text-lg">Profits Component - Strongly Typed Implementation</p>
        <p class="text-sm text-gray-600 mt-2">Company ID: {{ companyId }}</p>
        <p class="text-sm text-gray-600">Sections: {{ profitSections.length }}</p>
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
  originalRowData: ProfitDisplayRow | null = null;

  constructor(
    private profitService: CompanyProfitSummaryService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Get companyId from route params (two levels up: /company/:id/financial/profits)
    const companyId = this.route.parent?.parent?.snapshot.params['id'];
    // Get query parameters
    const queryParams = this.route.parent?.parent?.snapshot.queryParams;

    if (companyId) {
      this.companyId = parseInt(companyId, 10);

      // Extract required query parameters
      this.clientId = queryParams?.['clientId'] ? parseInt(queryParams['clientId'], 10) : 0;
      this.programId = queryParams?.['programId'] ? parseInt(queryParams['programId'], 10) : 0;
      this.cohortId = queryParams?.['cohortId'] ? parseInt(queryParams['cohortId'], 10) : 0;

      console.log('Profits Component - IDs:', {
        companyId: this.companyId,
        clientId: this.clientId,
        programId: this.programId,
        cohortId: this.cohortId
      });

      this.initializeProfitSections();
      this.loadProfitData();
    }
  }

  get existingYears(): number[] {
    const years = new Set<number>();
    this.profitSections.forEach(section => {
      section.rows.forEach(row => years.add(row.year));
    });
    return Array.from(years);
  }

  get allSectionsEmpty(): boolean {
    return this.profitSections.every(section => section.rows.length === 0);
  }

  initializeProfitSections(): void {
    this.profitSections = this.profitService.getProfitSections();
  }

  async loadProfitData(): Promise<void> {
    this.loading = true;
    try {
      const profitRows = await this.profitService.listAllCompanyProfitSummary(this.companyId).toPromise();

      if (profitRows) {
        // Group rows by type using service method
        const groupedRows = this.profitService.groupRowsByType(profitRows);

        // Assign rows to their respective sections
        this.profitSections.forEach(section => {
          section.rows = groupedRows.get(section.type) || [];
        });
      }
    } catch (error) {
      console.error('Error loading profit data:', error);
      this.profitSections.forEach(section => {
        section.rows = [];
      });
    } finally {
      this.loading = false;
    }
  }

  openYearModal(): void {
    this.yearModal.open();
  }

  onYearSelected(year: number): void {
    console.log('Year selected:', year);
  }

  onModalClosed(): void {
    console.log('Modal closed');
  }
}
