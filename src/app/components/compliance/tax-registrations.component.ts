import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NodeService } from '../../../services/node.service';
import { TaxRegistrationFormComponent } from '../../shared/tax-registration-form.component';
import { ToastService } from '../../services/toast.service';
import { INode } from '../../../models/schema';
import { ITaxRegistration } from '../../../models/tax-registration.model';

const NODE_TYPE = 'tax_registration';

@Component({
  selector: 'app-tax-registrations',
  standalone: true,
  imports: [CommonModule, FormsModule, TaxRegistrationFormComponent],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold text-gray-900">Tax Registrations</h2>
          <p class="mt-1 text-sm text-gray-500">
            Manage SARS tax registrations and filing obligations. Every business must register for relevant tax types.
          </p>
        </div>
        <button
          (click)="openNew()"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors">
          <i class="fas fa-plus w-4 h-4 mr-2"></i>
          Add Registration
        </button>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-file-invoice-dollar text-blue-500 text-xl"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Total Registrations</p>
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
              <p class="text-sm font-medium text-gray-500">Active</p>
              <p class="text-lg font-semibold text-green-600">{{ getActiveCount() }}</p>
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
          <h3 class="text-lg font-medium text-gray-900">Tax Registrations</h3>
          <p class="text-sm text-gray-500 mt-1">Manage SARS registration status and filing deadlines</p>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registration Type</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registration Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Filing Due</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let item of records()" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                    [class.bg-blue-100]="item.data.registrationType === 'Income Tax'"
                    [class.text-blue-800]="item.data.registrationType === 'Income Tax'"
                    [class.bg-purple-100]="item.data.registrationType === 'VAT'"
                    [class.text-purple-800]="item.data.registrationType === 'VAT'"
                    [class.bg-green-100]="item.data.registrationType === 'Turnover Tax'"
                    [class.text-green-800]="item.data.registrationType === 'Turnover Tax'"
                    [class.bg-orange-100]="item.data.registrationType === 'PAYE'"
                    [class.text-orange-800]="item.data.registrationType === 'PAYE'">
                    {{ item.data.registrationType }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ item.data.registrationDate | date:'mediumDate' }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm"
                  [class.text-red-600]="isFilingOverdue(item)"
                  [class.text-amber-600]="isFilingDueSoon(item) && !isFilingOverdue(item)"
                  [class.text-gray-900]="!isFilingOverdue(item) && !isFilingDueSoon(item)">
                  {{ item.data.nextFilingDueDate ? (item.data.nextFilingDueDate | date:'mediumDate') : '-' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                    [class.bg-green-100]="item.data.status === 'Active'"
                    [class.text-green-800]="item.data.status === 'Active'"
                    [class.bg-yellow-100]="item.data.status === 'Dormant'"
                    [class.text-yellow-800]="item.data.status === 'Dormant'"
                    [class.bg-red-100]="item.data.status === 'Expired'"
                    [class.text-red-800]="item.data.status === 'Expired'">
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
                  <i class="fas fa-file-invoice-dollar text-gray-400 text-3xl mb-4"></i>
                  <p class="text-gray-500 text-sm">No tax registrations for this company yet.</p>
                  <p class="text-gray-400 text-xs mt-1">Click "Add Registration" to get started.</p>
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
            <h3 class="text-sm font-medium text-blue-800">SARS Tax Registration Requirements</h3>
            <div class="mt-2 text-sm text-blue-700">
              <ul class="list-disc list-inside space-y-1">
                <li><strong>Income Tax:</strong> All companies must register within 60 days of incorporation</li>
                <li><strong>VAT:</strong> Mandatory if turnover exceeds R1 million annually</li>
                <li><strong>Turnover Tax:</strong> For qualifying small businesses (turnover under R1 million)</li>
                <li><strong>PAYE:</strong> Required when employing staff or paying salaries</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Tax Registration Form Dialog -->
      <app-tax-registration-form
        *ngIf="showForm()"
        [nodeType]="NODE_TYPE"
        [editNode]="editingNode()"
        [companyId]="companyId()"
        (close)="closeForm()"
        (saved)="onFormSaved()" />
    </div>
  `,
})
export class TaxRegistrationsComponent implements OnInit {
  protected readonly NODE_TYPE = 'tax_registration';
  protected companyId = signal<number>(0);
  records = signal<INode<ITaxRegistration>[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  showForm = signal(false);
  editingNode = signal<INode<ITaxRegistration> | null>(null);
  private toast = inject(ToastService);

  constructor(
    private route: ActivatedRoute,
    private nodeService: NodeService<ITaxRegistration>,
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
  edit(item: INode<ITaxRegistration>): void { this.editingNode.set(item); this.showForm.set(true); }
  closeForm(): void { this.showForm.set(false); this.editingNode.set(null); }
  onFormSaved(): void { this.showForm.set(false); this.editingNode.set(null); this.loadAll(); this.toast.saveSuccess('Registration'); }

  delete(item: INode<ITaxRegistration>): void {
    if (!confirm('Delete this tax registration record?')) return;
    this.nodeService.deleteNode(item.id!).subscribe({
      next: () => { this.loadAll(); this.toast.deleteSuccess('Registration'); },
      error: (err) => { this.error.set(err.error?.error || 'Failed to delete'); this.toast.deleteError('registration'); }
    });
  }

  isFilingOverdue(item: INode<ITaxRegistration>): boolean {
    if (!item.data.nextFilingDueDate || item.data.status !== 'Active') return false;
    return new Date(item.data.nextFilingDueDate) < new Date();
  }

  isFilingDueSoon(item: INode<ITaxRegistration>): boolean {
    if (!item.data.nextFilingDueDate || item.data.status !== 'Active') return false;
    const due = new Date(item.data.nextFilingDueDate);
    const today = new Date();
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return due <= thirtyDays && due >= today;
  }

  getActiveCount(): number {
    return this.records().filter(r => r.data.status === 'Active').length;
  }

  getDueSoonCount(): number {
    return this.records().filter(r => this.isFilingDueSoon(r)).length;
  }

  getExpiredCount(): number {
    return this.records().filter(r => r.data.status === 'Expired').length;
  }
}
