<?php
include_once '../../config/headers.php';
include_once '../../config/Database.php';
include_once '../../models/CompanyPurchases.php';

// Initialize database and company purchases object
$database = new Database();
$db = $database->connect();
$purchase = new CompanyPurchases($db);

// Get query parameters for filtering
$filters = [];

if (isset($_GET['company_id'])) {
    $filters['company_id'] = $_GET['company_id'];
}
if (isset($_GET['purchase_type'])) {
    $filters['purchase_type'] = $_GET['purchase_type'];
}
if (isset($_GET['service_provider'])) {
    $filters['service_provider'] = $_GET['service_provider'];
}
if (isset($_GET['min_amount'])) {
    $filters['min_amount'] = $_GET['min_amount'];
}
if (isset($_GET['max_amount'])) {
    $filters['max_amount'] = $_GET['max_amount'];
}
if (isset($_GET['purchase_order'])) {
    $filters['purchase_order'] = $_GET['purchase_order'];
}
if (isset($_GET['invoice_received'])) {
    $filters['invoice_received'] = $_GET['invoice_received'];
}
if (isset($_GET['items_received'])) {
    $filters['items_received'] = $_GET['items_received'];
}
if (isset($_GET['aligned_with_presentation'])) {
    $filters['aligned_with_presentation'] = $_GET['aligned_with_presentation'];
}
if (isset($_GET['date_from'])) {
    $filters['date_from'] = $_GET['date_from'];
}
if (isset($_GET['date_to'])) {
    $filters['date_to'] = $_GET['date_to'];
}

// Get count of purchases
$count = $purchase->count($filters);

echo json_encode([
    "success" => true,
    "data" => [
        "count" => $count
    ]
]);
?>
