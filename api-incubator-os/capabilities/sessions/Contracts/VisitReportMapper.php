<?php
declare(strict_types=1);

/**
 * Maps visit-report rows (+ nested items/signoffs/actions) to the API DTOs.
 *
 * Kept separate from SessionMapper so the Session contract is not widened by a
 * sub-resource. The two share nothing except the event projection helper.
 */
final class VisitReportMapper
{
    /**
     * @param array<string,mixed> $reportRow
     * @param array<string,mixed> $sessionRow
     * @param array<string,mixed>|null $eventRow
     * @param array<int,array<string,mixed>> $items
     * @param array<int,array<string,mixed>> $signoffs
     * @param array<int,array<string,mixed>> $actions
     * @param array<string,mixed>|null $enrolment
     * @param array<string,mixed>|null $followUp
     * @param array<string,mixed> $labels {issuedByName, acknowledgedByName}
     */
    public static function toReport(
        array $reportRow,
        array $sessionRow,
        ?array $eventRow,
        array $items,
        array $signoffs,
        array $actions,
        ?array $enrolment,
        ?array $followUp,
        array $labels,
    ): VisitReportResponse {
        $sections = [
            VisitSection::DISCUSSION => [],
            VisitSection::CHALLENGE => [],
            VisitSection::ALTERNATIVE => [],
            VisitSection::RECOMMENDATION => [],
        ];
        foreach ($items as $item) {
            $section = (string)$item['section'];
            if (!isset($sections[$section])) {
                continue;
            }
            $sections[$section][] = [
                'id' => (int)$item['id'],
                'sortOrder' => (int)$item['sort_order'],
                'title' => (string)$item['title'],
                'detail' => $item['detail'] !== null ? (string)$item['detail'] : null,
                'impact' => $item['impact'] !== null ? (string)$item['impact'] : null,
            ];
        }

        return new VisitReportResponse(
            id: (int)$reportRow['id'],
            sessionId: (int)$reportRow['session_id'],
            companyId: (int)$reportRow['company_id'],
            companyName: $sessionRow['company_name'] ?? null,
            calendarEventId: $sessionRow['calendar_event_id'] !== null ? (int)$sessionRow['calendar_event_id'] : null,
            event: SessionMapper::eventProjection($eventRow),
            sessionStatus: (string)$sessionRow['status'],
            facilitatorUserId: $sessionRow['facilitator_user_id'] !== null ? (int)$sessionRow['facilitator_user_id'] : null,
            facilitatorLabel: $sessionRow['facilitator_label'] !== null ? (string)$sessionRow['facilitator_label'] : null,
            categoriesItemId: $reportRow['categories_item_id'] !== null ? (int)$reportRow['categories_item_id'] : null,
            enrolment: $enrolment !== null ? [
                'id' => (int)$enrolment['id'],
                'cohortId' => (int)$enrolment['cohort_id'],
                'programId' => (int)$enrolment['program_id'],
                'status' => (string)$enrolment['status'],
                'cohortName' => $enrolment['cohort_name'] !== null ? (string)$enrolment['cohort_name'] : null,
                'programName' => $enrolment['program_name'] !== null ? (string)$enrolment['program_name'] : null,
            ] : null,
            visitKind: (string)$reportRow['visit_kind'],
            actualVisitDate: $reportRow['actual_visit_date'] !== null ? (string)$reportRow['actual_visit_date'] : null,
            actualLocation: $reportRow['actual_location'] !== null ? (string)$reportRow['actual_location'] : null,
            operatingStatus: $reportRow['operating_status'] !== null ? (string)$reportRow['operating_status'] : null,
            status: (string)$reportRow['status'],
            currentVersion: (int)$reportRow['current_version'],
            nextVisitTargetDate: $reportRow['next_visit_target_date'] !== null ? (string)$reportRow['next_visit_target_date'] : null,
            followUpMethod: $reportRow['follow_up_method'] !== null ? (string)$reportRow['follow_up_method'] : null,
            followUpSessionId: $reportRow['follow_up_session_id'] !== null ? (int)$reportRow['follow_up_session_id'] : null,
            issuedAt: self::iso($reportRow['issued_at'] ?? null),
            issuedByName: $labels['issuedByName'] ?? null,
            acknowledgedAt: self::iso($reportRow['acknowledged_at'] ?? null),
            acknowledgedByName: $labels['acknowledgedByName'] ?? null,
            version: (int)$reportRow['version'],
            sections: $sections,
            signoffs: array_map([self::class, 'signoffRow'], $signoffs),
            actions: $actions,
            followUp: $followUp !== null ? [
                'sessionId' => (int)$followUp['id'],
                'subject' => (string)$followUp['subject'],
                'status' => (string)$followUp['status'],
            ] : null,
            createdAt: self::iso($reportRow['created_at'] ?? null),
            updatedAt: self::iso($reportRow['updated_at'] ?? null),
        );
    }

    /**
     * The empty draft shape returned when a site_visit Session has no report row
     * yet, so the editor can render without a second round trip.
     *
     * @param array<string,mixed> $sessionRow
     * @param array<string,mixed>|null $eventRow
     */
    public static function emptyDraft(array $sessionRow, ?array $eventRow): VisitReportResponse
    {
        $sections = [
            VisitSection::DISCUSSION => [],
            VisitSection::CHALLENGE => [],
            VisitSection::ALTERNATIVE => [],
            VisitSection::RECOMMENDATION => [],
        ];
        return new VisitReportResponse(
            id: null,
            sessionId: (int)$sessionRow['id'],
            companyId: (int)$sessionRow['company_id'],
            companyName: $sessionRow['company_name'] ?? null,
            calendarEventId: $sessionRow['calendar_event_id'] !== null ? (int)$sessionRow['calendar_event_id'] : null,
            event: SessionMapper::eventProjection($eventRow),
            sessionStatus: (string)$sessionRow['status'],
            facilitatorUserId: $sessionRow['facilitator_user_id'] !== null ? (int)$sessionRow['facilitator_user_id'] : null,
            facilitatorLabel: $sessionRow['facilitator_label'] !== null ? (string)$sessionRow['facilitator_label'] : null,
            categoriesItemId: null,
            enrolment: null,
            visitKind: VisitKind::SCHEDULED,
            actualVisitDate: null,
            actualLocation: null,
            operatingStatus: null,
            status: VisitReportStatus::DRAFT,
            currentVersion: 0,
            nextVisitTargetDate: null,
            followUpMethod: null,
            followUpSessionId: null,
            issuedAt: null,
            issuedByName: null,
            acknowledgedAt: null,
            acknowledgedByName: null,
            version: 0,
            sections: $sections,
            signoffs: [],
            actions: [],
            followUp: null,
            createdAt: null,
            updatedAt: null,
        );
    }

    /**
     * @param array<string,mixed> $row
     * @param array<string,mixed>|null $eventRow
     * @return array<string,mixed>
     */
    public static function toSummaryArray(array $row, ?array $eventRow): array
    {
        return (new VisitReportSummaryResponse(
            sessionId: (int)$row['session_id'],
            reportId: $row['report_id'] !== null ? (int)$row['report_id'] : null,
            companyId: (int)$row['company_id'],
            companyName: $row['company_name'] ?? null,
            calendarEventId: $row['calendar_event_id'] !== null ? (int)$row['calendar_event_id'] : null,
            event: SessionMapper::eventProjection($eventRow),
            sessionStatus: (string)$row['session_status'],
            subject: (string)$row['subject'],
            visitKind: $row['visit_kind'] !== null ? (string)$row['visit_kind'] : VisitKind::SCHEDULED,
            actualVisitDate: $row['actual_visit_date'] !== null ? (string)$row['actual_visit_date'] : null,
            actualLocation: $row['actual_location'] !== null ? (string)$row['actual_location'] : null,
            reportStatus: $row['report_status'] !== null ? (string)$row['report_status'] : null,
            currentVersion: (int)($row['current_version'] ?? 0),
            facilitatorLabel: $row['facilitator_label'] !== null ? (string)$row['facilitator_label'] : null,
            issuedAt: self::iso($row['issued_at'] ?? null),
            createdAt: self::iso($row['session_created_at'] ?? null),
            updatedAt: self::iso($row['session_updated_at'] ?? null),
        ))->jsonSerialize();
    }

    /**
     * @param array<string,mixed> $r
     * @return array<string,mixed>
     */
    private static function signoffRow(array $r): array
    {
        return [
            'id' => (int)$r['id'],
            'role' => (string)$r['role'],
            'name' => (string)$r['name'],
            'designation' => $r['designation'] !== null ? (string)$r['designation'] : null,
            'reportVersionNo' => $r['report_version_no'] !== null ? (int)$r['report_version_no'] : null,
            'signedAt' => self::iso($r['signed_at'] ?? null),
            'signatureRef' => $r['signature_ref'] !== null ? (string)$r['signature_ref'] : null,
        ];
    }

    private static function iso(?string $value): ?string
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
