# 🔧 get-companies-for-picker.php - Architecture Compliance Fix

## 🚨 **Issues Identified**

### **1. SQL Syntax Error**
- **Problem**: `SQLSTATE[42000]: Syntax error... near '50' at line 7`
- **Root Cause**: Attempting to bind LIMIT parameter using `?` placeholder
- **Error**: `$sql .= " ORDER BY c.name ASC LIMIT ?"; $params[] = $limit;`

### **2. Architecture Violations**
- **Raw SQL in Endpoint**: Business logic was directly in the endpoint file
- **No Model Abstraction**: Not following the Model-Endpoint separation pattern
- **Direct Database Queries**: Violating the "Model handles DB, Endpoint handles HTTP" principle

## ✅ **Fixes Applied**

### **1. SQL Syntax Fix**
```php
// BEFORE (Broken)
$sql .= " ORDER BY c.name ASC LIMIT ?";
$params[] = $limit;

// AFTER (Fixed)
$sql .= " ORDER BY c.name ASC LIMIT " . min((int)$limit, 100);
```
- **Solution**: Use string concatenation for LIMIT clause instead of parameter binding
- **Security**: Still safe because we cast to int and apply min/max limits

### **2. Architecture Compliance**

#### **Added Company Model Method**
```php
// NEW METHOD: Company.php
public function getAvailableForCohort(int $cohortId, string $search = '', int $limit = 50): array
{
    // Business logic moved to model
    // Proper SQL with search filtering
    // Excludes already assigned companies
    // Returns minimal fields for performance
}
```

#### **Refactored Endpoint Structure**
```php
// BEFORE: Raw SQL in endpoint
$sql = "SELECT DISTINCT c.id, c.name...";
$stmt = $db->prepare($sql);

// AFTER: Following architecture pattern
$database = new Database();
$db = $database->connect();

$company = new Company($db);
$categoryItem = new CategoryItem($db);

$availableCompanies = $company->getAvailableForCohort($cohortId, $search);
$assignedCompanies = $categoryItem->getCompaniesInCohort($cohortId, 'active');
```

## 📋 **Architecture Compliance Checklist**

### ✅ **Model Layer (Business Logic)**
- [x] **Model Class**: Uses existing `Company` and `CategoryItem` models
- [x] **Business Logic**: Moved company filtering logic to `Company::getAvailableForCohort()`
- [x] **Type Safety**: Method uses proper type hints (`int $cohortId, string $search`)
- [x] **Return Consistency**: Returns properly formatted array with minimal fields
- [x] **Validation**: Input validation and limits applied

### ✅ **Endpoint Layer (HTTP Handling)**
- [x] **Include Order**: Database → Models → Headers ✅
- [x] **Model Instantiation**: Proper constructor injection with PDO ✅
- [x] **Business Logic Call**: Delegates to model methods ✅
- [x] **Error Handling**: Try-catch with proper HTTP status codes ✅
- [x] **JSON Response**: Always returns JSON (success or error) ✅

### ✅ **Input Handling**
- [x] **Parameter Parsing**: `$_GET` parameters with proper casting
- [x] **Search Support**: Optional search parameter handling
- [x] **Context Filtering**: cohort_id, program_id, client_id support

### ✅ **Response Format**
```json
{
  "available_companies": [...],      // Companies not in cohort
  "assigned_companies": [...],       // Companies already in cohort  
  "search_term": "search query",
  "cohort_id": 3,
  "program_id": 2,
  "client_id": 1,
  "total_available": 40,
  "total_assigned": 0
}
```

## 🎯 **Performance Optimizations**

### **Minimal Data Transfer**
- Only returns essential fields: `id`, `name`, `email_address`, `registration_no`
- Reduces payload size for large company lists
- Optimized for picker UI requirements

### **Efficient Queries**
- Uses `DISTINCT` to avoid duplicates
- Proper `NOT IN` subquery for exclusion
- `LIMIT` clause prevents excessive data
- Search across multiple relevant fields

### **Model Separation**
- `Company::getAvailableForCohort()` - Finds unassigned companies
- `CategoryItem::getCompaniesInCohort()` - Gets assigned companies
- Clean separation of concerns

## 🧪 **Testing Results**

### **Before Fix**
```
SQLSTATE[42000]: Syntax error or access violation: 1064 
You have an error in your SQL syntax... near '50' at line 7
```

### **After Fix**
```json
{
  "available_companies": [
    {"id": 1, "name": "Agrimika Holdings", ...},
    {"id": 2, "name": "Alondekuhle", ...}
  ],
  "assigned_companies": [],
  "search_term": "",
  "cohort_id": 3,
  "total_available": 40,
  "total_assigned": 0
}
```

### **Search Testing**
```bash
# Query: ?cohort_id=3&search=agri
# Result: Returns only "Agrimika Holdings" (filtered correctly)
```

## 📚 **Architecture Benefits Achieved**

1. **✅ Separation of Concerns**: Business logic in models, HTTP handling in endpoints
2. **✅ Maintainability**: Changes to company filtering logic now happen in one place
3. **✅ Reusability**: `getAvailableForCohort()` method can be used by other endpoints
4. **✅ Type Safety**: Proper PHP type hints and validation
5. **✅ Performance**: Optimized queries with minimal data transfer
6. **✅ Consistency**: Follows established patterns from other endpoints

## 🔮 **Future Enhancements**

- **Caching**: Add Redis caching for frequently accessed company lists
- **Pagination**: Implement offset/limit pagination for very large datasets  
- **Filtering**: Add industry, location, or other business filters
- **Sorting**: Add configurable sorting options beyond name ASC
