import { Component, Input, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import {
  SwotAnalysis,
  SwotItem,
  initSwotAnalysis,
  initSwotItem
} from '../../../../../models/swot.models';
import { NodeService } from '../../../../../services/node.service';
import { INode } from '../../../../../models/schema';
import { ICompany } from '../../../../../models/simple.schema';
import { SwotActionPlanExportService } from '../../../../../services/pdf/swot-action-plan-export.service';
import { CompanyService } from '../../../../../services';

@Component({
  selector: 'app-swot-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 p-8">
      <!-- Header -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">SWOT Analysis</h2>
            <p class="text-sm text-gray-600 mt-1">
              Analyze your business's Strengths, Weaknesses, Opportunities, and Threats
            </p>
          </div>
          <div class="flex items-center space-x-4">
            <div class="text-right">
              <div class="text-lg font-semibold text-gray-900">{{ getTotalItemsCount() }} Items</div>
              <div class="text-sm text-gray-500">Total Analysis Points</div>
            </div>
            <button
              (click)="exportActionPlan()"
              [disabled]="getActionItems().length === 0"
              class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed mr-2"
            >
              📄 Export Action Plan PDF
            </button>
            <button
              (click)="saveSwotAnalysis()"
              [disabled]="saving"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {{ saving ? 'Saving...' : 'Save Analysis' }}
            </button>
          </div>
        </div>
      </div>

      <!-- SWOT Matrix -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- INTERNAL FACTORS -->
        <div class="space-y-6">
          <h3 class="text-lg font-medium text-gray-900 text-center bg-gray-50 py-2 rounded-md">INTERNAL</h3>

          <!-- STRENGTHS -->
          <div class="bg-green-50 border border-green-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-md font-medium text-green-800">Strengths</h4>
              <button
                (click)="addStrength()"
                class="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
              >
                Add Strength
              </button>
            </div>

            <div class="space-y-3">
              <div
                *ngFor="let strength of swotData?.internal?.strengths || []; let i = index"
                class="bg-white p-3 rounded-md border border-green-300"
              >
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Strength Description</label>
                    <textarea
                      [(ngModel)]="strength.description"
                      (change)="onDataChange()"
                      rows="2"
                      class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                      placeholder="Describe this strength..."
                    ></textarea>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Action Required</label>
                    <textarea
                      [(ngModel)]="strength.action_required"
                      (change)="onDataChange()"
                      rows="2"
                      class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                      placeholder="What action is needed..."
                    ></textarea>
                  </div>
                </div>

                <!-- Action Details Row -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Assigned To</label>
                    <input
                      [(ngModel)]="strength.assigned_to"
                      (change)="onDataChange()"
                      type="text"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                      placeholder="Who will handle this..."
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      [(ngModel)]="strength.target_date"
                      (change)="onDataChange()"
                      type="date"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <select
                      [(ngModel)]="strength.status"
                      (change)="onDataChange()"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="identified">📝 Identified</option>
                      <option value="planning">📋 Planning</option>
                      <option value="in_progress">⚙️ In Progress</option>
                      <option value="completed">✅ Completed</option>
                      <option value="on_hold">⏸️ On Hold</option>
                    </select>
                  </div>
                </div>

                <div class="flex items-center justify-between mt-3">
                  <div class="flex items-center space-x-4">
                    <select
                      [(ngModel)]="strength.priority"
                      (change)="onDataChange()"
                      class="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="critical">Critical</option>
                    </select>

                    <select
                      [(ngModel)]="strength.impact"
                      (change)="onDataChange()"
                      class="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="low">Low Impact</option>
                      <option value="medium">Medium Impact</option>
                      <option value="high">High Impact</option>
                    </select>
                  </div>

                  <button
                    (click)="removeStrength(i)"
                    class="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div *ngIf="!swotData?.internal?.strengths?.length" class="text-center py-4 text-gray-500 text-sm">
                No strengths added yet. Click "Add Strength" to get started.
              </div>
            </div>
          </div>

          <!-- WEAKNESSES -->
          <div class="bg-red-50 border border-red-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-md font-medium text-red-800">Weaknesses</h4>
              <button
                (click)="addWeakness()"
                class="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
              >
                Add Weakness
              </button>
            </div>

            <div class="space-y-3">
              <div
                *ngFor="let weakness of swotData?.internal?.weaknesses || []; let i = index"
                class="bg-white p-3 rounded-md border border-red-300"
              >
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Weakness Description</label>
                    <textarea
                      [(ngModel)]="weakness.description"
                      (change)="onDataChange()"
                      rows="2"
                      class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-red-500 focus:border-red-500"
                      placeholder="Describe this weakness..."
                    ></textarea>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Action Required</label>
                    <textarea
                      [(ngModel)]="weakness.action_required"
                      (change)="onDataChange()"
                      rows="2"
                      class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-red-500 focus:border-red-500"
                      placeholder="What action is needed..."
                    ></textarea>
                  </div>
                </div>

                <!-- Action Details Row -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Assigned To</label>
                    <input
                      [(ngModel)]="weakness.assigned_to"
                      (change)="onDataChange()"
                      type="text"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-red-500 focus:border-red-500"
                      placeholder="Who will handle this..."
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      [(ngModel)]="weakness.target_date"
                      (change)="onDataChange()"
                      type="date"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <select
                      [(ngModel)]="weakness.status"
                      (change)="onDataChange()"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="identified">📝 Identified</option>
                      <option value="planning">📋 Planning</option>
                      <option value="in_progress">⚙️ In Progress</option>
                      <option value="completed">✅ Completed</option>
                      <option value="on_hold">⏸️ On Hold</option>
                    </select>
                  </div>
                </div>

                <div class="flex items-center justify-between mt-3">
                  <div class="flex items-center space-x-4">
                    <select
                      [(ngModel)]="weakness.priority"
                      (change)="onDataChange()"
                      class="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="critical">Critical</option>
                    </select>

                    <select
                      [(ngModel)]="weakness.impact"
                      (change)="onDataChange()"
                      class="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="low">Low Impact</option>
                      <option value="medium">Medium Impact</option>
                      <option value="high">High Impact</option>
                    </select>
                  </div>

                  <button
                    (click)="removeWeakness(i)"
                    class="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div *ngIf="!swotData?.internal?.weaknesses?.length" class="text-center py-4 text-gray-500 text-sm">
                No weaknesses added yet. Click "Add Weakness" to get started.
              </div>
            </div>
          </div>
        </div>

        <!-- EXTERNAL FACTORS -->
        <div class="space-y-6">
          <h3 class="text-lg font-medium text-gray-900 text-center bg-gray-50 py-2 rounded-md">EXTERNAL</h3>

          <!-- OPPORTUNITIES -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-md font-medium text-blue-800">Opportunities</h4>
              <button
                (click)="addOpportunity()"
                class="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                Add Opportunity
              </button>
            </div>

            <div class="space-y-3">
              <div
                *ngFor="let opportunity of swotData?.external?.opportunities || []; let i = index"
                class="bg-white p-3 rounded-md border border-blue-300"
              >
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Opportunity Description</label>
                    <textarea
                      [(ngModel)]="opportunity.description"
                      (change)="onDataChange()"
                      rows="2"
                      class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Describe this opportunity..."
                    ></textarea>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Action Required</label>
                    <textarea
                      [(ngModel)]="opportunity.action_required"
                      (change)="onDataChange()"
                      rows="2"
                      class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      placeholder="What action is needed..."
                    ></textarea>
                  </div>
                </div>

                <!-- Action Details Row -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Assigned To</label>
                    <input
                      [(ngModel)]="opportunity.assigned_to"
                      (change)="onDataChange()"
                      type="text"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Who will handle this..."
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      [(ngModel)]="opportunity.target_date"
                      (change)="onDataChange()"
                      type="date"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <select
                      [(ngModel)]="opportunity.status"
                      (change)="onDataChange()"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="identified">📝 Identified</option>
                      <option value="planning">📋 Planning</option>
                      <option value="in_progress">⚙️ In Progress</option>
                      <option value="completed">✅ Completed</option>
                      <option value="on_hold">⏸️ On Hold</option>
                    </select>
                  </div>
                </div>

                <div class="flex items-center justify-between mt-3">
                  <div class="flex items-center space-x-4">
                    <select
                      [(ngModel)]="opportunity.priority"
                      (change)="onDataChange()"
                      class="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="critical">Critical</option>
                    </select>

                    <select
                      [(ngModel)]="opportunity.impact"
                      (change)="onDataChange()"
                      class="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="low">Low Impact</option>
                      <option value="medium">Medium Impact</option>
                      <option value="high">High Impact</option>
                    </select>
                  </div>

                  <button
                    (click)="removeOpportunity(i)"
                    class="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div *ngIf="!swotData?.external?.opportunities?.length" class="text-center py-4 text-gray-500 text-sm">
                No opportunities added yet. Click "Add Opportunity" to get started.
              </div>
            </div>
          </div>

          <!-- THREATS -->
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-md font-medium text-yellow-800">Threats</h4>
              <button
                (click)="addThreat()"
                class="px-3 py-1 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700"
              >
                Add Threat
              </button>
            </div>

            <div class="space-y-3">
              <div
                *ngFor="let threat of swotData?.external?.threats || []; let i = index"
                class="bg-white p-3 rounded-md border border-yellow-300"
              >
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Threat Description</label>
                    <textarea
                      [(ngModel)]="threat.description"
                      (change)="onDataChange()"
                      rows="2"
                      class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-yellow-500 focus:border-yellow-500"
                      placeholder="Describe this threat..."
                    ></textarea>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Action Required</label>
                    <textarea
                      [(ngModel)]="threat.action_required"
                      (change)="onDataChange()"
                      rows="2"
                      class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-yellow-500 focus:border-yellow-500"
                      placeholder="What action is needed..."
                    ></textarea>
                  </div>
                </div>

                <!-- Action Details Row -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Assigned To</label>
                    <input
                      [(ngModel)]="threat.assigned_to"
                      (change)="onDataChange()"
                      type="text"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-yellow-500 focus:border-yellow-500"
                      placeholder="Who will handle this..."
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      [(ngModel)]="threat.target_date"
                      (change)="onDataChange()"
                      type="date"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-yellow-500 focus:border-yellow-500"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <select
                      [(ngModel)]="threat.status"
                      (change)="onDataChange()"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-yellow-500 focus:border-yellow-500"
                    >
                      <option value="identified">📝 Identified</option>
                      <option value="planning">📋 Planning</option>
                      <option value="in_progress">⚙️ In Progress</option>
                      <option value="completed">✅ Completed</option>
                      <option value="on_hold">⏸️ On Hold</option>
                    </select>
                  </div>
                </div>

                <div class="flex items-center justify-between mt-3">
                  <div class="flex items-center space-x-4">
                    <select
                      [(ngModel)]="threat.priority"
                      (change)="onDataChange()"
                      class="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-yellow-500 focus:border-yellow-500"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="critical">Critical</option>
                    </select>

                    <select
                      [(ngModel)]="threat.impact"
                      (change)="onDataChange()"
                      class="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-yellow-500 focus:border-yellow-500"
                    >
                      <option value="low">Low Impact</option>
                      <option value="medium">Medium Impact</option>
                      <option value="high">High Impact</option>
                    </select>
                  </div>

                  <button
                    (click)="removeThreat(i)"
                    class="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div *ngIf="!swotData?.external?.threats?.length" class="text-center py-4 text-gray-500 text-sm">
                No threats added yet. Click "Add Threat" to get started.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Analysis Summary -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Analysis Summary</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Overall Summary</label>
            <textarea
              [(ngModel)]="swotData.summary"
              (change)="onDataChange()"
              rows="4"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Provide an overall summary of your SWOT analysis..."
            ></textarea>
          </div>

          <!-- Action Items Summary -->
          <div class="bg-white rounded-lg shadow-sm border p-6 mt-6" *ngIf="getActionItems().length > 0">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-medium text-gray-900">Action Items Summary</h3>
              <span class="text-sm text-gray-500">{{ getActionItems().length }} total actions</span>
            </div>

            <div class="space-y-3">
              <div
                *ngFor="let item of getActionItems()"
                class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <h4 class="font-medium text-gray-900">{{ item.action_required }}</h4>
                    <p class="text-sm text-gray-600 mt-1">{{ item.description }}</p>

                    <div class="flex items-center space-x-4 mt-2">
                      <!-- Category -->
                      <span
                        class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                        [ngClass]="{
                          'bg-green-100 text-green-800': item.category === 'strength',
                          'bg-red-100 text-red-800': item.category === 'weakness',
                          'bg-blue-100 text-blue-800': item.category === 'opportunity',
                          'bg-yellow-100 text-yellow-800': item.category === 'threat'
                        }"
                      >
                        {{ item.category | titlecase }}
                      </span>

                      <!-- Priority -->
                      <span
                        class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                        [ngClass]="{
                          'bg-gray-100 text-gray-800': item.priority === 'low',
                          'bg-orange-100 text-orange-800': item.priority === 'medium',
                          'bg-red-100 text-red-800': item.priority === 'high',
                          'bg-purple-100 text-purple-800': item.priority === 'critical'
                        }"
                      >
                        {{ item.priority | titlecase }}
                      </span>

                      <!-- Status -->
                      <span
                        class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                        [ngClass]="{
                          'bg-gray-100 text-gray-800': item.status === 'identified',
                          'bg-blue-100 text-blue-800': item.status === 'planning',
                          'bg-yellow-100 text-yellow-800': item.status === 'in_progress',
                          'bg-green-100 text-green-800': item.status === 'completed',
                          'bg-red-100 text-red-800': item.status === 'on_hold'
                        }"
                      >
                        {{ getStatusDisplay(item.status) }}
                      </span>

                      <!-- Assigned To -->
                      <div *ngIf="item.assigned_to" class="flex items-center text-xs text-gray-500">
                        <i class="fas fa-user mr-1"></i>
                        {{ item.assigned_to }}
                      </div>

                      <!-- Due Date -->
                      <div *ngIf="item.target_date" class="flex items-center text-xs"
                           [ngClass]="{
                             'text-red-600': isOverdue(item.target_date),
                             'text-orange-600': isDueSoon(item.target_date),
                             'text-gray-500': !isOverdue(item.target_date) && !isDueSoon(item.target_date)
                           }">
                        <i class="fas fa-calendar mr-1"></i>
                        {{ item.target_date | date:'MMM d, y' }}
                        <span *ngIf="isOverdue(item.target_date)" class="ml-1 font-medium">(Overdue)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div class="bg-green-50 p-4 rounded-lg text-center">
              <div class="text-2xl font-bold text-green-600">{{ swotData.internal.strengths.length || 0 }}</div>
              <div class="text-sm text-green-700">Strengths</div>
            </div>
            <div class="bg-red-50 p-4 rounded-lg text-center">
              <div class="text-2xl font-bold text-red-600">{{ swotData.internal.weaknesses.length || 0 }}</div>
              <div class="text-sm text-red-700">Weaknesses</div>
            </div>
            <div class="bg-blue-50 p-4 rounded-lg text-center">
              <div class="text-2xl font-bold text-blue-600">{{ swotData.external.opportunities.length || 0 }}</div>
              <div class="text-sm text-blue-700">Opportunities</div>
            </div>
            <div class="bg-yellow-50 p-4 rounded-lg text-center">
              <div class="text-2xl font-bold text-yellow-600">{{ swotData.external.threats.length || 0 }}</div>
              <div class="text-sm text-yellow-700">Threats</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./swot-tab.component.scss']
})
export class SwotTabComponent implements OnInit, OnDestroy {
  @Input() company: ICompany | null = null;
  companyId = signal<number>(0);
  swotData: SwotAnalysis = initSwotAnalysis('');
  swotNode: INode<SwotAnalysis> | null = null;
  loading = false;
  saving = false;
  isDirty = false;

  private destroy$ = new Subject<void>();
  private autoSaveTimeout: any;
  private route = inject(ActivatedRoute);
  private companyService = inject(CompanyService);

  constructor(
    private nodeService: NodeService<any>,
    private router: Router,
    private swotExportService: SwotActionPlanExportService
  ) { }

  ngOnInit(): void {
    const companyId = +this.route.parent?.snapshot.params['id'];
    this.companyId.set(companyId);
    if (!this.company) {
      this.getCompany();
    } else {
      this.loadSwotData();
    }
  }

  getCompany() {
    this.companyService.getCompanyById(this.companyId()).subscribe((company) => {
      this.company = company;
      this.loadSwotData();
    });
  }

  ngOnDestroy(): void {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadSwotData(): void {
    if (!this.company?.id) return;

    this.loading = true;
    this.nodeService.getNodesByCompany(this.company.id, 'swot_analysis')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (nodes) => {
          if (nodes.length > 0) {
            this.swotNode = nodes[0] as INode<SwotAnalysis>;
            this.swotData = { ...this.swotNode.data };
          } else {
            this.swotData = initSwotAnalysis(this.company?.id?.toString() || '');
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading SWOT data:', error);
          this.loading = false;
        }
      });
  }


  private getDatePlusWeeks(weeks: number): string {
    const date = new Date();
    date.setDate(date.getDate() + (weeks * 7));
    return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format for HTML date input
  }

  onDataChange(): void {
    this.isDirty = true;

    // Auto-save after 2 seconds of inactivity
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    this.autoSaveTimeout = setTimeout(() => {
      if (this.isDirty && !this.saving) {
        this.saveSwotAnalysis();
      }
    }, 2000);
  }

  // Strengths methods
  addStrength(): void {
    if (!this.swotData.internal.strengths) {
      this.swotData.internal.strengths = [];
    }
    this.swotData.internal.strengths.push(initSwotItem('', 'strength'));
    this.onDataChange();
  }

  removeStrength(index: number): void {
    this.swotData.internal.strengths.splice(index, 1);
    this.onDataChange();
  }

  // Weaknesses methods
  addWeakness(): void {
    if (!this.swotData.internal.weaknesses) {
      this.swotData.internal.weaknesses = [];
    }
    this.swotData.internal.weaknesses.push(initSwotItem('', 'weakness'));
    this.onDataChange();
  }

  removeWeakness(index: number): void {
    this.swotData.internal.weaknesses.splice(index, 1);
    this.onDataChange();
  }

  // Opportunities methods
  addOpportunity(): void {
    if (!this.swotData.external.opportunities) {
      this.swotData.external.opportunities = [];
    }
    this.swotData.external.opportunities.push(initSwotItem('', 'opportunity'));
    this.onDataChange();
  }

  removeOpportunity(index: number): void {
    this.swotData.external.opportunities.splice(index, 1);
    this.onDataChange();
  }

  // Threats methods
  addThreat(): void {
    if (!this.swotData.external.threats) {
      this.swotData.external.threats = [];
    }
    this.swotData.external.threats.push(initSwotItem('', 'threat'));
    this.onDataChange();
  }

  removeThreat(index: number): void {
    this.swotData.external.threats.splice(index, 1);
    this.onDataChange();
  }

  getTotalItemsCount(): number {
    return (
      (this.swotData?.internal?.strengths?.length || 0) +
      (this.swotData?.internal?.weaknesses?.length || 0) +
      (this.swotData?.external?.opportunities?.length || 0) +
      (this.swotData?.external?.threats?.length || 0)
    );
  }

  getActionItems(): SwotItem[] {
    const items: SwotItem[] = [];

    // Collect items that have action_required defined
    if (this.swotData?.internal?.strengths) {
      items.push(...this.swotData.internal.strengths.filter(item => item.action_required));
    }
    if (this.swotData?.internal?.weaknesses) {
      items.push(...this.swotData.internal.weaknesses.filter(item => item.action_required));
    }
    if (this.swotData?.external?.opportunities) {
      items.push(...this.swotData.external.opportunities.filter(item => item.action_required));
    }
    if (this.swotData?.external?.threats) {
      items.push(...this.swotData.external.threats.filter(item => item.action_required));
    }

    return items;
  }

  getStatusDisplay(status: string): string {
    switch (status) {
      case 'identified': return '📝 Identified';
      case 'planning': return '📋 Planning';
      case 'in_progress': return '⚙️ In Progress';
      case 'completed': return '✅ Completed';
      case 'on_hold': return '⏸️ On Hold';
      default: return status;
    }
  }

  isOverdue(dateString: string | undefined): boolean {
    if (!dateString) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateString);
    return dueDate < today;
  }

  isDueSoon(dateString: string | undefined): boolean {
    if (!dateString) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateString);
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);
    threeDaysFromNow.setHours(0, 0, 0, 0);
    return dueDate >= today && dueDate <= threeDaysFromNow;
  }

  exportActionPlan(): void {
    if (!this.company?.id) return;

    // Convert current SWOT data to action plan format
    const actionPlanData = this.swotExportService.convertSwotToActionPlan(
      { data: this.swotData },
      this.company.name || 'Company',
      this.company.id.toString()
    );

    if (actionPlanData.actionItems.length === 0) {
      alert('No action items found. Please add actions to your SWOT analysis items.');
      return;
    }

    // Generate PDF directly
    this.swotExportService.generateActionPlanPDF(actionPlanData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          // Create download link
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${this.company?.name || 'Company'}_SWOT_Action_Plan_${new Date().toISOString().split('T')[0]}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Error generating PDF:', error);
          alert('Error generating PDF. Please try again.');
        }
      });
  }

  saveSwotAnalysis(): void {
    if (!this.company?.id) return;

    this.saving = true;
    this.swotData.last_updated = new Date();
    this.swotData.company_id = this.company.id.toString();

    const operation = this.swotNode
      ? this.nodeService.updateNode({ ...this.swotNode, data: this.swotData })
      : this.nodeService.addNode({
        company_id: this.company.id,
        type: 'swot_analysis',
        data: this.swotData
      } as INode<SwotAnalysis>);

    operation.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (savedNode) => {
          this.swotNode = savedNode;
          this.saving = false;
          this.isDirty = false;
          // Show success message
          this.showSuccessMessage('SWOT Analysis saved successfully!');
        },
        error: (error) => {
          console.error('Error saving SWOT analysis:', error);
          this.saving = false;
          this.showErrorMessage('Failed to save SWOT analysis. Please try again.');
        }
      });
  }

  private showSuccessMessage(message: string): void {
    // Simple alert for now - could be replaced with a toast notification
    console.log(message);
  }

  private showErrorMessage(message: string): void {
    // Simple alert for now - could be replaced with a toast notification
    alert(message);
  }
}
