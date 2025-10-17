<?php
declare(strict_types=1);

final class FinancialCategories
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
     * Add a new financial category.
     */
    public function add(array $data): array
    {
        $sql = "INSERT INTO financial_categories (
                    name, item_type, description, bg_color, text_color, is_active, created_at, updated_at
                ) VALUES (
                    :name, :item_type, :description, :bg_color, :text_color, :is_active, NOW(), NOW()
                )";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            ':name'        => $data['name'],
            ':item_type'   => strtolower($data['item_type']),
            ':description' => $data['description'] ?? null,
            ':bg_color'    => $data['bg_color'] ?? '#16a085',
            ':text_color'  => $data['text_color'] ?? '#ecf0f1',
            ':is_active'   => isset($data['is_active']) ? (int)$data['is_active'] : 1,
        ]);

        return $this->getById((int)$this->conn->lastInsertId());
    }

    /**
     * Update a financial category.
     */
    public function update(int $id, array $fields): ?array
    {
        $allowed = ['name', 'item_type', 'description', 'bg_color', 'text_color', 'is_active'];
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
        $sql = "UPDATE financial_categories
                SET " . implode(', ', $sets) . ", updated_at = NOW()
                WHERE id = :id";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $this->getById($id);
    }

    /**
     * Update category colors specifically for chart visualization.
     */
    public function updateColors(int $id, string $bgColor, string $textColor): ?array
    {
        $stmt = $this->conn->prepare("
            UPDATE financial_categories
            SET bg_color = :bg_color, text_color = :text_color, updated_at = NOW()
            WHERE id = :id
        ");

        $stmt->execute([
            ':id' => $id,
            ':bg_color' => $bgColor,
            ':text_color' => $textColor
        ]);

        return $this->getById($id);
    }

    /* =========================================================================
       READ METHODS
       ========================================================================= */

    /**
     * Get a single category by ID.
     */
    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM financial_categories WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->cast($row) : null;
    }

    /**
     * Get a category by name and item_type.
     */
    public function getByNameAndType(string $name, string $itemType): ?array
    {
        $stmt = $this->conn->prepare("
            SELECT * FROM financial_categories
            WHERE LOWER(name) = LOWER(:name)
              AND item_type = :type
            LIMIT 1
        ");
        $stmt->execute([
            ':name' => $name,
            ':type' => strtolower($itemType)
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->cast($row) : null;
    }

    /**
     * List all categories, optionally filtered by type or active state.
     */
    public function listAll(?string $itemType = null, bool $onlyActive = false): array
    {
        $sql = "SELECT * FROM financial_categories WHERE 1=1";
        $params = [];

        if ($itemType) {
            $sql .= " AND item_type = :type";
            $params[':type'] = strtolower($itemType);
        }
        if ($onlyActive) {
            $sql .= " AND is_active = 1";
        }

        $sql .= " ORDER BY item_type ASC, name ASC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        return array_map([$this, 'cast'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * List categories filtered by multiple item types (for flexible filtering).
     * Useful for Cost Structure (direct_cost + operational_cost) or Balance Sheet (asset + liability + equity).
     */
    public function listByMultipleTypes(?string $itemType1 = null, ?string $itemType2 = null, bool $onlyActive = false): array
    {
        $sql = "SELECT * FROM financial_categories WHERE 1=1";
        $params = [];

        // Build dynamic WHERE clause for multiple types
        $typeConditions = [];
        if ($itemType1) {
            $typeConditions[] = "item_type = :type1";
            $params[':type1'] = strtolower($itemType1);
        }
        if ($itemType2) {
            $typeConditions[] = "item_type = :type2";
            $params[':type2'] = strtolower($itemType2);
        }

        if (!empty($typeConditions)) {
            $sql .= " AND (" . implode(' OR ', $typeConditions) . ")";
        }

        if ($onlyActive) {
            $sql .= " AND is_active = 1";
        }

        $sql .= " ORDER BY item_type ASC, name ASC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        return array_map([$this, 'cast'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /* =========================================================================
       DELETE / STATUS
       ========================================================================= */

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM financial_categories WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    public function setActiveStatus(int $id, bool $active): bool
    {
        $stmt = $this->conn->prepare("
            UPDATE financial_categories
            SET is_active = ?, updated_at = NOW()
            WHERE id = ?
        ");
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
        $row['item_type'] = strtolower((string)($row['item_type'] ?? ''));
        $row['bg_color'] = (string)($row['bg_color'] ?? '#16a085');
        $row['text_color'] = (string)($row['text_color'] ?? '#ecf0f1');
        return $row;
    }
}
