<?php
include_once '../../config/Database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    $database = new Database();
    $db = $database->connect();

    // Check companies table structure
    $stmt = $db->prepare("DESCRIBE companies");
    $stmt->execute();
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get a sample company record
    $stmt = $db->prepare("SELECT * FROM companies WHERE id = 11 LIMIT 1");
    $stmt->execute();
    $company = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'companies_columns' => $columns,
        'company_11_sample' => $company
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
