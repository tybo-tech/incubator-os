<?php
declare(strict_types=1);

class GpsTarget
{
    private PDO $conn;

    private const WRITABLE = [
        'company_id','category','title','description','priority','impact','status',
        'owner_user_id','owner_label','due_date','progress_mode','manual_progress_percentage',
        'success_evidence_required','legacy_node_id','legacy_path','completed_at'
    ];

    private const CATEGORIES = ['strategy_general','finance','sales_marketing','personal_development'];
    private const STATUSES = ['not_started','in_progress','at_risk','completed','cancelled'];
    private const PRIORITIES = ['low','medium','high','critical'];
    private const MODES = ['manual','tasks','metric'];

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    public function add(array $data): array
    {
        $f = $this->filterWritable($data);
        if (empty($f['company_id'])) throw new InvalidArgumentException("company_id is required");
        if (empty($f['description']) || trim((string)$f['description']) === '') throw new InvalidArgumentException("description is required");
        $f['company_id'] = (int)$f['company_id'];
        $f['category'] = $this->normalizeEnum($f['category'] ?? 'strategy_general', self::CATEGORIES, 'strategy_general');
        $f['status'] = $this->normalizeEnum($f['status'] ?? 'not_started', self::STATUSES, 'not_started');
        $f['priority'] = $this->normalizeEnum($f['priority'] ?? 'medium', self::PRIORITIES, 'medium');
        if (isset($f['impact']) && $f['impact'] !== null) $f['impact'] = $this->normalizeEnum($f['impact'], self::PRIORITIES, 'medium');
        $f['progress_mode'] = $this->normalizeEnum($f['progress_mode'] ?? 'manual', self::MODES, 'manual');
        if (empty($f['title'])) $f['title'] = $this->generateTitle((string)$f['description']);
        if (!empty($f['due_date'])) $f['due_date'] = $this->toDate($f['due_date']); else $f['due_date'] = null;
        if (isset($f['manual_progress_percentage'])) $f['manual_progress_percentage'] = (float)$f['manual_progress_percentage'];
        else $f['manual_progress_percentage'] = 0;
        if (isset($f['owner_user_id']) && $f['owner_user_id'] !== null) $f['owner_user_id'] = (int)$f['owner_user_id'];
        if (!empty($f['completed_at'])) $f['completed_at'] = $this->toDateTime($f['completed_at']);
        if ($f['status'] === 'completed' && empty($f['completed_at'])) $f['completed_at'] = date('Y-m-d H:i:s');

        $cols = array_keys($f);
        $ph = array_fill(0, count($cols), '?');
        $sql = "INSERT INTO gps_targets (" . implode(',', $cols) . ") VALUES (" . implode(',', $ph) . ")";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute(array_values($f));
        return $this->getById((int)$this->conn->lastInsertId());
    }

    public function update(int $id, array $data): ?array
    {
        $existing = $this->getById($id);
        if (!$existing) throw new RuntimeException("gps_targets id $id not found");
        $f = $this->filterWritable($data);
        if (isset($f['category'])) $f['category'] = $this->normalizeEnum($f['category'], self::CATEGORIES, $existing['category']);
        if (isset($f['status'])) {
            $f['status'] = $this->normalizeEnum($f['status'], self::STATUSES, $existing['status']);
            if ($f['status'] === 'completed' && empty($f['completed_at']) && empty($existing['completed_at'])) $f['completed_at'] = date('Y-m-d H:i:s');
            if ($f['status'] !== 'completed') $f['completed_at'] = null;
        }
        if (isset($f['priority'])) $f['priority'] = $this->normalizeEnum($f['priority'], self::PRIORITIES, $existing['priority']);
        if (isset($f['progress_mode'])) $f['progress_mode'] = $this->normalizeEnum($f['progress_mode'], self::MODES, $existing['progress_mode']);
        if (array_key_exists('due_date', $f)) $f['due_date'] = $f['due_date'] ? $this->toDate($f['due_date']) : null;
        if (array_key_exists('manual_progress_percentage', $f)) $f['manual_progress_percentage'] = (float)$f['manual_progress_percentage'];
        if (array_key_exists('owner_user_id', $f)) $f['owner_user_id'] = $f['owner_user_id'] !== null ? (int)$f['owner_user_id'] : null;
        if (!$f) return $existing;
        $sets = []; $params = [];
        foreach ($f as $k => $v) { $sets[] = "$k = ?"; $params[] = $v; }
        $params[] = $id;
        $sql = "UPDATE gps_targets SET " . implode(', ', $sets) . ", updated_at = NOW() WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        return $this->getById($id);
    }

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM gps_targets WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    public function listAll(array $filters = []): array
    {
        $sql = "SELECT * FROM gps_targets WHERE 1=1";
        $params = [];
        if (isset($filters['company_id'])) { $sql .= " AND company_id = ?"; $params[] = (int)$filters['company_id']; }
        if (isset($filters['category'])) { $sql .= " AND category = ?"; $params[] = $this->normalizeEnum($filters['category'], self::CATEGORIES, 'strategy_general'); }
        if (isset($filters['status'])) { $sql .= " AND status = ?"; $params[] = $this->normalizeEnum($filters['status'], self::STATUSES, 'not_started'); }
        if (isset($filters['priority'])) { $sql .= " AND priority = ?"; $params[] = $this->normalizeEnum($filters['priority'], self::PRIORITIES, 'medium'); }
        if (isset($filters['search'])) { $sql .= " AND (title LIKE ? OR description LIKE ?)"; $params[] = '%' . $filters['search'] . '%'; $params[] = '%' . $filters['search'] . '%'; }
        $sql .= " ORDER BY category ASC, due_date ASC, id DESC";
        if (isset($filters['limit'])) { $sql .= " LIMIT " . (int)$filters['limit']; if (isset($filters['offset'])) $sql .= " OFFSET " . (int)$filters['offset']; }
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        return array_map([$this, 'castRow'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function groupedByCategory(int $companyId): array
    {
        $rows = $this->listAll(['company_id' => $companyId]);
        $grouped = [];
        foreach (self::CATEGORIES as $cat) $grouped[$cat] = [];
        foreach ($rows as $r) $grouped[$r['category']][] = $r;
        return $grouped;
    }

    public function overdue(int $companyId, ?string $asOfDate = null): array
    {
        $asOf = $asOfDate ? $this->toDate($asOfDate) : date('Y-m-d');
        $stmt = $this->conn->prepare("SELECT * FROM gps_targets WHERE company_id = ? AND due_date IS NOT NULL AND due_date < ? AND status NOT IN ('completed','cancelled') ORDER BY due_date ASC");
        $stmt->execute([$companyId, $asOf]);
        return array_map([$this, 'castRow'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function dueThisMonth(int $companyId, ?string $month = null): array
    {
        $m = $month ? $this->toDate($month.'-01') : date('Y-m-01');
        $start = date('Y-m-01', strtotime($m));
        $end = date('Y-m-t', strtotime($m));
        $stmt = $this->conn->prepare("SELECT * FROM gps_targets WHERE company_id = ? AND due_date BETWEEN ? AND ? ORDER BY due_date ASC");
        $stmt->execute([$companyId, $start, $end]);
        return array_map([$this, 'castRow'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function dashboardCounts(int $companyId): array
    {
        $stmt = $this->conn->prepare("
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status='not_started' THEN 1 ELSE 0 END) as not_started,
                SUM(CASE WHEN status='in_progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status='at_risk' THEN 1 ELSE 0 END) as at_risk,
                SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) as cancelled,
                SUM(CASE WHEN due_date IS NOT NULL AND due_date < CURDATE() AND status NOT IN ('completed','cancelled') THEN 1 ELSE 0 END) as overdue,
                SUM(CASE WHEN due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND status NOT IN ('completed','cancelled') THEN 1 ELSE 0 END) as due_30_days
            FROM gps_targets WHERE company_id = ?
        ");
        $stmt->execute([$companyId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return [
            'total' => (int)$row['total'],
            'not_started' => (int)$row['not_started'],
            'in_progress' => (int)$row['in_progress'],
            'at_risk' => (int)$row['at_risk'],
            'completed' => (int)$row['completed'],
            'cancelled' => (int)$row['cancelled'],
            'overdue' => (int)$row['overdue'],
            'due_30_days' => (int)$row['due_30_days'],
        ];
    }

    public function categoryCounts(int $companyId): array
    {
        $stmt = $this->conn->prepare("SELECT category, COUNT(*) as cnt FROM gps_targets WHERE company_id = ? GROUP BY category");
        $stmt->execute([$companyId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $out = array_fill_keys(self::CATEGORIES, 0);
        foreach ($rows as $r) $out[$r['category']] = (int)$r['cnt'];
        return $out;
    }

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM gps_targets WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    private function generateTitle(string $desc): string
    {
        $t = trim($desc);
        if (mb_strlen($t) <= 80) return $t;
        return mb_substr($t, 0, 77) . '...';
    }

    private function filterWritable(array $data): array
    {
        $out = [];
        foreach (self::WRITABLE as $k) if (array_key_exists($k, $data)) $out[$k] = $data[$k];
        return $out;
    }

    private function normalizeEnum(mixed $v, array $allowed, string $def): string
    {
        $v = strtolower(trim((string)$v));
        return in_array($v, $allowed, true) ? $v : $def;
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
        $row['company_id'] = (int)$row['company_id'];
        if (isset($row['owner_user_id']) && $row['owner_user_id'] !== null) $row['owner_user_id'] = (int)$row['owner_user_id'];
        if (isset($row['legacy_node_id']) && $row['legacy_node_id'] !== null) $row['legacy_node_id'] = (int)$row['legacy_node_id'];
        $row['manual_progress_percentage'] = (float)$row['manual_progress_percentage'];
        return $row;
    }
}
