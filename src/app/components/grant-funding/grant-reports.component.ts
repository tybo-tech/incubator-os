import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { NodeService } from '../../../services/node.service';
import { CompanyService } from '../../../services';
import { INode } from '../../../models/schema';
import { ICompany } from '../../../models/simple.schema';
import {
  GrantFundingRequestData,
  RequestStatus,
  ApprovalStatus,
  STATUS_LABELS,
  STATUS_COLORS,
  APPROVAL_STATUS_COLORS,
  DEFAULT_APPROVALS,
} from '../../../models/grant-funding.models';

@Component({
  selector: 'app-grant-reports',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <h2 class="text-xl font-semibold text-gray-900">Reports & Compliance</h2>

      <div *ngIf="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>

      <div *ngIf="!loading && nodes.length === 0"
           class="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col items-center justify-center py-16 text-gray-400">
        <i class="fas fa-clipboard-check text-5xl mb-4 text-green-200"></i>
        <p class="text-lg font-medium text-gray-500">No applications to report on</p>
        <p class="text-sm mt-1">Reports will be generated from submitted applications.</p>
      </div>

      <div *ngIf="!loading && nodes.length > 0" class="space-y-4">
        <div *ngFor="let node of nodes" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <!-- Header -->
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-lg font-semibold text-gray-900">{{ node.data.request_title || 'Untitled Request' }}</h3>
              <p class="text-sm text-gray-500">{{ node.data.grant_program }}</p>
            </div>
            <div class="flex items-center space-x-3">
              <span class="text-sm font-bold text-gray-800">R {{ node.data.totals.total_incl_vat | number:'1.2-2' }}</span>
              <span [class]="'px-2 py-1 rounded-full text-xs font-medium ' + getStatusColor(node.data.status)">
                {{ getStatusLabel(node.data.status) }}
              </span>
            </div>
          </div>

          <!-- Approval Progress -->
          <div class="mb-4">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Approval Progress</p>
            <div class="flex items-center space-x-2">
              <ng-container *ngFor="let def of approvalDefs; let last = last">
                <div class="flex flex-col items-center">
                  <div [class]="'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ' + getApprovalCircleClass(node, def.role)">
                    <i [class]="getApprovalIcon(node, def.role)"></i>
                  </div>
                  <span class="text-xs text-gray-500 mt-1 text-center w-20 leading-tight">{{ def.label }}</span>
                </div>
                <div *ngIf="!last" class="flex-1 h-0.5 bg-gray-200 mb-5"></div>
              </ng-container>
            </div>
          </div>

          <!-- Line Items Summary -->
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Line Items ({{ node.data.line_items.length }})</p>
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead>
                  <tr class="bg-gray-50">
                    <th class="text-left px-3 py-2 text-xs text-gray-500 font-medium">Invoice</th>
                    <th class="text-left px-3 py-2 text-xs text-gray-500 font-medium">Description</th>
                    <th class="text-left px-3 py-2 text-xs text-gray-500 font-medium">Supplier</th>
                    <th class="text-right px-3 py-2 text-xs text-gray-500 font-medium">Excl. VAT</th>
                    <th class="text-right px-3 py-2 text-xs text-gray-500 font-medium">VAT</th>
                    <th class="text-right px-3 py-2 text-xs text-gray-500 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr *ngFor="let item of node.data.line_items">
                    <td class="px-3 py-2 text-gray-600">{{ item.invoice_number }}</td>
                    <td class="px-3 py-2 text-gray-800">{{ item.description }}</td>
                    <td class="px-3 py-2 text-gray-600">{{ item.supplier.name }}</td>
                    <td class="px-3 py-2 text-right text-gray-700">R {{ item.amount_excl_vat | number:'1.2-2' }}</td>
                    <td class="px-3 py-2 text-right text-gray-600">R {{ item.vat_amount | number:'1.2-2' }}</td>
                    <td class="px-3 py-2 text-right font-semibold text-gray-900">R {{ item.total_amount | number:'1.2-2' }}</td>
                  </tr>
                </tbody>
                <tfoot class="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colspan="3" class="px-3 py-2 text-xs font-semibold text-gray-700">Totals</td>
                    <td class="px-3 py-2 text-right text-xs font-semibold text-gray-700">R {{ node.data.totals.total_excl_vat | number:'1.2-2' }}</td>
                    <td class="px-3 py-2 text-right text-xs font-semibold text-gray-700">R {{ node.data.totals.total_vat | number:'1.2-2' }}</td>
                    <td class="px-3 py-2 text-right text-xs font-bold text-green-700">R {{ node.data.totals.total_incl_vat | number:'1.2-2' }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class GrantReportsComponent implements OnInit, OnDestroy {
  nodes: INode<GrantFundingRequestData>[] = [];
  loading = false;
  company: ICompany | null = null;

  readonly approvalDefs = DEFAULT_APPROVALS;

  private destroy$ = new Subject<void>();
  private route = inject(ActivatedRoute);
  private nodeService = inject(NodeService<GrantFundingRequestData>);
  private companyService = inject(CompanyService);

  ngOnInit(): void {
    const companyId = +this.route.parent?.parent?.snapshot.params['id'];
    this.loading = true;
    this.companyService.getCompanyById(companyId).pipe(takeUntil(this.destroy$)).subscribe(company => {
      this.company = company;
      this.nodeService.getNodesByCompany(companyId, 'grant_funding_request')
        .pipe(takeUntil(this.destroy$))
        .subscribe({ next: nodes => { this.nodes = nodes; this.loading = false; }, error: () => { this.loading = false; } });
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  getStatusLabel(status: RequestStatus): string { return STATUS_LABELS[status] ?? status; }
  getStatusColor(status: RequestStatus): string { return STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700'; }

  getApprovalCircleClass(node: INode<GrantFundingRequestData>, role: string): string {
    const approval = node.data.approvals?.find(a => a.role === role);
    if (!approval) return 'bg-gray-100 text-gray-400';
    if (approval.status === 'approved') return 'bg-green-500 text-white';
    if (approval.status === 'rejected') return 'bg-red-500 text-white';
    return 'bg-gray-200 text-gray-500';
  }

  getApprovalIcon(node: INode<GrantFundingRequestData>, role: string): string {
    const approval = node.data.approvals?.find(a => a.role === role);
    if (!approval) return 'fas fa-minus';
    if (approval.status === 'approved') return 'fas fa-check';
    if (approval.status === 'rejected') return 'fas fa-times';
    return 'fas fa-clock';
  }
}

