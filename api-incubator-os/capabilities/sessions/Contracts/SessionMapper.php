<?php
declare(strict_types=1);

/**
 * Maps `sessions` rows (+ nested collections + linked event) to the canonical DTOs.
 *
 * `toSummary` builds the compact list shape (counts + event projection) so a
 * list endpoint never has to load the nested collections.
 */
final class SessionMapper
{
    /**
     * Compact projection of the linked calendar event — the Session's schedule.
     *
     * Reuses the Sprint 008 calendar response contract for date/time so the two
     * capabilities agree on the all-day vs timed shapes.
     *
     * @param array<string,mixed>|null $eventRow
     * @return array<string,mixed>|null
     */
    public static function eventProjection(?array $eventRow): ?array
    {
        if (!$eventRow) {
            return null;
        }
        return [
            'id' => (int)$eventRow['id'],
            'companyId' => $eventRow['company_id'] !== null ? (int)$eventRow['company_id'] : null,
            'title' => (string)$eventRow['title'],
            'category' => (string)$eventRow['category'],
            'status' => (string)$eventRow['status'],
            'allDay' => (bool)$eventRow['all_day'],
            'timezone' => $eventRow['timezone'] !== null ? (string)$eventRow['timezone'] : null,
            'location' => $eventRow['location'] !== null ? (string)$eventRow['location'] : null,
            'startDate' => $eventRow['start_date'] !== null ? (string)$eventRow['start_date'] : null,
            'endDate' => $eventRow['end_date'] !== null ? (string)$eventRow['end_date'] : null,
            'startAt' => self::toIsoUtc($eventRow['start_at'] ?? null),
            'endAt' => self::toIsoUtc($eventRow['end_at'] ?? null),
            'version' => (int)($eventRow['version'] ?? 1),
        ];
    }

    /**
     * @param array<string,mixed> $row
     * @param array<string,mixed>|null $eventRow
     * @param array<int,array<string,mixed>> $participants
     * @param array<int,array<string,mixed>> $agenda
     * @param array<int,array<string,mixed>> $notes
     * @param array<int,array<string,mixed>> $decisions
     * @param array<int,array<string,mixed>> $links
     * @param array<int,array<string,mixed>> $activity
     */
    public static function toResponse(
        array $row,
        ?array $eventRow,
        array $participants = [],
        array $agenda = [],
        array $notes = [],
        array $decisions = [],
        array $links = [],
        array $activity = [],
    ): SessionResponse {
        return new SessionResponse(
            id: (int)$row['id'],
            companyId: (int)$row['company_id'],
            companyName: $row['company_name'] ?? null,
            calendarEventId: $row['calendar_event_id'] !== null ? (int)$row['calendar_event_id'] : null,
            event: self::eventProjection($eventRow),
            sessionType: (string)$row['session_type'],
            subject: (string)$row['subject'],
            purpose: $row['purpose'] !== null ? (string)$row['purpose'] : null,
            status: (string)$row['status'],
            preparationSummary: $row['preparation_summary'] !== null ? (string)$row['preparation_summary'] : null,
            closingSummary: $row['closing_summary'] !== null ? (string)$row['closing_summary'] : null,
            cancellationReason: $row['cancellation_reason'] !== null ? (string)$row['cancellation_reason'] : null,
            facilitatorUserId: $row['facilitator_user_id'] !== null ? (int)$row['facilitator_user_id'] : null,
            facilitatorLabel: $row['facilitator_label'] !== null ? (string)$row['facilitator_label'] : null,
            version: (int)$row['version'],
            startedAt: self::toIsoUtc($row['started_at'] ?? null),
            completedAt: self::toIsoUtc($row['completed_at'] ?? null),
            cancelledAt: self::toIsoUtc($row['cancelled_at'] ?? null),
            cancelledByLabel: $row['cancelled_by_label'] ?? null,
            createdBy: (int)$row['created_by'],
            createdByName: $row['created_by_name'] ?? null,
            participants: array_map([self::class, 'participantRow'], $participants),
            agenda: array_map([self::class, 'agendaRow'], $agenda),
            notes: array_map([self::class, 'noteRow'], $notes),
            decisions: array_map([self::class, 'decisionRow'], $decisions),
            links: array_map([self::class, 'linkRow'], $links),
            activity: array_map([self::class, 'activityRow'], $activity),
            createdAt: self::toIsoUtc($row['created_at']) ?? (string)$row['created_at'],
            updatedAt: self::toIsoUtc($row['updated_at']) ?? (string)$row['updated_at'],
        );
    }

    /**
     * @param array<string,mixed> $row
     * @param array<string,mixed>|null $eventRow
     * @return array<string,mixed>
     */
    public static function toSummaryArray(array $row, ?array $eventRow): array
    {
        $summary = new SessionSummary(
            id: (int)$row['id'],
            companyId: (int)$row['company_id'],
            companyName: $row['company_name'] ?? null,
            calendarEventId: $row['calendar_event_id'] !== null ? (int)$row['calendar_event_id'] : null,
            event: self::eventProjection($eventRow),
            sessionType: (string)$row['session_type'],
            subject: (string)$row['subject'],
            status: (string)$row['status'],
            facilitatorLabel: $row['facilitator_label'] !== null ? (string)$row['facilitator_label'] : null,
            participantCount: (int)($row['participant_count'] ?? 0),
            agendaCount: (int)($row['agenda_count'] ?? 0),
            decisionCount: (int)($row['decision_count'] ?? 0),
            linkCount: (int)($row['link_count'] ?? 0),
            version: (int)$row['version'],
            completedAt: self::toIsoUtc($row['completed_at'] ?? null),
            createdAt: self::toIsoUtc($row['created_at']) ?? (string)$row['created_at'],
            updatedAt: self::toIsoUtc($row['updated_at']) ?? (string)$row['updated_at'],
        );
        return $summary->jsonSerialize();
    }

    /**
     * @param array<string,mixed> $r
     * @return array<string,mixed>
     */
    private static function participantRow(array $r): array
    {
        return [
            'id' => (int)$r['id'],
            'participantType' => (string)$r['participant_type'],
            'userId' => $r['user_id'] !== null ? (int)$r['user_id'] : null,
            'name' => (string)$r['name'],
            'email' => $r['email'] !== null ? (string)$r['email'] : null,
            'role' => $r['role'] !== null ? (string)$r['role'] : null,
            'attendance' => (string)$r['attendance'],
        ];
    }

    /**
     * @param array<string,mixed> $r
     * @return array<string,mixed>
     */
    private static function agendaRow(array $r): array
    {
        return [
            'id' => (int)$r['id'],
            'sortOrder' => (int)$r['sort_order'],
            'topic' => (string)$r['topic'],
            'description' => $r['description'] !== null ? (string)$r['description'] : null,
            'status' => (string)$r['status'],
            'presenterUserId' => $r['presenter_user_id'] !== null ? (int)$r['presenter_user_id'] : null,
            'presenterLabel' => $r['presenter_label'] !== null ? (string)$r['presenter_label'] : null,
        ];
    }

    /**
     * @param array<string,mixed> $r
     * @return array<string,mixed>
     */
    private static function noteRow(array $r): array
    {
        return [
            'id' => (int)$r['id'],
            'visibility' => (string)$r['visibility'],
            'content' => (string)$r['content'],
            'authorUserId' => $r['author_user_id'] !== null ? (int)$r['author_user_id'] : null,
            'authorLabel' => $r['author_label'] !== null ? (string)$r['author_label'] : null,
            'version' => (int)$r['version'],
            'createdAt' => self::toIsoUtc($r['created_at']) ?? (string)$r['created_at'],
            'updatedAt' => self::toIsoUtc($r['updated_at']) ?? (string)$r['updated_at'],
        ];
    }

    /**
     * @param array<string,mixed> $r
     * @return array<string,mixed>
     */
    private static function decisionRow(array $r): array
    {
        return [
            'id' => (int)$r['id'],
            'decisionText' => (string)$r['decision_text'],
            'decisionDate' => (string)$r['decision_date'],
            'rationale' => $r['rationale'] !== null ? (string)$r['rationale'] : null,
            'recordedBy' => $r['recorded_by'] !== null ? (int)$r['recorded_by'] : null,
            'recordedByLabel' => $r['recorded_by_label'] !== null ? (string)$r['recorded_by_label'] : null,
            'version' => (int)$r['version'],
            'createdAt' => self::toIsoUtc($r['created_at']) ?? (string)$r['created_at'],
        ];
    }

    /**
     * @param array<string,mixed> $r
     * @return array<string,mixed>
     */
    private static function linkRow(array $r): array
    {
        return [
            'id' => (int)$r['id'],
            'entityType' => (string)$r['entity_type'],
            'entityId' => (int)$r['entity_id'],
            'relationship' => (string)$r['relationship'],
            'label' => $r['label'] !== null ? (string)$r['label'] : null,
        ];
    }

    /**
     * @param array<string,mixed> $r
     * @return array<string,mixed>
     */
    private static function activityRow(array $r): array
    {
        $payload = $r['payload'] ?? null;
        if (is_string($payload)) {
            $payload = json_decode($payload, true);
        }
        return [
            'id' => (int)$r['id'],
            'actorUserId' => $r['actor_user_id'] !== null ? (int)$r['actor_user_id'] : null,
            'actorLabel' => $r['actor_label'] !== null ? (string)$r['actor_label'] : null,
            'action' => (string)$r['action'],
            'detail' => $r['detail'] !== null ? (string)$r['detail'] : null,
            'payload' => $payload,
            'createdAt' => self::toIsoUtc($r['created_at']) ?? (string)$r['created_at'],
        ];
    }

    private static function toIsoUtc(?string $value): ?string
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
