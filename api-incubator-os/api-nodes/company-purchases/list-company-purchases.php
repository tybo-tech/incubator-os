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
if (isset($_GET['limit'])) {
    $filters['limit'] = $_GET['limit'];
}
if (isset($_GET['offset'])) {
    $filters['offset'] = $_GET['offset'];
}

// Query for purchases
$stmt = $purchase->read($filters);
$num = $stmt->rowCount();

if ($num > 0) {
    $purchases_arr = [];
    $purchases_arr["records"] = [];

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        extract($row);

        $purchase_item = [
            "id" => $id,
            "company_id" => $company_id,
            "company_name" => $company_name ?? null,
            "registration_number" => $registration_number ?? null,
            "purchase_type" => $purchase_type,
            "service_provider" => $service_provider,
            "items" => $items,
            "amount" => (float)$amount,
            "purchase_order" => (bool)$purchase_order,
            "invoice_received" => (bool)$invoice_received,
            "invoice_type" => $invoice_type,
            "items_received" => (bool)$items_received,
            "aligned_with_presentation" => (bool)$aligned_with_presentation,
            "source_file" => $source_file,
            "created_at" => $created_at,
            "updated_at" => $updated_at
        ];

        array_push($purchases_arr["records"], $purchase_item);
    }

    // Get total count for pagination
    $total_count = $purchase->count($filters);
    $purchases_arr["total_count"] = $total_count;
    $purchases_arr["count"] = $num;

    echo json_encode([
        "success" => true,
        "data" => $purchases_arr
    ]);
} else {
    echo json_encode([
        "success" => true,
        "data" => [
            "records" => [],
            "total_count" => 0,
            "count" => 0
        ],
        "message" => "No purchase records found"
    ]);
}
?>
