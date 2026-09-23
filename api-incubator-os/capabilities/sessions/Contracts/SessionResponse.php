<?php
declare(strict_types=1);

/**
 * Canonical Session DTO returned by queries.
 *
 * SCHEDULE: there are deliberately no schedule fields on the Session itself.
 * Scheduled date/time comes from the linked calendar event (rule: rescheduling
 * happens through the calendar). `event` is a compact projection of it.
 */
final class SessionResponse implements JsonSerializable
{
    /**
     * @param array<int,array<string,mixed>> $participants
     * @param array<int,array<string,mixed>> $agenda
     * @param array<int,array<string,mixed>> $notes
     * @param array<int,array<string,mixed>> $decisions
     * @param array<int,array<string,mixed>> $links
     * @param array<int,array<string,mixed>> $activity
     */
    public function __construct(
        public readonly int $id,
        public readonly int $companyId,
        public readonly ?string $companyName,
        public readonly ?int $calendarEventId,
        public readonly ?array $event,
        public readonly string $sessionType,
        public readonly string $subject,
        public readonly ?string $purpose,
        public readonly string $status,
        public readonly ?string $preparationSummary,
        public readonly ?string $closingSummary,
        public readonly ?string $cancellationReason,
        public readonly ?int $facilitatorUserId,
        public readonly ?string $facilitatorLabel,
        public readonly int $version,
        public readonly ?string $startedAt,
        public readonly ?string $completedAt,
        public readonly ?string $cancelledAt,
        public readonly ?string $cancelledByLabel,
        public readonly int $createdBy,
        public readonly ?string $createdByName,
        public readonly array $participants,
        public readonly array $agenda,
        public readonly array $notes,
        public readonly array $decisions,
        public readonly array $links,
        public readonly array $activity,
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
            'purpose' => $this->purpose,
            'status' => $this->status,
            'preparationSummary' => $this->preparationSummary,
            'closingSummary' => $this->closingSummary,
            'cancellationReason' => $this->cancellationReason,
            'facilitatorUserId' => $this->facilitatorUserId,
            'facilitatorLabel' => $this->facilitatorLabel,
            'version' => $this->version,
            'startedAt' => $this->startedAt,
            'completedAt' => $this->completedAt,
            'cancelledAt' => $this->cancelledAt,
            'cancelledByLabel' => $this->cancelledByLabel,
            'createdBy' => $this->createdBy,
            'createdByName' => $this->createdByName,
            'participants' => $this->participants,
            'agenda' => $this->agenda,
            'notes' => $this->notes,
            'decisions' => $this->decisions,
            'links' => $this->links,
            'activity' => $this->activity,
            'createdAt' => $this->createdAt,
            'updatedAt' => $this->updatedAt,
        ];
    }
}
