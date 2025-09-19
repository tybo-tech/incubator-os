<?php
declare(strict_types=1);

class FinancialMetric
{
    private PDO $conn;

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /* ============================ Create / Update ============================ */

    public function add(int $companyId, int $metricTypeId, int $year, ?string $quarter, float $value, string $unit = 'ZAR', ?float $marginPct = null): array
    {
        $sql = "INSERT INTO financial_metrics (company_id, metric_type_id, year_, quarter, value, unit, margin_pct) VALUES (?, ?, ?, ?, ?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$companyId, $metricTypeId, $year, $quarter, $value, $unit, $marginPct]);

        return $this->getById((int)$this->conn->lastInsertId());
    }

    public function update(int $id, array $fields): ?array
    {
        $allowed = ['company_id','metric_type_id','year_','quarter','value','unit','margin_pct'];
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
        $sql = "UPDATE financial_metrics SET " . implode(', ', $sets) . ", created_at = created_at WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $this->getById($id);
    }

    /* ================================ Read ================================= */

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM financial_metrics WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    public function listByCompanyYear(int $companyId, int $year): array
    {
        $stmt = $this->conn->prepare("SELECT * FROM financial_metrics WHERE company_id = ? AND year_ = ? ORDER BY metric_type_id, quarter");
        $stmt->execute([$companyId, $year]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(fn($r) => $this->castRow($r), $rows);
    }

    public function listByMetric(int $companyId, int $metricTypeId, int $year): array
    {
        $stmt = $this->conn->prepare("SELECT * FROM financial_metrics WHERE company_id = ? AND metric_type_id = ? AND year_ = ? ORDER BY quarter");
        $stmt->execute([$companyId, $metricTypeId, $year]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(fn($r) => $this->castRow($r), $rows);
    }

    /* ================================ Delete ================================ */

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM financial_metrics WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    /* ============================= Utilities ================================ */

    private function castRow(array $row): array
    {
        foreach (['id','company_id','metric_type_id','year_'] as $k) {
            if (array_key_exists($k, $row)) {
                $row[$k] = (int)$row[$k];
            }
        }
        foreach (['value','margin_pct'] as $k) {
            if (array_key_exists($k, $row) && $row[$k] !== null) {
                $row[$k] = (float)$row[$k];
            }
        }
        return $row;
    }
}
