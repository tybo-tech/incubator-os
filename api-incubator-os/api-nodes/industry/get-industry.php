<?php
include_once '../../config/Database.php';
include_once '../../models/Industry.php';

$id = $_GET['id'] ?? null;
$name = $_GET['name'] ?? null;
$withHierarchy = isset($_GET['with_hierarchy']) && $_GET['with_hierarchy'] === '1';

try {
    $database = new Database();
    $db = $database->connect();
    $industry = new Industry($db);

    if ($id) {
        $result = $industry->getById((int)$id);
    } elseif ($name) {
        $result = $industry->getByName($name);
    } else {
        throw new Exception('Missing id or name');
    }

    if (!$result) {
        throw new Exception('Industry not found');
    }

    // Add hierarchy information if requested
    if ($withHierarchy) {
        $result['children_count'] = $industry->getChildrenCount($result['id']);
        $result['companies_count'] = $industry->getCompaniesCount($result['id']);
        $result['depth'] = $industry->getDepth($result['id']);

        // Add parent information
        if ($result['parent_id']) {
            $result['parent'] = $industry->getById($result['parent_id']);
        }
    }

    // Return in INode format
    echo json_encode([
        'id' => $result['id'],
        'type' => 'industry',
        'data' => $result,
        'parent_id' => $result['parent_id'],
        'created_at' => $result['created_at'],
        'updated_at' => $result['updated_at']
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
