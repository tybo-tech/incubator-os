import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  FinancialIndicatorService,
  FinancialIndicatorResponse,
  FinancialIndicatorSummary,
  AnnualReportResponse,
  FinancialIndicatorSummaryResponse,
  CommandResult,
  FinancialIndicatorData,
} from '../../../../../services/financial-indicator.service';

@Injectable()
export class FinancialIndicatorsFacade {
  constructor(private api: FinancialIndicatorService) {}

  create(companyId: number, data: FinancialIndicatorData): Observable<CommandResult> {
    return this.api.create(companyId, data);
  }

  update(id: number, data: FinancialIndicatorData): Observable<CommandResult> {
    return this.api.update(id, data);
  }

  get(id: number): Observable<FinancialIndicatorResponse> {
    return this.api.get(id);
  }

  delete(id: number): Observable<CommandResult> {
    return this.api.delete(id);
  }

  listByCompany(companyId: number): Observable<FinancialIndicatorSummary[]> {
    return this.api.listByCompany(companyId);
  }

  getAnnual(companyId: number, year: number): Observable<AnnualReportResponse> {
    return this.api.getAnnual(companyId, year);
  }

  getSummary(companyId: number): Observable<FinancialIndicatorSummaryResponse> {
    return this.api.getSummary(companyId);
  }

  requestLink(companyId: number, financialYear: number, month: number): Observable<CommandResult> {
    return this.api.requestLink(companyId, financialYear, month);
  }
}
