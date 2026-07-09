import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Constants } from '../../../services/service';

interface LiveCalc {
  grossProfit: number;
  grossProfitPercentage: number;
  netProfit: number;
  netProfitPercentage: number;
}

@Component({
  selector: 'app-public-financial-submission',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <div class="bg-white border-b border-gray-200">
        <div class="max-w-2xl mx-auto px-4 py-6">
          <h1 class="text-xl font-bold text-gray-900">Financial Indicators</h1>
          <p class="text-sm text-gray-500">Submit your monthly management accounts</p>
        </div>
      </div>

      <div class="flex-1 px-4 py-8">
        <div class="max-w-2xl mx-auto">

          <div *ngIf="state() === 'loading'" class="text-center py-16">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p class="text-sm text-gray-500">Validating your link...</p>
          </div>

          <div *ngIf="state() === 'invalid'" class="text-center py-16">
            <div class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h2 class="text-base font-semibold text-gray-900 mb-1">Invalid link</h2>
            <p class="text-sm text-gray-500">This submission link is not valid. Please contact your advisor for a new link.</p>
          </div>

          <div *ngIf="state() === 'expired'" class="text-center py-16">
            <div class="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h2 class="text-base font-semibold text-gray-900 mb-1">Link expired</h2>
            <p class="text-sm text-gray-500">This submission link has expired. Please ask your advisor to send a new one.</p>
          </div>

          <div *ngIf="state() === 'used'" class="text-center py-16">
            <div class="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h2 class="text-base font-semibold text-gray-900 mb-1">Already submitted</h2>
            <p class="text-sm text-gray-500">This link has already been used. Contact your advisor if you need to resubmit.</p>
          </div>

          <div *ngIf="state() === 'submitted'" class="text-center py-16">
            <div class="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h2 class="text-xl font-bold text-gray-900 mb-2">Thank you!</h2>
            <p class="text-sm text-gray-600">Your financial data has been submitted successfully.</p>
          </div>

          <div *ngIf="state() === 'form'" class="bg-white rounded-xl shadow-sm border border-gray-200">
            <div class="px-6 py-5 border-b border-gray-200">
              <h2 class="text-lg font-semibold text-gray-900">Monthly Management Accounts</h2>
              <p class="text-sm text-gray-500 mt-1">Enter the values as they appear in your management accounts.</p>
            </div>

            <div class="p-6 space-y-6">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Financial Year</label>
                  <input type="number" [ngModel]="financialYear" disabled class="w-full border border-gray-200 bg-gray-50 rounded-md px-3 py-2 text-sm text-gray-500" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Month</label>
                  <input type="text" [ngModel]="monthLabel" disabled class="w-full border border-gray-200 bg-gray-50 rounded-md px-3 py-2 text-sm text-gray-500" />
                </div>
              </div>

              <div>
                <h3 class="text-sm font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">Income Statement</h3>
                <div class="grid grid-cols-3 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Sales</label>
                    <input type="number" [(ngModel)]="sales" (input)="recalc()" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Cost of Sales</label>
                    <input type="number" [(ngModel)]="costOfSales" (input)="recalc()" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Operating Expenses</label>
                    <input type="number" [(ngModel)]="operatingExpenses" (input)="recalc()" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                </div>
              </div>

              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p class="text-sm font-medium text-blue-800 mb-2">Calculated Values</p>
                <div class="grid grid-cols-4 gap-4 text-sm">
                  <div><span class="text-blue-600">Gross Profit:</span> <strong>{{ liveCalc().grossProfit | currency:'ZAR':'symbol':'1.0-0' }}</strong></div>
                  <div><span class="text-blue-600">Gross %:</span> <strong>{{ liveCalc().grossProfitPercentage }}%</strong></div>
                  <div><span class="text-blue-600">Net Profit:</span> <strong>{{ liveCalc().netProfit | currency:'ZAR':'symbol':'1.0-0' }}</strong></div>
                  <div><span class="text-blue-600">Net %:</span> <strong>{{ liveCalc().netProfitPercentage }}%</strong></div>
                </div>
              </div>

              <div>
                <h3 class="text-sm font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">Balance Sheet</h3>
                <div class="grid grid-cols-3 gap-4">
                  <div><label class="block text-sm font-medium text-gray-700 mb-1">Cash</label><input type="number" [(ngModel)]="cash" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                  <div><label class="block text-sm font-medium text-gray-700 mb-1">Cash Equivalents</label><input type="number" [(ngModel)]="cashEquivalents" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                  <div><label class="block text-sm font-medium text-gray-700 mb-1">Short Term Investments</label><input type="number" [(ngModel)]="shortTermInvestments" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                  <div><label class="block text-sm font-medium text-gray-700 mb-1">Current Receivables</label><input type="number" [(ngModel)]="currentReceivables" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                  <div><label class="block text-sm font-medium text-gray-700 mb-1">Total Current Assets</label><input type="number" [(ngModel)]="totalCurrentAssets" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                  <div><label class="block text-sm font-medium text-gray-700 mb-1">Total Assets</label><input type="number" [(ngModel)]="totalAssets" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                  <div><label class="block text-sm font-medium text-gray-700 mb-1">Total Current Liabilities</label><input type="number" [(ngModel)]="totalCurrentLiabilities" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                  <div><label class="block text-sm font-medium text-gray-700 mb-1">Total Liabilities</label><input type="number" [(ngModel)]="totalLiabilities" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                  <div><label class="block text-sm font-medium text-gray-700 mb-1">Total Equity</label><input type="number" [(ngModel)]="totalEquity" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                </div>
              </div>

              <div *ngIf="error()" class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{{ error() }}</div>
            </div>

            <div class="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200">
              <button (click)="submit()" [disabled]="submitting()"
                class="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {{ submitting() ? 'Submitting...' : 'Submit' }}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  `
})
export class PublicFinancialSubmissionComponent implements OnInit {
  state = signal<'loading' | 'invalid' | 'expired' | 'used' | 'form' | 'submitted'>('loading');
  submitting = signal(false);
  error = signal<string | null>(null);

  token = '';
  financialYear = 0;
  month = 0;
  monthLabel = '';

  sales = 0;
  costOfSales = 0;
  operatingExpenses = 0;

  cash = 0;
  cashEquivalents = 0;
  shortTermInvestments = 0;
  currentReceivables = 0;
  totalCurrentAssets = 0;
  totalAssets = 0;
  totalCurrentLiabilities = 0;
  totalLiabilities = 0;
  totalEquity = 0;

  private monthNames: Record<number, string> = {
    1: 'January', 2: 'February', 3: 'March', 4: 'April', 5: 'May', 6: 'June',
    7: 'July', 8: 'August', 9: 'September', 10: 'October', 11: 'November', 12: 'December',
  };

  protected liveCalc = computed<LiveCalc>(() => {
    const s = this.sales;
    const c = this.costOfSales;
    const o = this.operatingExpenses;
    const gp = s - c;
    const np = gp - o;
    return {
      grossProfit: gp,
      grossProfitPercentage: s > 0 ? Math.round((gp / s) * 100) : 0,
      netProfit: np,
      netProfitPercentage: s > 0 ? Math.round((np / s) * 100) : 0,
    };
  });

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token || this.token.length < 10) {
      this.state.set('invalid');
      return;
    }
    this.validateToken();
  }

  private validateToken(): void {
    this.http.get<any>(`${Constants.ApiBase}api/financial-indicators/public/validate.php/${this.token}`).subscribe({
      next: (result) => {
        if (!result.valid) {
          if (result.error?.toLowerCase().includes('expired')) {
            this.state.set('expired');
          } else if (result.error?.toLowerCase().includes('already been used')) {
            this.state.set('used');
          } else {
            this.state.set('invalid');
          }
          return;
        }
        this.financialYear = result.financialYear;
        this.month = result.month;
        this.monthLabel = this.monthNames[result.month] || `Month ${result.month}`;
        this.state.set('form');
      },
      error: () => {
        this.state.set('invalid');
      },
    });
  }

  protected recalc(): void {}

  submit(): void {
    this.submitting.set(true);
    this.error.set(null);

    const body = {
      token: this.token,
      data: {
        meta: {
          financial_year: this.financialYear,
          month: this.month,
          currency: 'ZAR',
          report_type: 'Monthly Management Accounts',
        },
        income_statement: {
          sales: this.sales,
          cost_of_sales: this.costOfSales,
          operating_expenses: this.operatingExpenses,
        },
        balance_sheet: {
          cash: this.cash,
          cash_equivalents: this.cashEquivalents,
          short_term_investments: this.shortTermInvestments,
          current_receivables: this.currentReceivables,
          total_current_assets: this.totalCurrentAssets,
          total_assets: this.totalAssets,
          total_current_liabilities: this.totalCurrentLiabilities,
          total_liabilities: this.totalLiabilities,
          total_equity: this.totalEquity,
        },
      },
    };

    this.http.post<any>(`${Constants.ApiBase}api/financial-indicators/public/submit.php`, body).subscribe({
      next: (result) => {
        this.submitting.set(false);
        if (result.success) {
          this.state.set('submitted');
        } else {
          this.error.set(result.message);
        }
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err.error?.error || 'Something went wrong. Please try again.');
      },
    });
  }
}
