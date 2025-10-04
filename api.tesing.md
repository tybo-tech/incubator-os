# API Testing Documentation

## Environment Setup
Podman/Docker environment running on `http://localhost:8080`

## Industry Management API Testing

### Angular Service Usage

The `IndustryService` provides type-safe methods that enforce proper parameter validation:

```typescript
// Inject the service
constructor(private industryService: IndustryService) {}

// Create industry with validation
const newIndustry: CreateIndustryRequest = {
  name: "Technology Consulting",
  description: "IT consulting and software development",
  parent_id: 25, // ICT industry ID
  is_active: true,
  display_order: 10,
  icon_class: "fa-solid fa-laptop-code",
  color_theme: "#2196f3",
  tags: ["consulting", "software", "IT"]
};

this.industryService.addIndustry(newIndustry).subscribe({
  next: (result) => console.log('Created:', result),
  error: (error) => console.error('Error:', error.message)
});

// Update industry with ID validation
const updates: UpdateIndustryRequest = {
  name: "Updated Technology Consulting",
  description: "Advanced IT solutions and consulting"
};

this.industryService.updateIndustry(43, updates).subscribe({
  next: (result) => console.log('Updated:', result),
  error: (error) => console.error('Error:', error.message)
});

// List with advanced filtering
const options: IndustryListOptions = {
  page: 1,
  limit: 20,
  with_hierarchy: true,
  is_active: true,
  search: "technology",
  order_by: "display_order",
  order_dir: "ASC"
};

this.industryService.listIndustries(options).subscribe({
  next: (response) => {
    console.log('Industries:', response.data);
    console.log('Pagination:', response.pagination);
  }
});

// Convenience methods
this.industryService.getActiveIndustries({ limit: 50 });
this.industryService.getRootIndustries({ with_hierarchy: true });
this.industryService.searchIndustries("tech");
this.industryService.getIndustriesWithHierarchy({ parent_id: 25 });
```

### Service Validation Features

The updated service enforces:
- ✅ **Required parameters**: ID validation, name validation
- ✅ **Parameter types**: Proper TypeScript interfaces
- ✅ **HTTP methods**: PUT for updates, GET for reads, POST for creates
- ✅ **Parameter limits**: Page size max 1000, page number minimum 1
- ✅ **Field validation**: Allowed order_by fields, proper boolean conversion
- ✅ **Error handling**: Descriptive error messages for validation failures
- ✅ **Backward compatibility**: Support for old method signatures

---

## Direct API Testing (PowerShell)

### 1. List Industries (GET)
**Endpoint:** `/api-nodes/industry/list-industries.php`

#### Basic List
```powershell
# Basic listing with pagination
$response = Invoke-RestMethod -Uri "http://localhost:8080/api-nodes/industry/list-industries.php?page=1&limit=5" -Method GET
$response | ConvertTo-Json -Depth 5
```

#### With Hierarchy Data
```powershell
# List with hierarchy information (children_count, companies_count, depth)
$response = Invoke-RestMethod -Uri "http://localhost:8080/api-nodes/industry/list-industries.php?page=1&limit=3&with_hierarchy=1" -Method GET
$response | ConvertTo-Json -Depth 10
```

#### Search Functionality
```powershell
# Search by industry name or description
$response = Invoke-RestMethod -Uri "http://localhost:8080/api-nodes/industry/list-industries.php?search=tech&limit=3" -Method GET
$response | ConvertTo-Json -Depth 5
```

#### Status Filtering
```powershell
# Filter by active status
$response = Invoke-RestMethod -Uri "http://localhost:8080/api-nodes/industry/list-industries.php?is_active=true&limit=2" -Method GET
$response.pagination  # Check pagination metadata
```

#### Advanced Query Parameters
```powershell
# Full parameter set
$response = Invoke-RestMethod -Uri "http://localhost:8080/api-nodes/industry/list-industries.php?page=1&limit=20&order_by=display_order&order_dir=ASC&with_hierarchy=1&is_active=true&search=finance" -Method GET
```

**Supported Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50, max: 1000)
- `parent_id` - Filter by parent industry ID
- `is_active` - Filter by status (true/false)
- `search` - Search in name, description, notes
- `order_by` - Sort field (id, name, display_order, created_at, updated_at)
- `order_dir` - Sort direction (ASC/DESC)
- `with_hierarchy` - Include hierarchy data (children_count, companies_count, depth)

### 2. Get Single Industry (GET)
**Endpoint:** `/api-nodes/industry/get-industry.php`

```powershell
# Get specific industry by ID
$response = Invoke-RestMethod -Uri "http://localhost:8080/api-nodes/industry/get-industry.php?id=43" -Method GET
$response | ConvertTo-Json -Depth 5
```

### 3. Create Industry (POST)
**Endpoint:** `/api-nodes/industry/add-industry.php`

```powershell
# Create new industry
$body = @{
  name = "Test Industry API"
  description = "Test industry created via PowerShell"
  is_active = $true
  display_order = 100
  icon_class = "fa-solid fa-building"
  color_theme = "#4a90e2"
  tags = @("test", "api", "new")
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:8080/api-nodes/industry/add-industry.php" -Method POST -Body $body -ContentType "application/json"
$response | ConvertTo-Json -Depth 3
```

**Supported Fields:**
- `name` (required) - Industry name
- `parent_id` - Parent industry ID for hierarchy
- `description` - Industry description
- `notes` - Additional notes
- `image_url` - Industry image URL
- `icon_class` - CSS icon class
- `color_theme` - Color theme hex code
- `background_theme` - Background CSS class
- `tags` - Array of tags
- `is_active` - Active status (boolean)
- `display_order` - Sort order (integer)
- `created_by` - Creator user ID

### 4. Update Industry (PUT)
**Endpoint:** `/api-nodes/industry/update-industry.php`

```powershell
# Update existing industry (ID can be in query parameter or JSON body)
$updateBody = @{
  name = "Updated Test Industry API"
  description = "Updated test industry via PowerShell"
  is_active = $true
  display_order = 200
  color_theme = "#e74c3c"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:8080/api-nodes/industry/update-industry.php?id=63" -Method PUT -Body $updateBody -ContentType "application/json"
$response.data | Select-Object name, description, display_order
```

### 5. Verify Updates
```powershell
# Verify the changes were applied
$verifyResponse = Invoke-RestMethod -Uri "http://localhost:8080/api-nodes/industry/get-industry.php?id=63" -Method GET
$verifyResponse.data | Select-Object name, description, display_order, color_theme
```

## Response Format
All endpoints return data in **INode format**:
```json
{
  "id": 43,
  "type": "industry", 
  "data": {
    "id": 43,
    "name": "Architecture",
    "slug": "architecture",
    "parent_id": 34,
    "description": "Architectural design...",
    "is_active": true,
    // ... other fields
  }
}
```

List endpoints include pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "pages": 3
  }
}
```

## Error Handling
Errors return HTTP status codes with JSON error messages:
```json
{
  "error": "Industry not found"
}
```

## Testing Tips
1. **Use ConvertTo-Json with appropriate depth** for readable output
2. **Check pagination metadata** when testing list endpoints
3. **Verify CRUD operations** by chaining create → read → update → read
4. **Test edge cases**: empty search, invalid IDs, missing required fields
5. **Test hierarchy features** with `with_hierarchy=1` parameter

## Quick Test Sequence
```powershell
# 1. List industries
$list = Invoke-RestMethod -Uri "http://localhost:8080/api-nodes/industry/list-industries.php?limit=3" -Method GET

# 2. Create industry  
$create = Invoke-RestMethod -Uri "http://localhost:8080/api-nodes/industry/add-industry.php" -Method POST -Body '{"name":"Test API","description":"Test"}' -ContentType "application/json"

# 3. Update industry
$update = Invoke-RestMethod -Uri "http://localhost:8080/api-nodes/industry/update-industry.php?id=$($create.id)" -Method PUT -Body '{"name":"Updated Test"}' -ContentType "application/json"

# 4. Get updated industry
$get = Invoke-RestMethod -Uri "http://localhost:8080/api-nodes/industry/get-industry.php?id=$($create.id)" -Method GET
```
