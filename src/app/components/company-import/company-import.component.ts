import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompanyService } from '../../../services/company.service';
import { ICompany } from '../../../models/simple.schema';
import { convertedCompanies } from '../../../../fy24';

// Keys not accepted by backend (not in WRITABLE list) that we'll strip
const NON_WRITABLE: (keyof ICompany)[] = ['id','created_at','updated_at','contact_person','sector_name'];

@Component({
  selector: 'app-company-import',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="import-box">
      <h3>FY24 Bulk Company Import</h3>
      <p *ngIf="status() === 'idle'">Ready to import <strong>{{ total }}</strong> companies tagged #fy24.</p>
      <p *ngIf="status() === 'preparing'">Preparing payload…</p>
      <p *ngIf="status() === 'importing'">Importing (this may take a moment)…</p>
      <p *ngIf="status() === 'done'">Done. Inserted: {{ summary().inserted_count }} Updated: {{ summary().updated_count }} Skipped: {{ summary().skipped }} Errors: {{ summary().errors?.length || 0 }}</p>
      <p *ngIf="status() === 'error'" class="error">Error: {{ error() }}</p>

      <button (click)="importAll()" [disabled]="status() === 'importing' || status() === 'preparing'">Import All Now</button>
      <button *ngIf="status() === 'done' && summary().errors?.length" (click)="retryFailures()" [disabled]="retrying()">Retry Failed ({{ summary().errors.length }})</button>

      <pre *ngIf="status() === 'done'" class="compact">{{ summary() | json }}</pre>
    </section>
  `,
  styles: [`
    .import-box { border:1px solid #333;padding:1rem;border-radius:6px;background:#1b1b1b;color:#e0e0e0;max-width:640px;font:14px/1.4 system-ui; }
    h3 { margin:0 0 .5rem;font-size:16px; }
    button { background:#2563eb;color:#fff;border:none;padding:.55rem .9rem;border-radius:4px;cursor:pointer;margin-right:.5rem; }
    button[disabled]{opacity:.5;cursor:not-allowed;}
    .error { color:#f87171; }
    pre.compact { background:#111; padding:.5rem; max-height:220px; overflow:auto; font-size:11px; }
  `]
})
export class CompanyImportComponent {
  private readonly source: ICompany[] = convertedCompanies;
  readonly total = this.source.length;

  status = signal<'idle'|'preparing'|'importing'|'done'|'error'>('idle');
  summary = signal<any>({});
  error = signal<string| null>(null);
  retrying = signal<boolean>(false);
  private failedRows: any[] = [];

  constructor(private companyService: CompanyService) {}

  private buildPayload(rows: ICompany[]): any[] {
    return rows.map(r => {
      const o: any = { ...r };
      NON_WRITABLE.forEach(k => delete o[k]);
      o.description = '#fy24';
      if (o.black_women_ownership) {
        o.black_women_ownership_text = 'BlackWomen';
      } else {
        o.black_women_ownership_text = null;
      }
      if (o.black_ownership_text && o.black_ownership_text.length > 16) {
        o.black_ownership_text = 'BlackOwned';
      }
      return o;
    });
  }

  importAll() {
    if (this.status() === 'importing') return;
    this.status.set('preparing');
    const payload = this.buildPayload(this.source);
    this.status.set('importing');
    this.error.set(null);
    this.companyService.bulkImportCompanies(payload, true).subscribe({
      next: res => {
        this.summary.set(res);
        this.status.set('done');
        this.failedRows = Array.isArray(res?.errors) ? res.errors.map((e: any) => payload[e.index]).filter(Boolean) : [];
      },
      error: err => {
        this.error.set(err?.error?.error || 'Import failed');
        this.status.set('error');
      }
    });
  }

  retryFailures() {
    if (!this.failedRows.length) return;
    this.retrying.set(true);
    const payload = this.buildPayload(this.failedRows);
    this.companyService.bulkImportCompanies(payload, true).subscribe({
      next: res => {
        // merge counts crudely / replace summary for simplicity
        this.summary.set(res);
        this.failedRows = Array.isArray(res?.errors) ? res.errors.map((e: any) => payload[e.index]).filter(Boolean) : [];
        this.retrying.set(false);
      },
      error: err => {
        this.error.set(err?.error?.error || 'Retry failed');
        this.retrying.set(false);
      }
    });
  }
}
