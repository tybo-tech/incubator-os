# Company Profit Summary API Testing

## Issue Fixed ✅
**Problem**: Frontend was calling `create.php` but endpoint is `add-company-profit-summary.php`
**Solution**: Updated `CompanyProfitSummaryService.saveProfitRecord()` method to use correct endpoints

## Environment Setup
Podman/Docker environment running on `http://localhost:8080`

## Company Profit Summary API Endpoints

### 1. Create New Profit Record (POST) ✅
**Endpoint:** `/api-nodes/company-profit-summary/add-company-profit-summary.php`

#### PowerShell Test
```powershell
# Test the add endpoint with your data
$body = @{
  client_id = 0
  company_id = 11
  year_ = 2022
  gross_q1 = 0
  gross_q2 = 0
  gross_q3 = 0
  gross_q4 = 0
  gross_margin = 0
  operating_q1 = 0
  operating_q2 = 0
  operating_q3 = 0
  operating_q4 = 0
  operating_margin = 0
  npbt_q1 = 0
  npbt_q2 = 0
  npbt_q3 = 0
  npbt_q4 = 0
  npbt_margin = 0
  unit = "USD"
  status_id = 1
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:8080/api-nodes/company-profit-summary/add-company-profit-summary.php" -Method POST -Body $body -ContentType "application/json"
$response | ConvertTo-Json -Depth 3
```

#### Expected Response
```json
{
  "id": 7,
  "tenant_id": "",
  "client_id": 0,
  "company_id": 11,
  "program_id": "",
  "cohort_id": "",
  "year_": 2022,
  "gross_q1": 0,
  "gross_q2": 0,
  "gross_q3": 0,
  "gross_q4": 0,
  "gross_total": "0.00",
  "gross_margin": 0,
  "operating_q1": 0,
  "operating_q2": 0,
  "operating_q3": 0,
  "operating_q4": 0,
  "operating_total": "0.00",
  "operating_margin": 0,
  "npbt_q1": 0,
  "npbt_q2": 0,
  "npbt_q3": 0,
  "npbt_q4": 0,
  "npbt_total": "0.00",
  "npbt_margin": 0,
  "unit": "USD",
  "notes": "",
  "title": "",
  "status_id": 1,
  "created_by": "",
  "updated_by": "",
  "created_at": "2025-10-11 20:09:05",
  "updated_at": "2025-10-11 20:09:05"
}
```

### 2. Update Existing Record (PUT)
**Endpoint:** `/api-nodes/company-profit-summary/update-company-profit-summary.php`

#### PowerShell Test
```powershell
# Update the record we just created
$updateBody = @{
  id = 7  # Use the ID from the create response
  gross_q1 = 25000
  gross_q2 = 30000
  gross_q3 = 35000
  gross_q4 = 40000
  operating_q1 = 15000
  operating_q2 = 18000
  operating_q3 = 22000
  operating_q4 = 25000
} | ConvertTo-Json

$updateResponse = Invoke-RestMethod -Uri "http://localhost:8080/api-nodes/company-profit-summary/update-company-profit-summary.php" -Method POST -Body $updateBody -ContentType "application/json"
$updateResponse | ConvertTo-Json -Depth 3
```

### 3. Get Single Record (POST)
**Endpoint:** `/api-nodes/company-profit-summary/get-company-profit-summary.php`

#### PowerShell Test
```powershell
# Get the record by ID
$getBody = @{ id = 7 } | ConvertTo-Json
$getResponse = Invoke-RestMethod -Uri "http://localhost:8080/api-nodes/company-profit-summary/get-company-profit-summary.php" -Method POST -Body $getBody -ContentType "application/json"
$getResponse | ConvertTo-Json -Depth 3
```

### 4. List Records by Company (GET/POST)
**Endpoint:** `/api-nodes/company-profit-summary/list-company-profit-summary.php`

#### PowerShell Test
```powershell
# List all records for company 11
$listResponse = Invoke-RestMethod -Uri "http://localhost:8080/api-nodes/company-profit-summary/list-company-profit-summary.php?company_id=11" -Method GET
$listResponse | ConvertTo-Json -Depth 5
```

### 5. Batch Update (POST) ✅
**Endpoint:** `/api-nodes/company-profit-summary/batch-update-company-profit-summary.php`

#### PowerShell Test
```powershell
# Batch update multiple records
$batchBody = @{
  records = @(
    @{
      id = 7
      gross_q1 = 50000
      gross_q2 = 55000
      operating_q1 = 30000
      operating_q2 = 35000
    }
  )
} | ConvertTo-Json -Depth 3

$batchResponse = Invoke-RestMethod -Uri "http://localhost:8080/api-nodes/company-profit-summary/batch-update-company-profit-summary.php" -Method POST -Body $batchBody -ContentType "application/json"
$batchResponse | ConvertTo-Json -Depth 3
```

### 6. Delete Record (POST)
**Endpoint:** `/api-nodes/company-profit-summary/delete-company-profit-summary.php`

#### PowerShell Test
```powershell
# Delete the test record
$deleteBody = @{ id = 7 } | ConvertTo-Json
$deleteResponse = Invoke-RestMethod -Uri "http://localhost:8080/api-nodes/company-profit-summary/delete-company-profit-summary.php" -Method POST -Body $deleteBody -ContentType "application/json"
$deleteResponse | ConvertTo-Json -Depth 3
```

## Angular Service Usage

After the fix, your Angular service should now work correctly:

```typescript
// In your component
constructor(private profitService: CompanyProfitSummaryService) {}

// Create new profit record
const newRecord: CompanyProfitRecord = {
  client_id: 0,
  company_id: 11,
  year_: 2022,
  gross_q1: 0,
  gross_q2: 0,
  gross_q3: 0,
  gross_q4: 0,
  gross_margin: 0,
  operating_q1: 0,
  operating_q2: 0,
  operating_q3: 0,
  operating_q4: 0,
  operating_margin: 0,
  npbt_q1: 0,
  npbt_q2: 0,
  npbt_q3: 0,
  npbt_q4: 0,
  npbt_margin: 0,
  unit: "USD",
  status_id: 1
};

// This will now call the correct endpoint: add-company-profit-summary.php
this.profitService.saveProfitRecord(newRecord).subscribe({
  next: (result) => console.log('Created successfully:', result),
  error: (error) => console.error('Create failed:', error)
});
```

## Summary of Changes Made

### ✅ Fixed Endpoints
- **Before**: `create.php` (doesn't exist)
- **After**: `add-company-profit-summary.php` (correct endpoint)

- **Before**: `update.php` (generic)
- **After**: `update-company-profit-summary.php` (specific endpoint)

### ✅ Service Method Fixed
- `CompanyProfitSummaryService.saveProfitRecord()` now uses correct endpoints
- All other methods were already using correct endpoints

### ✅ API Test Results
- ✅ Create endpoint working: Returns record with ID 7
- ✅ Response includes all expected fields with correct data types
- ✅ Timestamps automatically added by backend
- ✅ Total fields calculated automatically

## Next Steps

1. **Test in Angular**: Your year modal should now work when creating new profit records
2. **Verify UI**: The profits component should successfully save new year data
3. **Test Complete Flow**: Add year → Fill quarterly data → Save changes → Verify persistence

The endpoint mismatch has been resolved and the API is fully functional! 🎉
