<?php

include_once '../../../config/Database.php';
include_once '../../../models/Node.php';
include_once '../../../models/Company.php';
include_once '../../../services/grant-applications/GrantApplicationService.php';

$statusFilter = $_GET['status'] ?? null;

try {
    $db = (new Database())->connect();
    $service = new GrantApplicationService(new Node($db));
    echo json_encode($service->dryRunImportToCompanies($statusFilter));
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
