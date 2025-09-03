import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { NodeService } from '../../../services/node.service';
import { SwotAnalysis, SwotItem } from '../../../models/swot.models';
import { INode } from '../../../models/schema';
import html2pdf from 'html2pdf.js';

interface ActionPlanItem {
  priority: 'critical' | 'high' | 'medium' | 'low';
  priorityLabel: string;
  description: string;
  action_required: string;
  assigned_to?: string;
  target_date?: string;
  status: string;
  impact: string;
  category: string;
  source: 'strength' | 'weakness' | 'opportunity' | 'threat' | 'gps_target';
}

@Component({
  selector: 'app-action-plan-export',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50 py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Header -->
        <div class="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">{{ companyName }} - Priorities Action Plan</h1>
              <p class="text-gray-600 mt-1">
                Generated from {{ sourceLabel }} on {{ exportDate | date:'fullDate' }}
              </p>
            </div>
            <div class="flex space-x-4">
              <button
                (click)="goBack()"
                class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                ← Back
              </button>
              <button
                (click)="exportToPDF()"
                [disabled]="loading || isGenerating"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <span *ngIf="isGenerating" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                {{ isGenerating ? 'Generating PDF...' : '📄 Export PDF' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="loading" class="text-center py-12">
          <div class="text-gray-600">Loading action plan data...</div>
        </div>

        <!-- Action Plan Table -->
        <div *ngIf="!loading" class="bg-white">
          <!-- PDF Content Wrapper -->
          <div id="pdf-content" class="w-full max-w-none bg-white p-8 mx-auto" style="width: 794px; margin: 0 auto;">

            <!-- PDF Header -->
            <div style="text-align: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 1.5rem; margin-bottom: 1.5rem;">
              <div style="width: 4rem; height: 4rem; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 0.5rem; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.5rem;">
                {{ companyName.charAt(0) }}
              </div>
              <h1 style="font-size: 1.5rem; font-weight: bold; color: #111827; margin-bottom: 0.5rem;">{{ companyName }} - Priorities Action Plan</h1>
              <p style="color: #4b5563;">Generated from {{ sourceLabel }}</p>
              <p style="font-size: 0.875rem; color: #6b7280;">Generated on {{ exportDate | date:'fullDate' }}</p>
            </div>

            <!-- Action Plan Content -->
            <div class="rounded-lg shadow-sm border overflow-hidden">
              <div style="padding: 1.5rem 1.5rem 1rem; border-bottom: 1px solid #e5e7eb; background-color: #eff6ff;">
                <h2 style="font-size: 1.125rem; font-weight: 600; color: #111827; margin: 0;">Top Strategic Priorities | Actions</h2>
              </div>

              <!-- Priority Groups -->
              <div *ngFor="let priorityGroup of priorityGroups; let priorityIndex = index" style="border-bottom: 1px solid #e5e7eb;" class="last:border-b-0">
                <!-- Priority Header -->
                <div style="padding: 0.75rem 1.5rem; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                  <h3 style="font-weight: 600; color: #374151; margin: 0;">
                    Priority #{{ priorityIndex + 1 }}: {{ getPriorityTitle(priorityGroup.priority) }}
                  </h3>
                </div>

                <!-- Action Items -->
                <div>
                  <div *ngFor="let item of priorityGroup.items; let itemIndex = index" style="padding: 1rem 1.5rem; border-bottom: 1px solid #f3f4f6;" class="last:border-b-0">

                    <!-- Table-like layout for PDF -->
                    <table style="width: 100%; font-size: 0.875rem; border-collapse: collapse;">
                      <tr>
                        <td style="width: 8%; padding-right: 1rem; vertical-align: top;">
                          <span style="font-weight: 500; color: #6b7280;">
                            {{ priorityIndex + 1 }}.{{ itemIndex + 1 }}
                          </span>
                        </td>
                        <td style="width: 35%; padding-right: 1rem; vertical-align: top;">
                          <div style="font-weight: 500; color: #111827; margin-bottom: 0.25rem;">{{ item.action_required }}</div>
                          <div style="font-size: 0.75rem; color: #6b7280;">({{ item.description }})</div>
                        </td>
                        <td style="width: 15%; padding-right: 1rem; vertical-align: top;">
                          <span style="display: inline-block; padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500;"
                                [ngClass]="{
                                  'bg-green-100 text-green-800': item.source === 'strength',
                                  'bg-red-100 text-red-800': item.source === 'weakness',
                                  'bg-blue-100 text-blue-800': item.source === 'opportunity',
                                  'bg-yellow-100 text-yellow-800': item.source === 'threat',
                                  'bg-purple-100 text-purple-800': item.source === 'gps_target'
                                }"
                                style="background-color: #f3f4f6; color: #374151;">
                            {{ getSourceLabel(item.source) }}
                          </span>
                        </td>
                        <td style="width: 15%; padding-right: 1rem; vertical-align: top;">
                          <div style="font-size: 0.875rem; color: #111827;">{{ item.assigned_to || 'Not assigned' }}</div>
                        </td>
                        <td style="width: 12%; padding-right: 1rem; vertical-align: top;">
                          <span style="display: inline-block; padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500;"
                                [ngClass]="{
                                  'bg-gray-100 text-gray-800': item.status === 'identified',
                                  'bg-blue-100 text-blue-800': item.status === 'planning',
                                  'bg-yellow-100 text-yellow-800': item.status === 'in_progress',
                                  'bg-green-100 text-green-800': item.status === 'completed',
                                  'bg-red-100 text-red-800': item.status === 'on_hold'
                                }"
                                style="background-color: #f3f4f6; color: #374151;">
                            {{ getStatusDisplay(item.status) }}
                          </span>
                        </td>
                        <td style="width: 15%; vertical-align: top;">
                          <div *ngIf="item.target_date" style="font-size: 0.875rem;"
                               [style.color]="isOverdue(item.target_date) ? '#dc2626' : isDueSoon(item.target_date) ? '#ea580c' : '#111827'"
                               [style.font-weight]="isOverdue(item.target_date) || isDueSoon(item.target_date) ? '500' : '400'">
                            {{ item.target_date | date:'MMM d, y' }}
                            <span *ngIf="isOverdue(item.target_date)" style="font-size: 0.75rem;">(Overdue)</span>
                          </div>
                          <div *ngIf="!item.target_date" style="font-size: 0.875rem; color: #9ca3af;">No due date</div>
                        </td>
                      </tr>
                    </table>
                  </div>
                </div>
              </div>

              <!-- Summary Footer -->
              <div style="padding: 1rem 1.5rem; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; text-align: center;">
                  <div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #dc2626;">{{ getTotalByPriority('critical') }}</div>
                    <div style="font-size: 0.875rem; color: #6b7280;">Critical</div>
                  </div>
                  <div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #ea580c;">{{ getTotalByPriority('high') }}</div>
                    <div style="font-size: 0.875rem; color: #6b7280;">High</div>
                  </div>
                  <div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #d97706;">{{ getTotalByPriority('medium') }}</div>
                    <div style="font-size: 0.875rem; color: #6b7280;">Medium</div>
                  </div>
                  <div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #6b7280;">{{ getTotalByPriority('low') }}</div>
                    <div style="font-size: 0.875rem; color: #6b7280;">Low</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- PDF Footer -->
            <div style="text-align: center; font-size: 0.75rem; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 1rem; margin-top: 2rem;">
              <p>This action plan was generated on {{ exportDate | date:'medium' }}</p>
              <p>Action items are based on {{ sourceLabel.toLowerCase() }} analysis for {{ companyName }}</p>
            </div>
          </div>
        </div>

        <!-- No Data -->
        <div *ngIf="!loading && priorityGroups.length === 0" class="bg-white rounded-lg shadow-sm border p-12 text-center">
          <div class="text-gray-500">
            <div class="text-lg font-medium mb-2">No Action Items Found</div>
            <div>No action items are available for this {{ sourceLabel.toLowerCase() }}.</div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ActionPlanExportComponent implements OnInit, OnDestroy {
  companyId!: number;
  companyName = '';
  source = '';
  sourceLabel = '';
  exportDate = new Date();
  loading = true;
  isGenerating = false;

  actionItems: ActionPlanItem[] = [];
  priorityGroups: { priority: string; items: ActionPlanItem[] }[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private nodeService: NodeService<any>
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.companyId = +params['companyId'];
      this.companyName = params['companyName'] || 'Company';
      this.source = params['source'] || 'swot';
      this.sourceLabel = this.source === 'swot' ? 'SWOT Analysis' : 'GPS Targets';

      this.loadActionPlanData();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadActionPlanData(): void {
    this.loading = true;

    if (this.source === 'swot') {
      this.loadSwotActionItems();
    } else if (this.source === 'gps') {
      this.loadGpsActionItems();
    }
  }

  private loadSwotActionItems(): void {
    this.nodeService.getNodesByCompany(this.companyId, 'swot_analysis')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (nodes: any) => {
          if (nodes.length > 0) {
            // Get the most recent SWOT analysis
            const swotNode = nodes[0] as INode<SwotAnalysis>;
            const swotData = swotNode.data;

            this.actionItems = this.extractSwotActionItems(swotData);
            this.groupActionItemsByPriority();
          }
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error loading SWOT data:', error);
          this.loading = false;
        }
      });
  }

  private loadGpsActionItems(): void {
    // TODO: Implement GPS targets loading when GPS models are available
    this.actionItems = [];
    this.groupActionItemsByPriority();
    this.loading = false;
  }

  private extractSwotActionItems(swotData: SwotAnalysis): ActionPlanItem[] {
    const items: ActionPlanItem[] = [];

    // Extract from strengths
    if (swotData.internal?.strengths) {
      items.push(...swotData.internal.strengths
        .filter((item: any) => item.action_required)
        .map((item: any) => this.mapSwotItemToActionItem(item, 'strength')));
    }

    // Extract from weaknesses
    if (swotData.internal?.weaknesses) {
      items.push(...swotData.internal.weaknesses
        .filter((item: any) => item.action_required)
        .map((item: any) => this.mapSwotItemToActionItem(item, 'weakness')));
    }

    // Extract from opportunities
    if (swotData.external?.opportunities) {
      items.push(...swotData.external.opportunities
        .filter((item: any) => item.action_required)
        .map((item: any) => this.mapSwotItemToActionItem(item, 'opportunity')));
    }

    // Extract from threats
    if (swotData.external?.threats) {
      items.push(...swotData.external.threats
        .filter((item: any) => item.action_required)
        .map((item: any) => this.mapSwotItemToActionItem(item, 'threat')));
    }

    return items;
  }

  private mapSwotItemToActionItem(item: any, source: 'strength' | 'weakness' | 'opportunity' | 'threat'): ActionPlanItem {
    return {
      priority: item.priority || 'medium',
      priorityLabel: this.getPriorityLabel(item.priority || 'medium'),
      description: item.description || '',
      action_required: item.action_required || '',
      assigned_to: item.assigned_to,
      target_date: item.target_date,
      status: item.status || 'identified',
      impact: item.impact || 'medium',
      category: item.category || source,
      source: source
    };
  }

  private groupActionItemsByPriority(): void {
    const priorityOrder = ['critical', 'high', 'medium', 'low'];

    this.priorityGroups = priorityOrder
      .map(priority => ({
        priority,
        items: this.actionItems.filter(item => item.priority === priority)
      }))
      .filter(group => group.items.length > 0);
  }

  getPriorityTitle(priority: string): string {
    const priorityTitles: { [key: string]: string } = {
      critical: 'Critical Priority Actions',
      high: 'High Priority Actions',
      medium: 'Medium Priority Actions',
      low: 'Low Priority Actions'
    };
    return priorityTitles[priority] || 'Actions';
  }

  getPriorityLabel(priority: string): string {
    const labels: { [key: string]: string } = {
      critical: 'Critical',
      high: 'High',
      medium: 'Medium',
      low: 'Low'
    };
    return labels[priority] || 'Medium';
  }

  getSourceLabel(source: string): string {
    const labels: { [key: string]: string } = {
      strength: 'Strength',
      weakness: 'Weakness',
      opportunity: 'Opportunity',
      threat: 'Threat',
      gps_target: 'GPS Target'
    };
    return labels[source] || source;
  }

  getStatusDisplay(status: string): string {
    const displays: { [key: string]: string } = {
      identified: 'Identified',
      planning: 'Planning',
      in_progress: 'In Progress',
      completed: 'Completed',
      on_hold: 'On Hold'
    };
    return displays[status] || status;
  }

  getTotalByPriority(priority: string): number {
    return this.actionItems.filter(item => item.priority === priority).length;
  }

  getSourceColor(source: string): { bg: string; text: string } {
    const colors: { [key: string]: { bg: string; text: string } } = {
      strength: { bg: '#dcfce7', text: '#166534' },
      weakness: { bg: '#fee2e2', text: '#991b1b' },
      opportunity: { bg: '#dbeafe', text: '#1e40af' },
      threat: { bg: '#fef3c7', text: '#92400e' },
      gps_target: { bg: '#f3e8ff', text: '#7c3aed' }
    };
    return colors[source] || { bg: '#f3f4f6', text: '#374151' };
  }

  getStatusColor(status: string): { bg: string; text: string } {
    const colors: { [key: string]: { bg: string; text: string } } = {
      identified: { bg: '#f3f4f6', text: '#374151' },
      planning: { bg: '#dbeafe', text: '#1e40af' },
      in_progress: { bg: '#fef3c7', text: '#92400e' },
      completed: { bg: '#dcfce7', text: '#166534' },
      on_hold: { bg: '#fee2e2', text: '#991b1b' }
    };
    return colors[status] || { bg: '#f3f4f6', text: '#374151' };
  }

  isOverdue(dateString: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateString);
    return dueDate < today;
  }

  isDueSoon(dateString: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateString);
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);
    threeDaysFromNow.setHours(0, 0, 0, 0);
    return dueDate >= today && dueDate <= threeDaysFromNow;
  }

  goBack(): void {
    this.location.back();
  }

  async exportToPDF(): Promise<void> {
    this.isGenerating = true;

    try {
      const element = document.getElementById('pdf-content');
      if (!element) {
        throw new Error('PDF content element not found');
      }

      const filename = `${this.companyName.replace(/[^a-zA-Z0-9]/g, '_')}_Action_Plan_${this.source.toUpperCase()}_${new Date().toISOString().split('T')[0]}.pdf`;

      const options = {
        margin: [0.3, 0.3, 0.3, 0.3],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          width: 794,
          height: 1123,
          windowWidth: 1200,
          scrollX: 0,
          scrollY: 0
        },
        jsPDF: {
          unit: 'in',
          format: 'a4',
          orientation: 'portrait',
          compress: true
        },
        pagebreak: {
          mode: ['avoid-all', 'css', 'legacy'],
          before: ['.page-break-before'],
          after: ['.page-break-after']
        }
      };

      await html2pdf().set(options).from(element).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('There was an error generating the PDF. Please try again.');
    } finally {
      this.isGenerating = false;
    }
  }
}
