<?php
include_once '../../config/headers.php';
include_once '../../config/Database.php';
include_once '../../models/CompanyPurchases.php';

// Initialize database and company purchases object
$database = new Database();
$db = $database->connect();
$purchase = new CompanyPurchases($db);

// Get posted data
$data = json_decode(file_get_contents("php://input"));

// Make sure data is not empty
if (empty($data->id)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Purchase ID is required"
    ]);
    exit();
}

// Set ID property for deletion
$purchase->id = $data->id;

// Delete the purchase
if ($purchase->delete()) {
    echo json_encode([
        "success" => true,
        "message" => "Purchase record deleted successfully"
    ]);
} else {
    http_response_code(503);
    echo json_encode([
        "success" => false,
        "message" => "Unable to delete purchase record"
    ]);
}
?>
