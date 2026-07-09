import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnnualReportResponse, AnnualMonthData } from '../../../../../../services/financial-indicator.service';

const MONTH_ORDER = ['March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February'];

@Component({
  selector: 'app-annual-report',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 text-xs">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">Item</th>
              <th *ngFor="let m of MONTH_ORDER" class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase min-w-[90px]">{{ m }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <!-- Income Statement Section -->
            <tr class="bg-gray-50/50">
              <td class="px-3 py-2 text-xs font-semibold text-gray-700 sticky left-0 bg-gray-50/50" colspan="13">Income Statement</td>
            </tr>
            <tr class="hover:bg-gray-50"><td class="px-3 py-1.5 text-gray-600 sticky left-0 bg-white">Sales</td>
              <td *ngFor="let m of MONTH_ORDER" class="px-3 py-1.5 text-right font-medium">{{ getVal(m, 'sales') }}</td>
            </tr>
            <tr class="hover:bg-gray-50"><td class="px-3 py-1.5 text-gray-600 sticky left-0 bg-white">Cost of Sales</td>
              <td *ngFor="let m of MONTH_ORDER" class="px-3 py-1.5 text-right">{{ getVal(m, 'costOfSales') }}</td>
            </tr>
            <tr class="hover:bg-gray-50 font-medium"><td class="px-3 py-1.5 text-gray-800 sticky left-0 bg-white">Gross Profit</td>
              <td *ngFor="let m of MONTH_ORDER" class="px-3 py-1.5 text-right text-green-600">{{ getVal(m, 'grossProfit') }}</td>
            </tr>
            <tr class="hover:bg-gray-50"><td class="px-3 py-1.5 text-gray-600 sticky left-0 bg-white">Gross %</td>
              <td *ngFor="let m of MONTH_ORDER" class="px-3 py-1.5 text-right">{{ getVal(m, 'grossProfitPercentage') }}%</td>
            </tr>
            <tr class="hover:bg-gray-50"><td class="px-3 py-1.5 text-gray-600 sticky left-0 bg-white">Operating Expenses</td>
              <td *ngFor="let m of MONTH_ORDER" class="px-3 py-1.5 text-right">{{ getVal(m, 'operatingExpenses') }}</td>
            </tr>
            <tr class="hover:bg-gray-50 font-medium"><td class="px-3 py-1.5 text-gray-800 sticky left-0 bg-white">Net Profit</td>
              <td *ngFor="let m of MONTH_ORDER" class="px-3 py-1.5 text-right" [class.text-green-600]="getNum(m, 'netProfit') >= 0" [class.text-red-600]="getNum(m, 'netProfit') < 0">{{ getVal(m, 'netProfit') }}</td>
            </tr>
            <tr class="hover:bg-gray-50"><td class="px-3 py-1.5 text-gray-600 sticky left-0 bg-white">Net %</td>
              <td *ngFor="let m of MONTH_ORDER" class="px-3 py-1.5 text-right">{{ getVal(m, 'netProfitPercentage') }}%</td>
            </tr>

            <!-- Balance Sheet Section -->
            <tr class="bg-gray-50/50">
              <td class="px-3 py-2 text-xs font-semibold text-gray-700 sticky left-0 bg-gray-50/50" colspan="13">Balance Sheet</td>
            </tr>
            <tr class="hover:bg-gray-50"><td class="px-3 py-1.5 text-gray-600 sticky left-0 bg-white">Cash</td>
              <td *ngFor="let m of MONTH_ORDER" class="px-3 py-1.5 text-right">{{ getVal(m, 'cash') }}</td>
            </tr>
            <tr class="hover:bg-gray-50"><td class="px-3 py-1.5 text-gray-600 sticky left-0 bg-white">Cash Equivalents</td>
              <td *ngFor="let m of MONTH_ORDER" class="px-3 py-1.5 text-right">{{ getVal(m, 'cashEquivalents') }}</td>
            </tr>
            <tr class="hover:bg-gray-50"><td class="px-3 py-1.5 text-gray-600 sticky left-0 bg-white">Short Term Investments</td>
              <td *ngFor="let m of MONTH_ORDER" class="px-3 py-1.5 text-right">{{ getVal(m, 'shortTermInvestments') }}</td>
            </tr>
            <tr class="hover:bg-gray-50"><td class="px-3 py-1.5 text-gray-600 sticky left-0 bg-white">Current Receivables</td>
              <td *ngFor="let m of MONTH_ORDER" class="px-3 py-1.5 text-right">{{ getVal(m, 'currentReceivables') }}</td>
            </tr>
            <tr class="hover:bg-gray-50"><td class="px-3 py-1.5 text-gray-600 sticky left-0 bg-white">Total Current Assets</td>
              <td *ngFor="let m of MONTH_ORDER" class="px-3 py-1.5 text-right">{{ getVal(m, 'totalCurrentAssets') }}</td>
            </tr>
            <tr class="hover:bg-gray-50"><td class="px-3 py-1.5 text-gray-600 sticky left-0 bg-white">Total Assets</td>
              <td *ngFor="let m of MONTH_ORDER" class="px-3 py-1.5 text-right">{{ getVal(m, 'totalAssets') }}</td>
            </tr>
            <tr class="hover:bg-gray-50"><td class="px-3 py-1.5 text-gray-600 sticky left-0 bg-white">Total Current Liabilities</td>
              <td *ngFor="let m of MONTH_ORDER" class="px-3 py-1.5 text-right">{{ getVal(m, 'totalCurrentLiabilities') }}</td>
            </tr>
            <tr class="hover:bg-gray-50"><td class="px-3 py-1.5 text-gray-600 sticky left-0 bg-white">Total Liabilities</td>
              <td *ngFor="let m of MONTH_ORDER" class="px-3 py-1.5 text-right">{{ getVal(m, 'totalLiabilities') }}</td>
            </tr>
            <tr class="hover:bg-gray-50"><td class="px-3 py-1.5 text-gray-600 sticky left-0 bg-white">Total Equity</td>
              <td *ngFor="let m of MONTH_ORDER" class="px-3 py-1.5 text-right">{{ getVal(m, 'totalEquity') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class AnnualReportComponent {
  protected readonly MONTH_ORDER = MONTH_ORDER;
  report = input.required<AnnualReportResponse | null>();

  protected getNum(month: string, field: keyof AnnualMonthData): number {
    return (this.report()?.months[month]?.[field] as number) ?? 0;
  }

  protected getVal(month: string, field: keyof AnnualMonthData): string {
    const val = this.report()?.months[month]?.[field];
    if (val === null || val === undefined) return '-';
    if (typeof val === 'number') {
      return val.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return String(val);
  }
}
