import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NodeService } from '../../../../../services/node.service';
import { SeedFundingFormComponent } from '../../../../shared/seed-funding-form.component';
import { ToastService } from '../../../../services/toast.service';
import { INode } from '../../../../../models/schema';
import { ISeedFunding, IFundingPayment } from '../../../../../models/seed-funding.model';

const NODE_TYPE = 'seed_funding';

@Component({
  selector: 'app-seed-funding-page',
  standalone: true,
  imports: [CommonModule, FormsModule, SeedFundingFormComponent],
  template: `
    <div class="p-4 lg:p-8">
      <div class="max-w-7xl mx-auto space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">Payments Tracker</h2>
            <p class="text-gray-600 text-sm mt-1">Seed funding approval and disbursement tracking</p>
          </div>
          <div class="flex items-center space-x-2">
            <button (click)="showImport.set(true)" class="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50">
              <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/></svg>
              Import
            </button>
            <button (click)="openNew()" class="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
              <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              New Record
            </button>
          </div>
        </div>

        <div *ngIf="loading()" class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <div *ngIf="error()" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">{{ error() }}</div>

        <!-- Import Dialog -->
        <div *ngIf="showImport()" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900">Import Payments</h3>
            <button (click)="showImport.set(false)" class="p-1 text-gray-400 hover:text-gray-600">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <p class="text-sm text-gray-500">Paste tab-separated data. Columns: company_name, approved_amount, payment1, payment2, payment3, payment4, payment5, payment6, disbursed_amount, remaining_balance</p>
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

        <!-- Table -->
        <div *ngIf="!loading() && !showImport()" class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Approved</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Payment 1</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Payment 2</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Payment 3</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Payment 4</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Payment 5</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Payment 6</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Disbursed</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr *ngFor="let item of records()" class="hover:bg-gray-50 transition-colors">
                  <td class="px-4 py-3 text-sm text-right font-medium">{{ item.data.approvedAmount | currency:'ZAR':'symbol':'1.0-0' }}</td>
                  <td class="px-4 py-3 text-sm text-right">{{ getPayment(item, 0) }}</td>
                  <td class="px-4 py-3 text-sm text-right">{{ getPayment(item, 1) }}</td>
                  <td class="px-4 py-3 text-sm text-right">{{ getPayment(item, 2) }}</td>
                  <td class="px-4 py-3 text-sm text-right">{{ getPayment(item, 3) }}</td>
                  <td class="px-4 py-3 text-sm text-right">{{ getPayment(item, 4) }}</td>
                  <td class="px-4 py-3 text-sm text-right">{{ getPayment(item, 5) }}</td>
                  <td class="px-4 py-3 text-sm text-right font-medium">{{ item.data.disbursedAmount | currency:'ZAR':'symbol':'1.0-0' }}</td>
                  <td class="px-4 py-3 text-sm text-right">{{ item.data.remainingBalance | currency:'ZAR':'symbol':'1.0-0' }}</td>
                  <td class="px-4 py-3 text-right">
                    <div class="flex items-center justify-end space-x-2">
                      <button (click)="edit(item)" class="p-1 text-gray-400 hover:text-indigo-600" title="Edit">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      </button>
                      <button (click)="delete(item)" class="p-1 text-gray-400 hover:text-red-600" title="Delete">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="records().length === 0">
                  <td colspan="10" class="px-4 py-8 text-center text-gray-500">No seed funding records found. Click "New Record" or "Import" to add data.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Seed Funding Form Dialog -->
        <app-seed-funding-form
          *ngIf="showForm()"
          [nodeType]="NODE_TYPE"
          [editNode]="editingNode()"
          [companyId]="companyId()"
          (close)="closeForm()"
          (saved)="onFormSaved()" />
      </div>
    </div>
  `
})
export class SeedFundingPageComponent implements OnInit {
  protected readonly NODE_TYPE = 'seed_funding';
  protected companyId = signal<number>(0);
  records = signal<INode<ISeedFunding>[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  showImport = signal(false);
  importText = '';
  importing = signal(false);
  importResult = signal<{ success: boolean; message: string } | null>(null);
  showForm = signal(false);
  editingNode = signal<INode<ISeedFunding> | null>(null);
  private toast = inject(ToastService);

  get parsedCount(): number { return this.countImportRows(); }

  private countImportRows(): number {
    if (!this.importText.trim()) return 0;
    return this.importText.trim().split('\n').filter(l => l.trim().length > 0).length;
  }

  constructor(
    private route: ActivatedRoute,
    private nodeService: NodeService<ISeedFunding>,
  ) {}

  ngOnInit(): void {
    this.route.parent?.params.subscribe(params => {
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
  edit(item: INode<ISeedFunding>): void { this.editingNode.set(item); this.showForm.set(true); }
  closeForm(): void { this.showForm.set(false); this.editingNode.set(null); }
  onFormSaved(): void { this.showForm.set(false); this.editingNode.set(null); this.loadAll(); this.toast.saveSuccess('Record'); }

  getPayment(item: INode<ISeedFunding>, index: number): string {
    const pmt = (item.data.payments || [])[index];
    return pmt ? pmt.amount.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—';
  }

  delete(item: INode<ISeedFunding>): void {
    if (!confirm('Delete this seed funding record?')) return;
    this.nodeService.deleteNode(item.id!).subscribe({ next: () => { this.loadAll(); this.toast.deleteSuccess('Record'); }, error: (err) => { this.error.set(err.error?.error || 'Failed to delete'); this.toast.deleteError('record'); } });
  }

  private parseImportText(): INode<ISeedFunding>[] {
    const cid = this.companyId();
    if (!cid || !this.importText.trim()) return [];
    return this.importText.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0).map((l, i) => {
      if (i === 0 && l.toLowerCase().startsWith('company name')) return null;
      const c = l.split('\t');
      const approved = this.parseMoney(c[1]);
      const pmtAmounts = [c[2], c[3], c[4], c[5], c[6], c[7]].map(v => this.parseMoney(v)).filter(v => v > 0);
      const payments: IFundingPayment[] = pmtAmounts.map((amt, i) => ({ paymentNumber: i + 1, amount: amt }));
      const disbursed = this.parseMoney(c[8]);
      const balance = this.parseMoney(c[9]);
      return { type: NODE_TYPE, company_id: cid, data: { approvedAmount: approved, disbursedAmount: disbursed, remainingBalance: balance, payments } } as INode<ISeedFunding>;
    }).filter(n => n !== null) as INode<ISeedFunding>[];
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
      next: () => { this.importing.set(false); this.importResult.set({ success: true, message: `Successfully imported ${nodes.length} seed funding records.` }); this.importText = ''; this.loadAll(); this.toast.success('Import complete.'); },
      error: (err) => { this.importing.set(false); this.importResult.set({ success: false, message: err.error?.error || 'Import failed' }); this.toast.error('Import failed.'); }
    });
  }
}
