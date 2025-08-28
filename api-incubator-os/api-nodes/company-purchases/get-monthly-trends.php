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
$year = isset($_GET['year']) ? $_GET['year'] : null;

// Get monthly trends
$stmt = $purchase->getMonthlyTrends($company_id, $year);
$num = $stmt->rowCount();

if ($num > 0) {
    $trends_arr = [];
    $trends_arr["records"] = [];

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        extract($row);

        $trend_item = [
            "year" => (int)$year,
            "month" => (int)$month,
            "month_name" => $month_name,
            "purchase_count" => (int)$purchase_count,
            "total_amount" => (float)$total_amount,
            "average_amount" => (float)$average_amount
        ];

        array_push($trends_arr["records"], $trend_item);
    }

    $trends_arr["count"] = $num;

    echo json_encode([
        "success" => true,
        "data" => $trends_arr
    ]);
} else {
    echo json_encode([
        "success" => true,
        "data" => [
            "records" => [],
            "count" => 0
        ],
        "message" => "No monthly trends found"
    ]);
}
?>
