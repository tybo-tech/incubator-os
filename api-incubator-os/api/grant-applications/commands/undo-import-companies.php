<?php

include_once '../../../config/Database.php';
include_once '../../../models/Node.php';
include_once '../../../models/Company.php';
include_once '../../../models/CategoryItem.php';
include_once '../../../models/User.php';
include_once '../../../services/grant-applications/GrantApplicationService.php';

$input = json_decode(file_get_contents('php://input'), true);
$cohortId = isset($input['cohort_id']) ? (int)$input['cohort_id'] : 0;

if (!$cohortId) {
    http_response_code(400);
    echo json_encode(['error' => 'cohort_id is required']);
    exit;
}

try {
    $db = (new Database())->connect();
    $service = new GrantApplicationService(new Node($db));
    echo json_encode($service->undoImportToCompanies($cohortId));
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
