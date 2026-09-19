<?php
declare(strict_types=1);

/**
 * Canonical calendar-event DTO returned by every query/command.
 *
 * Naming is camelCase (capability convention), NOT the snake_case frontend
 * model. The Angular service maps this to its own `CalendarEvent` shape.
 *
 * Date/time fields:
 *  - all-day: `startDate` / `endDate` are `YYYY-MM-DD` (no timezone shifting).
 *  - timed:   `startAt` / `endAt` are ISO-8601 UTC; `timezone` holds the zone.
 */
final class CalendarEventResponse implements JsonSerializable
{
    /**
     * @param CalendarEventLinkRef[] $links
     */
    public function __construct(
        public readonly int $id,
        public readonly ?int $companyId,
        public readonly ?string $companyName,
        public readonly string $title,
        public readonly ?string $description,
        public readonly string $category,
        public readonly string $status,
        public readonly bool $allDay,
        public readonly ?string $timezone,
        public readonly ?string $location,
        public readonly ?string $startDate,
        public readonly ?string $endDate,
        public readonly ?string $startAt,
        public readonly ?string $endAt,
        public readonly ?string $assigneeLabel,
        public readonly ?int $assigneeUserId,
        public readonly int $createdBy,
        public readonly ?string $createdByName,
        public readonly int $version,
        public readonly array $links,
        public readonly string $createdAt,
        public readonly string $updatedAt,
    ) {}

    public function jsonSerialize(): mixed
    {
        return [
            'id' => $this->id,
            'companyId' => $this->companyId,
            'companyName' => $this->companyName,
            'title' => $this->title,
            'description' => $this->description,
            'category' => $this->category,
            'status' => $this->status,
            'allDay' => $this->allDay,
            'timezone' => $this->timezone,
            'location' => $this->location,
            'startDate' => $this->startDate,
            'endDate' => $this->endDate,
            'startAt' => $this->startAt,
            'endAt' => $this->endAt,
            'assigneeLabel' => $this->assigneeLabel,
            'assigneeUserId' => $this->assigneeUserId,
            'createdBy' => $this->createdBy,
            'createdByName' => $this->createdByName,
            'version' => $this->version,
            'links' => $this->links,
            'createdAt' => $this->createdAt,
            'updatedAt' => $this->updatedAt,
        ];
    }
}
