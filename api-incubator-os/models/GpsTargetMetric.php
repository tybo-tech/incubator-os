<?php
declare(strict_types=1);

class GpsTargetMetric
{
    private PDO $conn;

    // current_value is a cached snapshot only; once Sprint 006 wires metrics, derive from metric_records instead of dual-maintaining
    private const WRITABLE = ['gps_target_id','metric_type_id','baseline_value','target_value','current_value','notes'];

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
        // switch target to metric mode
        $stmt2 = $this->conn->prepare("UPDATE gps_targets SET progress_mode = 'metric', updated_at = NOW() WHERE id = ?");
        $stmt2->execute([$f['gps_target_id']]);
        return $this->getById((int)$this->conn->lastInsertId());
    }

    public function update(int $id, array $data): ?array
    {
        $existing = $this->getById($id);
        if (!$existing) throw new RuntimeException("gps_target_metrics id $id not found");
        $f = $this->filterWritable($data);
        if (isset($f['target_value'])) $f['target_value'] = (float)$f['target_value'];
        if (array_key_exists('baseline_value', $f)) $f['baseline_value'] = $f['baseline_value'] !== null ? (float)$f['baseline_value'] : null;
        if (array_key_exists('current_value', $f)) $f['current_value'] = $f['current_value'] !== null ? (float)$f['current_value'] : null;
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
        return $row;
    }
}
