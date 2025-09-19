<?php
include_once '../../config/Database.php';
include_once '../../models/Company.php';

$payload = json_decode(file_get_contents('php://input'), true);

// Accept either an array directly or an object with a 'companies' key
$rows = [];
$upsert = false;

if (is_array($payload)) {
    if (isset($payload['companies']) && is_array($payload['companies'])) {
        $rows = $payload['companies'];
        $upsert = !empty($payload['upsertByRegistrationNo']);
    } else {
        // assume the entire payload is an array of company objects
        $rows = $payload;
    }
}

try {
    $database = new Database();
    $db = $database->connect();
    $company = new Company($db);

    $result = $company->bulkAdd($rows, $upsert);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
