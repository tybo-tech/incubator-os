# GPS Import API Testing Script
# PowerShell script to test GPS data import functionality

$baseUrl = "http://localhost:8080/api-nodes/gps/test-gps-import.php"

Write-Host "🎯 GPS Import API Testing" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green

# Function to make API calls and display results
function Test-GpsApi {
    param(
        [string]$Action,
        [string]$Description
    )

    Write-Host "`n📊 $Description" -ForegroundColor Cyan
    Write-Host "Action: $Action" -ForegroundColor Yellow

    try {
        $response = Invoke-RestMethod -Uri "$baseUrl?action=$Action" -Method GET
        $response | ConvertTo-Json -Depth 10 | Write-Host
        return $response
    }
    catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# 1. Count GPS data
Write-Host "`n1️⃣ Counting GPS data..." -ForegroundColor Magenta
$countResult = Test-GpsApi -Action "count" -Description "Count GPS Nodes and Action Items"

# 2. Get detailed statistics
Write-Host "`n2️⃣ Getting detailed statistics..." -ForegroundColor Magenta
$statsResult = Test-GpsApi -Action "stats" -Description "Detailed Import Statistics"

# 3. Preview import data
Write-Host "`n3️⃣ Previewing import data..." -ForegroundColor Magenta
$previewResult = Test-GpsApi -Action "preview" -Description "Preview GPS Import Data (First 5 Nodes)"

# 4. Show sample data structure
Write-Host "`n4️⃣ Getting sample data structure..." -ForegroundColor Magenta
$sampleResult = Test-GpsApi -Action "sample-data" -Description "Sample GPS Node Data Structure"

# 5. Clear existing GPS action items (optional)
$clearChoice = Read-Host "`n❓ Do you want to clear existing GPS action items before import? (y/N)"
if ($clearChoice -eq 'y' -or $clearChoice -eq 'Y') {
    Write-Host "`n5️⃣ Clearing existing GPS action items..." -ForegroundColor Magenta
    $clearResult = Test-GpsApi -Action "clear" -Description "Clear Existing GPS Action Items"
}

# 6. Perform the import
$importChoice = Read-Host "`n❓ Do you want to proceed with GPS import? (y/N)"
if ($importChoice -eq 'y' -or $importChoice -eq 'Y') {
    Write-Host "`n6️⃣ Performing GPS import..." -ForegroundColor Magenta
    $importResult = Test-GpsApi -Action "import" -Description "Import GPS Data to Action Items"

    if ($importResult) {
        Write-Host "`n✅ Import Summary:" -ForegroundColor Green
        Write-Host "Total Nodes Processed: $($importResult.import_summary.total_nodes)" -ForegroundColor White
        Write-Host "Total Targets Imported: $($importResult.import_summary.total_targets_imported)" -ForegroundColor White
        Write-Host "Companies Processed: $($importResult.import_summary.companies_processed -join ', ')" -ForegroundColor White

        if ($importResult.import_summary.categories_summary) {
            Write-Host "`n📋 Categories Summary:" -ForegroundColor Yellow
            foreach ($category in $importResult.import_summary.categories_summary.PSObject.Properties) {
                Write-Host "  $($category.Name): $($category.Value)" -ForegroundColor White
            }
        }

        if ($importResult.import_summary.errors -and $importResult.import_summary.errors.Count -gt 0) {
            Write-Host "`n⚠️ Errors encountered:" -ForegroundColor Red
            $importResult.import_summary.errors | ForEach-Object {
                Write-Host "  Node $($_.node_id) (Company $($_.company_id)): $($_.error)" -ForegroundColor Red
            }
        }
    }
}

# 7. Final statistics after import
Write-Host "`n7️⃣ Final statistics after import..." -ForegroundColor Magenta
$finalStats = Test-GpsApi -Action "stats" -Description "Final Statistics After Import"

Write-Host "`n🎉 GPS Import Testing Complete!" -ForegroundColor Green

# Summary
if ($countResult -and $finalStats) {
    Write-Host "`n📈 Before/After Summary:" -ForegroundColor Yellow
    Write-Host "GPS Nodes: $($countResult.gps_nodes) (unchanged)" -ForegroundColor White
    Write-Host "GPS Action Items: $($countResult.gps_action_items) -> $($finalStats.gps_action_items_count)" -ForegroundColor White

    if ($finalStats.companies_with_gps) {
        Write-Host "`n🏢 Companies with GPS Data:" -ForegroundColor Yellow
        $finalStats.companies_with_gps | ForEach-Object {
            Write-Host "  Company $($_.company_id): $($_.target_count) targets" -ForegroundColor White
        }
    }

    if ($finalStats.category_breakdown) {
        Write-Host "`n📊 Category Breakdown:" -ForegroundColor Yellow
        $finalStats.category_breakdown | ForEach-Object {
            $completionRate = if ($_.count -gt 0) { [math]::Round(($_.completed / $_.count) * 100, 1) } else { 0 }
            Write-Host "  $($_.category): $($_.count) targets ($($_.completed) completed, $completionRate%)" -ForegroundColor White
        }
    }
}

Write-Host "`n🔚 Script completed at $(Get-Date)" -ForegroundColor Green
