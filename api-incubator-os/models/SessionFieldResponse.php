<?php
declare(strict_types=1);

class SessionFieldResponse
{
    private PDO $conn;

    /** Columns allowed to be written via add/update */
    private const WRITABLE = [
        'session_id', 'field_node_id', 'value_text', 'value_num', 'value_date',
        'value_bool', 'value_json', 'file_url'
    ];

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /** Create a new session field response. $data is an associative array with any WRITABLE keys. */
    public function add(array $data): array
    {
        $fields = $this->filterWritable($data);
        if (!isset($fields['session_id']) || !isset($fields['field_node_id'])) {
            throw new InvalidArgumentException("Fields 'session_id' and 'field_node_id' are required");
        }

        $sql = "INSERT INTO session_field_responses (" . implode(',', array_keys($fields)) . ")
                VALUES (" . implode(',', array_fill(0, count($fields), '?')) . ")";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute(array_values($fields));

        return $this->getById((int)$this->conn->lastInsertId());
    }

    /** Full update (PATCH style). Only provided keys are updated. */
    public function update(int $id, array $data): ?array
    {
        $fields = $this->filterWritable($data);
        if (!$fields) return $this->getById($id);

        $sets = [];
        $params = [];
        foreach ($fields as $k => $v) {
            $sets[] = "{$k} = ?";
            $params[] = $v;
        }
        $params[] = $id;

        $sql = "UPDATE session_field_responses SET " . implode(', ', $sets) . ", updated_at = NOW() WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $this->getById($id);
    }

    /** Upsert response by session and field */
    public function upsert(int $sessionId, int $fieldNodeId, array $data): array
    {
        $existing = $this->getBySessionAndField($sessionId, $fieldNodeId);

        $data['session_id'] = $sessionId;
        $data['field_node_id'] = $fieldNodeId;

        if ($existing) {
            return $this->update((int)$existing['id'], $data);
        }
        return $this->add($data);
    }

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM session_field_responses WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    public function getBySessionAndField(int $sessionId, int $fieldNodeId): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM session_field_responses WHERE session_id = ? AND field_node_id = ?");
        $stmt->execute([$sessionId, $fieldNodeId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    /** Get all responses for a session */
    public function getBySession(int $sessionId): array
    {
        $stmt = $this->conn->prepare("SELECT * FROM session_field_responses WHERE session_id = ? ORDER BY field_node_id");
        $stmt->execute([$sessionId]);

        $responses = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $responses[] = $this->castRow($row);
        }
        return $responses;
    }

    /** Get responses with field details for a session */
    public function getBySessionWithFields(int $sessionId): array
    {
        $stmt = $this->conn->prepare("
            SELECT sfr.*, fn.node_key, fn.field_type, fn.title
            FROM session_field_responses sfr
            JOIN form_nodes fn ON sfr.field_node_id = fn.id
            WHERE sfr.session_id = ?
            ORDER BY fn.sort_order, fn.id
        ");
        $stmt->execute([$sessionId]);

        $responses = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $responses[] = $this->castRow($row);
        }
        return $responses;
    }

    /** Get responses for a specific field across multiple sessions */
    public function getByField(int $fieldNodeId, array $filters = []): array
    {
        $where = ["field_node_id = ?"];
        $params = [$fieldNodeId];

        if (!empty($filters['session_ids'])) {
            $placeholders = implode(',', array_fill(0, count($filters['session_ids']), '?'));
            $where[] = "session_id IN ($placeholders)";
            $params = array_merge($params, $filters['session_ids']);
        }

        $sql = "SELECT * FROM session_field_responses WHERE " . implode(' AND ', $where) . " ORDER BY created_at DESC";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        $responses = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $responses[] = $this->castRow($row);
        }
        return $responses;
    }

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM session_field_responses WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    /** Delete all responses for a session */
    public function deleteBySession(int $sessionId): int
    {
        $stmt = $this->conn->prepare("DELETE FROM session_field_responses WHERE session_id = ?");
        $stmt->execute([$sessionId]);
        return $stmt->rowCount();
    }

    /** Save multiple responses for a session */
    public function saveResponses(int $sessionId, array $responses): array
    {
        $this->conn->beginTransaction();
        try {
            $savedResponses = [];
            foreach ($responses as $response) {
                if (!isset($response['field_node_id'])) {
                    throw new InvalidArgumentException("Each response must have 'field_node_id'");
                }
                $savedResponses[] = $this->upsert($sessionId, (int)$response['field_node_id'], $response);
            }
            $this->conn->commit();
            return $savedResponses;
        } catch (Exception $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }

    /* ------------------------- internals ------------------------- */

    private function filterWritable(array $data): array
    {
        $out = [];
        foreach (self::WRITABLE as $k) {
            if (array_key_exists($k, $data)) {
                if (in_array($k, ['session_id', 'field_node_id'], true)) {
                    $out[$k] = is_null($data[$k]) ? null : (int)$data[$k];
                } elseif ($k === 'value_num') {
                    $out[$k] = is_null($data[$k]) ? null : (float)$data[$k];
                } elseif ($k === 'value_bool') {
                    $out[$k] = is_null($data[$k]) ? null : ($data[$k] ? 1 : 0);
                } elseif ($k === 'value_json') {
                    $out[$k] = is_null($data[$k]) ? null : (is_string($data[$k]) ? $data[$k] : json_encode($data[$k]));
                } else {
                    $out[$k] = $data[$k];
                }
            }
        }
        return $out;
    }

    private function castRow(array $row): array
    {
        // Cast known numeric/boolean fields for consistent API responses
        foreach (['id', 'session_id', 'field_node_id'] as $i) {
            if (isset($row[$i]) && $row[$i] !== null) $row[$i] = (int)$row[$i];
        }
        if (isset($row['value_num']) && $row['value_num'] !== null) {
            $row['value_num'] = (float)$row['value_num'];
        }
        if (isset($row['value_bool']) && $row['value_bool'] !== null) {
            $row['value_bool'] = (bool)$row['value_bool'];
        }
        if (isset($row['value_json']) && $row['value_json'] !== null) {
            $row['value_json'] = json_decode($row['value_json'], true);
        }
        return $row;
    }
}
