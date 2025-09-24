<?php
require_once '../config/Database.php';
require_once '../models/MetricType.php';
require_once '../models/MetricRecord.php';
require_once '../config/headers.php';

header('Content-Type: application/json');

$database = new Database();
$db = $database->connect();

$metricType = new MetricType($db);
$metricRecord = new MetricRecord($db);

$method = $_SERVER['REQUEST_METHOD'];
$request = json_decode(file_get_contents('php://input'), true);

try {
    switch ($method) {
        case 'GET':
            handleGetRequest();
            break;
        case 'POST':
            handlePostRequest();
            break;
        case 'PUT':
            handlePutRequest();
            break;
        case 'DELETE':
            handleDeleteRequest();
            break;
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

function handleGetRequest() {
    global $metricType, $metricRecord;

    $action = $_GET['action'] ?? '';

    switch ($action) {
        case 'types':
            // Get all metric types
            $types = $metricType->listAll();
            echo json_encode(['success' => true, 'data' => $types]);
            break;

        case 'types-with-categories':
            // Get metric types that have categories
            $types = $metricType->getTypesWithCategories();
            echo json_encode(['success' => true, 'data' => $types]);
            break;

        case 'categories':
            // Get categories for a specific metric type
            $typeId = intval($_GET['type_id'] ?? 0);
            if (!$typeId) {
                http_response_code(400);
                echo json_encode(['error' => 'type_id is required']);
                return;
            }

            $categories = $metricType->getCategories($typeId);
            echo json_encode(['success' => true, 'data' => $categories]);
            break;

        case 'records':
            // Get records for a company
            $companyId = intval($_GET['company_id'] ?? 0);
            $year = intval($_GET['year'] ?? 0) ?: null;
            $periodType = $_GET['period_type'] ?? null;

            if (!$companyId) {
                http_response_code(400);
                echo json_encode(['error' => 'company_id is required']);
                return;
            }

            $records = $metricRecord->getByCompany($companyId, $year, $periodType);
            echo json_encode(['success' => true, 'data' => $records]);
            break;

        case 'records-by-category':
            // Get records grouped by category
            $companyId = intval($_GET['company_id'] ?? 0);
            $typeId = intval($_GET['type_id'] ?? 0);
            $year = intval($_GET['year'] ?? 0);

            if (!$companyId || !$typeId || !$year) {
                http_response_code(400);
                echo json_encode(['error' => 'company_id, type_id, and year are required']);
                return;
            }

            $records = $metricRecord->getRecordsByCategory($companyId, $typeId, $year);
            echo json_encode(['success' => true, 'data' => $records]);
            break;

        default:
            http_response_code(400);
            echo json_encode(['error' => 'Invalid action']);
            break;
    }
}

function handlePostRequest() {
    global $metricType, $metricRecord, $request;

    $action = $request['action'] ?? '';

    switch ($action) {
        case 'create-type':
            // Create new metric type
            $requiredFields = ['code', 'name'];
            foreach ($requiredFields as $field) {
                if (empty($request[$field])) {
                    http_response_code(400);
                    echo json_encode(['error' => "$field is required"]);
                    return;
                }
            }

            $type = $metricType->add($request);
            echo json_encode(['success' => true, 'data' => $type]);
            break;

        case 'create-record':
            // Create new metric record
            $requiredFields = ['company_id', 'metric_type_id', 'year', 'value'];
            foreach ($requiredFields as $field) {
                if (!isset($request[$field])) {
                    http_response_code(400);
                    echo json_encode(['error' => "$field is required"]);
                    return;
                }
            }

            $record = $metricRecord->add($request);
            echo json_encode(['success' => true, 'data' => $record]);
            break;

        case 'bulk-create-categories':
            // Bulk create records with categories
            $requiredFields = ['company_id', 'metric_type_id', 'year', 'records'];
            foreach ($requiredFields as $field) {
                if (!isset($request[$field])) {
                    http_response_code(400);
                    echo json_encode(['error' => "$field is required"]);
                    return;
                }
            }

            $insertedIds = $metricRecord->bulkInsertWithCategories(
                $request['company_id'],
                $request['metric_type_id'],
                $request['year'],
                $request['records']
            );

            echo json_encode(['success' => true, 'data' => ['inserted_ids' => $insertedIds]]);
            break;

        default:
            http_response_code(400);
            echo json_encode(['error' => 'Invalid action']);
            break;
    }
}

function handlePutRequest() {
    global $metricType, $metricRecord, $request;

    $action = $request['action'] ?? '';

    switch ($action) {
        case 'update-type':
            $id = intval($request['id'] ?? 0);
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'id is required']);
                return;
            }

            $type = $metricType->update($id, $request);
            echo json_encode(['success' => true, 'data' => $type]);
            break;

        case 'update-record':
            $id = intval($request['id'] ?? 0);
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'id is required']);
                return;
            }

            $record = $metricRecord->update($id, $request);
            echo json_encode(['success' => true, 'data' => $record]);
            break;

        case 'update-categories':
            // Update categories for a metric type
            $typeId = intval($request['type_id'] ?? 0);
            if (!$typeId || !isset($request['categories'])) {
                http_response_code(400);
                echo json_encode(['error' => 'type_id and categories are required']);
                return;
            }

            $type = $metricType->updateCategories($typeId, $request['categories']);
            echo json_encode(['success' => true, 'data' => $type]);
            break;

        default:
            http_response_code(400);
            echo json_encode(['error' => 'Invalid action']);
            break;
    }
}

function handleDeleteRequest() {
    global $metricType, $metricRecord, $request;

    $action = $request['action'] ?? '';

    switch ($action) {
        case 'delete-type':
            $id = intval($request['id'] ?? 0);
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'id is required']);
                return;
            }

            $success = $metricType->delete($id);
            echo json_encode(['success' => $success]);
            break;

        case 'delete-record':
            $id = intval($request['id'] ?? 0);
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'id is required']);
                return;
            }

            $success = $metricRecord->delete($id);
            echo json_encode(['success' => $success]);
            break;

        default:
            http_response_code(400);
            echo json_encode(['error' => 'Invalid action']);
            break;
    }
}
?>
