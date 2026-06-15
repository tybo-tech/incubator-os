import { Component, Input, OnInit, signal, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  GrantFundingChecklist,
  DEFAULT_GRANT_FUNDING_CHECKLIST,
  GRANT_FUNDING_CHECKLIST_FIELDS,
  ChecklistResponse
} from './checklist.models';
import { NodeService } from '../../../../services';

@Component({
  selector: 'app-business-process-checklist',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <!-- Header -->
      <div class="px-5 py-4 border-b border-gray-100">
        <h2 class="text-base font-semibold text-gray-900">Business Process Checklist</h2>
        <p class="text-xs text-gray-500 mt-1">Complete the checklist items for this business process.</p>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading()" class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>

      <!-- Checklist Form -->
      <div *ngIf="!isLoading()" class="p-5">
        <div class="space-y-4">
          <div *ngFor="let field of checklistFields" class="flex items-start gap-3">
            <div class="flex-1 min-w-0">
              <label class="text-sm font-medium text-gray-700">{{ field.label }}</label>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  [name]="'checklist-' + field.key"
                  [value]="'YES'"
                  [(ngModel)]="checklist()[field.key]"
                  (change)="onAnswerChange()"
                  class="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500">
                <span class="text-sm text-gray-600">Yes</span>
              </label>
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  [name]="'checklist-' + field.key"
                  [value]="'NO'"
                  [(ngModel)]="checklist()[field.key]"
                  (change)="onAnswerChange()"
                  class="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500">
                <span class="text-sm text-gray-600">No</span>
              </label>
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  [name]="'checklist-' + field.key"
                  [value]="'NA'"
                  [(ngModel)]="checklist()[field.key]"
                  (change)="onAnswerChange()"
                  class="w-4 h-4 text-gray-400 border-gray-300 focus:ring-gray-500">
                <span class="text-sm text-gray-600">N/A</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Save Button -->
        <div class="mt-6 flex justify-end">
          <button
            (click)="saveChecklist()"
            [disabled]="isSaving()"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {{ isSaving() ? 'Saving...' : 'Save Checklist' }}
          </button>
        </div>

        <!-- Status Message -->
        <div *ngIf="saveStatus()" class="mt-4 p-3 rounded-lg"
             [class]="saveStatus()!.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'">
          {{ saveStatus()!.message }}
        </div>
      </div>
    </div>
  `
})
export class BusinessProcessChecklistComponent implements OnInit {
  @Input() companyId!: number;
  @Input() applicantId!: number;

  isLoading = signal(true);
  isSaving = signal(false);
  saveStatus = signal<{ message: string; type: 'success' | 'error' } | null>(null);

  checklist = signal<GrantFundingChecklist>({ ...DEFAULT_GRANT_FUNDING_CHECKLIST });
  checklistFields = GRANT_FUNDING_CHECKLIST_FIELDS;
  checklistNode = signal<any>(null);

  constructor(@Inject(NodeService) private nodeService: NodeService) {}

  ngOnInit(): void {
    this.loadChecklist();
  }

  loadChecklist(): void {
    this.isLoading.set(true);
    // Try to load existing checklist for this company
    this.nodeService.getNodes('business_process_checklist', this.companyId).subscribe({
      next: (nodes: any[]) => {
        if (nodes.length > 0) {
          // Load existing checklist data
          const existingData = nodes[0].data as GrantFundingChecklist;
          this.checklist.set({ ...DEFAULT_GRANT_FUNDING_CHECKLIST, ...existingData });
          this.checklistNode.set(nodes[0]);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  onAnswerChange(): void {
    // Clear any previous save status when user makes changes
    this.saveStatus.set(null);
  }

  saveChecklist(): void {
    this.isSaving.set(true);
    this.saveStatus.set(null);

    const checklistData = this.checklist();

    // Save or update the checklist node
    const nodeData: any = {
      type: 'business_process_checklist',
      parent_id: this.companyId,
      data: checklistData
    };

    // If we have an existing node, update it, otherwise create a new one
    let saveObservable;
    if (this.checklistNode()) {
      nodeData.id = this.checklistNode().id;
      saveObservable = this.nodeService.updateNode(nodeData);
    } else {
      saveObservable = this.nodeService.addNode(nodeData);
    }

    saveObservable.subscribe({
      next: (response: any) => {
        this.isSaving.set(false);
        this.checklistNode.set(response);
        this.saveStatus.set({ message: 'Checklist saved successfully!', type: 'success' });
        // Clear status message after 3 seconds
        setTimeout(() => this.saveStatus.set(null), 3000);
      },
      error: (error: any) => {
        this.isSaving.set(false);
        this.saveStatus.set({ message: 'Failed to save checklist. Please try again.', type: 'error' });
        console.error('Error saving checklist:', error);
      }
    });
  }
}
