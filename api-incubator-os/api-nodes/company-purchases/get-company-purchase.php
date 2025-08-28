<?php
include_once '../../config/headers.php';
include_once '../../config/Database.php';
include_once '../../models/CompanyPurchases.php';

// Initialize database and company purchases object
$database = new Database();
$db = $database->connect();
$purchase = new CompanyPurchases($db);

// Get URL parameter for ID
$purchase_id = isset($_GET['id']) ? $_GET['id'] : die();

// Set ID property
$purchase->id = $purchase_id;

// Get the purchase record
$result = $purchase->read_single();

if ($result) {
    echo json_encode([
        "success" => true,
        "data" => $result
    ]);
} else {
    http_response_code(404);
    echo json_encode([
        "success" => false,
        "message" => "Purchase record not found"
    ]);
}
?>
