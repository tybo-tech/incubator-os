<?php
include_once '../../config/Database.php';
include_once '../../models/FinancialMetric.php';

$data = json_decode(file_get_contents('php://input'), true);

try {
    if (!$data) throw new Exception('Invalid JSON body');
    $required = ['company_id','metric_type_id','year','value'];
    foreach ($required as $r) if (!isset($data[$r])) throw new Exception("Missing field: $r");

    $companyId = (int)$data['company_id'];
    $metricTypeId = (int)$data['metric_type_id'];
    $year = (int)$data['year'];
    $quarter = $data['quarter'] ?? null;
    $value = (float)$data['value'];
    $unit = $data['unit'] ?? 'ZAR';
    $margin_pct = isset($data['margin_pct']) ? (float)$data['margin_pct'] : null;

    $database = new Database();
    $db = $database->connect();
    $fm = new FinancialMetric($db);

    $result = $fm->add($companyId, $metricTypeId, $year, $quarter, $value, $unit, $margin_pct);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
