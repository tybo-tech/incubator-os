import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

// Base static tab identifiers
type StaticTabType =
  | 'overview'
  | 'assessment'
  | 'swot'
  | 'gps-targets'
  | 'strategy'
  | 'financial'
  | 'financial-v2'
  | 'purchases'
  | 'compliance'
  | 'documents'
  | 'tasks'
  | 'growth'
  | 'financial-targets'
  | 'hr-tracking'
  | 'esg'
  | 'sessions';

// Dynamic metric group tabs will use the pattern: metric-group-<id>
export type TabType = StaticTabType | `metric-group-${number}`;

export interface MetricGroupTabMeta { id: number; name: string; code?: string; }

@Component({
  selector: 'app-tabs-navigation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white border-b">
      <div class="max-w-7xl mx-auto px-6">
        <nav class="flex space-x-8">
          <button
            (click)="onTabChange('overview')"
            [class]="
              'py-4 px-1 border-b-2 font-medium text-sm ' +
              (activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')
            "
          >
            Overview
          </button>
          <button
            (click)="onTabChange('assessment')"
            [class]="
              'py-4 px-1 border-b-2 font-medium text-sm ' +
              (activeTab === 'assessment'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')
            "
          >
            Assessment
          </button>
          <button
            (click)="onTabChange('swot')"
            [class]="
              'py-4 px-1 border-b-2 font-medium text-sm ' +
              (activeTab === 'swot'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')
            "
          >
            SWOT Analysis
          </button>
          <button
            (click)="onTabChange('gps-targets')"
            [class]="
              'py-4 px-1 border-b-2 font-medium text-sm ' +
              (activeTab === 'gps-targets'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')
            "
          >
            🎯 GPS Targets
          </button>
          <!-- <button
            (click)="onTabChange('strategy')"
            [class]="
              'py-4 px-1 border-b-2 font-medium text-sm ' +
              (activeTab === 'strategy'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')
            "
          >
            Strategy
          </button> -->
          <button
            (click)="onTabChange('financial')"
            [class]="
              'py-4 px-1 border-b-2 font-medium text-sm ' +
              (activeTab === 'financial'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')
            "
          >
            Financials
          </button>
          <!-- Optional aggregate metrics tab (Financials V2) -->
          <button *ngIf="showAllMetricsTab"
            (click)="onTabChange('financial-v2')"
            [class]="
              'py-4 px-1 border-b-2 font-medium text-sm ' +
              (activeTab === 'financial-v2'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')
            "
            title="All metric groups"
          >
            ⭐ Metrics
          </button>
          <!-- Dynamic Metric Group Tabs -->
          <ng-container *ngFor="let g of metricGroupTabs">
            <button
              (click)="onTabChange(metricGroupTabId(g.id))"
              [class]="
                'py-4 px-1 border-b-2 font-medium text-sm ' +
                (activeTab === metricGroupTabId(g.id)
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')
              "
              [title]="g.code || g.name"
            >
              {{ g.name }}
            </button>
          </ng-container>
          <!-- <button
            (click)="onTabChange('purchases')"
            [class]="
              'py-4 px-1 border-b-2 font-medium text-sm ' +
              (activeTab === 'purchases'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')
            "
          >
            🛒 Purchases
          </button> -->
          <button
            (click)="onTabChange('compliance')"
            [class]="
              'py-4 px-1 border-b-2 font-medium text-sm ' +
              (activeTab === 'compliance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')
            "
          >
            Compliance
          </button>
          <!-- <button
            (click)="onTabChange('documents')"
            [class]="
              'py-4 px-1 border-b-2 font-medium text-sm ' +
              (activeTab === 'documents'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')
            "
          >
            Documents
          </button> -->
          <!-- <button
            (click)="onTabChange('tasks')"
            [class]="'py-4 px-1 border-b-2 font-medium text-sm ' + (activeTab === 'tasks' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')"
          >
            Tasks
          </button> -->
          <!-- <button
            (click)="onTabChange('growth')"
            [class]="'py-4 px-1 border-b-2 font-medium text-sm ' + (activeTab === 'growth' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')"
          >
            Growth Areas
          </button> -->
          <!-- <button
            (click)="onTabChange('financial-targets')"
            [class]="'py-4 px-1 border-b-2 font-medium text-sm ' + (activeTab === 'financial-targets' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')"
          >
            💰 Financial Targets
          </button> -->
          <button
            (click)="onTabChange('hr-tracking')"
            [class]="
              'py-4 px-1 border-b-2 font-medium text-sm ' +
              (activeTab === 'hr-tracking'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')
            "
          >
            👥 HR Tracking
          </button>
          <!-- <button
            (click)="onTabChange('esg')"
            [class]="'py-4 px-1 border-b-2 font-medium text-sm ' + (activeTab === 'esg' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')"
          >
            📄 ESG
          </button> -->
          <button
            (click)="onTabChange('sessions')"
            [class]="
              'py-4 px-1 border-b-2 font-medium text-sm ' +
              (activeTab === 'sessions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')
            "
          >
            💬 Sessions
          </button>
        </nav>
      </div>
    </div>
  `,
})
export class TabsNavigationComponent {
  @Input() activeTab: TabType = 'overview';
  @Input() metricGroupTabs: MetricGroupTabMeta[] = [];
  @Input() showAllMetricsTab = true; // allow parent to hide aggregate tab
  @Output() tabChange = new EventEmitter<TabType>();

  metricGroupTabId(id: number): `metric-group-${number}` { return `metric-group-${id}`; }

  onTabChange(tab: TabType): void { this.tabChange.emit(tab); }
}
