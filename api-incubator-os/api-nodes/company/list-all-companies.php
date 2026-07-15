<?php
include_once '../../config/Database.php';
include_once '../../models/Company.php';

try {
    $database = new Database();
    $db = $database->connect();
    $company = new Company($db);

    $stmt = $db->query("SELECT id, name FROM companies ORDER BY name ASC");
    $companies = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($companies);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
