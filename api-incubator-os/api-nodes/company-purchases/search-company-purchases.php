<?php
include_once '../../config/headers.php';
include_once '../../config/Database.php';
include_once '../../models/CompanyPurchases.php';

// Initialize database and company purchases object
$database = new Database();
$db = $database->connect();
$purchase = new CompanyPurchases($db);

// Get query parameters
$search_term = isset($_GET['search']) ? $_GET['search'] : '';
$company_id = isset($_GET['company_id']) ? $_GET['company_id'] : null;

if (empty($search_term)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Search term is required"
    ]);
    exit();
}

// Search purchases
$stmt = $purchase->search($search_term, $company_id);
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
            "count" => 0
        ],
        "message" => "No purchases found matching search criteria"
    ]);
}
?>
