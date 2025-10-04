<?php
include_once '../../config/Database.php';
include_once '../../models/IndustryReports.php';

try {
    $database = new Database();
    $db = $database->connect();
    $reports = new IndustryReports($db);

    $data = $reports->companiesPerIndustry();

    echo json_encode([
        'data' => $data,
        'total' => count($data)
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
