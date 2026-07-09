import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-request-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" (click)="close.emit()">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md mx-4" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Request From Entrepreneur</h3>
          <button (click)="close.emit()" class="p-1 text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="p-6 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Financial Year</label>
              <input type="number" [(ngModel)]="financialYear" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <select [(ngModel)]="month" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option [value]="0">Select month</option>
                <option *ngFor="let m of months" [value]="m.value">{{ m.label }}</option>
              </select>
            </div>
          </div>

          <div *ngIf="generatedUrl()" class="bg-green-50 border border-green-200 rounded-lg p-4">
            <p class="text-sm font-medium text-green-800 mb-2">Link Generated</p>
            <div class="flex items-center space-x-2">
              <input type="text" [value]="generatedUrl()" readonly class="flex-1 border border-green-300 rounded-md px-3 py-2 text-sm bg-white" />
              <button (click)="copyLink()" class="px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Copy</button>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200">
          <button (click)="close.emit()" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Close</button>
          <button (click)="generate()" [disabled]="!financialYear || !month || generating()" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {{ generating() ? 'Generating...' : 'Generate Link' }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class RequestDialogComponent {
  close = output<void>();
  generateLink = output<{ financialYear: number; month: number }>();
  generatedUrl = signal<string | null>(null);
  generating = signal(false);

  protected financialYear = new Date().getFullYear();
  protected month = 0;
  protected months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
  ];

  generate(): void {
    if (!this.financialYear || !this.month) return;
    this.generateLink.emit({ financialYear: this.financialYear, month: this.month });
  }

  copyLink(): void {
    const url = this.generatedUrl();
    if (url) {
      navigator.clipboard.writeText(url);
    }
  }
}
