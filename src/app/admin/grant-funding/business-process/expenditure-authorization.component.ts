import { Component, Input, OnInit, signal, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  GrantExpenditureAuthorization, 
  DEFAULT_GRANT_EXPENDITURE_AUTHORIZATION,
  ExpenditureInvoice,
  AuthorizationSignature,
  PaymentRelease
} from './expenditure-authorization.models';
import { NodeService } from '../../../../services/node.service';
import { SignaturePadLibComponent } from '../../../shared/components/signature-pad-lib.component';
import { GrantProcessExportService, CompanyInfo } from '../services/grant-process-export.service';

@Component({
  selector: 'app-expenditure-authorization',
  standalone: true,
  imports: [CommonModule, FormsModule, SignaturePadLibComponent],
  template: `
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <!-- Header -->
      <div class="px-6 py-5 border-b border-gray-100">
        <div class="flex items-center">
          <i class="fas fa-file-invoice-dollar text-blue-600 text-xl mr-3"></i>
          <div>
            <h2 class="text-lg font-semibold text-gray-900">
              Expenditure Authorization Form
            </h2>
            <p class="text-sm text-gray-500 mt-1">
              Authorize grant expenditure for goods and services.
            </p>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading()" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span class="ml-3 text-gray-600">Loading expenditure authorization data...</span>
      </div>

      <!-- Content -->
      <div *ngIf="!isLoading()" class="p-6">

        <!-- Invoice Details -->
        <div class="border rounded-xl p-5 mb-7 bg-white shadow-sm">
          <div class="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
            <div class="flex items-center">
              <div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 mr-3">
                <span class="font-semibold">1</span>
              </div>
              <div>
                <h3 class="font-semibold text-lg">Invoice Details</h3>
                <p class="text-sm text-gray-500">Capture invoice information for goods and services.</p>
              </div>
            </div>
            <button
              (click)="addInvoice()"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
              <i class="fas fa-plus mr-2"></i>
              Add Invoice
            </button>
          </div>

          <!-- Validation Message -->
          <div *ngIf="expenditureAuthorization().invoices.length === 0" class="mb-5 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div class="flex">
              <i class="fas fa-exclamation-circle text-yellow-500 text-lg mt-0.5 mr-3"></i>
              <div>
                <h4 class="font-medium text-yellow-800">No invoices added</h4>
                <p class="text-sm text-yellow-700 mt-1">Add at least one invoice to proceed with authorization.</p>
              </div>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50">
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Invoice Number</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Description</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Supplier</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Amount Excl VAT</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">VAT Amount</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Total Amount</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Preferred Supplier</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let invoice of expenditureAuthorization().invoices; let i = index" class="border-t border-gray-100 hover:bg-gray-50">
                  <td class="px-4 py-3">
                    <input
                      type="text"
                      [(ngModel)]="invoice.invoice_number"
                      placeholder="Enter invoice number"
                      class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </td>
                  <td class="px-4 py-3">
                    <input
                      type="text"
                      [(ngModel)]="invoice.description"
                      placeholder="Enter description"
                      class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </td>
                  <td class="px-4 py-3">
                    <input
                      type="text"
                      [(ngModel)]="invoice.supplier_name"
                      placeholder="Enter supplier name"
                      class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </td>
                  <td class="px-4 py-3">
                    <input
                      type="number"
                      [(ngModel)]="invoice.amount_excl_vat"
                      placeholder="0.00"
                      (input)="calculateTotalAmount(invoice)"
                      class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </td>
                  <td class="px-4 py-3">
                    <input
                      type="number"
                      [(ngModel)]="invoice.vat_amount"
                      placeholder="0.00"
                      (input)="calculateTotalAmount(invoice)"
                      class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </td>
                  <td class="px-4 py-3">
                    <input
                      type="number"
                      [(ngModel)]="invoice.total_amount"
                      placeholder="0.00"
                      readonly
                      class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center">
                      <input
                        type="checkbox"
                        [(ngModel)]="invoice.preferred_supplier"
                        class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <button
                      (click)="removeInvoice(i)"
                      class="text-red-500 hover:text-red-700 text-sm flex items-center">
                      <i class="fas fa-trash mr-1"></i>
                      Remove
                    </button>
                  </td>
                </tr>
                <tr *ngIf="expenditureAuthorization().invoices.length === 0">
                  <td colspan="8" class="px-4 py-8 text-center text-gray-400">
                    <i class="fas fa-file-invoice text-2xl mb-2 block"></i>
                    <p>No invoices added yet. Click "Add Invoice" to get started.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Beneficiary Authorization -->
        <div class="border rounded-xl p-5 mb-7 bg-white shadow-sm">
          <div class="flex items-center mb-5 pb-3 border-b border-gray-100">
            <div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 mr-3">
              <span class="font-semibold">2</span>
            </div>
            <div>
              <h3 class="font-semibold text-lg">Beneficiary Authorization</h3>
              <p class="text-sm text-gray-500">I [Director Name] acknowledge that the supplier information provided is correct and hereby authorize payment.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Beneficiary Name</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i class="fas fa-user text-gray-400"></i>
                </div>
                <input
                  type="text"
                  [(ngModel)]="expenditureAuthorization().beneficiary_authorization.name"
                  placeholder="Enter beneficiary name"
                  class="w-full text-sm border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i class="fas fa-calendar text-gray-400"></i>
                </div>
                <input
                  type="date"
                  [(ngModel)]="expenditureAuthorization().beneficiary_authorization.date"
                  class="w-full text-sm border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Signature</label>
              <app-signature-pad-lib
                [(ngModel)]="expenditureAuthorization().beneficiary_authorization.signature"
                [width]="200"
                [height]="100">
              </app-signature-pad-lib>
            </div>
          </div>
        </div>

        <!-- Business Advisor Authorization -->
        <div class="border rounded-xl p-5 mb-7 bg-white shadow-sm">
          <div class="flex items-center mb-5 pb-3 border-b border-gray-100">
            <div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 mr-3">
              <span class="font-semibold">3</span>
            </div>
            <div>
              <h3 class="font-semibold text-lg">Business Advisor Authorization</h3>
              <p class="text-sm text-gray-500">Business advisor verification and authorization.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Business Advisor Name</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i class="fas fa-user text-gray-400"></i>
                </div>
                <input
                  type="text"
                  [(ngModel)]="expenditureAuthorization().business_advisor_authorization.name"
                  placeholder="Enter business advisor name"
                  class="w-full text-sm border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i class="fas fa-calendar text-gray-400"></i>
                </div>
                <input
                  type="date"
                  [(ngModel)]="expenditureAuthorization().business_advisor_authorization.date"
                  class="w-full text-sm border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Signature</label>
              <app-signature-pad-lib
                [(ngModel)]="expenditureAuthorization().business_advisor_authorization.signature"
                [width]="200"
                [height]="100">
              </app-signature-pad-lib>
            </div>
          </div>
        </div>

        <!-- Additional Approvals -->
        <div class="border rounded-xl p-5 mb-7 bg-white shadow-sm">
          <div class="flex items-center mb-5 pb-3 border-b border-gray-100">
            <div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 mr-3">
              <span class="font-semibold">4</span>
            </div>
            <div>
              <h3 class="font-semibold text-lg">Additional Approvals</h3>
              <p class="text-sm text-gray-500">Additional authorization approvals required.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            <!-- ESD Centre Coordinator -->
            <div class="border rounded-lg p-4">
              <h4 class="font-medium text-gray-900 mb-3">ESD Centre Coordinator</h4>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <i class="fas fa-user text-gray-400"></i>
                    </div>
                    <input
                      type="text"
                      [(ngModel)]="expenditureAuthorization().coordinator_authorization.name"
                      placeholder="Enter coordinator name"
                      class="w-full text-sm border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <i class="fas fa-calendar text-gray-400"></i>
                    </div>
                    <input
                      type="date"
                      [(ngModel)]="expenditureAuthorization().coordinator_authorization.date"
                      class="w-full text-sm border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Signature</label>
                  <app-signature-pad-lib
                    [(ngModel)]="expenditureAuthorization().coordinator_authorization.signature"
                    [width]="200"
                    [height]="100">
                  </app-signature-pad-lib>
                </div>
              </div>
            </div>

            <!-- South32 SPA -->
            <div class="border rounded-lg p-4">
              <h4 class="font-medium text-gray-900 mb-3">South32 SPA</h4>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <i class="fas fa-user text-gray-400"></i>
                    </div>
                    <input
                      type="text"
                      [(ngModel)]="expenditureAuthorization().south32_spa_authorization.name"
                      placeholder="Enter SPA name"
                      class="w-full text-sm border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <i class="fas fa-calendar text-gray-400"></i>
                    </div>
                    <input
                      type="date"
                      [(ngModel)]="expenditureAuthorization().south32_spa_authorization.date"
                      class="w-full text-sm border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Signature</label>
                  <app-signature-pad-lib
                    [(ngModel)]="expenditureAuthorization().south32_spa_authorization.signature"
                    [width]="200"
                    [height]="100">
                  </app-signature-pad-lib>
                </div>
              </div>
            </div>

            <!-- ESD Centre Manager -->
            <div class="border rounded-lg p-4">
              <h4 class="font-medium text-gray-900 mb-3">ESD Centre Manager</h4>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <i class="fas fa-user text-gray-400"></i>
                    </div>
                    <input
                      type="text"
                      [(ngModel)]="expenditureAuthorization().manager_authorization.name"
                      placeholder="Enter manager name"
                      class="w-full text-sm border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <i class="fas fa-calendar text-gray-400"></i>
                    </div>
                    <input
                      type="date"
                      [(ngModel)]="expenditureAuthorization().manager_authorization.date"
                      class="w-full text-sm border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Signature</label>
                  <app-signature-pad-lib
                    [(ngModel)]="expenditureAuthorization().manager_authorization.signature"
                    [width]="200"
                    [height]="100">
                  </app-signature-pad-lib>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Payment Release -->
        <div class="border rounded-xl p-5 mb-7 bg-white shadow-sm">
          <div class="flex items-center mb-5 pb-3 border-b border-gray-100">
            <div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 mr-3">
              <span class="font-semibold">5</span>
            </div>
            <div>
              <h3 class="font-semibold text-lg">Payment Release</h3>
              <p class="text-sm text-gray-500">Final payment release authorization.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Payment Released By</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i class="fas fa-user text-gray-400"></i>
                </div>
                <input
                  type="text"
                  [(ngModel)]="expenditureAuthorization().payment_release.released_by"
                  placeholder="Enter name"
                  class="w-full text-sm border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Payment Release Date</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i class="fas fa-calendar text-gray-400"></i>
                </div>
                <input
                  type="date"
                  [(ngModel)]="expenditureAuthorization().payment_release.release_date"
                  class="w-full text-sm border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Signature</label>
              <app-signature-pad-lib
                [(ngModel)]="expenditureAuthorization().payment_release.signature"
                [width]="200"
                [height]="100">
              </app-signature-pad-lib>
            </div>
          </div>
        </div>

        <!-- Save Button -->
        <div class="flex justify-end space-x-3 pt-4">
          <button
            (click)="exportToPdf()"
            class="px-6 py-3 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center">
            <i class="fas fa-file-pdf mr-2"></i>
            Export to PDF
          </button>
          <button
            (click)="saveExpenditureAuthorization()"
            [disabled]="isSaving()"
            class="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center">
            <i class="fas fa-save mr-2"></i>
            {{ isSaving() ? 'Saving...' : 'Save Expenditure Authorization' }}
          </button>
        </div>

        <!-- Status Message -->
        <div *ngIf="saveStatus()" class="mt-6 p-4 rounded-lg"
             [class]="saveStatus()!.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'">
          <div class="flex">
            <i class="fas text-lg mt-0.5 mr-3"
               [class]="saveStatus()!.type === 'success' ? 'fa-check-circle text-green-500' : 'fa-exclamation-circle text-red-500'"></i>
            <div>
              <h4 class="font-medium"
                  [class]="saveStatus()!.type === 'success' ? 'text-green-800' : 'text-red-800'">
                {{ saveStatus()!.type === 'success' ? 'Success' : 'Error' }}
              </h4>
              <p class="mt-1">{{ saveStatus()!.message }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ExpenditureAuthorizationComponent implements OnInit {
  @Input() companyId!: number;
  @Input() applicantId!: number;

  isLoading = signal(true);
  isSaving = signal(false);
  saveStatus = signal<{ message: string; type: 'success' | 'error' } | null>(null);
  
  expenditureAuthorization = signal<GrantExpenditureAuthorization>({ ...DEFAULT_GRANT_EXPENDITURE_AUTHORIZATION });
  expenditureAuthorizationNode = signal<any>(null);

  private nodeService: NodeService;
  private exportService: GrantProcessExportService;

  constructor(nodeService: NodeService, exportService: GrantProcessExportService) {
    this.nodeService = nodeService;
    this.exportService = exportService;
  }

  ngOnInit(): void {
    this.loadExpenditureAuthorization();
  }

  loadExpenditureAuthorization(): void {
    this.isLoading.set(true);
    // Try to load existing expenditure authorization for this company
    this.nodeService.getNodes('grant_expenditure_authorization', this.companyId).subscribe({
      next: (nodes: any[]) => {
        if (nodes.length > 0) {
          // Load existing expenditure authorization data
          const existingData = nodes[0].data as GrantExpenditureAuthorization;
          this.expenditureAuthorization.set({
            ...DEFAULT_GRANT_EXPENDITURE_AUTHORIZATION,
            ...existingData
          });
          this.expenditureAuthorizationNode.set(nodes[0]);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  saveExpenditureAuthorization(): void {
    this.isSaving.set(true);
    this.saveStatus.set(null);

    const expenditureData = this.expenditureAuthorization();

    // Save or update the expenditure authorization node
    const nodeData: any = {
      type: 'grant_expenditure_authorization',
      parent_id: this.companyId,
      data: expenditureData
    };

    // If we have an existing node, update it, otherwise create a new one
    let saveObservable;
    if (this.expenditureAuthorizationNode()) {
      nodeData.id = this.expenditureAuthorizationNode().id;
      saveObservable = this.nodeService.updateNode(nodeData);
    } else {
      saveObservable = this.nodeService.addNode(nodeData);
    }

    saveObservable.subscribe({
      next: (response: any) => {
        this.isSaving.set(false);
        this.expenditureAuthorizationNode.set(response);
        this.saveStatus.set({ message: 'Expenditure Authorization saved successfully!', type: 'success' });
        // Clear status message after 3 seconds
        setTimeout(() => this.saveStatus.set(null), 3000);
      },
      error: (error: any) => {
        this.isSaving.set(false);
        this.saveStatus.set({ message: 'Failed to save Expenditure Authorization. Please try again.', type: 'error' });
        console.error('Error saving Expenditure Authorization:', error);
      }
    });
  }

  addInvoice(): void {
    const newInvoice: ExpenditureInvoice = {
      id: `inv_${Date.now()}`,
      invoice_number: '',
      description: '',
      supplier_name: '',
      amount_excl_vat: 0,
      vat_amount: 0,
      total_amount: 0,
      preferred_supplier: false
    };

    this.expenditureAuthorization.update(data => ({
      ...data,
      invoices: [...data.invoices, newInvoice]
    }));
  }

  removeInvoice(index: number): void {
    this.expenditureAuthorization.update(data => ({
      ...data,
      invoices: data.invoices.filter((_, i) => i !== index)
    }));
  }

  calculateTotalAmount(invoice: ExpenditureInvoice): void {
    invoice.total_amount = (invoice.amount_excl_vat || 0) + (invoice.vat_amount || 0);
  }

  exportToPdf(): void {
    const companyInfo: CompanyInfo = {
      companyName: this.expenditureAuthorization().company_name,
      directorName: this.expenditureAuthorization().director_name,
      contactNumber: this.expenditureAuthorization().contact_number,
      registrationNumber: this.expenditureAuthorization().registration_number
    };

    this.exportService.exportExpenditureAuthorization(
      this.expenditureAuthorization(),
      companyInfo
    );
  }
}
