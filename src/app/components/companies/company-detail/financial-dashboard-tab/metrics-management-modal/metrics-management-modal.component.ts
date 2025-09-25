import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { IMetricGroup, IMetricType, CreateMetricGroupDto, CreateMetricTypeDto, UpdateMetricGroupOrderDto, MetricPeriodType } from '../../../../../../models/metrics.model';
import { ICategory } from '../../../../../../models/simple.schema';
import { MetricsService } from '../../../../../../services/metrics.service';
import { CategoryService } from '../../../../../../services/category.service';
import { Constants } from '../../../../../../services/service';

@Component({
  selector: 'app-metrics-management-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Modal Backdrop -->
    <div *ngIf="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" (click)="closeModal()">

      <!-- Modal Content -->
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden" (click)="$event.stopPropagation()">

        <!-- Modal Header with Dynamic Breadcrumbs -->
        <div class="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <!-- Back Button (only show if not on main view) -->
              <button
                *ngIf="currentView !== 'groups-list'"
                (click)="goBack()"
                class=""
                title="Go Back"
              >
                <i class="fas fa-arrow-left text-white"></i>
              </button>

              <div class="p-2 bg-black bg-opacity-20 rounded-lg">
                <i class="fas fa-cog text-white text-lg"></i>
              </div>

              <div>
                <!-- Dynamic Breadcrumbs -->
                <nav class="flex items-center gap-2 text-sm">
                  <h2 class="text-xl font-bold">Manage Groups</h2>
                  <span *ngIf="currentView !== 'groups-list'" class="text-blue-200">/</span>

                  <!-- Create Group Breadcrumb -->
                  <span *ngIf="currentView === 'create-group'" class="text-blue-200">Create Group</span>
                  <span *ngIf="currentView === 'edit-group'" class="text-blue-200">Edit {{ editingGroup?.name }}</span>

                  <!-- Types Breadcrumbs -->
                  <span *ngIf="currentView === 'types-list' && selectedGroup" class="text-blue-200">{{ selectedGroup.name }}</span>
                  <span *ngIf="currentView === 'create-type' && selectedGroup" class="text-blue-200">{{ selectedGroup.name }}</span>
                  <span *ngIf="currentView === 'create-type'" class="text-blue-200"> / Create Type</span>
                  <span *ngIf="currentView === 'edit-type'" class="text-blue-200">{{ selectedGroup?.name }} / Edit {{ editingType?.name }}</span>
                </nav>
                <p class="text-blue-100 text-sm mt-1">{{ getSubtitle() }}</p>
              </div>
            </div>

            <button
              (click)="closeModal()"
              class=""
              title="Close Modal"
            >
              <i class="fas fa-times text-white"></i>
            </button>
          </div>
        </div>

        <!-- Modal Body -->
        <div class="p-6 max-h-[600px] overflow-y-auto">

          <!-- Groups List View -->
          <div *ngIf="currentView === 'groups-list'">
            <!-- Header with Action Buttons -->
            <div class="mb-6 flex justify-between items-center">
              <h3 class="text-xl font-semibold text-gray-900">All Groups</h3>
              <div class="flex gap-3">
                <button
                  (click)="showOrderGroups()"
                  class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                  <i class="fas fa-sort"></i>
                  Order Groups
                </button>
                <button
                  (click)="showCreateGroup()"
                  class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                  <i class="fas fa-plus"></i>
                  Create New Group
                </button>
              </div>
            </div>

            <!-- Groups Grid -->
            <div *ngIf="groups.length === 0" class="text-center py-12 text-gray-500">
              <i class="fas fa-folder-open text-6xl mx-auto mb-4 text-gray-300 block"></i>
              <h3 class="text-lg font-semibold text-gray-700 mb-2">No Groups Found</h3>
              <p class="mb-4">Create your first metric group to get started</p>
            </div>

            <div *ngIf="groups.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div *ngFor="let group of groups"
                   class="group bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg hover:border-blue-300 cursor-pointer transition-all duration-200"
                   (click)="showGroupTypes(group)">
                <div class="flex items-start justify-between mb-3">
                  <div class="flex items-center gap-3">
                    <div class="w-4 h-4 rounded" [style.background-color]="group.graph_color || '#6B7280'"></div>
                    <div>
                      <h4 class="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{{ group.name }}</h4>
                      <p class="text-sm text-gray-600">{{ group.code }}</p>
                    </div>
                  </div>

                  <button
                    (click)="$event.stopPropagation(); showEditGroup(group)"
                    class="opacity-0 group-hover:opacity-100 text-blue-600 hover:text-blue-800 p-1 rounded transition-all"
                    title="Edit Group"
                  >
                    <i class="fas fa-edit text-sm"></i>
                  </button>
                </div>

                <p *ngIf="group.description" class="text-sm text-gray-500 mb-3 line-clamp-2">{{ group.description }}</p>

                <div class="flex items-center justify-between">
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {{ getTypesForGroup(group.id).length }} types
                  </span>

                  <div class="flex gap-2">
                    <span *ngIf="group.show_total" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Total
                    </span>
                    <span *ngIf="group.show_margin" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Margin
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Order Groups View -->
          <div *ngIf="currentView === 'order-groups'">
            <!-- Header with Save/Cancel Buttons -->
            <div class="mb-6 flex justify-between items-center">
              <div>
                <h3 class="text-xl font-semibold text-purple-900">Order Groups</h3>
                <p class="text-sm text-purple-600 mt-1">Drag and drop or use buttons to reorder groups</p>
              </div>
              <div class="flex gap-3">
                <button
                  (click)="cancelOrderChanges()"
                  class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  (click)="saveGroupOrder()"
                  [disabled]="!isDirtyOrder || isLoading"
                  class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {{ isLoading ? 'Saving...' : 'Save Order' }}
                </button>
              </div>
            </div>

            <!-- Orderable Groups List -->
            <div class="space-y-3">
              <div *ngFor="let group of groupsForOrdering; let i = index"
                   class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex items-center justify-between">
                  <!-- Group Info -->
                  <div class="flex items-center gap-3 flex-1">
                    <div class="w-6 h-6 rounded" [style.background-color]="group.graph_color || '#6B7280'"></div>
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <h5 class="font-semibold text-gray-900">{{ group.name }}</h5>
                        <span class="text-sm text-gray-500">{{ group.code }}</span>
                      </div>
                      <p *ngIf="group.description" class="text-sm text-gray-600">{{ group.description }}</p>
                      <p class="text-xs text-gray-500 mt-1">{{ getTypesForGroup(group.id).length }} types</p>
                    </div>
                  </div>

                  <!-- Order Controls -->
                  <div class="flex items-center gap-2">
                    <!-- Current Order Display -->
                    <span class="text-sm text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                      #{{ i + 1 }}
                    </span>

                    <!-- Move Up Button -->
                    <button
                      (click)="moveGroupUp(i)"
                      [disabled]="i === 0"
                      class="p-1 text-purple-600 hover:text-purple-800 disabled:text-gray-300 rounded hover:bg-purple-50 disabled:hover:bg-transparent"
                      title="Move Up"
                    >
                      <i class="fas fa-chevron-up"></i>
                    </button>

                    <!-- Move Down Button -->
                    <button
                      (click)="moveGroupDown(i)"
                      [disabled]="i === groupsForOrdering.length - 1"
                      class="p-1 text-purple-600 hover:text-purple-800 disabled:text-gray-300 rounded hover:bg-purple-50 disabled:hover:bg-transparent"
                      title="Move Down"
                    >
                      <i class="fas fa-chevron-down"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Help Text -->
            <div class="mt-6 bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div class="flex items-start gap-3">
                <i class="fas fa-info-circle text-purple-600 mt-0.5"></i>
                <div class="text-sm text-purple-800">
                  <p class="font-medium mb-1">How to reorder groups:</p>
                  <ul class="space-y-1 text-purple-700">
                    <li>• Use the up/down arrow buttons to move groups one position at a time</li>
                    <li>• The order number shown reflects the current position</li>
                    <li>• Click "Save Order" to persist changes to the database</li>
                    <li>• Click "Cancel" to discard changes and return to groups list</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- Create/Edit Group Form -->
          <div *ngIf="currentView === 'create-group' || currentView === 'edit-group'">
            <div class="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h3 class="text-xl font-semibold text-blue-900 mb-6 flex items-center gap-2">
                <i class="fas text-lg" [class.fa-plus]="currentView === 'create-group'" [class.fa-edit]="currentView === 'edit-group'"></i>
                {{ currentView === 'create-group' ? 'Create New Group' : 'Edit Group' }}
              </h3>

              <form (ngSubmit)="currentView === 'create-group' ? createGroup() : updateGroup()" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Code *</label>
                  <input
                    type="text"
                    [(ngModel)]="currentGroupCode"
                    name="code"
                    required
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., REVENUE"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                  <input
                    type="text"
                    [(ngModel)]="currentGroupName"
                    name="name"
                    required
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Revenue Metrics"
                  />
                </div>

                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    [(ngModel)]="currentGroupDescription"
                    name="description"
                    rows="3"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Brief description of this group..."
                  ></textarea>
                </div>

                <div class="flex items-center gap-6">
                  <label class="flex items-center gap-2">
                    <input
                      type="checkbox"
                      [(ngModel)]="currentGroupShowTotal"
                      name="show_total"
                      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span class="text-sm text-gray-700">Show Total</span>
                  </label>

                  <label class="flex items-center gap-2">
                    <input
                      type="checkbox"
                      [(ngModel)]="currentGroupShowMargin"
                      name="show_margin"
                      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span class="text-sm text-gray-700">Show Margin</span>
                  </label>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Graph Color</label>
                  <input
                    type="color"
                    [(ngModel)]="currentGroupColor"
                    name="graph_color"
                    class="w-full h-10 border border-gray-300 rounded-md"
                  />
                </div>

                <div class="md:col-span-2 flex justify-end gap-3">
                  <button
                    type="button"
                    (click)="goBack()"
                    class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    [disabled]="isLoading"
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {{ isLoading ? (currentView === 'create-group' ? 'Creating...' : 'Updating...') : (currentView === 'create-group' ? 'Create Group' : 'Update Group') }}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Types List View -->
          <div *ngIf="currentView === 'types-list' && selectedGroup">
            <!-- Header with Group Info -->
            <div class="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-6 h-6 rounded" [style.background-color]="selectedGroup.graph_color || '#6B7280'"></div>
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900">{{ selectedGroup.name }}</h3>
                    <p class="text-sm text-gray-600">{{ selectedGroup.code }} • {{ getTypesForGroup(selectedGroup.id).length }} types</p>
                  </div>
                </div>
                <button
                  (click)="showCreateType()"
                  class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                  <i class="fas fa-plus"></i>
                  Create New Type
                </button>
              </div>
            </div>

            <!-- Types List -->
            <div *ngIf="getTypesForGroup(selectedGroup.id).length === 0" class="text-center py-12 text-gray-500">
              <i class="fas fa-chart-bar text-6xl mx-auto mb-4 text-gray-300 block"></i>
              <h3 class="text-lg font-semibold text-gray-700 mb-2">No Types Found</h3>
              <p class="mb-4">Create your first metric type for this group</p>
            </div>

            <div *ngIf="getTypesForGroup(selectedGroup.id).length > 0" class="space-y-3">
              <div *ngFor="let type of getTypesForGroup(selectedGroup.id)"
                   class="group bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
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

                        <!-- Categories Display -->
                        <span *ngIf="type.categories && type.categories.length > 0" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <i class="fas fa-tags mr-1"></i>
                          {{ type.categories.length }} categories
                        </span>
                      </div>

                      <!-- Categories List (if any) -->
                      <div *ngIf="type.categories && type.categories.length > 0" class="mt-2">
                        <div class="flex flex-wrap gap-1">
                          <span *ngFor="let category of type.categories.slice(0, 3)"
                                class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-50 text-gray-600 border">
                            {{ category.name }}
                          </span>
                          <span *ngIf="type.categories && type.categories.length > 3"
                                class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500">
                            +{{ type.categories.length - 3 }} more
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <button
                      (click)="showEditType(type)"
                      class="opacity-0 group-hover:opacity-100 text-blue-600 hover:text-blue-800 p-1 rounded transition-all"
                      title="Edit Type"
                    >
                      <i class="fas fa-edit text-sm"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Create/Edit Type Form -->
          <div *ngIf="currentView === 'create-type' || currentView === 'edit-type'">
            <div class="bg-green-50 rounded-lg p-6 border border-green-200">
              <h3 class="text-xl font-semibold text-green-900 mb-6 flex items-center gap-2">
                <i class="fas text-lg" [class.fa-plus]="currentView === 'create-type'" [class.fa-edit]="currentView === 'edit-type'"></i>
                {{ currentView === 'create-type' ? 'Create New Type' : 'Edit Type' }}
              </h3>

              <form (ngSubmit)="currentView === 'create-type' ? createType() : updateType()" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Code *</label>
                  <input
                    type="text"
                    [(ngModel)]="currentTypeCode"
                    name="code"
                    required
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="e.g., REVENUE_TOTAL"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                  <input
                    type="text"
                    [(ngModel)]="currentTypeName"
                    name="name"
                    required
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="e.g., Total Revenue"
                  />
                </div>

                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    [(ngModel)]="currentTypeDescription"
                    name="description"
                    rows="3"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Brief description of this metric type..."
                  ></textarea>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Unit *</label>
                  <select
                    [(ngModel)]="currentTypeUnit"
                    name="unit"
                    required
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="ZAR">ZAR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="COUNT">COUNT</option>
                    <option value="PERCENTAGE">PERCENTAGE</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Period Type *</label>
                  <select
                    [(ngModel)]="currentTypePeriodType"
                    name="period_type"
                    required
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>

                <div class="flex items-center gap-6">
                  <label class="flex items-center gap-2">
                    <input
                      type="checkbox"
                      [(ngModel)]="currentTypeShowTotal"
                      name="show_total"
                      class="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span class="text-sm text-gray-700">Show Total</span>
                  </label>

                  <label class="flex items-center gap-2">
                    <input
                      type="checkbox"
                      [(ngModel)]="currentTypeShowMargin"
                      name="show_margin"
                      class="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span class="text-sm text-gray-700">Show Margin</span>
                  </label>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Graph Color</label>
                  <input
                    type="color"
                    [(ngModel)]="currentTypeColor"
                    name="graph_color"
                    class="w-full h-10 border border-gray-300 rounded-md"
                  />
                </div>

                <!-- Category Management Section -->
                <div class="md:col-span-2">
                  <div class="border-t border-gray-200 pt-4">
                    <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <i class="fas fa-tags text-green-600"></i>
                      Category Management
                    </h4>
                    <p class="text-sm text-gray-600 mb-4">Select categories for this metric type (e.g., Balance Sheet Assets/Liabilities).</p>

                    <div class="space-y-4">
                      <!-- Available Categories Selection -->
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Available Categories</label>

                        <!-- Add New Category Input -->
                        <div class="flex gap-2 mb-3">
                          <input
                            type="text"
                            [(ngModel)]="newCategoryInput"
                            (keyup.enter)="addCategory()"
                            placeholder="Create new category..."
                            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                          />
                          <button
                            type="button"
                            (click)="addCategory()"
                            class="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-1"
                          >
                            <i class="fas fa-plus"></i>
                            Create
                          </button>
                        </div>

                        <!-- Category Selection List -->
                        <div *ngIf="availableCategories.length > 0" class="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                          <div *ngFor="let category of availableCategories"
                               class="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                            <label class="flex items-center gap-2 flex-1 cursor-pointer">
                              <input
                                type="checkbox"
                                [checked]="selectedCategoryIds.includes(category.id)"
                                (change)="toggleCategory(category.id)"
                                class="rounded border-gray-300 text-green-600 focus:ring-green-500"
                              />
                              <span class="text-sm text-gray-700">{{ category.name }}</span>
                              <span *ngIf="category.description" class="text-xs text-gray-500">({{ category.description }})</span>
                            </label>
                          </div>
                        </div>

                        <!-- Selected Categories Summary -->
                        <div *ngIf="selectedCategoryIds.length > 0" class="mt-4 p-3 bg-green-50 rounded-lg">
                          <div class="flex items-center gap-2 mb-2">
                            <i class="fas fa-check-circle text-green-600"></i>
                            <span class="text-sm font-medium text-green-800">Selected Categories ({{ selectedCategoryIds.length }})</span>
                          </div>
                          <div class="flex flex-wrap gap-2">
                            <span *ngFor="let category of currentTypeCategories"
                                  class="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                              {{ category.name }}
                              <button
                                type="button"
                                (click)="removeCategory(category.id)"
                                class="text-green-600 hover:text-green-800"
                                title="Remove category"
                              >
                                <i class="fas fa-times"></i>
                              </button>
                            </span>
                          </div>
                        </div>

                        <div *ngIf="availableCategories.length === 0"
                             class="text-sm text-gray-500 italic py-4 text-center bg-gray-50 rounded-lg">
                          No categories available. Create your first category above.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>                <div class="md:col-span-2 flex justify-end gap-3">
                  <button
                    type="button"
                    (click)="goBack()"
                    class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    [disabled]="isLoading"
                    class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {{ isLoading ? (currentView === 'create-type' ? 'Creating...' : 'Updating...') : (currentView === 'create-type' ? 'Create Type' : 'Update Type') }}
                  </button>
                </div>
              </form>
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

  // Navigation Views
  currentView: 'groups-list' | 'create-group' | 'edit-group' | 'types-list' | 'create-type' | 'edit-type' | 'order-groups' = 'groups-list';
  navigationHistory: string[] = [];

  // Order Management
  groupsForOrdering: IMetricGroup[] = [];
  isDirtyOrder: boolean = false;

  // Data
  groups: IMetricGroup[] = [];
  types: IMetricType[] = [];
  selectedGroup: IMetricGroup | null = null;
  editingGroup: IMetricGroup | null = null;
  editingType: IMetricType | null = null;

  // Form Models
  newGroup: CreateMetricGroupDto = this.resetGroupForm();
  newType: CreateMetricTypeDto = this.resetTypeForm();

  // Category Management
  availableCategories: ICategory[] = [];
  selectedCategoryIds: number[] = [];
  newCategoryInput: string = '';

  constructor(
    private metricsService: MetricsService,
    private categoryService: CategoryService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.loadMetricCategories();
  }

  // Group Form Getters/Setters
  get currentGroupCode(): string {
    return this.currentView === 'create-group' ? this.newGroup.code : (this.editingGroup?.code || '');
  }
  set currentGroupCode(value: string) {
    if (this.currentView === 'create-group') {
      this.newGroup.code = value;
    } else if (this.editingGroup) {
      this.editingGroup.code = value;
    }
  }

  get currentGroupName(): string {
    return this.currentView === 'create-group' ? this.newGroup.name : (this.editingGroup?.name || '');
  }
  set currentGroupName(value: string) {
    if (this.currentView === 'create-group') {
      this.newGroup.name = value;
    } else if (this.editingGroup) {
      this.editingGroup.name = value;
    }
  }

  get currentGroupDescription(): string {
    return this.currentView === 'create-group' ? (this.newGroup.description || '') : (this.editingGroup?.description || '');
  }
  set currentGroupDescription(value: string) {
    if (this.currentView === 'create-group') {
      this.newGroup.description = value;
    } else if (this.editingGroup) {
      this.editingGroup.description = value;
    }
  }

  get currentGroupShowTotal(): boolean {
    return this.currentView === 'create-group' ? !!this.newGroup.show_total : !!this.editingGroup?.show_total;
  }
  set currentGroupShowTotal(value: boolean) {
    if (this.currentView === 'create-group') {
      this.newGroup.show_total = value ? 1 : 0;
    } else if (this.editingGroup) {
      this.editingGroup.show_total = value ? 1 : 0;
    }
  }

  get currentGroupShowMargin(): boolean {
    return this.currentView === 'create-group' ? !!this.newGroup.show_margin : !!this.editingGroup?.show_margin;
  }
  set currentGroupShowMargin(value: boolean) {
    if (this.currentView === 'create-group') {
      this.newGroup.show_margin = value ? 1 : 0;
    } else if (this.editingGroup) {
      this.editingGroup.show_margin = value ? 1 : 0;
    }
  }

  get currentGroupColor(): string {
    return this.currentView === 'create-group' ? (this.newGroup.graph_color || '#6B7280') : (this.editingGroup?.graph_color || '#6B7280');
  }
  set currentGroupColor(value: string) {
    if (this.currentView === 'create-group') {
      this.newGroup.graph_color = value;
    } else if (this.editingGroup) {
      this.editingGroup.graph_color = value;
    }
  }

  // Type Form Getters/Setters
  get currentTypeCode(): string {
    return this.currentView === 'create-type' ? this.newType.code : (this.editingType?.code || '');
  }
  set currentTypeCode(value: string) {
    if (this.currentView === 'create-type') {
      this.newType.code = value;
    } else if (this.editingType) {
      this.editingType.code = value;
    }
  }

  get currentTypeName(): string {
    return this.currentView === 'create-type' ? this.newType.name : (this.editingType?.name || '');
  }
  set currentTypeName(value: string) {
    if (this.currentView === 'create-type') {
      this.newType.name = value;
    } else if (this.editingType) {
      this.editingType.name = value;
    }
  }

  get currentTypeDescription(): string {
    return this.currentView === 'create-type' ? (this.newType.description || '') : (this.editingType?.description || '');
  }
  set currentTypeDescription(value: string) {
    if (this.currentView === 'create-type') {
      this.newType.description = value;
    } else if (this.editingType) {
      this.editingType.description = value;
    }
  }

  get currentTypeUnit(): string {
    if (this.currentView === 'create-type') {
      return this.newType.unit || 'ZAR';
    }
    return this.editingType?.unit || 'ZAR';
  }
  set currentTypeUnit(value: string) {
    if (this.currentView === 'create-type') {
      this.newType.unit = value;
    } else if (this.editingType) {
      this.editingType.unit = value;
    }
  }

  get currentTypePeriodType(): MetricPeriodType {
    if (this.currentView === 'create-type') {
      return this.newType.period_type || 'QUARTERLY';
    }
    return this.editingType?.period_type || 'QUARTERLY';
  }
  set currentTypePeriodType(value: MetricPeriodType) {
    if (this.currentView === 'create-type') {
      this.newType.period_type = value;
    } else if (this.editingType) {
      this.editingType.period_type = value;
    }
  }

  get currentTypeShowTotal(): boolean {
    return this.currentView === 'create-type' ? !!this.newType.show_total : !!this.editingType?.show_total;
  }
  set currentTypeShowTotal(value: boolean) {
    if (this.currentView === 'create-type') {
      this.newType.show_total = value ? 1 : 0;
    } else if (this.editingType) {
      this.editingType.show_total = value ? 1 : 0;
    }
  }

  get currentTypeShowMargin(): boolean {
    return this.currentView === 'create-type' ? !!this.newType.show_margin : !!this.editingType?.show_margin;
  }
  set currentTypeShowMargin(value: boolean) {
    if (this.currentView === 'create-type') {
      this.newType.show_margin = value ? 1 : 0;
    } else if (this.editingType) {
      this.editingType.show_margin = value ? 1 : 0;
    }
  }

  get currentTypeColor(): string {
    return this.currentView === 'create-type' ? (this.newType.graph_color || '#1f77b4') : (this.editingType?.graph_color || '#1f77b4');
  }
  set currentTypeColor(value: string) {
    if (this.currentView === 'create-type') {
      this.newType.graph_color = value;
    } else if (this.editingType) {
      this.editingType.graph_color = value;
    }
  }

  // Category Management Methods
  get currentTypeAllowsCategories(): boolean {
    return this.selectedCategoryIds.length > 0;
  }

  get currentTypeCategories(): ICategory[] {
    return this.availableCategories.filter(cat => this.selectedCategoryIds.includes(cat.id));
  }

  async loadMetricCategories(): Promise<void> {
    try {
      this.availableCategories = await this.categoryService.getMetricCategories().toPromise() || [];
    } catch (error) {
      console.error('Error loading metric categories:', error);
      this.availableCategories = [];
    }
  }

  async loadTypeCategories(typeId: number): Promise<void> {
    try {
      const typeCategories = await this.categoryService.getMetricTypeCategories(typeId).toPromise() || [];
      this.selectedCategoryIds = typeCategories.map(cat => cat.id);
    } catch (error) {
      console.error('Error loading type categories:', error);
      this.selectedCategoryIds = [];
    }
  }

  async addCategory(): Promise<void> {
    if (this.newCategoryInput.trim()) {
      try {
        const newCategory = await this.categoryService.addMetricCategory(
          this.newCategoryInput.trim(),
          `Category for ${this.newCategoryInput.trim()}`
        ).toPromise();

        if (newCategory) {
          this.availableCategories.push(newCategory);
          this.selectedCategoryIds.push(newCategory.id);
          this.newCategoryInput = '';
        }
      } catch (error) {
        console.error('Error adding category:', error);
      }
    }
  }

  removeCategory(categoryId: number): void {
    this.selectedCategoryIds = this.selectedCategoryIds.filter(id => id !== categoryId);
  }

  toggleCategory(categoryId: number): void {
    if (this.selectedCategoryIds.includes(categoryId)) {
      this.selectedCategoryIds = this.selectedCategoryIds.filter(id => id !== categoryId);
    } else {
      this.selectedCategoryIds.push(categoryId);
    }
  }

  // Navigation Methods
  resetNavigation(): void {
    this.currentView = 'groups-list';
    this.selectedGroup = null;
    this.editingGroup = null;
    this.editingType = null;
    this.navigationHistory = [];
  }

  goBack(): void {
    switch (this.currentView) {
      case 'create-group':
      case 'edit-group':
        this.currentView = 'groups-list';
        this.editingGroup = null;
        break;
      case 'types-list':
        this.currentView = 'groups-list';
        this.selectedGroup = null;
        break;
      case 'create-type':
      case 'edit-type':
        this.currentView = 'types-list';
        this.editingType = null;
        break;
      case 'order-groups':
        this.currentView = 'groups-list';
        this.isDirtyOrder = false;
        this.groupsForOrdering = [];
        break;
      default:
        this.currentView = 'groups-list';
    }
  }

  showCreateGroup(): void {
    this.currentView = 'create-group';
    this.newGroup = this.resetGroupForm();
  }

  showEditGroup(group: IMetricGroup): void {
    this.currentView = 'edit-group';
    this.editingGroup = { ...group };
  }

  showGroupTypes(group: IMetricGroup): void {
    this.selectedGroup = group;
    this.currentView = 'types-list';
  }

  showCreateType(): void {
    this.currentView = 'create-type';
    this.newType = this.resetTypeForm();
    this.selectedCategoryIds = [];
    if (this.selectedGroup) {
      this.newType.group_id = this.selectedGroup.id;
    }
  }

  async showEditType(type: IMetricType): Promise<void> {
    this.currentView = 'edit-type';
    this.editingType = { ...type };
    await this.loadTypeCategories(type.id);
  }

  getSubtitle(): string {
    switch (this.currentView) {
      case 'groups-list':
        return 'Manage your metric groups and types';
      case 'create-group':
        return 'Create a new metric group';
      case 'edit-group':
        return 'Edit metric group details';
      case 'types-list':
        return `Manage types for ${this.selectedGroup?.name || 'group'}`;
      case 'create-type':
        return `Create a new type in ${this.selectedGroup?.name || 'group'}`;
      case 'edit-type':
        return 'Edit metric type details';
      case 'order-groups':
        return 'Reorder metric groups';
      default:
        return '';
    }
  }

  // Order Management Methods
  showOrderGroups(): void {
    this.currentView = 'order-groups';
    // Create a copy of groups array sorted by order_no
    this.groupsForOrdering = [...this.groups].sort((a, b) => (a.order_no || 0) - (b.order_no || 0));
    this.isDirtyOrder = false;
  }

  moveGroupUp(index: number): void {
    if (index > 0 && index < this.groupsForOrdering.length) {
      // Swap with previous item
      const temp = this.groupsForOrdering[index];
      this.groupsForOrdering[index] = this.groupsForOrdering[index - 1];
      this.groupsForOrdering[index - 1] = temp;
      this.isDirtyOrder = true;
    }
  }

  moveGroupDown(index: number): void {
    if (index >= 0 && index < this.groupsForOrdering.length - 1) {
      // Swap with next item
      const temp = this.groupsForOrdering[index];
      this.groupsForOrdering[index] = this.groupsForOrdering[index + 1];
      this.groupsForOrdering[index + 1] = temp;
      this.isDirtyOrder = true;
    }
  }

  cancelOrderChanges(): void {
    this.currentView = 'groups-list';
    this.isDirtyOrder = false;
    this.groupsForOrdering = [];
  }

  async saveGroupOrder(): Promise<void> {
    if (!this.isDirtyOrder || this.groupsForOrdering.length === 0) return;

    try {
      this.isLoading = true;

      // Create order update payload - assign order_no based on current position
      const orderUpdates: UpdateMetricGroupOrderDto[] = this.groupsForOrdering.map((group, index) => ({
        id: group.id,
        order_no: index + 1
      }));

      await this.metricsService.updateGroupOrder(orderUpdates).toPromise();

      // Reload data to reflect new order
      await this.loadData();
      this.dataUpdated.emit();

      // Return to groups list
      this.currentView = 'groups-list';
      this.isDirtyOrder = false;
      this.groupsForOrdering = [];

    } catch (error) {
      console.error('Failed to update group order:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Modal Controls
  open(): void {
    this.isOpen = true;
    this.resetNavigation();
    this.loadData();
  }

  openModal(): void {
    this.open();
  }

  closeModal(): void {
    this.isOpen = false;
    this.resetNavigation();
    this.modalClosed.emit();
  }

  // Data Operations
  async loadData(): Promise<void> {
    try {
      this.isLoading = true;
      // Load groups and types separately
      const groups = await this.metricsService.listGroups(this.clientId).toPromise();
      // Sort groups by order_no for consistent display
      this.groups = (groups || []).sort((a, b) => (a.order_no || 0) - (b.order_no || 0));

      // Load types for all groups using enhanced endpoint that includes categories
      this.types = [];
      for (const group of this.groups) {
        const groupTypes = await this.http.get<IMetricType[]>(`${Constants.ApiBase}/api-nodes/metric-type/list-metric-types.php?group_id=${group.id}`).toPromise();
        this.types = [...this.types, ...(groupTypes || [])];
      }
    } catch (error) {
      console.error('Failed to load metrics data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  getTypesForGroup(groupId: number): IMetricType[] {
    return this.types.filter(type => type.group_id === groupId);
  }

  // Group CRUD Operations
  async createGroup(): Promise<void> {
    if (!this.newGroup.code || !this.newGroup.name) return;

    try {
      this.isLoading = true;
      await this.metricsService.addGroup(this.newGroup).toPromise();
      await this.loadData();
      this.dataUpdated.emit();
      this.currentView = 'groups-list';
    } catch (error) {
      console.error('Failed to create group:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async updateGroup(): Promise<void> {
    if (!this.editingGroup) return;

    try {
      this.isLoading = true;
      const updateDto = { ...this.editingGroup };
      await this.metricsService.updateGroup(updateDto).toPromise();
      await this.loadData();
      this.dataUpdated.emit();
      this.currentView = 'groups-list';
    } catch (error) {
      console.error('Failed to update group:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Type CRUD Operations
  async createType(): Promise<void> {
    if (!this.newType.code || !this.newType.name || !this.selectedGroup) return;

    try {
      this.isLoading = true;
      this.newType.group_id = this.selectedGroup.id;

      // Use enhanced metrics endpoint for better category handling
      const createPayload = {
        ...this.newType,
        category_ids: [...this.selectedCategoryIds]
      };

      const createdType = await this.http.post<IMetricType>(`${Constants.ApiBase}/api-nodes/enhanced-metrics.php`, {
        action: 'create-type',
        ...createPayload
      }).toPromise();

      await this.loadData();
      this.dataUpdated.emit();
      this.currentView = 'types-list';
    } catch (error) {
      console.error('Failed to create type:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async updateType(): Promise<void> {
    if (!this.editingType) return;

    try {
      this.isLoading = true;

      // Use enhanced metrics endpoint for category updates
      const updatePayload = {
        action: 'update-type',
        ...this.editingType,
        category_ids: [...this.selectedCategoryIds]
      };

      const updatedType = await this.http.put<IMetricType>(`${Constants.ApiBase}/api-nodes/enhanced-metrics.php`, updatePayload).toPromise();

      await this.loadData();
      this.dataUpdated.emit();
      this.currentView = 'types-list';
    } catch (error) {
      console.error('Failed to update type:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Form Reset Helpers
  private resetGroupForm(): CreateMetricGroupDto {
    return {
      client_id: this.clientId,
      code: '',
      name: '',
      description: '',
      show_total: 1,
      show_margin: 0,
      graph_color: '#6B7280'
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
      period_type: 'QUARTERLY',
      category_ids: []
    };
  }
}
