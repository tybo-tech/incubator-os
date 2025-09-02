<?php
declare(strict_types=1);

class FormNode
{
    private PDO $conn;

    /** Columns allowed to be written via add/update */
    private const WRITABLE = [
        'form_id', 'parent_id', 'depth', 'node_type', 'node_key', 'title', 'description',
        'sort_order', 'settings_json', 'layout_class', 'field_type', 'placeholder',
        'required', 'default_json', 'options_json', 'validation_json', 'visibility_json',
        'metric_key'
    ];

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /** Create a new form node. $data is an associative array with any WRITABLE keys. */
    public function add(array $data): array
    {
        $fields = $this->filterWritable($data);
        if (!isset($fields['form_id']) || !isset($fields['node_type']) || !isset($fields['node_key'])) {
            throw new InvalidArgumentException("Fields 'form_id', 'node_type', and 'node_key' are required");
        }

        $sql = "INSERT INTO form_nodes (" . implode(',', array_keys($fields)) . ")
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

        $sql = "UPDATE form_nodes SET " . implode(', ', $sets) . " WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $this->getById($id);
    }

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM form_nodes WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    /** Get all nodes for a form, structured hierarchically */
    public function getByFormId(int $formId): array
    {
        $stmt = $this->conn->prepare("
            SELECT * FROM form_nodes
            WHERE form_id = ?
            ORDER BY depth ASC, sort_order ASC, id ASC
        ");
        $stmt->execute([$formId]);

        $nodes = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $nodes[] = $this->castRow($row);
        }
        return $nodes;
    }

    /** Get direct children of a node */
    public function getChildren(int $parentId): array
    {
        $stmt = $this->conn->prepare("
            SELECT * FROM form_nodes
            WHERE parent_id = ?
            ORDER BY sort_order ASC, id ASC
        ");
        $stmt->execute([$parentId]);

        $nodes = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $nodes[] = $this->castRow($row);
        }
        return $nodes;
    }

    /** Get top-level nodes (tabs) for a form */
    public function getTabs(int $formId): array
    {
        $stmt = $this->conn->prepare("
            SELECT * FROM form_nodes
            WHERE form_id = ? AND parent_id IS NULL AND node_type = 'tab'
            ORDER BY sort_order ASC, id ASC
        ");
        $stmt->execute([$formId]);

        $nodes = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $nodes[] = $this->castRow($row);
        }
        return $nodes;
    }

    /** Get all field nodes for a form */
    public function getFields(int $formId): array
    {
        $stmt = $this->conn->prepare("
            SELECT * FROM form_nodes
            WHERE form_id = ? AND node_type = 'field'
            ORDER BY sort_order ASC, id ASC
        ");
        $stmt->execute([$formId]);

        $nodes = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $nodes[] = $this->castRow($row);
        }
        return $nodes;
    }

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM form_nodes WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    /** Reorder nodes within the same parent */
    public function reorder(int $formId, ?int $parentId, array $nodeIds): bool
    {
        $this->conn->beginTransaction();
        try {
            foreach ($nodeIds as $index => $nodeId) {
                $stmt = $this->conn->prepare("
                    UPDATE form_nodes
                    SET sort_order = ?
                    WHERE id = ? AND form_id = ? AND parent_id " .
                    ($parentId ? "= ?" : "IS NULL")
                );
                $params = [$index, $nodeId, $formId];
                if ($parentId) $params[] = $parentId;
                $stmt->execute($params);
            }
            $this->conn->commit();
            return true;
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
                if (in_array($k, ['form_id', 'parent_id', 'depth', 'sort_order'], true)) {
                    $out[$k] = is_null($data[$k]) ? null : (int)$data[$k];
                } elseif ($k === 'required') {
                    $out[$k] = $data[$k] ? 1 : 0;
                } elseif (in_array($k, ['settings_json', 'default_json', 'options_json', 'validation_json', 'visibility_json'], true)) {
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
        foreach (['id', 'form_id', 'parent_id', 'depth', 'sort_order'] as $i) {
            if (isset($row[$i]) && $row[$i] !== null) $row[$i] = (int)$row[$i];
        }
        if (isset($row['required'])) $row['required'] = (bool)$row['required'];

        // Parse JSON fields
        foreach (['settings_json', 'default_json', 'options_json', 'validation_json', 'visibility_json'] as $j) {
            if (isset($row[$j]) && $row[$j] !== null) {
                $row[$j] = json_decode($row[$j], true);
            }
        }
        return $row;
    }
}
