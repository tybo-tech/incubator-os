<?php
declare(strict_types=1);

/**
 * Compact Session shape for list/upcoming screens — no nested collections.
 *
 * The `event` projection carries the schedule so a list can render date/time
 * without reading the Session (which stores no schedule itself).
 */
final class SessionSummary implements JsonSerializable
{
    /**
     * @param array<string,mixed>|null $event
     */
    public function __construct(
        public readonly int $id,
        public readonly int $companyId,
        public readonly ?string $companyName,
        public readonly ?int $calendarEventId,
        public readonly ?array $event,
        public readonly string $sessionType,
        public readonly string $subject,
        public readonly string $status,
        public readonly ?string $facilitatorLabel,
        public readonly int $participantCount,
        public readonly int $agendaCount,
        public readonly int $decisionCount,
        public readonly int $linkCount,
        public readonly int $version,
        public readonly ?string $completedAt,
        public readonly string $createdAt,
        public readonly string $updatedAt,
    ) {}

    public function jsonSerialize(): mixed
    {
        return [
            'id' => $this->id,
            'companyId' => $this->companyId,
            'companyName' => $this->companyName,
            'calendarEventId' => $this->calendarEventId,
            'event' => $this->event,
            'sessionType' => $this->sessionType,
            'subject' => $this->subject,
            'status' => $this->status,
            'facilitatorLabel' => $this->facilitatorLabel,
            'participantCount' => $this->participantCount,
            'agendaCount' => $this->agendaCount,
            'decisionCount' => $this->decisionCount,
            'linkCount' => $this->linkCount,
            'version' => $this->version,
            'completedAt' => $this->completedAt,
            'createdAt' => $this->createdAt,
            'updatedAt' => $this->updatedAt,
        ];
    }
}
