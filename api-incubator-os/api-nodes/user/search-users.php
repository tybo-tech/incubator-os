<?php
include_once '../../config/Database.php';
include_once '../../models/User.php';

$filters = $_GET;
$page = isset($filters['page']) ? max(1, (int)$filters['page']) : 1;
$per_page = isset($filters['per_page']) ? max(1, min(100, (int)$filters['per_page'])) : 50;
$offset = ($page - 1) * $per_page;

try {
    $database = new Database();
    $db = $database->connect();
    $user = new User($db);

    // Get the search results and total count
    $users = $user->search($filters, $per_page, $offset);
    $total = $user->getSearchCount($filters);

    // Calculate pagination metadata
    $total_pages = ceil($total / $per_page);

    $response = [
        'data' => $users,
        'pagination' => [
            'current_page' => $page,
            'per_page' => $per_page,
            'total' => $total,
            'pages' => $total_pages,
            'has_more' => $page < $total_pages,
            'has_prev' => $page > 1
        ],
        'meta' => [
            'filters' => $filters,
            'offset' => $offset
        ]
    ];

    echo json_encode($response);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
