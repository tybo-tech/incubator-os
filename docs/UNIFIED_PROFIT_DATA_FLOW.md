# Unified Profit Record - Data Flow Example

## 🔄 Complete Data Flow

### 1. **Database Record** (Your JSON format)
```json
{
  "id": 5,
  "company_id": 11,
  "client_id": 1,
  "program_id": 1,
  "cohort_id": 1,
  "year_": 2026,
  "gross_q1": "85000.00",
  "gross_q2": "90000.00", 
  "gross_q3": "90000.00",
  "gross_q4": "95000.00",
  "gross_total": "360000.00",
  "gross_margin": "80.00",
  "operating_q1": "60000.00",
  "operating_q2": "65000.00",
  "operating_q3": "70000.00", 
  "operating_q4": "75000.00",
  "operating_total": "270000.00",
  "operating_margin": "60.00",
  "npbt_q1": "50000.00",
  "npbt_q2": "55000.00",
  "npbt_q3": "60000.00",
  "npbt_q4": "65000.00", 
  "npbt_total": "230000.00",
  "npbt_margin": "50.00"
}
```

### 2. **UI Transform** (Service method: recordToSectionDisplays)
The service splits this into 3 separate UI rows:

```typescript
// Gross Profit Row
{
  id: 5,
  year: 2026,
  type: 'gross',
  q1: 85000,
  q2: 90000, 
  q3: 90000,
  q4: 95000,
  total: 360000,
  margin_pct: 80
}

// Operating Profit Row  
{
  id: 5,
  year: 2026,
  type: 'operating',
  q1: 60000,
  q2: 65000,
  q3: 70000, 
  q4: 75000,
  total: 270000,
  margin_pct: 60
}

// NPBT Row
{
  id: 5,
  year: 2026,
  type: 'npbt', 
  q1: 50000,
  q2: 55000,
  q3: 60000,
  q4: 65000,
  total: 230000,
  margin_pct: 50
}
```

### 3. **User Edits Gross Q1** (Changes 85000 → 90000)

### 4. **Reverse Transform** (Our new transformRowToSaveData method)
```typescript
// UI Row (gross profit)
{
  id: 5,
  year: 2026,
  type: 'gross',
  q1: 90000,  // ← User changed this
  q2: 90000,
  q3: 90000, 
  q4: 95000,
  total: 365000,  // ← Auto-recalculated
  margin_pct: 82  // ← Auto-recalculated
}

// Transforms to Database Update
{
  id: 5,
  company_id: 11,
  client_id: 1,
  program_id: 1,
  cohort_id: 1,
  year_: 2026,
  gross_q1: 90000,      // ← Only the changed fields
  gross_q2: 90000,
  gross_q3: 90000,
  gross_q4: 95000,
  gross_total: 365000,
  gross_margin: 82
}
```

### 5. **API Call** 
```
POST /api/company-profit-summary/update-company-profit-summary.php
```

### 6. **Database Update** (Partial update)
```sql
UPDATE company_profit_summary SET 
  gross_q1 = 90000,
  gross_q2 = 90000,
  gross_q3 = 90000, 
  gross_q4 = 95000,
  gross_total = 365000,
  gross_margin = 82,
  updated_at = NOW()
WHERE id = 5
```

## 🎯 **Key Benefits**

### ✅ **Efficient Updates**
- Only sends changed profit type fields (gross, operating, or npbt)
- Doesn't touch other profit types in the same record
- Maintains data integrity

### ✅ **Type Safety** 
- `UnifiedProfitRecord` interface matches your database exactly
- `Partial<UnifiedProfitRecord>` for updates
- Full TypeScript support

### ✅ **Flexible Backend**
- PHP validates allowed fields only
- Ignores unknown fields
- Logs for debugging
- Proper error handling

## 🧪 **Testing Example**

When user edits **Operating Q2** from 65000 → 70000:

```typescript
// What gets sent to backend:
{
  id: 5,
  company_id: 11,
  client_id: 1,
  program_id: 1, 
  cohort_id: 1,
  year_: 2026,
  operating_q1: 60000,
  operating_q2: 70000,  // ← Changed
  operating_q3: 70000,
  operating_q4: 75000,
  operating_total: 275000,  // ← Recalculated
  operating_margin: 62      // ← Recalculated
}
```

**Database result:** Only operating fields updated, gross and npbt unchanged! ✨

## 🔧 **Backend Security**

The PHP now validates all fields:
```php
$allowedFields = [
  'company_id', 'client_id', 'program_id', 'cohort_id', 'year_',
  'gross_q1', 'gross_q2', 'gross_q3', 'gross_q4', 'gross_total', 'gross_margin',
  'operating_q1', 'operating_q2', 'operating_q3', 'operating_q4', 'operating_total', 'operating_margin', 
  'npbt_q1', 'npbt_q2', 'npbt_q3', 'npbt_q4', 'npbt_total', 'npbt_margin',
  'unit', 'notes', 'title', 'status_id', 'updated_by'
];
```

This prevents any unauthorized field updates and maintains data security! 🔒
