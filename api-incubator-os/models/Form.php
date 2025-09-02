<?php
declare(strict_types=1);

class Form
{
    private PDO $conn;

    /** Columns allowed to be written via add/update */
    private const WRITABLE = [
        'form_key', 'title', 'description', 'scope_type', 'scope_id',
        'version', 'status'
    ];

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /** Create a new form. $data is an associative array with any WRITABLE keys. */
    public function add(array $data): array
    {
        $fields = $this->filterWritable($data);
        if (!isset($fields['form_key']) || !isset($fields['title'])) {
            throw new InvalidArgumentException("Fields 'form_key' and 'title' are required");
        }

        $sql = "INSERT INTO forms (" . implode(',', array_keys($fields)) . ")
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

        $sql = "UPDATE forms SET " . implode(', ', $sets) . ", updated_at = NOW() WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $this->getById($id);
    }

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM forms WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    public function getByFormKey(string $formKey, string $scopeType = 'global', ?int $scopeId = null): ?array
    {
        $sql = "SELECT * FROM forms WHERE form_key = ? AND scope_type = ?";
        $params = [$formKey, $scopeType];

        if ($scopeId !== null) {
            $sql .= " AND scope_id = ?";
            $params[] = $scopeId;
        } else {
            $sql .= " AND scope_id IS NULL";
        }

        $sql .= " AND status = 'published' ORDER BY version DESC LIMIT 1";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    /** Search forms with filters */
    public function search(array $filters = [], int $limit = 50, int $offset = 0): array
    {
        $where = [];
        $params = [];

        if (!empty($filters['form_key'])) {
            $where[] = "form_key LIKE ?";
            $params[] = '%' . $filters['form_key'] . '%';
        }
        if (!empty($filters['title'])) {
            $where[] = "title LIKE ?";
            $params[] = '%' . $filters['title'] . '%';
        }
        if (!empty($filters['scope_type'])) {
            $where[] = "scope_type = ?";
            $params[] = $filters['scope_type'];
        }
        if (isset($filters['scope_id'])) {
            $where[] = "scope_id = ?";
            $params[] = $filters['scope_id'];
        }
        if (!empty($filters['status'])) {
            $where[] = "status = ?";
            $params[] = $filters['status'];
        }

        $sql = "SELECT * FROM forms";
        if ($where) $sql .= " WHERE " . implode(' AND ', $where);
        $sql .= " ORDER BY created_at DESC LIMIT ? OFFSET ?";

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

    /** Simple list (paged) */
    public function list(int $limit = 50, int $offset = 0): array
    {
        $stmt = $this->conn->prepare("SELECT * FROM forms ORDER BY created_at DESC LIMIT ? OFFSET ?");
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->bindValue(2, $offset, PDO::PARAM_INT);
        $stmt->execute();

        $rows = [];
        while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $rows[] = $this->castRow($r);
        }
        return $rows;
    }

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM forms WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    /** Publish a form (bump version if needed) */
    public function publish(int $id): ?array
    {
        return $this->update($id, ['status' => 'published']);
    }

    /** Archive a form */
    public function archive(int $id): ?array
    {
        return $this->update($id, ['status' => 'archived']);
    }

    /* ------------------------- internals ------------------------- */

    private function filterWritable(array $data): array
    {
        $out = [];
        foreach (self::WRITABLE as $k) {
            if (array_key_exists($k, $data)) {
                if ($k === 'version') {
                    $out[$k] = is_null($data[$k]) ? 1 : (int)$data[$k];
                } elseif ($k === 'scope_id') {
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
        foreach (['id', 'scope_id', 'version'] as $i) {
            if (isset($row[$i]) && $row[$i] !== null) $row[$i] = (int)$row[$i];
        }
        return $row;
    }
}
