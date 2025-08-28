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

// Get service provider breakdown
$stmt = $purchase->getServiceProviderBreakdown($company_id);
$num = $stmt->rowCount();

if ($num > 0) {
    $breakdown_arr = [];
    $breakdown_arr["records"] = [];

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        extract($row);

        $breakdown_item = [
            "service_provider" => $service_provider,
            "count" => (int)$count,
            "total_amount" => (float)$total_amount,
            "average_amount" => (float)$average_amount
        ];

        array_push($breakdown_arr["records"], $breakdown_item);
    }

    $breakdown_arr["count"] = $num;

    echo json_encode([
        "success" => true,
        "data" => $breakdown_arr
    ]);
} else {
    echo json_encode([
        "success" => true,
        "data" => [
            "records" => [],
            "count" => 0
        ],
        "message" => "No service provider breakdown found"
    ]);
}
?>
