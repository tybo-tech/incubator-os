<?php
declare(strict_types=1);

class GpsTargetTask
{
    private PDO $conn;

    private const WRITABLE = ['gps_target_id','title','description','owner_user_id','owner_label','due_date','status','sort_order','completed_at'];
    private const STATUSES = ['not_started','in_progress','completed','blocked'];

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    public function add(array $data): array
    {
        $f = $this->filterWritable($data);
        if (empty($f['gps_target_id'])) throw new InvalidArgumentException("gps_target_id is required");
        if (empty($f['title']) || trim((string)$f['title']) === '') throw new InvalidArgumentException("title is required");
        $f['gps_target_id'] = (int)$f['gps_target_id'];
        $f['status'] = $this->normalizeStatus($f['status'] ?? 'not_started');
        $f['sort_order'] = isset($f['sort_order']) ? (int)$f['sort_order'] : $this->nextSortOrder($f['gps_target_id']);
        if (!empty($f['due_date'])) $f['due_date'] = $this->toDate($f['due_date']); else $f['due_date'] = null;
        if (isset($f['owner_user_id']) && $f['owner_user_id'] !== null) $f['owner_user_id'] = (int)$f['owner_user_id'];
        if (!empty($f['completed_at'])) $f['completed_at'] = $this->toDateTime($f['completed_at']);
        if ($f['status'] === 'completed' && empty($f['completed_at'])) $f['completed_at'] = date('Y-m-d H:i:s');
        $this->assertGpsExists($f['gps_target_id']);
        $cols = array_keys($f);
        $ph = array_fill(0, count($cols), '?');
        $sql = "INSERT INTO gps_target_tasks (" . implode(',', $cols) . ") VALUES (" . implode(',', $ph) . ")";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute(array_values($f));
        return $this->getById((int)$this->conn->lastInsertId());
    }

    public function update(int $id, array $data): ?array
    {
        $existing = $this->getById($id);
        if (!$existing) throw new RuntimeException("gps_target_tasks id $id not found");
        $f = $this->filterWritable($data);
        if (isset($f['status'])) {
            $f['status'] = $this->normalizeStatus($f['status']);
            if ($f['status'] === 'completed' && empty($f['completed_at']) && empty($existing['completed_at'])) $f['completed_at'] = date('Y-m-d H:i:s');
            if ($f['status'] !== 'completed') $f['completed_at'] = null;
        }
        if (array_key_exists('due_date', $f)) $f['due_date'] = $f['due_date'] ? $this->toDate($f['due_date']) : null;
        if (array_key_exists('owner_user_id', $f)) $f['owner_user_id'] = $f['owner_user_id'] !== null ? (int)$f['owner_user_id'] : null;
        if (array_key_exists('sort_order', $f)) $f['sort_order'] = (int)$f['sort_order'];
        if (!$f) return $existing;
        $sets = []; $params = [];
        foreach ($f as $k => $v) { $sets[] = "$k = ?"; $params[] = $v; }
        $params[] = $id;
        $sql = "UPDATE gps_target_tasks SET " . implode(', ', $sets) . ", updated_at = NOW() WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        return $this->getById($id);
    }

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM gps_target_tasks WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    public function listByTarget(int $gpsTargetId): array
    {
        $stmt = $this->conn->prepare("SELECT * FROM gps_target_tasks WHERE gps_target_id = ? ORDER BY sort_order ASC, id ASC");
        $stmt->execute([$gpsTargetId]);
        return array_map([$this, 'castRow'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function listAll(array $filters = []): array
    {
        $sql = "SELECT * FROM gps_target_tasks WHERE 1=1";
        $params = [];
        if (isset($filters['gps_target_id'])) { $sql .= " AND gps_target_id = ?"; $params[] = (int)$filters['gps_target_id']; }
        if (isset($filters['status'])) { $sql .= " AND status = ?"; $params[] = $this->normalizeStatus($filters['status']); }
        $sql .= " ORDER BY sort_order ASC, id ASC";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        return array_map([$this, 'castRow'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function reorder(int $gpsTargetId, array $orderedIds): array
    {
        $this->conn->beginTransaction();
        try {
            foreach ($orderedIds as $idx => $taskId) {
                $stmt = $this->conn->prepare("UPDATE gps_target_tasks SET sort_order = ? WHERE id = ? AND gps_target_id = ?");
                $stmt->execute([$idx, (int)$taskId, $gpsTargetId]);
            }
            $this->conn->commit();
            return $this->listByTarget($gpsTargetId);
        } catch (Throwable $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }

    public function markCompleted(int $id): ?array
    {
        return $this->update($id, ['status' => 'completed', 'completed_at' => date('Y-m-d H:i:s')]);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM gps_target_tasks WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    private function nextSortOrder(int $gpsTargetId): int
    {
        $stmt = $this->conn->prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 FROM gps_target_tasks WHERE gps_target_id = ?");
        $stmt->execute([$gpsTargetId]);
        return (int)$stmt->fetchColumn();
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

    private function normalizeStatus(mixed $v): string
    {
        $v = strtolower(trim((string)$v));
        return in_array($v, self::STATUSES, true) ? $v : 'not_started';
    }

    private function toDate(mixed $v): ?string
    {
        if (empty($v)) return null;
        try { return (new DateTime((string)$v))->format('Y-m-d'); } catch (Throwable) { return null; }
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
        $row['sort_order'] = (int)$row['sort_order'];
        if (isset($row['owner_user_id']) && $row['owner_user_id'] !== null) $row['owner_user_id'] = (int)$row['owner_user_id'];
        return $row;
    }
}
