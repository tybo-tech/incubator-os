import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NodeService } from '../../../../../services/node.service';
import { INode } from '../../../../../models/schema';
import { IBusinessAssessment } from '../../../../../models/business-assessment.model';

const NODE_TYPE = 'business_assessment';

@Component({
  selector: 'app-assessment-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-4 lg:p-8">
      <div class="max-w-3xl mx-auto space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">Business Assessment</h2>
            <p class="text-gray-600 text-sm mt-1">SEDA funding eligibility assessment</p>
          </div>
          <button (click)="createNew()" class="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            New Assessment
          </button>
        </div>

        <div *ngIf="loading()" class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>

        <div *ngIf="error()" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">{{ error() }}</div>

        <!-- Existing Assessments List -->
        <div *ngIf="!loading() && !editing()" class="space-y-4">
          <div *ngIf="assessments().length === 0" class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
            No assessments yet. Click "New Assessment" to create one.
          </div>

          <div *ngFor="let item of assessments()" class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center justify-between">
            <div>
              <div class="flex items-center space-x-3">
                <span class="text-sm font-medium text-gray-900">Level {{ item.data.level }}</span>
                <span class="text-sm text-gray-500">Score: {{ item.data.score }}%</span>
                <span [class]="'inline-flex px-2 py-0.5 text-xs font-medium rounded-full ' + (item.data.funding.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')">
                  {{ item.data.funding.approved ? 'Approved' : 'Pending' }}
                </span>
              </div>
              <div class="text-xs text-gray-400 mt-1">Created: {{ item.created_at | date:'short' }}</div>
            </div>
            <div class="flex items-center space-x-2">
              <button (click)="edit(item)" class="p-1 text-gray-400 hover:text-indigo-600" title="Edit">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button (click)="delete(item)" class="p-1 text-gray-400 hover:text-red-600" title="Delete">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Assessment Form -->
        <div *ngIf="editing()" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          <h3 class="text-lg font-semibold text-gray-900">{{ isNew() ? 'New Assessment' : 'Edit Assessment' }}</h3>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Business Level</label>
            <select [(ngModel)]="form.level" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option [value]="1">Level 1</option>
              <option [value]="2">Level 2</option>
              <option [value]="3">Level 3</option>
              <option [value]="4">Level 4</option>
            </select>
          </div>

          <div>
            <h4 class="text-sm font-semibold text-gray-800 mb-3 pb-2 border-b">Requirements</h4>
            <div class="space-y-3">
              <label class="flex items-center space-x-3"><input type="checkbox" [(ngModel)]="form.requirements.registration" class="h-4 w-4 text-blue-600 rounded border-gray-300"><span class="text-sm text-gray-700">Registration</span></label>
              <label class="flex items-center space-x-3"><input type="checkbox" [(ngModel)]="form.requirements.taxCompliance" class="h-4 w-4 text-blue-600 rounded border-gray-300"><span class="text-sm text-gray-700">Tax Compliance</span></label>
              <label class="flex items-center space-x-3"><input type="checkbox" [(ngModel)]="form.requirements.businessPlan" class="h-4 w-4 text-blue-600 rounded border-gray-300"><span class="text-sm text-gray-700">Business Plan</span></label>
              <label class="flex items-center space-x-3"><input type="checkbox" [(ngModel)]="form.requirements.youthOwned" class="h-4 w-4 text-blue-600 rounded border-gray-300"><span class="text-sm text-gray-700">Youth Owned</span></label>
              <label class="flex items-center space-x-3"><input type="checkbox" [(ngModel)]="form.requirements.bankAccount" class="h-4 w-4 text-blue-600 rounded border-gray-300"><span class="text-sm text-gray-700">Bank Account</span></label>
            </div>
          </div>

          <div>
            <h4 class="text-sm font-semibold text-gray-800 mb-3 pb-2 border-b">Funding</h4>
            <div class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Requested Amount (ZAR)</label>
                <input type="number" [(ngModel)]="form.funding.requestedAmount" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <label class="flex items-center space-x-3"><input type="checkbox" [(ngModel)]="form.funding.approved" class="h-4 w-4 text-blue-600 rounded border-gray-300"><span class="text-sm text-gray-700">Approved</span></label>
              <label class="flex items-center space-x-3"><input type="checkbox" [(ngModel)]="form.funding.paid" class="h-4 w-4 text-blue-600 rounded border-gray-300"><span class="text-sm text-gray-700">Paid</span></label>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Score (%)</label>
            <input type="number" [(ngModel)]="form.score" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" min="0" max="100" />
          </div>

          <div class="flex items-center justify-end space-x-3 pt-4 border-t">
            <button (click)="cancelEdit()" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            <button (click)="save()" [disabled]="saving()" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
              {{ saving() ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AssessmentPageComponent implements OnInit {
  private companyId = signal<number>(0);
  assessments = signal<INode<IBusinessAssessment>[]>([]);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  editing = signal(false);
  isNew = signal(false);
  editingId: number | null = null;

  form: IBusinessAssessment = this.emptyForm();

  constructor(
    private route: ActivatedRoute,
    private nodeService: NodeService<IBusinessAssessment>,
  ) {}

  ngOnInit(): void {
    this.route.parent?.params.subscribe(params => {
      const id = parseInt(params['id'], 10);
      if (id) {
        this.companyId.set(id);
        this.loadAll();
      }
    });
  }

  loadAll(): void {
    const cid = this.companyId();
    if (!cid) return;
    this.loading.set(true);
    this.error.set(null);
    this.nodeService.getNodesByCompany(cid, NODE_TYPE).subscribe({
      next: (r) => { this.assessments.set(r); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  createNew(): void {
    this.form = this.emptyForm();
    this.editingId = null;
    this.isNew.set(true);
    this.editing.set(true);
  }

  edit(item: INode<IBusinessAssessment>): void {
    this.form = { ...item.data };
    this.editingId = item.id ?? null;
    this.isNew.set(false);
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
    this.editingId = null;
  }

  save(): void {
    const cid = this.companyId();
    if (!cid) return;
    this.saving.set(true);
    this.error.set(null);

    const node: INode<IBusinessAssessment> = {
      type: NODE_TYPE,
      company_id: cid,
      data: this.form,
    };

    const obs = this.editingId
      ? this.nodeService.updateNode({ ...node, id: this.editingId })
      : this.nodeService.addNode(node);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(false);
        this.editingId = null;
        this.loadAll();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.error || 'Failed to save');
      }
    });
  }

  delete(item: INode<IBusinessAssessment>): void {
    if (!confirm('Delete this assessment?')) return;
    this.nodeService.deleteNode(item.id!).subscribe({
      next: () => this.loadAll(),
      error: (err) => this.error.set(err.error?.error || 'Failed to delete')
    });
  }

  private emptyForm(): IBusinessAssessment {
    return {
      level: 1,
      requirements: { registration: false, taxCompliance: false, businessPlan: false, youthOwned: false, bankAccount: false },
      funding: { requestedAmount: 0, approved: false, paid: false },
      score: 0,
    };
  }
}
