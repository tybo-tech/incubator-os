import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NodeService } from '../../../services/node.service';
import { BBBEEComplianceFormComponent } from '../../shared/bbbee-compliance-form.component';
import { ToastService } from '../../services/toast.service';
import { INode } from '../../../models/schema';
import { IBBBEECompliance } from '../../../models/bbbee-compliance.model';

const NODE_TYPE = 'bbbee_compliance';

@Component({
  selector: 'app-bbbee-compliance',
  standalone: true,
  imports: [CommonModule, FormsModule, BBBEEComplianceFormComponent],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold text-gray-900">BBBEE Compliance Management</h2>
          <p class="mt-1 text-sm text-gray-500">
            Track Broad-Based Black Economic Empowerment scorecard status, verification dates, and certificate management.
          </p>
        </div>
        <button
          (click)="openNew()"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors">
          <i class="fas fa-plus w-4 h-4 mr-2"></i>
          Add BBBEE Record
        </button>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-balance-scale text-blue-500 text-xl"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Total Records</p>
              <p class="text-lg font-semibold text-gray-900">{{ records().length }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-check-circle text-green-500 text-xl"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Verified</p>
              <p class="text-lg font-semibold text-green-600">{{ getVerifiedCount() }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-clock text-amber-500 text-xl"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Pending</p>
              <p class="text-lg font-semibold text-amber-600">{{ getPendingCount() }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-exclamation-triangle text-red-500 text-xl"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Expired</p>
              <p class="text-lg font-semibold text-red-600">{{ getExpiredCount() }}</p>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="loading()" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
      <div *ngIf="error()" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">{{ error() }}</div>

      <!-- Table -->
      <div *ngIf="!loading()" class="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">BBBEE Compliance Records</h3>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assessment Period</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verification Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let item of records()" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ item.data.assessmentPeriod }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ item.data.verificationDate | date:'mediumDate' }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm"
                  [class.text-red-600]="isExpired(item)"
                  [class.text-gray-900]="!isExpired(item)">
                  {{ item.data.certificateExpiryDate ? (item.data.certificateExpiryDate | date:'mediumDate') : '-' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                    [class.bg-green-100]="item.data.status === 'Verified'"
                    [class.text-green-800]="item.data.status === 'Verified'"
                    [class.bg-yellow-100]="item.data.status === 'Pending'"
                    [class.text-yellow-800]="item.data.status === 'Pending'"
                    [class.bg-blue-100]="item.data.status === 'In Progress'"
                    [class.text-blue-800]="item.data.status === 'In Progress'"
                    [class.bg-red-100]="item.data.status === 'Expired'"
                    [class.text-red-800]="item.data.status === 'Expired'"
                    [class.bg-gray-100]="item.data.status === 'Not Required'"
                    [class.text-gray-800]="item.data.status === 'Not Required'">
                    {{ item.data.status }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ item.data.score ?? '-' }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ item.data.level || '-' }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button (click)="edit(item)" class="text-green-600 hover:text-green-900 transition-colors mr-3" title="Edit record">
                    <i class="fas fa-edit w-4 h-4"></i>
                  </button>
                  <button (click)="delete(item)" class="text-red-600 hover:text-red-900 transition-colors" title="Delete record">
                    <i class="fas fa-trash w-4 h-4"></i>
                  </button>
                </td>
              </tr>

              <tr *ngIf="records().length === 0">
                <td colspan="7" class="px-6 py-12 text-center">
                  <i class="fas fa-balance-scale text-gray-400 text-3xl mb-4"></i>
                  <p class="text-gray-500 text-sm">No BBBEE compliance records yet.</p>
                  <p class="text-gray-400 text-xs mt-1">Click "Add BBBEE Record" to get started.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- BBBEE Form Dialog -->
      <app-bbbee-compliance-form
        *ngIf="showForm()"
        [nodeType]="NODE_TYPE"
        [editNode]="editingNode()"
        [companyId]="companyId()"
        (close)="closeForm()"
        (saved)="onFormSaved()" />
    </div>
  `,
})
export class BBBEEComplianceComponent implements OnInit {
  protected readonly NODE_TYPE = 'bbbee_compliance';
  protected companyId = signal<number>(0);
  records = signal<INode<IBBBEECompliance>[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  showForm = signal(false);
  editingNode = signal<INode<IBBBEECompliance> | null>(null);
  private toast = inject(ToastService);

  constructor(
    private route: ActivatedRoute,
    private nodeService: NodeService<IBBBEECompliance>,
  ) {}

  ngOnInit(): void {
    this.route.parent?.parent?.params.subscribe(params => {
      const id = parseInt(params['id'], 10);
      if (id) { this.companyId.set(id); this.loadAll(); }
    });
  }

  loadAll(): void {
    const cid = this.companyId();
    if (!cid) return;
    this.loading.set(true); this.error.set(null);
    this.nodeService.getNodesByCompany(cid, NODE_TYPE).subscribe({
      next: (r) => { this.records.set(r); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  openNew(): void { this.editingNode.set(null); this.showForm.set(true); }
  edit(item: INode<IBBBEECompliance>): void { this.editingNode.set(item); this.showForm.set(true); }
  closeForm(): void { this.showForm.set(false); this.editingNode.set(null); }
  onFormSaved(): void { this.showForm.set(false); this.editingNode.set(null); this.loadAll(); this.toast.saveSuccess('Record'); }

  delete(item: INode<IBBBEECompliance>): void {
    if (!confirm('Delete this BBBEE compliance record?')) return;
    this.nodeService.deleteNode(item.id!).subscribe({
      next: () => { this.loadAll(); this.toast.deleteSuccess('Record'); },
      error: (err) => { this.error.set(err.error?.error || 'Failed to delete'); this.toast.deleteError('record'); }
    });
  }

  isExpired(item: INode<IBBBEECompliance>): boolean {
    if (!item.data.certificateExpiryDate) return false;
    return new Date(item.data.certificateExpiryDate) < new Date();
  }

  getVerifiedCount(): number {
    return this.records().filter(r => r.data.status === 'Verified').length;
  }

  getPendingCount(): number {
    return this.records().filter(r => r.data.status === 'Pending' || r.data.status === 'In Progress').length;
  }

  getExpiredCount(): number {
    return this.records().filter(r => r.data.status === 'Expired' || this.isExpired(r)).length;
  }
}
