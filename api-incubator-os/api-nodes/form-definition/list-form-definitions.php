<?php
include_once '../../config/Database.php';
include_once '../../models/FormDefinition.php';

$onlyActive = isset($_GET['only_active']) ? ($_GET['only_active'] == '1' ? true : false) : null;

try {
    $database = new Database();
    $db = $database->connect();
    $formDefinition = new FormDefinition($db);

    $result = $formDefinition->listForms($onlyActive);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
