<?php
include_once '../../config/Database.php';
include_once '../../models/FormSubmission.php';

$companyId = $_GET['company_id'] ?? null;
$formId = $_GET['form_id'] ?? null;
$formKey = $_GET['form_key'] ?? null;
$limit = $_GET['limit'] ?? 50;
$offset = $_GET['offset'] ?? 0;

try {
    $database = new Database();
    $db = $database->connect();
    $formSubmission = new FormSubmission($db);

    if ($companyId) {
        $result = $formSubmission->getHistory((int)$companyId, $formId ? (int)$formId : null, $formKey, (int)$limit, (int)$offset);
    } else {
        throw new Exception('Missing company_id');
    }

    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
