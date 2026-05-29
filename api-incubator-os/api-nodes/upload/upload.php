<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Origin, Content-Type, X-Auth-Token');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if (isset($_POST['name']) && isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
    $target_dir = __DIR__ . '/uploads/';
    if (!is_dir($target_dir)) {
        mkdir($target_dir, 0755, true);
    }

    $original_name = basename($_FILES['file']['name']);
    $safe_name     = preg_replace('/[^a-zA-Z0-9._-]/', '_', $original_name);
    $stored_name   = time() . '_' . $safe_name;
    $target_file   = $target_dir . $stored_name;

    if (move_uploaded_file($_FILES['file']['tmp_name'], $target_file)) {
        $mime = function_exists('mime_content_type') ? mime_content_type($target_file) : $_FILES['file']['type'];
        echo json_encode([
            'success'       => true,
            'url'           => 'uploads/' . $stored_name,
            'stored_name'   => $stored_name,
            'original_name' => $original_name,
            'mime'          => $mime,
            'size'          => $_FILES['file']['size'],
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'move_uploaded_file failed', 'code' => $_FILES['file']['error']]);
    }
} else {
    $err = isset($_FILES['file']) ? $_FILES['file']['error'] : 'no file';
    echo json_encode(['success' => false, 'error' => 'Missing file or name', 'detail' => $err]);
}
