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
  STATUS_LABELS,
  STATUS_COLORS,
} from '../../../models/grant-funding.models';

@Component({
  selector: 'app-grant-overview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <!-- Stats Row -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5 text-center">
          <div class="text-3xl font-bold text-gray-900">{{ nodes.length }}</div>
          <div class="text-sm text-gray-500 mt-1">Total Requests</div>
        </div>
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5 text-center">
          <div class="text-3xl font-bold text-green-600">{{ releasedCount }}</div>
          <div class="text-sm text-gray-500 mt-1">Payment Released</div>
        </div>
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5 text-center">
          <div class="text-3xl font-bold text-blue-600">{{ inProgressCount }}</div>
          <div class="text-sm text-gray-500 mt-1">In Progress</div>
        </div>
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5 text-center">
          <div class="text-3xl font-bold text-purple-600">R {{ totalFunding | number:'1.0-0' }}</div>
          <div class="text-sm text-gray-500 mt-1">Total Requested (incl. VAT)</div>
        </div>
      </div>

      <!-- Recent Requests -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Recent Funding Requests</h3>
        </div>

        <div *ngIf="loading" class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>

        <div *ngIf="!loading && nodes.length === 0" class="flex flex-col items-center justify-center py-16 text-gray-400">
          <i class="fas fa-hand-holding-usd text-5xl mb-4 text-green-200"></i>
          <p class="text-lg font-medium text-gray-500">No funding requests yet</p>
          <p class="text-sm mt-1">Go to Applications to create your first request.</p>
        </div>

        <ul *ngIf="!loading && nodes.length > 0" class="divide-y divide-gray-100">
          <li *ngFor="let node of nodes.slice(0, 5)" class="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
            <div>
              <p class="font-medium text-gray-900">{{ node.data.request_title || 'Untitled Request' }}</p>
              <p class="text-sm text-gray-500">{{ node.data.grant_program }}</p>
            </div>
            <div class="flex items-center space-x-4">
              <span class="text-sm font-semibold text-gray-800">
                R {{ node.data.totals.total_incl_vat | number:'1.2-2' }}
              </span>
              <span [class]="'px-2 py-1 rounded-full text-xs font-medium ' + getStatusColor(node.data.status)">
                {{ getStatusLabel(node.data.status) }}
              </span>
            </div>
          </li>
        </ul>
      </div>
    </div>
  `,
})
export class GrantOverviewComponent implements OnInit, OnDestroy {
  nodes: INode<GrantFundingRequestData>[] = [];
  loading = false;
  company: ICompany | null = null;

  private destroy$ = new Subject<void>();
  private route = inject(ActivatedRoute);
  private nodeService = inject(NodeService<GrantFundingRequestData>);
  private companyService = inject(CompanyService);

  get releasedCount() {
    return this.nodes.filter(n => n.data.status === 'payment_released').length;
  }

  get inProgressCount() {
    return this.nodes.filter(n => !['draft', 'payment_released'].includes(n.data.status)).length;
  }

  get totalFunding() {
    return this.nodes.reduce((sum, n) => sum + (n.data.totals?.total_incl_vat || 0), 0);
  }

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

  getStatusLabel(status: RequestStatus): string {
    return STATUS_LABELS[status] ?? status;
  }

  getStatusColor(status: RequestStatus): string {
    return STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700';
  }
}
