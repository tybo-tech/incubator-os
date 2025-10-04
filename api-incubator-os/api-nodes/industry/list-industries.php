<?php
include_once '../../config/Database.php';
include_once '../../models/Industry.php';

try {
    $database = new Database();
    $db = $database->connect();
    $industry = new Industry($db);

    // Build options from query parameters
    $opts = [];

    // Pagination
    if (isset($_GET['page'])) $opts['page'] = (int)$_GET['page'];
    if (isset($_GET['limit'])) $opts['limit'] = (int)$_GET['limit'];

    // Filtering
    if (isset($_GET['parent_id'])) {
        $opts['parent_id'] = $_GET['parent_id'] === '' ? null : (int)$_GET['parent_id'];
    }
    if (isset($_GET['is_active'])) {
        $opts['is_active'] = $_GET['is_active'] === '1' || $_GET['is_active'] === 'true';
    }

    // Search
    if (isset($_GET['search']) && trim($_GET['search']) !== '') {
        $opts['search'] = trim($_GET['search']);
    }

    // Ordering
    if (isset($_GET['order_by'])) $opts['order_by'] = $_GET['order_by'];
    if (isset($_GET['order_dir'])) $opts['order_dir'] = $_GET['order_dir'];

    // Hierarchy options
    if (isset($_GET['include_parent'])) $opts['include_parent'] = $_GET['include_parent'] === '1';
    if (isset($_GET['include_children'])) $opts['include_children'] = $_GET['include_children'] === '1';

    // Get industries with hierarchy if requested
    $withHierarchy = isset($_GET['with_hierarchy']) && $_GET['with_hierarchy'] === '1';

    if ($withHierarchy) {
        $result = $industry->listWithHierarchy($opts);
    } else {
        $result = $industry->list($opts);
    }

    // Transform to INode format
    $nodeResults = [];
    foreach ($result['data'] as $industryData) {
        $nodeResults[] = [
            'id' => $industryData['id'],
            'type' => 'industry',
            'data' => $industryData,
            'parent_id' => $industryData['parent_id'],
            'created_at' => $industryData['created_at'],
            'updated_at' => $industryData['updated_at']
        ];
    }

    // Return paginated response
    echo json_encode([
        'data' => $nodeResults,
        'pagination' => [
            'total' => $result['total'],
            'page' => $result['page'],
            'limit' => $result['limit'],
            'pages' => $result['pages']
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
