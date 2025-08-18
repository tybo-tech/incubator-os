<?php
declare(strict_types=1);

class FormDefinition
{
    private PDO $conn;

    public function __construct(PDO $db)
    {
        $this->conn = $db;
    }

    /** Create a new global form template */
    public function add(string $formKey, string $title, array $schema, ?string $description = null, bool $isActive = true): array
    {
        $sql = "INSERT INTO form_definitions (form_key, title, description, schema_json, is_active)
                VALUES (?, ?, ?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            $formKey,
            $title,
            $description,
            json_encode($schema, JSON_UNESCAPED_UNICODE),
            $isActive ? 1 : 0
        ]);

        return $this->getById((int)$this->conn->lastInsertId());
    }

    /** Update mutable fields of a form template */
    public function update(int $id, ?string $title = null, ?string $description = null, ?array $schema = null, ?bool $isActive = null): ?array
    {
        $fields = [];
        $params = [];

        if ($title !== null) { $fields[] = "title = ?"; $params[] = $title; }
        if ($description !== null) { $fields[] = "description = ?"; $params[] = $description; }
        if ($schema !== null) { $fields[] = "schema_json = ?"; $params[] = json_encode($schema, JSON_UNESCAPED_UNICODE); }
        if ($isActive !== null) { $fields[] = "is_active = ?"; $params[] = $isActive ? 1 : 0; }

        if (!$fields) return $this->getById($id);

        $sql = "UPDATE form_definitions SET " . implode(", ", $fields) . ", updated_at = NOW() WHERE id = ?";
        $params[] = $id;

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $this->getById($id);
    }

    public function archive(int $id): bool
    {
        $stmt = $this->conn->prepare("UPDATE form_definitions SET is_active = 0, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM form_definitions WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) return null;
        $row['schema_json'] = json_decode($row['schema_json'], true);
        return $row;
    }

    public function getByKey(string $formKey): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM form_definitions WHERE form_key = ?");
        $stmt->execute([$formKey]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) return null;
        $row['schema_json'] = json_decode($row['schema_json'], true);
        return $row;
    }

    /** List forms (optionally only active) */
    public function listForms(?bool $onlyActive = null): array
    {
        if ($onlyActive === null) {
            $stmt = $this->conn->query("SELECT * FROM form_definitions ORDER BY is_active DESC, title ASC");
        } else {
            $stmt = $this->conn->prepare("SELECT * FROM form_definitions WHERE is_active = ? ORDER BY title ASC");
            $stmt->execute([$onlyActive ? 1 : 0]);
        }

        $out = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $row['schema_json'] = json_decode($row['schema_json'], true);
            $out[] = $row;
        }
        return $out;
    }
}
