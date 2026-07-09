# Financial Indicators - Full Endpoint Test Suite
# Tests all 9 endpoints with browser-like headers and saves results to markdown

param(
    [string]$BaseUrl = "http://localhost:8080",
    [int]$CompanyId = 11,
    [int]$FinancialYear = 2026,
    [int]$TestMonth = 12
)

$fiBase = "$BaseUrl/api/financial-indicators"
$resultsFile = "FinancialIndicators-TestResults.md"
$createdId = $null
$createdToken = $null
$testResults = @()

function New-Session {
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $session.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"
    return $session
}

function Invoke-Api {
    param([string]$Method, [string]$Uri, [object]$Body = $null)
    $session = New-Session
    $headers = @{
        "Accept" = "application/json, text/plain, */*"
        "Accept-Encoding" = "gzip, deflate, br, zstd"
        "Accept-Language" = "en-US,en;q=0.9"
        "Origin" = "http://localhost:4200"
        "Referer" = "http://localhost:4200/"
        "Sec-Fetch-Dest" = "empty"
        "Sec-Fetch-Mode" = "cors"
        "Sec-Fetch-Site" = "same-site"
        "sec-ch-ua" = '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"'
        "sec-ch-ua-mobile" = "?0"
        "sec-ch-ua-platform" = '"Windows"'
    }
    $params = @{
        UseBasicParsing = $true
        Uri = $Uri
        Method = $Method
        WebSession = $session
        Headers = $headers
    }
    if ($Body) {
        $params["Body"] = ($Body | ConvertTo-Json -Depth 10)
        $params["ContentType"] = "application/json"
    }
    try {
        $response = Invoke-WebRequest @params
        $statusCode = [int]$response.StatusCode
        $rawContent = $response.Content
        $content = $rawContent | ConvertFrom-Json
        return @{ StatusCode = $statusCode; Content = $content; RawContent = $rawContent }
    } catch {
        $statusCode = [int]$_.Exception.Response.StatusCode
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $rawContent = $reader.ReadToEnd()
        $content = $rawContent | ConvertFrom-Json
        return @{ StatusCode = $statusCode; Content = $content; RawContent = $rawContent; Error = $_.Exception.Message }
    }
}

function Write-Result {
    param([string]$TestName, [string]$Status, [string]$Detail, [object]$ResponseData = $null)
    $script:testResults += @{
        TestName = $TestName
        Status = $Status
        Detail = $Detail
        ResponseData = $ResponseData
    }
    $icon = if ($Status -eq "PASS") { "[PASS]" } elseif ($Status -eq "FAIL") { "[FAIL]" } else { "[SKIP]" }
    Write-Host "  $icon $TestName" -ForegroundColor $(if ($Status -eq "PASS") { "Green" } elseif ($Status -eq "FAIL") { "Red" } else { "Yellow" })
    if ($Detail) { Write-Host "       $Detail" -ForegroundColor Gray }
}

function Save-Results {
    $lines = @()
    $lines += "# Financial Indicators - Endpoint Test Results"
    $lines += ""
    $lines += "**Date:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    $lines += ""
    $lines += "**Base URL:** $BaseUrl"
    $lines += "**Company ID:** $CompanyId"
    $lines += "**Financial Year:** $FinancialYear"
    $lines += "**Test Month:** $TestMonth"
    $lines += ""
    $lines += "---"
    $lines += ""

    $passed = 0
    $failed = 0
    $skipped = 0

    foreach ($r in $script:testResults) {
        $icon = if ($r.Status -eq "PASS") { "[PASS]" } elseif ($r.Status -eq "FAIL") { "[FAIL]" } else { "[SKIP]" }
        $lines += "## $icon $($r.TestName)"
        $lines += ""
        $lines += "**Status:** $($r.Status)"
        $lines += ""
        $lines += "**Detail:** $($r.Detail)"
        $lines += ""
        if ($r.ResponseData) {
            $lines += '```json'
            $lines += ($r.ResponseData | ConvertTo-Json -Depth 10)
            $lines += '```'
        }
        $lines += ""
        $lines += "---"
        $lines += ""

        if ($r.Status -eq "PASS") { $passed++ }
        elseif ($r.Status -eq "FAIL") { $failed++ }
        else { $skipped++ }
    }

    $lines += "## Summary"
    $lines += ""
    $lines += "| Result | Count |"
    $lines += "|--------|-------|"
    $lines += "| PASS | $passed |"
    $lines += "| FAIL | $failed |"
    $lines += "| SKIP | $skipped |"
    $lines += "| **Total** | **$($script:testResults.Count)** |"
    $lines += ""

    $lines -join "`n" | Out-File -FilePath $resultsFile -Encoding utf8
    Write-Host "`nResults saved to: $resultsFile" -ForegroundColor Cyan
}

# =============================================================================
# TEST EXECUTION
# =============================================================================
Write-Host '=== FINANCIAL INDICATORS - FULL ENDPOINT TEST SUITE ===' -ForegroundColor Cyan
Write-Host ''

# ── 1. CREATE ──────────────────────────────────────────────────────────────────
Write-Host '1. CREATE (POST /commands/create.php)' -ForegroundColor Yellow

$createBody = @{
    companyId = $CompanyId
    data = @{
        meta = @{
            financial_year = $FinancialYear
            month = $TestMonth
            currency = "ZAR"
            report_type = "Monthly Management Accounts"
        }
        income_statement = @{
            sales = 28875133
            cost_of_sales = 5035297
            operating_expenses = 22807572
        }
        balance_sheet = @{
            cash = 0
            cash_equivalents = 101377
            short_term_investments = 2093103
            current_receivables = 1708843
            total_current_assets = 1810220
            total_assets = 17090860
            total_current_liabilities = 3546308
            total_liabilities = 11218670
            total_equity = 5872190
        }
    }
}

$resp = Invoke-Api -Method Post -Uri "$fiBase/commands/create.php" -Body $createBody

if ($resp.StatusCode -eq 201 -and $resp.Content.success) {
    $createdId = $resp.Content.data.id
    $detail = "Record $createdId created (HTTP $($resp.StatusCode))"
    Write-Result -TestName "Create Financial Indicators" -Status "PASS" -Detail $detail -ResponseData $resp.Content
} else {
    $detail = "HTTP $($resp.StatusCode): $($resp.Content.error)"
    Write-Result -TestName "Create Financial Indicators" -Status "FAIL" -Detail $detail -ResponseData $resp.Content
}

Write-Host ''

# ── 2. VIEW (GET) ──────────────────────────────────────────────────────────────
Write-Host '2. VIEW (GET /queries/get.php)' -ForegroundColor Yellow

if ($createdId) {
    $resp = Invoke-Api -Method Get -Uri "$fiBase/queries/get.php?id=$createdId"

    if ($resp.StatusCode -eq 200 -and $resp.Content.id -eq $createdId) {
        $expectedGP = 28875133 - 5035297
        $expectedNP = $expectedGP - 22807572
        $calcOk = ($resp.Content.grossProfit -eq $expectedGP -and $resp.Content.netProfit -eq $expectedNP)
        $detail = "GP=$($resp.Content.grossProfit) NP=$($resp.Content.netProfit) GP%=$($resp.Content.grossProfitPercentage) NP%=$($resp.Content.netProfitPercentage)"
        if ($calcOk) {
            Write-Result -TestName "View Financial Indicator" -Status "PASS" -Detail "$detail (calculations verified)" -ResponseData $resp.Content
        } else {
            Write-Result -TestName "View Financial Indicator" -Status "FAIL" -Detail "$detail (calculations INCORRECT)" -ResponseData $resp.Content
        }
    } else {
        $detail = "HTTP $($resp.StatusCode): $($resp.Content.error)"
        Write-Result -TestName "View Financial Indicator" -Status "FAIL" -Detail $detail -ResponseData $resp.Content
    }
} else {
    Write-Result -TestName "View Financial Indicator" -Status "SKIP" -Detail "No record created"
}

Write-Host ''

# ── 3. UPDATE ──────────────────────────────────────────────────────────────────
Write-Host '3. UPDATE (POST /commands/update.php)' -ForegroundColor Yellow

if ($createdId) {
    $updateBody = @{
        data = @{
            meta = @{
                financial_year = $FinancialYear
                month = $TestMonth
                currency = "ZAR"
                report_type = "Monthly Management Accounts"
            }
            income_statement = @{
                sales = 35000000
                cost_of_sales = 5000000
                operating_expenses = 22000000
            }
            balance_sheet = @{
                cash = 100000
                cash_equivalents = 200000
                short_term_investments = 3000000
                current_receivables = 2000000
                total_current_assets = 2000000
                total_assets = 18000000
                total_current_liabilities = 4000000
                total_liabilities = 12000000
                total_equity = 6000000
            }
        }
    }

    $resp = Invoke-Api -Method Post -Uri "$fiBase/commands/update.php?id=$createdId" -Body $updateBody

    if ($resp.StatusCode -eq 200 -and $resp.Content.success) {
        $expectedGP2 = 35000000 - 5000000
        $expectedNP2 = $expectedGP2 - 22000000
        $calcOk = ($resp.Content.data.grossProfit -eq $expectedGP2 -and $resp.Content.data.netProfit -eq $expectedNP2)
        $detail = "GP=$($resp.Content.data.grossProfit) NP=$($resp.Content.data.netProfit)"
        if ($calcOk) {
            Write-Result -TestName "Update Financial Indicator" -Status "PASS" -Detail "$detail (calculations re-verified)" -ResponseData $resp.Content
        } else {
            Write-Result -TestName "Update Financial Indicator" -Status "FAIL" -Detail "$detail (calculations INCORRECT after update)" -ResponseData $resp.Content
        }
    } else {
        $detail = "HTTP $($resp.StatusCode): $($resp.Content.error)"
        Write-Result -TestName "Update Financial Indicator" -Status "FAIL" -Detail $detail -ResponseData $resp.Content
    }
} else {
    Write-Result -TestName "Update Financial Indicator" -Status "SKIP" -Detail "No record created"
}

Write-Host ''

# ── 4. LIST BY COMPANY ─────────────────────────────────────────────────────────
Write-Host '4. LIST (GET /queries/list-by-company.php)' -ForegroundColor Yellow

$resp = Invoke-Api -Method Get -Uri "$fiBase/queries/list-by-company.php?companyId=$CompanyId"

if ($resp.StatusCode -eq 200) {
    $count = @($resp.Content).Count
    if ($count -gt 0) {
        $firstDate = $resp.Content[0].createdAt
        $lastDate = $resp.Content[-1].createdAt
        $ordered = ($firstDate -ge $lastDate)
        $detail = "$count records found, newest-first: $ordered"
        if ($ordered) {
            Write-Result -TestName "List Company Records" -Status "PASS" -Detail $detail -ResponseData $resp.Content
        } else {
            Write-Result -TestName "List Company Records" -Status "WARN" -Detail "$detail (order may not be newest-first)" -ResponseData $resp.Content
        }
    } else {
        Write-Result -TestName "List Company Records" -Status "WARN" -Detail "No records found" -ResponseData $resp.Content
    }
} else {
    $detail = "HTTP $($resp.StatusCode): $($resp.Content.error)"
    Write-Result -TestName "List Company Records" -Status "FAIL" -Detail $detail -ResponseData $resp.Content
}

Write-Host ''

# ── 5. ANNUAL REPORT ───────────────────────────────────────────────────────────
Write-Host '5. ANNUAL REPORT (GET /queries/annual.php)' -ForegroundColor Yellow

$resp = Invoke-Api -Method Get -Uri "$fiBase/queries/annual.php?companyId=$CompanyId&year=$FinancialYear"

if ($resp.StatusCode -eq 200) {
    $rawJson = $resp.RawContent
    $expectedOrder = @("March","April","May","June","July","August","September","October","November","December","January","February")
    $monthNames = @()
    foreach ($m in $expectedOrder) {
        if ($rawJson -match ('"' + $m + '":')) { $monthNames += $m }
    }

    if ($monthNames.Count -eq 12) {
        $orderCorrect = $true
        for ($i = 0; $i -lt 12; $i++) {
            if ($monthNames[$i] -ne $expectedOrder[$i]) { $orderCorrect = $false }
        }
        if ($orderCorrect) {
            Write-Result -TestName "Annual Report Structure" -Status "PASS" -Detail "12 months, March to February order correct" -ResponseData $resp.Content
        } else {
            Write-Result -TestName "Annual Report Structure" -Status "FAIL" -Detail "Month order incorrect" -ResponseData $resp.Content
        }
    } else {
        Write-Result -TestName "Annual Report Structure" -Status "FAIL" -Detail "Expected 12 months, got $($monthNames.Count)" -ResponseData $resp.Content
    }
} else {
    $detail = "HTTP $($resp.StatusCode): $($resp.Content.error)"
    Write-Result -TestName "Annual Report Structure" -Status "FAIL" -Detail $detail -ResponseData $resp.Content
}

Write-Host ''

# ── 6. SUMMARY ─────────────────────────────────────────────────────────────────
Write-Host '6. SUMMARY (GET /queries/summary.php)' -ForegroundColor Yellow

$resp = Invoke-Api -Method Get -Uri "$fiBase/queries/summary.php?companyId=$CompanyId"

if ($resp.StatusCode -eq 200) {
    $detail = "Month=$($resp.Content.latestMonth) FY=$($resp.Content.latestFinancialYear) GP=$($resp.Content.latestGrossProfit) NP=$($resp.Content.latestNetProfit) Sales=$($resp.Content.latestSales) GM=$($resp.Content.grossMargin)% NM=$($resp.Content.netMargin)%"
    Write-Result -TestName "Company Summary" -Status "PASS" -Detail $detail -ResponseData $resp.Content
} else {
    $detail = "HTTP $($resp.StatusCode): $($resp.Content.error)"
    Write-Result -TestName "Company Summary" -Status "FAIL" -Detail $detail -ResponseData $resp.Content
}

Write-Host ''

# ── 7. REQUEST LINK ────────────────────────────────────────────────────────────
Write-Host '7. REQUEST LINK (POST /commands/request-link.php)' -ForegroundColor Yellow

$linkBody = @{
    companyId = $CompanyId
    financialYear = $FinancialYear
    month = 6
}

$resp = Invoke-Api -Method Post -Uri "$fiBase/commands/request-link.php" -Body $linkBody

if ($resp.StatusCode -eq 200 -and $resp.Content.success) {
    $createdToken = $resp.Content.data.token
    $detail = "Token=$createdToken Expires=$($resp.Content.data.expiresAt)"
    Write-Result -TestName "Generate Submission Link" -Status "PASS" -Detail $detail -ResponseData $resp.Content
} else {
    $detail = "HTTP $($resp.StatusCode): $($resp.Content.error)"
    Write-Result -TestName "Generate Submission Link" -Status "FAIL" -Detail $detail -ResponseData $resp.Content
}

Write-Host ''

# ── 8. PUBLIC SUBMISSION ──────────────────────────────────────────────────────
Write-Host '8. PUBLIC SUBMISSION (POST /public/submit.php)' -ForegroundColor Yellow

if ($createdToken) {
    $publicBody = @{
        token = $createdToken
        data = @{
            meta = @{
                financial_year = $FinancialYear
                month = 6
                currency = "ZAR"
                report_type = "Monthly Management Accounts"
            }
            income_statement = @{
                sales = 15000000
                cost_of_sales = 5000000
                operating_expenses = 8000000
            }
            balance_sheet = @{
                cash = 50000
                cash_equivalents = 100000
                short_term_investments = 1000000
                current_receivables = 500000
                total_current_assets = 600000
                total_assets = 5000000
                total_current_liabilities = 1000000
                total_liabilities = 3000000
                total_equity = 2000000
            }
        }
    }

    $resp = Invoke-Api -Method Post -Uri "$BaseUrl/api/financial-indicators/public/submit.php" -Body $publicBody

    if ($resp.StatusCode -eq 200 -and $resp.Content.success) {
        Write-Result -TestName "Public Submission (first use)" -Status "PASS" -Detail "Submission accepted via token" -ResponseData $resp.Content
    } else {
        $detail = "HTTP $($resp.StatusCode): $($resp.Content.error)"
        Write-Result -TestName "Public Submission (first use)" -Status "FAIL" -Detail $detail -ResponseData $resp.Content
    }

    # Verify token single-use
    $resp2 = Invoke-Api -Method Post -Uri "$BaseUrl/api/financial-indicators/public/submit.php" -Body $publicBody
    if ($resp2.StatusCode -ge 400) {
        $detail = "Token correctly rejected on reuse (HTTP $($resp2.StatusCode))"
        Write-Result -TestName "Public Submission (token reuse rejected)" -Status "PASS" -Detail $detail -ResponseData $resp2.Content
    } else {
        $detail = "Token was reusable (HTTP $($resp2.StatusCode))"
        Write-Result -TestName "Public Submission (token reuse rejected)" -Status "FAIL" -Detail $detail -ResponseData $resp2.Content
    }
} else {
    Write-Result -TestName "Public Submission" -Status "SKIP" -Detail "No token generated"
}

Write-Host ''

# ── 9. VALIDATION TESTS ──────────────────────────────────────────────────────
Write-Host '9. VALIDATION TESTS' -ForegroundColor Yellow

# 9a. Negative sales
$negBody = @{
    companyId = $CompanyId
    data = @{
        meta = @{ financial_year = $FinancialYear; month = 7; currency = "ZAR"; report_type = "Test" }
        income_statement = @{ sales = -100; cost_of_sales = 0; operating_expenses = 0 }
        balance_sheet = @{ cash = 0; cash_equivalents = 0; short_term_investments = 0; current_receivables = 0; total_current_assets = 0; total_assets = 0; total_current_liabilities = 0; total_liabilities = 0; total_equity = 0 }
    }
}
$resp = Invoke-Api -Method Post -Uri "$fiBase/commands/create.php" -Body $negBody
if ($resp.StatusCode -ge 400) {
    $detail = "Rejected (HTTP $($resp.StatusCode)): $($resp.Content.error)"
    Write-Result -TestName "Validation: Negative Sales" -Status "PASS" -Detail $detail -ResponseData $resp.Content
} else {
    $detail = "Accepted (HTTP $($resp.StatusCode))"
    Write-Result -TestName "Validation: Negative Sales" -Status "FAIL" -Detail $detail -ResponseData $resp.Content
}

# 9b. Negative expenses
$negExpBody = @{
    companyId = $CompanyId
    data = @{
        meta = @{ financial_year = $FinancialYear; month = 8; currency = "ZAR"; report_type = "Test" }
        income_statement = @{ sales = 1000; cost_of_sales = 0; operating_expenses = -50 }
        balance_sheet = @{ cash = 0; cash_equivalents = 0; short_term_investments = 0; current_receivables = 0; total_current_assets = 0; total_assets = 0; total_current_liabilities = 0; total_liabilities = 0; total_equity = 0 }
    }
}
$resp = Invoke-Api -Method Post -Uri "$fiBase/commands/create.php" -Body $negExpBody
if ($resp.StatusCode -ge 400) {
    $detail = "Rejected (HTTP $($resp.StatusCode)): $($resp.Content.error)"
    Write-Result -TestName "Validation: Negative Expenses" -Status "PASS" -Detail $detail -ResponseData $resp.Content
} else {
    $detail = "Accepted (HTTP $($resp.StatusCode))"
    Write-Result -TestName "Validation: Negative Expenses" -Status "FAIL" -Detail $detail -ResponseData $resp.Content
}

# 9c. Missing companyId
$noCompanyBody = @{
    data = @{
        meta = @{ financial_year = $FinancialYear; month = 9; currency = "ZAR"; report_type = "Test" }
        income_statement = @{ sales = 1000; cost_of_sales = 0; operating_expenses = 0 }
        balance_sheet = @{ cash = 0; cash_equivalents = 0; short_term_investments = 0; current_receivables = 0; total_current_assets = 0; total_assets = 0; total_current_liabilities = 0; total_liabilities = 0; total_equity = 0 }
    }
}
$resp = Invoke-Api -Method Post -Uri "$fiBase/commands/create.php" -Body $noCompanyBody
if ($resp.StatusCode -ge 400) {
    $detail = "Rejected (HTTP $($resp.StatusCode)): $($resp.Content.error)"
    Write-Result -TestName "Validation: Missing CompanyId" -Status "PASS" -Detail $detail -ResponseData $resp.Content
} else {
    $detail = "Accepted (HTTP $($resp.StatusCode))"
    Write-Result -TestName "Validation: Missing CompanyId" -Status "FAIL" -Detail $detail -ResponseData $resp.Content
}

# 9d. Invalid token
$badTokenBody = @{
    token = "invalid-token-12345"
    data = @{
        meta = @{ financial_year = $FinancialYear; month = 10; currency = "ZAR"; report_type = "Test" }
        income_statement = @{ sales = 1000; cost_of_sales = 0; operating_expenses = 0 }
        balance_sheet = @{ cash = 0; cash_equivalents = 0; short_term_investments = 0; current_receivables = 0; total_current_assets = 0; total_assets = 0; total_current_liabilities = 0; total_liabilities = 0; total_equity = 0 }
    }
}
$resp = Invoke-Api -Method Post -Uri "$BaseUrl/api/financial-indicators/public/submit.php" -Body $badTokenBody
if ($resp.StatusCode -ge 400) {
    $detail = "Rejected (HTTP $($resp.StatusCode)): $($resp.Content.error)"
    Write-Result -TestName "Validation: Invalid Token" -Status "PASS" -Detail $detail -ResponseData $resp.Content
} else {
    $detail = "Accepted (HTTP $($resp.StatusCode))"
    Write-Result -TestName "Validation: Invalid Token" -Status "FAIL" -Detail $detail -ResponseData $resp.Content
}

# 9e. Duplicate month (re-create same month as test record)
if ($createdId) {
    $dupBody = @{
        companyId = $CompanyId
        data = @{
            meta = @{ financial_year = $FinancialYear; month = $TestMonth; currency = "ZAR"; report_type = "Duplicate Test" }
            income_statement = @{ sales = 5000; cost_of_sales = 1000; operating_expenses = 2000 }
            balance_sheet = @{ cash = 0; cash_equivalents = 0; short_term_investments = 0; current_receivables = 0; total_current_assets = 0; total_assets = 0; total_current_liabilities = 0; total_liabilities = 0; total_equity = 0 }
        }
    }
    $resp = Invoke-Api -Method Post -Uri "$fiBase/commands/create.php" -Body $dupBody
    if ($resp.StatusCode -ge 400) {
        $detail = "Rejected (HTTP $($resp.StatusCode)): $($resp.Content.error)"
        Write-Result -TestName "Validation: Duplicate Month" -Status "PASS" -Detail $detail -ResponseData $resp.Content
    } else {
        $detail = "Accepted (HTTP $($resp.StatusCode))"
        Write-Result -TestName "Validation: Duplicate Month" -Status "FAIL" -Detail $detail -ResponseData $resp.Content
    }
} else {
    Write-Result -TestName "Validation: Duplicate Month" -Status "SKIP" -Detail "No original record to test against"
}

Write-Host ''

# ── 10. DELETE ─────────────────────────────────────────────────────────────────
Write-Host '10. DELETE (POST /commands/delete.php)' -ForegroundColor Yellow

if ($createdId) {
    $resp = Invoke-Api -Method Post -Uri "$fiBase/commands/delete.php?id=$createdId"
    if ($resp.StatusCode -eq 200 -and $resp.Content.success) {
        $detail = "Record $createdId deleted"
        Write-Result -TestName "Delete Financial Indicator" -Status "PASS" -Detail $detail -ResponseData $resp.Content
    } else {
        $detail = "HTTP $($resp.StatusCode): $($resp.Content.error)"
        Write-Result -TestName "Delete Financial Indicator" -Status "FAIL" -Detail $detail -ResponseData $resp.Content
    }

    # Verify deletion
    $resp = Invoke-Api -Method Get -Uri "$fiBase/queries/get.php?id=$createdId"
    if ($resp.StatusCode -ge 400) {
        $detail = "Record $createdId confirmed deleted (HTTP $($resp.StatusCode))"
        Write-Result -TestName "Verify Deletion" -Status "PASS" -Detail $detail -ResponseData $resp.Content
    } else {
        Write-Result -TestName "Verify Deletion" -Status "FAIL" -Detail "Record still exists after delete" -ResponseData $resp.Content
    }
} else {
    Write-Result -TestName "Delete Financial Indicator" -Status "SKIP" -Detail "No record created"
}

Write-Host ''

# ── SAVE RESULTS ───────────────────────────────────────────────────────────────
Save-Results

Write-Host '=== FINANCIAL INDICATORS TEST SUITE COMPLETE ===' -ForegroundColor Cyan
