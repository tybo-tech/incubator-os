import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICompany } from '../../../../../../models/simple.schema';
import { IMetricGroup, IMetricType, IMetricRecord, MetricsHierarchy } from '../../../../../../models/metrics.model';
import { MetricsService } from '../../../../../../services/metrics.service';
import { QuarterlyMetricsTableComponent } from '../quarterly-metrics-table/quarterly-metrics-table.component';
import { YearlyMetricsTableComponent } from '../yearly-metrics-table/yearly-metrics-table.component';
import { MetricsUtils } from '../../../../../../utils/metrics.utils';

@Component({
  selector: 'app-group-metrics-container',
  standalone: true,
  imports: [CommonModule, QuarterlyMetricsTableComponent, YearlyMetricsTableComponent],
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

      <!-- Empty State -->
      <div *ngIf="!loading && !error && quarterlyTypes.length === 0 && yearlyTypes.length === 0"
           class="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div class="text-gray-400 text-6xl mb-4">📈</div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No Metrics Configured</h3>
        <p class="text-gray-500">This group doesn't have any metric types configured yet.</p>
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
  allRecords: IMetricRecord[] = [];
  loading = false;
  error: string | null = null;

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
      this.allRecords = [];
      return;
    }

    // Separate quarterly and yearly types
    const typeGroups = MetricsUtils.groupByPeriodType(this.group.types);
    this.quarterlyTypes = typeGroups.quarterly;
    this.yearlyTypes = typeGroups.yearly;

    // Collect all records
    this.allRecords = this.group.types
      .flatMap(type => type.records || []);
  }

  getRecordsForType(typeId: number): IMetricRecord[] {
    return this.allRecords.filter(record => record.metric_type_id === typeId);
  }

  onRecordUpdated(record: IMetricRecord): void {
    console.log('Updating record:', record);
    // TODO: Call update API
    this.metricsService.updateRecord({
      id: record.id,
      q1: record.q1,
      q2: record.q2,
      q3: record.q3,
      q4: record.q4,
      total: record.total,
      margin_pct: record.margin_pct
    }).subscribe({
      next: (updatedRecord) => {
        console.log('Record updated successfully:', updatedRecord);
        // Update local record
        const index = this.allRecords.findIndex(r => r.id === record.id);
        if (index !== -1) {
          this.allRecords[index] = { ...this.allRecords[index], ...updatedRecord };
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

        // Ensure the year is properly set from our request (in case API doesn't return it properly)
        const recordToAdd: IMetricRecord = {
          id: newRecord.id || Date.now(), // Fallback ID if not provided
          client_id: this.clientId,
          company_id: this.company.id,
          program_id: this.programId,
          cohort_id: this.cohortId,
          metric_type_id: event.metricTypeId,
          year: event.year, // Force the year from our request
          q1: newRecord.q1 || null,
          q2: newRecord.q2 || null,
          q3: newRecord.q3 || null,
          q4: newRecord.q4 || null,
          total: newRecord.total || null,
          margin_pct: newRecord.margin_pct || null,
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
}
