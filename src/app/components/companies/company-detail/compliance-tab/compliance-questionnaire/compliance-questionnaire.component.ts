import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import {
  ComplianceQuestionnaire,
  ComplianceItem,
  ComplianceStatus,
  CompliancePriority,
  ComplianceCategory,
  initComplianceQuestionnaire,
  calculateComplianceScore,
  getComplianceStatusColor,
  getPriorityColor,
  getCategoryIcon
} from '../../../../../../models/compliance.models';
import { NodeService } from '../../../../../../services/node.service';
import { INode } from '../../../../../../models/schema';
import { ICompany } from '../../../../../../models/simple.schema';

@Component({
  selector: 'app-compliance-questionnaire',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header with Statistics -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">📋 Compliance Questionnaire</h2>
            <p class="text-sm text-gray-600 mt-1">
              Comprehensive compliance tracking across all business areas
            </p>
          </div>
          <div class="flex items-center space-x-4">
            <div class="text-right">
              <div class="text-3xl font-bold text-blue-600">{{ complianceData.overall_compliance_score }}%</div>
              <div class="text-sm text-gray-500">Overall Compliance</div>
            </div>
            <button
              (click)="saveCompliance()"
              [disabled]="saving"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {{ saving ? 'Saving...' : 'Save Compliance' }}
            </button>
          </div>
        </div>

        <!-- Compliance Statistics -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div class="bg-green-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-green-600">{{ getStatusCount('yes') }}</div>
            <div class="text-sm text-green-700">Compliant</div>
          </div>
          <div class="bg-red-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-red-600">{{ getStatusCount('no') }}</div>
            <div class="text-sm text-red-700">Non-Compliant</div>
          </div>
          <div class="bg-yellow-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-yellow-600">{{ getStatusCount('pending') }}</div>
            <div class="text-sm text-yellow-700">Pending</div>
          </div>
          <div class="bg-gray-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-gray-600">{{ getStatusCount('na') }}</div>
            <div class="text-sm text-gray-700">Not Applicable</div>
          </div>
        </div>
      </div>

      <!-- Filter and Search -->
      <div class="bg-white rounded-lg shadow-sm border p-4">
        <div class="flex flex-col md:flex-row gap-4">
          <div class="flex-1">
            <input
              [(ngModel)]="searchTerm"
              (ngModelChange)="applyFilters()"
              type="text"
              placeholder="Search compliance items..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <select
              [(ngModel)]="selectedCategory"
              (ngModelChange)="applyFilters()"
              class="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              <option value="financial">💰 Financial</option>
              <option value="legal">⚖️ Legal</option>
              <option value="employment">👥 Employment</option>
              <option value="tax">🏛️ Tax</option>
              <option value="insurance">🛡️ Insurance</option>
              <option value="intellectual_property">💡 IP</option>
              <option value="health_safety">🛡️ Health & Safety</option>
              <option value="regulatory">📋 Regulatory</option>
            </select>
          </div>
          <div>
            <select
              [(ngModel)]="selectedStatus"
              (ngModelChange)="applyFilters()"
              class="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="yes">✅ Compliant</option>
              <option value="no">❌ Non-Compliant</option>
              <option value="pending">⏳ Pending</option>
              <option value="na">➖ Not Applicable</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Compliance Items -->
      <div class="space-y-4">
        <div
          *ngFor="let item of filteredItems; let i = index"
          class="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <!-- Item Header -->
              <div class="flex items-center space-x-3 mb-3">
                <span class="text-lg">{{ getCategoryIcon(item.category) }}</span>
                <h3 class="text-lg font-medium text-gray-900">{{ item.sustainability_brick_name }}</h3>
                <span [class]="'px-2 py-1 rounded-full text-xs font-medium border ' + getPriorityColor(item.priority)">
                  {{ item.priority | titlecase }}
                </span>
              </div>

              <!-- Description -->
              <p class="text-sm text-gray-700 mb-4">{{ item.description }}</p>

              <!-- Status Selection -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-2">Compliance Status</label>
                  <div class="flex space-x-2">
                    <button
                      (click)="updateItemStatus(item, 'yes')"
                      [class]="'px-3 py-1 rounded-md text-xs font-medium border transition-colors ' +
                               (item.status === 'yes' ? getComplianceStatusColor('yes') : 'text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-100')"
                    >
                      {{ getStatusLabel('yes') }}
                    </button>
                    <button
                      (click)="updateItemStatus(item, 'no')"
                      [class]="'px-3 py-1 rounded-md text-xs font-medium border transition-colors ' +
                               (item.status === 'no' ? getComplianceStatusColor('no') : 'text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-100')"
                    >
                      {{ getStatusLabel('no') }}
                    </button>
                    <button
                      (click)="updateItemStatus(item, 'pending')"
                      [class]="'px-3 py-1 rounded-md text-xs font-medium border transition-colors ' +
                               (item.status === 'pending' ? getComplianceStatusColor('pending') : 'text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-100')"
                    >
                      {{ getStatusLabel('pending') }}
                    </button>
                    <button
                      (click)="updateItemStatus(item, 'na')"
                      [class]="'px-3 py-1 rounded-md text-xs font-medium border transition-colors ' +
                               (item.status === 'na' ? getComplianceStatusColor('na') : 'text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-100')"
                    >
                      {{ getStatusLabel('na') }}
                    </button>
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-2">Due Date (if applicable)</label>
                  <input
                    [(ngModel)]="item.due_date"
                    (change)="onDataChange()"
                    type="date"
                    class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <!-- Additional Fields -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Responsible Person</label>
                  <input
                    [(ngModel)]="item.responsible_person"
                    (change)="onDataChange()"
                    type="text"
                    class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Who is responsible..."
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Evidence File</label>
                  <input
                    [(ngModel)]="item.evidence_file"
                    (change)="onDataChange()"
                    type="text"
                    class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Evidence/document reference..."
                  />
                </div>
              </div>

              <!-- Notes -->
              <div class="mt-4">
                <label class="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  [(ngModel)]="item.notes"
                  (change)="onDataChange()"
                  rows="2"
                  class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Additional notes, actions required, etc..."
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="filteredItems.length === 0" class="text-center py-8 text-gray-500">
          No compliance items match your current filters.
        </div>
      </div>

      <!-- Overall Notes -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Overall Compliance Notes</h3>
        <textarea
          [(ngModel)]="complianceData.notes"
          (change)="onDataChange()"
          rows="4"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="Add any general compliance notes, action plans, or observations..."
        ></textarea>
      </div>
    </div>
  `,
  styleUrls: ['./compliance-questionnaire.component.scss']
})
export class ComplianceQuestionnaireComponent implements OnInit, OnDestroy {
  @Input() company: ICompany | null = null;

  complianceData: ComplianceQuestionnaire = initComplianceQuestionnaire('');
  complianceNode: INode<ComplianceQuestionnaire> | null = null;
  loading = false;
  saving = false;
  isDirty = false;

  // Filtering
  searchTerm = '';
  selectedCategory: ComplianceCategory | '' = '';
  selectedStatus: ComplianceStatus | '' = '';
  filteredItems: ComplianceItem[] = [];

  private destroy$ = new Subject<void>();
  private autoSaveTimeout: any;

  constructor(private nodeService: NodeService<any>) {}

  ngOnInit(): void {
    this.loadComplianceData();
  }

  ngOnDestroy(): void {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadComplianceData(): void {
    if (!this.company?.id) return;

    this.loading = true;
    this.nodeService.getNodesByCompany(this.company.id, 'compliance_questionnaire')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (nodes: any[]) => {
          if (nodes.length > 0) {
            this.complianceNode = nodes[0] as INode<ComplianceQuestionnaire>;
            this.complianceData = { ...this.complianceNode.data };
          } else {
            this.complianceData = initComplianceQuestionnaire(this.company?.id?.toString() || '');
          }
          this.applyFilters();
          this.updateComplianceScore();
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error loading compliance data:', error);
          this.loading = false;
        }
      });
  }

  onDataChange(): void {
    this.isDirty = true;
    this.updateComplianceScore();

    // Auto-save after 2 seconds of inactivity
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    this.autoSaveTimeout = setTimeout(() => {
      if (this.isDirty && !this.saving) {
        this.saveCompliance();
      }
    }, 2000);
  }

  updateItemStatus(item: ComplianceItem, status: ComplianceStatus): void {
    item.status = status;
    this.onDataChange();
  }

  private updateComplianceScore(): void {
    this.complianceData.overall_compliance_score = calculateComplianceScore(this.complianceData.compliance_items);
  }

  applyFilters(): void {
    let filtered = this.complianceData.compliance_items;

    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter((item: ComplianceItem) =>
        item.sustainability_brick_name.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (this.selectedCategory) {
      filtered = filtered.filter((item: ComplianceItem) => item.category === this.selectedCategory);
    }

    // Status filter
    if (this.selectedStatus) {
      filtered = filtered.filter((item: ComplianceItem) => item.status === this.selectedStatus);
    }

    this.filteredItems = filtered;
  }

  getStatusCount(status: ComplianceStatus): number {
    return this.complianceData.compliance_items.filter((item: ComplianceItem) => item.status === status).length;
  }

  getStatusLabel(status: ComplianceStatus): string {
    switch (status) {
      case 'yes': return '✅ Yes';
      case 'no': return '❌ No';
      case 'pending': return '⏳ Pending';
      case 'na': return '➖ N/A';
      default: return status;
    }
  }

  getCategoryIcon(category: ComplianceCategory): string {
    return getCategoryIcon(category);
  }

  getComplianceStatusColor(status: ComplianceStatus): string {
    return getComplianceStatusColor(status);
  }

  getPriorityColor(priority: CompliancePriority): string {
    return getPriorityColor(priority);
  }

  saveCompliance(): void {
    if (!this.company?.id) return;

    this.saving = true;
    this.complianceData.last_updated = new Date();
    this.complianceData.company_id = this.company.id.toString();

    const operation = this.complianceNode
      ? this.nodeService.updateNode({ ...this.complianceNode, data: this.complianceData })
      : this.nodeService.addNode({
          company_id: this.company.id,
          type: 'compliance_questionnaire',
          data: this.complianceData
        } as INode<ComplianceQuestionnaire>);

    operation.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (savedNode: any) => {
          this.complianceNode = savedNode;
          this.saving = false;
          this.isDirty = false;
          this.showSuccessMessage('Compliance data saved successfully!');
        },
        error: (error: any) => {
          console.error('Error saving compliance data:', error);
          this.saving = false;
          this.showErrorMessage('Failed to save compliance data. Please try again.');
        }
      });
  }

  private showSuccessMessage(message: string): void {
    console.log(message);
  }

  private showErrorMessage(message: string): void {
    alert(message);
  }
}
