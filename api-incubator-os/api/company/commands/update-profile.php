<?php

include_once '../../../config/Database.php';
include_once '../../../core/Infrastructure/TransactionManager.php';
include_once '../../../capabilities/company/Contracts/Responses/CommandResult.php';
include_once '../../../capabilities/company/Contracts/Requests/UpdateProfileRequest.php';
include_once '../../../capabilities/company/Application/Commands/UpdateProfile.php';
include_once '../../../capabilities/company/Repository/CompanyRepository.php';

$id = (int)($_GET['id'] ?? 0);
if (!$id) { http_response_code(400); echo json_encode(['error' => 'id is required']); exit; }

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) { http_response_code(400); echo json_encode(['error' => 'Request body is required']); exit; }

try {
    $db = (new Database())->connect();
    $request = new UpdateProfileRequest(
        name: $input['name'] ?? '',
        registrationNo: $input['registration_no'] ?? null,
        tradingName: $input['trading_name'] ?? null,
        contactPerson: $input['contact_person'] ?? null,
        contactNumber: $input['contact_number'] ?? null,
        emailAddress: $input['email_address'] ?? null,
        city: $input['city'] ?? null,
        suburb: $input['suburb'] ?? null,
        address: $input['address'] ?? null,
        businessLocation: $input['business_location'] ?? null,
        serviceOffering: $input['service_offering'] ?? null,
        bbbeeLevel: $input['bbbee_level'] ?? null,
        industryId: $input['industry_id'] ?? null,
    );
    $result = (new UpdateProfile(
        new CompanyRepository($db),
        new TransactionManager($db),
    ))->execute($id, $request);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}