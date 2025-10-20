<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../../config/database.php';
require_once '../../models/SwotImport.php';

try {
    $database = new Database();
    $db = $database->connect();
    $swotImport = new SwotImport($db);

    $action = $_GET['action'] ?? 'stats';

    switch ($action) {
        case 'count':
            $response = [
                'success' => true,
                'data' => [
                    'swot_nodes' => $swotImport->countSwotNodes(),
                    'swot_action_items' => $swotImport->countSwotActionItems()
                ],
                'message' => 'SWOT count retrieved successfully'
            ];
            break;

        case 'stats':
            $response = [
                'success' => true,
                'data' => $swotImport->getImportStats(),
                'message' => 'SWOT statistics retrieved successfully'
            ];
            break;

        case 'preview':
            $limit = (int)($_GET['limit'] ?? 3);
            $response = [
                'success' => true,
                'data' => $swotImport->previewSwotImport($limit),
                'message' => 'SWOT import preview generated successfully'
            ];
            break;

        case 'sample-data':
            $nodes = $swotImport->getAllSwotNodes();
            $sampleNode = !empty($nodes) ? $nodes[0] : null;

            $response = [
                'success' => true,
                'data' => [
                    'total_nodes' => count($nodes),
                    'sample_node' => $sampleNode,
                    'structure_info' => [
                        'type' => 'swot_analysis',
                        'sections' => ['internal', 'external'],
                        'categories' => [
                            'internal' => ['strengths', 'weaknesses'],
                            'external' => ['opportunities', 'threats']
                        ],
                        'fields_per_item' => [
                            'description', 'action_required', 'assigned_to',
                            'target_date', 'status', 'priority', 'impact', 'date_added'
                        ]
                    ]
                ],
                'message' => 'SWOT sample data retrieved successfully'
            ];
            break;

        case 'clear':
            $deletedCount = $swotImport->clearSwotActionItems();
            $response = [
                'success' => true,
                'data' => [
                    'deleted_count' => $deletedCount
                ],
                'message' => "Cleared {$deletedCount} SWOT action items successfully"
            ];
            break;

        case 'import':
            $importResult = $swotImport->importSwotToActionItems();

            // Get updated counts
            $finalStats = $swotImport->getImportStats();

            $response = [
                'success' => true,
                'data' => [
                    'import_summary' => $importResult,
                    'final_stats' => $finalStats
                ],
                'message' => "Successfully imported {$importResult['total_items_imported']} SWOT items from {$importResult['total_nodes']} nodes"
            ];
            break;

        default:
            $response = [
                'success' => false,
                'error' => 'Invalid action specified',
                'available_actions' => ['count', 'stats', 'preview', 'sample-data', 'clear', 'import']
            ];
            http_response_code(400);
            break;
    }

} catch (Exception $e) {
    $response = [
        'success' => false,
        'error' => $e->getMessage(),
        'debug_info' => [
            'action' => $_GET['action'] ?? 'none',
            'timestamp' => date('Y-m-d H:i:s')
        ]
    ];
    http_response_code(500);
}

echo json_encode($response, JSON_PRETTY_PRINT);
?>
