// src/app/components/dynamic-company-detail/company-tabs/company-tabs.component.ts
import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabConfig, TabGroup } from '../../../../services/tab-configuration.service';

@Component({
  selector: 'app-company-tabs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Tabs Navigation -->
    <div class="bg-white border-b border-gray-200 mb-6" *ngIf="tabs().length > 0">

      <!-- Tab List -->
      <nav class="flex space-x-8 px-6" aria-label="Tabs">
        <button
          *ngFor="let tab of visibleTabs()"
          type="button"
          class="py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200"
          [class]="getTabClasses(tab)"
          (click)="selectTab(tab.id)"
          [disabled]="!tab.enabled">

          <div class="flex items-center gap-2">
            <i [class]="tab.icon" *ngIf="tab.icon"></i>
            <span>{{ tab.title }}</span>
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
              *ngIf="tab.type === 'dynamic'">
              Form
            </span>
          </div>
        </button>
      </nav>

      <!-- Tab Groups Toggle (if needed) -->
      <div class="px-6 py-2 bg-gray-50 border-b border-gray-200" *ngIf="hasTabGroups()">
        <div class="flex items-center gap-4">
          <span class="text-sm font-medium text-gray-700">Groups:</span>
          <div class="flex gap-2">
            <button
              *ngFor="let group of tabGroups()"
              type="button"
              class="px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200"
              [class]="getGroupClasses(group)"
              (click)="toggleGroup(group.name)">
              <i [class]="group.icon" *ngIf="group.icon"></i>
              {{ group.name }} ({{ group.tabs.length }})
            </button>
          </div>
        </div>
      </div>

    </div>

    <!-- Tab Content Area -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200" *ngIf="activeTab()">

      <!-- Tab Header -->
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <i [class]="activeTab()?.icon" class="text-blue-600" *ngIf="activeTab()?.icon"></i>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">{{ activeTab()?.title }}</h3>
              <p class="text-sm text-gray-600" *ngIf="activeTab()?.description">
                {{ activeTab()?.description }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span
              class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
              [class]="getTypeClasses(activeTab()?.type)">
              {{ getTypeLabel(activeTab()?.type) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Tab Content -->
      <div class="p-6">
        <div [ngSwitch]="activeTab()?.type">

          <!-- Static Tab Content -->
          <div *ngSwitchCase="'static'" class="space-y-4">
            <div *ngIf="activeTab()?.id === 'overview'">
              <!-- Overview content placeholder -->
              <div class="text-center py-8">
                <i class="fas fa-home text-4xl text-gray-300 mb-4"></i>
                <h4 class="text-lg font-medium text-gray-900 mb-2">Company Overview</h4>
                <p class="text-gray-600">Company overview content will be rendered here.</p>
              </div>
            </div>

            <!-- Other static tabs -->
            <div *ngIf="activeTab()?.id !== 'overview'">
              <div class="text-center py-8">
                <i [class]="activeTab()?.icon" class="text-4xl text-gray-300 mb-4"></i>
                <h4 class="text-lg font-medium text-gray-900 mb-2">{{ activeTab()?.title }}</h4>
                <p class="text-gray-600">{{ activeTab()?.description || 'Content will be rendered here.' }}</p>
              </div>
            </div>
          </div>

          <!-- Dynamic Tab Content (Forms) -->
          <div *ngSwitchCase="'dynamic'" class="space-y-4">
            <div *ngIf="activeTab()?.form; else dynamicPlaceholder">
              <!-- Form content placeholder -->
              <div class="text-center py-8">
                <i class="fas fa-file-alt text-4xl text-blue-300 mb-4"></i>
                <h4 class="text-lg font-medium text-gray-900 mb-2">{{ activeTab()?.form?.title }}</h4>
                <p class="text-gray-600 mb-4">
                  Form ID: {{ activeTab()?.form?.id }} |
                  Key: {{ activeTab()?.form?.form_key }} |
                  Status: {{ activeTab()?.form?.status }}
                </p>
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p class="text-sm text-blue-800">
                    🚧 Form rendering component will be implemented here
                  </p>
                </div>
              </div>
            </div>

            <ng-template #dynamicPlaceholder>
              <div class="text-center py-8">
                <i class="fas fa-exclamation-triangle text-4xl text-yellow-300 mb-4"></i>
                <h4 class="text-lg font-medium text-gray-900 mb-2">Form Not Found</h4>
                <p class="text-gray-600">The form data for this tab could not be loaded.</p>
              </div>
            </ng-template>
          </div>

          <!-- Hybrid Tab Content -->
          <div *ngSwitchCase="'hybrid'" class="space-y-4">
            <div class="text-center py-8">
              <i class="fas fa-layer-group text-4xl text-purple-300 mb-4"></i>
              <h4 class="text-lg font-medium text-gray-900 mb-2">{{ activeTab()?.title }}</h4>
              <p class="text-gray-600">Hybrid content will be rendered here.</p>
            </div>
          </div>

          <!-- Default/Unknown -->
          <div *ngSwitchDefault class="text-center py-8">
            <i class="fas fa-question-circle text-4xl text-gray-300 mb-4"></i>
            <h4 class="text-lg font-medium text-gray-900 mb-2">Unknown Tab Type</h4>
            <p class="text-gray-600">{{ activeTab()?.type }} tabs are not yet supported.</p>
          </div>

        </div>
      </div>

    </div>

    <!-- Empty State -->
    <div class="text-center py-12" *ngIf="tabs().length === 0">
      <i class="fas fa-folder-open text-6xl text-gray-300 mb-4"></i>
      <h3 class="text-lg font-medium text-gray-900 mb-2">No Tabs Available</h3>
      <p class="text-gray-600">No tabs are currently available for this company.</p>
    </div>
  `
})
export class CompanyTabsComponent {
  @Input() tabs = signal<TabConfig[]>([]);
  @Input() tabGroups = signal<TabGroup[]>([]);
  @Input() activeTabId = signal<string>('overview');

  @Output() tabSelected = new EventEmitter<string>();
  @Output() groupToggled = new EventEmitter<string>();

  // Computed properties
  visibleTabs = () => this.tabs().filter(tab => tab.visible);
  activeTab = () => this.tabs().find(tab => tab.id === this.activeTabId());
  hasTabGroups = () => this.tabGroups().length > 1;

  selectTab(tabId: string) {
    this.tabSelected.emit(tabId);
  }

  toggleGroup(groupName: string) {
    this.groupToggled.emit(groupName);
  }

  getTabClasses(tab: TabConfig): string {
    const isActive = tab.id === this.activeTabId();
    const baseClasses = 'whitespace-nowrap';

    if (!tab.enabled) {
      return `${baseClasses} border-transparent text-gray-400 cursor-not-allowed`;
    }

    if (isActive) {
      return `${baseClasses} border-blue-500 text-blue-600`;
    }

    return `${baseClasses} border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300`;
  }

  getGroupClasses(group: TabGroup): string {
    // For now, all groups are visible. Add group state management if needed
    return 'bg-gray-200 text-gray-800 hover:bg-gray-300';
  }

  getTypeClasses(type?: string): string {
    switch (type) {
      case 'static':
        return 'bg-blue-100 text-blue-800';
      case 'dynamic':
        return 'bg-green-100 text-green-800';
      case 'hybrid':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getTypeLabel(type?: string): string {
    switch (type) {
      case 'static':
        return 'Static';
      case 'dynamic':
        return 'Form';
      case 'hybrid':
        return 'Hybrid';
      default:
        return 'Unknown';
    }
  }
}
