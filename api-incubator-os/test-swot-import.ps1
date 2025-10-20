# SWOT Analysis Import Testing Script
# This script tests the complete SWOT import workflow

$baseUrl = "http://localhost:8080"
$swotTestUrl = "$baseUrl/api-nodes/swot/test-swot-import.php"
$swotVerifyUrl = "$baseUrl/api-nodes/swot/verify-swot-action-items.php"

Write-Host "🎯 SWOT Analysis Import Testing Started" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

# Step 1: Count current SWOT data
Write-Host "`n1. Counting current SWOT data..." -ForegroundColor Cyan
try {
    $countResult = Invoke-RestMethod -Uri "$swotTestUrl?action=count" -Method GET
    Write-Host "✅ Count Results:" -ForegroundColor Green
    Write-Host "   - SWOT Nodes: $($countResult.data.swot_nodes)" -ForegroundColor Yellow
    Write-Host "   - SWOT Action Items: $($countResult.data.swot_action_items)" -ForegroundColor Yellow
} catch {
    Write-Host "❌ Error counting SWOT data: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Get sample SWOT data structure
Write-Host "`n2. Getting SWOT sample data..." -ForegroundColor Cyan
try {
    $sampleResult = Invoke-RestMethod -Uri "$swotTestUrl?action=sample-data" -Method GET
    Write-Host "✅ Sample Data Results:" -ForegroundColor Green
    Write-Host "   - Total SWOT Nodes Available: $($sampleResult.data.total_nodes)" -ForegroundColor Yellow

    if ($sampleResult.data.sample_node) {
        $sampleNode = $sampleResult.data.sample_node
        Write-Host "   - Sample Node ID: $($sampleNode.id)" -ForegroundColor Yellow
        Write-Host "   - Company ID: $($sampleNode.company_id)" -ForegroundColor Yellow

        # Show SWOT structure info
        $structure = $sampleResult.data.structure_info
        Write-Host "   - SWOT Structure:" -ForegroundColor Yellow
        Write-Host "     * Internal: $($structure.categories.internal -join ', ')" -ForegroundColor Gray
        Write-Host "     * External: $($structure.categories.external -join ', ')" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Error getting sample data: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 3: Preview SWOT import
Write-Host "`n3. Previewing SWOT import..." -ForegroundColor Cyan
try {
    $previewResult = Invoke-RestMethod -Uri "$swotTestUrl?action=preview&limit=2" -Method GET
    Write-Host "✅ Preview Results:" -ForegroundColor Green
    Write-Host "   - Total Nodes to Process: $($previewResult.data.total_nodes)" -ForegroundColor Yellow

    foreach ($node in $previewResult.data.preview_nodes) {
        Write-Host "   - Node $($node.node_id) (Company $($node.company_id)): $($node.items_count) items" -ForegroundColor Yellow

        # Show sample items
        if ($node.sample_items -and $node.sample_items.Count -gt 0) {
            Write-Host "     Sample items:" -ForegroundColor Gray
            for ($i = 0; $i -lt [Math]::Min(3, $node.sample_items.Count); $i++) {
                $item = $node.sample_items[$i]
                Write-Host "     * [$($item.category)] $($item.description)" -ForegroundColor Gray
            }
        }
    }
} catch {
    Write-Host "❌ Error previewing import: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 4: Get current statistics
Write-Host "`n4. Getting current SWOT statistics..." -ForegroundColor Cyan
try {
    $statsResult = Invoke-RestMethod -Uri "$swotTestUrl?action=stats" -Method GET
    Write-Host "✅ Current Statistics:" -ForegroundColor Green
    Write-Host "   - SWOT Nodes: $($statsResult.data.swot_nodes_count)" -ForegroundColor Yellow
    Write-Host "   - SWOT Action Items: $($statsResult.data.swot_action_items_count)" -ForegroundColor Yellow

    if ($statsResult.data.companies_with_swot) {
        Write-Host "   - Companies with SWOT:" -ForegroundColor Yellow
        foreach ($company in $statsResult.data.companies_with_swot) {
            Write-Host "     * Company $($company.company_id): $($company.item_count) items" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "❌ Error getting statistics: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 5: Ask user to proceed with import
Write-Host "`n⚠️  Ready to proceed with SWOT import?" -ForegroundColor Yellow
$proceed = Read-Host "Type 'yes' to continue with import, or 'skip' to skip import"

if ($proceed -eq "yes") {
    # Step 6: Clear existing SWOT data (optional)
    Write-Host "`n5. Clearing existing SWOT action items..." -ForegroundColor Cyan
    try {
        $clearResult = Invoke-RestMethod -Uri "$swotTestUrl?action=clear" -Method GET
        Write-Host "✅ Cleared $($clearResult.data.deleted_count) existing SWOT action items" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error clearing data: $($_.Exception.Message)" -ForegroundColor Red
    }

    # Step 7: Perform SWOT import
    Write-Host "`n6. Performing SWOT import..." -ForegroundColor Cyan
    try {
        $importResult = Invoke-RestMethod -Uri "$swotTestUrl?action=import" -Method GET
        Write-Host "✅ Import Completed Successfully!" -ForegroundColor Green

        $summary = $importResult.data.import_summary
        Write-Host "`n📊 Import Summary:" -ForegroundColor Green
        Write-Host "   - Nodes Processed: $($summary.total_nodes)" -ForegroundColor Yellow
        Write-Host "   - Items Imported: $($summary.total_items_imported)" -ForegroundColor Yellow
        Write-Host "   - Companies Processed: $($summary.companies_processed.Count)" -ForegroundColor Yellow
        Write-Host "   - Errors: $($summary.errors.Count)" -ForegroundColor Yellow

        # Show category breakdown
        if ($summary.categories_summary) {
            Write-Host "`n📈 Categories Imported:" -ForegroundColor Green
            $summary.categories_summary.PSObject.Properties | ForEach-Object {
                Write-Host "   - $($_.Name): $($_.Value)" -ForegroundColor Yellow
            }
        }

        # Show impact breakdown
        if ($summary.impact_summary) {
            Write-Host "`n🎯 Impact Levels:" -ForegroundColor Green
            $summary.impact_summary.PSObject.Properties | ForEach-Object {
                Write-Host "   - $($_.Name): $($_.Value)" -ForegroundColor Yellow
            }
        }

        # Show any errors
        if ($summary.errors -and $summary.errors.Count -gt 0) {
            Write-Host "`n❌ Import Errors:" -ForegroundColor Red
            foreach ($error in $summary.errors) {
                Write-Host "   - Node $($error.node_id) (Company $($error.company_id)): $($error.error)" -ForegroundColor Red
            }
        }

    } catch {
        Write-Host "❌ Error during import: $($_.Exception.Message)" -ForegroundColor Red
    }

    # Step 8: Verify imported data
    Write-Host "`n7. Verifying imported SWOT data..." -ForegroundColor Cyan
    try {
        $verifyResult = Invoke-RestMethod -Uri "$swotVerifyUrl" -Method GET
        Write-Host "✅ Verification Results:" -ForegroundColor Green

        $totals = $verifyResult.data.summary.totals
        Write-Host "   - Total Items: $($totals.total_items)" -ForegroundColor Yellow
        Write-Host "   - Companies: $($totals.companies_count)" -ForegroundColor Yellow
        Write-Host "   - Completed Items: $($totals.completed_count)" -ForegroundColor Yellow
        Write-Host "   - Average Progress: $([Math]::Round($totals.avg_progress, 2))%" -ForegroundColor Yellow

        # Show category breakdown
        Write-Host "`n📊 By Category:" -ForegroundColor Green
        foreach ($category in $verifyResult.data.summary.by_category) {
            Write-Host "   - $($category.category): $($category.category_count) items" -ForegroundColor Yellow
        }

    } catch {
        Write-Host "❌ Error verifying data: $($_.Exception.Message)" -ForegroundColor Red
    }

    # Step 9: Test company-specific data
    if ($importResult.data.import_summary.companies_processed.Count -gt 0) {
        $testCompanyId = $importResult.data.import_summary.companies_processed[0]
        Write-Host "`n8. Testing company-specific data (Company $testCompanyId)..." -ForegroundColor Cyan
        try {
            $companyResult = Invoke-RestMethod -Uri "$swotVerifyUrl?company_id=$testCompanyId&limit=5" -Method GET
            Write-Host "✅ Company $testCompanyId Results:" -ForegroundColor Green
            Write-Host "   - Items for this company: $($companyResult.data.summary.totals.total_items)" -ForegroundColor Yellow

            if ($companyResult.data.action_items.Count -gt 0) {
                Write-Host "   - Sample items:" -ForegroundColor Yellow
                for ($i = 0; $i -lt [Math]::Min(3, $companyResult.data.action_items.Count); $i++) {
                    $item = $companyResult.data.action_items[$i]
                    Write-Host "     * [$($item.category)] $($item.description) - Status: $($item.status)" -ForegroundColor Gray
                }
            }
        } catch {
            Write-Host "❌ Error getting company data: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "`n⏭️  Skipping SWOT import as requested" -ForegroundColor Yellow
}

Write-Host "`n🎉 SWOT Analysis Import Testing Completed!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# Final status summary
Write-Host "`n📋 Final Status:" -ForegroundColor Cyan
try {
    $finalStats = Invoke-RestMethod -Uri "$swotTestUrl?action=count" -Method GET
    Write-Host "✅ Final Counts:" -ForegroundColor Green
    Write-Host "   - SWOT Nodes: $($finalStats.data.swot_nodes)" -ForegroundColor Yellow
    Write-Host "   - SWOT Action Items: $($finalStats.data.swot_action_items)" -ForegroundColor Yellow
} catch {
    Write-Host "❌ Error getting final counts" -ForegroundColor Red
}
