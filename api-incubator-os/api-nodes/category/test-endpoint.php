<?php
include_once '../../config/headers.php';

// Simple test endpoint
try {
    $data = json_decode(file_get_contents("php://input"), true);

    echo json_encode([
        'success' => true,
        'message' => 'Test endpoint working',
        'received_data' => $data,
        'php_version' => phpversion(),
        'time' => date('Y-m-d H:i:s')
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
?>
