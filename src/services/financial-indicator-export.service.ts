import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FinancialIndicatorService } from './financial-indicator.service';

@Injectable({ providedIn: 'root' })
export class FinancialIndicatorExportService {
  constructor(private api: FinancialIndicatorService) {}

  async exportAnnualReport(companyId: number, year: number, companyName: string): Promise<void> {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Incubator OS';
    workbook.created = new Date();

    const report = await firstValueFrom(this.api.getAnnual(companyId, year));
    if (!report) return;

    const ws = workbook.addWorksheet(`Annual ${year}`);
    ws.properties.defaultColWidth = 18;

    const monthOrder = ['March','April','May','June','July','August','September','October','November','December','January','February'];

    // Title
    ws.mergeCells(1, 1, 1, 13);
    const title = ws.getCell('A1');
    title.value = `${companyName} — Management Accounts ${year}`;
    title.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1F4E79' } };
    ws.getRow(1).height = 30;

    // Header row
    const headerRow = ws.getRow(3);
    headerRow.getCell(1).value = 'Item';
    headerRow.getCell(1).font = { bold: true };
    monthOrder.forEach((m, i) => {
      const cell = headerRow.getCell(i + 2);
      cell.value = m;
      cell.font = { bold: true, size: 10 };
      cell.alignment = { horizontal: 'right' };
    });

    const rows: { label: string; field: string; section?: string }[] = [
      { label: 'Sales', field: 'sales', section: 'Income Statement' },
      { label: 'Cost of Sales', field: 'costOfSales' },
      { label: 'Gross Profit', field: 'grossProfit' },
      { label: 'Gross %', field: 'grossProfitPercentage' },
      { label: 'Operating Expenses', field: 'operatingExpenses' },
      { label: 'Net Profit', field: 'netProfit' },
      { label: 'Net %', field: 'netProfitPercentage' },
      { label: 'Cash', field: 'cash', section: 'Balance Sheet' },
      { label: 'Cash Equivalents', field: 'cashEquivalents' },
      { label: 'Short Term Investments', field: 'shortTermInvestments' },
      { label: 'Current Receivables', field: 'currentReceivables' },
      { label: 'Total Current Assets', field: 'totalCurrentAssets' },
      { label: 'Total Assets', field: 'totalAssets' },
      { label: 'Total Current Liabilities', field: 'totalCurrentLiabilities' },
      { label: 'Total Liabilities', field: 'totalLiabilities' },
      { label: 'Total Equity', field: 'totalEquity' },
    ];

    let rowNum = 4;
    for (const r of rows) {
      if (r.section) {
        const sectionRow = ws.getRow(rowNum);
        sectionRow.getCell(1).value = r.section;
        sectionRow.getCell(1).font = { bold: true, color: { argb: 'FF1F4E79' } };
        sectionRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };
        rowNum++;
      }
      const dataRow = ws.getRow(rowNum);
      dataRow.getCell(1).value = r.label;
      dataRow.getCell(1).font = { bold: r.field === 'grossProfit' || r.field === 'netProfit' };
      monthOrder.forEach((m, i) => {
        const val = (report.months[m] as any)?.[r.field];
        const cell = dataRow.getCell(i + 2);
        if (val !== null && val !== undefined) {
          if (r.field.endsWith('Percentage')) {
            cell.value = val;
            cell.numFmt = '0%';
          } else {
            cell.value = val;
            cell.numFmt = '#,##0';
          }
        } else {
          cell.value = '-';
        }
        cell.alignment = { horizontal: 'right' };
      });
      rowNum++;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    this.downloadBuffer(buffer, `Financial_Indicators_${year}_${companyName.replace(/\s+/g, '_')}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }

  async exportSummary(companyId: number, companyName: string): Promise<void> {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Incubator OS';
    workbook.created = new Date();

    const [summary, records] = await Promise.all([
      firstValueFrom(this.api.getSummary(companyId)),
      firstValueFrom(this.api.listByCompany(companyId)),
    ]);

    // Summary sheet
    const ws = workbook.addWorksheet('Summary');
    ws.properties.defaultColWidth = 22;
    ws.mergeCells('A1:B1');
    ws.getCell('A1').value = `${companyName} — Financial Summary`;
    ws.getCell('A1').font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1F4E79' } };

    if (summary) {
      const fields = [
        ['Latest Month', summary.latestMonth],
        ['Latest Financial Year', summary.latestFinancialYear],
        ['Sales', summary.latestSales],
        ['Gross Profit', summary.latestGrossProfit],
        ['Net Profit', summary.latestNetProfit],
        ['Expenses', summary.latestExpenses],
        ['Gross Margin', summary.grossMargin != null ? `${summary.grossMargin}%` : null],
        ['Net Margin', summary.netMargin != null ? `${summary.netMargin}%` : null],
      ];
      fields.forEach(([label, val], i) => {
        const r = ws.getRow(i + 3);
        r.getCell(1).value = label;
        r.getCell(1).font = { bold: true };
        r.getCell(2).value = val;
      });
    }

    // Records sheet
    if (records && records.length > 0) {
      const ws2 = workbook.addWorksheet('Monthly Records');
      ws2.properties.defaultColWidth = 16;
      ws2.getRow(1).getCell(1).value = 'ID';
      ws2.getRow(1).getCell(2).value = 'Financial Year';
      ws2.getRow(1).getCell(3).value = 'Month';
      ws2.getRow(1).getCell(4).value = 'Gross Profit';
      ws2.getRow(1).getCell(5).value = 'Net Profit';
      ws2.getRow(1).getCell(6).value = 'Status';
      ws2.getRow(1).getCell(7).value = 'Created';
      ws2.getRow(1).font = { bold: true };

      records.forEach((r, i) => {
        const row = ws2.getRow(i + 2);
        row.getCell(1).value = r.id;
        row.getCell(2).value = r.financialYear;
        row.getCell(3).value = r.month;
        row.getCell(4).value = r.grossProfit;
        row.getCell(5).value = r.netProfit;
        row.getCell(6).value = r.status;
        row.getCell(7).value = r.createdAt;
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    this.downloadBuffer(buffer, `Financial_Summary_${companyName.replace(/\s+/g, '_')}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }

  private downloadBuffer(buffer: ArrayBuffer, filename: string, mimeType: string): void {
    const blob = new Blob([buffer], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
