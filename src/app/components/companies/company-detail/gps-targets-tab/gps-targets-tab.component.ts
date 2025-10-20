import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import {
  GpsTargets,
  initGpsTargets,
  initGpsTarget,
} from '../../../../../models/gps-targets.models';
import { NodeService } from '../../../../../services/node.service';
import { INode } from '../../../../../models/schema';
import { ICompany } from '../../../../../models/simple.schema';
import { GpsTargetsExportService } from '../../../../../services/pdf/gps-targets-export.service';

@Component({
  selector: 'app-gps-targets-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">🎯 GPS Targets</h2>
            <p class="text-sm text-gray-600 mt-1">
              Goal Setting and Performance System - Track your business targets
              across different categories
            </p>
          </div>
          <div class="flex items-center space-x-4">
            <div class="text-right">
              <div class="text-lg font-semibold text-gray-900">
                {{ getTotalTargetsCount() }} Targets
              </div>
              <div class="text-sm text-gray-500">
                {{ getCompletionPercentage() }}% Complete
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <button
                (click)="saveGpsTargets()"
                [disabled]="saving"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {{ saving ? 'Saving...' : 'Save Targets' }}
              </button>
              <button
                (click)="exportPdf()"
                [disabled]="exporting || saving"
                class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {{ exporting ? 'Exporting...' : 'Export PDF' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- GPS Targets Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- STRATEGY/GENERAL TARGETS -->
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-purple-800">
              Strategy/General Targets
            </h3>
            <button
              (click)="addTarget('strategy_general')"
              class="px-3 py-1 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700"
            >
              Add Target
            </button>
          </div>

          <div class="space-y-4">
            <div
              *ngFor="
                let target of gpsData?.strategy_general?.targets || [];
                let i = index
              "
              class="border border-gray-200 rounded-lg p-4"
            >
              <div class="space-y-3">
                <!-- Target Description -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1"
                    >Target Description</label
                  >
                  <textarea
                    [(ngModel)]="target.description"
                    (change)="onDataChange()"
                    rows="2"
                    class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Describe the target..."
                  ></textarea>
                </div>

                <!-- Evidence and Due Date Row -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1"
                      >Evidence</label
                    >
                    <textarea
                      [(ngModel)]="target.evidence"
                      (change)="onDataChange()"
                      rows="2"
                      class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
                      placeholder="What evidence will prove completion..."
                    ></textarea>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1"
                      >Due Date</label
                    >
                    <input
                      [(ngModel)]="target.due_date"
                      (change)="onDataChange()"
                      type="date"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>

                <!-- Status, Priority, Assigned To -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1"
                      >Status</label
                    >
                    <select
                      [(ngModel)]="target.status"
                      (change)="onDataChange()"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="not_started">🚀 Not Started</option>
                      <option value="in_progress">⚙️ In Progress</option>
                      <option value="completed">✅ Completed</option>
                      <option value="overdue">⚠️ Overdue</option>
                      <option value="cancelled">❌ Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1"
                      >Priority</label
                    >
                    <select
                      [(ngModel)]="target.priority"
                      (change)="onDataChange()"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1"
                      >Assigned To</label
                    >
                    <input
                      [(ngModel)]="target.assigned_to"
                      (change)="onDataChange()"
                      type="text"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Who is responsible..."
                    />
                  </div>
                </div>

                <!-- Progress and Actions -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <label class="text-xs font-medium text-gray-700"
                      >Progress:</label
                    >
                    <input
                      [(ngModel)]="target.progress_percentage"
                      (change)="onDataChange()"
                      type="range"
                      min="0"
                      max="100"
                      class="w-20"
                    />
                    <span class="text-xs text-gray-600"
                      >{{ target.progress_percentage }}%</span
                    >
                  </div>

                  <button
                    (click)="removeTarget('strategy_general', i)"
                    class="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>

            <div
              *ngIf="!gpsData?.strategy_general?.targets?.length"
              class="text-center py-4 text-gray-500 text-sm"
            >
              No strategy targets added yet. Click "Add Target" to get started.
            </div>
          </div>
        </div>

        <!-- FINANCE TARGETS -->
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-green-800">Finance Targets</h3>
            <button
              (click)="addTarget('finance')"
              class="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
            >
              Add Target
            </button>
          </div>

          <div class="space-y-4">
            <div
              *ngFor="
                let target of gpsData?.finance?.targets || [];
                let i = index
              "
              class="border border-gray-200 rounded-lg p-4"
            >
              <div class="space-y-3">
                <!-- Target Description -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1"
                    >Target Description</label
                  >
                  <textarea
                    [(ngModel)]="target.description"
                    (change)="onDataChange()"
                    rows="2"
                    class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                    placeholder="Describe the target..."
                  ></textarea>
                </div>

                <!-- Evidence and Due Date Row -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1"
                      >Evidence</label
                    >
                    <textarea
                      [(ngModel)]="target.evidence"
                      (change)="onDataChange()"
                      rows="2"
                      class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                      placeholder="What evidence will prove completion..."
                    ></textarea>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1"
                      >Due Date</label
                    >
                    <input
                      [(ngModel)]="target.due_date"
                      (change)="onDataChange()"
                      type="date"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>

                <!-- Status, Priority, Assigned To -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1"
                      >Status</label
                    >
                    <select
                      [(ngModel)]="target.status"
                      (change)="onDataChange()"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="not_started">🚀 Not Started</option>
                      <option value="in_progress">⚙️ In Progress</option>
                      <option value="completed">✅ Completed</option>
                      <option value="overdue">⚠️ Overdue</option>
                      <option value="cancelled">❌ Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1"
                      >Priority</label
                    >
                    <select
                      [(ngModel)]="target.priority"
                      (change)="onDataChange()"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1"
                      >Assigned To</label
                    >
                    <input
                      [(ngModel)]="target.assigned_to"
                      (change)="onDataChange()"
                      type="text"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                      placeholder="Who is responsible..."
                    />
                  </div>
                </div>

                <!-- Progress and Actions -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <label class="text-xs font-medium text-gray-700"
                      >Progress:</label
                    >
                    <input
                      [(ngModel)]="target.progress_percentage"
                      (change)="onDataChange()"
                      type="range"
                      min="0"
                      max="100"
                      class="w-20"
                    />
                    <span class="text-xs text-gray-600"
                      >{{ target.progress_percentage }}%</span
                    >
                  </div>

                  <button
                    (click)="removeTarget('finance', i)"
                    class="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>

            <div
              *ngIf="!gpsData?.finance?.targets?.length"
              class="text-center py-4 text-gray-500 text-sm"
            >
              No finance targets added yet. Click "Add Target" to get started.
            </div>
          </div>
        </div>

        <!-- SALES & MARKETING TARGETS -->
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-blue-800">
              Sales & Marketing Targets
            </h3>
            <button
              (click)="addTarget('sales_marketing')"
              class="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              Add Target
            </button>
          </div>

          <div class="space-y-4">
            <div
              *ngFor="
                let target of gpsData?.sales_marketing?.targets || [];
                let i = index
              "
              class="border border-gray-200 rounded-lg p-4"
            >
              <div class="space-y-3">
                <!-- Target Description -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1"
                    >Target Description</label
                  >
                  <textarea
                    [(ngModel)]="target.description"
                    (change)="onDataChange()"
                    rows="2"
                    class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe the target..."
                  ></textarea>
                </div>

                <!-- Evidence and Due Date Row -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1"
                      >Evidence</label
                    >
                    <textarea
                      [(ngModel)]="target.evidence"
                      (change)="onDataChange()"
                      rows="2"
                      class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      placeholder="What evidence will prove completion..."
                    ></textarea>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1"
                      >Due Date</label
                    >
                    <input
                      [(ngModel)]="target.due_date"
                      (change)="onDataChange()"
                      type="date"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <!-- Status, Priority, Assigned To -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1"
                      >Status</label
                    >
                    <select
                      [(ngModel)]="target.status"
                      (change)="onDataChange()"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="not_started">🚀 Not Started</option>
                      <option value="in_progress">⚙️ In Progress</option>
                      <option value="completed">✅ Completed</option>
                      <option value="overdue">⚠️ Overdue</option>
                      <option value="cancelled">❌ Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1"
                      >Priority</label
                    >
                    <select
                      [(ngModel)]="target.priority"
                      (change)="onDataChange()"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1"
                      >Assigned To</label
                    >
                    <input
                      [(ngModel)]="target.assigned_to"
                      (change)="onDataChange()"
                      type="text"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Who is responsible..."
                    />
                  </div>
                </div>

                <!-- Progress and Actions -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <label class="text-xs font-medium text-gray-700"
                      >Progress:</label
                    >
                    <input
                      [(ngModel)]="target.progress_percentage"
                      (change)="onDataChange()"
                      type="range"
                      min="0"
                      max="100"
                      class="w-20"
                    />
                    <span class="text-xs text-gray-600"
                      >{{ target.progress_percentage }}%</span
                    >
                  </div>

                  <button
                    (click)="removeTarget('sales_marketing', i)"
                    class="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>

            <div
              *ngIf="!gpsData?.sales_marketing?.targets?.length"
              class="text-center py-4 text-gray-500 text-sm"
            >
              No sales & marketing targets added yet. Click "Add Target" to get
              started.
            </div>
          </div>
        </div>

        <!-- PERSONAL DEVELOPMENT TARGETS -->
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-orange-800">
              Personal Development Targets
            </h3>
            <button
              (click)="addTarget('personal_development')"
              class="px-3 py-1 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700"
            >
              Add Target
            </button>
          </div>

          <div class="space-y-4">
            <div
              *ngFor="
                let target of gpsData?.personal_development?.targets || [];
                let i = index
              "
              class="border border-gray-200 rounded-lg p-4"
            >
              <div class="space-y-3">
                <!-- Target Description -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1"
                    >Target Description</label
                  >
                  <textarea
                    [(ngModel)]="target.description"
                    (change)="onDataChange()"
                    rows="2"
                    class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Describe the target..."
                  ></textarea>
                </div>

                <!-- Evidence and Due Date Row -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1"
                      >Evidence</label
                    >
                    <textarea
                      [(ngModel)]="target.evidence"
                      (change)="onDataChange()"
                      rows="2"
                      class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-orange-500 focus:border-orange-500"
                      placeholder="What evidence will prove completion..."
                    ></textarea>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1"
                      >Due Date</label
                    >
                    <input
                      [(ngModel)]="target.due_date"
                      (change)="onDataChange()"
                      type="date"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>

                <!-- Status, Priority, Assigned To -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1"
                      >Status</label
                    >
                    <select
                      [(ngModel)]="target.status"
                      (change)="onDataChange()"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="not_started">🚀 Not Started</option>
                      <option value="in_progress">⚙️ In Progress</option>
                      <option value="completed">✅ Completed</option>
                      <option value="overdue">⚠️ Overdue</option>
                      <option value="cancelled">❌ Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1"
                      >Priority</label
                    >
                    <select
                      [(ngModel)]="target.priority"
                      (change)="onDataChange()"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1"
                      >Assigned To</label
                    >
                    <input
                      [(ngModel)]="target.assigned_to"
                      (change)="onDataChange()"
                      type="text"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Who is responsible..."
                    />
                  </div>
                </div>

                <!-- Progress and Actions -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <label class="text-xs font-medium text-gray-700"
                      >Progress:</label
                    >
                    <input
                      [(ngModel)]="target.progress_percentage"
                      (change)="onDataChange()"
                      type="range"
                      min="0"
                      max="100"
                      class="w-20"
                    />
                    <span class="text-xs text-gray-600"
                      >{{ target.progress_percentage }}%</span
                    >
                  </div>

                  <button
                    (click)="removeTarget('personal_development', i)"
                    class="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>

            <div
              *ngIf="!gpsData?.personal_development?.targets?.length"
              class="text-center py-4 text-gray-500 text-sm"
            >
              No personal development targets added yet. Click "Add Target" to
              get started.
            </div>
          </div>
        </div>
      </div>

      <!-- Overall Summary -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">
          Overall GPS Targets Summary
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-purple-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-purple-600">
              {{ gpsData.strategy_general.targets.length || 0 }}
            </div>
            <div class="text-sm text-purple-700">Strategy/General</div>
          </div>
          <div class="bg-green-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-green-600">
              {{ gpsData.finance.targets.length || 0 }}
            </div>
            <div class="text-sm text-green-700">Finance</div>
          </div>
          <div class="bg-blue-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-blue-600">
              {{ gpsData.sales_marketing.targets.length || 0 }}
            </div>
            <div class="text-sm text-blue-700">Sales & Marketing</div>
          </div>
          <div class="bg-orange-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-orange-600">
              {{ gpsData.personal_development.targets.length || 0 }}
            </div>
            <div class="text-sm text-orange-700">Personal Development</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./gps-targets-tab.component.scss'],
})
export class GpsTargetsTabComponent implements OnInit, OnDestroy {
  @Input() company: ICompany | null = null;

  gpsData: GpsTargets = initGpsTargets('');
  gpsNode: INode<GpsTargets> | null = null;
  loading = false;
  saving = false;
  exporting = false;
  isDirty = false;

  private destroy$ = new Subject<void>();
  private autoSaveTimeout: any;

  constructor(
    private nodeService: NodeService<any>,
    private gpsExport: GpsTargetsExportService
  ) {}

  ngOnInit(): void {
    this.loadGpsData();
  }

  ngOnDestroy(): void {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadGpsData(): void {
    if (!this.company?.id) return;

    this.loading = true;
    this.nodeService
      .getNodesByCompany(this.company.id, 'gps_targets')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (nodes) => {
          if (nodes.length > 0) {
            this.gpsNode = nodes[0] as INode<GpsTargets>;
            this.gpsData = { ...this.gpsNode.data };
          } else {
            this.gpsData = initGpsTargets(this.company?.id?.toString() || '');
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading GPS data:', error);
          this.loading = false;
        },
      });
  }

  onDataChange(): void {
    this.isDirty = true;

    // Auto-save after 2 seconds of inactivity
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    this.autoSaveTimeout = setTimeout(() => {
      if (this.isDirty && !this.saving) {
        this.saveGpsTargets();
      }
    }, 2000);
  }

  addTarget(
    category: keyof Pick<
      GpsTargets,
      | 'strategy_general'
      | 'finance'
      | 'sales_marketing'
      | 'personal_development'
    >
  ): void {
    if (!this.gpsData[category].targets) {
      this.gpsData[category].targets = [];
    }
    this.gpsData[category].targets.push(initGpsTarget());
    this.onDataChange();
  }

  removeTarget(
    category: keyof Pick<
      GpsTargets,
      | 'strategy_general'
      | 'finance'
      | 'sales_marketing'
      | 'personal_development'
    >,
    index: number
  ): void {
    this.gpsData[category].targets.splice(index, 1);
    this.onDataChange();
  }

  getTotalTargetsCount(): number {
    return (
      (this.gpsData.strategy_general.targets.length || 0) +
      (this.gpsData.finance.targets.length || 0) +
      (this.gpsData.sales_marketing.targets.length || 0) +
      (this.gpsData.personal_development.targets.length || 0)
    );
  }

  getCompletionPercentage(): number {
    const allTargets = [
      ...this.gpsData.strategy_general.targets,
      ...this.gpsData.finance.targets,
      ...this.gpsData.sales_marketing.targets,
      ...this.gpsData.personal_development.targets,
    ];

    if (allTargets.length === 0) return 0;

    const totalProgress = allTargets.reduce(
      (sum, target) => sum + target.progress_percentage,
      0
    );
    return Math.round(totalProgress / allTargets.length);
  }

  saveGpsTargets(): void {
    if (!this.company?.id) return;

    this.saving = true;
    this.gpsData.last_updated = new Date();
    this.gpsData.company_id = this.company.id.toString();

    const operation = this.gpsNode
      ? this.nodeService.updateNode({ ...this.gpsNode, data: this.gpsData })
      : this.nodeService.addNode({
          company_id: this.company.id,
          type: 'gps_targets',
          data: this.gpsData,
        } as INode<GpsTargets>);

    operation.pipe(takeUntil(this.destroy$)).subscribe({
      next: (savedNode) => {
        this.gpsNode = savedNode;
        this.saving = false;
        this.isDirty = false;
        // Show success message
        this.showSuccessMessage('GPS Targets saved successfully!');
      },
      error: (error) => {
        console.error('Error saving GPS targets:', error);
        this.saving = false;
        this.showErrorMessage('Failed to save GPS targets. Please try again.');
      },
    });
  }

  exportPdf(): void {
    if (!this.company?.id) return;
    this.exporting = true;

    const proceed = () => {
      const exportData = this.gpsExport.convertNodeToExport(
        this.gpsData,
        this.company!.name || 'Company',
        this.company!.id!.toString()
      );
      this.gpsExport.generateGpsTargetsPDF(exportData).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${(this.company?.name || 'company').replace(
            /[^a-z0-9_-]+/gi,
            '_'
          )}_GPS_Targets.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          this.exporting = false;
        },
        error: (err) => {
          console.error('Export failed', err);
          this.exporting = false;
          this.showErrorMessage('Failed to export GPS Targets PDF.');
        },
      });
    };

    if (this.isDirty) {
      this.saveGpsTargets();
      const check = () => {
        if (!this.saving) {
          proceed();
        } else {
          setTimeout(check, 300);
        }
      };
      check();
    } else {
      proceed();
    }
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
