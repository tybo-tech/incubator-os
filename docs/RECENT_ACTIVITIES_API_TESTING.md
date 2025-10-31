# Recent Activities API Testing Documentation

## Environment Setup
Podman/Docker environment running on `http://localhost:8080`

## Recent Activities API Testing

The Recent Activities endpoints follow the established API structure pattern used throughout the application.

### Endpoint Structure Pattern

✅ **Correct Structure (Following Existing Pattern):**
```php
<?php
include_once '../../config/Database.php';
include_once '../../models/RecentActivities.php';

try {
    $database = new Database();
    $db = $database->connect();
    $recentActivities = new RecentActivities($db);
    
    // Query parameter handling
    $module = $_GET['module'] ?? null;
    $limit = min(100, max(1, (int)($_GET['limit'] ?? 20)));
    
    // Use model methods
    $activities = $recentActivities->getActivities($filters);
    
    echo json_encode([
        'success' => true,
        'data' => $activities
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
```

❌ **Incorrect Structure (Old Pattern):**
```php
<?php
// DON'T DO THIS - Headers are handled by Database connection
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Content-Type: application/json');

require_once '../../config/database.php';  // Wrong case
require_once '../../common/cors.php';      // Not needed

// Custom service classes instead of using models
class RecentActivitiesService {
    // Complex direct SQL instead of model methods
}
?>
```

---

## API Endpoint Testing (PowerShell)

### 1. Get Recent Activities (All Types)
**Endpoint:** `/api-nodes/dashboard/get-recent-activities.php`

#### Basic List
```powershell
# Get recent activities (all types)
$response = Invoke-RestMethod -Uri "http://localhost:8080/api-nodes/dashboard/get-recent-activities.php?limit=5" -Method GET
$response.pagination  # Check pagination info
```

#### Filter by Module
```powershell
# Financial data activities only
$response = Invoke-RestMethod -Uri "http://localhost:8080/api-nodes/dashboard/get-recent-activities.php?module=company_financial_yearly_stats&limit=3" -Method GET
$response.data | Select-Object id, company_id, description, activity_date
```

#### Filter by Company
```powershell
# Activities for specific company
$response = Invoke-RestMethod -Uri "http://localhost:8080/api-nodes/dashboard/get-recent-activities.php?company_id=29&limit=5" -Method GET
$response.data
```

#### Filter by Action Type
```powershell
# Only creation activities
$response = Invoke-RestMethod -Uri "http://localhost:8080/api-nodes/dashboard/get-recent-activities.php?action=created&limit=3" -Method GET
$response.data | Select-Object description, action, activity_date
```

**Supported Parameters:**
- `module` - Filter by activity module (e.g., "company_financial_yearly_stats")
- `company_id` - Filter by specific company ID
- `user_id` - Filter by user who performed the action
- `action` - Filter by action type (created, updated, deleted)
- `start_date` / `end_date` - Date range filtering
- `limit` - Items per page (default: 20, max: 100)
- `offset` - Pagination offset

### 2. Get Categorized Activities
**Endpoint:** `/api-nodes/dashboard/recent-activities.php`

```powershell
# Recent revenue activities
$response = Invoke-RestMethod -Uri "http://localhost:8080/api-nodes/dashboard/recent-activities.php?type=recent_revenue&limit=5" -Method GET
$response.result.data

# Recent company updates
$response = Invoke-RestMethod -Uri "http://localhost:8080/api-nodes/dashboard/recent-activities.php?type=recent_companies&limit=3" -Method GET
$response.result.pagination

# Recent cost activities
$response = Invoke-RestMethod -Uri "http://localhost:8080/api-nodes/dashboard/recent-activities.php?type=recent_costs&limit=5" -Method GET
```

**Supported Activity Types:**
- `recent_revenue` - Financial revenue activities
- `recent_costs` - Financial cost activities  
- `recent_companies` - Company profile activities
- `recent_compliance` - Compliance-related activities

---

## Response Format Examples

### Enhanced Recent Activities Response
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "company_id": 29,
      "user_id": 65,
      "module": "company_financial_yearly_stats",
      "action": "created", 
      "reference_id": 208,
      "description": "Admin captured yearly financials for SmaEve Designs",
      "activity_date": "2025-10-30 09:41:49",
      "created_at": "2025-10-25 02:57:11",
      "company_name": "SmaEve Designs",
      "action_type": "Created"
    }
  ],
  "pagination": {
    "total": 50,
    "limit": 5,
    "offset": 0,
    "current_page": 1,
    "total_pages": 10,
    "has_more": true
  }
}
```

### Categorized Activities Response
```json
{
  "success": true,
  "type": "recent_revenue",
  "result": {
    "data": [...],
    "pagination": {
      "total": 25,
      "limit": 5,
      "offset": 0,
      "has_more": true
    }
  }
}
```

---

## Testing Tips

1. **Follow Established Patterns**: Use `include_once` not `require_once`, use proper Database class
2. **No Manual Headers**: Headers are handled by the Database connection
3. **Use Model Methods**: Leverage existing model functionality instead of custom SQL
4. **Test Pagination**: Always check pagination metadata for large datasets
5. **Filter Testing**: Test different combinations of filters
6. **Error Handling**: Test with invalid parameters to verify error responses

## Quick Test Sequence
```powershell
# 1. Basic recent activities
$basic = Invoke-RestMethod -Uri "http://localhost:8080/api-nodes/dashboard/get-recent-activities.php?limit=3" -Method GET

# 2. Financial activities only
$financial = Invoke-RestMethod -Uri "http://localhost:8080/api-nodes/dashboard/get-recent-activities.php?module=company_financial_yearly_stats&limit=2" -Method GET

# 3. Categorized recent revenue
$revenue = Invoke-RestMethod -Uri "http://localhost:8080/api-nodes/dashboard/recent-activities.php?type=recent_revenue&limit=3" -Method GET

# 4. Check pagination
$basic.pagination
$financial.pagination  
$revenue.result.pagination
```

## Integration Status ✅

- ✅ **Endpoint Structure**: Fixed to follow established patterns
- ✅ **Headers**: Removed manual headers (handled by Database class)
- ✅ **Model Usage**: Using RecentActivities model properly
- ✅ **Response Format**: Consistent with other API endpoints
- ✅ **Testing**: Verified with PowerShell commands
- ✅ **Frontend Integration**: Works with Angular dashboard component
- ✅ **Activity Logging**: Automatic side-effect logging in CompanyFinancialYearlyStats
