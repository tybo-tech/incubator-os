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

// Validate required fields
if (empty($data->company_id) || empty($data->purchase_type) || empty($data->service_provider) ||
    empty($data->items) || !isset($data->amount)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Missing required fields: company_id, purchase_type, service_provider, items, amount"
    ]);
    exit();
}

// Set purchase properties
$purchase->company_id = $data->company_id;
$purchase->purchase_type = $data->purchase_type;
$purchase->service_provider = $data->service_provider;
$purchase->items = $data->items;
$purchase->amount = $data->amount;
$purchase->purchase_order = isset($data->purchase_order) ? $data->purchase_order : false;
$purchase->invoice_received = isset($data->invoice_received) ? $data->invoice_received : false;
$purchase->invoice_type = isset($data->invoice_type) ? $data->invoice_type : null;
$purchase->items_received = isset($data->items_received) ? $data->items_received : false;
$purchase->aligned_with_presentation = isset($data->aligned_with_presentation) ? $data->aligned_with_presentation : false;
$purchase->source_file = isset($data->source_file) ? $data->source_file : null;

// Validate data
$validation_errors = $purchase->validate((array)$data);
if (!empty($validation_errors)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Validation failed",
        "errors" => $validation_errors
    ]);
    exit();
}

// Create the purchase
if ($purchase->create()) {
    http_response_code(201);
    echo json_encode([
        "success" => true,
        "message" => "Purchase record created successfully"
    ]);
} else {
    http_response_code(503);
    echo json_encode([
        "success" => false,
        "message" => "Unable to create purchase record"
    ]);
}
?>
