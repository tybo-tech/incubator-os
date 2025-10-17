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

    $database = new Database();
    $db = $database->connect();
    $category = new FinancialCategories($db);

    $results = [];

    // Handle bulk color updates
    if (isset($data['bulk_color_updates']) && is_array($data['bulk_color_updates'])) {
        foreach ($data['bulk_color_updates'] as $update) {
            if (!isset($update['id']) || !isset($update['bg_color']) || !isset($update['text_color'])) {
                throw new Exception('Each update must have id, bg_color, and text_color');
            }

            // Validate color formats
            if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $update['bg_color'])) {
                throw new Exception("Invalid background color format for ID {$update['id']}. Use hex format like #16a085");
            }
            if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $update['text_color'])) {
                throw new Exception("Invalid text color format for ID {$update['id']}. Use hex format like #ecf0f1");
            }

            $result = $category->updateColors((int)$update['id'], $update['bg_color'], $update['text_color']);
            if ($result) {
                $results[] = $result;
            }
        }
    }
    // Handle theme application by item type
    else if (isset($data['item_type']) && isset($data['bg_color']) && isset($data['text_color'])) {
        // Validate color formats
        if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $data['bg_color'])) {
            throw new Exception('Invalid background color format. Use hex format like #16a085');
        }
        if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $data['text_color'])) {
            throw new Exception('Invalid text color format. Use hex format like #ecf0f1');
        }

        // Get all categories of this type
        $categories = $category->listAll($data['item_type'], true);

        foreach ($categories as $cat) {
            $result = $category->updateColors((int)$cat['id'], $data['bg_color'], $data['text_color']);
            if ($result) {
                $results[] = $result;
            }
        }
    } else {
        throw new Exception('Invalid request. Provide either bulk_color_updates array or item_type with colors');
    }

    echo json_encode($results);

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
