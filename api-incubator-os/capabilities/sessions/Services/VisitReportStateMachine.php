<?php
declare(strict_types=1);

/**
 * Visit-report lifecycle state machine — the single source of truth for
 * `draft -> issued -> acknowledged`.
 *
 * This is deliberately SEPARATE from the Session lifecycle:
 *   - Session completion is the precondition for ISSUE (a report is only issued
 *     for a COMPLETED Session), but issuing a report does NOT complete the
 *     Session and completing the Session does not issue the report.
 *   - A report never bypasses the frozen-Session rule: an issued report cannot
 *     be edited, and neither can the operational Session content it references.
 *
 * Illegal transitions throw SessionConflictException carrying a machine-readable
 * `VISIT_*` code, which SessionErrorResponder maps to 409.
 */
final class VisitReportStateMachine
{
    /** @var array<string,string[]> */
    private const ALLOWED = [
        VisitReportStatus::DRAFT => [VisitReportStatus::ISSUED],
        VisitReportStatus::ISSUED => [VisitReportStatus::ACKNOWLEDGED],
        VisitReportStatus::ACKNOWLEDGED => [],
    ];

    public static function canTransition(string $from, string $to): bool
    {
        return in_array($to, self::ALLOWED[$from] ?? [], true);
    }

    /**
     * @throws SessionConflictException
     */
    public static function assertTransition(string $from, string $to): void
    {
        if (!self::canTransition($from, $to)) {
            throw new SessionConflictException(
                'VISIT_INVALID_TRANSITION: Cannot move a visit report from ' . $from . ' to ' . $to . '.'
            );
        }
    }

    /**
     * Content may only change while the report is a draft. A re-issue is not
     * supported: once issued, the version is frozen and immutable.
     *
     * @throws SessionConflictException
     */
    public static function assertEditable(string $status): void
    {
        if ($status === VisitReportStatus::ISSUED) {
            throw new SessionConflictException(
                'VISIT_ALREADY_ISSUED: This report has been issued and is now read-only.'
            );
        }
        if ($status === VisitReportStatus::ACKNOWLEDGED) {
            throw new SessionConflictException(
                'VISIT_NOT_DRAFT: This report has been acknowledged and is now read-only.'
            );
        }
        if (!VisitReportStatus::isEditable($status)) {
            throw new SessionConflictException(
                'VISIT_NOT_DRAFT: This report is not a draft and cannot be changed.'
            );
        }
    }

    /**
     * Issue is only legal from a draft.
     *
     * @throws SessionConflictException
     */
    public static function assertIssuable(string $status): void
    {
        if ($status === VisitReportStatus::ISSUED || $status === VisitReportStatus::ACKNOWLEDGED) {
            throw new SessionConflictException(
                'VISIT_ALREADY_ISSUED: This report has already been issued.'
            );
        }
        self::assertTransition($status, VisitReportStatus::ISSUED);
    }

    /**
     * Acknowledgement is only legal from an issued report.
     *
     * @throws SessionConflictException
     */
    public static function assertAcknowledgeable(string $status): void
    {
        if ($status !== VisitReportStatus::ISSUED) {
            throw new SessionConflictException(
                'VISIT_NOT_ISSUED: Only an issued report can be acknowledged.'
            );
        }
    }
}
