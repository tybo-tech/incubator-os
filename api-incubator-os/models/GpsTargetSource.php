<?php
declare(strict_types=1);

class GpsTargetSource
{
    private PDO $conn;

    private const WRITABLE = ['gps_target_id','source_type','swot_item_id','notes'];
    private const TYPES = ['swot_item','coaching','assessment','programme','funder','manual','legacy_unlinked'];

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    public function link(array $data): array
    {
        $f = $this->filterWritable($data);
        if (empty($f['gps_target_id'])) throw new InvalidArgumentException("gps_target_id is required");
        $f['gps_target_id'] = (int)$f['gps_target_id'];
        $f['source_type'] = $this->normalizeType($f['source_type'] ?? 'legacy_unlinked');
        if (!empty($f['swot_item_id'])) {
            $f['swot_item_id'] = (int)$f['swot_item_id'];
            $f['source_type'] = 'swot_item';
        } else {
            $f['swot_item_id'] = null;
        }
        // validate FKs exist
        $this->assertGpsExists($f['gps_target_id']);
        if ($f['swot_item_id']) $this->assertSwotItemExists($f['swot_item_id']);

        // P1: same-company assertion
        if ($f['swot_item_id']) {
            $this->assertSameCompany($f['gps_target_id'], $f['swot_item_id']);
        }

        // upsert: if same pair exists, update notes
        if ($f['swot_item_id']) {
            $existing = $this->findLink($f['gps_target_id'], $f['swot_item_id']);
            if ($existing) {
                return $this->update($existing['id'], ['notes' => $f['notes'] ?? $existing['notes']]);
            }
        }

        $cols = array_keys($f);
        $ph = array_fill(0, count($cols), '?');
        $sql = "INSERT INTO gps_target_sources (" . implode(',', $cols) . ") VALUES (" . implode(',', $ph) . ")";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute(array_values($f));
        $newId = (int)$this->conn->lastInsertId();

        // P1: when a real SWOT link is created, remove the placeholder legacy_unlinked row
        if ($f['source_type'] === 'swot_item' && $f['swot_item_id']) {
            $del = $this->conn->prepare("DELETE FROM gps_target_sources WHERE gps_target_id = ? AND source_type = 'legacy_unlinked' AND id != ?");
            $del->execute([$f['gps_target_id'], $newId]);
        }

        return $this->getById($newId);
    }

    public function update(int $id, array $data): ?array
    {
        $existing = $this->getById($id);
        if (!$existing) throw new RuntimeException("gps_target_sources id $id not found");
        $f = $this->filterWritable($data);
        if (isset($f['source_type'])) $f['source_type'] = $this->normalizeType($f['source_type']);
        if (array_key_exists('swot_item_id', $f)) $f['swot_item_id'] = $f['swot_item_id'] !== null ? (int)$f['swot_item_id'] : null;
        if (!$f) return $existing;
        $sets = []; $params = [];
        foreach ($f as $k => $v) { $sets[] = "$k = ?"; $params[] = $v; }
        $params[] = $id;
        $sql = "UPDATE gps_target_sources SET " . implode(', ', $sets) . ", updated_at = NOW() WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        return $this->getById($id);
    }

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM gps_target_sources WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    public function findLink(int $gpsTargetId, int $swotItemId): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM gps_target_sources WHERE gps_target_id = ? AND swot_item_id = ? LIMIT 1");
        $stmt->execute([$gpsTargetId, $swotItemId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    public function listByTarget(int $gpsTargetId): array
    {
        $stmt = $this->conn->prepare("SELECT gts.*, si.description as swot_description, si.category as swot_category FROM gps_target_sources gts LEFT JOIN swot_items si ON si.id = gts.swot_item_id WHERE gts.gps_target_id = ? ORDER BY gts.created_at ASC");
        $stmt->execute([$gpsTargetId]);
        return array_map([$this, 'castRow'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function listBySwotItem(int $swotItemId): array
    {
        $stmt = $this->conn->prepare("SELECT gts.*, gt.title as target_title, gt.status as target_status FROM gps_target_sources gts JOIN gps_targets gt ON gt.id = gts.gps_target_id WHERE gts.swot_item_id = ? ORDER BY gts.created_at ASC");
        $stmt->execute([$swotItemId]);
        return array_map([$this, 'castRow'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function listAll(array $filters = []): array
    {
        $sql = "SELECT * FROM gps_target_sources WHERE 1=1";
        $params = [];
        if (isset($filters['gps_target_id'])) { $sql .= " AND gps_target_id = ?"; $params[] = (int)$filters['gps_target_id']; }
        if (isset($filters['swot_item_id'])) { $sql .= " AND swot_item_id = ?"; $params[] = (int)$filters['swot_item_id']; }
        if (isset($filters['source_type'])) { $sql .= " AND source_type = ?"; $params[] = $this->normalizeType($filters['source_type']); }
        $sql .= " ORDER BY created_at DESC";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        return array_map([$this, 'castRow'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function unlink(int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM gps_target_sources WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    public function unlinkByTargetAndSwot(int $gpsTargetId, int $swotItemId): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM gps_target_sources WHERE gps_target_id = ? AND swot_item_id = ?");
        $stmt->execute([$gpsTargetId, $swotItemId]);
        return $stmt->rowCount() > 0;
    }

    private function assertGpsExists(int $id): void
    {
        $stmt = $this->conn->prepare("SELECT id FROM gps_targets WHERE id = ?");
        $stmt->execute([$id]);
        if (!$stmt->fetchColumn()) throw new RuntimeException("gps_targets id $id not found");
    }

    private function assertSwotItemExists(int $id): void
    {
        $stmt = $this->conn->prepare("SELECT id FROM swot_items WHERE id = ?");
        $stmt->execute([$id]);
        if (!$stmt->fetchColumn()) throw new RuntimeException("swot_items id $id not found");
    }

    private function assertSameCompany(int $gpsTargetId, int $swotItemId): void
    {
        $stmt = $this->conn->prepare("SELECT company_id FROM gps_targets WHERE id = ?");
        $stmt->execute([$gpsTargetId]);
        $gpsCompany = $stmt->fetchColumn();
        $stmt2 = $this->conn->prepare("SELECT sa.company_id FROM swot_items si JOIN swot_analyses sa ON sa.id = si.swot_analysis_id WHERE si.id = ?");
        $stmt2->execute([$swotItemId]);
        $swotCompany = $stmt2->fetchColumn();
        if ($gpsCompany === false || $swotCompany === false) return;
        if ((int)$gpsCompany !== (int)$swotCompany) {
            throw new RuntimeException("Cannot link target (company $gpsCompany) to SWOT item (company $swotCompany) — cross-company links are not allowed.");
        }
    }

    private function filterWritable(array $data): array
    {
        $out = [];
        foreach (self::WRITABLE as $k) if (array_key_exists($k, $data)) $out[$k] = $data[$k];
        return $out;
    }

    private function normalizeType(mixed $v): string
    {
        $v = strtolower(trim((string)$v));
        return in_array($v, self::TYPES, true) ? $v : 'legacy_unlinked';
    }

    private function castRow(array $row): array
    {
        $row['id'] = (int)$row['id'];
        $row['gps_target_id'] = (int)$row['gps_target_id'];
        if (isset($row['swot_item_id']) && $row['swot_item_id'] !== null) $row['swot_item_id'] = (int)$row['swot_item_id'];
        return $row;
    }
}
