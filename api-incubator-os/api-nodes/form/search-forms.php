<?php
include_once '../../config/Database.php';
include_once '../../models/Form.php';

$filters = [];
$limit = (int)($_GET['limit'] ?? 50);
$offset = (int)($_GET['offset'] ?? 0);

// Build filters from query parameters
if (isset($_GET['form_key'])) $filters['form_key'] = $_GET['form_key'];
if (isset($_GET['title'])) $filters['title'] = $_GET['title'];
if (isset($_GET['scope_type'])) $filters['scope_type'] = $_GET['scope_type'];
if (isset($_GET['scope_id'])) $filters['scope_id'] = (int)$_GET['scope_id'];
if (isset($_GET['status'])) $filters['status'] = $_GET['status'];

try {
    $database = new Database();
    $db = $database->connect();
    $form = new Form($db);

    $result = $form->search($filters, $limit, $offset);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
