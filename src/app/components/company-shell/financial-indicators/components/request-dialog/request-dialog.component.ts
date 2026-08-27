import { Component, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinancialIndicatorsFacade } from '../../services/financial-indicators.facade';
import { CompanyService } from '../../../../../../services/company.service';
import { EmailService } from '../../../../../../services/email/email.service';
import { FinancialIndicatorRequestService, FinancialIndicatorRequest } from '../../../../../../services/financial-indicator-request.service';

@Component({
  selector: 'app-request-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [FinancialIndicatorsFacade],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Request From Entrepreneur</h3>
          <button (click)="close.emit()" class="p-1 text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="p-6 space-y-6">
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

          <div *ngIf="generatedUrl()" class="border border-gray-200 rounded-lg p-4 space-y-4">
            <p class="text-sm font-medium text-gray-800">Send Email</p>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">To</label>
              <input type="email" [(ngModel)]="emailTo" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="entrepreneur@example.com" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input type="text" [(ngModel)]="emailSubject" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea [(ngModel)]="emailBody" rows="6" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"></textarea>
            </div>
            <div *ngIf="emailError()" class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{{ emailError() }}</div>
            <div *ngIf="emailSent()" class="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">Email sent successfully.</div>
            <div class="flex items-center justify-end space-x-3">
              <button (click)="resetEmail()" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Reset</button>
              <button (click)="sendEmail()" [disabled]="sendingEmail() || !emailTo || !emailSubject || !emailBody" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {{ sendingEmail() ? 'Sending...' : 'Send Email' }}
              </button>
            </div>
          </div>

          <div *ngIf="history().length > 0" class="border border-gray-200 rounded-lg">
            <div class="px-4 py-3 border-b border-gray-200">
              <p class="text-sm font-semibold text-gray-800">Request History</p>
            </div>
            <div class="divide-y divide-gray-100">
              <div *ngFor="let r of history()" class="px-4 py-3 flex items-center justify-between">
                <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-800">{{ monthLabel(r.month) }} {{ r.financialYear }}</p>
                  <p class="text-xs text-gray-500 truncate">{{ r.recipientEmail || 'No email' }} &middot; {{ r.createdAt | date:'medium' }}</p>
                </div>
                <div class="flex items-center space-x-2 flex-shrink-0">
                  <span *ngIf="r.emailSent" class="inline-flex items-center px-2 py-0.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full">Email sent</span>
                  <span *ngIf="!r.emailSent" class="inline-flex items-center px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full">Link only</span>
                  <button (click)="copyHistoryLink(r)" class="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Copy</button>
                </div>
              </div>
            </div>
          </div>

          <div *ngIf="error()" class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{{ error() }}</div>
        </div>

        <div class="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200">
          <button (click)="close.emit()" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Close</button>
          <button *ngIf="!generatedUrl()" (click)="generate()" [disabled]="!financialYear || !month || generating()" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {{ generating() ? 'Generating...' : 'Generate Link' }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class RequestDialogComponent {
  companyId = input.required<number>();
  close = output<void>();
  generatedUrl = signal<string | null>(null);
  generating = signal(false);
  error = signal<string | null>(null);

  sendingEmail = signal(false);
  emailSent = signal(false);
  emailError = signal<string | null>(null);
  history = signal<FinancialIndicatorRequest[]>([]);

  protected financialYear = new Date().getFullYear();
  protected month = 0;
  protected months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
  ];

  protected emailTo = '';
  protected emailSubject = '';
  protected emailBody = '';

  private companyName = '';
  private companyEmail = '';
  private contactPerson = '';
  private currentToken = '';

  constructor(
    private facade: FinancialIndicatorsFacade,
    private companyService: CompanyService,
    private emailService: EmailService,
    private requestService: FinancialIndicatorRequestService,
  ) {
    effect(() => {
      const cid = this.companyId();
      if (cid) {
        this.loadCompany(cid);
        this.loadHistory(cid);
      }
    });
  }

  private loadCompany(cid: number): void {
    this.companyService.getCompanyById(cid).subscribe({
      next: (company) => {
        this.companyName = company.name;
        this.companyEmail = company.email_address ?? '';
        this.contactPerson = company.contact_person ?? '';
      },
      error: () => {}
    });
  }

  private loadHistory(cid: number): void {
    this.requestService.getHistory(cid).subscribe({
      next: (items) => this.history.set(items),
      error: () => {}
    });
  }

  generate(): void {
    if (!this.financialYear || !this.month) return;
    this.generating.set(true);
    this.error.set(null);
    this.generatedUrl.set(null);
    this.emailSent.set(false);
    this.emailError.set(null);

    this.facade.requestLink(this.companyId(), this.financialYear, this.month).subscribe({
      next: (result) => {
        this.generating.set(false);
        if (result.success) {
          this.generatedUrl.set(result.data.publicUrl);
          this.currentToken = result.data.token;
          this.prefillEmail(result.data.publicUrl);
          this.loadHistory(this.companyId());
        } else {
          this.error.set(result.message);
        }
      },
      error: (err) => {
        this.generating.set(false);
        this.error.set(err.error?.error || 'Failed to generate link');
      }
    });
  }

  private prefillEmail(url: string): void {
    const monthLabel = this.months.find(m => m.value === this.month)?.label ?? `Month ${this.month}`;
    const recipientName = this.contactPerson || this.companyName || 'Entrepreneur';
    this.emailTo = this.companyEmail;
    this.emailSubject = `Financial Data Request - ${this.companyName} (${monthLabel} ${this.financialYear})`;
    this.emailBody = `Hi ${recipientName},\n\nPlease submit your management accounts for ${monthLabel} ${this.financialYear} using the link below:\n\n${url}\n\nThank you.`;
  }

  sendEmail(): void {
    if (!this.emailTo || !this.emailSubject || !this.emailBody || this.sendingEmail()) return;
    this.sendingEmail.set(true);
    this.emailError.set(null);
    this.emailSent.set(false);

    const recipientName = this.contactPerson || this.companyName || this.emailTo;
    const bodyHtml = this.emailBody.split('\n').map(line => `<p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 12px;">${line}</p>`).join('');

    this.emailService.sendNotification(recipientName, this.emailTo, this.emailSubject, bodyHtml).subscribe({
      next: () => {
        this.sendingEmail.set(false);
        this.emailSent.set(true);
        const record = this.history().find(r => r.token === this.currentToken);
        if (record?.id) {
          this.requestService.updateRequestEmail(
            record.id,
            this.emailTo,
            recipientName,
            this.emailSubject,
            this.emailBody,
          ).subscribe({
            next: () => {
              this.requestService.markEmailSent(record.id!, new Date().toISOString()).subscribe({
                next: () => this.loadHistory(this.companyId()),
                error: () => {}
              });
            },
            error: () => {}
          });
        }
      },
      error: () => {
        this.sendingEmail.set(false);
        this.emailError.set('Failed to send email. Please try again.');
      }
    });
  }

  resetEmail(): void {
    this.emailTo = this.companyEmail;
    this.emailSubject = '';
    this.emailBody = '';
    this.emailSent.set(false);
    this.emailError.set(null);
    if (this.generatedUrl()) {
      this.prefillEmail(this.generatedUrl()!);
    }
  }

  copyLink(): void {
    const url = this.generatedUrl();
    if (url) {
      navigator.clipboard.writeText(url).then(() => {
        const btn = document.activeElement as HTMLElement;
        if (btn) btn.innerText = 'Copied!';
        setTimeout(() => { if (btn) btn.innerText = 'Copy'; }, 2000);
      });
    }
  }

  copyHistoryLink(r: FinancialIndicatorRequest): void {
    if (r.publicUrl) {
      navigator.clipboard.writeText(r.publicUrl);
    }
  }

  monthLabel(m: number): string {
    return this.months.find(x => x.value === m)?.label ?? `Month ${m}`;
  }
}
