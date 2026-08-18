import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NodeService } from '../../../services/node.service';
import { BeneficialOwnershipFormComponent } from '../../shared/beneficial-ownership-form.component';
import { ToastService } from '../../services/toast.service';
import { INode } from '../../../models/schema';
import { IBeneficialOwnership } from '../../../models/beneficial-ownership.model';

const NODE_TYPE = 'beneficial_ownership';

@Component({
  selector: 'app-beneficial-ownership',
  standalone: true,
  imports: [CommonModule, FormsModule, BeneficialOwnershipFormComponent],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold text-gray-900">Beneficial Ownership Declarations</h2>
          <p class="mt-1 text-sm text-gray-500">
            As of 1 July 2024, companies must file Beneficial Ownership details alongside annual returns to CIPC.
          </p>
        </div>
        <button
          (click)="openNew()"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors">
          <i class="fas fa-plus w-4 h-4 mr-2"></i>
          Add Declaration
        </button>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-users text-blue-500 text-xl"></i>
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
              <p class="text-sm font-medium text-gray-500">Submitted</p>
              <p class="text-lg font-semibold text-green-600">{{ getSubmittedCount() }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-clock text-amber-500 text-xl"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Due Soon (30 days)</p>
              <p class="text-lg font-semibold text-amber-600">{{ getDueSoonCount() }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-exclamation-triangle text-red-500 text-xl"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Overdue</p>
              <p class="text-lg font-semibold text-red-600">{{ getOverdueCount() }}</p>
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
          <h3 class="text-lg font-medium text-gray-900">Beneficial Ownership Register</h3>
          <p class="text-sm text-gray-500 mt-1">Track compliance with CIPC Beneficial Ownership requirements</p>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Declaration Type</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let item of records()" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    {{ item.data.declarationType }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm"
                  [class.text-red-600]="isOverdue(item)"
                  [class.text-amber-600]="isDueSoon(item) && !isOverdue(item)"
                  [class.text-gray-900]="!isOverdue(item) && !isDueSoon(item)">
                  {{ item.data.dueDate | date:'mediumDate' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ item.data.submittedDate ? (item.data.submittedDate | date:'mediumDate') : '-' }}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                    [class.bg-green-100]="item.data.status === 'Submitted'"
                    [class.text-green-800]="item.data.status === 'Submitted'"
                    [class.bg-gray-100]="item.data.status === 'Not Submitted'"
                    [class.text-gray-800]="item.data.status === 'Not Submitted'"
                    [class.bg-red-100]="item.data.status === 'Overdue'"
                    [class.text-red-800]="item.data.status === 'Overdue'">
                    {{ item.data.status }}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">{{ item.data.notes || '-' }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button (click)="edit(item)" class="text-blue-600 hover:text-blue-900 transition-colors mr-3" title="Edit record">
                    <i class="fas fa-edit w-4 h-4"></i>
                  </button>
                  <button (click)="delete(item)" class="text-red-600 hover:text-red-900 transition-colors" title="Delete record">
                    <i class="fas fa-trash w-4 h-4"></i>
                  </button>
                </td>
              </tr>

              <tr *ngIf="records().length === 0">
                <td colspan="6" class="px-6 py-12 text-center">
                  <i class="fas fa-users text-gray-400 text-3xl mb-4"></i>
                  <p class="text-gray-500 text-sm">No beneficial ownership records for this company yet.</p>
                  <p class="text-gray-400 text-xs mt-1">Click "Add Declaration" to get started.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Information Panel -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <i class="fas fa-info-circle text-blue-400"></i>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-blue-800">Beneficial Ownership Requirements</h3>
            <div class="mt-2 text-sm text-blue-700">
              <p class="mb-2">As of 1 July 2024, all companies must maintain a beneficial ownership register and file declarations with CIPC:</p>
              <ul class="list-disc list-inside space-y-1">
                <li>Must be filed alongside annual returns</li>
                <li>Discloses individuals who own or control 25% or more of shares or voting rights</li>
                <li>Must be updated within 30 days of any changes</li>
                <li>Failure to comply may result in penalties or deregistration</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Beneficial Ownership Form Dialog -->
      <app-beneficial-ownership-form
        *ngIf="showForm()"
        [nodeType]="NODE_TYPE"
        [editNode]="editingNode()"
        [companyId]="companyId()"
        (close)="closeForm()"
        (saved)="onFormSaved()" />
    </div>
  `,
})
export class BeneficialOwnershipComponent implements OnInit {
  protected readonly NODE_TYPE = 'beneficial_ownership';
  protected companyId = signal<number>(0);
  records = signal<INode<IBeneficialOwnership>[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  showForm = signal(false);
  editingNode = signal<INode<IBeneficialOwnership> | null>(null);
  private toast = inject(ToastService);

  constructor(
    private route: ActivatedRoute,
    private nodeService: NodeService<IBeneficialOwnership>,
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
  edit(item: INode<IBeneficialOwnership>): void { this.editingNode.set(item); this.showForm.set(true); }
  closeForm(): void { this.showForm.set(false); this.editingNode.set(null); }
  onFormSaved(): void { this.showForm.set(false); this.editingNode.set(null); this.loadAll(); this.toast.saveSuccess('Declaration'); }

  delete(item: INode<IBeneficialOwnership>): void {
    if (!confirm('Delete this beneficial ownership record?')) return;
    this.nodeService.deleteNode(item.id!).subscribe({
      next: () => { this.loadAll(); this.toast.deleteSuccess('Declaration'); },
      error: (err) => { this.error.set(err.error?.error || 'Failed to delete'); this.toast.deleteError('declaration'); }
    });
  }

  isOverdue(item: INode<IBeneficialOwnership>): boolean {
    if (item.data.status === 'Submitted') return false;
    return new Date(item.data.dueDate) < new Date();
  }

  isDueSoon(item: INode<IBeneficialOwnership>): boolean {
    if (item.data.status === 'Submitted') return false;
    const due = new Date(item.data.dueDate);
    const today = new Date();
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return due <= thirtyDays && due >= today;
  }

  getSubmittedCount(): number {
    return this.records().filter(r => r.data.status === 'Submitted').length;
  }

  getDueSoonCount(): number {
    return this.records().filter(r => this.isDueSoon(r)).length;
  }

  getOverdueCount(): number {
    return this.records().filter(r => this.isOverdue(r)).length;
  }
}
