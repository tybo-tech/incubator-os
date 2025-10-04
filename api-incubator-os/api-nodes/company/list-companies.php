<?php
include_once '../../config/Database.php';
include_once '../../models/Company.php';

try {
    $database = new Database();
    $db = $database->connect();
    $company = new Company($db);

    // Build options from query parameters
    $filters = [];

    // Pagination
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = max(1, min(1000, (int)($_GET['limit'] ?? 50)));
    $offset = ($page - 1) * $limit;

    // Filtering
    if (isset($_GET['industry_id']) && $_GET['industry_id'] !== '') {
        $filters['industry_id'] = (int)$_GET['industry_id'];
    }

    if (isset($_GET['search']) && trim($_GET['search']) !== '') {
        $filters['q'] = trim($_GET['search']);
    }

    if (isset($_GET['city']) && trim($_GET['city']) !== '') {
        $filters['city'] = trim($_GET['city']);
    }

    if (isset($_GET['bbbee_level']) && trim($_GET['bbbee_level']) !== '') {
        $filters['bbbee_level'] = trim($_GET['bbbee_level']);
    }

    if (isset($_GET['has_tax_clearance'])) {
        $filters['has_tax_clearance'] = $_GET['has_tax_clearance'] === '1' || $_GET['has_tax_clearance'] === 'true';
    }

    // Get total count for pagination
    $whereConditions = [];
    $countParams = [];

    if (isset($filters['industry_id'])) {
        $whereConditions[] = "c.industry_id = ?";
        $countParams[] = $filters['industry_id'];
    }
    if (isset($filters['q'])) {
        $whereConditions[] = "(c.name LIKE ? OR c.registration_no LIKE ? OR c.city LIKE ?)";
        $searchTerm = '%' . $filters['q'] . '%';
        $countParams[] = $searchTerm;
        $countParams[] = $searchTerm;
        $countParams[] = $searchTerm;
    }
    if (isset($filters['city'])) {
        $whereConditions[] = "c.city = ?";
        $countParams[] = $filters['city'];
    }
    if (isset($filters['bbbee_level'])) {
        $whereConditions[] = "c.bbbee_level = ?";
        $countParams[] = $filters['bbbee_level'];
    }
    if (isset($filters['has_tax_clearance'])) {
        $whereConditions[] = "c.has_tax_clearance = ?";
        $countParams[] = $filters['has_tax_clearance'] ? 1 : 0;
    }

    $whereClause = $whereConditions ? " WHERE " . implode(' AND ', $whereConditions) : "";

    $totalStmt = $db->prepare("
        SELECT COUNT(*) as total
        FROM companies c
        LEFT JOIN industries i ON c.industry_id = i.id
        $whereClause
    ");

    $totalStmt->execute($countParams);
    $total = (int)$totalStmt->fetch(PDO::FETCH_ASSOC)['total'];

    // Get companies with industry information
    $sql = "
        SELECT
            c.*,
            i.name as industry_name,
            i.slug as industry_slug
        FROM companies c
        LEFT JOIN industries i ON c.industry_id = i.id
        $whereClause
        ORDER BY c.name ASC
        LIMIT $limit OFFSET $offset";

    $stmt = $db->prepare($sql);
    $stmt->execute($countParams);

    $companies = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        // Cast company data properly using the Company model method
        $companyData = [
            'id' => (int)$row['id'],
            'name' => $row['name'],
            'registration_no' => $row['registration_no'],
            'bbbee_level' => $row['bbbee_level'],
            'cipc_status' => $row['cipc_status'],
            'service_offering' => $row['service_offering'],
            'description' => $row['description'],
            'city' => $row['city'],
            'suburb' => $row['suburb'],
            'address' => $row['address'],
            'postal_code' => $row['postal_code'],
            'business_location' => $row['business_location'],
            'contact_number' => $row['contact_number'],
            'email_address' => $row['email_address'],
            'trading_name' => $row['trading_name'],
            'youth_owned' => (bool)$row['youth_owned'],
            'black_ownership' => (bool)$row['black_ownership'],
            'black_women_ownership' => (bool)$row['black_women_ownership'],
            'youth_owned_text' => $row['youth_owned_text'],
            'black_ownership_text' => $row['black_ownership_text'],
            'black_women_ownership_text' => $row['black_women_ownership_text'],
            'compliance_notes' => $row['compliance_notes'],
            'has_valid_bbbbee' => (bool)$row['has_valid_bbbbee'],
            'has_tax_clearance' => (bool)$row['has_tax_clearance'],
            'is_sars_registered' => (bool)$row['is_sars_registered'],
            'has_cipc_registration' => (bool)$row['has_cipc_registration'],
            'bbbee_valid_status' => $row['bbbee_valid_status'],
            'bbbee_expiry_date' => $row['bbbee_expiry_date'],
            'tax_valid_status' => $row['tax_valid_status'],
            'tax_pin_expiry_date' => $row['tax_pin_expiry_date'],
            'vat_number' => $row['vat_number'],
            'turnover_estimated' => $row['turnover_estimated'] ? (float)$row['turnover_estimated'] : null,
            'turnover_actual' => $row['turnover_actual'] ? (float)$row['turnover_actual'] : null,
            'permanent_employees' => (int)$row['permanent_employees'],
            'temporary_employees' => (int)$row['temporary_employees'],
            'locations' => $row['locations'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
            'industry_id' => $row['industry_id'] ? (int)$row['industry_id'] : null,
            'contact_person' => $row['contact_person']
        ];

        // Add industry information
        if ($row['industry_name']) {
            $companyData['industry'] = [
                'id' => $companyData['industry_id'],
                'name' => $row['industry_name'],
                'slug' => $row['industry_slug']
            ];
        }

        $companies[] = $companyData;
    }

    // Calculate pagination
    $pages = ceil($total / $limit);

    // Return response with pagination
    echo json_encode([
        'data' => $companies,
        'pagination' => [
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'pages' => $pages
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
