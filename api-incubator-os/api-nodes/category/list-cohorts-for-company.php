<?php
include_once '../../config/Database.php';
include_once '../../models/Categories.php';
include_once '../../config/headers.php';

$company_id = $_GET['company_id'] ?? null;

try {
    $database = new Database();
    $db = $database->connect();
    $categories = new Categories($db);

    if (!$company_id) {
        http_response_code(400);
        echo json_encode(['error' => 'company_id parameter required']);
        exit;
    }

    // Get cohorts where this company is attached
    $sql = "SELECT c.* FROM categories c
            JOIN categories_item ci ON ci.category_id = c.id
            WHERE ci.company_id = ? AND c.type = 'cohort' AND c.depth = 3
            ORDER BY c.name ASC";

    $stmt = $db->prepare($sql);
    $stmt->execute([(int)$company_id]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Cast the rows using the same method as Categories class
    $cohorts = [];
    foreach ($rows as $row) {
        $cohorts[] = [
            'id' => (int)$row['id'],
            'name' => $row['name'],
            'slug' => $row['slug'],
            'type' => $row['type'],
            'description' => $row['description'],
            'image_url' => $row['image_url'],
            'parent_id' => $row['parent_id'] ? (int)$row['parent_id'] : null,
            'depth' => (int)$row['depth'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at']
        ];
    }

    echo json_encode($cohorts);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
