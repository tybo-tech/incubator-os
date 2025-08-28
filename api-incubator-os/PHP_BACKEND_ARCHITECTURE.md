# 📚 PHP Backend Architecture Documentation

## 🏗️ **Project Structure**

```
api-incubator-os/
├── config/
│   ├── Database.php       # PDO connection class
│   └── headers.php        # CORS headers
├── models/
│   ├── Company.php        # Company business logic
│   ├── Categories.php     # Categories business logic
│   └── [Other].php        # Additional model classes
└── api-nodes/
    ├── company/
    │   ├── add-company.php
    │   ├── get-company.php
    │   └── list-companies.php
    ├── category/
    │   ├── add-category.php
    │   └── list-categories.php
    └── [other-endpoints]/
```

---

## 🎯 **Architecture Patterns**

### **1. Model Classes (Business Logic Layer)**
- **Location**: `models/`
- **Purpose**: Encapsulate database operations and business rules
- **Pattern**: Constructor injection with PDO
- **Naming**: PascalCase (e.g., `Company`, `Categories`)

#### **Model Class Template:**
```php
<?php
declare(strict_types=1);

final class ModelName
{
    private PDO $conn;
    
    // Define writable fields for security
    private const WRITABLE = [
        'field1', 'field2', 'field3'
    ];

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    // CRUD methods with proper type hints
    public function add(array $data): array { /* ... */ }
    public function update(int $id, array $data): ?array { /* ... */ }
    public function getById(int $id): ?array { /* ... */ }
    public function delete(int $id): bool { /* ... */ }
    
    // Business logic methods
    public function customBusinessMethod(/* params */): mixed { /* ... */ }
    
    // Private helper methods
    private function filterWritable(array $data): array { /* ... */ }
    private function castEntity(array $row): array { /* ... */ }
}
```

### **2. API Endpoints (HTTP Layer)**
- **Location**: `api-nodes/{resource}/`
- **Purpose**: Handle HTTP requests/responses
- **Pattern**: Include model → Instantiate → Call method → Return JSON
- **Naming**: kebab-case (e.g., `add-company.php`, `list-categories.php`)

#### **Endpoint Template:**
```php
<?php
include_once '../../config/Database.php';
include_once '../../models/ModelName.php';
include_once '../../config/headers.php';

// Parse input based on HTTP method
$data = json_decode(file_get_contents("php://input"), true);
$id = $_GET['id'] ?? null; // For GET parameters

try {
    // Database connection
    $database = new Database();
    $db = $database->connect();
    
    // Model instantiation
    $model = new ModelName($db);
    
    // Business logic call
    $result = $model->methodName($data);
    
    // Success response
    echo json_encode($result);
    
} catch (Exception $e) {
    // Error handling
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
```

---

## 🗄️ **Database Schema Patterns**

### **Enhanced categories_item Table**
```sql
CREATE TABLE categories_item (
  id                 BIGINT PRIMARY KEY AUTO_INCREMENT,
  cohort_id          BIGINT NOT NULL,           -- The specific cohort
  program_id         BIGINT NOT NULL,           -- Denormalized for performance
  client_id          BIGINT NULL,               -- Denormalized for filtering
  company_id         BIGINT NOT NULL,           -- The participating company
  status             ENUM('active','completed','withdrawn') DEFAULT 'active',
  joined_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  left_at            DATETIME NULL,
  notes              TEXT NULL,
  added_by_user_id   BIGINT NULL,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX ix_ci_cohort   (cohort_id),
  INDEX ix_ci_program  (program_id),
  INDEX ix_ci_client   (client_id),
  INDEX ix_ci_company  (company_id),
  INDEX ix_ci_status   (status),
  INDEX ix_ci_prog_co  (program_id, company_id),
  INDEX ix_ci_coh_co   (cohort_id, company_id)
);
```

---

## 🛠️ **Implementation Standards**

### **Model Class Requirements:**
1. **Type Safety**: Use `declare(strict_types=1)` and proper type hints
2. **Security**: Define `WRITABLE` constants for user-modifiable fields
3. **Error Handling**: Use exceptions for business rule violations
4. **Consistency**: Standard CRUD method signatures
5. **Validation**: Input validation in model methods

### **Endpoint Requirements:**
1. **Include Order**: Database → Model → Headers
2. **Error Handling**: Try-catch with proper HTTP status codes
3. **JSON Response**: Always return JSON (success or error)
4. **Input Parsing**: Handle both JSON body and query parameters
5. **Security**: Never expose internal errors to client

### **Naming Conventions:**
- **Models**: PascalCase (`Company`, `CategoryItem`)
- **Methods**: camelCase (`addCompany`, `getById`)
- **Endpoints**: kebab-case (`add-company.php`, `list-cohort-companies.php`)
- **Database**: snake_case (`cohort_id`, `joined_at`)

---

## 🔄 **Common Patterns**

### **1. CRUD Operations**
```php
// CREATE
public function add(array $data): array

// READ
public function getById(int $id): ?array
public function list(array $filters = []): array

// UPDATE  
public function update(int $id, array $data): ?array

// DELETE
public function delete(int $id): bool
```

### **2. Business Logic Methods**
```php
// Relationship management
public function attachCompany(int $cohortId, int $companyId): array
public function detachCompany(int $cohortId, int $companyId): bool

// Complex queries
public function getStatistics(int $categoryId): array
public function getBreadcrumb(int $categoryId): array

// Validation/Business Rules
public function validateHierarchy(string $type, ?int $parentId): void
```

### **3. Error Handling**
```php
// Model level - throw exceptions
if (!$this->isValidHierarchy($type, $parentId)) {
    throw new InvalidArgumentException("Invalid category hierarchy");
}

// Endpoint level - catch and return HTTP errors
try {
    $result = $model->method($data);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
```

---

## 📋 **Development Checklist**

### **Before Creating New Endpoints:**
- [ ] Is there a corresponding model class?
- [ ] Are the CRUD operations needed?
- [ ] What business rules apply?
- [ ] What indexes are needed for performance?

### **Model Class Checklist:**
- [ ] `declare(strict_types=1)` at top
- [ ] PDO dependency injection in constructor
- [ ] `WRITABLE` constant defined
- [ ] Proper type hints on all methods
- [ ] Input validation in methods
- [ ] Consistent return types

### **Endpoint Checklist:**
- [ ] Proper includes (Database, Model, Headers)
- [ ] Input parsing (JSON body + query params)
- [ ] Try-catch error handling
- [ ] Proper HTTP status codes
- [ ] JSON response format

---

## 🎯 **Next Implementation Steps**

### ✅ **COMPLETED:**
1. **CategoryItem Model** - Complete company-cohort relationship management
2. **Enhanced Categories Model** - Integration with CategoryItem for company operations  
3. **Updated Endpoints** - Following proper architecture patterns:
   - `attach-company.php` - Enhanced with metadata support
   - `detach-company.php` - Using CategoryItem model
   - `list-companies-in-cohort.php` - With status filtering
   - `get-category-statistics.php` - Enhanced statistics with participation data
   - `get-company-participation.php` - NEW: Company's full program history
   - `update-assignment.php` - NEW: Manage assignment lifecycle

### 🔄 **CURRENT ARCHITECTURE:**
- **Categories Model** → Hierarchical structure (Client→Program→Cohort)
- **CategoryItem Model** → Company participation management  
- **Enhanced Schema** → Denormalized fields for performance
- **Proper Endpoints** → Following documented patterns

### 📊 **Enhanced Features:**
- **Multi-Program Participation** - Companies can join multiple programs
- **Lifecycle Management** - Track joined_at, left_at, status
- **Denormalized Performance** - program_id, client_id for fast queries
- **Rich Statistics** - Active/completed/withdrawn counts
- **Participation History** - Complete company journey tracking

This architecture ensures:
- ✅ **Separation of Concerns** (Models vs Endpoints)
- ✅ **Type Safety** and **Security**  
- ✅ **Consistent Patterns** across the codebase
- ✅ **Maintainable** and **Scalable** structure
- ✅ **Enhanced Business Logic** for incubation management
