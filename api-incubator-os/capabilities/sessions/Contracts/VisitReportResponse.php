<?php
declare(strict_types=1);

/**
 * Full site-visit report DTO returned by `queries/visit-report.php`.
 *
 * SCHEDULE: the visit's scheduled date/time is NOT on the report — it comes from
 * the linked calendar event (`event`). `actualVisitDate` is the CONFIRMED
 * occurrence date and is a separate fact.
 *
 * FUNDING: no funding value is stored here. The funding position is derived on
 * read by VisitContextService and returned by `queries/visit-context.php`.
 */
final class VisitReportResponse implements JsonSerializable
{
    /**
     * @param array<string,mixed>|null $event
     * @param array<string,mixed>|null $enrolment
     * @param array<int,array<string,mixed>> $sections keyed shapes per section
     * @param array<int,array<string,mixed>> $signoffs
     * @param array<int,array<string,mixed>> $actions
     * @param array<string,mixed>|null $followUp
     */
    public function __construct(
        public readonly ?int $id,
        public readonly int $sessionId,
        public readonly int $companyId,
        public readonly ?string $companyName,
        public readonly ?int $calendarEventId,
        public readonly ?array $event,
        public readonly string $sessionStatus,
        public readonly ?int $facilitatorUserId,
        public readonly ?string $facilitatorLabel,
        public readonly ?int $categoriesItemId,
        public readonly ?array $enrolment,
        public readonly string $visitKind,
        public readonly ?string $actualVisitDate,
        public readonly ?string $actualLocation,
        public readonly ?string $operatingStatus,
        public readonly string $status,
        public readonly int $currentVersion,
        public readonly ?string $nextVisitTargetDate,
        public readonly ?string $followUpMethod,
        public readonly ?int $followUpSessionId,
        public readonly ?string $issuedAt,
        public readonly ?string $issuedByName,
        public readonly ?string $acknowledgedAt,
        public readonly ?string $acknowledgedByName,
        public readonly int $version,
        public readonly array $sections,
        public readonly array $signoffs,
        public readonly array $actions,
        public readonly ?array $followUp,
        public readonly ?string $createdAt,
        public readonly ?string $updatedAt,
    ) {}

    public function jsonSerialize(): mixed
    {
        return [
            'id' => $this->id,
            'sessionId' => $this->sessionId,
            'companyId' => $this->companyId,
            'companyName' => $this->companyName,
            'calendarEventId' => $this->calendarEventId,
            'event' => $this->event,
            'sessionStatus' => $this->sessionStatus,
            'facilitatorUserId' => $this->facilitatorUserId,
            'facilitatorLabel' => $this->facilitatorLabel,
            'categoriesItemId' => $this->categoriesItemId,
            'enrolment' => $this->enrolment,
            'visitKind' => $this->visitKind,
            'actualVisitDate' => $this->actualVisitDate,
            'actualLocation' => $this->actualLocation,
            'operatingStatus' => $this->operatingStatus,
            'status' => $this->status,
            'currentVersion' => $this->currentVersion,
            'nextVisitTargetDate' => $this->nextVisitTargetDate,
            'followUpMethod' => $this->followUpMethod,
            'followUpSessionId' => $this->followUpSessionId,
            'issuedAt' => $this->issuedAt,
            'issuedByName' => $this->issuedByName,
            'acknowledgedAt' => $this->acknowledgedAt,
            'acknowledgedByName' => $this->acknowledgedByName,
            'version' => $this->version,
            'sections' => $this->sections,
            'signoffs' => $this->signoffs,
            'actions' => $this->actions,
            'followUp' => $this->followUp,
            'createdAt' => $this->createdAt,
            'updatedAt' => $this->updatedAt,
        ];
    }
}
