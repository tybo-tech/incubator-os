<?php
include_once '../../config/Database.php';
include_once '../../models/FormSession.php';

$categoriesItemId = $_GET['categories_item_id'] ?? null;
$filters = [];

// Build filters from query parameters
if (isset($_GET['form_id'])) $filters['form_id'] = (int)$_GET['form_id'];
if (isset($_GET['status'])) $filters['status'] = $_GET['status'];
if (isset($_GET['session_date'])) $filters['session_date'] = $_GET['session_date'];

try {
    if (!$categoriesItemId) {
        throw new Exception('Missing categories_item_id parameter');
    }

    $database = new Database();
    $db = $database->connect();
    $formSession = new FormSession($db);

    $result = $formSession->getByEnrollment((int)$categoriesItemId, $filters);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
