<?php
/**
 * /api-nodes/grant/schedule.php
 *
 * CRUD for Presentation Schedules.
 * Schedules are stored as nodes of type "presentation_schedule".
 *
 * GET    ?action=list[&workflow_id=...]   – list all schedules (summary)
 * GET    ?action=get&id=<id>             – full schedule by node id
 * POST                                   – create (body JSON)
 * PUT    ?id=<id>                        – update (body JSON)
 * DELETE ?id=<id>                        – delete
 */

include_once '../../config/Database.php';
include_once '../../config/headers.php';

const NODE_TYPE = 'presentation_schedule';

try {
    $database = new Database();
    $db       = $database->connect();

    $method = $_SERVER['REQUEST_METHOD'];

    // ── LIST ────────────────────────────────────────────────────────────────
    if ($method === 'GET' && ($_GET['action'] ?? '') === 'list') {
        $workflowId = $_GET['workflow_id'] ?? null;

        $sql    = "SELECT id, data, created_at FROM nodes WHERE type = :type";
        $params = [':type' => NODE_TYPE];

        if ($workflowId !== null) {
            $sql .= " AND JSON_UNQUOTE(JSON_EXTRACT(data, '$.workflow_id')) = :wid";
            $params[':wid'] = $workflowId;
        }
        $sql .= " ORDER BY created_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $result = array_map(function ($row) {
            $d = json_decode($row['data'], true);
            return [
                'id'         => (int)$row['id'],
                'title'      => $d['title']       ?? '',
                'workflow_id'=> $d['workflow_id'] ?? '',
                'date'       => $d['date']        ?? '',
                'location'   => $d['location']    ?? '',
                'slot_count' => count($d['slots'] ?? []),
                'created_at' => $row['created_at'],
            ];
        }, $rows);

        echo json_encode($result);
        exit;
    }

    // ── GET SINGLE ──────────────────────────────────────────────────────────
    if ($method === 'GET' && ($_GET['action'] ?? '') === 'get') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'id required']); exit; }

        $stmt = $db->prepare("SELECT id, data, created_at FROM nodes WHERE id = ? AND type = ?");
        $stmt->execute([$id, NODE_TYPE]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) { http_response_code(404); echo json_encode(['error' => 'Schedule not found']); exit; }

        $d          = json_decode($row['data'], true);
        $d['id']    = (int)$row['id'];
        $d['created_at'] = $row['created_at'];
        echo json_encode($d);
        exit;
    }

    // ── CREATE ──────────────────────────────────────────────────────────────
    if ($method === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true);
        if (!$body) { http_response_code(400); echo json_encode(['error' => 'Invalid JSON body']); exit; }

        // Validate required fields
        foreach (['title', 'date', 'start_time', 'slot_duration'] as $field) {
            if (empty($body[$field])) {
                http_response_code(422);
                echo json_encode(['error' => "Field '{$field}' is required"]);
                exit;
            }
        }

        $data = [
            'title'        => trim($body['title']),
            'workflow_id'  => trim($body['workflow_id']  ?? ''),
            'date'         => trim($body['date']),
            'location'     => trim($body['location']     ?? ''),
            'description'  => trim($body['description']  ?? ''),
            'start_time'   => trim($body['start_time']),
            'slot_duration'=> (int)$body['slot_duration'],
            'breaks'       => $body['breaks'] ?? [],
            'slots'        => $body['slots']  ?? [],
        ];

        $stmt = $db->prepare(
            "INSERT INTO nodes (type, data, created_at) VALUES (:type, :data, NOW())"
        );
        $stmt->execute([':type' => NODE_TYPE, ':data' => json_encode($data)]);
        $newId = (int)$db->lastInsertId();

        $data['id'] = $newId;
        http_response_code(201);
        echo json_encode($data);
        exit;
    }

    // ── UPDATE ──────────────────────────────────────────────────────────────
    if ($method === 'PUT') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'id required']); exit; }

        $body = json_decode(file_get_contents('php://input'), true);
        if (!$body) { http_response_code(400); echo json_encode(['error' => 'Invalid JSON body']); exit; }

        // Confirm exists
        $chk = $db->prepare("SELECT id FROM nodes WHERE id = ? AND type = ?");
        $chk->execute([$id, NODE_TYPE]);
        if (!$chk->fetch()) { http_response_code(404); echo json_encode(['error' => 'Schedule not found']); exit; }

        $data = [
            'title'        => trim($body['title']       ?? ''),
            'workflow_id'  => trim($body['workflow_id'] ?? ''),
            'date'         => trim($body['date']        ?? ''),
            'location'     => trim($body['location']    ?? ''),
            'description'  => trim($body['description'] ?? ''),
            'start_time'   => trim($body['start_time']  ?? ''),
            'slot_duration'=> (int)($body['slot_duration'] ?? 15),
            'breaks'       => $body['breaks'] ?? [],
            'slots'        => $body['slots']  ?? [],
        ];

        $stmt = $db->prepare("UPDATE nodes SET data = :data WHERE id = :id");
        $stmt->execute([':data' => json_encode($data), ':id' => $id]);

        $data['id'] = $id;
        echo json_encode($data);
        exit;
    }

    // ── DELETE ──────────────────────────────────────────────────────────────
    if ($method === 'DELETE') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'id required']); exit; }

        $stmt = $db->prepare("DELETE FROM nodes WHERE id = ? AND type = ?");
        $stmt->execute([$id, NODE_TYPE]);

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Schedule not found or already deleted']);
            exit;
        }

        echo json_encode(['success' => true, 'deleted_id' => $id]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
