<?php

include_once '../../../config/Database.php';
include_once '../../../core/Infrastructure/TransactionManager.php';
include_once '../../../capabilities/company/Contracts/Responses/CommandResult.php';
include_once '../../../capabilities/company/Contracts/Projections/DirectorSummary.php';
include_once '../../../capabilities/company/Contracts/Requests/UpdateDirectorRequest.php';
include_once '../../../capabilities/company/Application/Commands/UpdateDirector.php';
include_once '../../../capabilities/company/Repository/UserRepository.php';
include_once '../../../capabilities/company/Repository/CompanyRepository.php';

$id = (int)($_GET['id'] ?? 0);
if (!$id) { http_response_code(400); echo json_encode(['error' => 'id is required']); exit; }

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Request body is required']);
    exit;
}

$directorId = (int)($input['directorId'] ?? 0);
if (!$directorId) { http_response_code(400); echo json_encode(['error' => 'directorId is required']); exit; }

try {
    $db = (new Database())->connect();
    $request = new UpdateDirectorRequest(
        directorId: $directorId,
        fullName: $input['full_name'] ?? '',
        email: $input['email'] ?? null,
        phone: $input['phone'] ?? null,
        gender: $input['gender'] ?? null,
        race: $input['race'] ?? null,
        idNumber: $input['id_number'] ?? '',
    );
    $result = (new UpdateDirector(
        new UserRepository($db),
        new CompanyRepository($db),
        new TransactionManager($db),
    ))->execute($id, $request);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
