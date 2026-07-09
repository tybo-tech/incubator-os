<?php

include_once '../../../config/Database.php';
include_once '../../../models/Node.php';
include_once '../../../services/grant-applications/GrantApplicationService.php';

$input = json_decode(file_get_contents('php://input'), true);
$applicantId = (int)($input['applicantId'] ?? 0);
$patch = $input['data'] ?? [];

if (!$applicantId) {
    http_response_code(400);
    echo json_encode(['error' => 'applicantId is required']);
    exit;
}

try {
    $db = (new Database())->connect();
    $service = new GrantApplicationService(new Node($db));
    $result = $service->updateApplication($applicantId, $patch);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
