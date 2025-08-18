<?php
include_once '../../config/Database.php';
include_once '../../models/Company.php';

$data = json_decode(file_get_contents("php://input"), true);

try {
    $database = new Database();
    $db = $database->connect();
    $company = new Company($db);

    $result = $company->setIndustryByName($data['company_id'], $data['industry_name']);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
