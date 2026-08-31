<?php
declare(strict_types=1);

class SwotAnalysis
{
    private PDO $conn;

    private const WRITABLE = [
        'company_id', 'analysis_date', 'summary', 'status', 'is_current',
        'legacy_node_id', 'created_by', 'updated_by'
    ];

    private const STATUSES = ['draft', 'completed', 'archived'];

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    public function add(array $data): array
    {
        $f = $this->filterWritable($data);
        if (!isset($f['company_id'])) {
            throw new InvalidArgumentException("company_id is required");
        }
        $f['company_id'] = (int)$f['company_id'];
        $f['status'] = $this->normalizeStatus($f['status'] ?? 'draft');
        $f['is_current'] = !empty($f['is_current']) ? 1 : 0;
        if (!empty($f['analysis_date'])) $f['analysis_date'] = $this->toDateTime($f['analysis_date']);
        else $f['analysis_date'] = date('Y-m-d H:i:s');

        // If is_current=1, clear other currents for this company inside transaction
        $this->conn->beginTransaction();
        try {
            if ($f['is_current']) {
                $this->clearCurrentForCompany($f['company_id']);
            }
            $cols = array_keys($f);
            $ph = array_fill(0, count($cols), '?');
            $sql = "INSERT INTO swot_analyses (" . implode(',', $cols) . ") VALUES (" . implode(',', $ph) . ")";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute(array_values($f));
            $id = (int)$this->conn->lastInsertId();
            $this->conn->commit();
            return $this->getById($id);
        } catch (Throwable $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }

    public function update(int $id, array $data): ?array
    {
        $existing = $this->getById($id);
        if (!$existing) throw new RuntimeException("swot_analyses id $id not found");
        $f = $this->filterWritable($data);
        if (isset($f['status'])) $f['status'] = $this->normalizeStatus($f['status']);
        if (isset($f['is_current'])) $f['is_current'] = !empty($f['is_current']) ? 1 : 0;
        if (isset($f['analysis_date'])) $f['analysis_date'] = $this->toDateTime($f['analysis_date']);
        if (!$f) return $existing;

        $this->conn->beginTransaction();
        try {
            if (isset($f['is_current']) && $f['is_current']) {
                $companyId = $f['company_id'] ?? $existing['company_id'];
                $this->clearCurrentForCompany((int)$companyId, $id);
            }
            $sets = [];
            $params = [];
            foreach ($f as $k => $v) { $sets[] = "$k = ?"; $params[] = $v; }
            $params[] = $id;
            $sql = "UPDATE swot_analyses SET " . implode(', ', $sets) . ", updated_at = NOW() WHERE id = ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);
            $this->conn->commit();
            return $this->getById($id);
        } catch (Throwable $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM swot_analyses WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    public function listAll(array $filters = []): array
    {
        $sql = "SELECT * FROM swot_analyses WHERE 1=1";
        $params = [];
        if (isset($filters['company_id'])) { $sql .= " AND company_id = ?"; $params[] = (int)$filters['company_id']; }
        if (isset($filters['status'])) { $sql .= " AND status = ?"; $params[] = $this->normalizeStatus($filters['status']); }
        if (isset($filters['is_current'])) { $sql .= " AND is_current = ?"; $params[] = $filters['is_current'] ? 1 : 0; }
        $sql .= " ORDER BY is_current DESC, analysis_date DESC, id DESC";
        if (isset($filters['limit'])) {
            $sql .= " LIMIT " . (int)$filters['limit'];
            if (isset($filters['offset'])) $sql .= " OFFSET " . (int)$filters['offset'];
        }
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        return array_map([$this, 'castRow'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function getCurrentByCompany(int $companyId): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM swot_analyses WHERE company_id = ? AND is_current = 1 LIMIT 1");
        $stmt->execute([$companyId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) return $this->castRow($row);
        // fallback to latest
        $stmt = $this->conn->prepare("SELECT * FROM swot_analyses WHERE company_id = ? ORDER BY analysis_date DESC, id DESC LIMIT 1");
        $stmt->execute([$companyId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    public function setCurrent(int $id): ?array
    {
        $row = $this->getById($id);
        if (!$row) throw new RuntimeException("swot_analyses id $id not found");
        $this->conn->beginTransaction();
        try {
            $this->clearCurrentForCompany((int)$row['company_id'], $id);
            $stmt = $this->conn->prepare("UPDATE swot_analyses SET is_current = 1, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$id]);
            $this->conn->commit();
            return $this->getById($id);
        } catch (Throwable $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }

    public function listByCompany(int $companyId): array
    {
        return $this->listAll(['company_id' => $companyId]);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM swot_analyses WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    public function countByCompany(int $companyId): int
    {
        $stmt = $this->conn->prepare("SELECT COUNT(*) FROM swot_analyses WHERE company_id = ?");
        $stmt->execute([$companyId]);
        return (int)$stmt->fetchColumn();
    }

    private function clearCurrentForCompany(int $companyId, ?int $excludeId = null): void
    {
        if ($excludeId) {
            $stmt = $this->conn->prepare("UPDATE swot_analyses SET is_current = 0 WHERE company_id = ? AND id != ?");
            $stmt->execute([$companyId, $excludeId]);
        } else {
            $stmt = $this->conn->prepare("UPDATE swot_analyses SET is_current = 0 WHERE company_id = ?");
            $stmt->execute([$companyId]);
        }
    }

    private function filterWritable(array $data): array
    {
        $out = [];
        foreach (self::WRITABLE as $k) {
            if (array_key_exists($k, $data)) $out[$k] = $data[$k];
        }
        return $out;
    }

    private function normalizeStatus(string $s): string
    {
        $s = strtolower(trim($s));
        if (!in_array($s, self::STATUSES, true)) $s = 'draft';
        return $s;
    }

    private function toDateTime(mixed $v): ?string
    {
        if (empty($v)) return null;
        try { return (new DateTime((string)$v))->format('Y-m-d H:i:s'); } catch (Throwable) { return null; }
    }

    private function castRow(array $row): array
    {
        $row['id'] = (int)$row['id'];
        $row['company_id'] = (int)$row['company_id'];
        $row['is_current'] = (bool)$row['is_current'];
        if (isset($row['legacy_node_id']) && $row['legacy_node_id'] !== null) $row['legacy_node_id'] = (int)$row['legacy_node_id'];
        if (isset($row['created_by']) && $row['created_by'] !== null) $row['created_by'] = (int)$row['created_by'];
        if (isset($row['updated_by']) && $row['updated_by'] !== null) $row['updated_by'] = (int)$row['updated_by'];
        return $row;
    }
}
