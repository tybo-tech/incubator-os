import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { NodeService } from '../../../services/node.service';
import { CompanyService } from '../../../services';
import { INode } from '../../../models/schema';
import { ICompany } from '../../../models/simple.schema';
import {
  GrantFundingRequestData,
  FundingLineItem,
  RequestStatus,
  STATUS_LABELS,
  STATUS_COLORS,
  APPROVAL_STATUS_COLORS,
  DEFAULT_APPROVALS,
  initGrantFundingRequest,
  initLineItem,
  initApproval,
} from '../../../models/grant-funding.models';

@Component({
  selector: 'app-grant-applications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">

      <!-- Toolbar -->
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold text-gray-900">Funding Applications</h2>
        <button
          (click)="openNewForm()"
          class="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors">
          <i class="fas fa-plus mr-2"></i>
          New Application
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && nodes.length === 0 && !showForm"
           class="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col items-center justify-center py-16 text-gray-400">
        <i class="fas fa-file-alt text-5xl mb-4 text-green-200"></i>
        <p class="text-lg font-medium text-gray-500">No applications yet</p>
        <p class="text-sm mt-1">Click "New Application" to get started.</p>
      </div>

      <!-- Applications List -->
      <div *ngIf="!loading && nodes.length > 0" class="bg-white rounded-lg shadow-sm border border-gray-200">
        <ul class="divide-y divide-gray-100">
          <li *ngFor="let node of nodes"
              class="px-6 py-4 hover:bg-gray-50 cursor-pointer"
              (click)="openEdit(node)">
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900">{{ node.data.request_title || 'Untitled Request' }}</p>
                <p class="text-sm text-gray-500">{{ node.data.grant_program }}</p>
                <div class="flex items-center space-x-4 mt-1 text-xs text-gray-400">
                  <span><i class="fas fa-calendar mr-1"></i>{{ node.data.request_date | date:'mediumDate' }}</span>
                  <span><i class="fas fa-list mr-1"></i>{{ node.data.line_items.length }} line item(s)</span>
                </div>
              </div>
              <div class="flex items-center space-x-3 ml-4">
                <span class="font-semibold text-gray-800 text-sm">R {{ node.data.totals.total_incl_vat | number:'1.2-2' }}</span>
                <span [class]="'px-2 py-1 rounded-full text-xs font-medium ' + getStatusColor(node.data.status)">
                  {{ getStatusLabel(node.data.status) }}
                </span>
                <button (click)="deleteNode($event, node)" class="text-red-400 hover:text-red-600 p-1">
                  <i class="fas fa-trash text-xs"></i>
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>

      <!-- ─── Create / Edit Form ─── -->
      <div *ngIf="showForm" class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ editingNode ? 'Edit Application' : 'New Funding Application' }}
          </h3>
          <button (click)="closeForm()" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="p-6 space-y-8">

          <!-- Basic Info -->
          <section>
            <h4 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Request Details</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Request Title *</label>
                <input [(ngModel)]="formData.request_title" type="text"
                       class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-green-500 focus:border-green-500"
                       placeholder="e.g. South32 Equipment Funding" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Grant Program *</label>
                <input [(ngModel)]="formData.grant_program" type="text"
                       class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-green-500 focus:border-green-500"
                       placeholder="e.g. South32 ESD Centre" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select [(ngModel)]="formData.status"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-green-500 focus:border-green-500">
                  <option *ngFor="let s of statusOptions" [value]="s.value">{{ s.label }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Request Date</label>
                <input [(ngModel)]="formData.request_date" type="date"
                       class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-green-500 focus:border-green-500" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Grant Budget (ZAR)</label>
                <input [(ngModel)]="formData.totals.grant_budget" type="number" min="0"
                       class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-green-500 focus:border-green-500"
                       placeholder="0.00" />
              </div>
            </div>
          </section>

          <!-- Line Items -->
          <section>
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Line Items</h4>
              <button (click)="addLineItem()"
                      class="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                <i class="fas fa-plus mr-1"></i> Add Item
              </button>
            </div>

            <div *ngIf="formData.line_items.length === 0"
                 class="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
              No line items. Click "Add Item" to begin.
            </div>

            <div *ngFor="let item of formData.line_items; let i = index"
                 class="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
              <div class="flex items-start justify-between mb-3">
                <span class="text-xs font-semibold text-gray-600"># {{ i + 1 }}</span>
                <button (click)="removeLineItem(i)" class="text-red-400 hover:text-red-600 text-xs">
                  <i class="fas fa-trash"></i> Remove
                </button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Invoice Number</label>
                  <input [(ngModel)]="item.invoice_number" type="text"
                         class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                         placeholder="INV-001" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Description</label>
                  <input [(ngModel)]="item.description" type="text"
                         class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                         placeholder="Machinery, PPE..." />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Supplier Name</label>
                  <input [(ngModel)]="item.supplier.name" type="text"
                         class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                         placeholder="Supplier name" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Amount excl. VAT (R)</label>
                  <input [(ngModel)]="item.amount_excl_vat" type="number" min="0" step="0.01"
                         (ngModelChange)="recalcItem(item)"
                         class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-green-500 focus:border-green-500" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">VAT (15%)</label>
                  <input [ngModel]="item.vat_amount | number:'1.2-2'" readonly
                         class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-gray-100 text-gray-500" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Total incl. VAT (R)</label>
                  <input [ngModel]="item.total_amount | number:'1.2-2'" readonly
                         class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-gray-100 font-semibold text-gray-800" />
                </div>
              </div>

              <div class="flex items-center mt-2">
                <label class="flex items-center text-xs text-gray-600 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="item.supplier.preferred_supplier" class="mr-2" />
                  Preferred Supplier
                </label>
              </div>
            </div>

            <!-- Totals Summary -->
            <div *ngIf="formData.line_items.length > 0"
                 class="bg-green-50 border border-green-200 rounded-lg p-4 mt-2">
              <div class="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div class="text-xs text-gray-500 mb-1">Subtotal (excl. VAT)</div>
                  <div class="font-semibold text-gray-800">R {{ formData.totals.total_excl_vat | number:'1.2-2' }}</div>
                </div>
                <div>
                  <div class="text-xs text-gray-500 mb-1">VAT</div>
                  <div class="font-semibold text-gray-800">R {{ formData.totals.total_vat | number:'1.2-2' }}</div>
                </div>
                <div>
                  <div class="text-xs text-gray-500 mb-1">Total (incl. VAT)</div>
                  <div class="text-lg font-bold text-green-700">R {{ formData.totals.total_incl_vat | number:'1.2-2' }}</div>
                </div>
              </div>
              <div class="mt-2 text-center text-xs"
                   [ngClass]="formData.totals.total_incl_vat > formData.totals.grant_budget && formData.totals.grant_budget > 0
                     ? 'text-red-600 font-medium' : 'text-gray-400'">
                <span *ngIf="formData.totals.grant_budget > 0">
                  Budget: R {{ formData.totals.grant_budget | number:'1.2-2' }} —
                  <span *ngIf="formData.totals.total_incl_vat <= formData.totals.grant_budget">Within budget ✓</span>
                  <span *ngIf="formData.totals.total_incl_vat > formData.totals.grant_budget">Exceeds budget by R {{ (formData.totals.total_incl_vat - formData.totals.grant_budget) | number:'1.2-2' }} ⚠</span>
                </span>
              </div>
            </div>
          </section>

          <!-- Approvals -->
          <section>
            <h4 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Approval Workflow</h4>
            <div class="space-y-3">
              <div *ngFor="let approval of formData.approvals"
                   class="grid grid-cols-1 md:grid-cols-4 gap-3 border border-gray-200 rounded-lg p-3 bg-gray-50 items-center">
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1 capitalize">{{ getRoleLabel(approval.role) }}</label>
                  <input [(ngModel)]="approval.name" type="text"
                         class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                         placeholder="Name" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select [(ngModel)]="approval.status"
                          class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-green-500 focus:border-green-500">
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Approval Date</label>
                  <input [(ngModel)]="approval.approval_date" type="date"
                         class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-green-500 focus:border-green-500" />
                </div>
                <div class="flex items-center justify-center">
                  <span [class]="'px-3 py-1 rounded-full text-xs font-medium ' + getApprovalColor(approval.status)">
                    {{ approval.status | titlecase }}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <!-- Form Actions -->
          <div class="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button (click)="closeForm()"
                    class="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
              Cancel
            </button>
            <button (click)="saveForm()" [disabled]="saving"
                    class="px-4 py-2 text-sm text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50">
              {{ saving ? 'Saving...' : (editingNode ? 'Save Changes' : 'Create Application') }}
            </button>
          </div>

        </div>
      </div>
    </div>
  `,
})
export class GrantApplicationsComponent implements OnInit, OnDestroy {
  nodes: INode<GrantFundingRequestData>[] = [];
  loading = false;
  saving = false;
  showForm = false;
  editingNode: INode<GrantFundingRequestData> | null = null;
  formData!: GrantFundingRequestData;
  company: ICompany | null = null;

  private destroy$ = new Subject<void>();
  private route = inject(ActivatedRoute);
  private nodeService = inject(NodeService<GrantFundingRequestData>);
  private companyService = inject(CompanyService);

  readonly statusOptions: { value: RequestStatus; label: string }[] =
    (Object.entries(STATUS_LABELS) as [RequestStatus, string][]).map(([value, label]) => ({ value, label }));

  ngOnInit(): void {
    const companyId = +this.route.parent?.parent?.snapshot.params['id'];
    this.loading = true;
    this.companyService.getCompanyById(companyId).pipe(takeUntil(this.destroy$)).subscribe(company => {
      this.company = company;
      this.loadNodes(companyId);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadNodes(companyId: number): void {
    this.nodeService.getNodesByCompany(companyId, 'grant_funding_request')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: nodes => { this.nodes = nodes; this.loading = false; },
        error: () => { this.loading = false; }
      });
  }

  openNewForm(): void {
    this.editingNode = null;
    this.formData = initGrantFundingRequest(this.company?.id?.toString() ?? '');
    this.formData.approvals = DEFAULT_APPROVALS.map(a => initApproval(a.role));
    this.showForm = true;
  }

  openEdit(node: INode<GrantFundingRequestData>): void {
    this.editingNode = node;
    this.formData = JSON.parse(JSON.stringify(node.data)); // deep copy
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.editingNode = null;
  }

  addLineItem(): void {
    this.formData.line_items.push(initLineItem());
  }

  removeLineItem(index: number): void {
    this.formData.line_items.splice(index, 1);
    this.recalcTotals();
  }

  recalcItem(item: FundingLineItem): void {
    item.vat_amount = +(item.amount_excl_vat * 0.15).toFixed(2);
    item.total_amount = +(item.amount_excl_vat + item.vat_amount).toFixed(2);
    this.recalcTotals();
  }

  private recalcTotals(): void {
    const excl = this.formData.line_items.reduce((s, i) => s + (i.amount_excl_vat || 0), 0);
    const vat  = this.formData.line_items.reduce((s, i) => s + (i.vat_amount || 0), 0);
    this.formData.totals.total_excl_vat = +excl.toFixed(2);
    this.formData.totals.total_vat      = +vat.toFixed(2);
    this.formData.totals.total_incl_vat = +(excl + vat).toFixed(2);
  }

  saveForm(): void {
    if (!this.company?.id) return;
    this.saving = true;
    this.formData.last_updated = new Date().toISOString();

    const operation = this.editingNode
      ? this.nodeService.updateNode({ ...this.editingNode, data: this.formData })
      : this.nodeService.addNode({
          company_id: this.company.id,
          type: 'grant_funding_request',
          data: this.formData,
        } as INode<GrantFundingRequestData>);

    operation.pipe(takeUntil(this.destroy$)).subscribe({
      next: saved => {
        if (this.editingNode) {
          const idx = this.nodes.findIndex(n => n.id === saved.id);
          if (idx > -1) this.nodes[idx] = saved;
        } else {
          this.nodes.unshift(saved);
        }
        this.saving = false;
        this.closeForm();
      },
      error: () => { this.saving = false; }
    });
  }

  deleteNode(event: Event, node: INode<GrantFundingRequestData>): void {
    event.stopPropagation();
    if (!confirm('Delete this application?')) return;
    this.nodeService.deleteNode(node.id!).pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.nodes = this.nodes.filter(n => n.id !== node.id);
    });
  }

  getStatusLabel(status: RequestStatus): string { return STATUS_LABELS[status] ?? status; }
  getStatusColor(status: RequestStatus): string { return STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700'; }
  getApprovalColor(status: string): string { return APPROVAL_STATUS_COLORS[status as keyof typeof APPROVAL_STATUS_COLORS] ?? 'bg-gray-100 text-gray-600'; }
  getRoleLabel(role: string): string {
    return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}

