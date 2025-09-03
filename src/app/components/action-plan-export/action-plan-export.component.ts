import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { NodeService } from '../../../services/node.service';
import { SwotAnalysis, SwotItem } from '../../../models/swot.models';
import { INode } from '../../../models/schema';
import { PdfService } from '../../../services/pdf';

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
  styles: [`
    /* PDF-specific styles for better page breaks */
    .priority-group {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .action-item {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .summary-card {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Enhanced Status Badge Styling */
    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
      white-space: nowrap;
      border: 1px solid transparent;
      transition: all 0.2s ease;
    }

    /* Priority Summary Table Styling */
    .priority-summary-table {
      width: 100%;
      border-collapse: collapse;
      border-radius: 0.5rem;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .priority-summary-table td {
      text-align: center;
      padding: 1rem;
      border: 1px solid #e5e7eb;
      transition: background-color 0.2s ease;
    }

    .priority-summary-table td:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .page-break-before {
      page-break-before: always;
      break-before: page;
    }

    .page-break-after {
      page-break-after: always;
      break-after: page;
    }

    /* Ensure tables don't break poorly */
    table {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Prevent orphaned headers */
    h1, h2, h3, h4, h5, h6 {
      page-break-after: avoid;
      break-after: avoid;
    }

    /* Better content flow - Remove fixed width to prevent cutting */
    #pdf-content {
      width: 100%;
      max-width: none;
      margin: 0 auto;
      background: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.5;
      min-width: 1000px; /* Ensure minimum width for table content */
      min-height: 100vh; /* Ensure minimum height */
      padding-bottom: 50px; /* Extra bottom padding */
    }

    /* Improve text rendering in PDF */
    * {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
  `],
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
                (click)="previewPDF()"
                [disabled]="loading || isGenerating"
                class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                <span *ngIf="isGenerating" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                {{ isGenerating ? 'Generating...' : '👁️ Preview PDF' }}
              </button>
              <button
                (click)="exportToPDF()"
                [disabled]="loading || isGenerating"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <span *ngIf="isGenerating" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                {{ isGenerating ? 'Generating PDF...' : '📄 Download PDF' }}
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
          <div id="pdf-content" class="w-full bg-white p-8 mx-auto">

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
              <div *ngFor="let priorityGroup of priorityGroups; let priorityIndex = index"
                   style="border-bottom: 1px solid #e5e7eb; page-break-inside: avoid;"
                   class="priority-group last:border-b-0">
                <!-- Priority Header -->
                <div style="padding: 0.75rem 1.5rem; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb; page-break-after: avoid;">
                  <h3 style="font-weight: 600; color: #374151; margin: 0;">
                    Priority #{{ priorityIndex + 1 }}: {{ getPriorityTitle(priorityGroup.priority) }}
                  </h3>
                </div>

                <!-- Action Items -->
                <div>
                  <div *ngFor="let item of priorityGroup.items; let itemIndex = index"
                       style="padding: 1rem 1.5rem; border-bottom: 1px solid #f3f4f6; page-break-inside: avoid;"
                       class="action-item last:border-b-0">

                    <!-- Table-like layout for PDF - Adjusted column widths -->
                    <table style="width: 100%; font-size: 0.875rem; border-collapse: collapse; table-layout: fixed;">
                      <tr>
                        <td style="width: 6%; padding-right: 0.5rem; vertical-align: top;">
                          <span style="font-weight: 500; color: #6b7280;">
                            {{ priorityIndex + 1 }}.{{ itemIndex + 1 }}
                          </span>
                        </td>
                        <td style="width: 40%; padding-right: 0.75rem; vertical-align: top;">
                          <div style="font-weight: 500; color: #111827; margin-bottom: 0.25rem; word-wrap: break-word;">{{ item.action_required }}</div>
                          <div style="font-size: 0.75rem; color: #6b7280; word-wrap: break-word;">({{ item.description }})</div>
                        </td>
                        <td style="width: 12%; padding-right: 0.5rem; vertical-align: top;">
                          <span style="display: inline-block; padding: 0.25rem 0.4rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 500; white-space: nowrap;"
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
                        <td style="width: 16%; padding-right: 0.5rem; vertical-align: top;">
                          <div style="font-size: 0.8rem; color: #111827; word-wrap: break-word;">{{ item.assigned_to || 'Not assigned' }}</div>
                        </td>
                        <td style="width: 10%; padding-right: 0.5rem; vertical-align: top;">
                          <span style="display: inline-block; padding: 0.25rem 0.4rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 500; white-space: nowrap;"
                                [ngClass]="{
                                  'bg-slate-100 text-slate-700': item.status === 'identified',
                                  'bg-blue-100 text-blue-700': item.status === 'planning',
                                  'bg-amber-100 text-amber-700': item.status === 'in_progress',
                                  'bg-emerald-100 text-emerald-700': item.status === 'completed',
                                  'bg-red-100 text-red-700': item.status === 'on_hold'
                                }"
                                style="background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1;">
                            {{ getStatusDisplay(item.status) }}
                          </span>
                        </td>
                        <td style="width: 16%; vertical-align: top;">
                          <div *ngIf="item.target_date" style="font-size: 0.8rem; word-wrap: break-word;"
                               [style.color]="isOverdue(item.target_date) ? '#dc2626' : isDueSoon(item.target_date) ? '#ea580c' : '#111827'"
                               [style.font-weight]="isOverdue(item.target_date) || isDueSoon(item.target_date) ? '500' : '400'">
                            {{ item.target_date | date:'MMM d, y' }}
                            <span *ngIf="isOverdue(item.target_date)" style="font-size: 0.7rem;">(Overdue)</span>
                          </div>
                          <div *ngIf="!item.target_date" style="font-size: 0.8rem; color: #9ca3af;">No due date</div>
                        </td>
                      </tr>
                    </table>
                  </div>
                </div>
              </div>

              <!-- Summary Footer -->
              <div style="padding: 1rem 1.5rem; background-color: #f9fafb; border-top: 1px solid #e5e7eb; page-break-inside: avoid;" class="summary-card">
                <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 1rem; color: #374151;">Priority Summary</h3>
                <table class="priority-summary-table" style="width: 100%; border-collapse: collapse; border-radius: 0.5rem; overflow: hidden;">
                  <tr>
                    <td style="text-align: center; padding: 1rem; border: 1px solid #e5e7eb; background-color: #fee2e2;">
                      <div style="font-size: 1.5rem; font-weight: bold; color: #dc2626;">{{ getTotalByPriority('critical') }}</div>
                      <div style="font-size: 0.875rem; color: #991b1b; font-weight: 500;">Critical</div>
                    </td>
                    <td style="text-align: center; padding: 1rem; border: 1px solid #e5e7eb; background-color: #fed7aa;">
                      <div style="font-size: 1.5rem; font-weight: bold; color: #ea580c;">{{ getTotalByPriority('high') }}</div>
                      <div style="font-size: 0.875rem; color: #c2410c; font-weight: 500;">High</div>
                    </td>
                    <td style="text-align: center; padding: 1rem; border: 1px solid #e5e7eb; background-color: #fef3c7;">
                      <div style="font-size: 1.5rem; font-weight: bold; color: #d97706;">{{ getTotalByPriority('medium') }}</div>
                      <div style="font-size: 0.875rem; color: #92400e; font-weight: 500;">Medium</div>
                    </td>
                    <td style="text-align: center; padding: 1rem; border: 1px solid #e5e7eb; background-color: #f3f4f6;">
                      <div style="font-size: 1.5rem; font-weight: bold; color: #6b7280;">{{ getTotalByPriority('low') }}</div>
                      <div style="font-size: 0.875rem; color: #4b5563; font-weight: 500;">Low</div>
                    </td>
                  </tr>
                </table>
              </div>
            </div>

            <!-- PDF Footer -->
            <div style="text-align: center; font-size: 0.75rem; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 1rem; margin-top: 2rem; margin-bottom: 2rem; padding-bottom: 2rem;">
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
    private nodeService: NodeService<any>,
    private pdfService: PdfService
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
      identified: { bg: '#f1f5f9', text: '#334155' },
      planning: { bg: '#dbeafe', text: '#1d4ed8' },
      in_progress: { bg: '#fef3c7', text: '#b45309' },
      completed: { bg: '#dcfce7', text: '#15803d' },
      on_hold: { bg: '#fee2e2', text: '#dc2626' }
    };
    return colors[status] || { bg: '#f1f5f9', text: '#334155' };
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

  async previewPDF(): Promise<void> {
    this.isGenerating = true;

    try {
      const element = document.getElementById('pdf-content');
      if (!element) {
        throw new Error('PDF content element not found');
      }

      // Get the HTML content from the PDF element
      const htmlContent = element.outerHTML;

      // Create a complete HTML document with DomPDF-optimized styling
      const styledHtml = this.createDomPdfOptimizedDocument(htmlContent);

      // Use our PDF service to preview the PDF - Portrait for better document flow
      this.pdfService.previewPdf(
        styledHtml,
        'A4',
        'portrait' // Portrait for better DomPDF handling
      );

    } catch (error) {
      console.error('Error generating PDF preview:', error);
      alert('There was an error generating the PDF preview. Please try again.');
    } finally {
      this.isGenerating = false;
    }
  }

  async exportToPDF(): Promise<void> {
    this.isGenerating = true;

    try {
      const element = document.getElementById('pdf-content');
      if (!element) {
        throw new Error('PDF content element not found');
      }

      // Get the HTML content from the PDF element
      const htmlContent = element.outerHTML;

      // Generate filename
      const filename = `${this.companyName.replace(/[^a-zA-Z0-9]/g, '_')}_Action_Plan_${this.source.toUpperCase()}_${new Date().toISOString().split('T')[0]}.pdf`;

      // Create a complete HTML document with DomPDF-optimized styling
      const styledHtml = this.createDomPdfOptimizedDocument(htmlContent);

      // Use our PDF service to generate and download the PDF - Portrait for better document flow
      this.pdfService.downloadPdf(
        styledHtml,
        filename,
        'A4',
        'portrait' // Portrait for better DomPDF handling
      );    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('There was an error generating the PDF. Please try again.');
    } finally {
      this.isGenerating = false;
    }
  }

  private createDomPdfOptimizedDocument(content: string): string {
    // Process the content to ensure better DomPDF compatibility
    let processedContent = content;

    // Remove all CSS Grid layouts and replace with table layouts for DomPDF
    processedContent = processedContent.replace(
      /style="display:\s*grid[^"]*"/g,
      'style="width: 100%"'
    );

    // Convert CSS Grid summary to table layout
    processedContent = processedContent.replace(
      /<div[^>]*grid-template-columns[^>]*>(.*?)<\/div>/gs,
      (match, content) => {
        const items = content.match(/<div[^>]*?>(.*?)<\/div>/gs) || [];
        if (items.length >= 4) {
          const cells = items.slice(0, 4).map((item: string) => {
            const cleanContent = item.replace(/<\/?div[^>]*>/g, '');
            return `<td style="text-align: center; padding: 15px; width: 25%;">${cleanContent}</td>`;
          }).join('');
          return `<table style="width: 100%; border-collapse: collapse;"><tr>${cells}</tr></table>`;
        }
        return match;
      }
    );

    // Create complete HTML document optimized for DomPDF
    const domPdfStyles = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${this.companyName} - Action Plan</title>
        <style>
          @page {
            margin: 1cm;
            size: A4 portrait;
          }

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: DejaVu Sans, Arial, sans-serif;
            font-size: 10pt;
            line-height: 1.4;
            color: #333;
            background: white;
          }

          /* DomPDF-specific page break controls */
          .page-break-before {
            page-break-before: always;
          }

          .page-break-after {
            page-break-after: always;
          }

          .no-page-break {
            page-break-inside: avoid;
          }

          /* Content wrapper */
          #pdf-content {
            width: 100%;
            padding: 0;
            margin: 0;
          }

          /* Typography */
          h1 {
            font-size: 16pt;
            font-weight: bold;
            color: #111;
            margin-bottom: 5pt;
            page-break-after: avoid;
          }

          h2 {
            font-size: 14pt;
            font-weight: bold;
            color: #333;
            margin: 15pt 0 8pt 0;
            page-break-after: avoid;
          }

          h3 {
            font-size: 12pt;
            font-weight: bold;
            color: #555;
            margin: 10pt 0 5pt 0;
            page-break-after: avoid;
          }

          p {
            margin-bottom: 8pt;
            font-size: 9pt;
            color: #666;
          }

          /* Table styling optimized for DomPDF */
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15pt;
            page-break-inside: avoid;
          }

          th, td {
            padding: 6pt 8pt;
            vertical-align: top;
            word-wrap: break-word;
            font-size: 8pt;
          }

          th {
            background-color: #f5f5f5;
            border-bottom: 1pt solid #ddd;
            font-weight: bold;
            page-break-after: avoid;
          }

          tr {
            page-break-inside: avoid;
          }

          /* Priority groups */
          .priority-group {
            margin-bottom: 20pt;
            page-break-inside: avoid;
            border: 1pt solid #eee;
          }

          .action-item {
            padding: 10pt 12pt;
            border-bottom: 1pt solid #f3f4f6;
            page-break-inside: avoid;
          }

          /* Color classes for DomPDF - Enhanced Status Colors */
          .bg-slate-100 { background-color: #f1f5f9; }
          .text-slate-700 { color: #334155; }
          .bg-blue-100 { background-color: #dbeafe; }
          .text-blue-700 { color: #1d4ed8; }
          .bg-amber-100 { background-color: #fef3c7; }
          .text-amber-700 { color: #b45309; }
          .bg-emerald-100 { background-color: #dcfce7; }
          .text-emerald-700 { color: #15803d; }
          .bg-red-100 { background-color: #fee2e2; }
          .text-red-700 { color: #dc2626; }

          /* Priority Summary Table Styling for PDF */
          .priority-summary-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15pt;
          }

          .priority-summary-table td {
            text-align: center;
            padding: 12pt;
            border: 1pt solid #e5e7eb;
            font-size: 9pt;
          }

          /* Status Badge Styling for PDF */
          .status-badge {
            display: inline-block;
            padding: 2pt 4pt;
            border-radius: 3pt;
            font-size: 7pt;
            font-weight: bold;
            border: 1pt solid #cbd5e1;
          }

          /* Legacy color support */
          .bg-green-100 { background-color: #dcfce7; }
          .text-green-800 { color: #166534; }
          .bg-red-100 { background-color: #fee2e2; }
          .text-red-800 { color: #991b1b; }
          .bg-blue-100 { background-color: #dbeafe; }
          .text-blue-800 { color: #1e40af; }
          .bg-yellow-100 { background-color: #fef3c7; }
          .text-yellow-800 { color: #92400e; }
          .bg-purple-100 { background-color: #f3e8ff; }
          .text-purple-800 { color: #7c3aed; }
          .bg-gray-100 { background-color: #f3f4f6; }
          .text-gray-800 { color: #374151; }

          /* Remove modern CSS that DomPDF doesn't support */
          .rounded-lg, .shadow-sm, .shadow {
            border-radius: 0;
            box-shadow: none;
          }
        </style>
      </head>
      <body>
        ${processedContent}
      </body>
      </html>
    `;

    return domPdfStyles;
  }
}
