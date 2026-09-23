<?php
declare(strict_types=1);

/**
 * Request DTO for creating/updating a Session.
 *
 * NOTE: `companyId` is a *target scope*, not the actor's identity. Tenant and
 * actor are always derived server-side from the authenticated session and are
 * never accepted from the browser.
 *
 * `calendarEventId` optionally attaches an EXISTING eligible company meeting
 * event. When it is null, `create` builds a new company calendar event in the
 * same transaction (using the `event*` fields below).
 */
final class SessionRequest
{
    public function __construct(
        public readonly ?int $companyId,
        public readonly ?int $calendarEventId = null,
        public readonly string $sessionType = 'other',
        public readonly string $subject = '',
        public readonly ?string $purpose = null,
        public readonly ?string $preparationSummary = null,
        public readonly ?string $closingSummary = null,
        public readonly ?int $facilitatorUserId = null,
        public readonly ?string $facilitatorLabel = null,
        // Fields used ONLY when create() must build the calendar event.
        public readonly string $eventTitle = '',
        public readonly ?string $eventDescription = null,
        public readonly ?string $eventLocation = null,
        public readonly bool $allDay = false,
        public readonly ?string $timezone = null,
        public readonly ?string $startDate = null,
        public readonly ?string $endDate = null,
        public readonly ?string $startAt = null,
        public readonly ?string $endAt = null,
        public readonly ?int $expectedVersion = null,
    ) {}

    /**
     * @param array<string,mixed> $input
     */
    public static function fromArray(array $input): self
    {
        $bool = static function ($v): bool {
            if (is_bool($v)) return $v;
            if (is_string($v)) return in_array(strtolower($v), ['1', 'true', 'yes'], true);
            return (bool)$v;
        };
        $str = static function ($v): ?string {
            if ($v === null) return null;
            $t = trim((string)$v);
            return $t === '' ? null : $t;
        };
        $int = static function ($v): ?int {
            if ($v === null || $v === '') return null;
            return (int)$v;
        };

        return new self(
            companyId: array_key_exists('companyId', $input) ? $int($input['companyId']) : $int($input['company_id'] ?? null),
            calendarEventId: $int($input['calendarEventId'] ?? $input['calendar_event_id'] ?? null),
            sessionType: (string)($input['sessionType'] ?? $input['session_type'] ?? 'other'),
            subject: trim((string)($input['subject'] ?? '')),
            purpose: $str($input['purpose'] ?? null),
            preparationSummary: $str($input['preparationSummary'] ?? $input['preparation_summary'] ?? null),
            closingSummary: $str($input['closingSummary'] ?? $input['closing_summary'] ?? null),
            facilitatorUserId: $int($input['facilitatorUserId'] ?? $input['facilitator_user_id'] ?? null),
            facilitatorLabel: $str($input['facilitatorLabel'] ?? $input['facilitator_label'] ?? null),
            eventTitle: trim((string)($input['eventTitle'] ?? $input['event_title'] ?? $input['subject'] ?? '')),
            eventDescription: $str($input['eventDescription'] ?? $input['event_description'] ?? null),
            eventLocation: $str($input['eventLocation'] ?? $input['event_location'] ?? null),
            allDay: $bool($input['allDay'] ?? $input['all_day'] ?? false),
            timezone: $str($input['timezone'] ?? null),
            startDate: $str($input['startDate'] ?? $input['start_date'] ?? null),
            endDate: $str($input['endDate'] ?? $input['end_date'] ?? null),
            startAt: $str($input['startAt'] ?? $input['start_at'] ?? null),
            endAt: $str($input['endAt'] ?? $input['end_at'] ?? null),
            expectedVersion: $int($input['expectedVersion'] ?? $input['version'] ?? null),
        );
    }
}
