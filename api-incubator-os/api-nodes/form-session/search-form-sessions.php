<?php
include_once '../../config/Database.php';
include_once '../../models/FormSession.php';

$filters = [];
$limit = (int)($_GET['limit'] ?? 50);
$offset = (int)($_GET['offset'] ?? 0);

// Build filters from query parameters
if (isset($_GET['categories_item_id'])) $filters['categories_item_id'] = (int)$_GET['categories_item_id'];
if (isset($_GET['form_id'])) $filters['form_id'] = (int)$_GET['form_id'];
if (isset($_GET['status'])) $filters['status'] = $_GET['status'];
if (isset($_GET['session_date_from'])) $filters['session_date_from'] = $_GET['session_date_from'];
if (isset($_GET['session_date_to'])) $filters['session_date_to'] = $_GET['session_date_to'];

try {
    $database = new Database();
    $db = $database->connect();
    $formSession = new FormSession($db);

    $result = $formSession->search($filters, $limit, $offset);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
