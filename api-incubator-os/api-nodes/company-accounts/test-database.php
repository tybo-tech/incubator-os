<?php
include_once '../../config/Database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    $database = new Database();
    $db = $database->connect();

    // Test if company_accounts table exists
    $stmt = $db->prepare("SHOW TABLES LIKE 'company_accounts'");
    $stmt->execute();
    $tableExists = $stmt->fetch() ? true : false;

    if (!$tableExists) {
        echo json_encode([
            'success' => false,
            'message' => 'Table company_accounts does not exist'
        ]);
        exit();
    }

    // Test basic select
    $stmt = $db->prepare("SELECT COUNT(*) as count FROM company_accounts");
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    // Test select for company 11
    $stmt = $db->prepare("SELECT * FROM company_accounts WHERE company_id = 11 LIMIT 5");
    $stmt->execute();
    $accounts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'table_exists' => $tableExists,
        'total_accounts' => $result['count'],
        'company_11_accounts' => $accounts,
        'message' => 'Database test successful'
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?>
