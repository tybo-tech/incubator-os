import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Constants } from '../../../../../../services/service';

@Component({
  selector: 'app-import-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" (click)="close.emit()">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Import Financial Indicators</h3>
          <button (click)="close.emit()" class="p-1 text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="p-6 space-y-6">
          <!-- Instructions -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p class="font-semibold mb-2">How to import</p>
            <ol class="list-decimal list-inside space-y-1 text-blue-700">
              <li>Download the CSV template below.</li>
              <li>Open it in Excel or Google Sheets.</li>
              <li>Fill in your data — one row per month per company.</li>
              <li>Save as CSV (Comma Separated Values).</li>
              <li>Upload the file using the button below.</li>
            </ol>
          </div>

          <!-- CSV Format Table -->
          <div>
            <h4 class="text-sm font-semibold text-gray-800 mb-2">CSV Column Format</h4>
            <div class="overflow-x-auto text-xs">
              <table class="min-w-full border border-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-2 py-1.5 border text-left font-medium text-gray-600">Column</th>
                    <th class="px-2 py-1.5 border text-left font-medium text-gray-600">Required</th>
                    <th class="px-2 py-1.5 border text-left font-medium text-gray-600">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td class="px-2 py-1 border">company_id</td><td class="px-2 py-1 border text-green-600">Yes</td><td class="px-2 py-1 border">Incubator OS company ID</td></tr>
                  <tr><td class="px-2 py-1 border">financial_year</td><td class="px-2 py-1 border text-green-600">Yes</td><td class="px-2 py-1 border">e.g. 2026</td></tr>
                  <tr><td class="px-2 py-1 border">month</td><td class="px-2 py-1 border text-green-600">Yes</td><td class="px-2 py-1 border">1-12 (1=January)</td></tr>
                  <tr><td class="px-2 py-1 border">sales</td><td class="px-2 py-1 border text-green-600">Yes</td><td class="px-2 py-1 border">Total sales / revenue</td></tr>
                  <tr><td class="px-2 py-1 border">cost_of_sales</td><td class="px-2 py-1 border text-green-600">Yes</td><td class="px-2 py-1 border">Cost of goods sold</td></tr>
                  <tr><td class="px-2 py-1 border">operating_expenses</td><td class="px-2 py-1 border text-green-600">Yes</td><td class="px-2 py-1 border">Operating expenses</td></tr>
                  <tr><td class="px-2 py-1 border">cash</td><td class="px-2 py-1 border">No</td><td class="px-2 py-1 border">Cash on hand</td></tr>
                  <tr><td class="px-2 py-1 border">cash_equivalents</td><td class="px-2 py-1 border">No</td><td class="px-2 py-1 border">Cash equivalents</td></tr>
                  <tr><td class="px-2 py-1 border">short_term_investments</td><td class="px-2 py-1 border">No</td><td class="px-2 py-1 border">Short term investments</td></tr>
                  <tr><td class="px-2 py-1 border">current_receivables</td><td class="px-2 py-1 border">No</td><td class="px-2 py-1 border">Accounts receivable</td></tr>
                  <tr><td class="px-2 py-1 border">total_current_assets</td><td class="px-2 py-1 border">No</td><td class="px-2 py-1 border">Total current assets</td></tr>
                  <tr><td class="px-2 py-1 border">total_assets</td><td class="px-2 py-1 border">No</td><td class="px-2 py-1 border">Total assets</td></tr>
                  <tr><td class="px-2 py-1 border">total_current_liabilities</td><td class="px-2 py-1 border">No</td><td class="px-2 py-1 border">Total current liabilities</td></tr>
                  <tr><td class="px-2 py-1 border">total_liabilities</td><td class="px-2 py-1 border">No</td><td class="px-2 py-1 border">Total liabilities</td></tr>
                  <tr><td class="px-2 py-1 border">total_equity</td><td class="px-2 py-1 border">No</td><td class="px-2 py-1 border">Total equity</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Download Template -->
          <div class="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div>
              <p class="text-sm font-medium text-gray-900">Template File</p>
              <p class="text-xs text-gray-500">financial_indicators_template.csv</p>
            </div>
            <button (click)="downloadTemplate()" class="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100">
              Download Template
            </button>
          </div>

          <!-- File Upload -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Upload CSV File</label>
            <div class="flex items-center space-x-3">
              <input type="file" accept=".csv" (change)="onFileSelected($event)" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            </div>
          </div>

          <!-- Results -->
          <div *ngIf="result()" class="space-y-2">
            <div *ngIf="result()!.success" class="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
              <p class="font-semibold">Import completed</p>
              <p>{{ result()!.message }}</p>
            </div>
            <div *ngIf="!result()!.success" class="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
              <p class="font-semibold">Import failed</p>
              <p>{{ result()!.message }}</p>
            </div>
            <div *ngIf="result()!.errors?.length" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              <p class="font-semibold mb-1">Errors ({{ result()!.errors.length }})</p>
              <ul class="list-disc list-inside space-y-0.5">
                <li *ngFor="let e of result()!.errors">{{ e }}</li>
              </ul>
            </div>
          </div>

          <div *ngIf="error()" class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{{ error() }}</div>
        </div>

        <div class="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200">
          <button (click)="close.emit()" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Close</button>
          <button (click)="upload()" [disabled]="!selectedFile || uploading()" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {{ uploading() ? 'Uploading...' : 'Upload & Import' }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class ImportDialogComponent {
  companyId = input.required<number>();
  close = output<void>();
  imported = output<void>();

  selectedFile: File | null = null;
  uploading = signal(false);
  error = signal<string | null>(null);
  result = signal<{ success: boolean; message: string; errors: string[] } | null>(null);

  constructor(private http: HttpClient) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile = input.files[0];
      this.result.set(null);
      this.error.set(null);
    }
  }

  downloadTemplate(): void {
    const headers = [
      'company_id,financial_year,month,sales,cost_of_sales,operating_expenses,cash,cash_equivalents,short_term_investments,current_receivables,total_current_assets,total_assets,total_current_liabilities,total_liabilities,total_equity'
    ];
    const sample = [
      '11,2026,5,28875133,5035297,22807572,0,101377,2093103,1708843,1810220,17090860,3546308,11218670,5872190',
      '11,2026,6,15000000,5000000,8000000,50000,100000,1000000,500000,600000,5000000,1000000,3000000,2000000',
    ];
    const csv = headers.concat(sample).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'financial_indicators_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  upload(): void {
    if (!this.selectedFile) return;

    this.uploading.set(true);
    this.error.set(null);
    this.result.set(null);

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('company_id', this.companyId().toString());

    this.http.post<any>(`${Constants.ApiBase}api/financial-indicators/commands/import-csv.php`, formData).subscribe({
      next: (res) => {
        this.uploading.set(false);
        this.result.set(res);
        if (res.success) {
          this.imported.emit();
        }
      },
      error: (err) => {
        this.uploading.set(false);
        this.error.set(err.error?.error || 'Upload failed');
      },
    });
  }
}
