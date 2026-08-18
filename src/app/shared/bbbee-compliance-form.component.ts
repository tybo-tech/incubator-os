import { Component, input, output, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NodeService } from '../../services/node.service';
import { INode } from '../../models/schema';
import { IBBBEECompliance } from '../../models/bbbee-compliance.model';

@Component({
  selector: 'app-bbbee-compliance-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">{{ isEdit() ? 'Edit' : 'New' }} BBBEE Record</h3>
          <button (click)="close.emit()" class="p-1 text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Assessment Period</label>
            <input type="text" [(ngModel)]="form.assessmentPeriod" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="e.g., FY2026" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Verification Date</label>
              <input type="date" [(ngModel)]="form.verificationDate" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Certificate Issue Date</label>
              <input type="date" [(ngModel)]="form.certificateIssueDate" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Certificate Expiry Date</label>
            <input type="date" [(ngModel)]="form.certificateExpiryDate" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select [(ngModel)]="form.status" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Verified">Verified</option>
                <option value="Expired">Expired</option>
                <option value="Not Required">Not Required</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Score</label>
              <input type="number" step="0.1" [(ngModel)]="form.score" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="0.0" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Level</label>
            <select [(ngModel)]="form.level" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">Select level</option>
              <option value="Level 1">Level 1</option>
              <option value="Level 2">Level 2</option>
              <option value="Level 3">Level 3</option>
              <option value="Level 4">Level 4</option>
              <option value="Level 5">Level 5</option>
              <option value="Level 6">Level 6</option>
              <option value="Level 7">Level 7</option>
              <option value="Level 8">Level 8</option>
              <option value="Non-Compliant">Non-Compliant</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea [(ngModel)]="form.notes" rows="3" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Additional notes..."></textarea>
          </div>
        </div>
        <div class="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200">
          <button (click)="close.emit()" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
          <button (click)="save()" [disabled]="saving()" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">{{ saving() ? 'Saving...' : 'Save' }}</button>
        </div>
      </div>
    </div>
  `
})
export class BBBEEComplianceFormComponent implements OnInit {
  nodeType = input.required<string>();
  editNode = input<INode<any> | null>(null);
  companyId = input<number>(0);
  close = output<void>();
  saved = output<void>();

  isEdit = computed(() => !!this.editNode());

  form: IBBBEECompliance = {
    assessmentPeriod: `FY${new Date().getFullYear()}`,
    verificationDate: new Date().toISOString().split('T')[0],
    certificateIssueDate: '',
    certificateExpiryDate: '',
    status: 'Pending',
    score: 0,
    level: '',
    notes: '',
  };

  saving = signal(false);

  constructor(private nodeService: NodeService<any>) {}

  ngOnInit(): void {
    const node = this.editNode();
    if (node) {
      this.form = { ...node.data };
    }
  }

  save(): void {
    this.saving.set(true);
    const node = this.editNode();
    const cid = this.companyId();
    const payload: any = {
      type: this.nodeType(),
      company_id: cid,
      data: this.form,
    };

    const obs = node?.id
      ? this.nodeService.updateNode({ ...node, company_id: cid, data: this.form })
      : this.nodeService.addNode(payload);

    obs.subscribe({
      next: () => { this.saving.set(false); this.saved.emit(); },
      error: () => { this.saving.set(false); }
    });
  }
}
