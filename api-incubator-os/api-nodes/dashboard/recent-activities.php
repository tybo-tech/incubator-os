<?php
include_once '../../config/Database.php';
include_once '../../models/RecentActivities.php';
include_once '../../models/CompanyFinancialYearlyStats.php';

try {
    $database = new Database();
    $db = $database->connect();
    $recentActivities = new RecentActivities($db);
    $financialStats = new CompanyFinancialYearlyStats($db);

    // Get query parameters
    $type = $_GET['type'] ?? 'recent_revenue';
    $limit = min(50, max(1, (int)($_GET['limit'] ?? 20))); // Max 50, min 1
    $offset = max(0, (int)($_GET['offset'] ?? 0));

    // For enhanced data, use the financial stats model directly
    if ($type === 'recent_revenue_enhanced' || $type === 'recent_financial_updates') {
        $enhancedData = $financialStats->getRecentHighValueUpdates($limit);
        
        $result = [
            'data' => array_map(function($record) {
                return [
                    'id' => $record['id'],
                    'company_id' => $record['company_id'],
                    'company_name' => $record['company_name'],
                    'total_amount' => number_format((float)$record['total_amount'], 2),
                    'total_amount_raw' => (float)$record['total_amount'],
                    'updated_at' => $record['updated_at'],
                    'financial_year' => $record['financial_year_name'] ?? 'Unknown',
                    'entry_type' => $record['entry_type'],
                    'action_type' => 'Updated',
                    'notes' => ucfirst($record['entry_type']) . ' updated for ' . $record['company_name'],
                    'reference_id' => $record['id']
                ];
            }, $enhancedData),
            'pagination' => [
                'total' => count($enhancedData),
                'limit' => $limit,
                'offset' => $offset,
                'has_more' => false
            ]
        ];

        echo json_encode([
            'success' => true,
            'type' => $type,
            'result' => $result
        ]);
        exit;
    }

    // Build filters array based on type
    $filters = [];
    $filters['limit'] = $limit;

    // Set appropriate module and action filters based on type
    switch ($type) {
        case 'recent_revenue':
            $filters['module'] = 'company_financial_yearly_stats';
            $filters['action'] = 'created';
            break;
        case 'recent_costs':
            $filters['module'] = 'company_financial_yearly_stats';
            $filters['action'] = 'updated';
            break;
        case 'recent_companies':
            $filters['module'] = 'company_data';
            break;
        case 'recent_compliance':
            $filters['module'] = 'compliance';
            break;
        default:
            $filters['module'] = 'company_financial_yearly_stats';
    }

    // Get activities using the RecentActivities model
    $activities = $recentActivities->getActivities($filters);

    // Get company names for enhancement
    $companyIds = array_unique(array_column($activities, 'company_id'));
    $companyNames = [];

    if (!empty($companyIds)) {
        $placeholders = str_repeat('?,', count($companyIds) - 1) . '?';
        $sql = "SELECT id, name as company_name FROM companies WHERE id IN ($placeholders)";
        $stmt = $db->prepare($sql);
        $stmt->execute(array_values($companyIds)); // Make sure we have sequential array keys
        $companies = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($companies as $company) {
            $companyNames[$company['id']] = $company['company_name'];
        }
    }

    // Transform data for frontend compatibility
    $transformedData = [];
    foreach ($activities as $activity) {
        // Extract company name from description or use fetched company name
        $companyName = $companyNames[$activity['company_id']] ?? 'Unknown Company';

        // Try to extract company name from description if not found in companies table
        if ($companyName === 'Unknown Company' && preg_match('/for (.+)$/', $activity['description'], $matches)) {
            $companyName = trim($matches[1]);
        }

        $transformedData[] = [
            'id' => $activity['id'],
            'company_id' => $activity['company_id'],
            'company_name' => $companyName,
            'total_amount' => null, // Will be populated from metadata if available
            'updated_at' => $activity['activity_date'],
            'created_at' => $activity['created_at'],
            'action_type' => $activity['action'] === 'created' ? 'Created' : 'Updated',
            'notes' => $activity['description'],
            'financial_year' => null, // Can be extracted from metadata
            'affected_period' => null, // Can be extracted from metadata
            'reference_id' => $activity['reference_id'] // Include reference for potential enhancement
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
