<?php
include_once '../../config/Database.php';
include_once '../../models/Form.php';

$id = $_GET['id'] ?? null;
$formKey = $_GET['form_key'] ?? null;
$scopeType = $_GET['scope_type'] ?? 'global';
$scopeId = $_GET['scope_id'] ?? null;

try {
    $database = new Database();
    $db = $database->connect();
    $form = new Form($db);

    if ($id) {
        $result = $form->getById((int)$id);
    } elseif ($formKey) {
        $result = $form->getByFormKey($formKey, $scopeType, $scopeId ? (int)$scopeId : null);
    } else {
        throw new Exception('Missing id or form_key parameter');
    }

    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
