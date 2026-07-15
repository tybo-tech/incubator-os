import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NodeService } from '../../../../services/node.service';
import { CompanyService } from '../../../../services/company.service';
import { INode } from '../../../../models/schema';
import { ICompanyPurchase } from '../../../../models/company-purchase.model';

const NODE_TYPE = 'company_purchase';

@Component({
  selector: 'app-grant-purchases',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-gray-900">Itemized List</h2>
          <p class="text-sm text-gray-500">All companies — equipment, tools, materials and services</p>
        </div>
        <button (click)="showImport.set(true)" class="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
          <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/></svg>
          Import
        </button>
      </div>

      <div *ngIf="loading()" class="flex justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      <div *ngIf="error()" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">{{ error() }}</div>

      <div *ngIf="showImport()" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900">Import Itemized List</h3>
          <button (click)="showImport.set(false)" class="p-1 text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <p class="text-sm text-gray-500">Paste tab-separated data. First column is company name.</p>
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
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">PO</th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Invoice</th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Received</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr *ngFor="let item of records()" class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ companyName(item) }}</td>
                <td class="px-4 py-3 text-sm text-gray-700">{{ item.data.purchaseType }}</td>
                <td class="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{{ itemDescriptions(item) }}</td>
                <td class="px-4 py-3 text-sm text-gray-700">{{ item.data.supplier }}</td>
                <td class="px-4 py-3 text-sm text-right font-medium">{{ item.data.amount | currency:'ZAR':'symbol':'1.0-0' }}</td>
                <td class="px-4 py-3 text-center">{{ checkIcon(item.data.order.purchaseOrder) }}</td>
                <td class="px-4 py-3 text-center">{{ checkIcon(item.data.order.invoiceReceived) }}</td>
                <td class="px-4 py-3 text-center">{{ checkIcon(item.data.order.itemsReceived) }}</td>
                <td class="px-4 py-3 text-right">
                  <button (click)="deleteItem(item)" class="p-1 text-gray-400 hover:text-red-600" title="Delete">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </td>
              </tr>
              <tr *ngIf="records().length === 0">
                <td colspan="9" class="px-4 py-8 text-center text-gray-500">No purchases found. Click "Import" to add data.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class GrantPurchasesComponent implements OnInit {
  records = signal<INode<ICompanyPurchase>[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  showImport = signal(false);
  importText = '';
  importing = signal(false);
  importResult = signal<{ success: boolean; message: string } | null>(null);
  companyCache = new Map<number, string>();

  get parsedCount(): number { return this.parseImportText().length; }

  constructor(
    private nodeService: NodeService<ICompanyPurchase>,
    private companyService: CompanyService,
  ) {}

  ngOnInit(): void { this.loadAll(); }

  loadAll(): void {
    this.loading.set(true); this.error.set(null);
    this.nodeService.getNodesByType(NODE_TYPE).subscribe({
      next: (r) => { this.records.set(r); this.loading.set(false); this.resolveCompanyNames(r); },
      error: () => { this.loading.set(false); }
    });
  }

  private resolveCompanyNames(records: INode<ICompanyPurchase>[]): void {
    const ids = [...new Set(records.map(r => r.company_id).filter((id): id is number => id != null))];
    ids.forEach(id => {
      if (!this.companyCache.has(id)) {
        this.companyService.getCompanyById(id).subscribe({
          next: (c) => this.companyCache.set(id, c.name),
          error: () => this.companyCache.set(id, `Company #${id}`)
        });
      }
    });
  }

  companyName(item: INode<ICompanyPurchase>): string {
    return item.company_id ? (this.companyCache.get(item.company_id) || `Company #${item.company_id}`) : '—';
  }

  itemDescriptions(item: INode<ICompanyPurchase>): string {
    return (item.data.items || []).map(i => i.description).join(', ');
  }

  checkIcon(v: boolean): string { return v ? '✓' : '—'; }

  deleteItem(item: INode<ICompanyPurchase>): void {
    if (!confirm('Delete this purchase?')) return;
    this.nodeService.deleteNode(item.id!).subscribe({ next: () => this.loadAll(), error: (err) => this.error.set(err.error?.error || 'Failed to delete') });
  }

  private parseImportText(): INode<ICompanyPurchase>[] {
    if (!this.importText.trim()) return [];
    return this.importText.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0).map(l => {
      const c = l.split('\t');
      const itemsStr = c[2] || '';
      const items = itemsStr.split(',').map((s: string) => ({ description: s.trim() })).filter((i: { description: string }) => i.description.length > 0);
      return { type: NODE_TYPE, company_id: parseInt(c[0], 10) || 0, data: {
        purchaseType: c[1] || '',
        supplier: c[3] || '',
        amount: this.parseMoney(c[4]),
        order: { purchaseOrder: c[5]?.toLowerCase() === 'yes', invoiceReceived: c[6]?.toLowerCase() === 'yes', invoiceType: c[7] || '', itemsReceived: c[8]?.toLowerCase() === 'yes' },
        items,
      }} as INode<ICompanyPurchase>;
    }).filter(n => (n.company_id ?? 0) > 0);
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
      next: () => { this.importing.set(false); this.importResult.set({ success: true, message: `Imported ${nodes.length} purchase records.` }); this.importText = ''; this.loadAll(); },
      error: (err) => { this.importing.set(false); this.importResult.set({ success: false, message: err.error?.error || 'Import failed' }); }
    });
  }
}
