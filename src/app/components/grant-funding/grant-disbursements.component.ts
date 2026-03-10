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
  PaymentStatus,
  STATUS_LABELS,
  STATUS_COLORS,
} from '../../../models/grant-funding.models';

@Component({
  selector: 'app-grant-disbursements',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <h2 class="text-xl font-semibold text-gray-900">Disbursements</h2>

      <div *ngIf="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>

      <div *ngIf="!loading && nodes.length === 0"
           class="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col items-center justify-center py-16 text-gray-400">
        <i class="fas fa-money-bill-wave text-5xl mb-4 text-green-200"></i>
        <p class="text-lg font-medium text-gray-500">No disbursements recorded</p>
        <p class="text-sm mt-1">Disbursements appear here once applications are submitted.</p>
      </div>

      <div *ngIf="!loading && nodes.length > 0" class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Application</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grant Program</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (incl. VAT)</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Release Date</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-100">
            <tr *ngFor="let node of nodes" class="hover:bg-gray-50">
              <td class="px-6 py-4">
                <p class="text-sm font-medium text-gray-900">{{ node.data.request_title || 'Untitled' }}</p>
                <span [class]="'px-2 py-0.5 rounded-full text-xs font-medium ' + getStatusColor(node.data.status)">
                  {{ getStatusLabel(node.data.status) }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-600">{{ node.data.grant_program }}</td>
              <td class="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                R {{ node.data.totals.total_incl_vat | number:'1.2-2' }}
              </td>
              <td class="px-6 py-4">
                <span [class]="'px-2 py-1 rounded-full text-xs font-medium ' + getPaymentBadge(node.data.payment.status)">
                  {{ node.data.payment.status | titlecase }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-600">
                {{ node.data.payment.payment_reference || '—' }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-600">
                {{ node.data.payment.payment_release_date ? (node.data.payment.payment_release_date | date:'mediumDate') : '—' }}
              </td>
            </tr>
          </tbody>
          <tfoot class="bg-gray-50 border-t border-gray-200">
            <tr>
              <td colspan="2" class="px-6 py-3 text-sm font-semibold text-gray-700">Total</td>
              <td class="px-6 py-3 text-sm font-bold text-gray-900 text-right">
                R {{ grandTotal | number:'1.2-2' }}
              </td>
              <td colspan="3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `,
})
export class GrantDisbursementsComponent implements OnInit, OnDestroy {
  nodes: INode<GrantFundingRequestData>[] = [];
  loading = false;
  company: ICompany | null = null;

  private destroy$ = new Subject<void>();
  private route = inject(ActivatedRoute);
  private nodeService = inject(NodeService<GrantFundingRequestData>);
  private companyService = inject(CompanyService);

  get grandTotal() {
    return this.nodes.reduce((s, n) => s + (n.data.totals?.total_incl_vat || 0), 0);
  }

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
  getPaymentBadge(status: PaymentStatus): string {
    return status === 'released' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
  }
}

