# 🚀 Company Detail Integration - Implementation Plan

## 📋 **DETAILED IMPLEMENTATION STRATEGY**

Based on my analysis of the current `CompanyDetailComponent` and tab architecture, here's the complete implementation plan for integrating our dynamic form system.

---

## 🏗️ **PHASE 1: FOUNDATION SERVICES**

### **1. Company Context Service**

```typescript
// src/services/company-context.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, shareReplay, switchMap } from 'rxjs/operators';

import { ICompany } from '../models/simple.schema';
import { ICategoryItem } from '../models/business.models';
import { CompanyFormIntegrationService, ICategoryItemWithSession, CompanyFormTab } from './company-form-integration.service';

export interface ContextItem {
  clientId: number;
  clientName: string;
  programId: number;
  programName: string;
  cohortId: number;
  cohortName: string;
}

export interface EnhancedCompanyContext {
  // Core company
  company: ICompany;
  
  // Navigation context
  categoryContext: ContextItem[];
  
  // Enrollment context
  currentEnrollment: ICategoryItemWithSession | null;
  allEnrollments: ICategoryItemWithSession[];
  
  // Tab configuration
  dynamicTabs: CompanyFormTab[];
  
  // State flags
  hasMultipleEnrollments: boolean;
  useHybridMode: boolean;
}

@Injectable({ providedIn: 'root' })
export class CompanyContextService {
  private companySubject = new BehaviorSubject<ICompany | null>(null);
  private contextSubject = new BehaviorSubject<ContextItem[]>([]);
  private currentEnrollmentSubject = new BehaviorSubject<ICategoryItemWithSession | null>(null);

  // Public observables
  company$ = this.companySubject.asObservable();
  context$ = this.contextSubject.asObservable();
  currentEnrollment$ = this.currentEnrollmentSubject.asObservable();

  // Enhanced context combining all data
  enhancedContext$: Observable<EnhancedCompanyContext | null> = combineLatest([
    this.company$,
    this.context$,
    this.currentEnrollment$
  ]).pipe(
    switchMap(([company, context, currentEnrollment]) => {
      if (!company) return [null];
      
      return this.formIntegrationService.getCompanyFormTabs(company.id).pipe(
        map(result => ({
          company,
          categoryContext: context,
          currentEnrollment,
          allEnrollments: result.enrollments,
          dynamicTabs: result.tabs,
          hasMultipleEnrollments: result.enrollments.length > 1,
          useHybridMode: result.tabs.length > 0
        }))
      );
    }),
    shareReplay(1)
  );

  constructor(
    private formIntegrationService: CompanyFormIntegrationService
  ) {}

  // Set company and load enrollments
  setCompany(company: ICompany): void {
    this.companySubject.next(company);
  }

  // Set navigation context (from query params)
  setContext(context: ContextItem[]): void {
    this.contextSubject.next(context);
  }

  // Switch enrollment context
  setCurrentEnrollment(enrollment: ICategoryItemWithSession | null): void {
    this.currentEnrollmentSubject.next(enrollment);
  }

  // Get current values
  getCurrentCompany(): ICompany | null {
    return this.companySubject.value;
  }

  getCurrentContext(): ContextItem[] {
    return this.contextSubject.value;
  }

  getCurrentEnrollment(): ICategoryItemWithSession | null {
    return this.currentEnrollmentSubject.value;
  }
}
```

---

### **2. Tab Configuration Service**

```typescript
// src/services/tab-configuration.service.ts
import { Injectable, Type } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

// Import existing tab components
import { OverviewTabComponent } from '../app/components/companies/company-detail/overview-tab/overview-tab.component';
import { DocumentsTabComponent } from '../app/components/companies/company-detail/documents-tab/documents-tab.component';
import { GrowthAreasTabComponent } from '../app/components/companies/company-detail/growth-areas-tab/growth-areas-tab.component';
import { TasksTabComponent } from '../app/components/companies/company-detail/tasks-tab/tasks-tab.component';

// Import form models
import { IForm } from '../models/form.models';
import { CompanyFormTab } from './company-form-integration.service';

export interface TabConfig {
  id: string;
  type: 'static' | 'dynamic' | 'hybrid';
  title: string;
  component?: Type<any>;
  form?: IForm;
  order: number;
  enabled: boolean;
  visible: boolean;
  icon?: string;
  color?: string;
  
  // Migration flags
  isLegacy?: boolean;
  canMigrate?: boolean;
  migrationTarget?: string;
}

export interface TabGroup {
  name: string;
  tabs: TabConfig[];
  order: number;
}

@Injectable({ providedIn: 'root' })
export class TabConfigurationService {

  private staticTabsConfig: TabConfig[] = [
    {
      id: 'overview',
      type: 'static',
      title: 'Overview',
      component: OverviewTabComponent,
      order: 1,
      enabled: true,
      visible: true,
      icon: 'home',
      color: 'blue'
    },
    {
      id: 'documents',
      type: 'static', 
      title: 'Documents',
      component: DocumentsTabComponent,
      order: 800,
      enabled: true,
      visible: true,
      icon: 'folder',
      color: 'gray'
    },
    {
      id: 'tasks',
      type: 'static',
      title: 'Tasks',
      component: TasksTabComponent,
      order: 900,
      enabled: true,
      visible: true,
      icon: 'check-square',
      color: 'purple'
    },
    {
      id: 'growth',
      type: 'static',
      title: 'Growth Areas',
      component: GrowthAreasTabComponent,
      order: 700,
      enabled: true,
      visible: true,
      icon: 'trending-up',
      color: 'green'
    }
  ];

  // Legacy tabs that will be migrated to dynamic forms
  private migratableTabsConfig: TabConfig[] = [
    {
      id: 'assessment',
      type: 'hybrid',
      title: 'Assessment',
      order: 100,
      enabled: true,
      visible: true,
      icon: 'clipboard-list',
      color: 'orange',
      isLegacy: true,
      canMigrate: true,
      migrationTarget: 'business_assessment_form'
    },
    {
      id: 'financial',
      type: 'hybrid',
      title: 'Financial',
      order: 200,
      enabled: true,
      visible: true,
      icon: 'chart-bar',
      color: 'green',
      isLegacy: true,
      canMigrate: true,
      migrationTarget: 'financial_checkin_form'
    },
    {
      id: 'swot',
      type: 'static',
      title: 'SWOT Analysis',
      order: 300,
      enabled: true,
      visible: true,
      icon: 'target',
      color: 'purple',
      isLegacy: true,
      canMigrate: true,
      migrationTarget: 'swot_analysis_form'
    }
  ];

  generateHybridTabConfig(
    companyId: number,
    dynamicTabs: CompanyFormTab[],
    enrollmentContext?: any
  ): Observable<TabConfig[]> {
    
    // Convert dynamic tabs to tab configs
    const dynamicTabConfigs = dynamicTabs.map(tab => ({
      id: `form-${tab.form.id}`,
      type: 'dynamic' as const,
      title: tab.form.title,
      form: tab.form,
      order: tab.form.order || 500,
      enabled: tab.is_active || tab.can_edit,
      visible: true,
      icon: tab.form.icon || 'file-text',
      color: tab.form.color || 'blue'
    }));

    // Combine static, migratable, and dynamic tabs
    const allTabs = [
      ...this.staticTabsConfig,
      ...this.getMigratableTabsForContext(enrollmentContext),
      ...dynamicTabConfigs
    ].sort((a, b) => a.order - b.order);

    return of(allTabs);
  }

  private getMigratableTabsForContext(context?: any): TabConfig[] {
    // Logic to determine which legacy tabs to show based on enrollment context
    // For now, return all migratable tabs
    return this.migratableTabsConfig;
  }

  getTabGroups(tabs: TabConfig[]): TabGroup[] {
    const groups: TabGroup[] = [
      {
        name: 'Company Overview',
        tabs: tabs.filter(t => t.order < 100),
        order: 1
      },
      {
        name: 'Assessment & Planning',
        tabs: tabs.filter(t => t.order >= 100 && t.order < 400),
        order: 2
      },
      {
        name: 'Operations',
        tabs: tabs.filter(t => t.order >= 400 && t.order < 600),
        order: 3
      },
      {
        name: 'Growth & Development', 
        tabs: tabs.filter(t => t.order >= 600 && t.order < 800),
        order: 4
      },
      {
        name: 'Administration',
        tabs: tabs.filter(t => t.order >= 800),
        order: 5
      }
    ];

    return groups.filter(g => g.tabs.length > 0);
  }

  getStaticTabsConfig(): TabConfig[] {
    return [...this.staticTabsConfig];
  }

  getMigratableTabsConfig(): TabConfig[] {
    return [...this.migratableTabsConfig];
  }
}
```

---

## 🎛️ **PHASE 2: ENHANCED COMPONENTS**

### **3. Enrollment Context Selector**

```typescript
// src/app/components/companies/company-detail/enrollment-context-selector/enrollment-context-selector.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICategoryItemWithSession } from '../../../../../services/company-form-integration.service';

@Component({
  selector: 'app-enrollment-context-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white border rounded-lg p-4 mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-sm font-medium text-gray-900 mb-1">Program Context</h3>
          <p class="text-xs text-gray-500">Select which program context to view</p>
        </div>
        
        <div class="flex items-center space-x-3">
          <!-- Program Selector -->
          <select
            [value]="currentEnrollment?.id || ''"
            (change)="onEnrollmentChange($event)"
            class="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Programs</option>
            <option 
              *ngFor="let enrollment of enrollments" 
              [value]="enrollment.id"
            >
              {{ enrollment.program_name }} ({{ enrollment.cohort_name }})
            </option>
          </select>

          <!-- Context Badge -->
          <div 
            *ngIf="currentEnrollment"
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            [class]="getContextBadgeClass()"
          >
            <i class="fas fa-graduation-cap mr-1"></i>
            {{ currentEnrollment.program_name }}
          </div>
        </div>
      </div>

      <!-- Enrollment Details -->
      <div *ngIf="currentEnrollment" class="mt-3 pt-3 border-t border-gray-200">
        <div class="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span class="text-gray-500">Client:</span>
            <span class="ml-1 font-medium">{{ currentEnrollment.client_name }}</span>
          </div>
          <div>
            <span class="text-gray-500">Cohort:</span>
            <span class="ml-1 font-medium">{{ currentEnrollment.cohort_name }}</span>
          </div>
          <div>
            <span class="text-gray-500">Status:</span>
            <span 
              class="ml-1 px-2 py-0.5 text-xs rounded-full"
              [class]="getStatusClass(currentEnrollment.enrollment_status)"
            >
              {{ currentEnrollment.enrollment_status }}
            </span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class EnrollmentContextSelectorComponent {
  @Input() enrollments: ICategoryItemWithSession[] = [];
  @Input() currentEnrollment: ICategoryItemWithSession | null = null;
  @Output() enrollmentChange = new EventEmitter<ICategoryItemWithSession | null>();

  onEnrollmentChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const enrollmentId = target.value ? parseInt(target.value) : null;
    
    const selectedEnrollment = enrollmentId 
      ? this.enrollments.find(e => e.id === enrollmentId) || null
      : null;
      
    this.enrollmentChange.emit(selectedEnrollment);
  }

  getContextBadgeClass(): string {
    return 'bg-blue-100 text-blue-800';
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  }
}
```

---

### **4. Hybrid Tabs Navigation Component**

```typescript
// src/app/components/companies/company-detail/hybrid-tabs-navigation/hybrid-tabs-navigation.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabConfig, TabGroup } from '../../../../../services/tab-configuration.service';

@Component({
  selector: 'app-hybrid-tabs-navigation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white border-b">
      <!-- Tab Groups Navigation -->
      <nav class="flex space-x-8 px-6" aria-label="Tabs">
        <ng-container *ngFor="let group of tabGroups">
          <div class="relative group">
            <!-- Group Header -->
            <button
              class="text-sm font-medium text-gray-700 hover:text-gray-900 py-4 px-2 border-b-2 border-transparent hover:border-gray-300 focus:outline-none"
              [class.text-blue-600]="hasActiveTabInGroup(group)"
              [class.border-blue-500]="hasActiveTabInGroup(group)"
            >
              {{ group.name }}
              <i class="fas fa-chevron-down ml-1 text-xs"></i>
            </button>

            <!-- Dropdown Menu -->
            <div class="absolute top-full left-0 mt-1 w-64 bg-white rounded-md shadow-lg border hidden group-hover:block z-10">
              <div class="py-1">
                <ng-container *ngFor="let tab of group.tabs">
                  <button
                    *ngIf="tab.visible && tab.enabled"
                    (click)="selectTab(tab.id)"
                    class="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center"
                    [class.bg-blue-50]="activeTab === tab.id"
                    [class.text-blue-600]="activeTab === tab.id"
                  >
                    <i [class]="'fas fa-' + tab.icon + ' mr-2 text-' + tab.color + '-500'"></i>
                    {{ tab.title }}
                    
                    <!-- Tab Type Badge -->
                    <span 
                      class="ml-auto px-1.5 py-0.5 text-xs rounded"
                      [class]="getTabTypeBadgeClass(tab.type)"
                    >
                      {{ getTabTypeLabel(tab.type) }}
                    </span>
                  </button>
                </ng-container>
              </div>
            </div>
          </div>
        </ng-container>
      </nav>

      <!-- Quick Tab Navigation (Primary Tabs) -->
      <div class="px-6 pb-2">
        <div class="flex space-x-6">
          <ng-container *ngFor="let tab of primaryTabs">
            <button
              *ngIf="tab.visible && tab.enabled"
              (click)="selectTab(tab.id)"
              class="text-sm py-2 px-1 border-b-2 font-medium focus:outline-none"
              [class]="getTabClass(tab.id)"
            >
              <i [class]="'fas fa-' + tab.icon + ' mr-1'"></i>
              {{ tab.title }}
            </button>
          </ng-container>
        </div>
      </div>
    </div>
  `
})
export class HybridTabsNavigationComponent {
  @Input() tabGroups: TabGroup[] = [];
  @Input() activeTab: string = 'overview';
  @Output() tabChange = new EventEmitter<string>();

  get primaryTabs(): TabConfig[] {
    // Return most important tabs for quick access
    return this.tabGroups
      .flatMap(g => g.tabs)
      .filter(t => t.order < 300 && t.visible && t.enabled)
      .slice(0, 5);
  }

  selectTab(tabId: string): void {
    this.tabChange.emit(tabId);
  }

  hasActiveTabInGroup(group: TabGroup): boolean {
    return group.tabs.some(tab => tab.id === this.activeTab);
  }

  getTabClass(tabId: string): string {
    const isActive = this.activeTab === tabId;
    return isActive
      ? 'border-blue-500 text-blue-600'
      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300';
  }

  getTabTypeBadgeClass(type: string): string {
    switch (type) {
      case 'dynamic':
        return 'bg-green-100 text-green-800';
      case 'hybrid':
        return 'bg-orange-100 text-orange-800';
      case 'static':
      default:
        return 'bg-gray-100 text-gray-600';
    }
  }

  getTabTypeLabel(type: string): string {
    switch (type) {
      case 'dynamic':
        return 'Form';
      case 'hybrid':
        return 'Hybrid';
      case 'static':
      default:
        return 'Static';
    }
  }
}
```

---

### **5. Dynamic Tab Content Component**

```typescript
// src/app/components/companies/company-detail/dynamic-tab-content/dynamic-tab-content.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { CompanyFormTab, ICategoryItemWithSession } from '../../../../../services/company-form-integration.service';
import { ICompany } from '../../../../../models/simple.schema';
import { IForm, IFormNode, IFormSession, ISessionFieldResponse } from '../../../../../models/form.models';
import { FormService } from '../../../../../services/form.service';

@Component({
  selector: 'app-dynamic-tab-content',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      <!-- Form Header -->
      <div class="bg-white rounded-lg border p-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">{{ tab.form.title }}</h2>
            <p *ngIf="tab.form.description" class="text-sm text-gray-600 mt-1">
              {{ tab.form.description }}
            </p>
          </div>
          <div class="flex items-center space-x-3">
            <!-- Session Status Badge -->
            <span [class]="getStatusBadgeClass(tab.session?.status)">
              <i [class]="getStatusIcon(tab.session?.status)" class="mr-1"></i>
              {{ getStatusText(tab.session?.status) }}
            </span>
            
            <!-- Progress Indicator -->
            <div *ngIf="tab.session" class="text-sm text-gray-500">
              {{ getProgressText() }}
            </div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div *ngIf="tab.session && progressPercentage > 0" class="mt-4">
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-600">Progress</span>
            <span class="text-gray-900 font-medium">{{ progressPercentage }}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div 
              class="bg-blue-600 h-2 rounded-full transition-all duration-300"
              [style.width.%]="progressPercentage"
            ></div>
          </div>
        </div>
      </div>

      <!-- Form Content -->
      <div class="bg-white rounded-lg border">
        <ng-container [ngSwitch]="tab.session?.status">
          
          <!-- Draft or no session - editable form -->
          <div *ngSwitchCase="'draft'" class="p-6">
            <app-dynamic-form-editor
              [form]="tab.form"
              [nodes]="tab.nodes"
              [session]="tab.session"
              [responses]="tab.responses"
              [company]="company"
              [enrollment]="enrollment"
              (save)="onSaveForm($event)"
              (submit)="onSubmitForm($event)"
              (progressChange)="onProgressChange($event)">
            </app-dynamic-form-editor>
          </div>
          
          <!-- Submitted - read-only view with revision capability -->
          <div *ngSwitchCase="'submitted'" class="p-6">
            <div class="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div class="flex">
                <i class="fas fa-clock text-yellow-400 mr-2 mt-0.5"></i>
                <div>
                  <h4 class="text-sm font-medium text-yellow-800">Under Review</h4>
                  <p class="text-sm text-yellow-700">This form has been submitted and is awaiting approval.</p>
                </div>
              </div>
            </div>
            
            <app-dynamic-form-viewer
              [form]="tab.form"
              [nodes]="tab.nodes" 
              [responses]="tab.responses"
              [allowEdit]="tab.can_edit"
              (editRequest)="onRequestEdit($event)">
            </app-dynamic-form-viewer>
          </div>
          
          <!-- Approved - completed view -->
          <div *ngSwitchCase="'program_approved'" class="p-6">
            <div class="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <div class="flex">
                <i class="fas fa-check-circle text-green-400 mr-2 mt-0.5"></i>
                <div>
                  <h4 class="text-sm font-medium text-green-800">Approved</h4>
                  <p class="text-sm text-green-700">This form has been completed and approved.</p>
                </div>
              </div>
            </div>
            
            <app-dynamic-form-viewer
              [form]="tab.form"
              [nodes]="tab.nodes"
              [responses]="tab.responses"
              [showCompletedBadge]="true"
              [readonly]="true">
            </app-dynamic-form-viewer>
          </div>
          
          <!-- Default - start new session -->
          <div *ngSwitchDefault class="p-6 text-center">
            <div class="max-w-sm mx-auto">
              <i class="fas fa-play-circle text-blue-500 text-4xl mb-4"></i>
              <h3 class="text-lg font-medium text-gray-900 mb-2">Start {{ tab.form.title }}</h3>
              <p class="text-sm text-gray-600 mb-4">
                Begin completing this form for {{ enrollment?.program_name || 'this program' }}.
              </p>
              <button
                (click)="onStartForm()"
                [disabled]="!tab.can_edit"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <i class="fas fa-plus mr-2"></i>
                Start Form
              </button>
            </div>
          </div>
          
        </ng-container>
      </div>
    </div>
  `
})
export class DynamicTabContentComponent implements OnInit {
  @Input() tab!: CompanyFormTab;
  @Input() company!: ICompany;
  @Input() enrollment!: ICategoryItemWithSession;
  
  @Output() formSaved = new EventEmitter<any>();
  @Output() formSubmitted = new EventEmitter<any>();
  @Output() formStarted = new EventEmitter<any>();

  progressPercentage = 0;

  constructor(
    private formService: FormService
  ) {}

  ngOnInit(): void {
    this.calculateProgress();
  }

  private calculateProgress(): void {
    if (!this.tab.session || !this.tab.responses) {
      this.progressPercentage = 0;
      return;
    }

    const totalFields = this.tab.nodes.length;
    const completedFields = this.tab.responses.filter(r => 
      r.value !== null && r.value !== undefined && r.value !== ''
    ).length;

    this.progressPercentage = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
  }

  onStartForm(): void {
    if (!this.tab.can_edit) return;

    this.formService.createFormSession({
      form_id: this.tab.form.id,
      category_item_id: this.enrollment.id,
      status: 'draft'
    }).subscribe({
      next: (session) => {
        this.formStarted.emit({ tab: this.tab, session });
      },
      error: (error) => {
        console.error('Error starting form:', error);
      }
    });
  }

  onSaveForm(data: any): void {
    this.formSaved.emit({ tab: this.tab, data });
  }

  onSubmitForm(data: any): void {
    this.formSubmitted.emit({ tab: this.tab, data });
  }

  onRequestEdit(data: any): void {
    // Handle request to edit submitted form
    console.log('Edit requested for:', data);
  }

  onProgressChange(percentage: number): void {
    this.progressPercentage = percentage;
  }

  getStatusBadgeClass(status?: string): string {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    
    switch (status) {
      case 'draft':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'submitted':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'program_approved':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'rejected':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-600`;
    }
  }

  getStatusIcon(status?: string): string {
    switch (status) {
      case 'draft':
        return 'fas fa-edit';
      case 'submitted':
        return 'fas fa-clock';
      case 'program_approved':
        return 'fas fa-check-circle';
      case 'rejected':
        return 'fas fa-times-circle';
      default:
        return 'fas fa-file';
    }
  }

  getStatusText(status?: string): string {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'submitted':
        return 'Under Review';
      case 'program_approved':
        return 'Approved';
      case 'rejected':
        return 'Needs Revision';
      default:
        return 'Not Started';
    }
  }

  getProgressText(): string {
    if (!this.tab.session) return '';
    
    const totalFields = this.tab.nodes.length;
    const completedFields = this.tab.responses?.filter(r => 
      r.value !== null && r.value !== undefined && r.value !== ''
    ).length || 0;

    return `${completedFields} of ${totalFields} fields completed`;
  }
}
```

---

## 🔧 **PHASE 3: ENHANCED COMPANY DETAIL COMPONENT**

### **6. Updated Company Detail Component**

```typescript
// src/app/components/companies/company-detail/company-detail-enhanced.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, switchMap, combineLatest } from 'rxjs';

// Services
import { CompanyService } from '../../../../services/company.service';
import { CompanyContextService, ContextItem, EnhancedCompanyContext } from '../../../../services/company-context.service';
import { TabConfigurationService, TabConfig, TabGroup } from '../../../../services/tab-configuration.service';
import { CompanyFormIntegrationService, ICategoryItemWithSession, CompanyFormTab } from '../../../../services/company-form-integration.service';

// Models
import { ICompany } from '../../../../models/simple.schema';

// Components
import { EnrollmentContextSelectorComponent } from './enrollment-context-selector/enrollment-context-selector.component';
import { HybridTabsNavigationComponent } from './hybrid-tabs-navigation/hybrid-tabs-navigation.component';
import { DynamicTabContentComponent } from './dynamic-tab-content/dynamic-tab-content.component';

// Import existing tab components
import { OverviewTabComponent } from './overview-tab/overview-tab.component';
import { AssessmentTabComponent } from './assessment-tab/assessment-tab.component';
import { FinancialTabComponent } from './financial-tab/financial-tab.component';
import { DocumentsTabComponent } from './documents-tab/documents-tab.component';
import { TasksTabComponent } from './tasks-tab/tasks-tab.component';

@Component({
  selector: 'app-company-detail-enhanced',
  standalone: true,
  imports: [
    CommonModule,
    EnrollmentContextSelectorComponent,
    HybridTabsNavigationComponent,
    DynamicTabContentComponent,
    // Static tab components
    OverviewTabComponent,
    AssessmentTabComponent,
    FinancialTabComponent,
    DocumentsTabComponent,
    TasksTabComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50" *ngIf="!loading">
      <!-- Header with Company Info -->
      <div class="bg-white border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between py-6">
            <div class="flex items-center">
              <button
                (click)="goBack()"
                class="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              >
                <i class="fas fa-arrow-left"></i>
              </button>
              <div>
                <h1 class="text-2xl font-bold text-gray-900">{{ company?.name }}</h1>
                <div class="text-sm text-gray-500">
                  <span *ngFor="let ctx of context; let last = last">
                    {{ ctx.clientName }} → {{ ctx.programName }}
                    <ng-container *ngIf="ctx.cohortName"> → {{ ctx.cohortName }}</ng-container>
                    <span *ngIf="!last"> | </span>
                  </span>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center space-x-3">
              <button class="btn-secondary">
                <i class="fas fa-edit mr-2"></i>
                Edit Company
              </button>
              <button class="btn-primary">
                <i class="fas fa-download mr-2"></i>
                Export Data
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <!-- Enrollment Context Selector -->
        <app-enrollment-context-selector
          *ngIf="enhancedContext?.hasMultipleEnrollments"
          [enrollments]="enhancedContext.allEnrollments"
          [currentEnrollment]="enhancedContext.currentEnrollment"
          (enrollmentChange)="onEnrollmentChange($event)">
        </app-enrollment-context-selector>

        <!-- Hybrid Tab Navigation -->
        <app-hybrid-tabs-navigation
          [tabGroups]="tabGroups"
          [activeTab]="activeTab"
          (tabChange)="setActiveTab($event)">
        </app-hybrid-tabs-navigation>

        <!-- Tab Content -->
        <div class="mt-6">
          <ng-container [ngSwitch]="getActiveTabType()">
            
            <!-- Static Tab Content -->
            <div *ngSwitchCase="'static'">
              <ng-container [ngSwitch]="activeTab">
                <app-overview-tab 
                  *ngSwitchCase="'overview'" 
                  [company]="company">
                </app-overview-tab>
                
                <app-assessment-tab 
                  *ngSwitchCase="'assessment'" 
                  [company]="company">
                </app-assessment-tab>
                
                <app-financial-tab 
                  *ngSwitchCase="'financial'" 
                  [company]="company">
                </app-financial-tab>
                
                <app-documents-tab 
                  *ngSwitchCase="'documents'" 
                  [company]="company">
                </app-documents-tab>
                
                <app-tasks-tab 
                  *ngSwitchCase="'tasks'" 
                  [company]="company">
                </app-tasks-tab>
                
                <!-- Fallback for unknown static tabs -->
                <div *ngSwitchDefault class="text-center py-12">
                  <p class="text-gray-500">Tab content not found: {{ activeTab }}</p>
                </div>
              </ng-container>
            </div>

            <!-- Dynamic Form Content -->
            <app-dynamic-tab-content
              *ngSwitchCase="'dynamic'"
              [tab]="getActiveFormTab()"
              [company]="company"
              [enrollment]="enhancedContext?.currentEnrollment"
              (formSaved)="onFormSaved($event)"
              (formSubmitted)="onFormSubmitted($event)"
              (formStarted)="onFormStarted($event)">
            </app-dynamic-tab-content>

            <!-- Hybrid Tab Content -->
            <div *ngSwitchCase="'hybrid'">
              <!-- Implement hybrid logic here -->
              <div class="bg-white rounded-lg border p-6">
                <h3 class="text-lg font-medium mb-4">Hybrid Tab: {{ activeTab }}</h3>
                <p class="text-gray-600">This tab can show both legacy and dynamic content based on context.</p>
              </div>
            </div>
            
          </ng-container>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div *ngIf="loading" class="min-h-screen bg-gray-50 flex items-center justify-center">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p class="mt-4 text-gray-600">Loading company details...</p>
      </div>
    </div>

    <!-- Error State -->
    <div *ngIf="error" class="min-h-screen bg-gray-50 flex items-center justify-center">
      <div class="text-center">
        <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Error Loading Company</h3>
        <p class="text-gray-600 mb-4">{{ error }}</p>
        <button (click)="loadCompanyData()" class="btn-primary">
          <i class="fas fa-refresh mr-2"></i>
          Retry
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./company-detail-enhanced.component.scss']
})
export class CompanyDetailEnhancedComponent implements OnInit, OnDestroy {
  // Core data
  company: ICompany | null = null;
  context: ContextItem[] = [];
  enhancedContext: EnhancedCompanyContext | null = null;
  
  // Tab configuration
  tabGroups: TabGroup[] = [];
  activeTab = 'overview';
  
  // State management
  loading = true;
  error: string | null = null;
  
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private companyService: CompanyService,
    private contextService: CompanyContextService,
    private tabConfigService: TabConfigurationService,
    private formIntegrationService: CompanyFormIntegrationService
  ) {}

  ngOnInit(): void {
    this.loadCompanyData();
    this.subscribeToContextChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCompanyData(): void {
    this.loading = true;
    this.error = null;

    // Get company ID from route
    const companyId = this.route.snapshot.params['id'];
    if (!companyId) {
      this.error = 'No company ID provided';
      this.loading = false;
      return;
    }

    // Extract context from query parameters
    const queryParams = this.route.snapshot.queryParams;
    const context: ContextItem[] = [];
    
    if (queryParams['clientId']) {
      context.push({
        clientId: parseInt(queryParams['clientId']),
        clientName: queryParams['clientName'] || '',
        programId: parseInt(queryParams['programId']) || 0,
        programName: queryParams['programName'] || '',
        cohortId: parseInt(queryParams['cohortId']) || 0,
        cohortName: queryParams['cohortName'] || ''
      });
    }

    // Load company data
    this.companyService.getCompany(parseInt(companyId))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (company) => {
          this.company = company;
          this.context = context;
          
          // Set context in service
          this.contextService.setCompany(company);
          this.contextService.setContext(context);
          
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading company:', err);
          this.error = 'Failed to load company data';
          this.loading = false;
        }
      });
  }

  private subscribeToContextChanges(): void {
    // Subscribe to enhanced context changes
    this.contextService.enhancedContext$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (context) => {
          this.enhancedContext = context;
          if (context) {
            this.updateTabConfiguration(context);
          }
        },
        error: (err) => {
          console.error('Error in enhanced context:', err);
        }
      });
  }

  private updateTabConfiguration(context: EnhancedCompanyContext): void {
    if (!context.company) return;

    this.tabConfigService.generateHybridTabConfig(
      context.company.id,
      context.dynamicTabs,
      context.currentEnrollment
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tabs) => {
          this.tabGroups = this.tabConfigService.getTabGroups(tabs);
        },
        error: (err) => {
          console.error('Error generating tab configuration:', err);
        }
      });
  }

  // Event Handlers
  onEnrollmentChange(enrollment: ICategoryItemWithSession | null): void {
    this.contextService.setCurrentEnrollment(enrollment);
  }

  setActiveTab(tabId: string): void {
    this.activeTab = tabId;
  }

  onFormSaved(event: any): void {
    console.log('Form saved:', event);
    // Handle form save
  }

  onFormSubmitted(event: any): void {
    console.log('Form submitted:', event);
    // Handle form submission
  }

  onFormStarted(event: any): void {
    console.log('Form started:', event);
    // Refresh context after starting a form
    if (this.company) {
      this.contextService.setCompany(this.company);
    }
  }

  goBack(): void {
    if (this.context.length > 0) {
      const ctx = this.context[0];
      this.router.navigate(['/categories'], {
        queryParams: {
          clientId: ctx.clientId,
          clientName: ctx.clientName,
          programId: ctx.programId,
          programName: ctx.programName,
          cohortId: ctx.cohortId,
          cohortName: ctx.cohortName
        }
      });
    } else {
      this.router.navigate(['/companies']);
    }
  }

  // Helper Methods
  getActiveTabType(): 'static' | 'dynamic' | 'hybrid' {
    const allTabs = this.tabGroups.flatMap(g => g.tabs);
    const activeTabConfig = allTabs.find(t => t.id === this.activeTab);
    return activeTabConfig?.type || 'static';
  }

  getActiveFormTab(): CompanyFormTab | null {
    if (!this.enhancedContext) return null;
    
    const formId = this.activeTab.startsWith('form-') 
      ? parseInt(this.activeTab.replace('form-', ''))
      : null;
      
    return formId 
      ? this.enhancedContext.dynamicTabs.find(t => t.form.id === formId) || null
      : null;
  }
}
```

---

## 📊 **IMPLEMENTATION TIMELINE**

### **Week 1: Foundation**
- [ ] Create `CompanyContextService`
- [ ] Create `TabConfigurationService` 
- [ ] Build `EnrollmentContextSelectorComponent`
- [ ] Test basic context switching

### **Week 2: Navigation**
- [ ] Build `HybridTabsNavigationComponent`
- [ ] Create tab grouping logic
- [ ] Implement dropdown navigation
- [ ] Test tab switching

### **Week 3: Dynamic Content**
- [ ] Create `DynamicTabContentComponent`
- [ ] Build form editor/viewer subcomponents
- [ ] Implement form state management
- [ ] Test form interactions

### **Week 4: Integration**
- [ ] Build enhanced `CompanyDetailComponent`
- [ ] Integrate all components
- [ ] Implement error handling
- [ ] Add loading states

### **Week 5: Migration**
- [ ] Migrate Assessment tab to hybrid mode
- [ ] Test backward compatibility
- [ ] Performance optimization
- [ ] User acceptance testing

---

## 🎯 **SUCCESS CRITERIA**

### **Technical Goals**
- [ ] Zero breaking changes to existing functionality
- [ ] Page load time < 2 seconds
- [ ] All existing tests pass
- [ ] 80%+ test coverage for new code

### **User Experience Goals**
- [ ] Seamless transition between static and dynamic tabs
- [ ] Clear indication of form status and progress
- [ ] Intuitive enrollment context switching
- [ ] Responsive design on all devices

### **Business Goals**
- [ ] 20% increase in form completion rates
- [ ] 50% reduction in manual form management
- [ ] Program managers can create forms without developer involvement
- [ ] Support for unlimited program types

This implementation plan provides a complete roadmap for integrating the dynamic form system with the existing company detail interface while maintaining all current functionality and providing a smooth migration path.
