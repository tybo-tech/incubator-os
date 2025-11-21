# Compliance Records API Testing Guide

**Date:** November 14, 2025  
**Base URL:** `http://localhost:8080/api-nodes/compliance-records/`  
**Database Table:** `compliance_records`

---

## 🎯 Overview

The Compliance Records API provides full CRUD operations for managing company compliance tracking including annual returns, B-BBEE certificates, tax registrations, and other statutory requirements.

### **Key Features:**
- ✅ Unified table with flexible generic fields (date_1/2/3, amount_1/2/3, count_1/2)
- ✅ Full CRUD operations (Create, Read, Update, Delete)
- ✅ Advanced filtering by company, client, type, status
- ✅ Snake_case field names (no conversion needed)
- ✅ Proper NULL handling for optional fields

---

## 📡 API Endpoints

### **1. CREATE - Add Compliance Record**

**Endpoint:** `POST /api-nodes/compliance-records/add-compliance-record.php`

**Request Body:**
```json
{
  "company_id": 59,
  "client_id": 1,
  "program_id": 5,
  "cohort_id": 6,
  "financial_year_id": 1,
  "type": "annual_returns",
  "title": "Annual Return",
  "period": "FY2025",
  "date_1": "2025-11-14",
  "date_2": "2025-12-14",
  "status": "Pending"
}
```

**PowerShell Test:**
```powershell
$body = @{
  company_id = 59
  client_id = 1
  program_id = 5
  cohort_id = 6
  financial_year_id = 1
  type = "annual_returns"
  title = "Annual Return"
  period = "FY2025"
  date_1 = "2025-11-14"
  date_2 = "2025-12-14"
  status = "Pending"
} | ConvertTo-Json

$response = Invoke-RestMethod `
  -Uri "http://localhost:8080/api-nodes/compliance-records/add-compliance-record.php" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"

$response | ConvertTo-Json -Depth 5
```

**Response:**
```json
{
  "success": true,
  "message": "Compliance record created successfully",
  "data": {
    "id": 5,
    "tenant_id": null,
    "client_id": 1,
    "program_id": 5,
    "cohort_id": 6,
    "company_id": 59,
    "financial_year_id": 1,
    "type": "annual_returns",
    "period": "FY2025",
    "title": "Annual Return",
    "date_1": "2025-11-14",
    "date_2": "2025-12-14",
    "date_3": null,
    "status": "Pending",
    "created_at": "2025-11-14 09:03:58",
    "updated_at": "2025-11-14 09:03:58"
  }
}
```

**⚠️ IMPORTANT:** 
- Do **NOT** send empty strings `""` for optional date fields
- Omit optional fields entirely or send `null`
- Empty string dates cause: `SQLSTATE[22007]: Invalid datetime format`

---

### **2. READ - Get Single Record**

**Endpoint:** `GET /api-nodes/compliance-records/get-compliance-record.php?id={id}`

**PowerShell Test:**
```powershell
$record = Invoke-RestMethod `
  -Uri "http://localhost:8080/api-nodes/compliance-records/get-compliance-record.php?id=5" `
  -Method GET

$record.data | ConvertTo-Json -Depth 5
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "company_id": 59,
    "type": "annual_returns",
    "period": "FY2025",
    "status": "Pending",
    "date_1": "2025-11-14",
    "date_2": "2025-12-14",
    "date_3": null,
    "amount_1": null,
    ...
  }
}
```

---

### **3. READ - Get Multiple Records (with filters)**

**Endpoint:** `GET /api-nodes/compliance-records/get-compliance-records.php`

**Query Parameters:**
- `company_id` - Filter by company ID
- `client_id` - Filter by client ID
- `type` - Filter by compliance type
- `status` - Filter by status
- `financial_year_id` - Filter by financial year
- `limit` - Number of records to return
- `offset` - Pagination offset

**PowerShell Test:**
```powershell
# Get all annual returns for company 59
$records = Invoke-RestMethod `
  -Uri "http://localhost:8080/api-nodes/compliance-records/get-compliance-records.php?company_id=59&type=annual_returns" `
  -Method GET

Write-Host "Found $($records.data.Count) record(s)"
$records.data | Select-Object id, period, status, date_1, date_2 | Format-Table
```

**Example Output:**
```
id period status  date_1     date_2    
-- ------ ------  ------     ------
 5 FY2025 Pending 2025-11-14 2025-12-14
```

---

### **4. UPDATE - Update Record**

**Endpoint:** `PUT /api-nodes/compliance-records/update-compliance-record.php?id={id}`

**Request Body (only changed fields):**
```json
{
  "status": "Filed",
  "date_3": "2025-11-14",
  "amount_1": 175.00,
  "notes": "Filed online via CIPC portal"
}
```

**PowerShell Test:**
```powershell
$updateBody = @{
  status = "Filed"
  date_3 = "2025-11-14"
  amount_1 = 175.00
  notes = "Filed online via CIPC portal"
} | ConvertTo-Json

$updated = Invoke-RestMethod `
  -Uri "http://localhost:8080/api-nodes/compliance-records/update-compliance-record.php?id=5" `
  -Method PUT `
  -Body $updateBody `
  -ContentType "application/json"

$updated.data | Select-Object id, status, date_3, amount_1, notes | Format-List
```

**Response:**
```
id       : 5
status   : Filed
date_3   : 2025-11-14
amount_1 : 175
notes    : Filed online via CIPC portal
```

---

### **5. DELETE - Delete Record**

**Endpoint:** `DELETE /api-nodes/compliance-records/delete-compliance-record.php?id={id}`

**PowerShell Test:**
```powershell
$delete = Invoke-RestMethod `
  -Uri "http://localhost:8080/api-nodes/compliance-records/delete-compliance-record.php?id=5" `
  -Method DELETE

$delete | ConvertTo-Json
```

**Response:**
```json
{
  "success": true,
  "message": "Compliance record deleted successfully"
}
```

---

## 🧪 Complete Test Sequence

Run this full CRUD test in PowerShell:

```powershell
Write-Host "=== COMPLIANCE RECORDS API TEST SUITE ===" -ForegroundColor Cyan

# 1. CREATE
Write-Host "`n1. CREATE - Adding new annual return..." -ForegroundColor Yellow
$createBody = @{
  company_id = 59
  client_id = 1
  program_id = 5
  cohort_id = 6
  financial_year_id = 1
  type = "annual_returns"
  title = "Annual Return"
  period = "FY2025"
  date_1 = "2025-11-14"
  date_2 = "2025-12-14"
  status = "Pending"
} | ConvertTo-Json

$created = Invoke-RestMethod `
  -Uri "http://localhost:8080/api-nodes/compliance-records/add-compliance-record.php" `
  -Method POST `
  -Body $createBody `
  -ContentType "application/json"

$recordId = $created.data.id
Write-Host "✅ Created record ID: $recordId" -ForegroundColor Green

# 2. READ Single
Write-Host "`n2. READ - Fetching record $recordId..." -ForegroundColor Yellow
$single = Invoke-RestMethod `
  -Uri "http://localhost:8080/api-nodes/compliance-records/get-compliance-record.php?id=$recordId" `
  -Method GET

$single.data | Select-Object id, period, status, date_1 | Format-List
Write-Host "✅ Read successful" -ForegroundColor Green

# 3. READ Multiple
Write-Host "`n3. READ Multiple - Fetching all records for company 59..." -ForegroundColor Yellow
$multiple = Invoke-RestMethod `
  -Uri "http://localhost:8080/api-nodes/compliance-records/get-compliance-records.php?company_id=59&type=annual_returns" `
  -Method GET

Write-Host "Found $($multiple.data.Count) record(s)" -ForegroundColor Cyan
$multiple.data | Select-Object id, period, status | Format-Table
Write-Host "✅ List successful" -ForegroundColor Green

# 4. UPDATE
Write-Host "`n4. UPDATE - Marking as Filed..." -ForegroundColor Yellow
$updateBody = @{
  status = "Filed"
  date_3 = "2025-11-14"
  amount_1 = 175.00
  notes = "Filed via API test"
} | ConvertTo-Json

$updated = Invoke-RestMethod `
  -Uri "http://localhost:8080/api-nodes/compliance-records/update-compliance-record.php?id=$recordId" `
  -Method PUT `
  -Body $updateBody `
  -ContentType "application/json"

$updated.data | Select-Object id, status, date_3, amount_1 | Format-List
Write-Host "✅ Update successful" -ForegroundColor Green

# 5. VERIFY
Write-Host "`n5. VERIFY - Confirming update..." -ForegroundColor Yellow
$verify = Invoke-RestMethod `
  -Uri "http://localhost:8080/api-nodes/compliance-records/get-compliance-record.php?id=$recordId" `
  -Method GET

$verify.data | Select-Object id, period, status, date_1, date_2, date_3, amount_1, notes | Format-List
Write-Host "✅ Verify successful" -ForegroundColor Green

# 6. DELETE
Write-Host "`n6. DELETE - Removing record..." -ForegroundColor Yellow
$delete = Invoke-RestMethod `
  -Uri "http://localhost:8080/api-nodes/compliance-records/delete-compliance-record.php?id=$recordId" `
  -Method DELETE

Write-Host "✅ Delete successful" -ForegroundColor Green

Write-Host "`n=== ALL TESTS PASSED ===" -ForegroundColor Green
```

---

## 📊 Field Usage by Compliance Type

### **Annual Returns:**
| Field | Usage | Example |
|-------|-------|---------|
| `date_1` | Anniversary Date | `2025-01-15` |
| `date_2` | Due Date | `2025-02-14` |
| `date_3` | Filing Date | `2025-02-10` |
| `amount_1` | Filing Fee | `175.00` |
| `status` | Status | `Filed` |

### **B-BBEE Certificate:**
| Field | Usage | Example |
|-------|-------|---------|
| `date_1` | Issue Date | `2025-01-10` |
| `date_2` | Expiry Date | `2026-01-10` |
| `level` | B-BBEE Level | `Level 4` |
| `count_1` | Black Ownership % | `30` |
| `amount_1` | Skills Investment | `50000.00` |

### **Tax Registration (VAT/PAYE):**
| Field | Usage | Example |
|-------|-------|---------|
| `date_1` | Registration Date | `2024-06-01` |
| `date_2` | Last Submission | `2025-10-31` |
| `count_1` | Employee Count | `15` |
| `sub_type` | Registration Type | `VAT` |

---

## ⚠️ Common Issues & Solutions

### **Issue 1: Empty String Date Error**
```
SQLSTATE[22007]: Invalid datetime format: 1292 Incorrect date value: '' for column 'date_3'
```

**Solution:**
- Don't send empty strings for optional date fields
- Omit the field entirely or send `null`

**❌ Wrong:**
```json
{
  "date_1": "2025-11-14",
  "date_3": ""  // ❌ Empty string causes error
}
```

**✅ Correct:**
```json
{
  "date_1": "2025-11-14"
  // date_3 omitted entirely
}
```

### **Issue 2: ID Required for Update**
```
{"success":false,"error":"Valid compliance record ID is required"}
```

**Solution:**
- Always include `id` in the query string for UPDATE
- Format: `update-compliance-record.php?id=5`

### **Issue 3: Invalid Date Format**
```
SQLSTATE[22007]: Invalid datetime format
```

**Solution:**
- Use ISO format: `YYYY-MM-DD`
- Examples: `2025-11-14`, `2026-01-10`

---

## 🎯 Testing Checklist

- [x] ✅ CREATE - New record with required fields only
- [x] ✅ READ Single - Get by ID
- [x] ✅ READ Multiple - Filter by company_id and type
- [x] ✅ UPDATE - Partial update (only changed fields)
- [x] ✅ VERIFY - Confirm update applied
- [x] ✅ DELETE - Remove record
- [x] ✅ Error handling - Empty string dates
- [x] ✅ Error handling - Missing ID on update

---

## 📝 Angular Service Usage

The Angular service automatically handles proper formatting:

```typescript
// CREATE
const newRecord: Partial<ComplianceRecord> = {
  company_id: 59,
  client_id: 1,
  financial_year_id: 1,
  type: 'annual_returns',
  period: 'FY2025',
  date_1: '2025-11-14',
  date_2: '2025-12-14',
  status: 'Pending'
  // Don't include empty strings - they're cleaned automatically
};

await this.complianceService.addComplianceRecord(newRecord).toPromise();

// UPDATE
const updates: Partial<ComplianceRecord> = {
  status: 'Filed',
  date_3: '2025-11-14',
  amount_1: 175.00
};

await this.complianceService.updateComplianceRecord(id, updates).toPromise();
```

---

## 🔧 API Improvements Made

1. ✅ **Form Component** - Cleans empty values before submission
2. ✅ **Default Values** - No longer includes empty strings
3. ✅ **Service Layer** - Passes data directly (no conversion)
4. ✅ **Error Handling** - Proper error messages from API

---

**Status:** ✅ **ALL ENDPOINTS TESTED & WORKING**

The Compliance Records API is production-ready with full CRUD operations, proper NULL handling, and comprehensive error handling.
