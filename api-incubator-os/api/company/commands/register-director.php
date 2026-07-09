<?php

include_once '../../../config/Database.php';
include_once '../../../core/Infrastructure/TransactionManager.php';
include_once '../../../capabilities/company/Contracts/Responses/CommandResult.php';
include_once '../../../capabilities/company/Contracts/Projections/DirectorSummary.php';
include_once '../../../capabilities/company/Contracts/Requests/RegisterDirectorRequest.php';
include_once '../../../capabilities/company/Application/Commands/RegisterDirector.php';
include_once '../../../capabilities/company/Repository/UserRepository.php';

$id = (int)($_GET['id'] ?? 0);
if (!$id) { http_response_code(400); echo json_encode(['error' => 'id is required']); exit; }

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || empty($input['full_name'])) {
    http_response_code(400);
    echo json_encode(['error' => 'full_name is required']);
    exit;
}

try {
    $db = (new Database())->connect();
    $request = new RegisterDirectorRequest(
        fullName: $input['full_name'],
        email: $input['email'] ?? null,
        phone: $input['phone'] ?? null,
        gender: $input['gender'] ?? null,
        idNumber: $input['id_number'] ?? '',
    );
    $result = (new RegisterDirector(
        new UserRepository($db),
        new TransactionManager($db),
    ))->execute($id, $request);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}