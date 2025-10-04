import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface IndustryData {
  industry: string;
  total: number;
  [key: string]: any; // Allow for additional properties
}

@Component({
  selector: 'app-top-industries',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Modern Top Industries Component -->
    <div class="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
      <div class="p-6">
        <!-- Header -->
        <div class="mb-6">
          <h3 class="text-xl font-semibold text-gray-800 mb-2">
            {{ title }}
          </h3>
          <div class="w-12 h-1 bg-gradient-to-r from-green-500 to-blue-600 rounded-full"></div>
          <p *ngIf="subtitle" class="text-gray-600 text-sm mt-2">
            {{ subtitle }}
          </p>
        </div>

        <!-- Loading State -->
        <div *ngIf="!industries || industries.length === 0" class="flex items-center justify-center py-8">
          <div class="text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
            <p class="text-sm text-gray-500">Loading industries...</p>
          </div>
        </div>

        <!-- Industries List -->
        <div *ngIf="processedIndustries().length > 0" class="space-y-3">
          <div
            *ngFor="let industry of processedIndustries(); let i = index"
            class="group flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer"
            (click)="onIndustryClick(industry)"
          >
            <!-- Industry Info -->
            <div class="flex items-center flex-1">
              <!-- Rank Badge -->
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md"
                [style.background-color]="industry.color"
              >
                {{ i + 1 }}
              </div>

              <!-- Industry Details -->
              <div class="ml-4 flex-1">
                <span class="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors duration-200">
                  {{ industry.name }}
                </span>
                <div *ngIf="industry.percentage" class="text-xs text-gray-500 mt-1">
                  {{ industry.percentage }}% of total
                </div>
              </div>
            </div>

            <!-- Statistics -->
            <div class="text-right ml-4">
              <div class="text-lg font-bold text-gray-900 group-hover:text-blue-700 transition-colors duration-200">
                {{ industry.count }}
              </div>
              <div class="text-xs text-gray-500 capitalize">
                {{ valueLabel }}
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="ml-4 w-16">
              <div class="bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  class="h-full transition-all duration-500 rounded-full"
                  [style.width.%]="industry.percentage"
                  [style.background-color]="industry.color">
                </div>
              </div>
            </div>

            <!-- Arrow Icon -->
            <div class="ml-3 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
              <svg class="w-5 h-5 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </div>
          </div>
        </div>

        <!-- Summary Footer -->
        <div *ngIf="processedIndustries().length > 0 && showSummary"
             class="mt-6 pt-4 border-t border-gray-200">
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-600">
              Showing top {{ Math.min(maxItems, processedIndustries().length) }} of {{ totalIndustries() }}
            </span>
            <span class="font-medium text-gray-900">
              Total {{ valueLabel }}: {{ totalCount() }}
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class TopIndustriesComponent {
  // Configuration inputs
  @Input() title = 'Top Industries';
  @Input() subtitle = '';
  @Input() valueLabel = 'companies';
  @Input() maxItems = 5;
  @Input() showSummary = true;
  @Input() colorPalette: string[] = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#8B5CF6', // Purple
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#EC4899', // Pink
    '#6B7280', // Gray
    '#14B8A6', // Teal
  ];

  // Data input - accepts any array with industry/total structure
  @Input() set industries(value: IndustryData[] | null) {
    this._industries.set(value || []);
  }

  get industries(): IndustryData[] | null {
    return this._industries();
  }

  // Internal state
  private _industries = signal<IndustryData[]>([]);

  // Computed properties for smart processing
  processedIndustries = computed(() => {
    const industries = this._industries();
    if (!industries?.length) return [];

    // Sort by total count (descending)
    const sorted = [...industries].sort((a, b) => b.total - a.total);

    // Take only the top items
    const topItems = sorted.slice(0, this.maxItems);

    // Calculate total for percentage calculations
    const total = industries.reduce((sum, item) => sum + item.total, 0);

    // Process each item with additional metadata
    return topItems.map((item, index) => ({
      name: item.industry,
      count: item['count'] || item.total,
      percentage: total > 0 ? Math.round((item.total / total) * 100) : 0,
      color: this.colorPalette[index % this.colorPalette.length],
      originalData: item
    }));
  });

  totalIndustries = computed(() => this._industries()?.length || 0);

  totalCount = computed(() =>
    this._industries()?.reduce((sum, item) => sum + item.total, 0) || 0
  );

  // Event handlers
  onIndustryClick(industry: any): void {
    console.log('Industry clicked:', industry);
    // You can emit events here if needed
    // this.industryClick.emit(industry);
  }

  // Utility method for accessing Math in template
  Math = Math;
}
