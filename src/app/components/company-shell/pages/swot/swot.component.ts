import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ICompany } from '../../../../../models/simple.schema';
import { CompanyService } from '../../../../../services/company.service';
import { ToastService } from '../../../../services/toast.service';
import { ActionItemService, ActionItem } from '../../../../../services/action-item.service';
import { ActionItemFormComponent, ActionItemFormConfig, ActionItemData } from '../../../shared/action-item-form/action-item-form.component';
import { ActionItemDisplayComponent } from '../../../shared/action-item-display/action-item-display.component';

// SWOT interfaces - now using ActionItem from the service
interface SwotItem {
  id?: number;
  content: string;
  category: 'strength' | 'weakness' | 'opportunity' | 'threat';
  company_id: number;
}

@Component({
  selector: 'app-swot-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ActionItemFormComponent,
    ActionItemDisplayComponent
  ],
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
    <div *ngIf="company && !loading" class="p-6 max-w-7xl mx-auto">
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
              <div class="text-lg font-semibold text-gray-900">{{ getTotalItemsCount() }} Items</div>
              <div class="text-sm text-gray-500">Total Analysis Points</div>
            </div>
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

      <!-- SWOT Matrix with Accordion Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- INTERNAL FACTORS -->
        <div class="space-y-6">
          <h3 class="text-lg font-medium text-gray-900 text-center bg-gray-50 py-3 rounded-lg border">INTERNAL FACTORS</h3>

          <!-- STRENGTHS ACCORDION -->
          <div class="bg-green-50 border border-green-200 rounded-xl shadow-sm p-6">
            <!-- Strengths Header - Collapsible -->
            <div
              (click)="toggleAccordion('strengths')"
              class="cursor-pointer hover:bg-green-100 transition-colors rounded-lg p-2 -m-2"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <i class="fas fa-muscle mr-3 text-green-600 text-lg"></i>
                  <div>
                    <h4 class="text-lg font-semibold text-green-800">
                      Strengths
                      <span class="ml-2 text-sm font-normal text-green-600">
                        ({{ strengths.length }} items)
                      </span>
                    </h4>
                    <p class="text-sm text-green-700 mt-1">Internal positive factors that give competitive advantage</p>
                  </div>
                </div>
                <div class="flex items-center space-x-3">
                  <button
                    (click)="addSwotItem('strength'); $event.stopPropagation()"
                    class="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    <i class="fas fa-plus mr-2"></i>Add Strength
                  </button>
                  <i
                    class="fas transform transition-transform duration-200 text-green-600"
                    [class.fa-chevron-down]="accordionState.strengths"
                    [class.fa-chevron-right]="!accordionState.strengths"
                  ></i>
                </div>
              </div>
            </div>

            <!-- Strengths Content - Collapsible -->
            <div
              *ngIf="accordionState.strengths"
              class="mt-6 pt-6 pb-2 px-4 space-y-4 border-t border-green-200 bg-green-25 rounded-b-lg"
            >
              <!-- Strength Items -->
              <ng-container *ngFor="let item of strengths; trackBy: trackByFn">
                <!-- Display Mode -->
                <app-action-item-display
                  *ngIf="!isEditing(item)"
                  [item]="convertToActionItemData(item)"
                  categoryColor="green"
                  (edit)="startEditing(item)"
                  (quickDelete)="deleteSwotItem(item)"
                ></app-action-item-display>

                <!-- Edit Mode -->
                <app-action-item-form
                  *ngIf="isEditing(item)"
                  [item]="convertToActionItemData(item)"
                  [config]="getStrengthFormConfig()"
                  (save)="saveSwotItem(item, $event)"
                  (cancel)="cancelEdit(item)"
                  (delete)="deleteSwotItem(item)"
                ></app-action-item-form>
              </ng-container>

              <!-- Enhanced Empty State -->
              <div *ngIf="strengths.length === 0"
                   class="text-center py-12 bg-white rounded-lg border-2 border-dashed border-green-300">
                <i class="fas fa-muscle text-4xl text-green-300 mb-4"></i>
                <h3 class="text-lg font-medium text-gray-900 mb-2">No strengths identified yet</h3>
                <p class="text-gray-600 mb-4">Identify your organization's internal positive factors and competitive advantages.</p>
                <button
                  (click)="addSwotItem('strength')"
                  class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <i class="fas fa-plus mr-2"></i>Add Your First Strength
                </button>
              </div>
            </div>
          </div>

          <!-- WEAKNESSES ACCORDION -->
          <div class="bg-red-50 border border-red-200 rounded-xl shadow-sm p-6">
            <!-- Weaknesses Header - Collapsible -->
            <div
              (click)="toggleAccordion('weaknesses')"
              class="cursor-pointer hover:bg-red-100 transition-colors rounded-lg p-2 -m-2"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <i class="fas fa-exclamation-triangle mr-3 text-red-600 text-lg"></i>
                  <div>
                    <h4 class="text-lg font-semibold text-red-800">
                      Weaknesses
                      <span class="ml-2 text-sm font-normal text-red-600">
                        ({{ weaknesses.length }} items)
                      </span>
                    </h4>
                    <p class="text-sm text-red-700 mt-1">Internal limitations that need improvement</p>
                  </div>
                </div>
                <div class="flex items-center space-x-3">
                  <button
                    (click)="addSwotItem('weakness'); $event.stopPropagation()"
                    class="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    <i class="fas fa-plus mr-2"></i>Add Weakness
                  </button>
                  <i
                    class="fas transform transition-transform duration-200 text-red-600"
                    [class.fa-chevron-down]="accordionState.weaknesses"
                    [class.fa-chevron-right]="!accordionState.weaknesses"
                  ></i>
                </div>
              </div>
            </div>

            <!-- Weaknesses Content - Collapsible -->
            <div
              *ngIf="accordionState.weaknesses"
              class="mt-6 pt-6 pb-2 px-4 space-y-4 border-t border-red-200 bg-red-25 rounded-b-lg"
            >
              <!-- Weakness Items -->
              <ng-container *ngFor="let item of weaknesses; trackBy: trackByFn">
                <!-- Display Mode -->
                <app-action-item-display
                  *ngIf="!isEditing(item)"
                  [item]="convertToActionItemData(item)"
                  categoryColor="red"
                  (edit)="startEditing(item)"
                  (quickDelete)="deleteSwotItem(item)"
                ></app-action-item-display>

                <!-- Edit Mode -->
                <app-action-item-form
                  *ngIf="isEditing(item)"
                  [item]="convertToActionItemData(item)"
                  [config]="getWeaknessFormConfig()"
                  (save)="saveSwotItem(item, $event)"
                  (cancel)="cancelEdit(item)"
                  (delete)="deleteSwotItem(item)"
                ></app-action-item-form>
              </ng-container>

              <!-- Enhanced Empty State -->
              <div *ngIf="weaknesses.length === 0"
                   class="text-center py-12 bg-white rounded-lg border-2 border-dashed border-red-300">
                <i class="fas fa-exclamation-triangle text-4xl text-red-300 mb-4"></i>
                <h3 class="text-lg font-medium text-gray-900 mb-2">No weaknesses identified yet</h3>
                <p class="text-gray-600 mb-4">Identify internal limitations and areas that need improvement.</p>
                <button
                  (click)="addSwotItem('weakness')"
                  class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <i class="fas fa-plus mr-2"></i>Add Your First Weakness
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- EXTERNAL FACTORS -->
        <div class="space-y-6">
          <h3 class="text-lg font-medium text-gray-900 text-center bg-gray-50 py-3 rounded-lg border">EXTERNAL FACTORS</h3>

          <!-- OPPORTUNITIES ACCORDION -->
          <div class="bg-blue-50 border border-blue-200 rounded-xl shadow-sm p-6">
            <!-- Opportunities Header - Collapsible -->
            <div
              (click)="toggleAccordion('opportunities')"
              class="cursor-pointer hover:bg-blue-100 transition-colors rounded-lg p-2 -m-2"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <i class="fas fa-lightbulb mr-3 text-blue-600 text-lg"></i>
                  <div>
                    <h4 class="text-lg font-semibold text-blue-800">
                      Opportunities
                      <span class="ml-2 text-sm font-normal text-blue-600">
                        ({{ opportunities.length }} items)
                      </span>
                    </h4>
                    <p class="text-sm text-blue-700 mt-1">External positive factors you can leverage</p>
                  </div>
                </div>
                <div class="flex items-center space-x-3">
                  <button
                    (click)="addSwotItem('opportunity'); $event.stopPropagation()"
                    class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <i class="fas fa-plus mr-2"></i>Add Opportunity
                  </button>
                  <i
                    class="fas transform transition-transform duration-200 text-blue-600"
                    [class.fa-chevron-down]="accordionState.opportunities"
                    [class.fa-chevron-right]="!accordionState.opportunities"
                  ></i>
                </div>
              </div>
            </div>

            <!-- Opportunities Content - Collapsible -->
            <div
              *ngIf="accordionState.opportunities"
              class="mt-6 pt-6 pb-2 px-4 space-y-4 border-t border-blue-200 bg-blue-25 rounded-b-lg"
            >
              <!-- Opportunity Items -->
              <ng-container *ngFor="let item of opportunities; trackBy: trackByFn">
                <!-- Display Mode -->
                <app-action-item-display
                  *ngIf="!isEditing(item)"
                  [item]="convertToActionItemData(item)"
                  categoryColor="blue"
                  (edit)="startEditing(item)"
                  (quickDelete)="deleteSwotItem(item)"
                ></app-action-item-display>

                <!-- Edit Mode -->
                <app-action-item-form
                  *ngIf="isEditing(item)"
                  [item]="convertToActionItemData(item)"
                  [config]="getOpportunityFormConfig()"
                  (save)="saveSwotItem(item, $event)"
                  (cancel)="cancelEdit(item)"
                  (delete)="deleteSwotItem(item)"
                ></app-action-item-form>
              </ng-container>

              <!-- Enhanced Empty State -->
              <div *ngIf="opportunities.length === 0"
                   class="text-center py-12 bg-white rounded-lg border-2 border-dashed border-blue-300">
                <i class="fas fa-lightbulb text-4xl text-blue-300 mb-4"></i>
                <h3 class="text-lg font-medium text-gray-900 mb-2">No opportunities identified yet</h3>
                <p class="text-gray-600 mb-4">Identify external positive factors and market opportunities you can leverage.</p>
                <button
                  (click)="addSwotItem('opportunity')"
                  class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <i class="fas fa-plus mr-2"></i>Add Your First Opportunity
                </button>
              </div>
            </div>
          </div>

          <!-- THREATS ACCORDION -->
          <div class="bg-yellow-50 border border-yellow-200 rounded-xl shadow-sm p-6">
            <!-- Threats Header - Collapsible -->
            <div
              (click)="toggleAccordion('threats')"
              class="cursor-pointer hover:bg-yellow-100 transition-colors rounded-lg p-2 -m-2"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <i class="fas fa-exclamation-circle mr-3 text-yellow-600 text-lg"></i>
                  <div>
                    <h4 class="text-lg font-semibold text-yellow-800">
                      Threats
                      <span class="ml-2 text-sm font-normal text-yellow-600">
                        ({{ threats.length }} items)
                      </span>
                    </h4>
                    <p class="text-sm text-yellow-700 mt-1">External risks that could impact success</p>
                  </div>
                </div>
                <div class="flex items-center space-x-3">
                  <button
                    (click)="addSwotItem('threat'); $event.stopPropagation()"
                    class="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                  >
                    <i class="fas fa-plus mr-2"></i>Add Threat
                  </button>
                  <i
                    class="fas transform transition-transform duration-200 text-yellow-600"
                    [class.fa-chevron-down]="accordionState.threats"
                    [class.fa-chevron-right]="!accordionState.threats"
                  ></i>
                </div>
              </div>
            </div>

            <!-- Threats Content - Collapsible -->
            <div
              *ngIf="accordionState.threats"
              class="mt-6 pt-6 pb-2 px-4 space-y-4 border-t border-yellow-200 bg-yellow-25 rounded-b-lg"
            >
              <!-- Threat Items -->
              <ng-container *ngFor="let item of threats; trackBy: trackByFn">
                <!-- Display Mode -->
                <app-action-item-display
                  *ngIf="!isEditing(item)"
                  [item]="convertToActionItemData(item)"
                  categoryColor="yellow"
                  (edit)="startEditing(item)"
                  (quickDelete)="deleteSwotItem(item)"
                ></app-action-item-display>

                <!-- Edit Mode -->
                <app-action-item-form
                  *ngIf="isEditing(item)"
                  [item]="convertToActionItemData(item)"
                  [config]="getThreatFormConfig()"
                  (save)="saveSwotItem(item, $event)"
                  (cancel)="cancelEdit(item)"
                  (delete)="deleteSwotItem(item)"
                ></app-action-item-form>
              </ng-container>

              <!-- Enhanced Empty State -->
              <div *ngIf="threats.length === 0"
                   class="text-center py-12 bg-white rounded-lg border-2 border-dashed border-yellow-300">
                <i class="fas fa-exclamation-circle text-4xl text-yellow-300 mb-4"></i>
                <h3 class="text-lg font-medium text-gray-900 mb-2">No threats identified yet</h3>
                <p class="text-gray-600 mb-4">Identify external risks and threats that could impact your success.</p>
                <button
                  (click)="addSwotItem('threat')"
                  class="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  <i class="fas fa-plus mr-2"></i>Add Your First Threat
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Enhanced Summary Section -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-medium text-gray-900">SWOT Analysis Summary</h3>
          <div class="text-sm text-gray-500">
            Total: {{ getTotalItemsCount() }} analysis points
          </div>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-green-50 rounded-lg p-4 text-center border border-green-200">
            <div class="text-2xl font-bold text-green-600">{{ strengths.length }}</div>
            <div class="text-sm text-green-700 font-medium">Strengths</div>
            <div class="text-xs text-green-600 mt-1">Internal Positives</div>
          </div>
          <div class="bg-red-50 rounded-lg p-4 text-center border border-red-200">
            <div class="text-2xl font-bold text-red-600">{{ weaknesses.length }}</div>
            <div class="text-sm text-red-700 font-medium">Weaknesses</div>
            <div class="text-xs text-red-600 mt-1">Internal Negatives</div>
          </div>
          <div class="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
            <div class="text-2xl font-bold text-blue-600">{{ opportunities.length }}</div>
            <div class="text-sm text-blue-700 font-medium">Opportunities</div>
            <div class="text-xs text-blue-600 mt-1">External Positives</div>
          </div>
          <div class="bg-yellow-50 rounded-lg p-4 text-center border border-yellow-200">
            <div class="text-2xl font-bold text-yellow-600">{{ threats.length }}</div>
            <div class="text-sm text-yellow-700 font-medium">Threats</div>
            <div class="text-xs text-yellow-600 mt-1">External Negatives</div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="mt-6 flex flex-wrap gap-2">
          <button
            (click)="toggleAccordion('strengths')"
            class="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full hover:bg-green-200"
          >
            {{ accordionState.strengths ? 'Hide' : 'Show' }} Strengths
          </button>
          <button
            (click)="toggleAccordion('weaknesses')"
            class="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-full hover:bg-red-200"
          >
            {{ accordionState.weaknesses ? 'Hide' : 'Show' }} Weaknesses
          </button>
          <button
            (click)="toggleAccordion('opportunities')"
            class="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full hover:bg-blue-200"
          >
            {{ accordionState.opportunities ? 'Hide' : 'Show' }} Opportunities
          </button>
          <button
            (click)="toggleAccordion('threats')"
            class="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full hover:bg-yellow-200"
          >
            {{ accordionState.threats ? 'Hide' : 'Show' }} Threats
          </button>
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

  // Accordion state for collapsible sections
  accordionState = {
    strengths: true,
    weaknesses: true,
    opportunities: true,
    threats: true
  };

  // Edit mode state for individual items
  editingItems: Set<number> = new Set();

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private companyService: CompanyService,
    private toastService: ToastService,
    private actionItemService: ActionItemService
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

    // Load SWOT action items from API
    this.actionItemService.getSwotActionItems(this.company.id).subscribe({
      next: (actionItems) => {
        console.log('Loaded SWOT action items:', actionItems);

        // Convert ActionItems to SwotItems and categorize them (handle case-insensitive categories)
        this.strengths = this.convertToSwotItems(actionItems.filter(item =>
          item.category?.toLowerCase() === 'strengths' || item.category?.toLowerCase() === 'strength'
        ));
        this.weaknesses = this.convertToSwotItems(actionItems.filter(item =>
          item.category?.toLowerCase() === 'weaknesses' || item.category?.toLowerCase() === 'weakness'
        ));
        this.opportunities = this.convertToSwotItems(actionItems.filter(item =>
          item.category?.toLowerCase() === 'opportunities' || item.category?.toLowerCase() === 'opportunity'
        ));
        this.threats = this.convertToSwotItems(actionItems.filter(item =>
          item.category?.toLowerCase() === 'threats' || item.category?.toLowerCase() === 'threat'
        ));

        console.log('Categorized SWOT data:', {
          strengths: this.strengths.length,
          weaknesses: this.weaknesses.length,
          opportunities: this.opportunities.length,
          threats: this.threats.length
        });
      },
      error: (err) => {
        console.error('Error loading SWOT data:', err);
        this.toastService.show('Failed to load SWOT analysis data', 'error');
        // Initialize empty arrays on error
        this.strengths = [];
        this.weaknesses = [];
        this.opportunities = [];
        this.threats = [];
      }
    });
  }

  addSwotItem(category: 'strength' | 'weakness' | 'opportunity' | 'threat'): void {
    if (!this.companyId) return;

    // Convert to API format (plural form that matches existing data)
    const apiCategory = category === 'strength' ? 'Strengths' :
                       category === 'weakness' ? 'Weaknesses' :
                       category === 'opportunity' ? 'Opportunities' : 'Threats';

    // Create ActionItem via service using the correct API category format
    this.actionItemService.createSwotActionItem(this.companyId, apiCategory, '').subscribe({
      next: (actionItem) => {
        const newItem: SwotItem = {
          id: actionItem.id,
          content: actionItem.description || '',
          category,
          company_id: this.companyId!
        };

        // Add to appropriate array
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

        this.toastService.show(`New ${category} added`, 'success');
      },
      error: (err) => {
        console.error('Error adding SWOT item:', err);
        this.toastService.show(`Failed to add ${category}`, 'error');
      }
    });
  }

  saveSwotItem(swotItem: SwotItem, actionData: ActionItemData): void {
    // Update the SwotItem with the new content
    swotItem.content = actionData.description;

    // Save the item using the existing save method
    this.saveAndCloseEdit(swotItem);
  }

  deleteSwotItem(item: SwotItem): void {
    if (!item.id) {
      // Remove from local arrays if no ID (shouldn't happen with real items)
      this.removeFromLocalArrays(item);
      return;
    }

    // Delete via API
    this.actionItemService.deleteActionItem(item.id).subscribe({
      next: () => {
        // Remove from local arrays after successful API call
        this.removeFromLocalArrays(item);
        this.toastService.show('SWOT item deleted', 'success');
      },
      error: (err) => {
        console.error('Error deleting SWOT item:', err);
        this.toastService.show('Failed to delete SWOT item', 'error');
      }
    });
  }

  /**
   * Helper method to remove item from local arrays
   */
  private removeFromLocalArrays(item: SwotItem): void {
    this.strengths = this.strengths.filter(s => s !== item);
    this.weaknesses = this.weaknesses.filter(w => w !== item);
    this.opportunities = this.opportunities.filter(o => o !== item);
    this.threats = this.threats.filter(t => t !== item);
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

  /**
   * Convert ActionItems to SwotItems for template compatibility
   */
  private convertToSwotItems(actionItems: ActionItem[]): SwotItem[] {
    return actionItems.map(item => {
      // Normalize category names from API format to component format
      let normalizedCategory: 'strength' | 'weakness' | 'opportunity' | 'threat';
      const category = item.category?.toLowerCase();

      if (category === 'strengths' || category === 'strength') {
        normalizedCategory = 'strength';
      } else if (category === 'weaknesses' || category === 'weakness') {
        normalizedCategory = 'weakness';
      } else if (category === 'opportunities' || category === 'opportunity') {
        normalizedCategory = 'opportunity';
      } else if (category === 'threats' || category === 'threat') {
        normalizedCategory = 'threat';
      } else {
        normalizedCategory = 'strength'; // Default fallback
      }

      return {
        id: item.id,
        content: item.description || '',
        category: normalizedCategory,
        company_id: item.company_id
      };
    });
  }

  /**
   * Convert SwotItem back to ActionItem for API calls
   */
  private convertToActionItem(swotItem: SwotItem): Partial<ActionItem> {
    // Convert to API format (plural form that matches existing data)
    const apiCategory = swotItem.category === 'strength' ? 'Strengths' :
                       swotItem.category === 'weakness' ? 'Weaknesses' :
                       swotItem.category === 'opportunity' ? 'Opportunities' : 'Threats';

    return {
      id: swotItem.id,
      company_id: swotItem.company_id,
      context_type: 'swot',
      category: apiCategory,
      description: swotItem.content,
      status: 'pending', // Map "Identified" to pending for TypeScript compatibility
      priority: 'medium'
    };
  }

  /**
   * Get total count of all SWOT items
   */
  getTotalItemsCount(): number {
    return this.strengths.length + this.weaknesses.length +
           this.opportunities.length + this.threats.length;
  }

  /**
   * Toggle accordion section open/closed
   */
  toggleAccordion(section: 'strengths' | 'weaknesses' | 'opportunities' | 'threats'): void {
    this.accordionState[section] = !this.accordionState[section];
  }

  /**
   * Check if an item is currently being edited
   */
  isEditing(item: SwotItem): boolean {
    return item.id ? this.editingItems.has(item.id) : false;
  }

  /**
   * Start editing an item
   */
  startEditing(item: SwotItem): void {
    if (item.id) {
      this.editingItems.add(item.id);
    }
  }

  /**
   * Save changes and close edit mode
   */
  saveAndCloseEdit(item: SwotItem): void {
    this.saveSwotItemInternal(item);
    if (item.id) {
      this.editingItems.delete(item.id);
    }
  }

  /**
   * Internal method to save SWOT item
   */
  private saveSwotItemInternal(item: SwotItem): void {
    if (!item.content.trim()) return;
    if (!item.id) return; // Can't save without an ID

    // Convert to ActionItem and update via API
    const actionItemData = this.convertToActionItem(item);

    this.actionItemService.updateActionItem(item.id, actionItemData).subscribe({
      next: (updatedItem) => {
        console.log('SWOT item saved:', updatedItem);
        this.toastService.show('SWOT item saved', 'success');
      },
      error: (err) => {
        console.error('Error saving SWOT item:', err);
        this.toastService.show('Failed to save SWOT item', 'error');
      }
    });
  }

  /**
   * Cancel editing without saving
   */
  cancelEdit(item: SwotItem): void {
    if (item.id) {
      this.editingItems.delete(item.id);
      // Optionally reload data to revert changes
      this.loadSwotData();
    }
  }

  // Methods for reusable components integration

  /**
   * Get form configuration for strengths
   */
  getStrengthFormConfig(): ActionItemFormConfig {
    return {
      primaryLabel: 'Strength Description',
      primaryPlaceholder: 'Describe this strength in detail...',
      categoryColor: 'green',
      category: 'strength',
      showImpact: true
    };
  }

  /**
   * Get form configuration for weaknesses
   */
  getWeaknessFormConfig(): ActionItemFormConfig {
    return {
      primaryLabel: 'Weakness Description',
      primaryPlaceholder: 'Describe this weakness that needs improvement...',
      categoryColor: 'red',
      category: 'weakness',
      showImpact: true
    };
  }

  /**
   * Get form configuration for opportunities
   */
  getOpportunityFormConfig(): ActionItemFormConfig {
    return {
      primaryLabel: 'Opportunity Description',
      primaryPlaceholder: 'Describe this external opportunity...',
      categoryColor: 'blue',
      category: 'opportunity',
      showImpact: true
    };
  }

  /**
   * Get form configuration for threats
   */
  getThreatFormConfig(): ActionItemFormConfig {
    return {
      primaryLabel: 'Threat Description',
      primaryPlaceholder: 'Describe this external threat or risk...',
      categoryColor: 'yellow',
      category: 'threat',
      showImpact: true
    };
  }

  /**
   * Convert SwotItem to ActionItemData format
   */
  convertToActionItemData(item: SwotItem): ActionItemData {
    return {
      id: item.id,
      description: item.content || '',
      action_required: '', // SwotItem doesn't have this field yet
      assigned_to: '',     // SwotItem doesn't have this field yet
      target_date: '',     // SwotItem doesn't have this field yet
      status: 'identified', // Default status
      priority: 'medium',   // Default priority
      impact: 'medium'      // Default impact
    };
  }


}
