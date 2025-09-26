<?php
include_once '../../config/Database.php';
include_once '../../models/MetricType.php';
include_once '../../config/headers.php';

$data = json_decode(file_get_contents('php://input'), true);

try {
    if (!$data) throw new Exception('Invalid JSON body');
    $database = new Database();
    $db = $database->connect();
    $mt = new MetricType($db);

    // Extract required fields
    $code = $data['code'] ?? null;
    $name = $data['name'] ?? null;
    if (!$code || !$name) throw new Exception('code and name are required');

    // Map new structure to MetricType::add() expected format
    $metricData = [
        'group_id' => $data['group_id'] ?? 1,
        'code' => $code,
        'name' => $name,
        'description' => $data['description'] ?? '',
        'unit' => $data['unit'] ?? 'ZAR',
        'show_total' => isset($data['show_total']) ? (int)$data['show_total'] : 1,
        'show_margin' => isset($data['show_margin']) ? (int)$data['show_margin'] : 0,
        'graph_color' => $data['graph_color'] ?? '#1f77b4',
        'period_type' => $data['period_type'] ?? 'QUARTERLY'
    ];

    // Handle categories if provided
    if (isset($data['category_ids']) && is_array($data['category_ids'])) {
        $metricData['categories'] = $data['category_ids'];
    }

    $result = $mt->add($metricData);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
