<?php

include_once '../../config/Database.php';
include_once '../../models/Node.php';

$companyId = isset($_GET['company_id']) ? $_GET['company_id'] : null;
$type = isset($_GET['type']) ? $_GET['type'] : null;

try {
    $database = new Database();
    $db = $database->connect();
    $node = new Node($db);

    if (!$companyId) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Company ID parameter is required'
        ]);
        return;
    }

    $result = $node->getByCompanyId($companyId, $type);

    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'error' => $e->getMessage()
    ]);
}
