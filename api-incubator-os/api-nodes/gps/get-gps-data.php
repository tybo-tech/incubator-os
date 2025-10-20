<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

include_once '../../config/Database.php';
include_once '../../models/GpsImport.php';

$companyId = $_GET['company_id'] ?? null;

try {
    $database = new Database();
    $db = $database->connect();
    $gpsImport = new GpsImport($db);

    if ($companyId) {
        // Get GPS data for specific company
        $stmt = $db->prepare("SELECT * FROM nodes WHERE type = 'gps_targets' AND company_id = ? ORDER BY created_at DESC LIMIT 1");
        $stmt->execute([$companyId]);
        $gpsNode = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($gpsNode) {
            $gpsNode['data'] = json_decode($gpsNode['data'], true);
            $extractedTargets = $gpsImport->extractGpsTargets($gpsNode);
            
            $result = [
                'company_id' => $companyId,
                'gps_node' => $gpsNode,
                'extracted_targets' => $extractedTargets,
                'targets_count' => count($extractedTargets),
                'targets_by_category' => []
            ];
            
            // Group targets by category
            foreach ($extractedTargets as $target) {
                $category = $target['category'];
                if (!isset($result['targets_by_category'][$category])) {
                    $result['targets_by_category'][$category] = [];
                }
                $result['targets_by_category'][$category][] = $target;
            }
            
        } else {
            $result = [
                'company_id' => $companyId,
                'message' => 'No GPS data found for this company',
                'gps_node' => null,
                'extracted_targets' => [],
                'targets_count' => 0
            ];
        }
    } else {
        // Get list of companies with GPS data
        $stmt = $db->prepare("SELECT DISTINCT company_id, COUNT(*) as nodes_count FROM nodes WHERE type = 'gps_targets' GROUP BY company_id ORDER BY company_id");
        $stmt->execute();
        $companies = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $result = [
            'message' => 'Available companies with GPS data',
            'companies' => $companies,
            'total_companies' => count($companies),
            'usage' => 'Add ?company_id=X to get GPS data for specific company'
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