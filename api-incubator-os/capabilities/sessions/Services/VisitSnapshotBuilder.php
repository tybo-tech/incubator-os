<?php
declare(strict_types=1);

/**
 * Assembles the immutable `snapshot_json` for an issued visit report.
 *
 * The snapshot is the B-BBEE audit record: it captures the report, the Session,
 * the linked calendar event (schedule/location), the company profile, the
 * linked actions (Targets / tasks) and the sign-offs EXACTLY as they were at
 * issue time. Later company or task edits never rewrite it.
 *
 * INCUBATOR NOTES ARE NEVER INCLUDED. This builder never reads `session_notes`
 * at all, so an `incubator`-visibility note cannot leak into a snapshot or an
 * export even by accident. Shared notes are also intentionally excluded — the
 * report has its own structured sections.
 *
 * Phase 4 finalises the exact shape and documents it; this builder establishes
 * the frozen structure now so issuing is safe.
 */
final class VisitSnapshotBuilder
{
    public function __construct(private VisitReportRepository $repo) {}

    /**
     * @param array<string,mixed> $reportRow
     * @param array<string,mixed> $sessionRow
     * @param array<string,mixed>|null $eventRow
     * @param array<string,mixed> $actor {id:int, name:?string}
     * @param int $versionNo the version being issued (the snapshot's own number)
     * @param array<string,mixed>|null $companyRow the company profile captured at issue time
     * @return array<string,mixed>
     */
    public function build(
        array $reportRow,
        array $sessionRow,
        ?array $eventRow,
        array $actor,
        int $versionNo,
        ?array $companyRow = null,
    ): array {
        $reportId = (int)$reportRow['id'];
        $sessionId = (int)$reportRow['session_id'];
        $companyId = (int)$reportRow['company_id'];

        $company = $companyRow ?? $this->repo->companyProfile($companyId);
        $enrolment = ($reportRow['categories_item_id'] ?? null) !== null
            ? $this->repo->enrolment((int)$reportRow['categories_item_id'])
            : null;
        $followUpSession = ($reportRow['follow_up_session_id'] ?? null) !== null
            ? $this->repo->followUpSession((int)$reportRow['follow_up_session_id'])
            : null;

        return [
            'snapshotFormat' => 1,
            'generatedAt' => gmdate('Y-m-d\TH:i:s\Z'),
            'generatedBy' => [
                'id' => (int)($actor['id'] ?? 0),
                'name' => $actor['name'] ?? null,
            ],
            'header' => [
                'reportId' => $reportId,
                'reportVersion' => $versionNo,
                'visitKind' => (string)$reportRow['visit_kind'],
                'actualVisitDate' => $reportRow['actual_visit_date'] !== null ? (string)$reportRow['actual_visit_date'] : null,
                'actualLocation' => $reportRow['actual_location'] !== null ? (string)$reportRow['actual_location'] : null,
                'operatingStatus' => $reportRow['operating_status'] !== null ? (string)$reportRow['operating_status'] : null,
                'enrolment' => $enrolment !== null ? [
                    'categoriesItemId' => (int)$enrolment['id'],
                    'cohortName' => $enrolment['cohort_name'] !== null ? (string)$enrolment['cohort_name'] : null,
                    'programName' => $enrolment['program_name'] !== null ? (string)$enrolment['program_name'] : null,
                ] : null,
            ],
            'session' => [
                'id' => $sessionId,
                'companyId' => $companyId,
                'sessionType' => (string)$sessionRow['session_type'],
                'subject' => (string)$sessionRow['subject'],
                'purpose' => $sessionRow['purpose'] !== null ? (string)$sessionRow['purpose'] : null,
                'status' => (string)$sessionRow['status'],
                'preparationSummary' => $sessionRow['preparation_summary'] !== null ? (string)$sessionRow['preparation_summary'] : null,
                'closingSummary' => $sessionRow['closing_summary'] !== null ? (string)$sessionRow['closing_summary'] : null,
                'facilitatorLabel' => $sessionRow['facilitator_label'] !== null ? (string)$sessionRow['facilitator_label'] : null,
                'completedAt' => $this->iso($sessionRow['completed_at'] ?? null),
            ],
            'schedule' => $this->schedule($eventRow),
            'company' => $company !== null ? [
                'id' => (int)$company['id'],
                'name' => (string)$company['name'],
                'tradingName' => $company['trading_name'] !== null ? (string)$company['trading_name'] : null,
                'registrationNo' => $company['registration_no'] !== null ? (string)$company['registration_no'] : null,
                'description' => $company['description'] !== null ? (string)$company['description'] : null,
                'serviceOffering' => $company['service_offering'] !== null ? (string)$company['service_offering'] : null,
                'bbbeeLevel' => $company['bbbee_level'] !== null ? (string)$company['bbbee_level'] : null,
                'city' => $company['city'] !== null ? (string)$company['city'] : null,
                'suburb' => $company['suburb'] !== null ? (string)$company['suburb'] : null,
                'contactPerson' => $company['contact_person'] !== null ? (string)$company['contact_person'] : null,
            ] : null,
            'discussions' => $this->section($reportId, VisitSection::DISCUSSION),
            'challenges' => $this->section($reportId, VisitSection::CHALLENGE),
            'alternatives' => $this->section($reportId, VisitSection::ALTERNATIVE),
            'recommendations' => $this->section($reportId, VisitSection::RECOMMENDATION),
            'actions' => $this->repo->linkedActions($sessionId),
            'followUps' => [
                'nextVisitTargetDate' => $reportRow['next_visit_target_date'] !== null ? (string)$reportRow['next_visit_target_date'] : null,
                'method' => $reportRow['follow_up_method'] !== null ? (string)$reportRow['follow_up_method'] : null,
                'sessionId' => $followUpSession !== null ? (int)$followUpSession['id'] : null,
                'sessionSubject' => $followUpSession !== null ? (string)$followUpSession['subject'] : null,
            ],
            'signoffs' => array_map(
                static fn(array $s): array => [
                    'role' => (string)$s['role'],
                    'name' => (string)$s['name'],
                    'designation' => $s['designation'] !== null ? (string)$s['designation'] : null,
                    'signedAt' => isset($s['signed_at']) && $s['signed_at'] !== null ? (string)$s['signed_at'] : null,
                    'signatureRef' => $s['signature_ref'] !== null ? (string)$s['signature_ref'] : null,
                ],
                $this->repo->listSignoffs($reportId)
            ),
            // Funding is DELIBERATELY absent: it is a read-time projection and is
            // never persisted on the report (or its snapshot).
        ];
    }

    /**
     * @param array<string,mixed>|null $eventRow
     * @return array<string,mixed>|null
     */
    private function schedule(?array $eventRow): ?array
    {
        if (!$eventRow) {
            return null;
        }
        return [
            'calendarEventId' => (int)$eventRow['id'],
            'title' => (string)$eventRow['title'],
            'allDay' => (bool)$eventRow['all_day'],
            'timezone' => $eventRow['timezone'] !== null ? (string)$eventRow['timezone'] : null,
            'location' => $eventRow['location'] !== null ? (string)$eventRow['location'] : null,
            'startDate' => $eventRow['start_date'] !== null ? (string)$eventRow['start_date'] : null,
            'endDate' => $eventRow['end_date'] !== null ? (string)$eventRow['end_date'] : null,
            'startAt' => $this->iso($eventRow['start_at'] ?? null),
            'endAt' => $this->iso($eventRow['end_at'] ?? null),
        ];
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    private function section(int $reportId, string $section): array
    {
        return array_map(
            static fn(array $i): array => [
                'id' => (int)$i['id'],
                'sortOrder' => (int)$i['sort_order'],
                'title' => (string)$i['title'],
                'detail' => $i['detail'] !== null ? (string)$i['detail'] : null,
                'impact' => $i['impact'] !== null ? (string)$i['impact'] : null,
            ],
            $this->repo->listItems($reportId, $section)
        );
    }

    private function iso(?string $value): ?string
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
