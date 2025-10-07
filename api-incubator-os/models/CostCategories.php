<?php
declare(strict_types=1);

final class CostCategories
{
    private PDO $conn;

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /* =========================================================================
       CREATE / UPDATE
       ========================================================================= */

    /**
     * Add a new cost category.
     */
    public function add(array $data): array
    {
        $sql = "INSERT INTO cost_categories (
                    name, description, is_active, created_at, updated_at
                ) VALUES (
                    :name, :description, :is_active, NOW(), NOW()
                )";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            ':name'        => $data['name'],
            ':description' => $data['description'] ?? null,
            ':is_active'   => isset($data['is_active']) ? (int)$data['is_active'] : 1,
        ]);

        return $this->getById((int)$this->conn->lastInsertId());
    }

    /**
     * Update a cost category.
     */
    public function update(int $id, array $fields): ?array
    {
        $allowed = ['name', 'description', 'is_active'];
        $sets = [];
        $params = [];

        foreach ($allowed as $col) {
            if (array_key_exists($col, $fields)) {
                $sets[] = "$col = :$col";
                $params[":$col"] = $fields[$col];
            }
        }

        if (!$sets) return $this->getById($id);

        $params[':id'] = $id;
        $sql = "UPDATE cost_categories
                SET " . implode(', ', $sets) . ", updated_at = NOW()
                WHERE id = :id";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $this->getById($id);
    }

    /* =========================================================================
       READ METHODS
       ========================================================================= */

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM cost_categories WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->cast($row) : null;
    }

    public function listAll(bool $onlyActive = false): array
    {
        $sql = "SELECT * FROM cost_categories";
        if ($onlyActive) {
            $sql .= " WHERE is_active = 1";
        }
        $sql .= " ORDER BY name ASC";

        $stmt = $this->conn->query($sql);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return array_map([$this, 'cast'], $rows);
    }

    public function getByName(string $name): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM cost_categories WHERE LOWER(name) = LOWER(?) LIMIT 1");
        $stmt->execute([$name]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->cast($row) : null;
    }

    /* =========================================================================
       DELETE / STATUS
       ========================================================================= */

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM cost_categories WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    public function setActiveStatus(int $id, bool $active): bool
    {
        $stmt = $this->conn->prepare("UPDATE cost_categories SET is_active = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$active ? 1 : 0, $id]);
        return $stmt->rowCount() > 0;
    }

    /* =========================================================================
       HELPERS
       ========================================================================= */

    private function cast(array $row): array
    {
        $row['id'] = (int)($row['id'] ?? 0);
        $row['is_active'] = (bool)($row['is_active'] ?? 0);
        return $row;
    }
}
