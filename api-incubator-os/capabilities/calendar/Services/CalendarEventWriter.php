<?php
declare(strict_types=1);

/**
 * Shared mapping from a validated request to the persisted row shape, plus
 * cross-company link validation. Used by both create and update so the two
 * never drift.
 */
final class CalendarEventWriter
{
    public function __construct(
        private CalendarLinkResolver $resolver,
        private CalendarValidator $validator,
    ) {}

    /**
     * Normalise a validated request into repository bindings.
     *
     * - all-day: stores `start_date`/`end_date`, clears the timed columns.
     * - timed:   converts `startAt`/`endAt` to UTC and stores them.
     *
     * @return array<string,mixed>
     */
    public function toRow(CalendarEventRequest $input, int $tenantId, int $actorId): array
    {
        $startDate = $endDate = $startAt = $endAt = null;
        if ($input->allDay) {
            $startDate = $input->startDate;
            $endDate = $input->endDate ?? $input->startDate; // inclusive single-day default
        } else {
            $startAt = $this->validator->parseUtc($input->startAt)?->format('Y-m-d H:i:s');
            $endAt = $this->validator->parseUtc($input->endAt)?->format('Y-m-d H:i:s');
        }

        return [
            'tenant_id' => $tenantId,
            'company_id' => $input->companyId,
            'created_by' => $actorId,
            'updated_by' => $actorId,
            'assignee_user_id' => $input->assigneeUserId,
            'assignee_label' => $input->assigneeLabel,
            'title' => $input->title,
            'description' => $input->description,
            'category' => $input->category,
            'status' => $input->status,
            'all_day' => $input->allDay,
            'timezone' => $input->allDay ? null : $input->timezone,
            'location' => $input->location,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'start_at' => $startAt,
            'end_at' => $endAt,
            'client_token' => $input->clientToken,
        ];
    }

    /**
     * Verify every link resolves to a record in the event's company, and fill in
     * a label when the caller did not supply one.
     *
     * A system-wide event (company_id = NULL) cannot carry links — a link is
     * inherently company-owned, and allowing it would leak one company's records
     * into every other company's calendar.
     *
     * @return array<int,array{entityType:string, entityId:int, label:?string}>
     * @throws CalendarValidationException|CalendarNotFoundException|CalendarForbiddenException
     */
    public function validateLinks(CalendarEventRequest $input): array
    {
        if (!$input->links) {
            return [];
        }

        if ($input->companyId === null) {
            throw new CalendarValidationException('A system-wide event cannot be linked to a company record.');
        }

        $seen = [];
        $out = [];
        foreach ($input->links as $link) {
            $type = (string)$link['entityType'];
            $id = (int)$link['entityId'];
            $key = $type . ':' . $id;
            if (isset($seen[$key])) {
                continue; // ignore duplicate links in the same payload
            }
            $seen[$key] = true;

            $ownerCompany = $this->resolver->resolveCompanyId($type, $id);
            if ($ownerCompany !== $input->companyId) {
                throw new CalendarForbiddenException(
                    "Linked $type $id belongs to a different company."
                );
            }

            $label = $link['label'] ?? null;
            if ($label === null) {
                $label = $this->resolver->resolveLabel($type, $id);
            }

            $out[] = ['entityType' => $type, 'entityId' => $id, 'label' => $label];
        }
        return $out;
    }
}
