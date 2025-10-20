<?php
include_once '../../config/Database.php';
include_once '../../models/ActionItems.php';
include_once '../../config/headers.php';

try {
    $database = new Database();
    $db = $database->connect();
    $actionItems = new ActionItems($db);

    // Build filters from query parameters
    $filters = [];

    if (isset($_GET['company_id'])) {
        $filters['company_id'] = (int) $_GET['company_id'];
    }

    if (isset($_GET['context_type'])) {
        $filters['context_type'] = $_GET['context_type'];
    }

    if (isset($_GET['is_archived'])) {
        $filters['is_archived'] = (int) $_GET['is_archived'];
    }

    $result = $actionItems->getCategoryBreakdown($filters);
    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
