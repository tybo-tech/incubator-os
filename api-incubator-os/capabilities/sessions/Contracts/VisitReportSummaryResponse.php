<?php
declare(strict_types=1);

/**
 * Compact site-visit shape for the company list screen — no nested collections.
 *
 * `reportStatus` is null when a `site_visit` Session has no report row yet, so
 * the list can distinguish "visit not yet documented" from "draft".
 */
final class VisitReportSummaryResponse implements JsonSerializable
{
    /**
     * @param array<string,mixed>|null $event
     */
    public function __construct(
        public readonly int $sessionId,
        public readonly ?int $reportId,
        public readonly int $companyId,
        public readonly ?string $companyName,
        public readonly ?int $calendarEventId,
        public readonly ?array $event,
        public readonly string $sessionStatus,
        public readonly string $subject,
        public readonly string $visitKind,
        public readonly ?string $actualVisitDate,
        public readonly ?string $actualLocation,
        public readonly ?string $reportStatus,
        public readonly int $currentVersion,
        public readonly ?string $facilitatorLabel,
        public readonly ?string $issuedAt,
        public readonly ?string $createdAt,
        public readonly ?string $updatedAt,
    ) {}

    public function jsonSerialize(): mixed
    {
        return [
            'sessionId' => $this->sessionId,
            'reportId' => $this->reportId,
            'companyId' => $this->companyId,
            'companyName' => $this->companyName,
            'calendarEventId' => $this->calendarEventId,
            'event' => $this->event,
            'sessionStatus' => $this->sessionStatus,
            'subject' => $this->subject,
            'visitKind' => $this->visitKind,
            'actualVisitDate' => $this->actualVisitDate,
            'actualLocation' => $this->actualLocation,
            'reportStatus' => $this->reportStatus,
            'currentVersion' => $this->currentVersion,
            'facilitatorLabel' => $this->facilitatorLabel,
            'issuedAt' => $this->issuedAt,
            'createdAt' => $this->createdAt,
            'updatedAt' => $this->updatedAt,
        ];
    }
}
