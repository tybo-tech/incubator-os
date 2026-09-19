<?php
declare(strict_types=1);

/**
 * Maps a `calendar_events` row (+ its links) to the canonical DTO.
 *
 * UTC handling: `start_at` / `end_at` are stored in UTC, so they are emitted as
 * ISO-8601 with a `Z` suffix. All-day `start_date` / `end_date` are plain
 * `YYYY-MM-DD` and are never shifted.
 */
final class CalendarEventMapper
{
    /**
     * @param array<string,mixed> $row
     * @param array<int,array<string,mixed>> $links
     */
    public static function toResponse(array $row, array $links = []): CalendarEventResponse
    {
        $linkRefs = [];
        foreach ($links as $link) {
            $linkRefs[] = new CalendarEventLinkRef(
                entityType: (string)$link['entity_type'],
                entityId: (int)$link['entity_id'],
                label: $link['label'] !== null ? (string)$link['label'] : null,
            );
        }

        return new CalendarEventResponse(
            id: (int)$row['id'],
            companyId: $row['company_id'] !== null ? (int)$row['company_id'] : null,
            companyName: $row['company_name'] ?? null,
            title: (string)$row['title'],
            description: $row['description'] !== null ? (string)$row['description'] : null,
            category: (string)$row['category'],
            status: (string)$row['status'],
            allDay: (bool)$row['all_day'],
            timezone: $row['timezone'] !== null ? (string)$row['timezone'] : null,
            location: $row['location'] !== null ? (string)$row['location'] : null,
            startDate: $row['start_date'] !== null ? (string)$row['start_date'] : null,
            endDate: $row['end_date'] !== null ? (string)$row['end_date'] : null,
            startAt: self::toIsoUtc($row['start_at'] ?? null),
            endAt: self::toIsoUtc($row['end_at'] ?? null),
            assigneeLabel: $row['assignee_label'] !== null ? (string)$row['assignee_label'] : null,
            assigneeUserId: $row['assignee_user_id'] !== null ? (int)$row['assignee_user_id'] : null,
            createdBy: (int)$row['created_by'],
            createdByName: $row['created_by_name'] ?? null,
            version: (int)$row['version'],
            links: $linkRefs,
            createdAt: self::toIsoUtc($row['created_at']) ?? (string)$row['created_at'],
            updatedAt: self::toIsoUtc($row['updated_at']) ?? (string)$row['updated_at'],
        );
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
