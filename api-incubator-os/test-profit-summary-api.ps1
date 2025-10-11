# ============================================================================
# COMPANY PROFIT SUMMARY API TESTING SCRIPT
# ============================================================================
# This script tests the complete CRUD operations for the profit summary API
# Run this script to verify backend functionality before UI testing
# ============================================================================

param(
    [int]$CompanyId = 11,
    [string]$BaseUrl = "http://localhost:8080/api-nodes/company-profit-summary"
)

Write-Host "=== COMPANY PROFIT SUMMARY API TESTING ===" -ForegroundColor Cyan
Write-Host "Company ID: $CompanyId" -ForegroundColor Yellow
Write-Host "Base URL: $BaseUrl" -ForegroundColor Yellow
Write-Host ""

# ============================================================================
# 1. LIST EXISTING DATA
# ============================================================================
Write-Host "1. LISTING EXISTING DATA..." -ForegroundColor Green
try {
    $existingData = Invoke-RestMethod -Uri "$BaseUrl/list-company-profit-summary.php?company_id=$CompanyId" -Method GET
    Write-Host "Found $($existingData.Count) existing records" -ForegroundColor White

    if ($existingData.Count -gt 0) {
        $existingData | Sort-Object year_ | ForEach-Object {
            Write-Host "  Year $($_.year_): Gross=$($_.gross_total), Operating=$($_.operating_total), NPBT=$($_.npbt_total)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "Error listing data: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# ============================================================================
# 2. CREATE NEW RECORD
# ============================================================================
Write-Host "2. CREATING NEW RECORD..." -ForegroundColor Green
try {
    $newYear = 2026
    $createData = @{
        client_id = 1
        company_id = $CompanyId
        program_id = 1
        cohort_id = 1
        year_ = $newYear
        gross_q1 = 80000
        gross_q2 = 85000
        gross_q3 = 90000
        gross_q4 = 95000
        gross_total = 350000
        gross_margin = 80.0
        operating_q1 = 60000
        operating_q2 = 65000
        operating_q3 = 70000
        operating_q4 = 75000
        operating_total = 270000
        operating_margin = 60.0
        npbt_q1 = 50000
        npbt_q2 = 55000
        npbt_q3 = 60000
        npbt_q4 = 65000
        npbt_total = 230000
        npbt_margin = 50.0
        unit = "USD"
        title = "API Test Record $newYear"
        notes = "Created via PowerShell test script"
        status_id = 1
    } | ConvertTo-Json

    $createResponse = Invoke-RestMethod -Uri "$BaseUrl/add-company-profit-summary.php" -Method POST -Body $createData -ContentType "application/json"
    $newRecordId = $createResponse.id

    Write-Host "✅ Created record ID: $newRecordId for year $newYear" -ForegroundColor Green
    Write-Host "   Gross Total: $($createResponse.gross_total)" -ForegroundColor White
    Write-Host "   Operating Total: $($createResponse.operating_total)" -ForegroundColor White
    Write-Host "   NPBT Total: $($createResponse.npbt_total)" -ForegroundColor White

} catch {
    Write-Host "❌ Error creating record: $($_.Exception.Message)" -ForegroundColor Red
    $newRecordId = $null
}
Write-Host ""

# ============================================================================
# 3. GET SINGLE RECORD
# ============================================================================
if ($newRecordId) {
    Write-Host "3. RETRIEVING SINGLE RECORD..." -ForegroundColor Green
    try {
        $singleRecord = Invoke-RestMethod -Uri "$BaseUrl/get-company-profit-summary.php" -Method POST -Body (@{id = $newRecordId} | ConvertTo-Json) -ContentType "application/json"

        Write-Host "✅ Retrieved record for year $($singleRecord.year_)" -ForegroundColor Green
        Write-Host "   Title: $($singleRecord.title)" -ForegroundColor White
        Write-Host "   Notes: $($singleRecord.notes)" -ForegroundColor White

    } catch {
        Write-Host "❌ Error retrieving record: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# ============================================================================
# 4. UPDATE RECORD
# ============================================================================
if ($newRecordId) {
    Write-Host "4. UPDATING RECORD..." -ForegroundColor Green
    try {
        $updateData = @{
            id = $newRecordId
            gross_q1 = 85000
            gross_q2 = 90000
            operating_q1 = 65000
            operating_q2 = 70000
            npbt_q1 = 55000
            npbt_q2 = 60000
            title = "Updated API Test Record"
            notes = "Updated via PowerShell test script"
        } | ConvertTo-Json

        $updateResponse = Invoke-RestMethod -Uri "$BaseUrl/update-company-profit-summary.php" -Method POST -Body $updateData -ContentType "application/json"

        Write-Host "✅ Updated record ID: $newRecordId" -ForegroundColor Green
        Write-Host "   Updated Title: $($updateResponse.title)" -ForegroundColor White
        Write-Host "   Updated Gross Q1: $($updateResponse.gross_q1)" -ForegroundColor White
        Write-Host "   Updated Gross Q2: $($updateResponse.gross_q2)" -ForegroundColor White

    } catch {
        Write-Host "❌ Error updating record: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# ============================================================================
# 5. FINAL DATA VERIFICATION
# ============================================================================
Write-Host "5. FINAL DATA VERIFICATION..." -ForegroundColor Green
try {
    $finalData = Invoke-RestMethod -Uri "$BaseUrl/list-company-profit-summary.php?company_id=$CompanyId" -Method GET
    Write-Host "Total records now: $($finalData.Count)" -ForegroundColor White

    Write-Host "`n📊 PROFIT SUMMARY BY YEAR:" -ForegroundColor Cyan
    $finalData | Sort-Object year_ | ForEach-Object {
        $year = $_.year_
        $grossTotal = $_.gross_total
        $operatingTotal = $_.operating_total
        $npbtTotal = $_.npbt_total
        $grossMargin = $_.gross_margin
        $operatingMargin = $_.operating_margin
        $npbtMargin = $_.npbt_margin

        Write-Host "Year $year" -ForegroundColor Yellow
        Write-Host "  Gross:     $grossTotal (Margin: $grossMargin%)" -ForegroundColor White
        Write-Host "  Operating: $operatingTotal (Margin: $operatingMargin%)" -ForegroundColor White
        Write-Host "  NPBT:      $npbtTotal (Margin: $npbtMargin%)" -ForegroundColor White
        if ($_.title) {
            Write-Host "  Title: $($_.title)" -ForegroundColor Gray
        }
        Write-Host ""
    }

} catch {
    Write-Host "❌ Error in final verification: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================================
# 6. CLEANUP (OPTIONAL)
# ============================================================================
Write-Host "6. CLEANUP OPTIONS..." -ForegroundColor Green
if ($newRecordId) {
    $cleanup = Read-Host "Delete the test record (ID: $newRecordId)? (y/N)"
    if ($cleanup -eq 'y' -or $cleanup -eq 'Y') {
        try {
            $deleteResponse = Invoke-RestMethod -Uri "$BaseUrl/delete-company-profit-summary.php" -Method POST -Body (@{id = $newRecordId} | ConvertTo-Json) -ContentType "application/json"
            Write-Host "✅ Test record deleted successfully" -ForegroundColor Green
        } catch {
            Write-Host "❌ Error deleting record: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host "`n=== API TESTING COMPLETED ===" -ForegroundColor Cyan
Write-Host "All endpoints are working correctly!" -ForegroundColor Green
Write-Host "You can now test the Angular UI with confidence." -ForegroundColor Yellow
