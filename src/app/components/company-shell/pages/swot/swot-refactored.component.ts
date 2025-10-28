import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, Observable, map } from 'rxjs';
import { ICompany } from '../../../../../models/simple.schema';
import { CompanyService } from '../../../../../services/company.service';
import { ToastService } from '../../../../services/toast.service';
import { SwotDataService, SwotSummary } from '../../../../../services/swot-data.service';
import { SwotUIStateService, AccordionState } from '../../../../../services/swot-ui-state.service';
import { SwotConfigService, SwotCategoryType } from '../../../../../services/swot-config.service';
import { SwotCategorySectionComponent } from '../../../shared/swot-category-section/swot-category-section.component';
import { SwotItem } from '../../../../../services/swot-data.service';

@Component({
  selector: 'app-swot-page',
  standalone: true,
  imports: [
    CommonModule,
    SwotCategorySectionComponent
  ],
  template: `
    <!-- Loading State -->
    <div *ngIf="loading$ | async" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>

    <!-- Error State -->
    <div *ngIf="error && !(loading$ | async)" class="bg-red-50 border border-red-200 rounded-lg p-4">
      <div class="text-red-800">{{ error }}</div>
    </div>

    <!-- Main Content -->
    <div *ngIf="company && !(loading$ | async)" class="p-6 max-w-7xl mx-auto">
      <div class="space-y-8">
        <!-- Header -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-semibold text-gray-900">SWOT Analysis</h2>
              <p class="text-sm text-gray-600 mt-1">
                Analyze {{ company.name }}'s Strengths, Weaknesses, Opportunities, and Threats
              </p>
            </div>
            <div class="flex items-center space-x-4">
              <div class="text-right">
                <div class="text-lg font-semibold text-gray-900">{{ (summary$ | async)?.total || 0 }} Items</div>
                <div class="text-sm text-gray-500">Total Analysis Points</div>
              </div>
              <button
                (click)="exportSwotPdf()"
                [disabled]="isExporting$ | async"
                class="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <i *ngIf="!(isExporting$ | async)" class="fas fa-file-pdf mr-2"></i>
                <i *ngIf="isExporting$ | async" class="fas fa-spinner fa-spin mr-2"></i>
                {{ (isExporting$ | async) ? 'Generating PDF...' : 'Export PDF' }}
              </button>
            </div>
          </div>
        </div>

        <!-- SWOT Matrix with Accordion Layout -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <!-- INTERNAL FACTORS -->
          <div class="space-y-6">
            <h3 class="text-lg font-medium text-gray-900 text-center bg-gray-50 py-3 rounded-lg border">
              INTERNAL FACTORS
            </h3>

            <!-- Strengths Section -->
            <app-swot-category-section
              category="strength"
              [companyId]="companyId!"
              (itemAdded)="onItemChanged()"
              (itemUpdated)="onItemChanged()"
              (itemDeleted)="onItemChanged()"
            ></app-swot-category-section>

            <!-- Weaknesses Section -->
            <app-swot-category-section
              category="weakness"
              [companyId]="companyId!"
              (itemAdded)="onItemChanged()"
              (itemUpdated)="onItemChanged()"
              (itemDeleted)="onItemChanged()"
            ></app-swot-category-section>
          </div>

          <!-- EXTERNAL FACTORS -->
          <div class="space-y-6">
            <h3 class="text-lg font-medium text-gray-900 text-center bg-gray-50 py-3 rounded-lg border">
              EXTERNAL FACTORS
            </h3>

            <!-- Opportunities Section -->
            <app-swot-category-section
              category="opportunity"
              [companyId]="companyId!"
              (itemAdded)="onItemChanged()"
              (itemUpdated)="onItemChanged()"
              (itemDeleted)="onItemChanged()"
            ></app-swot-category-section>

            <!-- Threats Section -->
            <app-swot-category-section
              category="threat"
              [companyId]="companyId!"
              (itemAdded)="onItemChanged()"
              (itemUpdated)="onItemChanged()"
              (itemDeleted)="onItemChanged()"
            ></app-swot-category-section>
          </div>
        </div>

        <!-- Enhanced Summary Section -->
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-medium text-gray-900">SWOT Analysis Summary</h3>
            <div class="text-sm text-gray-500">
              Total: {{ (summary$ | async)?.total || 0 }} analysis points
            </div>
          </div>

          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Summary Cards -->
            <div 
              *ngFor="let category of categories" 
              class="rounded-lg p-4 text-center border"
              [ngClass]="configService.getCategoryClasses(category) + ' border ' + configService.getCategoryClasses(category, 'border')"
            >
              <div 
                class="text-2xl font-bold"
                [ngClass]="configService.getCategoryClasses(category, 'text')"
              >
                {{ getCategoryCount(category) }}
              </div>
              <div 
                class="text-sm font-medium"
                [ngClass]="configService.getCategoryClasses(category, 'text').replace('600', '700')"
              >
                {{ configService.getCategoryDisplayName(category, true) }}
              </div>
              <div 
                class="text-xs mt-1"
                [ngClass]="configService.getCategoryClasses(category, 'text')"
              >
                {{ configService.getCategoryConfig(category).internalExternal | titlecase }} 
                {{ configService.getCategoryConfig(category).positiveNegative | titlecase }}s
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="mt-6 flex flex-wrap gap-2">
            <button
              *ngFor="let category of categories"
              (click)="toggleCategory(category)"
              class="px-3 py-1 text-xs rounded-full transition-colors"
              [ngClass]="configService.getButtonClasses(category, 'secondary')"
            >
              {{ getCategoryToggleText(category) }} {{ configService.getCategoryDisplayName(category, true) }}
            </button>
            <button
              (click)="expandAll()"
              class="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full hover:bg-gray-200"
            >
              Expand All
            </button>
            <button
              (click)="collapseAll()"
              class="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full hover:bg-gray-200"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./swot.component.scss']
})
export class SwotComponent implements OnInit, OnDestroy {
  // Route-based properties
  companyId: number | null = null;
  company: ICompany | null = null;
  error: string | null = null;

  // Observables from services
  loading$!: Observable<boolean>;
  summary$!: Observable<SwotSummary>;
  accordionState$!: Observable<AccordionState>;
  isExporting$!: Observable<boolean>;

  // Category configuration
  categories: SwotCategoryType[] = ['strength', 'weakness', 'opportunity', 'threat'];

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private companyService: CompanyService,
    private toastService: ToastService,
    public swotDataService: SwotDataService,
    public uiStateService: SwotUIStateService,
    public configService: SwotConfigService
  ) {}

  ngOnInit(): void {
    // Initialize observables
    this.loading$ = this.swotDataService.getLoadingState();
    this.summary$ = this.swotDataService.getSwotSummary();
    this.accordionState$ = this.uiStateService.getAccordionState();
    this.isExporting$ = this.uiStateService.getExportState();

    // Get company ID from parent route parameters (/company/:id)
    this.route.parent?.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = params['id'];
      if (id) {
        this.companyId = parseInt(id, 10);
        this.loadCompany();
      } else {
        this.error = 'No company ID provided in parent route';
      }
    });
  }

  ngOnDestroy(): void {
    // Save UI state before destroying
    if (this.companyId) {
      this.uiStateService.saveUIState(this.companyId);
    }
    
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCompany(): void {
    if (!this.companyId) return;

    this.error = null;

    this.companyService.getCompanyById(this.companyId).subscribe({
      next: (company) => {
        this.company = company;
        // Load UI state for this company
        this.uiStateService.loadUIState(this.companyId!);
        // Load SWOT data
        this.loadSwotData();
      },
      error: (err) => {
        console.error('Error loading company:', err);
        this.error = 'Failed to load company details';
      }
    });
  }

  private loadSwotData(): void {
    if (!this.company) return;

    this.swotDataService.loadSwotData(this.company.id).subscribe({
      error: (err) => {
        this.error = 'Failed to load SWOT analysis data';
      }
    });
  }

  exportSwotPdf(): void {
    if (!this.company) return;

    this.uiStateService.setExportState(true);
    
    // TODO: Implement PDF export with the service
    setTimeout(() => {
      this.uiStateService.setExportState(false);
      this.toastService.show('SWOT PDF export functionality will be implemented', 'info');
    }, 1000);
  }

  onItemChanged(): void {
    // This method is called when any SWOT item is added/updated/deleted
    // The data service handles the state updates automatically
    console.log('SWOT item changed - data service will handle updates');
  }

  getCategoryCount(category: SwotCategoryType): Observable<number> {
    return this.swotDataService.getItemsByCategory(category).pipe(
      map((items: SwotItem[]) => items.length)
    );
  }

  toggleCategory(category: SwotCategoryType): void {
    this.uiStateService.toggleAccordion(category + 's' as any);
  }

  getCategoryToggleText(category: SwotCategoryType): string {
    // This would need to be updated to use observables properly
    return 'Toggle'; // Simplified for now
  }

  expandAll(): void {
    this.uiStateService.expandAll();
  }

  collapseAll(): void {
    this.uiStateService.collapseAll();
  }
}