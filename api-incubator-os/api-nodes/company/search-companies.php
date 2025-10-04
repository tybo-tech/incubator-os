<?php
include_once '../../config/Database.php';
include_once '../../models/Company.php';

$filters = $_GET;
$limit = isset($filters['limit']) ? (int)$filters['limit'] : 20;
$offset = isset($filters['offset']) ? (int)$filters['offset'] : 0;
$page = isset($filters['page']) ? (int)$filters['page'] : 1;

// Calculate offset from page if page is provided
if (isset($filters['page']) && $page > 0) {
    $offset = ($page - 1) * $limit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $company = new Company($db);

    // Get the search results
    $companies = $company->search($filters, $limit, $offset);

    // Get total count for pagination
    $totalCount = $company->getSearchCount($filters);

    // Calculate pagination metadata
    $totalPages = (int)ceil($totalCount / $limit);
    $currentPage = $page;

    // Build response with pagination
    $response = [
        'data' => $companies,
        'pagination' => [
            'current_page' => $currentPage,
            'per_page' => $limit,
            'total' => $totalCount,
            'pages' => $totalPages,
            'has_more' => $currentPage < $totalPages,
            'has_prev' => $currentPage > 1
        ],
        'meta' => [
            'filters_applied' => array_filter($filters, function($value) {
                return !empty($value) && !in_array($value, ['limit', 'offset', 'page']);
            }),
            'timestamp' => date('c')
        ]
    ];

    echo json_encode($response);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
