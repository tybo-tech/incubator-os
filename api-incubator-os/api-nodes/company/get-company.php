<?php
include_once '../../config/Database.php';
include_once '../../models/Company.php';

$id = $_GET['id'] ?? null;
$reg = $_GET['registration_no'] ?? null;

try {
    $database = new Database();
    $db = $database->connect();
    $company = new Company($db);

    if ($id) {
        $result = $company->getById((int)$id);
    } elseif ($reg) {
        $result = $company->getByRegistrationNo($reg);
    } else {
        throw new Exception('Missing id or registration_no');
    }

    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
