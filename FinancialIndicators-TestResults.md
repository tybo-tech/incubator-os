# Financial Indicators - Endpoint Test Results

**Date:** 2026-07-09 15:03:06

**Base URL:** http://localhost:8080
**Company ID:** 11
**Financial Year:** 2026
**Test Month:** 12

---

## [PASS] Create Financial Indicators

**Status:** PASS

**Detail:** Record 3433 created (HTTP 201)

```json
{
    "success":  true,
    "message":  "Financial indicators created",
    "data":  {
                 "id":  3433,
                 "companyId":  11,
                 "parentId":  null,
                 "data":  {
                              "meta":  {
                                           "month":  12,
                                           "currency":  "ZAR",
                                           "report_type":  "Monthly Management Accounts",
                                           "financial_year":  2026
                                       },
                              "balance_sheet":  {
                                                    "cash":  0,
                                                    "total_assets":  17090860,
                                                    "total_equity":  5872190,
                                                    "cash_equivalents":  101377,
                                                    "total_liabilities":  11218670,
                                                    "current_receivables":  1708843,
                                                    "total_current_assets":  1810220,
                                                    "short_term_investments":  2093103,
                                                    "total_current_liabilities":  3546308
                                                },
                              "income_statement":  {
                                                       "sales":  28875133,
                                                       "cost_of_sales":  5035297,
                                                       "operating_expenses":  22807572
                                                   }
                          },
                 "createdAt":  "2026-07-09 15:03:05",
                 "updatedAt":  "2026-07-09 15:03:05",
                 "createdBy":  null,
                 "updatedBy":  null,
                 "grossProfit":  23839836,
                 "grossProfitPercentage":  83,
                 "netProfit":  1032264,
                 "netProfitPercentage":  4
             },
    "auditId":  null,
    "warnings":  [

                 ]
}
```

---

## [PASS] View Financial Indicator

**Status:** PASS

**Detail:** GP=23839836 NP=1032264 GP%=83 NP%=4 (calculations verified)

```json
{
    "id":  3433,
    "companyId":  11,
    "parentId":  null,
    "data":  {
                 "meta":  {
                              "month":  12,
                              "currency":  "ZAR",
                              "report_type":  "Monthly Management Accounts",
                              "financial_year":  2026
                          },
                 "balance_sheet":  {
                                       "cash":  0,
                                       "total_assets":  17090860,
                                       "total_equity":  5872190,
                                       "cash_equivalents":  101377,
                                       "total_liabilities":  11218670,
                                       "current_receivables":  1708843,
                                       "total_current_assets":  1810220,
                                       "short_term_investments":  2093103,
                                       "total_current_liabilities":  3546308
                                   },
                 "income_statement":  {
                                          "sales":  28875133,
                                          "cost_of_sales":  5035297,
                                          "operating_expenses":  22807572
                                      }
             },
    "createdAt":  "2026-07-09 15:03:05",
    "updatedAt":  "2026-07-09 15:03:05",
    "createdBy":  null,
    "updatedBy":  null,
    "grossProfit":  23839836,
    "grossProfitPercentage":  83,
    "netProfit":  1032264,
    "netProfitPercentage":  4
}
```

---

## [PASS] Update Financial Indicator

**Status:** PASS

**Detail:** GP=30000000 NP=8000000 (calculations re-verified)

```json
{
    "success":  true,
    "message":  "Financial indicators updated",
    "data":  {
                 "id":  3433,
                 "companyId":  11,
                 "parentId":  null,
                 "data":  {
                              "meta":  {
                                           "month":  12,
                                           "currency":  "ZAR",
                                           "report_type":  "Monthly Management Accounts",
                                           "financial_year":  2026
                                       },
                              "balance_sheet":  {
                                                    "cash":  100000,
                                                    "total_assets":  18000000,
                                                    "total_equity":  6000000,
                                                    "cash_equivalents":  200000,
                                                    "total_liabilities":  12000000,
                                                    "current_receivables":  2000000,
                                                    "total_current_assets":  2000000,
                                                    "short_term_investments":  3000000,
                                                    "total_current_liabilities":  4000000
                                                },
                              "income_statement":  {
                                                       "sales":  35000000,
                                                       "cost_of_sales":  5000000,
                                                       "operating_expenses":  22000000
                                                   }
                          },
                 "createdAt":  "2026-07-09 15:03:05",
                 "updatedAt":  "2026-07-09 15:03:05",
                 "createdBy":  null,
                 "updatedBy":  null,
                 "grossProfit":  30000000,
                 "grossProfitPercentage":  86,
                 "netProfit":  8000000,
                 "netProfitPercentage":  23
             },
    "auditId":  null,
    "warnings":  [

                 ]
}
```

---

## [PASS] List Company Records

**Status:** PASS

**Detail:** 5 records found, newest-first: True

```json
[
    {
        "id":  3433,
        "financialYear":  2026,
        "month":  12,
        "netProfit":  8000000,
        "grossProfit":  30000000,
        "status":  "active",
        "createdAt":  "2026-07-09 15:03:05"
    },
    {
        "id":  3432,
        "financialYear":  2026,
        "month":  6,
        "netProfit":  2000000,
        "grossProfit":  10000000,
        "status":  "active",
        "createdAt":  "2026-07-09 15:02:21"
    },
    {
        "id":  3429,
        "financialYear":  2026,
        "month":  6,
        "netProfit":  2000000,
        "grossProfit":  10000000,
        "status":  "active",
        "createdAt":  "2026-07-09 15:01:34"
    },
    {
        "id":  3426,
        "financialYear":  2026,
        "month":  6,
        "netProfit":  2000000,
        "grossProfit":  10000000,
        "status":  "active",
        "createdAt":  "2026-07-09 15:00:32"
    },
    {
        "id":  3420,
        "financialYear":  2026,
        "month":  5,
        "netProfit":  700,
        "grossProfit":  900,
        "status":  "active",
        "createdAt":  "2026-07-09 14:52:37"
    }
]
```

---

## [PASS] Annual Report Structure

**Status:** PASS

**Detail:** 12 months, March to February order correct

```json
{
    "year":  2026,
    "months":  {
                   "March":  {
                                 "sales":  null,
                                 "costOfSales":  null,
                                 "grossProfit":  null,
                                 "grossProfitPercentage":  null,
                                 "operatingExpenses":  null,
                                 "netProfit":  null,
                                 "netProfitPercentage":  null,
                                 "cash":  null,
                                 "cashEquivalents":  null,
                                 "shortTermInvestments":  null,
                                 "currentReceivables":  null,
                                 "totalCurrentAssets":  null,
                                 "totalAssets":  null,
                                 "totalCurrentLiabilities":  null,
                                 "totalLiabilities":  null,
                                 "totalEquity":  null
                             },
                   "April":  {
                                 "sales":  null,
                                 "costOfSales":  null,
                                 "grossProfit":  null,
                                 "grossProfitPercentage":  null,
                                 "operatingExpenses":  null,
                                 "netProfit":  null,
                                 "netProfitPercentage":  null,
                                 "cash":  null,
                                 "cashEquivalents":  null,
                                 "shortTermInvestments":  null,
                                 "currentReceivables":  null,
                                 "totalCurrentAssets":  null,
                                 "totalAssets":  null,
                                 "totalCurrentLiabilities":  null,
                                 "totalLiabilities":  null,
                                 "totalEquity":  null
                             },
                   "May":  {
                               "sales":  1000,
                               "costOfSales":  100,
                               "grossProfit":  900,
                               "grossProfitPercentage":  90,
                               "operatingExpenses":  200,
                               "netProfit":  700,
                               "netProfitPercentage":  70,
                               "cash":  0,
                               "cashEquivalents":  0,
                               "shortTermInvestments":  0,
                               "currentReceivables":  0,
                               "totalCurrentAssets":  0,
                               "totalAssets":  0,
                               "totalCurrentLiabilities":  0,
                               "totalLiabilities":  0,
                               "totalEquity":  0
                           },
                   "June":  {
                                "sales":  15000000,
                                "costOfSales":  5000000,
                                "grossProfit":  10000000,
                                "grossProfitPercentage":  67,
                                "operatingExpenses":  8000000,
                                "netProfit":  2000000,
                                "netProfitPercentage":  13,
                                "cash":  50000,
                                "cashEquivalents":  100000,
                                "shortTermInvestments":  1000000,
                                "currentReceivables":  500000,
                                "totalCurrentAssets":  600000,
                                "totalAssets":  5000000,
                                "totalCurrentLiabilities":  1000000,
                                "totalLiabilities":  3000000,
                                "totalEquity":  2000000
                            },
                   "July":  {
                                "sales":  null,
                                "costOfSales":  null,
                                "grossProfit":  null,
                                "grossProfitPercentage":  null,
                                "operatingExpenses":  null,
                                "netProfit":  null,
                                "netProfitPercentage":  null,
                                "cash":  null,
                                "cashEquivalents":  null,
                                "shortTermInvestments":  null,
                                "currentReceivables":  null,
                                "totalCurrentAssets":  null,
                                "totalAssets":  null,
                                "totalCurrentLiabilities":  null,
                                "totalLiabilities":  null,
                                "totalEquity":  null
                            },
                   "August":  {
                                  "sales":  null,
                                  "costOfSales":  null,
                                  "grossProfit":  null,
                                  "grossProfitPercentage":  null,
                                  "operatingExpenses":  null,
                                  "netProfit":  null,
                                  "netProfitPercentage":  null,
                                  "cash":  null,
                                  "cashEquivalents":  null,
                                  "shortTermInvestments":  null,
                                  "currentReceivables":  null,
                                  "totalCurrentAssets":  null,
                                  "totalAssets":  null,
                                  "totalCurrentLiabilities":  null,
                                  "totalLiabilities":  null,
                                  "totalEquity":  null
                              },
                   "September":  {
                                     "sales":  null,
                                     "costOfSales":  null,
                                     "grossProfit":  null,
                                     "grossProfitPercentage":  null,
                                     "operatingExpenses":  null,
                                     "netProfit":  null,
                                     "netProfitPercentage":  null,
                                     "cash":  null,
                                     "cashEquivalents":  null,
                                     "shortTermInvestments":  null,
                                     "currentReceivables":  null,
                                     "totalCurrentAssets":  null,
                                     "totalAssets":  null,
                                     "totalCurrentLiabilities":  null,
                                     "totalLiabilities":  null,
                                     "totalEquity":  null
                                 },
                   "October":  {
                                   "sales":  null,
                                   "costOfSales":  null,
                                   "grossProfit":  null,
                                   "grossProfitPercentage":  null,
                                   "operatingExpenses":  null,
                                   "netProfit":  null,
                                   "netProfitPercentage":  null,
                                   "cash":  null,
                                   "cashEquivalents":  null,
                                   "shortTermInvestments":  null,
                                   "currentReceivables":  null,
                                   "totalCurrentAssets":  null,
                                   "totalAssets":  null,
                                   "totalCurrentLiabilities":  null,
                                   "totalLiabilities":  null,
                                   "totalEquity":  null
                               },
                   "November":  {
                                    "sales":  null,
                                    "costOfSales":  null,
                                    "grossProfit":  null,
                                    "grossProfitPercentage":  null,
                                    "operatingExpenses":  null,
                                    "netProfit":  null,
                                    "netProfitPercentage":  null,
                                    "cash":  null,
                                    "cashEquivalents":  null,
                                    "shortTermInvestments":  null,
                                    "currentReceivables":  null,
                                    "totalCurrentAssets":  null,
                                    "totalAssets":  null,
                                    "totalCurrentLiabilities":  null,
                                    "totalLiabilities":  null,
                                    "totalEquity":  null
                                },
                   "December":  {
                                    "sales":  35000000,
                                    "costOfSales":  5000000,
                                    "grossProfit":  30000000,
                                    "grossProfitPercentage":  86,
                                    "operatingExpenses":  22000000,
                                    "netProfit":  8000000,
                                    "netProfitPercentage":  23,
                                    "cash":  100000,
                                    "cashEquivalents":  200000,
                                    "shortTermInvestments":  3000000,
                                    "currentReceivables":  2000000,
                                    "totalCurrentAssets":  2000000,
                                    "totalAssets":  18000000,
                                    "totalCurrentLiabilities":  4000000,
                                    "totalLiabilities":  12000000,
                                    "totalEquity":  6000000
                                },
                   "January":  {
                                   "sales":  null,
                                   "costOfSales":  null,
                                   "grossProfit":  null,
                                   "grossProfitPercentage":  null,
                                   "operatingExpenses":  null,
                                   "netProfit":  null,
                                   "netProfitPercentage":  null,
                                   "cash":  null,
                                   "cashEquivalents":  null,
                                   "shortTermInvestments":  null,
                                   "currentReceivables":  null,
                                   "totalCurrentAssets":  null,
                                   "totalAssets":  null,
                                   "totalCurrentLiabilities":  null,
                                   "totalLiabilities":  null,
                                   "totalEquity":  null
                               },
                   "February":  {
                                    "sales":  null,
                                    "costOfSales":  null,
                                    "grossProfit":  null,
                                    "grossProfitPercentage":  null,
                                    "operatingExpenses":  null,
                                    "netProfit":  null,
                                    "netProfitPercentage":  null,
                                    "cash":  null,
                                    "cashEquivalents":  null,
                                    "shortTermInvestments":  null,
                                    "currentReceivables":  null,
                                    "totalCurrentAssets":  null,
                                    "totalAssets":  null,
                                    "totalCurrentLiabilities":  null,
                                    "totalLiabilities":  null,
                                    "totalEquity":  null
                                }
               }
}
```

---

## [PASS] Company Summary

**Status:** PASS

**Detail:** Month=12 FY=2026 GP=30000000 NP=8000000 Sales=35000000 GM=86% NM=23%

```json
{
    "latestMonth":  12,
    "latestFinancialYear":  2026,
    "latestNetProfit":  8000000,
    "latestGrossProfit":  30000000,
    "latestSales":  35000000,
    "latestExpenses":  22000000,
    "grossMargin":  86,
    "netMargin":  23
}
```

---

## [PASS] Generate Submission Link

**Status:** PASS

**Detail:** Token=f4922acb0cbd94826b09d89dde2e8431080f6342b18e150eb29352d552711124 Expires=2026-07-16 15:03:05

```json
{
    "success":  true,
    "message":  "Submission link generated",
    "data":  {
                 "token":  "f4922acb0cbd94826b09d89dde2e8431080f6342b18e150eb29352d552711124",
                 "expiresAt":  "2026-07-16 15:03:05",
                 "publicUrl":  "http://localhost:4200/financial/f4922acb0cbd94826b09d89dde2e8431080f6342b18e150eb29352d552711124"
             },
    "auditId":  null,
    "warnings":  [

                 ]
}
```

---

## [PASS] Public Submission (first use)

**Status:** PASS

**Detail:** Submission accepted via token

```json
{
    "success":  true,
    "message":  "Financial indicators submitted successfully",
    "data":  {
                 "id":  3435,
                 "companyId":  11,
                 "parentId":  null,
                 "data":  {
                              "meta":  {
                                           "month":  6,
                                           "currency":  "ZAR",
                                           "report_type":  "Monthly Management Accounts",
                                           "financial_year":  2026
                                       },
                              "balance_sheet":  {
                                                    "cash":  50000,
                                                    "total_assets":  5000000,
                                                    "total_equity":  2000000,
                                                    "cash_equivalents":  100000,
                                                    "total_liabilities":  3000000,
                                                    "current_receivables":  500000,
                                                    "total_current_assets":  600000,
                                                    "short_term_investments":  1000000,
                                                    "total_current_liabilities":  1000000
                                                },
                              "income_statement":  {
                                                       "sales":  15000000,
                                                       "cost_of_sales":  5000000,
                                                       "operating_expenses":  8000000
                                                   }
                          },
                 "createdAt":  "2026-07-09 15:03:05",
                 "updatedAt":  "2026-07-09 15:03:05",
                 "createdBy":  null,
                 "updatedBy":  null,
                 "grossProfit":  10000000,
                 "grossProfitPercentage":  67,
                 "netProfit":  2000000,
                 "netProfitPercentage":  13
             },
    "auditId":  null,
    "warnings":  [

                 ]
}
```

---

## [PASS] Public Submission (token reuse rejected)

**Status:** PASS

**Detail:** Token correctly rejected on reuse (HTTP 400)


---

## [PASS] Validation: Negative Sales

**Status:** PASS

**Detail:** Rejected (HTTP 400): 


---

## [PASS] Validation: Negative Expenses

**Status:** PASS

**Detail:** Rejected (HTTP 400): 


---

## [PASS] Validation: Missing CompanyId

**Status:** PASS

**Detail:** Rejected (HTTP 400): 


---

## [PASS] Validation: Invalid Token

**Status:** PASS

**Detail:** Rejected (HTTP 400): 


---

## [PASS] Validation: Duplicate Month

**Status:** PASS

**Detail:** Rejected (HTTP 400): 


---

## [PASS] Delete Financial Indicator

**Status:** PASS

**Detail:** Record 3433 deleted

```json
{
    "success":  true,
    "message":  "Financial indicator deleted",
    "data":  null,
    "auditId":  null,
    "warnings":  [

                 ]
}
```

---

## [PASS] Verify Deletion

**Status:** PASS

**Detail:** Record 3433 confirmed deleted (HTTP 400)


---

## Summary

| Result | Count |
|--------|-------|
| PASS | 16 |
| FAIL | 0 |
| SKIP | 0 |
| **Total** | **16** |

