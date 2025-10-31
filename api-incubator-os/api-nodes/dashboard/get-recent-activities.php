<?php
include_once '../../config/Database.php';
include_once '../../models/RecentActivities.php';

try {
    $database = new Database();
    $db = $database->connect();
    $recentActivities = new RecentActivities($db);

    // Get query parameters
    $module = $_GET['module'] ?? null;
    $companyId = isset($_GET['company_id']) ? (int)$_GET['company_id'] : null;
    $userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;
    $action = $_GET['action'] ?? null;
    $limit = min(100, max(1, (int)($_GET['limit'] ?? 20))); // Max 100, min 1, default 20
    $offset = max(0, (int)($_GET['offset'] ?? 0));

    // Date range filtering
    $startDate = $_GET['start_date'] ?? null;
    $endDate = $_GET['end_date'] ?? null;

    // Build filters array
    $filters = [];
    if ($module) $filters['module'] = $module;
    if ($companyId) $filters['company_id'] = $companyId;
    if ($userId) $filters['user_id'] = $userId;
    if ($action) $filters['action'] = $action;
    if ($startDate && $endDate) {
        $filters['start_date'] = $startDate;
        $filters['end_date'] = $endDate;
    }
    $filters['limit'] = $limit;

    // Get activities
    $activities = $recentActivities->getActivities($filters);

    // Get total count for pagination (without limit)
    $countFilters = $filters;
    unset($countFilters['limit']);
    $allActivities = $recentActivities->getActivities($countFilters);
    $total = count($allActivities);

    // Enhanced activity data with company names and better formatting
    $enhancedActivities = [];
    foreach ($activities as $activity) {
        $enhanced = $activity;

        // Get company name if company_id exists
        if ($activity['company_id']) {
            try {
                $companyStmt = $db->prepare("SELECT company_name FROM companies WHERE id = ?");
                $companyStmt->execute([$activity['company_id']]);
                $company = $companyStmt->fetch(PDO::FETCH_ASSOC);
                $enhanced['company_name'] = $company['company_name'] ?? 'Unknown Company';
            } catch (Exception $e) {
                $enhanced['company_name'] = 'Unknown Company';
            }
        }

        // Format timestamps for frontend
        $enhanced['activity_date'] = $activity['activity_date'];
        $enhanced['created_at'] = $activity['created_at'];

        // Add human-readable action type
        $enhanced['action_type'] = ucfirst($activity['action']);

        $enhancedActivities[] = $enhanced;
    }

    // Pagination info
    $hasMore = ($offset + $limit) < $total;
    $currentPage = floor($offset / $limit) + 1;
    $totalPages = ceil($total / $limit);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $enhancedActivities,
        'pagination' => [
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
            'current_page' => $currentPage,
            'total_pages' => $totalPages,
            'has_more' => $hasMore
        ],
        'filters_applied' => [
            'module' => $module,
            'company_id' => $companyId,
            'user_id' => $userId,
            'action' => $action,
            'date_range' => $startDate && $endDate ? "$startDate to $endDate" : null
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug_info' => [
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]
    ]);
}
?>
