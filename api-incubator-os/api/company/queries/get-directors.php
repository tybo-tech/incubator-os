<?php

include_once '../../../config/Database.php';
include_once '../../../capabilities/company/Contracts/Projections/DirectorSummary.php';
include_once '../../../capabilities/company/Contracts/Projections/OwnershipSummary.php';
include_once '../../../capabilities/company/Application/Queries/GetDirectors.php';
include_once '../../../capabilities/company/Repository/UserRepository.php';

$id = (int)($_GET['id'] ?? 0);
if (!$id) { http_response_code(400); echo json_encode(['error' => 'id is required']); exit; }

try {
    $db = (new Database())->connect();
    $result = (new GetDirectors(new UserRepository($db)))->execute($id);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
