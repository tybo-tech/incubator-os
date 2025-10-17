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
    // Get POST data
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);

    if (!$data) {
        throw new Exception('Invalid JSON data');
    }

    if (!isset($data['id']) || $data['id'] <= 0) {
        throw new Exception('Valid ID is required');
    }

    $database = new Database();
    $db = $database->connect();
    $category = new FinancialCategories($db);

    $id = (int)$data['id'];

    // Check if category exists
    $existingCategory = $category->getById($id);
    if (!$existingCategory) {
        throw new Exception('Financial category not found');
    }

    // Validate color fields if provided
    if (isset($data['bg_color'])) {
        if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $data['bg_color'])) {
            throw new Exception('Invalid background color format. Use hex format like #16a085');
        }
    }

    if (isset($data['text_color'])) {
        if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $data['text_color'])) {
            throw new Exception('Invalid text color format. Use hex format like #ecf0f1');
        }
    }

    // Handle color-specific update using specialized method
    if (isset($data['bg_color']) && isset($data['text_color']) && count($data) === 3) {
        // Only colors are being updated
        $result = $category->updateColors($id, $data['bg_color'], $data['text_color']);
    } else {
        // Regular update - remove id from update fields
        unset($data['id']);
        $result = $category->update($id, $data);
    }

    if (!$result) {
        throw new Exception('Failed to update financial category');
    }

    echo json_encode($result);

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
