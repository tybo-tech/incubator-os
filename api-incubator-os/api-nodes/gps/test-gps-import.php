<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include_once '../../config/Database.php';
include_once '../../models/GpsImport.php';

$action = $_GET['action'] ?? 'stats';

try {
    $database = new Database();
    $db = $database->connect();
    $gpsImport = new GpsImport($db);

    switch ($action) {
        case 'count':
            // Count GPS nodes and action items
            $result = [
                'gps_nodes' => $gpsImport->countGpsNodes(),
                'gps_action_items' => $gpsImport->countGpsActionItems(),
                'timestamp' => date('Y-m-d H:i:s')
            ];
            break;

        case 'stats':
            // Get detailed import statistics
            $result = $gpsImport->getImportStats();
            $result['timestamp'] = date('Y-m-d H:i:s');
            break;

        case 'preview':
            // Preview what would be imported (first 5 nodes)
            $gpsNodes = $gpsImport->getAllGpsNodes();
            $preview = [];

            $count = 0;
            foreach ($gpsNodes as $node) {
                if ($count >= 5) break;

                $actionItems = $gpsImport->extractGpsTargets($node);
                $preview[] = [
                    'node_id' => $node['id'],
                    'company_id' => $node['company_id'],
                    'targets_count' => count($actionItems),
                    'sample_targets' => array_slice($actionItems, 0, 3) // Show first 3 targets
                ];
                $count++;
            }

            $result = [
                'total_gps_nodes' => count($gpsNodes),
                'preview_nodes' => $preview,
                'timestamp' => date('Y-m-d H:i:s')
            ];
            break;

        case 'clear':
            // Clear all GPS action items
            $deletedCount = $gpsImport->clearGpsActionItems();
            $result = [
                'message' => 'GPS action items cleared',
                'deleted_count' => $deletedCount,
                'timestamp' => date('Y-m-d H:i:s')
            ];
            break;

        case 'import':
            // Perform the actual import
            $importResult = $gpsImport->importGpsToActionItems();
            $result = [
                'message' => 'GPS import completed',
                'import_summary' => $importResult,
                'final_stats' => $gpsImport->getImportStats(),
                'timestamp' => date('Y-m-d H:i:s')
            ];
            break;

        case 'sample-data':
            // Get a sample of the actual GPS node data
            $stmt = $db->prepare("SELECT * FROM nodes WHERE type = 'gps_targets' LIMIT 1");
            $stmt->execute();
            $sampleNode = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($sampleNode) {
                $sampleNode['data'] = json_decode($sampleNode['data'], true);
                $extractedTargets = $gpsImport->extractGpsTargets($sampleNode);

                $result = [
                    'sample_node' => $sampleNode,
                    'extracted_targets' => $extractedTargets,
                    'targets_count' => count($extractedTargets)
                ];
            } else {
                $result = [
                    'message' => 'No GPS nodes found in database'
                ];
            }
            break;

        default:
            throw new Exception("Invalid action: $action");
    }

    echo json_encode($result, JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'error' => $e->getMessage(),
        'action' => $action,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
}
?>
