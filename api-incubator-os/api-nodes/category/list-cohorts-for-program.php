<?php
include_once '../../config/Database.php';
include_once '../../models/Categories.php';
include_once '../../config/headers.php';

$program_id = $_GET['program_id'] ?? null;

try {
    $database = new Database();
    $db = $database->connect();
    $categories = new Categories($db);

    if ($program_id) {
        $result = $categories->listCohortsForProgram((int)$program_id);
        echo json_encode($result);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'program_id parameter required']);
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
