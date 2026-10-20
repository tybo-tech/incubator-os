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

// Booleans must be readable as false, not "missing" — null means "leave unchanged".
$toBool = static function ($value): ?bool {
    if ($value === null || $value === '') return null;
    return filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
};

try {
    $db = (new Database())->connect();
    $request = new UpdateProfileRequest(
        name: $input['name'] ?? null,
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
        hasValidBbbee: $toBool($input['has_valid_bbbbee'] ?? null),
        hasTaxClearance: $toBool($input['has_tax_clearance'] ?? null),
        isSarsRegistered: $toBool($input['is_sars_registered'] ?? null),
        hasCipcRegistration: $toBool($input['has_cipc_registration'] ?? null),
        cipcStatus: $input['cipc_status'] ?? null,
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
