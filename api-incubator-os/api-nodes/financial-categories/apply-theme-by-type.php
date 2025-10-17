<?php
declare(strict_types=1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:4200');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

include_once '../../config/Database.php';
include_once '../../models/FinancialCategories.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST method allowed');
    }

    // Get POST data
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);

    if (!$data) {
        throw new Exception('Invalid JSON data');
    }

    // Validate required fields
    if (!isset($data['item_type']) || !isset($data['bg_color']) || !isset($data['text_color'])) {
        throw new Exception('item_type, bg_color, and text_color are required');
    }

    // Validate item type
    $allowedTypes = ['direct_cost', 'operational_cost', 'asset', 'liability', 'equity'];
    if (!in_array($data['item_type'], $allowedTypes)) {
        throw new Exception('Invalid item_type. Must be one of: ' . implode(', ', $allowedTypes));
    }

    // Validate color formats
    if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $data['bg_color'])) {
        throw new Exception('Invalid background color format. Use hex format like #16a085');
    }
    if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $data['text_color'])) {
        throw new Exception('Invalid text color format. Use hex format like #ecf0f1');
    }

    $database = new Database();
    $db = $database->connect();
    $category = new FinancialCategories($db);

    // Get all active categories of this type
    $categories = $category->listAll($data['item_type'], true);

    if (empty($categories)) {
        throw new Exception("No active categories found for item type: {$data['item_type']}");
    }

    $results = [];
    $updated_count = 0;

    foreach ($categories as $cat) {
        $result = $category->updateColors((int)$cat['id'], $data['bg_color'], $data['text_color']);
        if ($result) {
            $results[] = $result;
            $updated_count++;
        }
    }

    echo json_encode([
        'success' => true,
        'message' => "Successfully updated colors for {$updated_count} categories of type {$data['item_type']}",
        'updated_count' => $updated_count,
        'categories' => $results
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'error' => true,
        'message' => $e->getMessage()
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => true,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
