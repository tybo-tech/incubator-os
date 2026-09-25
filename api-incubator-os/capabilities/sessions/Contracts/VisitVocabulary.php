<?php
declare(strict_types=1);

/**
 * Controlled vocabularies for the site-visit report.
 *
 * Co-located with SessionVocabulary.php in the Sessions capability: a site visit
 * is a Session with a structured report, so the report vocabulary lives beside
 * the Session vocabulary rather than in a separate capability.
 */

/** What kind of visit this is. Independent of the Session lifecycle. */
final class VisitKind
{
    public const SCHEDULED = 'scheduled';
    public const AD_HOC = 'ad_hoc';
    public const FOLLOW_UP = 'follow_up';

    public const ALL = [self::SCHEDULED, self::AD_HOC, self::FOLLOW_UP];

    public static function isValid(string $value): bool
    {
        return in_array($value, self::ALL, true);
    }
}

/**
 * Visit-report lifecycle.
 *
 * Distinct from the Session lifecycle: a report is `draft` until issued, an
 * issued report is frozen and snapshotted, and acknowledgement records that the
 * beneficiary has seen the EXACT issued version.
 */
final class VisitReportStatus
{
    public const DRAFT = 'draft';
    public const ISSUED = 'issued';
    public const ACKNOWLEDGED = 'acknowledged';

    public const ALL = [self::DRAFT, self::ISSUED, self::ACKNOWLEDGED];

    public static function isValid(string $value): bool
    {
        return in_array($value, self::ALL, true);
    }

    /** Content may only change while the report is a draft. */
    public static function isEditable(string $value): bool
    {
        return $value === self::DRAFT;
    }
}

/** How the follow-up will be conducted. */
final class FollowUpMethod
{
    public const CALL = 'call';
    public const VISIT = 'visit';
    public const CHECK_IN = 'check_in';
    public const EMAIL = 'email';

    public const ALL = [self::CALL, self::VISIT, self::CHECK_IN, self::EMAIL];

    public static function isValid(string $value): bool
    {
        return in_array($value, self::ALL, true);
    }
}

/** The four sectioned content areas of a visit report. */
final class VisitSection
{
    public const DISCUSSION = 'discussion';
    public const CHALLENGE = 'challenge';
    public const ALTERNATIVE = 'alternative';
    public const RECOMMENDATION = 'recommendation';

    public const ALL = [self::DISCUSSION, self::CHALLENGE, self::ALTERNATIVE, self::RECOMMENDATION];

    public static function isValid(string $value): bool
    {
        return in_array($value, self::ALL, true);
    }
}

/** Who a sign-off belongs to. */
final class VisitSignoffRole
{
    public const COACH = 'coach';
    public const BENEFICIARY = 'beneficiary';
    public const SPONSOR = 'sponsor';

    public const ALL = [self::COACH, self::BENEFICIARY, self::SPONSOR];

    public static function isValid(string $value): bool
    {
        return in_array($value, self::ALL, true);
    }
}

/** Human labels, shared by the API responses so the frontend has one source. */
final class VisitLabels
{
    public const VISIT_KIND = [
        VisitKind::SCHEDULED => 'Scheduled',
        VisitKind::AD_HOC => 'Ad hoc',
        VisitKind::FOLLOW_UP => 'Follow-up',
    ];

    public const STATUS = [
        VisitReportStatus::DRAFT => 'Draft',
        VisitReportStatus::ISSUED => 'Issued',
        VisitReportStatus::ACKNOWLEDGED => 'Acknowledged',
    ];

    public const SECTION = [
        VisitSection::DISCUSSION => 'Key discussion points',
        VisitSection::CHALLENGE => 'Challenges identified',
        VisitSection::ALTERNATIVE => 'Options / alternatives considered',
        VisitSection::RECOMMENDATION => 'Coach recommendations',
    ];

    public const FOLLOW_UP_METHOD = [
        FollowUpMethod::CALL => 'Call',
        FollowUpMethod::VISIT => 'Visit',
        FollowUpMethod::CHECK_IN => 'Check-in',
        FollowUpMethod::EMAIL => 'Email',
    ];

    public const SIGNOFF_ROLE = [
        VisitSignoffRole::COACH => 'Business coach',
        VisitSignoffRole::BENEFICIARY => 'Beneficiary',
        VisitSignoffRole::SPONSOR => 'Sponsor',
    ];
}
