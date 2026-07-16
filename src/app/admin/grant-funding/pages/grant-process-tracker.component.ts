import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NodeService } from '../../../../services/node.service';
import { CompanyService } from '../../../../services/company.service';
import { AssignCompanyComponent } from '../../../shared/assign-company.component';
import { ProcessTrackerFormComponent } from '../../../shared/process-tracker-form.component';
import { INode } from '../../../../models/schema';
import { IProcessTracker } from '../../../../models/process-tracker.model';

const NODE_TYPE = 'process_tracker';

@Component({
  selector: 'app-grant-process-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule, AssignCompanyComponent, ProcessTrackerFormComponent],
  template: `
    <div class="p-6 space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold text-gray-900">Process Tracker</h2>
            <p class="text-sm text-gray-500">All companies — procurement process tracking</p>
          </div>
          <div class="flex items-center space-x-2">
            <button *ngIf="selectedIds().length > 0" (click)="deleteSelected()" class="inline-flex items-center px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700">
              <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              Delete Selected ({{ selectedIds().length }})
            </button>
            <button (click)="showImport.set(true)" class="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
              <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/></svg>
              Import
            </button>
            <button (click)="openNew()" class="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700">
              <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              New Record
            </button>
          </div>
        </div>

      <div *ngIf="loading()" class="flex justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      <div *ngIf="error()" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">{{ error() }}</div>

      <div *ngIf="showImport()" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900">Import Process Tracker</h3>
          <button (click)="showImport.set(false)" class="p-1 text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <p class="text-sm text-gray-500">Paste tab-separated data. First column is company ID.</p>
        <textarea [(ngModel)]="importText" rows="8" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono" placeholder="Paste your data here..."></textarea>
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-500">{{ parsedCount }} rows parsed</span>
          <div class="flex space-x-2">
            <button (click)="showImport.set(false)" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            <button (click)="runImport()" [disabled]="importing() || parsedCount === 0" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
              {{ importing() ? 'Importing...' : 'Import ' + parsedCount + ' Records' }}
            </button>
          </div>
        </div>
        <div *ngIf="importResult()" [class]="'text-sm p-3 rounded-md ' + (importResult()!.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200')">
          {{ importResult()!.message }}
        </div>
      </div>

      <div *ngIf="!loading() && !showImport()" class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-10">
                    <input type="checkbox" [checked]="allSelected" (change)="toggleSelectAll()" class="h-4 w-4 text-blue-600 rounded border-gray-300" />
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"># Txns</th>
                  <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Quotes</th>
                  <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Suppliers</th>
                  <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">PO</th>
                  <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Invoices</th>
                  <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Exp Auth</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Disbursed</th>
                  <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Del Ack</th>
                  <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Docs</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Completion</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr *ngFor="let item of records()" class="hover:bg-gray-50 transition-colors" [class.bg-blue-50]="selectedIds().includes(item.id!)" [class.bg-yellow-50]="!item.company_id">
                  <td class="px-4 py-3 text-center">
                    <input type="checkbox" [checked]="selectedIds().includes(item.id!)" (change)="toggleItem(item.id!)" class="h-4 w-4 text-blue-600 rounded border-gray-300" />
                  </td>
                  <td class="px-4 py-3 text-sm font-medium" [class.text-gray-900]="item.company_id" [class.text-gray-400]="!item.company_id">{{ companyName(item) }}</td>
                  <td class="px-4 py-3 text-sm text-right">{{ item.data.numberOfTransactions }}</td>
                <td class="px-4 py-3 text-center">{{ checkIcon(item.data.steps.quotesReceived) }}</td>
                <td class="px-4 py-3 text-center">{{ checkIcon(item.data.steps.suppliersVerified) }}</td>
                <td class="px-4 py-3 text-center">{{ checkIcon(item.data.steps.purchaseOrderGenerated) }}</td>
                <td class="px-4 py-3 text-center">{{ checkIcon(item.data.steps.invoicesReceived) }}</td>
                <td class="px-4 py-3 text-center">{{ checkIcon(item.data.steps.expenseAuthorizationSigned) }}</td>
                <td class="px-4 py-3 text-sm text-right font-medium">{{ item.data.amountDisbursed | currency:'ZAR':'symbol':'1.0-0' }}</td>
                <td class="px-4 py-3 text-center">{{ checkIcon(item.data.steps.acknowledgementOfDeliverySigned) }}</td>
                <td class="px-4 py-3 text-center">{{ checkIcon(item.data.steps.supportingDocumentsLoaded) }}</td>
                <td class="px-4 py-3 text-sm text-right font-medium">{{ item.data.completionPercentage }}%</td>
                <td class="px-4 py-3 text-right">
                  <div class="flex items-center justify-end space-x-1">
                    <app-assign-company *ngIf="!item.company_id" [nodeId]="item.id!" (assigned)="onAssigned($event)" />
                    <button (click)="editItem(item)" class="p-1 text-gray-400 hover:text-indigo-600" title="Edit">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                    <button (click)="deleteItem(item)" class="p-1 text-gray-400 hover:text-red-600" title="Delete">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="records().length === 0">
                <td colspan="13" class="px-4 py-8 text-center text-gray-500">No process tracker records found. Click "Import" to add data.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Process Tracker Form Dialog -->
      <app-process-tracker-form
        *ngIf="showForm()"
        [nodeType]="NODE_TYPE"
        [editNode]="editingNode()"
        (close)="closeForm()"
        (saved)="onFormSaved()" />
    </div>
  `
})
export class GrantProcessTrackerComponent implements OnInit {
  protected readonly NODE_TYPE = 'process_tracker';
  records = signal<INode<IProcessTracker>[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  showImport = signal(false);
  importText = '';
  importing = signal(false);
  importResult = signal<{ success: boolean; message: string } | null>(null);
  companyMap = new Map<number, string>();
  companyNameToId = new Map<string, number>();
  selectedIds = signal<number[]>([]);
  showForm = signal(false);
  editingNode = signal<INode<IProcessTracker> | null>(null);

  get parsedCount(): number { return this.countImportRows(); }

  get allSelected(): boolean {
    return this.records().length > 0 && this.selectedIds().length === this.records().length;
  }

  private countImportRows(): number {
    if (!this.importText.trim()) return 0;
    return this.importText.trim().split('\n').filter(l => l.trim().length > 0).length;
  }

  toggleSelectAll(): void {
    if (this.allSelected) {
      this.selectedIds.set([]);
    } else {
      this.selectedIds.set(this.records().map(r => r.id!).filter(id => id != null));
    }
  }

  toggleItem(id: number): void {
    const current = this.selectedIds();
    if (current.includes(id)) {
      this.selectedIds.set(current.filter(i => i !== id));
    } else {
      this.selectedIds.set([...current, id]);
    }
  }

  deleteSelected(): void {
    const ids = this.selectedIds();
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} selected records?`)) return;
    this.nodeService.deleteNodesBatch(ids).subscribe({
      next: () => { this.selectedIds.set([]); this.loadAll(); },
      error: (err) => this.error.set(err.error?.error || 'Failed to delete')
    });
  }

  editItem(item: INode<IProcessTracker>): void {
    this.editingNode.set(item);
    this.showForm.set(true);
  }

  openNew(): void {
    this.editingNode.set(null);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingNode.set(null);
  }

  onFormSaved(): void {
    this.showForm.set(false);
    this.editingNode.set(null);
    this.loadAll();
  }

  constructor(
    private nodeService: NodeService<IProcessTracker>,
    private companyService: CompanyService,
  ) {}

  ngOnInit(): void { this.loadAll(); }

  loadAll(): void {
    this.loading.set(true); this.error.set(null);
    this.companyService.listAllCompanies().subscribe({
      next: (companies) => {
        this.companyMap = new Map(companies.map(c => [c.id, c.name]));
        this.companyNameToId = new Map(companies.map(c => [c.name.toLowerCase().trim(), c.id]));
        this.nodeService.getNodesByType(NODE_TYPE).subscribe({
          next: (r) => { this.records.set(r); this.loading.set(false); },
          error: () => { this.loading.set(false); }
        });
      },
      error: () => { this.loading.set(false); }
    });
  }

  companyName(item: INode<IProcessTracker>): string {
    if (!item.company_id) return item.data.companyName || '—';
    return this.companyMap.get(item.company_id) || `Company #${item.company_id}`;
  }

  checkIcon(v: boolean): string { return v ? '✓' : '—'; }

  deleteItem(item: INode<IProcessTracker>): void {
    if (!confirm('Delete this record?')) return;
    this.nodeService.deleteNode(item.id!).subscribe({ next: () => this.loadAll(), error: (err) => this.error.set(err.error?.error || 'Failed to delete') });
  }

  onAssigned(event: { nodeId: number; companyId: number; companyName: string }): void {
    this.loadAll();
  }

  private parseImportText(): INode<IProcessTracker>[] {
    if (!this.importText.trim()) return [];
    const lines = this.importText.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const result: INode<IProcessTracker>[] = [];
    const unmatched: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const c = line.split('\t');
      if (i === 0 && isNaN(Number(c[0]))) continue;
      const companyName = (c[1] || '').trim();
      const companyId = this.companyNameToId.get(companyName.toLowerCase());
      if (!companyId) { unmatched.push(companyName); }
      result.push({ type: NODE_TYPE, company_id: companyId || 0, data: {
        companyName: companyName,
        numberOfTransactions: parseInt(c[2], 10) || 0,
        steps: {
          quotesReceived: c[3]?.trim().toLowerCase() === 'yes',
          suppliersVerified: c[4]?.trim().toLowerCase() === 'yes',
          purchaseOrderGenerated: c[5]?.trim().toLowerCase() === 'yes',
          invoicesReceived: c[6]?.trim().toLowerCase() === 'yes',
          expenseAuthorizationSigned: c[7]?.trim().toLowerCase() === 'yes',
          acknowledgementOfDeliverySigned: c[9]?.trim().toLowerCase() === 'yes',
          supportingDocumentsLoaded: c[10]?.trim().toLowerCase() === 'yes',
        },
        amountDisbursed: this.parseMoney(c[8]),
        completionPercentage: parseInt(c[11], 10) || 0,
      }} as INode<IProcessTracker>);
    }
    if (unmatched.length > 0) {
      this.error.set(`Could not match companies: ${unmatched.join(', ')}. Records saved without company link.`);
    }
    return result;
  }

  private parseMoney(v: string | undefined): number {
    if (!v) return 0;
    const cleaned = v.replace(/[^\d.,-]/g, '');
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    let numeric = cleaned;
    if (lastComma > lastDot) { numeric = cleaned.replace(/\./g, '').replace(/,/g, '.'); } else { numeric = cleaned.replace(/,/g, ''); }
    const n = Number(numeric);
    return Number.isFinite(n) ? n : 0;
  }

  runImport(): void {
    const nodes = this.parseImportText();
    if (nodes.length === 0) return;
    this.importing.set(true); this.importResult.set(null);
    this.nodeService.addNodesBatch(nodes).subscribe({
      next: () => { this.importing.set(false); this.importResult.set({ success: true, message: `Imported ${nodes.length} process tracker records.` }); this.importText = ''; this.loadAll(); },
      error: (err) => { this.importing.set(false); this.importResult.set({ success: false, message: err.error?.error || 'Import failed' }); }
    });
  }
}
