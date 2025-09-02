<?php
declare(strict_types=1);

class FormSession
{
    private PDO $conn;

    /** Columns allowed to be written via add/update */
    private const WRITABLE = [
        'categories_item_id', 'form_id', 'session_date', 'status', 'started_at',
        'submitted_at', 'verified_by', 'verified_at', 'approved_by', 'approved_at',
        'created_by', 'notes'
    ];

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /** Create a new form session. $data is an associative array with any WRITABLE keys. */
    public function add(array $data): array
    {
        $fields = $this->filterWritable($data);
        if (!isset($fields['categories_item_id']) || !isset($fields['form_id']) || !isset($fields['session_date'])) {
            throw new InvalidArgumentException("Fields 'categories_item_id', 'form_id', and 'session_date' are required");
        }

        $sql = "INSERT INTO form_sessions (" . implode(',', array_keys($fields)) . ")
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

        $sql = "UPDATE form_sessions SET " . implode(', ', $sets) . " WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $this->getById($id);
    }

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM form_sessions WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    /** Get sessions by enrollment (categories_item_id) */
    public function getByEnrollment(int $categoriesItemId, array $filters = []): array
    {
        $where = ["categories_item_id = ?"];
        $params = [$categoriesItemId];

        if (!empty($filters['form_id'])) {
            $where[] = "form_id = ?";
            $params[] = $filters['form_id'];
        }
        if (!empty($filters['status'])) {
            $where[] = "status = ?";
            $params[] = $filters['status'];
        }
        if (!empty($filters['session_date'])) {
            $where[] = "session_date = ?";
            $params[] = $filters['session_date'];
        }

        $sql = "SELECT * FROM form_sessions WHERE " . implode(' AND ', $where) . " ORDER BY session_date DESC";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        $sessions = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $sessions[] = $this->castRow($row);
        }
        return $sessions;
    }

    /** Search form sessions with filters */
    public function search(array $filters = [], int $limit = 50, int $offset = 0): array
    {
        $where = [];
        $params = [];

        if (!empty($filters['categories_item_id'])) {
            $where[] = "categories_item_id = ?";
            $params[] = $filters['categories_item_id'];
        }
        if (!empty($filters['form_id'])) {
            $where[] = "form_id = ?";
            $params[] = $filters['form_id'];
        }
        if (!empty($filters['status'])) {
            $where[] = "status = ?";
            $params[] = $filters['status'];
        }
        if (!empty($filters['session_date_from'])) {
            $where[] = "session_date >= ?";
            $params[] = $filters['session_date_from'];
        }
        if (!empty($filters['session_date_to'])) {
            $where[] = "session_date <= ?";
            $params[] = $filters['session_date_to'];
        }

        $sql = "SELECT * FROM form_sessions";
        if ($where) $sql .= " WHERE " . implode(' AND ', $where);
        $sql .= " ORDER BY session_date DESC LIMIT ? OFFSET ?";

        $stmt = $this->conn->prepare($sql);
        foreach ($params as $i => $v) {
            $stmt->bindValue($i + 1, $v);
        }
        $stmt->bindValue(count($params) + 1, $limit, PDO::PARAM_INT);
        $stmt->bindValue(count($params) + 2, $offset, PDO::PARAM_INT);
        $stmt->execute();

        $out = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $out[] = $this->castRow($row);
        }
        return $out;
    }

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM form_sessions WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    /** Submit a session */
    public function submit(int $id): ?array
    {
        return $this->update($id, [
            'status' => 'submitted',
            'submitted_at' => date('Y-m-d H:i:s')
        ]);
    }

    /** Verify a session by advisor */
    public function verify(int $id, int $verifiedBy): ?array
    {
        return $this->update($id, [
            'status' => 'advisor_verified',
            'verified_by' => $verifiedBy,
            'verified_at' => date('Y-m-d H:i:s')
        ]);
    }

    /** Approve a session by program */
    public function approve(int $id, int $approvedBy): ?array
    {
        return $this->update($id, [
            'status' => 'program_approved',
            'approved_by' => $approvedBy,
            'approved_at' => date('Y-m-d H:i:s')
        ]);
    }

    /** Cancel a session */
    public function cancel(int $id): ?array
    {
        return $this->update($id, ['status' => 'cancelled']);
    }

    /* ------------------------- internals ------------------------- */

    private function filterWritable(array $data): array
    {
        $out = [];
        foreach (self::WRITABLE as $k) {
            if (array_key_exists($k, $data)) {
                if (in_array($k, ['categories_item_id', 'form_id', 'verified_by', 'approved_by', 'created_by'], true)) {
                    $out[$k] = is_null($data[$k]) ? null : (int)$data[$k];
                } else {
                    $out[$k] = $data[$k];
                }
            }
        }
        return $out;
    }

    private function castRow(array $row): array
    {
        // Cast known numeric fields for consistent API responses
        foreach (['id', 'categories_item_id', 'form_id', 'verified_by', 'approved_by', 'created_by'] as $i) {
            if (isset($row[$i]) && $row[$i] !== null) $row[$i] = (int)$row[$i];
        }
        return $row;
    }
}
