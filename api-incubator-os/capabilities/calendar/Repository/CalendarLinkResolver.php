<?php
declare(strict_types=1);

/**
 * Resolves a calendar-event link to its owning company and existence.
 *
 * The link target can live in one of six places, so this is the single place
 * that knows how to reach each one. Every lookup returns the owning `company_id`
 * (or throws CalendarNotFoundException) so the service can enforce that a link
 * belongs to the same company as the event.
 */
final class CalendarLinkResolver
{
    public function __construct(private PDO $db) {}

    /**
     * @return int The company_id that owns the linked record.
     * @throws CalendarNotFoundException when the record does not exist.
     */
    public function resolveCompanyId(string $entityType, int $entityId): int
    {
        [$sql, $params] = $this->lookup($entityType, $entityId);
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row || $row['company_id'] === null) {
            throw new CalendarNotFoundException(
                "Linked $entityType $entityId was not found."
            );
        }
        return (int)$row['company_id'];
    }

    /**
     * A human label for the linked record (best-effort; null when unavailable).
     */
    public function resolveLabel(string $entityType, int $entityId): ?string
    {
        [$sql, $params] = $this->lookup($entityType, $entityId, labelled: true);
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) return null;
        $label = $row['label'] ?? null;
        return $label !== null ? trim((string)$label) : null;
    }

    /**
     * @return array{0:string,1:array<string,mixed>}
     */
    private function lookup(string $entityType, int $id, bool $labelled = false): array
    {
        return match ($entityType) {
            CalendarLinkEntityType::GPS_TARGET => [
                $labelled
                    ? "SELECT company_id, title AS label FROM gps_targets WHERE id = :id"
                    : "SELECT company_id FROM gps_targets WHERE id = :id",
                ['id' => $id],
            ],
            CalendarLinkEntityType::SWOT_ITEM => [
                $labelled
                    ? "SELECT sa.company_id, si.description AS label
                       FROM swot_items si JOIN swot_analyses sa ON sa.id = si.swot_analysis_id
                       WHERE si.id = :id"
                    : "SELECT sa.company_id
                       FROM swot_items si JOIN swot_analyses sa ON sa.id = si.swot_analysis_id
                       WHERE si.id = :id",
                ['id' => $id],
            ],
            CalendarLinkEntityType::GPS_TARGET_TASK => [
                $labelled
                    ? "SELECT t.company_id, tk.title AS label
                       FROM gps_target_tasks tk JOIN gps_targets t ON t.id = tk.gps_target_id
                       WHERE tk.id = :id"
                    : "SELECT t.company_id
                       FROM gps_target_tasks tk JOIN gps_targets t ON t.id = tk.gps_target_id
                       WHERE tk.id = :id",
                ['id' => $id],
            ],
            // Financial indicators are stored in the generic `nodes` table.
            CalendarLinkEntityType::FINANCIAL_INDICATOR => [
                $labelled
                    ? "SELECT company_id, COALESCE(JSON_UNQUOTE(JSON_EXTRACT(data, '$.meta.title')), CONCAT('Financial indicators #', id)) AS label
                       FROM nodes WHERE id = :id AND type = 'financial_indicators'"
                    : "SELECT company_id FROM nodes WHERE id = :id AND type = 'financial_indicators'",
                ['id' => $id],
            ],
            CalendarLinkEntityType::ACHIEVEMENT => [
                $labelled
                    ? "SELECT company_id, title AS label FROM achievements WHERE id = :id"
                    : "SELECT company_id FROM achievements WHERE id = :id",
                ['id' => $id],
            ],
            CalendarLinkEntityType::ACHIEVEMENT_EVIDENCE => [
                $labelled
                    ? "SELECT a.company_id, ev.label AS label
                       FROM achievement_evidence ev JOIN achievements a ON a.id = ev.achievement_id
                       WHERE ev.id = :id"
                    : "SELECT a.company_id
                       FROM achievement_evidence ev JOIN achievements a ON a.id = ev.achievement_id
                       WHERE ev.id = :id",
                ['id' => $id],
            ],
            default => throw new CalendarValidationException("Unknown link type: $entityType"),
        };
    }
}
