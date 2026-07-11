import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NodeService } from '../../../../../services/node.service';
import { INode } from '../../../../../models/schema';
import { ICompanyPurchase, IPurchasedItem } from '../../../../../models/company-purchase.model';

const NODE_TYPE = 'company_purchase';

@Component({
  selector: 'app-purchase-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-4 lg:p-8">
      <div class="max-w-7xl mx-auto space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">Company Purchases</h2>
            <p class="text-gray-600 text-sm mt-1">Equipment, tools, materials and services procured</p>
          </div>
          <div class="flex items-center space-x-2">
            <button (click)="showImport.set(true)" class="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50">
              <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/></svg>
              Import
            </button>
            <button (click)="createNew()" class="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
              <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              New Purchase
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
            <h3 class="text-lg font-semibold text-gray-900">Import Purchases</h3>
            <button (click)="showImport.set(false)" class="p-1 text-gray-400 hover:text-gray-600">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <p class="text-sm text-gray-500">Paste tab-separated data. Columns: company_name, purchase_type, items, supplier, amount, purchase_order, invoice_received, invoice_type, items_received</p>
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
        <div *ngIf="!loading() && !editing() && !showImport()" class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">PO</th>
                  <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Invoice</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inv Type</th>
                  <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Received</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr *ngFor="let item of purchases()" class="hover:bg-gray-50 transition-colors">
                  <td class="px-4 py-3 text-sm text-gray-900">{{ item.data.purchaseType }}</td>
                  <td class="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{{ itemDescriptions(item) }}</td>
                  <td class="px-4 py-3 text-sm text-gray-700">{{ item.data.supplier }}</td>
                  <td class="px-4 py-3 text-sm text-right font-medium">{{ item.data.amount | currency:'ZAR':'symbol':'1.0-0' }}</td>
                  <td class="px-4 py-3 text-center">{{ checkIcon(item.data.order.purchaseOrder) }}</td>
                  <td class="px-4 py-3 text-center">{{ checkIcon(item.data.order.invoiceReceived) }}</td>
                  <td class="px-4 py-3 text-sm text-gray-600">{{ item.data.order.invoiceType }}</td>
                  <td class="px-4 py-3 text-center">{{ checkIcon(item.data.order.itemsReceived) }}</td>
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
                <tr *ngIf="purchases().length === 0">
                  <td colspan="9" class="px-4 py-8 text-center text-gray-500">No purchases found. Click "New Purchase" or "Import" to add data.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Form -->
        <div *ngIf="editing()" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          <h3 class="text-lg font-semibold text-gray-900">{{ isNew() ? 'New Purchase' : 'Edit Purchase' }}</h3>
          <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Purchase Type</label><input type="text" [(ngModel)]="form.purchaseType" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" /></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Supplier</label><input type="text" [(ngModel)]="form.supplier" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" /></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Amount</label><input type="number" [(ngModel)]="form.amount" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" /></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Invoice Type</label><input type="text" [(ngModel)]="form.order.invoiceType" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" /></div>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-gray-800 mb-3 pb-2 border-b">Order Status</h4>
            <div class="grid grid-cols-3 gap-3">
              <label class="flex items-center space-x-3"><input type="checkbox" [(ngModel)]="form.order.purchaseOrder" class="h-4 w-4 text-blue-600 rounded border-gray-300"><span class="text-sm text-gray-700">Purchase Order</span></label>
              <label class="flex items-center space-x-3"><input type="checkbox" [(ngModel)]="form.order.invoiceReceived" class="h-4 w-4 text-blue-600 rounded border-gray-300"><span class="text-sm text-gray-700">Invoice Received</span></label>
              <label class="flex items-center space-x-3"><input type="checkbox" [(ngModel)]="form.order.itemsReceived" class="h-4 w-4 text-blue-600 rounded border-gray-300"><span class="text-sm text-gray-700">Items Received</span></label>
            </div>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-gray-800 mb-3 pb-2 border-b">Items Purchased</h4>
            <div class="space-y-2">
              <div *ngFor="let item of form.items; let i = index" class="flex items-center space-x-2">
                <input type="text" [(ngModel)]="form.items[i].description" class="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Item description" />
                <button (click)="removeItem(i)" class="p-1 text-gray-400 hover:text-red-600">✕</button>
              </div>
              <button (click)="addItem()" class="text-sm text-blue-600 hover:text-blue-800">+ Add Item</button>
            </div>
          </div>
          <div class="flex items-center justify-end space-x-3 pt-4 border-t">
            <button (click)="cancelEdit()" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            <button (click)="save()" [disabled]="saving()" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">{{ saving() ? 'Saving...' : 'Save' }}</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PurchasePageComponent implements OnInit {
  private companyId = signal<number>(0);
  purchases = signal<INode<ICompanyPurchase>[]>([]);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  editing = signal(false);
  isNew = signal(false);
  editingId: number | null = null;
  form: ICompanyPurchase = this.emptyForm();
  showImport = signal(false);
  importText = '';
  importing = signal(false);
  importResult = signal<{ success: boolean; message: string } | null>(null);

  get parsedCount(): number { return this.parseImportText().length; }

  constructor(
    private route: ActivatedRoute,
    private nodeService: NodeService<ICompanyPurchase>,
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
      next: (r) => { this.purchases.set(r); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  createNew(): void { this.form = this.emptyForm(); this.editingId = null; this.isNew.set(true); this.editing.set(true); }
  edit(item: INode<ICompanyPurchase>): void { this.form = { ...item.data, items: item.data.items.map(i => ({ ...i })) }; this.editingId = item.id ?? null; this.isNew.set(false); this.editing.set(true); }
  cancelEdit(): void { this.editing.set(false); this.editingId = null; }
  addItem(): void { this.form.items.push({ description: '' }); }
  removeItem(i: number): void { this.form.items.splice(i, 1); }

  itemDescriptions(item: INode<ICompanyPurchase>): string {
    return (item.data.items || []).map(i => i.description).join(', ');
  }

  save(): void {
    const cid = this.companyId();
    if (!cid) return;
    this.saving.set(true); this.error.set(null);
    const node: INode<ICompanyPurchase> = { type: NODE_TYPE, company_id: cid, data: this.form };
    const obs = this.editingId ? this.nodeService.updateNode({ ...node, id: this.editingId }) : this.nodeService.addNode(node);
    obs.subscribe({ next: () => { this.saving.set(false); this.editing.set(false); this.editingId = null; this.loadAll(); }, error: (err) => { this.saving.set(false); this.error.set(err.error?.error || 'Failed to save'); } });
  }

  delete(item: INode<ICompanyPurchase>): void {
    if (!confirm('Delete this purchase?')) return;
    this.nodeService.deleteNode(item.id!).subscribe({ next: () => this.loadAll(), error: (err) => this.error.set(err.error?.error || 'Failed to delete') });
  }

  checkIcon(v: boolean): string { return v ? '✓' : '—'; }

  private parseImportText(): INode<ICompanyPurchase>[] {
    const cid = this.companyId();
    if (!cid || !this.importText.trim()) return [];
    return this.importText.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0).map(l => {
      const c = l.split('\t');
      const itemsStr = c[2] || '';
      const items: IPurchasedItem[] = itemsStr.split(',').map(s => ({ description: s.trim() })).filter(i => i.description.length > 0);
      return { type: NODE_TYPE, company_id: cid, data: {
        purchaseType: c[1] || '',
        supplier: c[3] || '',
        amount: this.parseMoney(c[4]),
        order: { purchaseOrder: c[5]?.toLowerCase() === 'yes', invoiceReceived: c[6]?.toLowerCase() === 'yes', invoiceType: c[7] || '', itemsReceived: c[8]?.toLowerCase() === 'yes' },
        items,
      }} as INode<ICompanyPurchase>;
    });
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
      next: () => { this.importing.set(false); this.importResult.set({ success: true, message: `Successfully imported ${nodes.length} purchase records.` }); this.importText = ''; this.loadAll(); },
      error: (err) => { this.importing.set(false); this.importResult.set({ success: false, message: err.error?.error || 'Import failed' }); }
    });
  }

  private emptyForm(): ICompanyPurchase {
    return { purchaseType: '', supplier: '', amount: 0, order: { purchaseOrder: false, invoiceReceived: false, invoiceType: '', itemsReceived: false }, items: [] };
  }
}
