<?php
include_once '../../config/Database.php';
include_once '../../models/CategoryItem.php';
include_once '../../config/headers.php';

$companyId = (int)($_GET['company_id'] ?? 0);

if (!$companyId) {
    // http_response_code(400);
    echo json_encode(['error' => 'company_id parameter is required']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $categoryItem = new CategoryItem($db);

    // Get company's full participation history
    $result = $categoryItem->getCompanyParticipation($companyId);
    echo json_encode($result);

} catch (Exception $e) {
    // http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
