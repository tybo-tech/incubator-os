<?php
declare(strict_types=1);

class SwotItem
{
    private PDO $conn;

    private const WRITABLE = [
        'swot_analysis_id', 'category', 'description', 'impact', 'priority',
        'status', 'recommended_response', 'owner_user_id', 'owner_label',
        'target_date', 'date_added', 'legacy_source_key', 'legacy_path'
    ];

    private const CATEGORIES = ['strength','weakness','opportunity','threat'];
    private const IMPACTS = ['low','medium','high','critical'];
    private const PRIORITIES = ['low','medium','high','critical'];

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    public function add(array $data): array
    {
        $f = $this->filterWritable($data);
        if (empty($f['swot_analysis_id'])) throw new InvalidArgumentException("swot_analysis_id is required");
        if (empty($f['description']) || trim((string)$f['description']) === '') throw new InvalidArgumentException("description is required");
        $f['swot_analysis_id'] = (int)$f['swot_analysis_id'];
        $f['category'] = $this->normalizeCategory($f['category'] ?? 'strength');
        $f['impact'] = $this->normalizeEnum($f['impact'] ?? 'medium', self::IMPACTS, 'medium');
        $f['priority'] = $this->normalizeEnum($f['priority'] ?? 'medium', self::PRIORITIES, 'medium');
        $f['status'] = strtolower(trim((string)($f['status'] ?? 'identified')));
        if (!empty($f['target_date'])) $f['target_date'] = $this->toDate($f['target_date']);
        else $f['target_date'] = null;
        if (!empty($f['date_added'])) $f['date_added'] = $this->toDateTime($f['date_added']);
        if (isset($f['owner_user_id']) && $f['owner_user_id'] !== null) $f['owner_user_id'] = (int)$f['owner_user_id'];
        else $f['owner_user_id'] = null;

        $cols = array_keys($f);
        $ph = array_fill(0, count($cols), '?');
        $sql = "INSERT INTO swot_items (" . implode(',', $cols) . ") VALUES (" . implode(',', $ph) . ")";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute(array_values($f));
        return $this->getById((int)$this->conn->lastInsertId());
    }

    public function update(int $id, array $data): ?array
    {
        $existing = $this->getById($id);
        if (!$existing) throw new RuntimeException("swot_items id $id not found");
        $f = $this->filterWritable($data);
        if (isset($f['category'])) $f['category'] = $this->normalizeCategory($f['category']);
        if (isset($f['impact'])) $f['impact'] = $this->normalizeEnum($f['impact'], self::IMPACTS, 'medium');
        if (isset($f['priority'])) $f['priority'] = $this->normalizeEnum($f['priority'], self::PRIORITIES, 'medium');
        if (isset($f['status'])) $f['status'] = strtolower(trim((string)$f['status']));
        if (array_key_exists('target_date', $f)) $f['target_date'] = $f['target_date'] ? $this->toDate($f['target_date']) : null;
        if (array_key_exists('date_added', $f)) $f['date_added'] = $f['date_added'] ? $this->toDateTime($f['date_added']) : null;
        if (array_key_exists('owner_user_id', $f)) $f['owner_user_id'] = $f['owner_user_id'] !== null ? (int)$f['owner_user_id'] : null;
        if (!$f) return $existing;
        $sets = []; $params = [];
        foreach ($f as $k => $v) { $sets[] = "$k = ?"; $params[] = $v; }
        $params[] = $id;
        $sql = "UPDATE swot_items SET " . implode(', ', $sets) . ", updated_at = NOW() WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        return $this->getById($id);
    }

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM swot_items WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    public function listAll(array $filters = []): array
    {
        $sql = "SELECT si.*, sa.company_id FROM swot_items si JOIN swot_analyses sa ON sa.id = si.swot_analysis_id WHERE 1=1";
        $params = [];
        if (isset($filters['swot_analysis_id'])) { $sql .= " AND si.swot_analysis_id = ?"; $params[] = (int)$filters['swot_analysis_id']; }
        if (isset($filters['company_id'])) { $sql .= " AND sa.company_id = ?"; $params[] = (int)$filters['company_id']; }
        if (isset($filters['category'])) { $sql .= " AND si.category = ?"; $params[] = $this->normalizeCategory($filters['category']); }
        if (isset($filters['status'])) { $sql .= " AND si.status = ?"; $params[] = strtolower(trim((string)$filters['status'])); }
        if (isset($filters['priority'])) { $sql .= " AND si.priority = ?"; $params[] = $this->normalizeEnum($filters['priority'], self::PRIORITIES, 'medium'); }
        if (isset($filters['search'])) { $sql .= " AND (si.description LIKE ? OR si.recommended_response LIKE ?)"; $params[] = '%' . $filters['search'] . '%'; $params[] = '%' . $filters['search'] . '%'; }
        $sql .= " ORDER BY si.category ASC, si.priority DESC, si.id DESC";
        if (isset($filters['limit'])) { $sql .= " LIMIT " . (int)$filters['limit']; if (isset($filters['offset'])) $sql .= " OFFSET " . (int)$filters['offset']; }
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        return array_map([$this, 'castRow'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function listByAnalysis(int $analysisId): array
    {
        return $this->listAll(['swot_analysis_id' => $analysisId]);
    }

    public function listByCompany(int $companyId): array
    {
        return $this->listAll(['company_id' => $companyId]);
    }

    public function quadrantCounts(int $companyId, ?int $analysisId = null): array
    {
        $sql = "SELECT si.category, COUNT(*) as cnt FROM swot_items si JOIN swot_analyses sa ON sa.id = si.swot_analysis_id WHERE sa.company_id = ?";
        $params = [$companyId];
        if ($analysisId) { $sql .= " AND si.swot_analysis_id = ?"; $params[] = $analysisId; }
        else {
            // current analysis only if exists
            $sql .= " AND sa.is_current = 1";
        }
        $sql .= " GROUP BY si.category";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $out = ['strength'=>0,'weakness'=>0,'opportunity'=>0,'threat'=>0];
        foreach ($rows as $r) $out[$r['category']] = (int)$r['cnt'];
        return $out;
    }

    public function statusBreakdown(array $filters = []): array
    {
        $sql = "SELECT si.status, COUNT(*) as cnt FROM swot_items si JOIN swot_analyses sa ON sa.id = si.swot_analysis_id WHERE 1=1";
        $params = [];
        if (isset($filters['company_id'])) { $sql .= " AND sa.company_id = ?"; $params[] = (int)$filters['company_id']; }
        if (isset($filters['swot_analysis_id'])) { $sql .= " AND si.swot_analysis_id = ?"; $params[] = (int)$filters['swot_analysis_id']; }
        $sql .= " GROUP BY si.status";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM swot_items WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    private function filterWritable(array $data): array
    {
        $out = [];
        foreach (self::WRITABLE as $k) if (array_key_exists($k, $data)) $out[$k] = $data[$k];
        return $out;
    }

    private function normalizeCategory(mixed $v): string
    {
        $v = strtolower(trim((string)$v));
        // handle plural forms from legacy JSON
        $map = ['strengths'=>'strength','weaknesses'=>'weakness','opportunities'=>'opportunity','threats'=>'threat'];
        if (isset($map[$v])) $v = $map[$v];
        return in_array($v, self::CATEGORIES, true) ? $v : 'strength';
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
        $row['swot_analysis_id'] = (int)$row['swot_analysis_id'];
        if (isset($row['company_id'])) $row['company_id'] = (int)$row['company_id'];
        if (isset($row['owner_user_id']) && $row['owner_user_id'] !== null) $row['owner_user_id'] = (int)$row['owner_user_id'];
        return $row;
    }
}
