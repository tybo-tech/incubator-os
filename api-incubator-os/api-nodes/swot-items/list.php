<?php
include_once '../../config/Database.php';
include_once '../../models/SwotItem.php';
include_once '../../config/headers.php';
try {
    $db = (new Database())->connect();
    $model = new SwotItem($db);
    $filters = [];
    if (isset($_GET['swot_analysis_id'])) $filters['swot_analysis_id'] = (int)$_GET['swot_analysis_id'];
    if (isset($_GET['company_id'])) $filters['company_id'] = (int)$_GET['company_id'];
    if (isset($_GET['category'])) $filters['category'] = $_GET['category'];
    if (isset($_GET['status'])) $filters['status'] = $_GET['status'];
    if (isset($_GET['priority'])) $filters['priority'] = $_GET['priority'];
    if (isset($_GET['search'])) $filters['search'] = $_GET['search'];
    if (isset($_GET['limit'])) $filters['limit'] = (int)$_GET['limit'];
    if (isset($_GET['offset'])) $filters['offset'] = (int)$_GET['offset'];
    // quadrant counts helper
    if (($_GET['counts'] ?? '') === '1' && isset($_GET['company_id'])) {
        $analysisId = isset($_GET['swot_analysis_id']) ? (int)$_GET['swot_analysis_id'] : null;
        echo json_encode(['counts' => $model->quadrantCounts((int)$_GET['company_id'], $analysisId), 'items' => $model->listAll($filters)]);
        return;
    }
    echo json_encode($model->listAll($filters));
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
