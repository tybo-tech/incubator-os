import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ICompany } from '../../../../../models/simple.schema';
import { CompanyService } from '../../../../../services/company.service';
import { ToastService } from '../../../../services/toast.service';

// SWOT interfaces (you may need to import these from your models)
interface SwotItem {
  id?: number;
  content: string;
  category: 'strength' | 'weakness' | 'opportunity' | 'threat';
  company_id: number;
}

@Component({
  selector: 'app-swot-page',
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
            <h2 class="text-xl font-semibold text-gray-900">SWOT Analysis</h2>
            <p class="text-sm text-gray-600 mt-1">
              Analyze {{ company.name }}'s Strengths, Weaknesses, Opportunities, and Threats
            </p>
          </div>
          <div class="flex items-center space-x-3">
            <button
              (click)="exportSwotPdf()"
              [disabled]="isExporting"
              class="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <i *ngIf="!isExporting" class="fas fa-file-pdf mr-2"></i>
              <i *ngIf="isExporting" class="fas fa-spinner fa-spin mr-2"></i>
              {{ isExporting ? 'Generating PDF...' : 'Export PDF' }}
            </button>
          </div>
        </div>
      </div>

      <!-- SWOT Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Strengths -->
        <div class="bg-white rounded-lg shadow-sm border">
          <div class="p-4 border-b bg-green-50">
            <h3 class="text-lg font-medium text-green-800 flex items-center">
              <i class="fas fa-plus-circle mr-2"></i>
              Strengths
            </h3>
            <p class="text-sm text-green-600 mt-1">Internal positive factors</p>
          </div>
          <div class="p-4 space-y-3">
            <div *ngFor="let item of strengths; trackBy: trackByFn"
                 class="bg-green-50 border border-green-200 rounded-lg p-3">
              <div class="flex items-start justify-between">
                <div class="flex-1 mr-2">
                  <textarea
                    [(ngModel)]="item.content"
                    (blur)="saveSwotItem(item)"
                    placeholder="Enter a strength..."
                    class="w-full border-0 bg-transparent resize-none focus:ring-0 text-sm"
                    rows="2"
                  ></textarea>
                </div>
                <button
                  (click)="deleteSwotItem(item)"
                  class="text-red-500 hover:text-red-700 ml-2"
                >
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
            <button
              (click)="addSwotItem('strength')"
              class="w-full border-2 border-dashed border-green-300 rounded-lg p-3 text-green-600 hover:border-green-400 hover:bg-green-50 transition-colors"
            >
              <i class="fas fa-plus mr-2"></i>
              Add Strength
            </button>
          </div>
        </div>

        <!-- Weaknesses -->
        <div class="bg-white rounded-lg shadow-sm border">
          <div class="p-4 border-b bg-red-50">
            <h3 class="text-lg font-medium text-red-800 flex items-center">
              <i class="fas fa-minus-circle mr-2"></i>
              Weaknesses
            </h3>
            <p class="text-sm text-red-600 mt-1">Internal negative factors</p>
          </div>
          <div class="p-4 space-y-3">
            <div *ngFor="let item of weaknesses; trackBy: trackByFn"
                 class="bg-red-50 border border-red-200 rounded-lg p-3">
              <div class="flex items-start justify-between">
                <div class="flex-1 mr-2">
                  <textarea
                    [(ngModel)]="item.content"
                    (blur)="saveSwotItem(item)"
                    placeholder="Enter a weakness..."
                    class="w-full border-0 bg-transparent resize-none focus:ring-0 text-sm"
                    rows="2"
                  ></textarea>
                </div>
                <button
                  (click)="deleteSwotItem(item)"
                  class="text-red-500 hover:text-red-700 ml-2"
                >
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
            <button
              (click)="addSwotItem('weakness')"
              class="w-full border-2 border-dashed border-red-300 rounded-lg p-3 text-red-600 hover:border-red-400 hover:bg-red-50 transition-colors"
            >
              <i class="fas fa-plus mr-2"></i>
              Add Weakness
            </button>
          </div>
        </div>

        <!-- Opportunities -->
        <div class="bg-white rounded-lg shadow-sm border">
          <div class="p-4 border-b bg-blue-50">
            <h3 class="text-lg font-medium text-blue-800 flex items-center">
              <i class="fas fa-lightbulb mr-2"></i>
              Opportunities
            </h3>
            <p class="text-sm text-blue-600 mt-1">External positive factors</p>
          </div>
          <div class="p-4 space-y-3">
            <div *ngFor="let item of opportunities; trackBy: trackByFn"
                 class="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div class="flex items-start justify-between">
                <div class="flex-1 mr-2">
                  <textarea
                    [(ngModel)]="item.content"
                    (blur)="saveSwotItem(item)"
                    placeholder="Enter an opportunity..."
                    class="w-full border-0 bg-transparent resize-none focus:ring-0 text-sm"
                    rows="2"
                  ></textarea>
                </div>
                <button
                  (click)="deleteSwotItem(item)"
                  class="text-red-500 hover:text-red-700 ml-2"
                >
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
            <button
              (click)="addSwotItem('opportunity')"
              class="w-full border-2 border-dashed border-blue-300 rounded-lg p-3 text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <i class="fas fa-plus mr-2"></i>
              Add Opportunity
            </button>
          </div>
        </div>

        <!-- Threats -->
        <div class="bg-white rounded-lg shadow-sm border">
          <div class="p-4 border-b bg-yellow-50">
            <h3 class="text-lg font-medium text-yellow-800 flex items-center">
              <i class="fas fa-exclamation-triangle mr-2"></i>
              Threats
            </h3>
            <p class="text-sm text-yellow-600 mt-1">External negative factors</p>
          </div>
          <div class="p-4 space-y-3">
            <div *ngFor="let item of threats; trackBy: trackByFn"
                 class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div class="flex items-start justify-between">
                <div class="flex-1 mr-2">
                  <textarea
                    [(ngModel)]="item.content"
                    (blur)="saveSwotItem(item)"
                    placeholder="Enter a threat..."
                    class="w-full border-0 bg-transparent resize-none focus:ring-0 text-sm"
                    rows="2"
                  ></textarea>
                </div>
                <button
                  (click)="deleteSwotItem(item)"
                  class="text-red-500 hover:text-red-700 ml-2"
                >
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
            <button
              (click)="addSwotItem('threat')"
              class="w-full border-2 border-dashed border-yellow-300 rounded-lg p-3 text-yellow-600 hover:border-yellow-400 hover:bg-yellow-50 transition-colors"
            >
              <i class="fas fa-plus mr-2"></i>
              Add Threat
            </button>
          </div>
        </div>
      </div>

      <!-- Summary Section -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">SWOT Summary</h3>
        <div class="grid grid-cols-2 gap-6 text-center">
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="text-2xl font-bold text-green-600">{{ strengths.length }}</div>
            <div class="text-sm text-gray-600">Strengths</div>
          </div>
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="text-2xl font-bold text-red-600">{{ weaknesses.length }}</div>
            <div class="text-sm text-gray-600">Weaknesses</div>
          </div>
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="text-2xl font-bold text-blue-600">{{ opportunities.length }}</div>
            <div class="text-sm text-gray-600">Opportunities</div>
          </div>
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="text-2xl font-bold text-yellow-600">{{ threats.length }}</div>
            <div class="text-sm text-gray-600">Threats</div>
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
  loading = true;
  error: string | null = null;

  // SWOT data
  strengths: SwotItem[] = [];
  weaknesses: SwotItem[] = [];
  opportunities: SwotItem[] = [];
  threats: SwotItem[] = [];

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
        this.loadSwotData();
      },
      error: (err) => {
        console.error('Error loading company:', err);
        this.error = 'Failed to load company details';
        this.loading = false;
      }
    });
  }

  private loadSwotData(): void {
    if (!this.company) return;

    // TODO: Load SWOT data from API
    // For now, initialize empty arrays
    this.strengths = [];
    this.weaknesses = [];
    this.opportunities = [];
    this.threats = [];
  }

  addSwotItem(category: 'strength' | 'weakness' | 'opportunity' | 'threat'): void {
    if (!this.companyId) return;

    const newItem: SwotItem = {
      content: '',
      category,
      company_id: this.companyId
    };

    switch (category) {
      case 'strength':
        this.strengths.push(newItem);
        break;
      case 'weakness':
        this.weaknesses.push(newItem);
        break;
      case 'opportunity':
        this.opportunities.push(newItem);
        break;
      case 'threat':
        this.threats.push(newItem);
        break;
    }
  }

  saveSwotItem(item: SwotItem): void {
    if (!item.content.trim()) return;

    // TODO: Save to API
    console.log('Saving SWOT item:', item);
    this.toastService.show('SWOT item saved', 'success');
  }

  deleteSwotItem(item: SwotItem): void {
    // Remove from local arrays
    this.strengths = this.strengths.filter(s => s !== item);
    this.weaknesses = this.weaknesses.filter(w => w !== item);
    this.opportunities = this.opportunities.filter(o => o !== item);
    this.threats = this.threats.filter(t => t !== item);

    // TODO: Delete from API if it has an ID
    if (item.id) {
      console.log('Deleting SWOT item:', item.id);
    }

    this.toastService.show('SWOT item deleted', 'success');
  }

  exportSwotPdf(): void {
    if (!this.company) return;

    this.isExporting = true;
    // TODO: Implement PDF export
    setTimeout(() => {
      this.isExporting = false;
      this.toastService.show('SWOT PDF export functionality will be implemented', 'info');
    }, 1000);
  }

  trackByFn(index: number, item: SwotItem): any {
    return item.id || index;
  }
}
