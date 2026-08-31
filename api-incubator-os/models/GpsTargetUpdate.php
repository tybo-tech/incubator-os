<?php
declare(strict_types=1);

class GpsTargetUpdate
{
    private PDO $conn;

    private const WRITABLE = ['gps_target_id','progress_percentage','status','note','recorded_by','recorded_at'];

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    public function add(array $data): array
    {
        $f = $this->filterWritable($data);
        if (empty($f['gps_target_id'])) throw new InvalidArgumentException("gps_target_id is required");
        $f['gps_target_id'] = (int)$f['gps_target_id'];
        $this->assertGpsExists($f['gps_target_id']);
        $f['progress_percentage'] = isset($f['progress_percentage']) ? (float)$f['progress_percentage'] : 0;
        if ($f['progress_percentage'] < 0 || $f['progress_percentage'] > 100) throw new InvalidArgumentException("progress_percentage must be 0..100");
        $f['status'] = strtolower(trim((string)($f['status'] ?? 'not_started')));
        $f['recorded_at'] = !empty($f['recorded_at']) ? $this->toDateTime($f['recorded_at']) : date('Y-m-d H:i:s');
        if (isset($f['recorded_by']) && $f['recorded_by'] !== null) $f['recorded_by'] = (int)$f['recorded_by'];

        // also update the parent target's manual progress if mode=manual
        // Fix: previously bypassed GpsTarget::update() so completed_at was never set
        $this->conn->beginTransaction();
        try {
            $cols = array_keys($f);
            $ph = array_fill(0, count($cols), '?');
            $sql = "INSERT INTO gps_target_updates (" . implode(',', $cols) . ") VALUES (" . implode(',', $ph) . ")";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute(array_values($f));
            $id = (int)$this->conn->lastInsertId();
            // sync parent if manual mode — also set completed_at correctly
            $mappedStatus = $this->mapToGpsStatus($f['status']);
            if ($mappedStatus === 'completed') {
                $stmt2 = $this->conn->prepare("UPDATE gps_targets SET manual_progress_percentage = ?, status = ?, completed_at = COALESCE(completed_at, NOW()), updated_at = NOW() WHERE id = ? AND progress_mode = 'manual'");
                $stmt2->execute([$f['progress_percentage'], $mappedStatus, $f['gps_target_id']]);
            } else {
                $stmt2 = $this->conn->prepare("UPDATE gps_targets SET manual_progress_percentage = ?, status = ?, completed_at = NULL, updated_at = NOW() WHERE id = ? AND progress_mode = 'manual'");
                $stmt2->execute([$f['progress_percentage'], $mappedStatus, $f['gps_target_id']]);
            }
            $this->conn->commit();
            return $this->getById($id);
        } catch (Throwable $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM gps_target_updates WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    public function latestByTarget(int $gpsTargetId): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM gps_target_updates WHERE gps_target_id = ? ORDER BY recorded_at DESC, id DESC LIMIT 1");
        $stmt->execute([$gpsTargetId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    public function historyByTarget(int $gpsTargetId, int $limit = 50): array
    {
        $stmt = $this->conn->prepare("SELECT * FROM gps_target_updates WHERE gps_target_id = ? ORDER BY recorded_at DESC, id DESC LIMIT ?");
        $stmt->bindValue(1, $gpsTargetId, PDO::PARAM_INT);
        $stmt->bindValue(2, $limit, PDO::PARAM_INT);
        $stmt->execute();
        return array_map([$this, 'castRow'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function listByTarget(int $gpsTargetId): array
    {
        return $this->historyByTarget($gpsTargetId, 100);
    }

    public function companiesWithNoUpdateSince(int $days = 30): array
    {
        $threshold = date('Y-m-d H:i:s', strtotime("-{$days} days"));
        $sql = "
            SELECT DISTINCT gt.company_id, COUNT(*) as target_count
            FROM gps_targets gt
            LEFT JOIN (
                SELECT gps_target_id, MAX(recorded_at) as last_update FROM gps_target_updates GROUP BY gps_target_id
            ) lu ON lu.gps_target_id = gt.id
            WHERE (lu.last_update IS NULL OR lu.last_update < ?)
              AND gt.status NOT IN ('completed','cancelled')
            GROUP BY gt.company_id
        ";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$threshold]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM gps_target_updates WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    private function mapToGpsStatus(string $s): string
    {
        $allowed = ['not_started','in_progress','at_risk','completed','cancelled'];
        $s = strtolower(trim($s));
        return in_array($s, $allowed, true) ? $s : 'in_progress';
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

    private function toDateTime(mixed $v): ?string
    {
        if (empty($v)) return null;
        try { return (new DateTime((string)$v))->format('Y-m-d H:i:s'); } catch (Throwable) { return null; }
    }

    private function castRow(array $row): array
    {
        $row['id'] = (int)$row['id'];
        $row['gps_target_id'] = (int)$row['gps_target_id'];
        $row['progress_percentage'] = (float)$row['progress_percentage'];
        if (isset($row['recorded_by']) && $row['recorded_by'] !== null) $row['recorded_by'] = (int)$row['recorded_by'];
        return $row;
    }
}
