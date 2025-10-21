# Action Items CRUD Testing Script
# Complete testing of ActionItems API endpoints

Write-Host "=== ACTION ITEMS CRUD TESTING ===" -ForegroundColor Cyan

# Base configuration
$baseUrl = "http://localhost:8080/api-nodes/action-items"
$companyId = 11
$testContextType = "swot"

# Test data
$createData = @{
    company_id = $companyId
    context_type = $testContextType
    category = "Strengths"
    description = "Test action item created via PowerShell API"
    status = "pending"
    priority = "medium"
    progress = 0
    notes = "Created for CRUD testing"
}

Write-Host "`n1. CREATE (POST) - Adding new action item..." -ForegroundColor Yellow
try {
    $createBody = $createData | ConvertTo-Json
    $createResponse = Invoke-RestMethod -Uri "$baseUrl/add-action-item.php" -Method POST -Body $createBody -ContentType "application/json"
    Write-Host "✅ CREATE Success - Item ID: $($createResponse.id)" -ForegroundColor Green
    $testItemId = $createResponse.id
    $createResponse | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ CREATE Failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n2. READ (GET) - Retrieving created item..." -ForegroundColor Yellow
try {
    $readResponse = Invoke-RestMethod -Uri "$baseUrl/get-action-item.php?id=$testItemId" -Method GET
    Write-Host "✅ READ Success - Retrieved item $testItemId" -ForegroundColor Green
    $readResponse | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ READ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n3. UPDATE (PUT) - Modifying existing item..." -ForegroundColor Yellow
$updateData = @{
    company_id = $companyId
    context_type = $testContextType
    category = "Strengths"
    description = "Test action item UPDATED via PowerShell API"
    status = "in-progress"
    priority = "high"
    progress = 25
    notes = "Updated for CRUD testing - status changed to in-progress"
}

try {
    $updateBody = $updateData | ConvertTo-Json
    $updateResponse = Invoke-RestMethod -Uri "$baseUrl/update-action-item.php?id=$testItemId" -Method PUT -Body $updateBody -ContentType "application/json"
    Write-Host "✅ UPDATE Success - Item $testItemId updated" -ForegroundColor Green
    $updateResponse | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ UPDATE Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Error Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

Write-Host "`n4. READ AFTER UPDATE - Verifying changes..." -ForegroundColor Yellow
try {
    $verifyResponse = Invoke-RestMethod -Uri "$baseUrl/get-action-item.php?id=$testItemId" -Method GET
    Write-Host "✅ Verification Success - Changes confirmed" -ForegroundColor Green
    Write-Host "Description: $($verifyResponse.description)" -ForegroundColor White
    Write-Host "Status: $($verifyResponse.status)" -ForegroundColor White
    Write-Host "Priority: $($verifyResponse.priority)" -ForegroundColor White
    Write-Host "Progress: $($verifyResponse.progress)%" -ForegroundColor White
} catch {
    Write-Host "❌ Verification Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n5. LIST (GET) - Testing list endpoint..." -ForegroundColor Yellow
try {
    $listResponse = Invoke-RestMethod -Uri "$baseUrl/list-action-items.php?company_id=$companyId&context_type=$testContextType&limit=5" -Method GET
    Write-Host "✅ LIST Success - Found $($listResponse.Count) items" -ForegroundColor Green
    
    # Show summary of items
    foreach ($item in $listResponse) {
        Write-Host "  - ID: $($item.id) | Category: $($item.category) | Status: $($item.status)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ LIST Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n6. DELETE (DELETE) - Removing test item..." -ForegroundColor Yellow
try {
    $deleteResponse = Invoke-RestMethod -Uri "$baseUrl/delete-action-item.php?id=$testItemId" -Method DELETE
    Write-Host "✅ DELETE Success - Item $testItemId removed" -ForegroundColor Green
    $deleteResponse | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ DELETE Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n7. VERIFY DELETE - Confirming removal..." -ForegroundColor Yellow
try {
    $confirmResponse = Invoke-RestMethod -Uri "$baseUrl/get-action-item.php?id=$testItemId" -Method GET
    Write-Host "❌ DELETE Verification Failed - Item still exists" -ForegroundColor Red
} catch {
    Write-Host "✅ DELETE Verified - Item $testItemId no longer exists" -ForegroundColor Green
}

Write-Host "`n=== CRUD TESTING COMPLETE ===" -ForegroundColor Cyan

# Test existing item update (ID 445)
Write-Host "`n=== TESTING EXISTING ITEM UPDATE (ID 445) ===" -ForegroundColor Cyan

$updateExistingData = @{
    company_id = 11
    context_type = "swot"  
    category = "Strengths"
    description = "qualified and talented fashion designer - UPDATED via CRUD test"
    status = "In Progress"
    priority = "high"
    progress = 30
    notes = "Updated via PowerShell CRUD testing script"
}

try {
    $updateExistingBody = $updateExistingData | ConvertTo-Json
    Write-Host "Attempting to update item 445..." -ForegroundColor Yellow
    $updateExistingResponse = Invoke-RestMethod -Uri "$baseUrl/update-action-item.php?id=445" -Method PUT -Body $updateExistingBody -ContentType "application/json"
    Write-Host "✅ Item 445 Update Success" -ForegroundColor Green
    $updateExistingResponse | ConvertTo-Json -Depth 3
    
    # Verify the update
    $verifyExistingResponse = Invoke-RestMethod -Uri "$baseUrl/get-action-item.php?id=445" -Method GET
    Write-Host "Updated Description: $($verifyExistingResponse.description)" -ForegroundColor White
    Write-Host "Updated Status: $($verifyExistingResponse.status)" -ForegroundColor White
    Write-Host "Updated Priority: $($verifyExistingResponse.priority)" -ForegroundColor White
    
} catch {
    Write-Host "❌ Item 445 Update Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Error Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}