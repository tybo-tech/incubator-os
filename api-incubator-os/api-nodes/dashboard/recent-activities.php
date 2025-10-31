<?php
include_once '../../config/Database.php';
include_once '../../models/RecentActivities.php';

try {
    $database = new Database();
    $db = $database->connect();
    $recentActivities = new RecentActivities($db);

    // Get query parameters
    $type = $_GET['type'] ?? 'recent_revenue';
    $limit = min(50, max(1, (int)($_GET['limit'] ?? 20))); // Max 50, min 1
    $offset = max(0, (int)($_GET['offset'] ?? 0));

    // Build filters array based on type
    $filters = [];
    $filters['limit'] = $limit;

    // Set appropriate module and action filters based on type
    switch ($type) {
        case 'recent_revenue':
            $filters['module'] = 'financial_data';
            $filters['action'] = 'created';
            break;
        case 'recent_costs':
            $filters['module'] = 'financial_data';
            $filters['action'] = 'updated';
            break;
        case 'recent_companies':
            $filters['module'] = 'company_data';
            break;
        case 'recent_compliance':
            $filters['module'] = 'compliance';
            break;
        default:
            $filters['module'] = 'financial_data';
    }

    // Get activities using the RecentActivities model
    $activities = $recentActivities->getActivities($filters);

    // Transform data for frontend compatibility
    $transformedData = [];
    foreach ($activities as $activity) {
        $transformedData[] = [
            'id' => $activity['id'],
            'company_id' => $activity['company_id'],
            'company_name' => $activity['description'], // Will be enhanced with actual company names
            'total_amount' => null, // Will be populated from metadata if available
            'updated_at' => $activity['activity_date'],
            'created_at' => $activity['created_at'],
            'action_type' => $activity['action'] === 'created' ? 'Created' : 'Updated',
            'notes' => $activity['description'],
            'financial_year' => null, // Can be extracted from metadata
            'affected_period' => null // Can be extracted from metadata
        ];
    }

    // Get total count for pagination
    $totalActivities = $recentActivities->getActivities(['module' => $filters['module']]);
    $total = count($totalActivities);

    $result = [
        'data' => $transformedData,
        'pagination' => [
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
            'has_more' => ($offset + $limit) < $total
        ]
    ];

    echo json_encode([
        'success' => true,
        'type' => $type,
        'result' => $result
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
