# Compliance Records API Documentation

## Overview
Complete CRUD API endpoints for managing compliance records in the incubator-os system. All endpoints follow the established pattern and use the Database class with built-in headers.

## Base URL
```
http://localhost:8080/api-nodes/compliance-records/
```

## Endpoints

### 1. Create Compliance Record
**POST** `/add-compliance-record.php`

**Required Fields:**
- `client_id` (integer)
- `company_id` (integer) 
- `financial_year_id` (integer)
- `type` (string) - Must be one of: annual_returns, tax_returns, bbbee_certificate, cipc_registration, vat_registration, paye_registration, uif_registration, workmen_compensation, other

**Optional Fields:**
- `tenant_id`, `program_id`, `cohort_id`, `period`, `title`, `sub_type`
- `date_1`, `date_2`, `date_3` (dates)
- `count_1`, `count_2` (integers)
- `amount_1`, `amount_2`, `amount_3` (decimals)
- `level`, `progress`, `responsible_person`, `status`, `notes`, `metadata`
- `created_by`, `updated_by`

**Example Request:**
```json
{
  "client_id": 1,
  "company_id": 1,
  "financial_year_id": 1,
  "type": "annual_returns",
  "title": "Annual Returns 2025",
  "status": "Pending",
  "notes": "Due by end of year"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Compliance record created successfully",
  "data": { ... }
}
```

### 2. Get All Compliance Records
**GET** `/get-compliance-records.php`

**Query Parameters:**
- `tenant_id`, `client_id`, `program_id`, `cohort_id`, `company_id`, `financial_year_id`, `type`, `status` (filters)
- `search` (searches title and notes)
- `limit`, `offset` (pagination)

**Example:**
```
GET /get-compliance-records.php?company_id=1&status=Pending&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "filters_applied": {...},
  "total_returned": 5
}
```

### 3. Get Single Compliance Record
**GET** `/get-compliance-record.php?id={id}`

**Example:**
```
GET /get-compliance-record.php?id=1
```

**Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

### 4. Update Compliance Record
**POST** `/update-compliance-record.php?id={id}`

**Body:** JSON object with fields to update

**Example:**
```json
{
  "status": "Completed",
  "notes": "Submitted successfully"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Compliance record updated successfully",
  "data": { ... }
}
```

### 5. Delete Compliance Record
**GET** `/delete-compliance-record.php?id={id}`

**Example:**
```
GET /delete-compliance-record.php?id=1
```

**Response:**
```json
{
  "success": true,
  "message": "Compliance record deleted successfully"
}
```

### 6. Get Company Compliance Records
**GET** `/get-company-compliance.php?company_id={id}`

**Query Parameters:**
- `company_id` (required)
- `financial_year_id`, `type`, `status` (optional filters)
- `limit`, `offset` (pagination)

**Example:**
```
GET /get-company-compliance.php?company_id=1&type=annual_returns
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "company_id": 1,
  "total_returned": 3
}
```

### 7. Compliance Summary/Dashboard
**GET** `/compliance-summary.php`

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_records": 25,
      "total_companies": 10,
      "completed_records": 15,
      "pending_records": 8,
      "in_progress_records": 2,
      "overdue_records": 0,
      "completion_rate": 60.00
    },
    "by_type": [
      {
        "type": "annual_returns",
        "count": 10,
        "completed": 6,
        "pending": 4
      }
    ],
    "recent_records": [...]
  }
}
```

### 8. Bulk Operations
**POST** `/bulk-operations.php`

**Operations Available:**
- `bulk_create` - Create multiple records
- `bulk_update` - Update multiple records
- `bulk_delete` - Delete multiple records
- `bulk_status_update` - Update status for multiple records

**Example Bulk Create:**
```json
{
  "operation": "bulk_create",
  "records": [
    {
      "client_id": 1,
      "company_id": 1,
      "financial_year_id": 1,
      "type": "tax_returns"
    },
    {
      "client_id": 1,
      "company_id": 1,
      "financial_year_id": 1,
      "type": "bbbee_certificate"
    }
  ]
}
```

**Example Bulk Status Update:**
```json
{
  "operation": "bulk_status_update",
  "ids": [1, 2, 3],
  "status": "Completed"
}
```

**Response:**
```json
{
  "success": true,
  "operation": "bulk_create",
  "results": [...],
  "errors": [],
  "total_processed": 2,
  "total_errors": 0
}
```

## Compliance Types
Valid compliance types:
- `annual_returns`
- `tax_returns`
- `bbbee_certificate`
- `cipc_registration`
- `vat_registration`
- `paye_registration`
- `uif_registration`
- `workmen_compensation`
- `other`

## Status Values
Common status values:
- `Pending`
- `In Progress`
- `Completed`
- `Overdue`
- `Not Applicable`

## Error Handling
All endpoints return consistent error responses:
```json
{
  "success": false,
  "error": "Error message here"
}
```

## Database Connection
All endpoints use the Database class which automatically includes headers. No manual header inclusion needed.

## Testing
All endpoints have been tested and are working correctly with the ComplianceRecord model.