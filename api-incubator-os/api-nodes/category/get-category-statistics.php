<?php
include_once '../../config/Database.php';
include_once '../../models/Categories.php';
include_once '../../config/headers.php';

$category_id = $_GET['category_id'] ?? null;

try {
    $database = new Database();
    $db = $database->connect();
    $categories = new Categories($db);

    if (!$category_id) {
        http_response_code(400);
        echo json_encode(['error' => 'category_id parameter required']);
        exit;
    }

    $categoryId = (int)$category_id;

    // Get the category to check its type and depth
    $category = $categories->getCategoryById($categoryId);
    if (!$category) {
        http_response_code(404);
        echo json_encode(['error' => 'Category not found']);
        exit;
    }

    $stats = [];

    if ($category['type'] === 'client' && $category['depth'] === 1) {
        // Client statistics
        // Count programs under this client
        $sql = "SELECT COUNT(*) as count FROM categories WHERE parent_id = ? AND type = 'program' AND depth = 2";
        $stmt = $db->prepare($sql);
        $stmt->execute([$categoryId]);
        $stats['programs_count'] = (int)$stmt->fetchColumn();

        // Count cohorts under this client (programs' children)
        $sql = "SELECT COUNT(*) as count FROM categories c1
                JOIN categories c2 ON c2.parent_id = c1.id
                WHERE c1.parent_id = ? AND c1.type = 'program' AND c2.type = 'cohort'";
        $stmt = $db->prepare($sql);
        $stmt->execute([$categoryId]);
        $stats['cohorts_count'] = (int)$stmt->fetchColumn();

        // Count companies under this client (through cohorts)
        $sql = "SELECT COUNT(DISTINCT ci.company_id) as count
                FROM categories c1
                JOIN categories c2 ON c2.parent_id = c1.id
                JOIN categories_item ci ON ci.category_id = c2.id
                WHERE c1.parent_id = ? AND c1.type = 'program' AND c2.type = 'cohort'";
        $stmt = $db->prepare($sql);
        $stmt->execute([$categoryId]);
        $stats['companies_count'] = (int)$stmt->fetchColumn();

    } else if ($category['type'] === 'program' && $category['depth'] === 2) {
        // Program statistics
        // Count cohorts under this program
        $sql = "SELECT COUNT(*) as count FROM categories WHERE parent_id = ? AND type = 'cohort' AND depth = 3";
        $stmt = $db->prepare($sql);
        $stmt->execute([$categoryId]);
        $stats['cohorts_count'] = (int)$stmt->fetchColumn();

        // Count companies under this program (through cohorts)
        $sql = "SELECT COUNT(DISTINCT ci.company_id) as count
                FROM categories c
                JOIN categories_item ci ON ci.category_id = c.id
                WHERE c.parent_id = ? AND c.type = 'cohort'";
        $stmt = $db->prepare($sql);
        $stmt->execute([$categoryId]);
        $stats['companies_count'] = (int)$stmt->fetchColumn();

    } else if ($category['type'] === 'cohort' && $category['depth'] === 3) {
        // Cohort statistics
        // Count companies in this cohort
        $sql = "SELECT COUNT(*) as count FROM categories_item WHERE category_id = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute([$categoryId]);
        $stats['companies_count'] = (int)$stmt->fetchColumn();
    }

    echo json_encode($stats);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
