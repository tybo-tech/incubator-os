<?php
declare(strict_types=1);

/**
 * Request DTO for creating or updating a calendar event.
 *
 * NOTE: `companyId` is a *target scope*, not the actor's identity. Tenant and
 * actor are always derived server-side from the authenticated session and are
 * never accepted from the browser.
 */
final class CalendarEventRequest
{
    /**
     * @param array<int, array{entityType:string, entityId:int, label?:?string}> $links
     */
    public function __construct(
        public readonly ?int $companyId,
        public readonly string $title,
        public readonly ?string $description = null,
        public readonly string $category = 'other',
        public readonly string $status = 'scheduled',
        public readonly bool $allDay = false,
        public readonly ?string $timezone = null,
        public readonly ?string $location = null,
        public readonly ?string $startDate = null,
        public readonly ?string $endDate = null,
        public readonly ?string $startAt = null,
        public readonly ?string $endAt = null,
        public readonly ?int $assigneeUserId = null,
        public readonly ?string $assigneeLabel = null,
        public readonly array $links = [],
        public readonly ?string $clientToken = null,
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

        $links = [];
        foreach (($input['links'] ?? []) as $link) {
            if (!is_array($link)) continue;
            $links[] = [
                'entityType' => (string)($link['entityType'] ?? $link['entity_type'] ?? ''),
                'entityId' => (int)($link['entityId'] ?? $link['entity_id'] ?? 0),
                'label' => $str($link['label'] ?? null),
            ];
        }

        return new self(
            companyId: array_key_exists('companyId', $input) ? $int($input['companyId']) : $int($input['company_id'] ?? null),
            title: trim((string)($input['title'] ?? '')),
            description: $str($input['description'] ?? null),
            category: (string)($input['category'] ?? 'other'),
            status: (string)($input['status'] ?? 'scheduled'),
            allDay: $bool($input['allDay'] ?? $input['all_day'] ?? false),
            timezone: $str($input['timezone'] ?? null),
            location: $str($input['location'] ?? null),
            startDate: $str($input['startDate'] ?? $input['start_date'] ?? null),
            endDate: $str($input['endDate'] ?? $input['end_date'] ?? null),
            startAt: $str($input['startAt'] ?? $input['start_at'] ?? null),
            endAt: $str($input['endAt'] ?? $input['end_at'] ?? null),
            assigneeUserId: $int($input['assigneeUserId'] ?? $input['assignee_user_id'] ?? null),
            assigneeLabel: $str($input['assigneeLabel'] ?? $input['assignee_label'] ?? null),
            links: $links,
            clientToken: $str($input['clientToken'] ?? $input['client_token'] ?? null),
            expectedVersion: $int($input['expectedVersion'] ?? $input['version'] ?? null),
        );
    }
}
