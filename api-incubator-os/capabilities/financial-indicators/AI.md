# Financial Indicators — AI Context

## Purpose
Capture and report on monthly management account financial indicators for companies. Supports advisor-driven data collection and entrepreneur self-service via secure submission links.

## Dependencies
- **Nodes** — all records stored in the generic `nodes` table with `type = 'financial_indicators'`
- **FinancialIndicatorLinkRepository** — stores submission requests in `nodes` table with `type = 'financial_indicator_request'`

## Queries
- `getIndicator(id)` → `FinancialIndicatorResponse` — single record with calculated values
- `listByCompany(companyId)` → `FinancialIndicatorSummary[]` — all records for a company, newest first
- `getAnnual(companyId, year)` → `AnnualReportResponse` — 12-month March-February structure with calculated values
- `getSummary(companyId)` → `FinancialIndicatorSummaryResponse` — latest month's key metrics

## Commands
- `createIndicator(companyId, data)` → `CommandResult` — create new financial indicators record
- `updateIndicator(id, data)` → `CommandResult` — update existing record
- `deleteIndicator(id)` → `CommandResult` — hard delete
- `requestLink(companyId, financialYear, month)` → `CommandResult` — generate secure submission link
- `publicSubmit(token, data)` → `CommandResult` — submit via public link (no auth required)

## Business Rules
- All records use `type = 'financial_indicators'` in the `nodes` table
- Only user-entered values are persisted; calculated values are computed on-the-fly
- Financial year starts in March; annual report always returns March–February order
- Duplicate month submissions for the same company/financial year are rejected
- Public submission tokens are single-use and expire after 7 days
- All calculations happen in `FinancialIndicatorCalculator` — never in controllers or frontend

## Important DTOs
- `FinancialIndicatorResponse` — {id, companyId, data, grossProfit, grossProfitPercentage, netProfit, netProfitPercentage}
- `FinancialIndicatorSummary` — {id, financialYear, month, netProfit, grossProfit, status, createdAt}
- `AnnualReportResponse` — {year, months: {March: {}, April: {}, ...}}
- `FinancialIndicatorSummaryResponse` — {latestMonth, latestNetProfit, latestGrossProfit, latestSales, latestExpenses, grossMargin, netMargin}
- `CommandResult` — {success, message, data?, auditId?, warnings[]}
- `CreateIndicatorRequest` — {companyId, data}
- `UpdateIndicatorRequest` — {data}
- `RequestLinkRequest` — {companyId, financialYear, month}
- `PublicSubmitRequest` — {token, data}

## Important Files
- `capabilities/financial-indicators/Services/FinancialIndicatorCalculator.php`
- `capabilities/financial-indicators/Repository/FinancialIndicatorRepository.php`
- `capabilities/financial-indicators/Repository/FinancialIndicatorLinkRepository.php`
- `capabilities/financial-indicators/Application/Commands/CreateIndicator.php`
- `capabilities/financial-indicators/Application/Commands/PublicSubmit.php`
- `capabilities/financial-indicators/Application/Queries/GetAnnual.php`
- `api/financial-indicators/queries/annual.php`
- `api/financial-indicators/public/submit.php`

## Extension Points
- Add ratio calculations (current ratio, debt-to-equity, etc.) in `FinancialIndicatorCalculator`
- Add trend analysis endpoint comparing multiple years
- Add CSV export for annual report
- Add email notification when public submission is received
