import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ICompany } from '../../../../../../models/simple.schema';
import { IMetricGroup, IMetricType, IMetricRecord, MetricsHierarchy } from '../../../../../../models/metrics.model';
import { MetricsService } from '../../../../../../services/metrics.service';
import { QuarterlyMetricsTableComponent } from '../quarterly-metrics-table/quarterly-metrics-table.component';
import { YearlyMetricsTableComponent } from '../yearly-metrics-table/yearly-metrics-table.component';
import { MetricsUtils } from '../../../../../../utils/metrics.utils';

@Component({
  selector: 'app-group-metrics-container',
  standalone: true,
  imports: [CommonModule, FormsModule, QuarterlyMetricsTableComponent, YearlyMetricsTableComponent],
  template: `
    <div class="space-y-6">
      <!-- Group Header -->
      <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">{{ group?.name || 'Metrics Group' }}</h2>
            <p *ngIf="group?.description" class="text-gray-600 mt-1">{{ group?.description }}</p>
            <div class="flex items-center gap-4 mt-3 text-sm text-gray-500">
              <span>{{ quarterlyTypes.length }} Quarterly Metrics</span>
              <span>{{ yearlyTypes.length }} Annual Metrics</span>
              <span *ngIf="yearlySideBySideTypes.length > 0">{{ yearlySideBySideTypes.length }} Category-Based Metrics</span>
              <span>{{ totalRecords }} Total Records</span>
            </div>
          </div>
          <div class="text-right">
            <div class="text-3xl font-bold text-blue-600">{{ group?.code }}</div>
            <div class="text-xs text-gray-500 mt-1">Group ID: {{ group?.id }}</div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span class="ml-3 text-gray-600">Loading metrics data...</span>
      </div>

      <!-- Error State -->
      <div *ngIf="error && !loading" class="bg-red-50 border border-red-200 rounded-lg p-4">
        <div class="flex items-center">
          <span class="text-red-600 text-xl mr-3">⚠️</span>
          <div>
            <h3 class="text-red-800 font-semibold">Error Loading Metrics</h3>
            <p class="text-red-600 text-sm">{{ error }}</p>
          </div>
        </div>
      </div>

      <!-- Quarterly Metrics Section -->
      <div *ngIf="quarterlyTypes.length > 0">
        <div class="flex items-center gap-2 mb-4">
          <h3 class="text-lg font-semibold text-gray-900">📊 Quarterly Metrics</h3>
          <span class="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
            {{ quarterlyTypes.length }} metrics
          </span>
        </div>

        <div class="space-y-4">
          <app-quarterly-metrics-table
            *ngFor="let type of quarterlyTypes; trackBy: trackByTypeId"
            [metricType]="type"
            [records]="getRecordsForType(type.id)"
            (recordUpdated)="onRecordUpdated($event)"
            (recordDeleted)="onRecordDeleted($event)"
            (addYearRequested)="onAddYearRequested($event)"
          ></app-quarterly-metrics-table>
        </div>
      </div>

      <!-- Yearly Metrics Section -->
      <div *ngIf="yearlyTypes.length > 0">
        <div class="flex items-center gap-2 mb-4">
          <h3 class="text-lg font-semibold text-gray-900">📅 Annual Metrics</h3>
          <span class="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
            {{ yearlyTypes.length }} metrics
          </span>
        </div>

        <div class="space-y-4">
          <app-yearly-metrics-table
            *ngFor="let type of yearlyTypes; trackBy: trackByTypeId"
            [metricType]="type"
            [records]="getRecordsForType(type.id)"
            (recordUpdated)="onRecordUpdated($event)"
            (recordDeleted)="onRecordDeleted($event)"
            (addYearRequested)="onAddYearRequested($event)"
          ></app-yearly-metrics-table>
        </div>
      </div>

      <!-- Category-Based Side-by-Side Metrics Section -->
      <div *ngIf="yearlySideBySideTypes.length > 0">
        <div class="flex items-center gap-2 mb-4">
          <h3 class="text-lg font-semibold text-gray-900">🏷️ Category-Based Metrics</h3>
          <span class="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">
            {{ yearlySideBySideTypes.length }} metrics
          </span>
        </div>

        <!-- Global Year Selector for Category Metrics -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div class="flex items-center justify-between">
            <h4 class="text-md font-semibold text-gray-900">
              📅 Category Metrics Overview
            </h4>
            <div class="flex items-center space-x-4">
              <label class="text-sm font-medium text-gray-700">Year:</label>
              <select
                [(ngModel)]="selectedCategoryYear"
                (change)="onCategoryYearChange()"
                class="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option *ngFor="let year of availableYears" [value]="year">{{ year }}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Side-by-Side Layout Container -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div *ngFor="let type of yearlySideBySideTypes; trackBy: trackByTypeId"
               class="bg-white rounded-lg shadow-sm border border-gray-200">

            <!-- Header Section -->
            <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                    <span class="w-3 h-3 rounded-full mr-3"
                          [style.background-color]="type.graph_color || '#6B7280'"></span>
                    {{ type.name }}
                  </h3>
                  <p *ngIf="type.description" class="text-sm text-gray-600 mt-1">{{ type.description }}</p>
                </div>

                <!-- Action Buttons -->
                <div class="flex items-center space-x-2">
                  <button
                    (click)="onAddCategoryRecord(type.id)"
                    class="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
                    ➕ Add Record
                  </button>
                </div>
              </div>

              <!-- Categories Display -->
              <div class="flex flex-wrap gap-1 mt-3" *ngIf="type.categories && type.categories.length > 0">
                <span *ngFor="let category of type.categories"
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200">
                  🏷️ {{ category.name }}
                </span>
              </div>
            </div>

            <!-- Category Records Table -->
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {{ type.unit || 'Amount' }}
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">

                  <!-- Category Records for Selected Year -->
                  <tr *ngFor="let record of getCategoryRecordsForType(type.id, selectedCategoryYear)" class="hover:bg-gray-50">
                    <!-- Category Column -->
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <div class="w-2 h-2 rounded-full mr-3"
                             [style.background-color]="type.graph_color || '#6B7280'"></div>
                        <div>
                          <div class="text-sm font-medium text-gray-900">
                            {{ getCategoryName(record.category_id, type.categories) || 'Uncategorized' }}
                          </div>
                          <div class="text-xs text-gray-500">ID: {{ record.id }}</div>
                        </div>
                      </div>
                    </td>

                    <!-- Amount Column -->
                    <td class="px-6 py-4 whitespace-nowrap">
                      <input type="number"
                             [(ngModel)]="record.total"
                             (change)="onRecordUpdated(record)"
                             placeholder="0.00"
                             class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </td>

                    <!-- Notes Column -->
                    <td class="px-6 py-4">
                      <input type="text"
                             [(ngModel)]="record.notes"
                             (change)="onRecordUpdated(record)"
                             placeholder="Add notes..."
                             class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </td>

                    <!-- Actions Column -->
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button (click)="onRecordDeleted(record.id)"
                              class="text-red-600 hover:text-red-900 transition-colors">
                        🗑️
                      </button>
                    </td>
                  </tr>

                  <!-- Empty State Row -->
                  <tr *ngIf="getCategoryRecordsForType(type.id, selectedCategoryYear).length === 0">
                    <td colspan="4" class="px-6 py-12 text-center">
                      <div class="text-gray-400 text-4xl mb-4">🏷️</div>
                      <h3 class="text-sm font-medium text-gray-900 mb-2">No Categories for {{ selectedCategoryYear }}</h3>
                      <p class="text-sm text-gray-500 mb-4">Start by adding category records for {{ type.name.toLowerCase() }}.</p>
                      <button (click)="onAddCategoryRecord(type.id)"
                              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                        ➕ Add First Category
                      </button>
                    </td>
                  </tr>

                  <!-- Total Row (if there are records) -->
                  <tr *ngIf="getCategoryRecordsForType(type.id, selectedCategoryYear).length > 0"
                      class="bg-blue-50 font-semibold">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      TOTAL
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-lg font-bold text-blue-900">
                      {{ (calculateCategoryTotal(type.id, selectedCategoryYear) || 0) | number:'1.0-2' }}
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-700">
                      Sum of all categories
                    </td>
                    <td class="px-6 py-4"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Category Group Summary -->
        <div *ngIf="yearlySideBySideTypes.length > 0" class="mt-8 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg p-6 border border-gray-200">
          <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            📊 Financial Summary for {{ selectedCategoryYear }}
          </h4>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <!-- Revenue -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-blue-800">Total Revenue</p>
                  <p class="text-2xl font-bold text-blue-900">
                    {{ (getCategoryGroupTotals(selectedCategoryYear).revenue || 0) | number:'1.0-2' }}
                  </p>
                </div>
                <div class="text-blue-600 text-2xl">💵</div>
              </div>
            </div>

            <!-- Profits -->
            <div class="bg-green-50 border border-green-200 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-green-800">Total Profits</p>
                  <p class="text-2xl font-bold text-green-900">
                    {{ (getCategoryGroupTotals(selectedCategoryYear).profits || 0) | number:'1.0-2' }}
                  </p>
                </div>
                <div class="text-green-600 text-2xl">📈</div>
              </div>
            </div>

            <!-- Assets -->
            <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-emerald-800">Total Assets</p>
                  <p class="text-2xl font-bold text-emerald-900">
                    {{ (getCategoryGroupTotals(selectedCategoryYear).assets || 0) | number:'1.0-2' }}
                  </p>
                </div>
                <div class="text-emerald-600 text-2xl">💰</div>
              </div>
            </div>

            <!-- Liabilities -->
            <div class="bg-red-50 border border-red-200 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-red-800">Total Liabilities</p>
                  <p class="text-2xl font-bold text-red-900">
                    {{ (getCategoryGroupTotals(selectedCategoryYear).liabilities || 0) | number:'1.0-2' }}
                  </p>
                </div>
                <div class="text-red-600 text-2xl">💳</div>
              </div>
            </div>

            <!-- Direct Costs -->
            <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-orange-800">Direct Costs</p>
                  <p class="text-2xl font-bold text-orange-900">
                    {{ (getCategoryGroupTotals(selectedCategoryYear).directCosts || 0) | number:'1.0-2' }}
                  </p>
                </div>
                <div class="text-orange-600 text-2xl">🔧</div>
              </div>
            </div>

            <!-- Operational Costs -->
            <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-purple-800">Operational Costs</p>
                  <p class="text-2xl font-bold text-purple-900">
                    {{ (getCategoryGroupTotals(selectedCategoryYear).operationalCosts || 0) | number:'1.0-2' }}
                  </p>
                </div>
                <div class="text-purple-600 text-2xl">⚙️</div>
              </div>
            </div>
          </div>

          <!-- Key Financial Ratios -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <!-- Net Position -->
            <div class="bg-white rounded-lg p-4 border border-gray-200">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-600">Net Position</p>
                  <p class="text-xs text-gray-500">Assets - Liabilities</p>
                  <p class="text-xl font-bold mt-1"
                     [class.text-green-600]="getNetPosition(selectedCategoryYear) >= 0"
                     [class.text-red-600]="getNetPosition(selectedCategoryYear) < 0">
                    {{ (getNetPosition(selectedCategoryYear) || 0) | number:'1.0-2' }}
                  </p>
                </div>
                <div class="text-2xl">
                  <span *ngIf="getNetPosition(selectedCategoryYear) >= 0">📈</span>
                  <span *ngIf="getNetPosition(selectedCategoryYear) < 0">📉</span>
                </div>
              </div>
            </div>

            <!-- Total Costs -->
            <div class="bg-white rounded-lg p-4 border border-gray-200">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-600">Total Costs</p>
                  <p class="text-xs text-gray-500">Direct + Operational</p>
                  <p class="text-xl font-bold text-gray-900 mt-1">
                    {{ (getTotalCosts(selectedCategoryYear) || 0) | number:'1.0-2' }}
                  </p>
                </div>
                <div class="text-gray-600 text-2xl">💸</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && !error && quarterlyTypes.length === 0 && yearlyTypes.length === 0 && yearlySideBySideTypes.length === 0"
           class="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div class="text-gray-400 text-6xl mb-4">📈</div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No Metrics Configured</h3>
        <p class="text-gray-500">This group doesn't have any metric types configured yet.</p>
      </div>
    </div>

    <!-- Category Selection Modal -->
    <div *ngIf="showCategoryModal"
         class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div class="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">
            Add Category to {{ selectedMetricTypeName }}
          </h3>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Select Category</label>
            <select [(ngModel)]="selectedCategoryForModal"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="">Choose a category...</option>
              <option *ngFor="let category of availableCategoriesForModal"
                      [value]="category.id">
                {{ category.name }} - {{ category.description }}
              </option>
            </select>
          </div>

          <div class="flex justify-end space-x-3">
            <button (click)="closeCategoryModal()"
                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
              Cancel
            </button>
            <button (click)="confirmAddCategory()"
                    [disabled]="!selectedCategoryForModal"
                    class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-md transition-colors">
              Add Category
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class GroupMetricsContainerComponent implements OnInit, OnChanges {
  @Input() company!: ICompany;
  @Input() clientId: number = 0;
  @Input() programId: number = 0;
  @Input() cohortId: number = 0;
  @Input() filterGroupId: number | null = null;

  group: IMetricGroup | null = null;
  quarterlyTypes: IMetricType[] = [];
  yearlyTypes: IMetricType[] = [];
  yearlySideBySideTypes: IMetricType[] = [];
  allRecords: IMetricRecord[] = [];
  loading = false;
  error: string | null = null;

  // Category-based metrics properties
  selectedCategoryYear: number = new Date().getFullYear();
  availableYears: number[] = [];

  // Modal properties
  showCategoryModal = false;
  selectedMetricTypeForModal: number | null = null;
  selectedMetricTypeName = '';
  selectedCategoryForModal: number | null = null;
  availableCategoriesForModal: any[] = [];

  private cachedHierarchy: MetricsHierarchy | null = null;

  constructor(private metricsService: MetricsService) {}

  ngOnInit(): void {
    this.loadMetrics();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // When filterGroupId changes, reprocess cached data if available, otherwise reload
    if (changes['filterGroupId'] && !changes['filterGroupId'].firstChange) {
      if (this.cachedHierarchy) {
        this.processMetricsData(this.cachedHierarchy);
      } else {
        this.loadMetrics();
      }
    }
  }

  get totalRecords(): number {
    return this.allRecords.length;
  }

  trackByTypeId(index: number, type: IMetricType): number {
    return type.id;
  }

  loadMetrics(): void {
    this.loading = true;
    this.error = null;

    this.metricsService.fullMetrics(this.clientId, this.company.id, this.programId, this.cohortId)
      .subscribe({
        next: (hierarchy: MetricsHierarchy) => {
          this.cachedHierarchy = hierarchy; // Cache the full hierarchy
          this.processMetricsData(hierarchy);
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading metrics:', err);
          this.error = 'Failed to load metrics data. Please try again.';
          this.loading = false;
        }
      });
  }

  private processMetricsData(hierarchy: MetricsHierarchy): void {
    // Find the specific group or use the first one
    this.group = this.filterGroupId
      ? hierarchy.find(g => g.id === this.filterGroupId) || null
      : hierarchy[0] || null;

    if (!this.group || !this.group.types) {
      this.quarterlyTypes = [];
      this.yearlyTypes = [];
      this.yearlySideBySideTypes = [];
      this.allRecords = [];
      return;
    }

    // Separate quarterly, yearly, and yearly side-by-side types
    const typeGroups = MetricsUtils.groupByPeriodType(this.group.types);
    this.quarterlyTypes = typeGroups.quarterly;
    this.yearlyTypes = typeGroups.yearly;
    this.yearlySideBySideTypes = typeGroups.yearlySideBySide;

    // Initialize available years from records
    this.initializeAvailableYears();

    // Collect all records and ensure proper type conversion
    this.allRecords = this.group.types
      .flatMap(type => type.records || [])
      .map(record => ({
        ...record,
        total: record.total ? parseFloat(String(record.total)) : null,
        q1: record.q1 ? parseFloat(String(record.q1)) : null,
        q2: record.q2 ? parseFloat(String(record.q2)) : null,
        q3: record.q3 ? parseFloat(String(record.q3)) : null,
        q4: record.q4 ? parseFloat(String(record.q4)) : null,
        margin_pct: record.margin_pct ? parseFloat(String(record.margin_pct)) : null
      }));
  }

  getRecordsForType(typeId: number): IMetricRecord[] {
    return this.allRecords.filter(record => record.metric_type_id === typeId);
  }

  onRecordUpdated(record: IMetricRecord): void {
    console.log('Updating record:', record);

    // Ensure numeric values are properly converted
    const updatePayload = {
      id: record.id,
      q1: record.q1 ? parseFloat(String(record.q1)) : null,
      q2: record.q2 ? parseFloat(String(record.q2)) : null,
      q3: record.q3 ? parseFloat(String(record.q3)) : null,
      q4: record.q4 ? parseFloat(String(record.q4)) : null,
      total: record.total ? parseFloat(String(record.total)) : null,
      margin_pct: record.margin_pct ? parseFloat(String(record.margin_pct)) : null,
      notes: record.notes || '',
      category_id: record.category_id || null
    };

    this.metricsService.updateRecord(updatePayload).subscribe({
      next: (updatedRecord) => {
        console.log('Record updated successfully:', updatedRecord);
        // Update local record with proper type conversion
        const index = this.allRecords.findIndex(r => r.id === record.id);
        if (index !== -1) {
          // Ensure the updated record has proper number types
          this.allRecords[index] = {
            ...this.allRecords[index],
            ...updatedRecord,
            total: updatedRecord.total ? parseFloat(String(updatedRecord.total)) : null,
            q1: updatedRecord.q1 ? parseFloat(String(updatedRecord.q1)) : null,
            q2: updatedRecord.q2 ? parseFloat(String(updatedRecord.q2)) : null,
            q3: updatedRecord.q3 ? parseFloat(String(updatedRecord.q3)) : null,
            q4: updatedRecord.q4 ? parseFloat(String(updatedRecord.q4)) : null,
            margin_pct: updatedRecord.margin_pct ? parseFloat(String(updatedRecord.margin_pct)) : null
          };
        }
      },
      error: (err) => {
        console.error('Error updating record:', err);
        // TODO: Show user-friendly error message
      }
    });
  }

  onRecordDeleted(recordId: number): void {
    console.log('Deleting record:', recordId);
    this.metricsService.deleteRecord(recordId).subscribe({
      next: () => {
        console.log('Record deleted successfully');
        // Remove from local array
        this.allRecords = this.allRecords.filter(r => r.id !== recordId);
      },
      error: (err) => {
        console.error('Error deleting record:', err);
        // TODO: Show user-friendly error message
      }
    });
  }

  onAddYearRequested(event: { metricTypeId: number; year: number }): void {
    console.log('🔄 Adding new year record:', event);

    const createPayload = {
      client_id: this.clientId,
      company_id: this.company.id,
      program_id: this.programId,
      cohort_id: this.cohortId,
      metric_type_id: event.metricTypeId,
      year: event.year,
      q1: null,
      q2: null,
      q3: null,
      q4: null,
      total: null,
      margin_pct: null,
      unit: 'ZAR' // Default unit
    };

    console.log('📤 Sending payload to API:', createPayload);

    this.metricsService.addRecord(createPayload).subscribe({
      next: (newRecord) => {
        console.log('✅ API returned record:', newRecord);

        // Ensure the year is properly set from our request with proper type conversion
        const recordToAdd: IMetricRecord = {
          id: newRecord.id || Date.now(), // Fallback ID if not provided
          client_id: this.clientId,
          company_id: this.company.id,
          program_id: this.programId,
          cohort_id: this.cohortId,
          metric_type_id: event.metricTypeId,
          category_id: newRecord.category_id || null,
          year: event.year, // Force the year from our request
          q1: newRecord.q1 ? parseFloat(String(newRecord.q1)) : null,
          q2: newRecord.q2 ? parseFloat(String(newRecord.q2)) : null,
          q3: newRecord.q3 ? parseFloat(String(newRecord.q3)) : null,
          q4: newRecord.q4 ? parseFloat(String(newRecord.q4)) : null,
          total: newRecord.total ? parseFloat(String(newRecord.total)) : null,
          margin_pct: newRecord.margin_pct ? parseFloat(String(newRecord.margin_pct)) : null,
          notes: newRecord.notes || '',
          unit: newRecord.unit || 'ZAR',
          created_at: newRecord.created_at,
          updated_at: newRecord.updated_at
        };

        console.log('🎯 Final record to add to UI:', recordToAdd);

        // Add to local array
        this.allRecords.push(recordToAdd);

        console.log('📊 Updated records array length:', this.allRecords.length);
      },
      error: (err) => {
        console.error('❌ Error creating record:', err);
        alert('Failed to add new year. Please try again.');
      }
    });
  }

  /**
   * Initialize available years for category-based metrics
   */
  initializeAvailableYears(): void {
    const currentYear = new Date().getFullYear();
    const recordYears = [...new Set(this.allRecords.map(r => r.year))];

    // Combine current year, next year, and years from records
    const allYears = new Set([currentYear, currentYear + 1, ...recordYears]);
    this.availableYears = Array.from(allYears).sort((a, b) => b - a);

    // Set selected year to current if available
    if (!this.selectedCategoryYear || !this.availableYears.includes(this.selectedCategoryYear)) {
      this.selectedCategoryYear = this.availableYears.includes(currentYear)
        ? currentYear
        : this.availableYears[0] || currentYear;
    }
  }

  /**
   * Handle year change for category-based metrics
   */
  onCategoryYearChange(): void {
    // Ensure selectedCategoryYear is a number (select elements return strings)
    this.selectedCategoryYear = Number(this.selectedCategoryYear);
    console.log('Category year changed to:', this.selectedCategoryYear, typeof this.selectedCategoryYear);

    // Force change detection and refresh the UI by triggering data processing
    if (this.cachedHierarchy) {
      this.processMetricsData(this.cachedHierarchy);
    }

    // Log available data for debugging
    const recordsForYear = this.allRecords.filter(r => r.year === this.selectedCategoryYear);
    console.log(`Records found for year ${this.selectedCategoryYear}:`, recordsForYear.length);

    // Log all years in records for comparison
    const allYears = [...new Set(this.allRecords.map(r => r.year))].sort();
    console.log('All years in records:', allYears);
  }

  /**
   * Get category records for a specific type and year
   */
  getCategoryRecordsForType(typeId: number, year: number): IMetricRecord[] {
    const filtered = this.allRecords.filter(record =>
      record.metric_type_id === typeId && record.year === year
    );
    console.log(`getCategoryRecordsForType(${typeId}, ${year}): found ${filtered.length} records`);
    return filtered;
  }

  /**
   * Get category name by ID
   */
  getCategoryName(categoryId: number | null | undefined, categories: any[] | undefined): string {
    if (!categoryId || !categories) return 'Uncategorized';
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Uncategorized';
  }

  /**
   * Handle adding a new category record with category selection modal
   */
  onAddCategoryRecord(metricTypeId: number): void {
    // Find the metric type to get its categories
    const metricType = [...this.quarterlyTypes, ...this.yearlyTypes, ...this.yearlySideBySideTypes]
      .find(type => type.id === metricTypeId);

    if (!metricType || !metricType.categories || metricType.categories.length === 0) {
      alert('This metric type has no categories configured. Please configure categories first.');
      return;
    }

    // Set up modal data
    this.selectedMetricTypeForModal = metricTypeId;
    this.selectedMetricTypeName = metricType.name;
    this.availableCategoriesForModal = metricType.categories;
    this.selectedCategoryForModal = null;
    this.showCategoryModal = true;
  }

  /**
   * Close the category selection modal
   */
  closeCategoryModal(): void {
    this.showCategoryModal = false;
    this.selectedMetricTypeForModal = null;
    this.selectedMetricTypeName = '';
    this.selectedCategoryForModal = null;
    this.availableCategoriesForModal = [];
  }

  /**
   * Confirm and create the category record
   */
  confirmAddCategory(): void {
    if (!this.selectedMetricTypeForModal || !this.selectedCategoryForModal) {
      return;
    }

    // Convert to number since select element returns string
    const categoryId = Number(this.selectedCategoryForModal);
    const category = this.availableCategoriesForModal.find(c => c.id === categoryId);
    if (!category) {
      console.error('Category not found. Available:', this.availableCategoriesForModal, 'Selected:', this.selectedCategoryForModal);
      alert('Invalid category selected.');
      return;
    }

    // Create the record with category
    const createPayload = {
      client_id: this.clientId,
      company_id: this.company.id,
      program_id: this.programId,
      cohort_id: this.cohortId,
      metric_type_id: this.selectedMetricTypeForModal,
      category_id: categoryId,
      year: this.selectedCategoryYear,
      total: 0, // Start with 0 for category-based metrics
      notes: '',
      unit: 'ZAR'
    };

    console.log('🏷️ Creating category record:', createPayload);

    this.metricsService.addRecord(createPayload).subscribe({
      next: (newRecord) => {
        console.log('✅ Category record created:', newRecord);

        // Add to local array with proper type conversion
        const recordToAdd: IMetricRecord = {
          id: newRecord.id,
          client_id: this.clientId,
          company_id: this.company.id,
          program_id: this.programId,
          cohort_id: this.cohortId,
          metric_type_id: this.selectedMetricTypeForModal!,
          category_id: categoryId,
          year: this.selectedCategoryYear,
          q1: null,
          q2: null,
          q3: null,
          q4: null,
          total: newRecord.total ? parseFloat(String(newRecord.total)) : 0,
          margin_pct: newRecord.margin_pct ? parseFloat(String(newRecord.margin_pct)) : null,
          notes: newRecord.notes || '',
          unit: newRecord.unit || 'ZAR',
          created_at: newRecord.created_at,
          updated_at: newRecord.updated_at
        };

        this.allRecords.push(recordToAdd);
        this.closeCategoryModal();
      },
      error: (err) => {
        console.error('❌ Error creating category record:', err);
        alert('Failed to add category record. Please try again.');
      }
    });
  }

  /**
   * Calculate total for all categories in a metric type for a given year
   */
  calculateCategoryTotal(typeId: number, year: number): number {
    const records = this.getCategoryRecordsForType(typeId, year);
    console.log(`Calculating total for typeId ${typeId}, year ${year}:`, records);

    const result = records.reduce((sum, record) => {
      const rawTotal = record.total;
      const total = parseFloat(String(rawTotal || 0));
      console.log(`Record ${record.id}: rawTotal=${rawTotal}, parsed=${total}, isNaN=${isNaN(total)}`);
      return sum + (isNaN(total) ? 0 : total);
    }, 0);

    console.log(`Final calculated total: ${result}`);
    return result;
  }

  /**
   * Get category group totals based on dynamic metric classification from actual data
   */
  getCategoryGroupTotals(year: number): { assets: number; liabilities: number; directCosts: number; operationalCosts: number; revenue: number; profits: number; other: number } {
    const totals = {
      assets: 0,
      liabilities: 0,
      directCosts: 0,
      operationalCosts: 0,
      revenue: 0,
      profits: 0,
      other: 0
    };

    // Process all metric types from all arrays
    const allTypes = [...this.quarterlyTypes, ...this.yearlyTypes, ...this.yearlySideBySideTypes];

    allTypes.forEach(type => {
      const yearRecords = this.getCategoryRecordsForType(type.id, year);

      // Classify by type code and name - dynamic based on actual data structure
      const typeCode = type.code?.toUpperCase() || '';
      const typeName = type.name?.toLowerCase() || '';

      yearRecords.forEach(record => {
        const value = parseFloat(String(record.total || 0));

        // Dynamic classification based on actual metric codes and names from your payload
        if (typeCode.includes('ASSETS') || typeName.includes('total assets')) {
          totals.assets += value;
        }
        else if (typeCode.includes('LIABILITIES') || typeName.includes('total liabilities')) {
          totals.liabilities += value;
        }
        else if (typeCode === 'DIRECT_COSTS' || typeName.includes('direct costs')) {
          totals.directCosts += value;
        }
        else if (typeCode === 'OPERATING_COSTS' || typeCode === 'OPERATIONAL_COSTS' ||
                 typeName.includes('operational costs')) {
          totals.operationalCosts += value;
        }
        else if (typeCode.includes('REVENUE') || typeName.includes('revenue')) {
          totals.revenue += value;
        }
        else if (typeCode.includes('PROFIT') || typeName.includes('profit')) {
          totals.profits += value;
        }
        else {
          totals.other += value;
        }
      });
    });

    return totals;
  }

  /**
   * Calculate net position (Assets - Liabilities)
   */
  getNetPosition(year: number): number {
    const totals = this.getCategoryGroupTotals(year);
    return totals.assets - totals.liabilities;
  }

  /**
   * Calculate total costs (Direct + Operational)
   */
  getTotalCosts(year: number): number {
    const totals = this.getCategoryGroupTotals(year);
    return totals.directCosts + totals.operationalCosts;
  }
}
