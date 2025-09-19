<?php
declare(strict_types=1);

class MetricType
{
    private PDO $conn;

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /* ============================ Create / Update ============================ */

    public function add(string $code, string $name, string $description, string $defaultUnit = 'ZAR', int $isRatio = 0): array
    {
        $sql = "INSERT INTO metric_types (code, name, description, default_unit, is_ratio) VALUES (?, ?, ?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$code, $name, $description, $defaultUnit, $isRatio]);

        return $this->getById((int)$this->conn->lastInsertId());
    }

    public function update(int $id, array $fields): ?array
    {
        $allowed = ['code','name','description','default_unit','is_ratio'];
        $sets = [];
        $params = [];

        foreach ($allowed as $k) {
            if (array_key_exists($k, $fields)) {
                $sets[] = "$k = ?";
                $params[] = $fields[$k];
            }
        }
        if (!$sets) return $this->getById($id);

        $params[] = $id;
        $sql = "UPDATE metric_types SET " . implode(', ', $sets) . ", updated_at = NOW() WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $this->getById($id);
    }

    /* ================================ Read ================================= */

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM metric_types WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    public function getByCode(string $code): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM metric_types WHERE code = ?");
        $stmt->execute([$code]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    public function listAll(): array
    {
        $stmt = $this->conn->query("SELECT * FROM metric_types ORDER BY name ASC");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(fn($r) => $this->castRow($r), $rows);
    }

    /* ================================ Delete ================================ */

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM metric_types WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    /* ============================= Utilities ================================ */

    private function castRow(array $row): array
    {
        foreach (['id','is_ratio'] as $k) {
            if (array_key_exists($k, $row)) {
                $row[$k] = (int)$row[$k];
            }
        }
        return $row;
    }
}
