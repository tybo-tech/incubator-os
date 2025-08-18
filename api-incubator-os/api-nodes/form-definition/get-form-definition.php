<?php
include_once '../../config/Database.php';
include_once '../../models/FormDefinition.php';

$id = $_GET['id'] ?? null;
$formKey = $_GET['form_key'] ?? null;

try {
    $database = new Database();
    $db = $database->connect();
    $formDefinition = new FormDefinition($db);

    if ($id) {
        $result = $formDefinition->getById((int)$id);
    } elseif ($formKey) {
        $result = $formDefinition->getByKey($formKey);
    } else {
        throw new Exception('Missing id or form_key');
    }

    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
