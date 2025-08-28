<?php
include_once '../../config/headers.php';
include_once '../../config/Database.php';
include_once '../../models/CompanyPurchases.php';

// Initialize database and company purchases object
$database = new Database();
$db = $database->connect();
$purchase = new CompanyPurchases($db);

// Get query parameters
$company_id = isset($_GET['company_id']) ? $_GET['company_id'] : null;

// Get purchase statistics
$statistics = $purchase->getPurchaseStatistics($company_id);

if ($statistics) {
    // Convert numeric strings to proper types
    $statistics['total_purchases'] = (int)$statistics['total_purchases'];
    $statistics['total_amount'] = $statistics['total_amount'] ? (float)$statistics['total_amount'] : 0.0;
    $statistics['average_amount'] = $statistics['average_amount'] ? (float)$statistics['average_amount'] : 0.0;
    $statistics['min_amount'] = $statistics['min_amount'] ? (float)$statistics['min_amount'] : 0.0;
    $statistics['max_amount'] = $statistics['max_amount'] ? (float)$statistics['max_amount'] : 0.0;
    $statistics['with_purchase_order'] = (int)$statistics['with_purchase_order'];
    $statistics['with_invoice'] = (int)$statistics['with_invoice'];
    $statistics['items_delivered'] = (int)$statistics['items_delivered'];
    $statistics['aligned_purchases'] = (int)$statistics['aligned_purchases'];
    $statistics['unique_types'] = (int)$statistics['unique_types'];
    $statistics['unique_providers'] = (int)$statistics['unique_providers'];

    echo json_encode([
        "success" => true,
        "data" => $statistics
    ]);
} else {
    http_response_code(404);
    echo json_encode([
        "success" => false,
        "message" => "No purchase statistics found"
    ]);
}
?>
