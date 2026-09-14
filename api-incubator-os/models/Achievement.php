<?php
declare(strict_types=1);

require_once __DIR__ . '/AchievementEvidence.php';
require_once __DIR__ . '/../services/TargetMeasurementService.php';

if (!class_exists('NotFoundException')) {
    class NotFoundException extends RuntimeException {}
}
if (!class_exists('ConflictException')) {
    class ConflictException extends RuntimeException {}
}

/**
 * Achievement — a dated, attributable, verifiable outcome (Sprint 007 Phase 4).
 *
 * Lifecycle:
 *   unverified (draft)  --edit/delete OK, reachable state for corrections
 *     ├── verify  --> verified   (measurable: atomic measurement snapshot; qualitative: no snapshot)
 *     ├── reject  --> rejected   (no snapshot)
 *   verified
 *     ├── revoke(reason) --> revoked
 *     └── supersede --> new unverified draft linked via supersedes_id (original preserved)
 *
 *   `decision` is an event: it cannot be verified or rejected.
 *
 * Identity (recorded_by / verified_by / timestamps) is ALWAYS supplied by the server from the
 * authenticated session — never accepted from request input.
 * Verified records and their evidence are immutable: edit/delete return ConflictException → 409.
 */
class Achievement
{
    private PDO $conn;

    private const WRITABLE = [
        'company_id','gps_target_id','category','kind','title','description','achieved_on',
        'baseline_value','target_value','actual_value','unit','direction','evidence_summary'
    ];
    private const KINDS = ['result','achievement','decision'];
    private const CATEGORIES = ['strategy_general','finance','sales_marketing','personal_development'];
    private const DIRECTIONS = ['increase','decrease','maintain'];
    private const STATUSES = ['unverified','verified','rejected','revoked'];

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /* ============================== Create / Update ============================== */

    public function create(array $data, ?int $recordedBy, ?int $supersedesId = null): array
    {
        $f = $this->filterWritable($data);
        if (empty($f['company_id'])) throw new InvalidArgumentException('company_id is required');
        if (empty($f['title']) || trim((string)$f['title']) === '') throw new InvalidArgumentException('title is required');

        $f['company_id'] = (int)$f['company_id'];
        $f['kind'] = $this->normalizeEnum($f['kind'] ?? 'result', self::KINDS, 'kind');
        if (array_key_exists('category', $f)) $f['category'] = $this->nullableEnum($f['category'], self::CATEGORIES, 'category');
        $f['gps_target_id'] = isset($f['gps_target_id']) && (int)$f['gps_target_id'] > 0 ? (int)$f['gps_target_id'] : null;
        if ($f['gps_target_id'] !== null) $this->assertTargetSameCompany($f['gps_target_id'], $f['company_id']);
        if (array_key_exists('achieved_on', $f)) $f['achieved_on'] = $this->toDate($f['achieved_on']);
        $f['title'] = trim((string)$f['title']);
        if (array_key_exists('description', $f)) $f['description'] = $f['description'] !== null ? (string)$f['description'] : null;
        foreach (['baseline_value','target_value','actual_value'] as $k) {
            if (array_key_exists($k, $f)) $f[$k] = ($f[$k] === null || $f[$k] === '') ? null : (float)$f[$k];
        }
        if (array_key_exists('unit', $f)) $f['unit'] = $f['unit'] !== null && trim((string)$f['unit']) !== '' ? trim((string)$f['unit']) : null;
        if (array_key_exists('direction', $f)) $f['direction'] = $this->nullableEnum($f['direction'], self::DIRECTIONS, 'direction');

        if ($supersedesId !== null) {
            $orig = $this->getById($supersedesId);
            if (!$orig) throw new NotFoundException("achievements id $supersedesId not found");
            if ((int)$orig['company_id'] !== $f['company_id']) {
                throw new InvalidArgumentException('superseded achievement must belong to the same company.');
            }
            if ($orig['verification_status'] !== 'verified') {
                throw new ConflictException('Only a verified achievement can be superseded.');
            }
            $f['supersedes_id'] = $supersedesId;
        }

        $f['recorded_by'] = $recordedBy;
        $cols = array_keys($f);
        $ph = array_fill(0, count($cols), '?');
        $stmt = $this->conn->prepare("INSERT INTO achievements (" . implode(',', $cols) . ", verification_status) VALUES (" . implode(',', $ph) . ", 'unverified')");
        $stmt->execute(array_values($f));
        return $this->getById((int)$this->conn->lastInsertId());
    }

    public function update(int $id, array $data): array
    {
        $existing = $this->getById($id);
        if (!$existing) throw new NotFoundException("achievements id $id not found");
        $this->assertDraft($existing);

        $f = $this->filterWritable($data);
        unset($f['company_id']); // an achievement cannot be moved between companies
        if (array_key_exists('kind', $f)) $f['kind'] = $this->normalizeEnum($f['kind'], self::KINDS, 'kind');
        if (array_key_exists('category', $f)) $f['category'] = $this->nullableEnum($f['category'], self::CATEGORIES, 'category');
        if (array_key_exists('gps_target_id', $f)) {
            $f['gps_target_id'] = (int)$f['gps_target_id'] > 0 ? (int)$f['gps_target_id'] : null;
            if ($f['gps_target_id'] !== null) $this->assertTargetSameCompany($f['gps_target_id'], (int)$existing['company_id']);
        }
        if (array_key_exists('achieved_on', $f)) $f['achieved_on'] = $this->toDate($f['achieved_on']);
        if (array_key_exists('title', $f)) {
            if (trim((string)$f['title']) === '') throw new InvalidArgumentException('title cannot be empty');
            $f['title'] = trim((string)$f['title']);
        }
        foreach (['baseline_value','target_value','actual_value'] as $k) {
            if (array_key_exists($k, $f)) $f[$k] = ($f[$k] === null || $f[$k] === '') ? null : (float)$f[$k];
        }
        if (array_key_exists('unit', $f)) $f['unit'] = $f['unit'] !== null && trim((string)$f['unit']) !== '' ? trim((string)$f['unit']) : null;
        if (array_key_exists('direction', $f)) $f['direction'] = $this->nullableEnum($f['direction'], self::DIRECTIONS, 'direction');
        if (!$f) return $existing;

        $sets = []; $params = [];
        foreach ($f as $k => $v) { $sets[] = "$k = ?"; $params[] = $v; }
        $params[] = $id;
        $stmt = $this->conn->prepare("UPDATE achievements SET " . implode(', ', $sets) . ", updated_at = NOW() WHERE id = ?");
        $stmt->execute($params);
        return $this->getById($id);
    }

    public function delete(int $id): bool
    {
        $existing = $this->getById($id);
        if (!$existing) throw new NotFoundException("achievements id $id not found");
        $this->assertDraft($existing);
        $stmt = $this->conn->prepare("DELETE FROM achievements WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    /* ================================== Lifecycle ================================ */

    /**
     * Verify an achievement. Measurable records get an automatic measurement snapshot written in
     * the SAME transaction; if the measurement is unconfigured/ineligible the whole thing rolls
     * back and the achievement is unchanged.
     */
    public function verify(int $id, int $verifierId): array
    {
        $this->conn->beginTransaction();
        try {
            $row = $this->lockRow($id);
            if (!$row) throw new NotFoundException("achievements id $id not found");
            $this->assertDecisionNotDecidable($row);
            if ($row['verification_status'] !== 'unverified') {
                throw new ConflictException('Achievement is already ' . $row['verification_status'] . '.');
            }

            $cols = [];
            if (!empty($row['gps_target_id'])) {
                $measurement = (new TargetMeasurementService($this->conn))->calculateForTarget((int)$row['gps_target_id']);
                if (empty($measurement['configured']) || empty($measurement['eligible_for_achievement'])) {
                    $reason = $measurement['reason'] ?? ($measurement['progress']['status'] ?? 'ineligible');
                    throw new ConflictException('Verification failed — measurement is not eligible (no authoritative outcome). Reason: ' . $reason);
                }
                (new AchievementEvidence($this->conn))->add($id, [
                    'source_type' => 'metric_snapshot',
                    'label' => 'Measurement snapshot',
                    'snapshot_json' => json_encode($measurement, JSON_UNESCAPED_UNICODE),
                ], $verifierId);
                $cols = [
                    'baseline_value' => $measurement['baseline']['subtotal'] ?? null,
                    'target_value' => $measurement['measure']['target_value'] ?? null,
                    'actual_value' => $measurement['target']['subtotal'] ?? null,
                    'unit' => $measurement['measure']['unit'] ?? null,
                    'direction' => $measurement['measure']['direction'] ?? null,
                ];
            }

            $sets = [];
            $params = [];
            foreach ($cols as $k => $v) { $sets[] = "$k = ?"; $params[] = $v; }
            $sets[] = "verification_status = 'verified'";
            $sets[] = "verified_by = ?";
            $params[] = $verifierId;
            $sets[] = "verified_at = NOW()";
            $params[] = $id;
            $stmt = $this->conn->prepare("UPDATE achievements SET " . implode(', ', $sets) . ", updated_at = NOW() WHERE id = ?");
            $stmt->execute($params);
            $this->conn->commit();
        } catch (Throwable $e) {
            if ($this->conn->inTransaction()) $this->conn->rollBack();
            throw $e;
        }
        return $this->getById($id);
    }

    /** Reject without a measurement snapshot. */
    public function reject(int $id, int $deciderId): array
    {
        $this->conn->beginTransaction();
        try {
            $row = $this->lockRow($id);
            if (!$row) throw new NotFoundException("achievements id $id not found");
            $this->assertDecisionNotDecidable($row);
            if ($row['verification_status'] !== 'unverified') {
                throw new ConflictException('Achievement is already ' . $row['verification_status'] . '.');
            }
            $stmt = $this->conn->prepare("UPDATE achievements SET verification_status = 'rejected', verified_by = ?, verified_at = NOW(), updated_at = NOW() WHERE id = ?");
            $stmt->execute([$deciderId, $id]);
            $this->conn->commit();
        } catch (Throwable $e) {
            if ($this->conn->inTransaction()) $this->conn->rollBack();
            throw $e;
        }
        return $this->getById($id);
    }

    /** Revoke a verified achievement with a required reason. Evidence is preserved. */
    public function revoke(int $id, int $revokerId, string $reason): array
    {
        $reason = trim($reason);
        if ($reason === '') throw new InvalidArgumentException('A reason is required to revoke an achievement.');

        $this->conn->beginTransaction();
        try {
            $row = $this->lockRow($id);
            if (!$row) throw new NotFoundException("achievements id $id not found");
            if ($row['verification_status'] !== 'verified') {
                throw new ConflictException('Only a verified achievement can be revoked (current: ' . $row['verification_status'] . ').');
            }
            $stmt = $this->conn->prepare("UPDATE achievements SET verification_status = 'revoked', revoked_reason = ?, revoked_by = ?, revoked_at = NOW(), updated_at = NOW() WHERE id = ?");
            $stmt->execute([$reason, $revokerId, $id]);
            $this->conn->commit();
        } catch (Throwable $e) {
            if ($this->conn->inTransaction()) $this->conn->rollBack();
            throw $e;
        }
        return $this->getById($id);
    }

    /**
     * Create a superseding draft from a verified record. The original (and its evidence) is
     * untouched; the new draft carries `supersedes_id` and can be verified on its own merits.
     */
    public function supersede(int $id, array $overrides, int $userId): array
    {
        $orig = $this->getById($id);
        if (!$orig) throw new NotFoundException("achievements id $id not found");
        if ($orig['verification_status'] !== 'verified') {
            throw new ConflictException('Only a verified achievement can be superseded.');
        }
        $o = $this->filterWritable($overrides);
        $payload = [
            'company_id' => (int)$orig['company_id'],
            'gps_target_id' => $o['gps_target_id'] ?? $orig['gps_target_id'],
            'category' => $o['category'] ?? $orig['category'],
            'kind' => $o['kind'] ?? $orig['kind'],
            'title' => $o['title'] ?? ('Supersedes #' . $orig['id'] . ': ' . $orig['title']),
            'description' => $o['description'] ?? $orig['description'],
            'achieved_on' => $o['achieved_on'] ?? $orig['achieved_on'],
            'baseline_value' => $o['baseline_value'] ?? $orig['baseline_value'],
            'target_value' => $o['target_value'] ?? $orig['target_value'],
            'actual_value' => $o['actual_value'] ?? $orig['actual_value'],
            'unit' => $o['unit'] ?? $orig['unit'],
            'direction' => $o['direction'] ?? $orig['direction'],
            'evidence_summary' => $o['evidence_summary'] ?? $orig['evidence_summary'],
        ];
        return $this->create($payload, $userId, (int)$orig['id']);
    }

    /* ==================================== Reads ================================== */

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM achievements WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    public function listByCompany(int $companyId, array $filters = []): array
    {
        $sql = "SELECT a.*, (SELECT COUNT(*) FROM achievement_evidence e WHERE e.achievement_id = a.id) AS evidence_count
                FROM achievements a WHERE a.company_id = ?";
        $params = [$companyId];
        if (isset($filters['kind'])) { $sql .= " AND a.kind = ?"; $params[] = $this->normalizeEnum($filters['kind'], self::KINDS, 'kind'); }
        if (isset($filters['verification_status'])) { $sql .= " AND a.verification_status = ?"; $params[] = $this->normalizeEnum($filters['verification_status'], self::STATUSES, 'verification_status'); }
        if (isset($filters['category'])) { $sql .= " AND a.category = ?"; $params[] = $filters['category']; }
        if (isset($filters['gps_target_id'])) { $sql .= " AND a.gps_target_id = ?"; $params[] = (int)$filters['gps_target_id']; }
        $sql .= " ORDER BY (a.achieved_on IS NULL), a.achieved_on DESC, a.id DESC";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        return array_map([$this, 'castRow'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function listByTarget(int $gpsTargetId): array
    {
        $stmt = $this->conn->prepare(
            "SELECT a.*, (SELECT COUNT(*) FROM achievement_evidence e WHERE e.achievement_id = a.id) AS evidence_count
             FROM achievements a WHERE a.gps_target_id = ?
             ORDER BY (a.achieved_on IS NULL), a.achieved_on DESC, a.id DESC"
        );
        $stmt->execute([$gpsTargetId]);
        return array_map([$this, 'castRow'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /** Achievement counts — decisions are events and are excluded. */
    public function countsByCompany(int $companyId): array
    {
        $stmt = $this->conn->prepare(
            "SELECT verification_status, COUNT(*) AS n FROM achievements
             WHERE company_id = ? AND kind <> 'decision' GROUP BY verification_status"
        );
        $stmt->execute([$companyId]);
        $by = array_fill_keys(self::STATUSES, 0);
        $total = 0;
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) { $by[$r['verification_status']] = (int)$r['n']; $total += (int)$r['n']; }
        $stmt2 = $this->conn->prepare("SELECT COUNT(*) FROM achievements WHERE company_id = ? AND kind = 'decision'");
        $stmt2->execute([$companyId]);
        return ['total' => $total, 'by_status' => $by, 'decisions' => (int)$stmt2->fetchColumn()];
    }

    /**
     * Measured targets with an authoritative measurement and no verified outcome yet.
     * (Decisions are not outcomes.)
     */
    public function awaitingReview(int $companyId): array
    {
        $stmt = $this->conn->prepare(
            "SELECT g.id FROM gps_targets g
             WHERE g.company_id = ? AND g.progress_mode = 'metric'
               AND EXISTS (SELECT 1 FROM gps_target_metrics m WHERE m.gps_target_id = g.id)
             ORDER BY g.id ASC"
        );
        $stmt->execute([$companyId]);
        $ids = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
        if (!$ids) return [];

        $svc = new TargetMeasurementService($this->conn);
        $out = [];
        foreach ($ids as $tid) {
            $measurement = $svc->calculateForTarget($tid);
            if (empty($measurement['eligible_for_achievement'])) continue;
            $chk = $this->conn->prepare("SELECT COUNT(*) FROM achievements WHERE gps_target_id = ? AND kind <> 'decision' AND verification_status = 'verified'");
            $chk->execute([$tid]);
            if ((int)$chk->fetchColumn() > 0) continue;
            $out[] = ['gps_target_id' => $tid, 'measurement' => $measurement];
        }
        return $out;
    }

    /* ================================== Internal ================================= */

    private function lockRow(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM achievements WHERE id = ? FOR UPDATE");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    private function assertDraft(array $row): void
    {
        if (($row['verification_status'] ?? '') !== 'unverified') {
            throw new ConflictException('Verified records are immutable — revoke or supersede instead.');
        }
    }

    private function assertDecisionNotDecidable(array $row): void
    {
        if (($row['kind'] ?? '') === 'decision') {
            throw new ConflictException('A decision is an event — it cannot be verified or rejected.');
        }
    }

    private function assertTargetSameCompany(int $gpsTargetId, int $companyId): void
    {
        $stmt = $this->conn->prepare("SELECT company_id FROM gps_targets WHERE id = ?");
        $stmt->execute([$gpsTargetId]);
        $targetCompany = $stmt->fetchColumn();
        if ($targetCompany === false) throw new NotFoundException("gps_targets id $gpsTargetId not found");
        if ((int)$targetCompany !== $companyId) {
            throw new InvalidArgumentException("Linked target (company $targetCompany) does not belong to this achievement's company ($companyId).");
        }
    }

    private function filterWritable(array $data): array
    {
        $out = [];
        foreach (self::WRITABLE as $k) if (array_key_exists($k, $data)) $out[$k] = $data[$k];
        return $out;
    }

    private function normalizeEnum(mixed $v, array $allowed, string $field): string
    {
        $s = strtolower(trim((string)$v));
        if (!in_array($s, $allowed, true)) throw new InvalidArgumentException("Invalid $field '$s' — allowed: " . implode(', ', $allowed));
        return $s;
    }

    private function nullableEnum(mixed $v, array $allowed, string $field): ?string
    {
        if ($v === null || trim((string)$v) === '') return null;
        return $this->normalizeEnum($v, $allowed, $field);
    }

    private function toDate(mixed $v): ?string
    {
        if ($v === null || trim((string)$v) === '') return null;
        try { return (new DateTime((string)$v))->format('Y-m-d'); } catch (Throwable) { return null; }
    }

    private function castRow(array $row): array
    {
        foreach (['id','company_id','gps_target_id','recorded_by','verified_by','revoked_by','supersedes_id','evidence_count'] as $k) {
            if (isset($row[$k]) && $row[$k] !== null) $row[$k] = (int)$row[$k];
        }
        foreach (['baseline_value','target_value','actual_value'] as $k) {
            if (isset($row[$k]) && $row[$k] !== null) $row[$k] = (float)$row[$k];
        }
        return $row;
    }
}
