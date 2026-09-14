<?php
declare(strict_types=1);

class GpsTargetMetric
{
    private PDO $conn;

    // current_value is a cached snapshot only; Sprint 007 derives actuals from the measure binding
    // (metric_type_accounts -> company_financial_yearly_stats) instead of dual-maintaining.
    private const WRITABLE = [
        'gps_target_id','metric_type_id','baseline_value','target_value','current_value','notes',
        'baseline_period_type','baseline_period_ref','target_period_type','target_period_ref',
        'direction','calculation_method','maintain_tolerance_value','maintain_tolerance_unit','calculation_version'
    ];
    private const PERIOD_TYPES = ['financial_year','quarter','custom'];
    private const DIRECTIONS = ['increase','decrease','maintain'];
    // Only period_total is implemented in the Sprint 007 revenue slice; others are reserved.
    private const CALC_METHODS = ['period_total'];
    private const TOLERANCE_UNITS = ['absolute','percent'];

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    public function attach(array $data): array
    {
        $f = $this->filterWritable($data);
        if (empty($f['gps_target_id'])) throw new InvalidArgumentException("gps_target_id is required");
        if (empty($f['metric_type_id'])) throw new InvalidArgumentException("metric_type_id is required");
        if (!isset($f['target_value'])) throw new InvalidArgumentException("target_value is required");
        $f['gps_target_id'] = (int)$f['gps_target_id'];
        $f['metric_type_id'] = (int)$f['metric_type_id'];
        $f['target_value'] = (float)$f['target_value'];
        if (isset($f['baseline_value']) && $f['baseline_value'] !== null) $f['baseline_value'] = (float)$f['baseline_value'];
        if (isset($f['current_value']) && $f['current_value'] !== null) $f['current_value'] = (float)$f['current_value'];
        $f = $this->normalizeMeasurement($f, []);
        $this->assertGpsExists($f['gps_target_id']);
        // upsert metric link
        $existing = $this->findLink($f['gps_target_id'], $f['metric_type_id']);
        if ($existing) {
            return $this->update($existing['id'], $f);
        }
        $cols = array_keys($f);
        $ph = array_fill(0, count($cols), '?');
        $sql = "INSERT INTO gps_target_metrics (" . implode(',', $cols) . ") VALUES (" . implode(',', $ph) . ")";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute(array_values($f));
        // Capture the new id BEFORE the UPDATE below — an UPDATE resets lastInsertId() to 0 on MySQL/PDO.
        $newId = (int)$this->conn->lastInsertId();
        // switch target to metric mode
        $stmt2 = $this->conn->prepare("UPDATE gps_targets SET progress_mode = 'metric', updated_at = NOW() WHERE id = ?");
        $stmt2->execute([$f['gps_target_id']]);
        return $this->getById($newId);
    }

    public function update(int $id, array $data): ?array
    {
        $existing = $this->getById($id);
        if (!$existing) throw new RuntimeException("gps_target_metrics id $id not found");
        $f = $this->filterWritable($data);
        if (isset($f['target_value'])) $f['target_value'] = (float)$f['target_value'];
        if (array_key_exists('baseline_value', $f)) $f['baseline_value'] = $f['baseline_value'] !== null ? (float)$f['baseline_value'] : null;
        if (array_key_exists('current_value', $f)) $f['current_value'] = $f['current_value'] !== null ? (float)$f['current_value'] : null;
        $f = $this->normalizeMeasurement($f, $existing);
        if (!$f) return $existing;
        $sets = []; $params = [];
        foreach ($f as $k => $v) { $sets[] = "$k = ?"; $params[] = $v; }
        $params[] = $id;
        $sql = "UPDATE gps_target_metrics SET " . implode(', ', $sets) . ", updated_at = NOW() WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        return $this->getById($id);
    }

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM gps_target_metrics WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    public function findLink(int $gpsTargetId, int $metricTypeId): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM gps_target_metrics WHERE gps_target_id = ? AND metric_type_id = ? LIMIT 1");
        $stmt->execute([$gpsTargetId, $metricTypeId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    public function listByTarget(int $gpsTargetId): array
    {
        $stmt = $this->conn->prepare("
            SELECT gtm.*, mt.code, mt.name as metric_name, mt.unit
            FROM gps_target_metrics gtm
            LEFT JOIN metric_types mt ON mt.id = gtm.metric_type_id
            WHERE gtm.gps_target_id = ?
            ORDER BY gtm.created_at ASC
        ");
        $stmt->execute([$gpsTargetId]);
        return array_map([$this, 'castRow'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function listAll(array $filters = []): array
    {
        $sql = "SELECT * FROM gps_target_metrics WHERE 1=1";
        $params = [];
        if (isset($filters['gps_target_id'])) { $sql .= " AND gps_target_id = ?"; $params[] = (int)$filters['gps_target_id']; }
        if (isset($filters['metric_type_id'])) { $sql .= " AND metric_type_id = ?"; $params[] = (int)$filters['metric_type_id']; }
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        return array_map([$this, 'castRow'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function detach(int $id): bool
    {
        $row = $this->getById($id);
        $stmt = $this->conn->prepare("DELETE FROM gps_target_metrics WHERE id = ?");
        $stmt->execute([$id]);
        $deleted = $stmt->rowCount() > 0;
        if ($deleted && $row) {
            // if no more metrics, revert to manual
            $stmt2 = $this->conn->prepare("SELECT COUNT(*) FROM gps_target_metrics WHERE gps_target_id = ?");
            $stmt2->execute([$row['gps_target_id']]);
            if ((int)$stmt2->fetchColumn() === 0) {
                $stmt3 = $this->conn->prepare("UPDATE gps_targets SET progress_mode = 'manual', updated_at = NOW() WHERE id = ?");
                $stmt3->execute([$row['gps_target_id']]);
            }
        }
        return $deleted;
    }

    public function detachByTargetAndType(int $gpsTargetId, int $metricTypeId): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM gps_target_metrics WHERE gps_target_id = ? AND metric_type_id = ?");
        $stmt->execute([$gpsTargetId, $metricTypeId]);
        return $stmt->rowCount() > 0;
    }

    private function assertGpsExists(int $id): void
    {
        $stmt = $this->conn->prepare("SELECT id FROM gps_targets WHERE id = ?");
        $stmt->execute([$id]);
        if (!$stmt->fetchColumn()) throw new RuntimeException("gps_targets id $id not found");
    }

    /**
     * Normalise and validate the Sprint 007 measurement fields, then enforce that
     * direction='maintain' always carries an explicit tolerance (value + unit).
     */
    private function normalizeMeasurement(array $f, array $existing): array
    {
        foreach (['baseline_period_type', 'target_period_type'] as $k) {
            if (array_key_exists($k, $f)) $f[$k] = $this->normalizeEnumOrNull($f[$k], self::PERIOD_TYPES, $k);
        }
        foreach (['baseline_period_ref', 'target_period_ref', 'calculation_version'] as $k) {
            if (array_key_exists($k, $f)) {
                $v = $f[$k];
                $f[$k] = ($v === null || trim((string)$v) === '') ? null : trim((string)$v);
            }
        }
        if (array_key_exists('direction', $f)) {
            $f['direction'] = $this->normalizeEnumOrNull($f['direction'], self::DIRECTIONS, 'direction');
        }
        if (array_key_exists('calculation_method', $f)) {
            $m = $f['calculation_method'];
            if ($m === null || trim((string)$m) === '') {
                $f['calculation_method'] = null;
            } else {
                $m = strtolower(trim((string)$m));
                if (!in_array($m, self::CALC_METHODS, true)) {
                    throw new InvalidArgumentException("Unsupported calculation_method '$m' — implemented: " . implode(', ', self::CALC_METHODS));
                }
                $f['calculation_method'] = $m;
            }
        }
        if (array_key_exists('maintain_tolerance_value', $f)) {
            $v = $f['maintain_tolerance_value'];
            $f['maintain_tolerance_value'] = ($v === null || $v === '') ? null : (float)$v;
        }
        if (array_key_exists('maintain_tolerance_unit', $f)) {
            $f['maintain_tolerance_unit'] = $this->normalizeEnumOrNull($f['maintain_tolerance_unit'], self::TOLERANCE_UNITS, 'maintain_tolerance_unit');
        }

        $direction = $f['direction'] ?? ($existing['direction'] ?? null);
        if ($direction === 'maintain') {
            $value = array_key_exists('maintain_tolerance_value', $f) ? $f['maintain_tolerance_value'] : ($existing['maintain_tolerance_value'] ?? null);
            $unit = array_key_exists('maintain_tolerance_unit', $f) ? $f['maintain_tolerance_unit'] : ($existing['maintain_tolerance_unit'] ?? null);
            if ($value === null || $unit === null) {
                throw new InvalidArgumentException("direction='maintain' requires maintain_tolerance_value and maintain_tolerance_unit (absolute|percent)");
            }
        }
        return $f;
    }

    private function normalizeEnumOrNull(mixed $v, array $allowed, string $field): ?string
    {
        if ($v === null) return null;
        $s = strtolower(trim((string)$v));
        if ($s === '') return null;
        if (!in_array($s, $allowed, true)) {
            throw new InvalidArgumentException("Invalid $field '$s' — allowed: " . implode(', ', $allowed));
        }
        return $s;
    }

    private function filterWritable(array $data): array
    {
        $out = [];
        foreach (self::WRITABLE as $k) if (array_key_exists($k, $data)) $out[$k] = $data[$k];
        return $out;
    }

    private function castRow(array $row): array
    {
        $row['id'] = (int)$row['id'];
        $row['gps_target_id'] = (int)$row['gps_target_id'];
        $row['metric_type_id'] = (int)$row['metric_type_id'];
        if (isset($row['baseline_value']) && $row['baseline_value'] !== null) $row['baseline_value'] = (float)$row['baseline_value'];
        if (isset($row['target_value']) && $row['target_value'] !== null) $row['target_value'] = (float)$row['target_value'];
        if (isset($row['current_value']) && $row['current_value'] !== null) $row['current_value'] = (float)$row['current_value'];
        if (isset($row['maintain_tolerance_value']) && $row['maintain_tolerance_value'] !== null) $row['maintain_tolerance_value'] = (float)$row['maintain_tolerance_value'];
        return $row;
    }
}
