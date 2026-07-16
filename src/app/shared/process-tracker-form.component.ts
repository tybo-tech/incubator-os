import { Component, input, output, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyService } from '../../services/company.service';
import { NodeService } from '../../services/node.service';
import { INode } from '../../models/schema';

@Component({
  selector: 'app-process-tracker-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" (click)="close.emit()">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">{{ isEdit() ? 'Edit' : 'New' }} Process Record</h3>
          <button (click)="close.emit()" class="p-1 text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <div class="relative">
              <input type="text" [(ngModel)]="companySearch" (input)="filterCompanies()" placeholder="Search company..." class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              <div *ngIf="filteredCompanies().length > 0" class="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
                <button *ngFor="let c of filteredCompanies()" (click)="selectCompany(c.id, c.name)" class="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 border-b border-gray-100 last:border-0">{{ c.name }}</button>
              </div>
            </div>
            <div *ngIf="selectedCompanyName" class="mt-1 text-xs text-green-600">✓ {{ selectedCompanyName }}</div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-sm font-medium text-gray-700 mb-1"># Transactions</label><input type="number" [(ngModel)]="form.numberOfTransactions" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" /></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Amount Disbursed</label><input type="number" [(ngModel)]="form.amountDisbursed" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" /></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Completion %</label><input type="number" [(ngModel)]="form.completionPercentage" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" min="0" max="100" /></div>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-gray-800 mb-3 pb-2 border-b">Process Steps</h4>
            <div class="grid grid-cols-2 gap-3">
              <label class="flex items-center space-x-3"><input type="checkbox" [(ngModel)]="form.steps.quotesReceived" class="h-4 w-4 text-blue-600 rounded border-gray-300"><span class="text-sm text-gray-700">Quotes Received</span></label>
              <label class="flex items-center space-x-3"><input type="checkbox" [(ngModel)]="form.steps.suppliersVerified" class="h-4 w-4 text-blue-600 rounded border-gray-300"><span class="text-sm text-gray-700">Suppliers Verified</span></label>
              <label class="flex items-center space-x-3"><input type="checkbox" [(ngModel)]="form.steps.purchaseOrderGenerated" class="h-4 w-4 text-blue-600 rounded border-gray-300"><span class="text-sm text-gray-700">PO Generated</span></label>
              <label class="flex items-center space-x-3"><input type="checkbox" [(ngModel)]="form.steps.invoicesReceived" class="h-4 w-4 text-blue-600 rounded border-gray-300"><span class="text-sm text-gray-700">Invoices Received</span></label>
              <label class="flex items-center space-x-3"><input type="checkbox" [(ngModel)]="form.steps.expenseAuthorizationSigned" class="h-4 w-4 text-blue-600 rounded border-gray-300"><span class="text-sm text-gray-700">Expense Auth Signed</span></label>
              <label class="flex items-center space-x-3"><input type="checkbox" [(ngModel)]="form.steps.acknowledgementOfDeliverySigned" class="h-4 w-4 text-blue-600 rounded border-gray-300"><span class="text-sm text-gray-700">Delivery Ack</span></label>
              <label class="flex items-center space-x-3"><input type="checkbox" [(ngModel)]="form.steps.supportingDocumentsLoaded" class="h-4 w-4 text-blue-600 rounded border-gray-300"><span class="text-sm text-gray-700">Docs Loaded</span></label>
            </div>
          </div>
        </div>
        <div class="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200">
          <button (click)="close.emit()" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
          <button (click)="save()" [disabled]="saving()" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">{{ saving() ? 'Saving...' : 'Save' }}</button>
        </div>
      </div>
    </div>
  `
})
export class ProcessTrackerFormComponent implements OnInit {
  nodeType = input.required<string>();
  editNode = input<INode<any> | null>(null);
  companyId = input<number>(0);
  close = output<void>();
  saved = output<void>();

  isEdit = computed(() => !!this.editNode());

  form = {
    companyName: '',
    numberOfTransactions: 0,
    steps: { quotesReceived: false, suppliersVerified: false, purchaseOrderGenerated: false, invoicesReceived: false, expenseAuthorizationSigned: false, acknowledgementOfDeliverySigned: false, supportingDocumentsLoaded: false },
    amountDisbursed: 0,
    completionPercentage: 0,
  };

  companySearch = '';
  selectedCompanyId = 0;
  selectedCompanyName = '';
  allCompanies: { id: number; name: string }[] = [];
  filteredCompanies = signal<{ id: number; name: string }[]>([]);
  saving = signal(false);

  constructor(
    private companyService: CompanyService,
    private nodeService: NodeService<any>,
  ) {
    this.companyService.listAllCompanies().subscribe(c => this.allCompanies = c);
  }

  ngOnInit(): void {
    const node = this.editNode();
    if (node) {
      this.form = { ...node.data, steps: { ...node.data.steps } };
      this.selectedCompanyId = node.company_id || 0;
      const companyName = node.company_id
        ? (this.allCompanies.find(c => c.id === node.company_id)?.name || '')
        : (node.data.companyName || '');
      this.selectedCompanyName = companyName;
      this.companySearch = companyName;
    }
  }

  filterCompanies(): void {
    const term = this.companySearch.toLowerCase().trim();
    if (!term) { this.filteredCompanies.set([]); return; }
    this.filteredCompanies.set(this.allCompanies.filter(c => c.name.toLowerCase().includes(term)).slice(0, 10));
  }

  selectCompany(id: number, name: string): void {
    this.selectedCompanyId = id;
    this.selectedCompanyName = name;
    this.companySearch = name;
    this.filteredCompanies.set([]);
  }

  save(): void {
    this.saving.set(true);
    const node = this.editNode();
    const cid = this.companyId() || this.selectedCompanyId || 0;
    const payload: any = {
      type: this.nodeType(),
      company_id: cid,
      data: this.form,
    };

    const obs = node?.id
      ? this.nodeService.updateNode({ ...node, company_id: cid, data: this.form })
      : this.nodeService.addNode(payload);

    obs.subscribe({
      next: () => { this.saving.set(false); this.saved.emit(); },
      error: () => { this.saving.set(false); }
    });
  }
}
