<?php
include_once '../../config/Database.php';
include_once '../../models/FinancialMetric.php';

$companyId = $_GET['company_id'] ?? null;
$year = $_GET['year'] ?? null; // optional now
$metricTypeId = $_GET['metric_type_id'] ?? null;

try {
    if (!$companyId) throw new Exception('company_id is required');

    $database = new Database();
    $db = $database->connect();

    if ($year) {
        // Preserve original behaviour when year supplied
        $fm = new FinancialMetric($db);
        if ($metricTypeId) {
            $result = $fm->listByMetric((int)$companyId, (int)$metricTypeId, (int)$year);
        } else {
            $result = $fm->listByCompanyYear((int)$companyId, (int)$year);
        }
        echo json_encode($result);
        return;
    }

    // No year: return grouped structure across all years
    $sql = "SELECT * FROM financial_metrics WHERE company_id = ?";
    $params = [(int)$companyId];
    $sql .= " ORDER BY year_ DESC, metric_type_id, quarter";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if ($metricTypeId) {
        $rows = array_filter($rows, fn($r) => (int)$r['metric_type_id'] === (int)$metricTypeId);
    }

    foreach ($rows as &$r) {
        foreach (['id','company_id','metric_type_id','year_'] as $k) if (isset($r[$k])) $r[$k] = (int)$r[$k];
        foreach (['value','margin_pct'] as $k) if (isset($r[$k]) && $r[$k] !== null) $r[$k] = (float)$r[$k];
    }
    unset($r);

    $grouped = [];
    foreach ($rows as $r) { $grouped[$r['year_']][] = $r; }
    krsort($grouped);

    echo json_encode([
        'years' => $grouped,
        'meta' => [
            'total' => count($rows),
            'year_count' => count($grouped),
            'years' => array_keys($grouped)
        ]
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
