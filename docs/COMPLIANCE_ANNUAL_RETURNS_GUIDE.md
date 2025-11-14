# 📋 Annual Returns Compliance - Implementation Guide

**Date:** November 14, 2025  
**Component:** `annual-returns.component.ts`  
**Table:** `compliance_records`  
**Type:** `annual_returns`

---

## 🎯 Overview

The Annual Returns component tracks **CIPC (Companies and Intellectual Property Commission) annual return filings** for companies in South Africa. Companies are required to file annual returns within **30 business days** of their anniversary month.

### **Key Features:**
✅ Track anniversary dates and due dates  
✅ Monitor filing dates and fees paid  
✅ Automated overdue status detection  
✅ Summary dashboard with statistics  
✅ Flexible form-based data entry  
✅ Snake_case field names (no conversion needed)

---

## 📊 Database Schema

### **Table: `compliance_records`**

The system uses a **unified compliance table** with flexible generic fields that adapt to different compliance types:

```sql
CREATE TABLE compliance_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- Context Fields
  tenant_id INT,
  client_id INT NOT NULL,
  program_id INT,
  cohort_id INT,
  company_id INT NOT NULL,
  financial_year_id INT NOT NULL,
  
  -- Type & Classification
  type VARCHAR(50) NOT NULL,  -- 'annual_returns'
  period VARCHAR(50),          -- 'FY2025'
  title VARCHAR(150),          -- 'Annual Return'
  sub_type VARCHAR(100),       -- (not used for annual returns)
  
  -- Generic Date Fields (flexible usage per type)
  date_1 DATE,                 -- Anniversary Date
  date_2 DATE,                 -- Due Date
  date_3 DATE,                 -- Filing Date
  
  -- Generic Count Fields
  count_1 INT,                 -- (not used for annual returns)
  count_2 INT,                 -- (not used for annual returns)
  
  -- Generic Amount Fields
  amount_1 DECIMAL(15,2),      -- Fee Paid
  amount_2 DECIMAL(15,2),      -- (not used for annual returns)
  amount_3 DECIMAL(15,2),      -- (not used for annual returns)
  
  -- Additional Fields
  level VARCHAR(50),           -- (not used for annual returns)
  progress INT,                -- (not used for annual returns)
  responsible_person VARCHAR(150),
  status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  notes TEXT,
  metadata JSON,
  
  -- Audit Fields
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT,
  updated_by INT,
  
  -- Indexes
  INDEX idx_company (company_id),
  INDEX idx_client (client_id),
  INDEX idx_type (type),
  INDEX idx_status (status),
  
  -- Foreign Keys
  FOREIGN KEY fk_compliance_company (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY fk_compliance_finyear (financial_year_id) REFERENCES financial_years(id) ON DELETE CASCADE
);
```

---

## 🏗️ Field Usage for Annual Returns

| Database Field | Usage | Description | Example |
|---------------|-------|-------------|---------|
| **type** | `'annual_returns'` | Identifies record type | `'annual_returns'` |
| **period** | Financial Year | Year ending | `'FY2025'` |
| **title** | Display Name | Record title | `'Annual Return'` |
| **date_1** | Anniversary Date | Company registration anniversary | `'2025-01-15'` |
| **date_2** | Due Date | 30 days from anniversary | `'2025-02-14'` |
| **date_3** | Filing Date | Actual date filed | `'2025-02-10'` |
| **amount_1** | Fee Paid | CIPC filing fee | `175.00` |
| **status** | Status | Pending/Filed/Overdue | `'Filed'` |
| **notes** | Notes | Additional comments | `'Filed online via CIPC portal'` |

### **Unused Fields:**
- `count_1`, `count_2` - Not needed for annual returns
- `amount_2`, `amount_3` - Not needed for annual returns
- `level` - Not applicable
- `progress` - Not applicable
- `sub_type` - Not used

---

## 🔧 TypeScript Interface

### **ComplianceRecord Interface** (`src/models/ComplianceRecord.ts`)

```typescript
export interface ComplianceRecord {
  id: number;
  tenant_id?: number;
  client_id: number;
  program_id?: number;
  cohort_id?: number;
  company_id: number;
  financial_year_id: number;
  
  type: string;              // 'annual_returns'
  period?: string;           // 'FY2025'
  title?: string;            // 'Annual Return'
  sub_type?: string;
  
  date_1?: string;           // Anniversary Date (ISO: YYYY-MM-DD)
  date_2?: string;           // Due Date
  date_3?: string;           // Filing Date
  
  count_1?: number;
  count_2?: number;
  
  amount_1?: number;         // Fee Paid
  amount_2?: number;
  amount_3?: number;
  
  level?: string;
  progress?: number;
  responsible_person?: string;
  status: string;            // 'Pending' | 'Filed' | 'Overdue'
  notes?: string;
  metadata?: any;
  
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  updated_by?: number;
}
```

**Important:** All field names use `snake_case` to match the database exactly. **No conversion** happens anywhere in the system.

---

## 📝 Column Configuration

### **columnConfig in annual-returns.component.ts**

```typescript
columnConfig: ComplianceColumnConfig[] = [
  // Period/Year
  { 
    key: 'period', 
    label: 'Year Ending', 
    type: 'text', 
    required: true, 
    placeholder: 'e.g., FY2024' 
  },
  
  // Anniversary Date (date_1)
  { 
    key: 'date_1', 
    label: 'Anniversary Date', 
    type: 'date', 
    required: true 
  },
  
  // Due Date (date_2)
  { 
    key: 'date_2', 
    label: 'Due Date', 
    type: 'date', 
    required: true 
  },
  
  // Filing Date (date_3)
  { 
    key: 'date_3', 
    label: 'Filing Date', 
    type: 'date' 
  },
  
  // Status Dropdown
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    options: [
      { value: 'Pending', label: 'Pending', color: 'text-yellow-600' },
      { value: 'In Progress', label: 'In Progress', color: 'text-blue-600' },
      { value: 'Filed', label: 'Filed', color: 'text-green-600' },
      { value: 'Overdue', label: 'Overdue', color: 'text-red-600' },
      { value: 'Not Required', label: 'Not Required', color: 'text-gray-600' }
    ]
  },
  
  // Fee Paid (amount_1)
  { 
    key: 'amount_1', 
    label: 'Fee Paid', 
    type: 'currency', 
    step: 0.01, 
    placeholder: '0.00' 
  },
  
  // Notes
  { 
    key: 'notes', 
    label: 'Notes', 
    type: 'textarea', 
    rows: 3, 
    placeholder: 'Additional notes about this annual return...' 
  },
];
```

---

## 🎨 Form Component

### **ComplianceFormComponent** (`compliance-form.component.ts`)

The form component is **100% dynamic** and **reusable** across all compliance types. It:

1. **Accepts Configuration** - Takes `columnConfig` and generates appropriate fields
2. **Handles All Field Types** - text, date, number, currency, percentage, select, textarea
3. **Validates Required Fields** - Shows errors for missing required data
4. **Emits Clean Data** - Returns typed `Partial<ComplianceRecord>` with snake_case fields

### **Supported Field Types:**

| Type | Renders As | Features |
|------|-----------|----------|
| `text` | Text input | Placeholder, required validation |
| `date` | Date picker | ISO format (YYYY-MM-DD) |
| `number` | Number input | Step control, min/max |
| `currency` | Number input with R prefix | 2 decimal places |
| `percentage` | Number input with % suffix | 0-100 range |
| `select` | Dropdown | Multiple options with colors |
| `textarea` | Multi-line text | Configurable rows |

### **Form Configuration Interface:**

```typescript
export interface ComplianceFormConfig {
  title: string;                    // Modal title
  fields: ComplianceColumnConfig[]; // Column config from child component
  submitButtonText?: string;        // "Create" or "Update"
  cancelButtonText?: string;        // "Cancel"
  submitButtonColor?: 'blue' | 'green' | 'purple' | 'red' | 'yellow';
  mode?: 'create' | 'edit';
  showRequiredIndicator?: boolean;  // Show * for required fields
}
```

---

## 🔄 Data Flow

### **Creating a New Annual Return:**

```
User Clicks "Add Return"
    ↓
startNewForm() called
    ↓
formMode = 'create'
formData = getDefaultRecordValues()
showForm = true
    ↓
ComplianceFormComponent renders with config
    ↓
User fills in form fields
    ↓
User clicks "Create Annual Return"
    ↓
onFormSubmit(formData) called
    ↓
Merge with required IDs (company_id, client_id, etc.)
    ↓
complianceService.addComplianceRecord(newRecord)
    ↓
POST /api-nodes/compliance-records/add.php
    ↓
Record saved to database
    ↓
Response returned with new ID
    ↓
records$ updated (prepend new record)
    ↓
Form closed
    ↓
Table refreshed with new record
```

### **Default Values:**

```typescript
override getDefaultRecordValues(): Partial<ComplianceRecord> {
  return {
    type: 'annual_returns',
    title: 'Annual Return',
    period: `FY${new Date().getFullYear()}`,  // FY2025
    date_1: new Date().toISOString().split('T')[0],  // Today
    date_2: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0],  // 30 days from now
    status: 'Pending',
    notes: '',
  };
}
```

---

## 📡 API Endpoints

### **Base URL:** `/api-nodes/compliance-records/`

### **1. Get All Records**
```http
GET /api-nodes/compliance-records/get.php?company_id=11&type=annual_returns
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 4,
      "company_id": 11,
      "client_id": 1,
      "financial_year_id": 1,
      "type": "annual_returns",
      "period": "FY2025",
      "title": "Annual Return",
      "date_1": "2025-01-15",
      "date_2": "2025-02-14",
      "date_3": "2025-02-10",
      "amount_1": 175.00,
      "status": "Filed",
      "notes": "Filed online",
      "created_at": "2025-11-14 10:45:06"
    }
  ]
}
```

### **2. Add New Record**
```http
POST /api-nodes/compliance-records/add.php
Content-Type: application/json

{
  "company_id": 11,
  "client_id": 1,
  "financial_year_id": 1,
  "type": "annual_returns",
  "period": "FY2025",
  "date_1": "2025-01-15",
  "date_2": "2025-02-14",
  "status": "Pending"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "company_id": 11,
    ...
  }
}
```

### **3. Update Record**
```http
PUT /api-nodes/compliance-records/update.php
Content-Type: application/json

{
  "id": 5,
  "date_3": "2025-02-10",
  "amount_1": 175.00,
  "status": "Filed"
}
```

### **4. Delete Record**
```http
DELETE /api-nodes/compliance-records/delete.php?id=5
```

---

## 🎯 Status Logic

### **Status Options:**

| Status | Color | When Used |
|--------|-------|-----------|
| **Pending** | Yellow | Not yet filed, not overdue |
| **In Progress** | Blue | Currently being prepared |
| **Filed** | Green | Successfully filed (`date_3` populated) |
| **Overdue** | Red | Past due date without filing |
| **Not Required** | Gray | Exemption or special case |

### **Auto-Overdue Detection:**

```typescript
isRecordOverdue(record: ComplianceRecord): boolean {
  if (record.status === 'Filed' || record.status === 'Not Required') {
    return false;
  }
  
  if (record.date_2) {  // If due date exists
    const dueDate = new Date(record.date_2);
    const today = new Date();
    return today > dueDate;  // Overdue if today is past due date
  }
  
  return false;
}
```

---

## 📊 Summary Cards

The component displays 4 summary cards at the top:

```typescript
getSummaryCards(): ComplianceSummaryCard[] {
  const records = this.records$.getValue();
  
  return [
    {
      title: 'Total Returns',
      value: records.length,
      icon: 'fas fa-file-alt',
      color: 'text-blue-600'
    },
    {
      title: 'Filed',
      value: records.filter(r => r.status === 'Filed').length,
      icon: 'fas fa-check-circle',
      color: 'text-green-600'
    },
    {
      title: 'Pending',
      value: records.filter(r => r.status === 'Pending').length,
      icon: 'fas fa-clock',
      color: 'text-yellow-600'
    },
    {
      title: 'Overdue',
      value: records.filter(r => this.isRecordOverdue(r)).length,
      icon: 'fas fa-exclamation-triangle',
      color: 'text-red-600'
    }
  ];
}
```

---

## 🧪 Testing

### **Manual Test Steps:**

1. ✅ Navigate to Company → Compliance Tab
2. ✅ Click "Annual Returns" sub-tab
3. ✅ Click "Add Return" button
4. ✅ Verify form shows 7 fields:
   - Year Ending (text)
   - Anniversary Date (date)
   - Due Date (date)
   - Filing Date (date)
   - Status (select)
   - Fee Paid (currency)
   - Notes (textarea)
5. ✅ Fill in required fields (Year, Anniversary, Due Date, Status)
6. ✅ Click "Create Annual Return"
7. ✅ Verify record appears in table
8. ✅ Verify summary cards update
9. ✅ Click Edit (pencil icon)
10. ✅ Change status to "Filed"
11. ✅ Add Filing Date and Fee
12. ✅ Click "Update Annual Return"
13. ✅ Verify changes saved
14. ✅ Click Delete (trash icon)
15. ✅ Confirm deletion
16. ✅ Verify record removed

---

## 🐛 Troubleshooting

### **Issue: Form shows only 1 field**

**Possible Causes:**
1. `columnConfig` not properly initialized
2. Angular change detection issue
3. Template binding error
4. Config not passed to form component

**Debug Steps:**
```typescript
// Add to annual-returns.component.ts
override getFormConfig(): any {
  const config = super.getFormConfig();
  console.log('📋 Form Config:', config);
  console.log('📊 Column Config Length:', this.columnConfig.length);
  return config;
}
```

Open browser console (F12) and click "Add Return". Check:
- ✅ Config object has `fields` array
- ✅ `fields.length` equals 7
- ✅ Each field has `key`, `label`, `type`

### **Issue: Data not saving**

**Check:**
1. Network tab - is POST request sent?
2. API response - any errors?
3. Field names - using snake_case?
4. Required fields - all populated?

### **Issue: Overdue detection not working**

**Verify:**
- `date_2` (Due Date) is populated
- Date format is `YYYY-MM-DD`
- Status is not "Filed" or "Not Required"

---

## 🎓 Best Practices

### **✅ DO:**
- Use snake_case field names (matches database)
- Pass complete objects to API (no partial mapping)
- Use `columnConfig` for both table and form
- Implement `getDefaultRecordValues()` with sensible defaults
- Override `getFormTitle()` for better UX
- Add console.log for debugging during development

### **❌ DON'T:**
- Convert field names (no camelCase ↔ snake_case)
- Hardcode form fields in templates
- Duplicate column definitions
- Forget required validation
- Skip error handling

---

## 🚀 Next Steps

### **Enhancements:**
1. **Email Notifications** - Alert when returns are due
2. **Document Attachments** - Upload CIPC confirmation PDFs
3. **Bulk Import** - Import multiple returns from Excel
4. **Calendar View** - Visual timeline of due dates
5. **Audit Trail** - Track who filed and when
6. **Automated Reminders** - SMS/Email 7 days before due date

### **Extend to Other Compliance Types:**
The same pattern can be used for:
- B-BBEE Certificates
- Tax Registrations (VAT, PAYE, UIF)
- COIDA Returns
- OHS Inspections
- Employment Equity Reports

Just duplicate `annual-returns.component.ts`, change:
- `complianceType`
- `columnConfig` (map generic fields)
- `getDefaultRecordValues()`

---

## 📞 Support

**Questions?** Check:
1. `docs/COMPLIANCE_SYSTEM_TECHNICAL_GUIDE.md`
2. `docs/BUSINESS_SYSTEM_OVERVIEW.md`
3. `src/app/components/compliance/annual-returns.component.ts`

**Common Issues:**
- Form not showing? Check `columnConfig` initialization
- Data not saving? Verify snake_case field names
- Overdue not detected? Check `date_2` format

---

**Status:** ✅ **PRODUCTION READY**

All annual returns functionality is complete and tested. The unified compliance architecture makes it easy to add new compliance types following this same pattern.
