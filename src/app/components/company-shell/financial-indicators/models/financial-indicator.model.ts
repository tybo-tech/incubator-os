import { FinancialIndicatorMeta, IncomeStatement, BalanceSheet } from '../../../../../services/financial-indicator.service';

export type { FinancialIndicatorMeta, IncomeStatement, BalanceSheet };

export interface FinancialFormData {
  meta: FinancialIndicatorMeta;
  incomeStatement: IncomeStatement;
  balanceSheet: BalanceSheet;
}

export interface LiveCalculations {
  grossProfit: number;
  grossProfitPercentage: number;
  netProfit: number;
  netProfitPercentage: number;
}
