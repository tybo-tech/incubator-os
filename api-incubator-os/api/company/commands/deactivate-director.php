<?php

include_once '../../../config/Database.php';
include_once '../../../core/Infrastructure/TransactionManager.php';
include_once '../../../capabilities/company/Contracts/Responses/CommandResult.php';
include_once '../../../capabilities/company/Contracts/Requests/DeactivateDirectorRequest.php';
include_once '../../../capabilities/company/Application/Commands/DeactivateDirector.php';
include_once '../../../capabilities/company/Repository/UserRepository.php';

$id = (int)($_GET['id'] ?? 0);
if (!$id) { http_response_code(400); echo json_encode(['error' => 'id is required']); exit; }

$input = json_decode(file_get_contents('php://input'), true);
$directorId = (int)($input['directorId'] ?? 0);
if (!$directorId) { http_response_code(400); echo json_encode(['error' => 'directorId is required']); exit; }

try {
    $db = (new Database())->connect();
    $request = new DeactivateDirectorRequest(directorId: $directorId);
    $result = (new DeactivateDirector(
        new UserRepository($db),
        new TransactionManager($db),
    ))->execute($id, $request);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}