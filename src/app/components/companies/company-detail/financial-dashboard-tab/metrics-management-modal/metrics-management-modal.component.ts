import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IMetricGroup, IMetricType, CreateMetricGroupDto, CreateMetricTypeDto, MetricPeriodType } from '../../../../../../models/metrics.model';
import { MetricsService } from '../../../../../../services/metrics.service';

@Component({
  selector: 'app-metrics-management-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Modal Backdrop -->
    <div *ngIf="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" (click)="closeModal()">

      <!-- Modal Content -->
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden" (click)="$event.stopPropagation()">

        <!-- Modal Header -->
        <div class="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-white bg-opacity-20 rounded-lg">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
              </div>
              <div>
                <h2 class="text-xl font-bold">Metrics Management</h2>
                <p class="text-blue-100 text-sm">Configure metric groups and types</p>
              </div>
            </div>
            <button (click)="closeModal()" class="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Tab Navigation -->
        <div class="border-b border-gray-200 bg-gray-50">
          <div class="flex">
            <button
              (click)="activeTab = 'groups'"
              class="px-6 py-3 text-sm font-medium transition-colors border-b-2"
              [class]="activeTab === 'groups' ? 'border-blue-500 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'"
            >
              📁 Groups ({{ groups.length }})
            </button>
            <button
              (click)="activeTab = 'types'"
              class="px-6 py-3 text-sm font-medium transition-colors border-b-2"
              [class]="activeTab === 'types' ? 'border-blue-500 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'"
            >
              📊 Types {{ selectedGroup ? '(' + getTypesForGroup(selectedGroup.id).length + ')' : '' }}
            </button>
          </div>
        </div>

        <!-- Modal Body -->
        <div class="p-6 max-h-[600px] overflow-y-auto">

          <!-- Groups Tab -->
          <div *ngIf="activeTab === 'groups'">
            <!-- Add Group Form -->
            <div class="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
              <h3 class="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Add New Group
              </h3>

              <form (ngSubmit)="createGroup()" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                  <input
                    type="text"
                    [(ngModel)]="newGroup.code"
                    name="code"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., REVENUE"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    [(ngModel)]="newGroup.name"
                    name="name"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Revenue Metrics"
                  />
                </div>

                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    [(ngModel)]="newGroup.description"
                    name="description"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Brief description of this metric group"
                  />
                </div>

                <div class="flex items-center gap-4">
                  <label class="flex items-center gap-2">
                    <input type="checkbox" [(ngModel)]="newGroup.show_total" name="show_total" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                    <span class="text-sm text-gray-700">Show Total</span>
                  </label>

                  <label class="flex items-center gap-2">
                    <input type="checkbox" [(ngModel)]="newGroup.show_margin" name="show_margin" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                    <span class="text-sm text-gray-700">Show Margin</span>
                  </label>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Graph Color</label>
                  <input
                    type="color"
                    [(ngModel)]="newGroup.graph_color"
                    name="graph_color"
                    class="w-full h-10 border border-gray-300 rounded-md"
                  />
                </div>

                <div class="md:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    [disabled]="isLoading"
                    class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <svg *ngIf="!isLoading" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    <svg *ngIf="isLoading" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    {{ isLoading ? 'Creating...' : 'Create Group' }}
                  </button>
                </div>
              </form>
            </div>

            <!-- Groups List -->
            <div class="space-y-3">
              <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
                📁 Existing Groups
              </h3>

              <div *ngIf="groups.length === 0" class="text-center py-8 text-gray-500">
                <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
                <p>No metric groups found</p>
                <p class="text-sm">Create your first group above</p>
              </div>

              <div *ngFor="let group of groups" class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-4 h-4 rounded" [style.background-color]="group.graph_color || '#6B7280'"></div>
                    <div>
                      <h4 class="font-semibold text-gray-900">{{ group.name }}</h4>
                      <p class="text-sm text-gray-600">{{ group.code }}</p>
                      <p *ngIf="group.description" class="text-xs text-gray-500 mt-1">{{ group.description }}</p>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {{ getTypesForGroup(group.id).length }} types
                    </span>

                    <button
                      (click)="selectGroup(group)"
                      class="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                    >
                      Manage Types
                    </button>

                    <button
                      (click)="deleteGroup(group.id)"
                      class="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                      title="Delete Group"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Types Tab -->
          <div *ngIf="activeTab === 'types'">
            <!-- Group Selection -->
            <div *ngIf="!selectedGroup" class="text-center py-12 text-gray-500">
              <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
              </svg>
              <h3 class="text-lg font-semibold text-gray-700 mb-2">Select a Group</h3>
              <p class="mb-4">Choose a group from the Groups tab to manage its metric types</p>
              <button
                (click)="activeTab = 'groups'"
                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                Go to Groups
              </button>
            </div>

            <!-- Selected Group Header -->
            <div *ngIf="selectedGroup" class="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-6 h-6 rounded" [style.background-color]="selectedGroup.graph_color || '#6B7280'"></div>
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900">{{ selectedGroup.name }}</h3>
                    <p class="text-sm text-gray-600">{{ selectedGroup.code }} • {{ getTypesForGroup(selectedGroup.id).length }} types</p>
                  </div>
                </div>
                <button
                  (click)="selectedGroup = null"
                  class="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Add Type Form -->
            <div *ngIf="selectedGroup" class="bg-green-50 rounded-lg p-4 mb-6 border border-green-200">
              <h4 class="text-lg font-semibold text-green-900 mb-3 flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Add New Metric Type
              </h4>

              <form (ngSubmit)="createType()" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                  <input
                    type="text"
                    [(ngModel)]="newType.code"
                    name="typeCode"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="e.g., REVENUE_TOTAL"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    [(ngModel)]="newType.name"
                    name="typeName"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="e.g., Total Revenue"
                  />
                </div>

                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    [(ngModel)]="newType.description"
                    name="typeDescription"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Brief description of this metric type"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                  <select
                    [(ngModel)]="newType.unit"
                    name="typeUnit"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="ZAR">ZAR (Currency)</option>
                    <option value="count">Count</option>
                    <option value="%">Percentage (%)</option>
                    <option value="ratio">Ratio</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Period Type *</label>
                  <select
                    [(ngModel)]="newType.period_type"
                    name="typePeriodType"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="QUARTERLY">Quarterly (Q1-Q4)</option>
                    <option value="YEARLY">Yearly (Annual)</option>
                  </select>
                </div>

                <div class="flex items-center gap-4">
                  <label class="flex items-center gap-2">
                    <input type="checkbox" [(ngModel)]="newType.show_total" name="typeShowTotal" class="rounded border-gray-300 text-green-600 focus:ring-green-500">
                    <span class="text-sm text-gray-700">Show Total</span>
                  </label>

                  <label class="flex items-center gap-2">
                    <input type="checkbox" [(ngModel)]="newType.show_margin" name="typeShowMargin" class="rounded border-gray-300 text-green-600 focus:ring-green-500">
                    <span class="text-sm text-gray-700">Show Margin</span>
                  </label>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Graph Color</label>
                  <input
                    type="color"
                    [(ngModel)]="newType.graph_color"
                    name="typeGraphColor"
                    class="w-full h-10 border border-gray-300 rounded-md"
                  />
                </div>

                <div class="md:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    [disabled]="isLoading"
                    class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <svg *ngIf="!isLoading" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    <svg *ngIf="isLoading" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    {{ isLoading ? 'Creating...' : 'Create Type' }}
                  </button>
                </div>
              </form>
            </div>

            <!-- Types List -->
            <div *ngIf="selectedGroup" class="space-y-3">
              <h4 class="text-lg font-semibold text-gray-900">Metric Types</h4>

              <div *ngIf="getTypesForGroup(selectedGroup.id).length === 0" class="text-center py-8 text-gray-500">
                <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9a2 2 0 01-2-2z"></path>
                </svg>
                <p>No metric types found for this group</p>
                <p class="text-sm">Create your first metric type above</p>
              </div>

              <div *ngFor="let type of getTypesForGroup(selectedGroup.id)" class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-4 h-4 rounded" [style.background-color]="type.graph_color || '#6B7280'"></div>
                    <div>
                      <h5 class="font-semibold text-gray-900">{{ type.name }}</h5>
                      <p class="text-sm text-gray-600">{{ type.code }} • {{ type.unit }}</p>
                      <p *ngIf="type.description" class="text-xs text-gray-500 mt-1">{{ type.description }}</p>

                      <div class="flex items-center gap-2 mt-2">
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                              [class]="type.period_type === 'QUARTERLY' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'">
                          {{ type.period_type }}
                        </span>

                        <span *ngIf="type.show_total" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Total
                        </span>

                        <span *ngIf="type.show_margin" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Margin
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <button
                      (click)="deleteType(type.id)"
                      class="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                      title="Delete Type"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Modal Footer -->
        <div class="bg-gray-50 px-6 py-4 flex justify-between items-center">
          <div class="text-sm text-gray-500">
            {{ groups.length }} groups • {{ types.length }} total types
          </div>
          <button
            (click)="closeModal()"
            class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  `
})
export class MetricsManagementModalComponent implements OnInit {
  @Input() clientId: number = 1;
  @Output() modalClosed = new EventEmitter<void>();
  @Output() dataUpdated = new EventEmitter<void>();

  // Modal State
  isOpen = false;
  isLoading = false;
  activeTab: 'groups' | 'types' = 'groups';

  // Data
  groups: IMetricGroup[] = [];
  types: IMetricType[] = [];
  selectedGroup: IMetricGroup | null = null;

  // Form Models
  newGroup: CreateMetricGroupDto = this.resetGroupForm();
  newType: CreateMetricTypeDto = this.resetTypeForm();

  constructor(private metricsService: MetricsService) {}

  ngOnInit(): void {
    this.loadData();
  }

  // Public API
  open(): void {
    this.isOpen = true;
    this.loadData();
  }

  closeModal(): void {
    this.isOpen = false;
    this.activeTab = 'groups';
    this.selectedGroup = null;
    this.modalClosed.emit();
  }

  // Data Loading
  loadData(): void {
    this.loadGroups();
    // Types will be loaded when groups are loaded
  }

  loadGroups(): void {
    this.metricsService.listGroups(this.clientId).subscribe({
      next: (groups) => {
        this.groups = groups;
        this.loadAllTypes();
      },
      error: (err) => {
        console.error('Error loading groups:', err);
        alert('Failed to load metric groups');
      }
    });
  }

  loadAllTypes(): void {
    // Load types for all groups
    const typeRequests = this.groups.map(group =>
      this.metricsService.listTypes(group.id)
    );

    // Flatten all types into single array
    Promise.all(typeRequests.map(req => req.toPromise())).then(
      (allTypes) => {
        this.types = allTypes.flat().filter(type => type !== undefined) as IMetricType[];
      }
    ).catch(err => {
      console.error('Error loading types:', err);
    });
  }

  // Group Operations
  createGroup(): void {
    if (!this.newGroup.code || !this.newGroup.name) {
      alert('Please fill in required fields (Code and Name)');
      return;
    }

    this.isLoading = true;

    const groupData: CreateMetricGroupDto = {
      client_id: this.clientId,
      code: this.newGroup.code,
      name: this.newGroup.name,
      description: this.newGroup.description || '',
      show_total: this.newGroup.show_total ? 1 : 0,
      show_margin: this.newGroup.show_margin ? 1 : 0,
      graph_color: this.newGroup.graph_color || null
    };

    this.metricsService.addGroup(groupData).subscribe({
      next: (group) => {
        console.log('Group created:', group);
        this.groups.push(group);
        this.newGroup = this.resetGroupForm();
        this.dataUpdated.emit();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error creating group:', err);
        alert('Failed to create group: ' + (err.error?.error || err.message));
        this.isLoading = false;
      }
    });
  }

  deleteGroup(id: number): void {
    const group = this.groups.find(g => g.id === id);
    if (!group) return;

    if (confirm(`Delete group "${group.name}"? This will also delete all associated metric types.`)) {
      this.metricsService.deleteGroup(id).subscribe({
        next: () => {
          this.groups = this.groups.filter(g => g.id !== id);
          this.types = this.types.filter(t => t.group_id !== id);

          // Clear selection if deleted group was selected
          if (this.selectedGroup?.id === id) {
            this.selectedGroup = null;
          }

          this.dataUpdated.emit();
        },
        error: (err) => {
          console.error('Error deleting group:', err);
          alert('Failed to delete group');
        }
      });
    }
  }

  selectGroup(group: IMetricGroup): void {
    this.selectedGroup = group;
    this.activeTab = 'types';
  }

  // Type Operations
  createType(): void {
    if (!this.selectedGroup) {
      alert('Please select a group first');
      return;
    }

    if (!this.newType.code || !this.newType.name || !this.newType.unit || !this.newType.period_type) {
      alert('Please fill in all required fields');
      return;
    }

    this.isLoading = true;

    const typeData: CreateMetricTypeDto = {
      group_id: this.selectedGroup.id,
      code: this.newType.code,
      name: this.newType.name,
      description: this.newType.description || '',
      unit: this.newType.unit,
      show_total: this.newType.show_total ? 1 : 0,
      show_margin: this.newType.show_margin ? 1 : 0,
      graph_color: this.newType.graph_color || null,
      period_type: this.newType.period_type
    };

    this.metricsService.addType(typeData).subscribe({
      next: (type) => {
        console.log('Type created:', type);
        this.types.push(type);
        this.newType = this.resetTypeForm();
        this.dataUpdated.emit();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error creating type:', err);
        alert('Failed to create metric type: ' + (err.error?.error || err.message));
        this.isLoading = false;
      }
    });
  }

  deleteType(id: number): void {
    const type = this.types.find(t => t.id === id);
    if (!type) return;

    if (confirm(`Delete metric type "${type.name}"? This will also delete all associated records.`)) {
      this.metricsService.deleteType(id).subscribe({
        next: () => {
          this.types = this.types.filter(t => t.id !== id);
          this.dataUpdated.emit();
        },
        error: (err) => {
          console.error('Error deleting type:', err);
          alert('Failed to delete metric type');
        }
      });
    }
  }

  // Helper Methods
  getTypesForGroup(groupId: number): IMetricType[] {
    return this.types.filter(type => type.group_id === groupId);
  }

  private resetGroupForm(): CreateMetricGroupDto {
    return {
      client_id: this.clientId,
      code: '',
      name: '',
      description: '',
      show_total: 1,
      show_margin: 0,
      graph_color: '#1f77b4'
    };
  }

  private resetTypeForm(): CreateMetricTypeDto {
    return {
      group_id: 0,
      code: '',
      name: '',
      description: '',
      unit: 'ZAR',
      show_total: 1,
      show_margin: 0,
      graph_color: '#1f77b4',
      period_type: 'QUARTERLY'
    };
  }
}
