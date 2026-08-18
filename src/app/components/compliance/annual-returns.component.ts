import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NodeService } from '../../../services/node.service';
import { AnnualReturnFormComponent } from '../../shared/annual-return-form.component';
import { ToastService } from '../../services/toast.service';
import { INode } from '../../../models/schema';
import { IAnnualReturn } from '../../../models/annual-return.model';

const NODE_TYPE = 'annual_return';

@Component({
  selector: 'app-annual-returns',
  standalone: true,
  imports: [CommonModule, FormsModule, AnnualReturnFormComponent],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold text-gray-900">Annual Returns Management</h2>
          <p class="mt-1 text-sm text-gray-500">
            Track CIPC annual return filing status and due dates. Companies must file within 30 business days of their anniversary month.
          </p>
        </div>
        <button
          (click)="openNew()"
          class="inline-flex items-center px-5 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 hover:shadow-md transition-all">
          <i class="fas fa-plus mr-2"></i>
          Add Return
        </button>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-calendar-check text-blue-500 text-xl"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Total Returns</p>
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
              <p class="text-sm font-medium text-gray-500">Filed</p>
              <p class="text-lg font-semibold text-green-600">{{ getFiledCount() }}</p>
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
        <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 class="text-lg font-semibold text-gray-900">Annual Returns</h3>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Year Ending</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Anniversary Date</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Due Date</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Filing Date</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Fee Paid</th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let item of records()" class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ item.data.yearEnding }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ item.data.anniversaryDate | date:'mediumDate' }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm"
                  [class.text-red-600]="isOverdue(item)"
                  [class.text-amber-600]="isDueSoon(item) && !isOverdue(item)"
                  [class.text-gray-900]="!isOverdue(item) && !isDueSoon(item)">
                  {{ item.data.dueDate | date:'mediumDate' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ item.data.filingDate ? (item.data.filingDate | date:'mediumDate') : '-' }}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                    [class.bg-green-100]="item.data.status === 'Filed'"
                    [class.text-green-800]="item.data.status === 'Filed'"
                    [class.bg-yellow-100]="item.data.status === 'Pending'"
                    [class.text-yellow-800]="item.data.status === 'Pending'"
                    [class.bg-blue-100]="item.data.status === 'In Progress'"
                    [class.text-blue-800]="item.data.status === 'In Progress'"
                    [class.bg-red-100]="item.data.status === 'Overdue'"
                    [class.text-red-800]="item.data.status === 'Overdue'"
                    [class.bg-gray-100]="item.data.status === 'Not Required'"
                    [class.text-gray-800]="item.data.status === 'Not Required'">
                    {{ item.data.status }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{{ item.data.feePaid ? (item.data.feePaid | currency:'ZAR':'symbol':'1.0-0') : '-' }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                  <button (click)="edit(item)" class="text-blue-600 hover:text-blue-900 transition-colors mr-3" title="Edit record">
                    <i class="fas fa-edit w-4 h-4"></i>
                  </button>
                  <button (click)="delete(item)" class="text-red-600 hover:text-red-900 transition-colors" title="Delete record">
                    <i class="fas fa-trash w-4 h-4"></i>
                  </button>
                </td>
              </tr>

              <tr *ngIf="records().length === 0">
                <td colspan="7" class="px-6 py-16 text-center">
                  <div class="flex flex-col items-center justify-center">
                    <div class="bg-gray-100 rounded-full p-6 mb-4">
                      <i class="fas fa-calendar-check text-gray-400 text-4xl"></i>
                    </div>
                    <p class="text-gray-600 text-base font-medium mb-1">No annual returns recorded yet</p>
                    <p class="text-gray-500 text-sm">Click "Add Return" to create your first record</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Annual Return Form Dialog -->
      <app-annual-return-form
        *ngIf="showForm()"
        [nodeType]="NODE_TYPE"
        [editNode]="editingNode()"
        [companyId]="companyId()"
        (close)="closeForm()"
        (saved)="onFormSaved()" />
    </div>
  `,
})
export class AnnualReturnsComponent implements OnInit {
  protected readonly NODE_TYPE = 'annual_return';
  protected companyId = signal<number>(0);
  records = signal<INode<IAnnualReturn>[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  showForm = signal(false);
  editingNode = signal<INode<IAnnualReturn> | null>(null);
  private toast = inject(ToastService);

  constructor(
    private route: ActivatedRoute,
    private nodeService: NodeService<IAnnualReturn>,
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
  edit(item: INode<IAnnualReturn>): void { this.editingNode.set(item); this.showForm.set(true); }
  closeForm(): void { this.showForm.set(false); this.editingNode.set(null); }
  onFormSaved(): void { this.showForm.set(false); this.editingNode.set(null); this.loadAll(); this.toast.saveSuccess('Return'); }

  delete(item: INode<IAnnualReturn>): void {
    if (!confirm('Delete this annual return record?')) return;
    this.nodeService.deleteNode(item.id!).subscribe({
      next: () => { this.loadAll(); this.toast.deleteSuccess('Return'); },
      error: (err) => { this.error.set(err.error?.error || 'Failed to delete'); this.toast.deleteError('return'); }
    });
  }

  isOverdue(item: INode<IAnnualReturn>): boolean {
    if (item.data.status === 'Filed' || item.data.status === 'Not Required') return false;
    return new Date(item.data.dueDate) < new Date();
  }

  isDueSoon(item: INode<IAnnualReturn>): boolean {
    if (item.data.status === 'Filed' || item.data.status === 'Not Required') return false;
    const due = new Date(item.data.dueDate);
    const today = new Date();
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return due <= thirtyDays && due >= today;
  }

  getFiledCount(): number {
    return this.records().filter(r => r.data.status === 'Filed').length;
  }

  getPendingCount(): number {
    return this.records().filter(r => r.data.status === 'Pending' || r.data.status === 'In Progress').length;
  }

  getOverdueCount(): number {
    return this.records().filter(r => this.isOverdue(r)).length;
  }
}
