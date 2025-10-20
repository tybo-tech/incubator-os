<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

include_once '../../config/Database.php';

$companyId = $_GET['company_id'] ?? null;

try {
    $database = new Database();
    $db = $database->connect();

    if ($companyId) {
        // Get action items for specific company
        $stmt = $db->prepare("
            SELECT * FROM action_items
            WHERE context_type = 'gps' AND company_id = ?
            ORDER BY category, created_at
        ");
        $stmt->execute([$companyId]);
        $actionItems = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $result = [
            'company_id' => $companyId,
            'action_items' => $actionItems,
            'count' => count($actionItems),
            'by_category' => []
        ];

        // Group by category
        foreach ($actionItems as $item) {
            $category = $item['category'];
            if (!isset($result['by_category'][$category])) {
                $result['by_category'][$category] = [];
            }
            $result['by_category'][$category][] = $item;
        }

    } else {
        // Get summary of all GPS action items
        $stmt = $db->prepare("
            SELECT
                company_id,
                category,
                COUNT(*) as count,
                SUM(CASE WHEN is_complete = 1 THEN 1 ELSE 0 END) as completed,
                AVG(progress) as avg_progress
            FROM action_items
            WHERE context_type = 'gps'
            GROUP BY company_id, category
            ORDER BY company_id, category
        ");
        $stmt->execute();
        $summary = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Total count
        $stmt = $db->prepare("SELECT COUNT(*) as total FROM action_items WHERE context_type = 'gps'");
        $stmt->execute();
        $total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

        $result = [
            'total_gps_action_items' => $total,
            'summary_by_company_category' => $summary,
            'usage' => 'Add ?company_id=X to get action items for specific company'
        ];
    }

    echo json_encode($result, JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'error' => $e->getMessage(),
        'company_id' => $companyId
    ], JSON_PRETTY_PRINT);
}
?>
