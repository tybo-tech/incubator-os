<?php
declare(strict_types=1);

/**
 * Server-built, READ-ONLY preparation brief for a Session's company.
 *
 * Everything here is read from the EXISTING domains — no Session table stores a
 * copy of any of it. This is a read model: it queries the canonical tables and
 * models directly and never writes.
 *
 * Sections:
 *   - previous completed Session summary (+ its decisions)
 *   - open and overdue tasks
 *   - active / overdue targets
 *   - current SWOT items
 *   - financial measurement coverage
 *   - achievements awaiting review
 *   - recently verified achievements
 *   - records explicitly linked to this Session's agenda
 *
 * All counts are company-scoped. `achievementsAwaitingReview` reuses the
 * Achievement model so verification eligibility is computed by the same logic the
 * achievement workflow uses.
 */
final class SessionBriefReadModel
{
    public function __construct(private PDO $db) {}

    /**
     * @param array<string,mixed> $sessionRow
     * @return array<string,mixed>
     */
    public function build(array $sessionRow, ?array $previousRow, SessionRepository $sessions): array
    {
        $companyId = (int)$sessionRow['company_id'];
        $sessionId = (int)$sessionRow['id'];

        $previous = null;
        if ($previousRow) {
            $previous = [
                'id' => (int)$previousRow['id'],
                'subject' => (string)$previousRow['subject'],
                'subjectLabel' => (string)$previousRow['session_type'],
                'completedAt' => $this->iso($previousRow['completed_at'] ?? null),
                'closingSummary' => $previousRow['closing_summary'] !== null ? (string)$previousRow['closing_summary'] : null,
                'decisions' => array_map(
                    static fn(array $d): array => [
                        'id' => (int)$d['id'],
                        'decisionText' => (string)$d['decision_text'],
                        'decisionDate' => (string)$d['decision_date'],
                        'rationale' => $d['rationale'] !== null ? (string)$d['rationale'] : null,
                    ],
                    $sessions->decisions((int)$previousRow['id'])
                ),
            ];
        }

        return [
            'sessionId' => $sessionId,
            'companyId' => $companyId,
            'generatedAt' => $this->iso(gmdate('Y-m-d H:i:s')),
            'previousSession' => $previous,
            'openTasks' => $this->openTasks($companyId),
            'activeTargets' => $this->activeTargets($companyId),
            'currentSwotItems' => $this->currentSwotItems($companyId),
            'financialCoverage' => $this->financialCoverage($companyId),
            'achievementsAwaitingReview' => $this->achievementsAwaitingReview($companyId),
            'recentlyVerifiedAchievements' => $this->recentlyVerifiedAchievements($companyId),
            'agendaLinks' => $this->agendaLinks($sessionRow, $sessions),
        ];
    }

    // ---------------------------------------------------------------- sections

    /**
     * Tasks that are not completed/blocked, plus overdue ones — the execution work
     * currently open beneath the company's Targets.
     *
     * @return array<string,mixed>
     */
    private function openTasks(int $companyId): array
    {
        $sql = "SELECT t.id, t.gps_target_id, t.title, t.status, t.due_date, t.owner_label,
                       g.title AS target_title
                FROM gps_target_tasks t
                JOIN gps_targets g ON g.id = t.gps_target_id
                WHERE g.company_id = :company
                  AND t.status IN ('not_started','in_progress','blocked')
                ORDER BY (t.due_date IS NULL) ASC, t.due_date ASC, t.id ASC
                LIMIT 50";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['company' => $companyId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $items = [];
        $overdue = 0;
        $today = gmdate('Y-m-d');
        foreach ($rows as $r) {
            $isOverdue = $r['due_date'] !== null && (string)$r['due_date'] < $today;
            if ($isOverdue) {
                $overdue++;
            }
            $items[] = [
                'id' => (int)$r['id'],
                'targetId' => (int)$r['gps_target_id'],
                'targetTitle' => (string)$r['target_title'],
                'title' => (string)$r['title'],
                'status' => (string)$r['status'],
                'dueDate' => $r['due_date'] !== null ? (string)$r['due_date'] : null,
                'ownerLabel' => $r['owner_label'] !== null ? (string)$r['owner_label'] : null,
                'overdue' => $isOverdue,
            ];
        }
        return ['total' => count($items), 'overdue' => $overdue, 'items' => $items];
    }

    /**
     * Targets that are active (not completed/cancelled); overdue ones are flagged.
     *
     * @return array<string,mixed>
     */
    private function activeTargets(int $companyId): array
    {
        $sql = "SELECT id, title, category, status, priority, due_date, progress_mode, manual_progress_percentage
                FROM gps_targets
                WHERE company_id = :company AND status NOT IN ('completed','cancelled')
                ORDER BY (due_date IS NULL) ASC, due_date ASC, id DESC
                LIMIT 50";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['company' => $companyId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $items = [];
        $overdue = 0;
        $today = gmdate('Y-m-d');
        foreach ($rows as $r) {
            $isOverdue = $r['due_date'] !== null && (string)$r['due_date'] < $today;
            if ($isOverdue) {
                $overdue++;
            }
            $items[] = [
                'id' => (int)$r['id'],
                'title' => (string)$r['title'],
                'category' => (string)$r['category'],
                'status' => (string)$r['status'],
                'priority' => $r['priority'] !== null ? (string)$r['priority'] : null,
                'dueDate' => $r['due_date'] !== null ? (string)$r['due_date'] : null,
                'progressMode' => (string)$r['progress_mode'],
                'progress' => (float)$r['manual_progress_percentage'],
                'overdue' => $isOverdue,
            ];
        }
        return ['total' => count($items), 'overdue' => $overdue, 'items' => $items];
    }

    /**
     * Items from the company's CURRENT SWOT analysis.
     *
     * @return array<string,mixed>
     */
    private function currentSwotItems(int $companyId): array
    {
        $stmt = $this->db->prepare(
            "SELECT a.id AS analysis_id, a.summary, a.analysis_date
             FROM swot_analyses a
             WHERE a.company_id = :company AND a.is_current = 1 AND a.status <> 'archived'
             ORDER BY a.id DESC LIMIT 1"
        );
        $stmt->execute(['company' => $companyId]);
        $analysis = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;

        if (!$analysis) {
            return ['analysisId' => null, 'total' => 0, 'items' => []];
        }

        $stmt = $this->db->prepare(
            "SELECT id, category, description, impact, priority, status
             FROM swot_items WHERE swot_analysis_id = :analysis
             ORDER BY FIELD(category,'strength','weakness','opportunity','threat'), id ASC
             LIMIT 50"
        );
        $stmt->execute(['analysis' => (int)$analysis['analysis_id']]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $items = [];
        foreach ($rows as $r) {
            $items[] = [
                'id' => (int)$r['id'],
                'category' => (string)$r['category'],
                'description' => (string)$r['description'],
                'impact' => $r['impact'] !== null ? (string)$r['impact'] : null,
                'priority' => $r['priority'] !== null ? (string)$r['priority'] : null,
                'status' => (string)$r['status'],
            ];
        }
        return [
            'analysisId' => (int)$analysis['analysis_id'],
            'summary' => $analysis['summary'] !== null ? (string)$analysis['summary'] : null,
            'total' => count($items),
            'items' => $items,
        ];
    }

    /**
     * Financial measurement coverage: how many distinct months of management-account
     * indicators exist, and which of the last 12 months are missing.
     *
     * Financial VALUES stay in the measurement domain — this reports coverage only.
     *
     * @return array<string,mixed>
     */
    private function financialCoverage(int $companyId): array
    {
        // Financial indicators live in the generic `nodes` table.
        $stmt = $this->db->prepare(
            "SELECT data FROM nodes WHERE company_id = :company AND type = 'financial_indicators'"
        );
        $stmt->execute(['company' => $companyId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $covered = [];
        foreach ($rows as $r) {
            $data = json_decode((string)$r['data'], true);
            $meta = is_array($data) ? ($data['meta'] ?? []) : [];
            $year = (int)($meta['financialYear'] ?? $meta['financial_year'] ?? 0);
            $month = (int)($meta['month'] ?? 0);
            if ($year > 0 && $month >= 1 && $month <= 12) {
                $covered[$year . '-' . str_pad((string)$month, 2, '0', STR_PAD_LEFT)] = true;
            }
        }

        // The last 12 months, most recent first.
        $missing = [];
        $cursor = new DateTimeImmutable('first day of this month', new DateTimeZone('UTC'));
        for ($i = 0; $i < 12; $i++) {
            $key = $cursor->format('Y-m');
            if (!isset($covered[$key])) {
                $missing[] = $key;
            }
            $cursor = $cursor->modify('-1 month');
        }
        ksort($covered);

        return [
            'coveredPeriods' => array_keys($covered),
            'coveredCount' => count($covered),
            'missingPeriods' => $missing,
            'missingCount' => count($missing),
        ];
    }

    /**
     * Measured targets with an authoritative measurement but no verified outcome.
     * Reuses the Achievement model so eligibility matches the achievement workflow.
     *
     * @return array<int,array<string,mixed>>
     */
    private function achievementsAwaitingReview(int $companyId): array
    {
        if (!class_exists('Achievement')) {
            require_once __DIR__ . '/../../../models/Achievement.php';
        }
        try {
            $rows = (new Achievement($this->db))->awaitingReview($companyId);
        } catch (Throwable) {
            return [];
        }
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'targetId' => (int)($r['gps_target_id'] ?? 0),
                'measurement' => $r['measurement'] ?? null,
            ];
        }
        return $out;
    }

    /**
     * Recently verified achievements (the reward/recognition context).
     *
     * @return array<int,array<string,mixed>>
     */
    private function recentlyVerifiedAchievements(int $companyId): array
    {
        $stmt = $this->db->prepare(
            "SELECT a.id, a.gps_target_id, a.kind, a.category, a.title, a.achieved_on,
                    a.actual_value, a.unit, a.verified_at,
                    (SELECT COUNT(*) FROM achievement_evidence e WHERE e.achievement_id = a.id) AS evidence_count
             FROM achievements a
             WHERE a.company_id = :company AND a.verification_status = 'verified' AND a.kind <> 'decision'
             ORDER BY a.verified_at DESC, a.id DESC
             LIMIT 20"
        );
        $stmt->execute(['company' => $companyId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'id' => (int)$r['id'],
                'targetId' => $r['gps_target_id'] !== null ? (int)$r['gps_target_id'] : null,
                'kind' => (string)$r['kind'],
                'category' => $r['category'] !== null ? (string)$r['category'] : null,
                'title' => (string)$r['title'],
                'achievedOn' => $r['achieved_on'] !== null ? (string)$r['achieved_on'] : null,
                'actualValue' => $r['actual_value'] !== null ? (float)$r['actual_value'] : null,
                'unit' => $r['unit'] !== null ? (string)$r['unit'] : null,
                'verifiedAt' => $this->iso($r['verified_at']),
                'evidenceCount' => (int)$r['evidence_count'],
            ];
        }
        return $out;
    }

    /**
     * Records explicitly linked to THIS Session.
     *
     * @param array<string,mixed> $sessionRow
     * @return array<int,array<string,mixed>>
     */
    private function agendaLinks(array $sessionRow, SessionRepository $sessions): array
    {
        $sessionId = (int)$sessionRow['id'];
        $links = $sessions->links($sessionId);
        $agendaItems = $sessions->agenda($sessionId);

        $byEntity = [];
        foreach ($links as $l) {
            $byEntity[(string)$l['entity_type'] . ':' . (int)$l['entity_id']] = $l;
        }

        $out = [];
        foreach ($links as $l) {
            $out[] = [
                'linkId' => (int)$l['id'],
                'entityType' => (string)$l['entity_type'],
                'entityId' => (int)$l['entity_id'],
                'relationship' => (string)$l['relationship'],
                'label' => $l['label'] !== null ? (string)$l['label'] : null,
            ];
        }
        // Agenda topics are included so the brief shows what will be covered.
        foreach ($agendaItems as $a) {
            $out[] = [
                'linkId' => null,
                'entityType' => 'agenda_item',
                'entityId' => (int)$a['id'],
                'relationship' => 'AGENDA',
                'label' => (string)$a['topic'],
            ];
        }
        return $out;
    }

    private function iso(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        try {
            $d = new DateTimeImmutable($value, new DateTimeZone('UTC'));
            return $d->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');
        } catch (Exception) {
            return $value;
        }
    }
}
