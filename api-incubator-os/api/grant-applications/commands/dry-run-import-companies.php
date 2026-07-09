<?php

include_once '../../../config/Database.php';
include_once '../../../models/Node.php';
include_once '../../../models/Company.php';
include_once '../../../services/grant-applications/GrantApplicationService.php';

try {
    $db = (new Database())->connect();
    $service = new GrantApplicationService(new Node($db));
    echo json_encode($service->dryRunImportToCompanies());
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
