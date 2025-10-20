<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../../config/database.php';

try {
    $database = new Database();
    $db = $database->connect();

    $companyId = $_GET['company_id'] ?? null;
    $category = $_GET['category'] ?? null;
    $limit = (int)($_GET['limit'] ?? 50);

    // Base query
    $sql = "SELECT * FROM action_items WHERE context_type = 'swot'";
    $params = [];

    // Add filters
    if ($companyId) {
        $sql .= " AND company_id = ?";
        $params[] = $companyId;
    }

    if ($category) {
        $sql .= " AND category = ?";
        $params[] = $category;
    }

    $sql .= " ORDER BY company_id, category, created_at DESC LIMIT " . (int)$limit;

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $actionItems = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get summary statistics
    $summarySQL = "
        SELECT
            COUNT(*) as total_items,
            COUNT(DISTINCT company_id) as companies_count,
            COUNT(DISTINCT category) as categories_count,
            SUM(CASE WHEN is_complete = 1 THEN 1 ELSE 0 END) as completed_count,
            AVG(progress) as avg_progress,
            category,
            COUNT(*) as category_count
        FROM action_items
        WHERE context_type = 'swot'";

    if ($companyId) {
        $summarySQL .= " AND company_id = ?";
    }

    $summarySQL .= " GROUP BY category";

    $summaryStmt = $db->prepare($summarySQL);
    if ($companyId) {
        $summaryStmt->execute([$companyId]);
    } else {
        $summaryStmt->execute();
    }
    $categorySummary = $summaryStmt->fetchAll(PDO::FETCH_ASSOC);

    // Overall totals
    $totalSQL = "
        SELECT
            COUNT(*) as total_items,
            COUNT(DISTINCT company_id) as companies_count,
            SUM(CASE WHEN is_complete = 1 THEN 1 ELSE 0 END) as completed_count,
            AVG(progress) as avg_progress
        FROM action_items
        WHERE context_type = 'swot'";

    if ($companyId) {
        $totalSQL .= " AND company_id = ?";
    }

    $totalStmt = $db->prepare($totalSQL);
    if ($companyId) {
        $totalStmt->execute([$companyId]);
    } else {
        $totalStmt->execute();
    }
    $totals = $totalStmt->fetch(PDO::FETCH_ASSOC);

    $response = [
        'success' => true,
        'data' => [
            'action_items' => $actionItems,
            'summary' => [
                'totals' => $totals,
                'by_category' => $categorySummary,
                'filters_applied' => [
                    'company_id' => $companyId,
                    'category' => $category,
                    'limit' => $limit
                ]
            ]
        ],
        'message' => 'SWOT action items retrieved successfully'
    ];

} catch (Exception $e) {
    $response = [
        'success' => false,
        'error' => $e->getMessage(),
        'debug_info' => [
            'company_id' => $_GET['company_id'] ?? null,
            'category' => $_GET['category'] ?? null,
            'timestamp' => date('Y-m-d H:i:s')
        ]
    ];
    http_response_code(500);
}

echo json_encode($response, JSON_PRETTY_PRINT);
?>
