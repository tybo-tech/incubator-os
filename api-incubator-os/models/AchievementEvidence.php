<?php
declare(strict_types=1);

if (!class_exists('NotFoundException')) {
    class NotFoundException extends RuntimeException {}
}
if (!class_exists('ConflictException')) {
    class ConflictException extends RuntimeException {}
}

/**
 * AchievementEvidence — evidence attached to an achievement.
 *
 * Lifecycle (Sprint 007 Phase 4):
 *   - Append-only: `add()` is permitted on drafts AND on verified records.
 *   - Deletion is permitted ONLY while the parent achievement is `unverified` (draft cleanup);
 *     on a decided record (verified/rejected/revoked) deletion returns a ConflictException → 409.
 *   - `metric_snapshot` rows are written automatically by Achievement::verify() inside its
 *     transaction; a unique functional index (`uq_evidence_metric_snapshot`) allows at most one.
 */
class AchievementEvidence
{
    private PDO $conn;

    private const SOURCE_TYPES = ['metric_snapshot','financial_stat','note','url','file'];

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    public function add(int $achievementId, array $data, ?int $userId): array
    {
        $status = $this->parentStatus($achievementId);
        if ($status === null) throw new NotFoundException("achievements id $achievementId not found");

        $source = strtolower(trim((string)($data['source_type'] ?? 'note')));
        if (!in_array($source, self::SOURCE_TYPES, true)) {
            throw new InvalidArgumentException("Invalid source_type '$source' — allowed: " . implode(', ', self::SOURCE_TYPES));
        }
        $label = isset($data['label']) && trim((string)$data['label']) !== '' ? trim((string)$data['label']) : null;
        $reference = isset($data['reference']) && trim((string)$data['reference']) !== '' ? trim((string)$data['reference']) : null;
        $snapshot = $data['snapshot_json'] ?? null;
        if (is_array($snapshot)) $snapshot = json_encode($snapshot, JSON_UNESCAPED_UNICODE);
        if ($snapshot !== null && !is_string($snapshot)) throw new InvalidArgumentException('snapshot_json must be a JSON string or array.');

        $stmt = $this->conn->prepare(
            "INSERT INTO achievement_evidence (achievement_id, source_type, label, reference, snapshot_json, created_by)
             VALUES (?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([$achievementId, $source, $label, $reference, $snapshot, $userId]);
        return $this->getById((int)$this->conn->lastInsertId());
    }

    /**
     * Delete evidence. Draft parents only — a deliberate success shape is returned.
     * @throws ConflictException when the parent is not `unverified`.
     */
    public function delete(int $id): array
    {
        $row = $this->getById($id);
        if (!$row) throw new NotFoundException("achievement_evidence id $id not found");
        $status = $this->parentStatus((int)$row['achievement_id']);
        if ($status !== 'unverified') {
            throw new ConflictException('Evidence on a verified record is immutable — revoke or supersede instead.');
        }
        $stmt = $this->conn->prepare("DELETE FROM achievement_evidence WHERE id = ?");
        $stmt->execute([$id]);
        return ['success' => true, 'deleted' => $stmt->rowCount() > 0, 'id' => $id];
    }

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM achievement_evidence WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    public function listByAchievement(int $achievementId): array
    {
        $stmt = $this->conn->prepare("SELECT * FROM achievement_evidence WHERE achievement_id = ? ORDER BY created_at ASC, id ASC");
        $stmt->execute([$achievementId]);
        return array_map([$this, 'castRow'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    private function parentStatus(int $achievementId): ?string
    {
        $stmt = $this->conn->prepare("SELECT verification_status FROM achievements WHERE id = ?");
        $stmt->execute([$achievementId]);
        $v = $stmt->fetchColumn();
        return $v === false ? null : (string)$v;
    }

    private function castRow(array $row): array
    {
        $row['id'] = (int)$row['id'];
        $row['achievement_id'] = (int)$row['achievement_id'];
        if (isset($row['created_by']) && $row['created_by'] !== null) $row['created_by'] = (int)$row['created_by'];
        if (isset($row['snapshot_json']) && is_string($row['snapshot_json'])) {
            $decoded = json_decode($row['snapshot_json'], true);
            if (json_last_error() === JSON_ERROR_NONE) $row['snapshot'] = $decoded;
        }
        return $row;
    }
}
