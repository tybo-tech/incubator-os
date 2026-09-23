<?php
declare(strict_types=1);

/**
 * Controlled vocabularies for the Sessions capability.
 *
 * Co-located (like CalendarExceptions.php) because they are always loaded
 * together and are pure validation constants — one file keeps the include list
 * short without hiding anything.
 */

/** Lifecycle status. Uppercase: matches the sprint contract and the DB enum. */
final class SessionStatus
{
    public const PREPARING = 'PREPARING';
    public const IN_PROGRESS = 'IN_PROGRESS';
    public const COMPLETED = 'COMPLETED';
    public const CANCELLED = 'CANCELLED';

    public const ALL = [self::PREPARING, self::IN_PROGRESS, self::COMPLETED, self::CANCELLED];

    /** Terminal states are frozen: no further mutation is permitted. */
    public const TERMINAL = [self::COMPLETED, self::CANCELLED];

    public static function isValid(string $value): bool
    {
        return in_array($value, self::ALL, true);
    }

    public static function isTerminal(string $value): bool
    {
        return in_array($value, self::TERMINAL, true);
    }
}

/** Session type — a controlled classification, not free text. */
final class SessionType
{
    public const COACHING = 'coaching';
    public const PROGRESS_REVIEW = 'progress_review';
    public const FINANCIAL_REVIEW = 'financial_review';
    public const ASSESSMENT = 'assessment';
    public const WORKSHOP = 'workshop';
    public const OTHER = 'other';

    public const ALL = [
        self::COACHING, self::PROGRESS_REVIEW, self::FINANCIAL_REVIEW,
        self::ASSESSMENT, self::WORKSHOP, self::OTHER,
    ];

    public static function isValid(string $value): bool
    {
        return in_array($value, self::ALL, true);
    }
}

/**
 * Canonical linked-entity types.
 *
 * These are the SAME canonical names used by `calendar_event_links` and the
 * repository's real tables/node types — NOT the frontend display labels. Keeping
 * them identical lets the two capabilities share one resolver.
 */
final class SessionLinkEntityType
{
    public const GPS_TARGET = 'gps_target';
    public const SWOT_ITEM = 'swot_item';
    public const GPS_TARGET_TASK = 'gps_target_task';
    public const FINANCIAL_INDICATOR = 'financial_indicator';
    public const ACHIEVEMENT = 'achievement';
    public const ACHIEVEMENT_EVIDENCE = 'achievement_evidence';

    public const ALL = [
        self::GPS_TARGET, self::SWOT_ITEM, self::GPS_TARGET_TASK,
        self::FINANCIAL_INDICATOR, self::ACHIEVEMENT, self::ACHIEVEMENT_EVIDENCE,
    ];

    public static function isValid(string $value): bool
    {
        return in_array($value, self::ALL, true);
    }
}

/** How a linked record relates to the Session. */
final class SessionRelationship
{
    public const AGENDA = 'AGENDA';
    public const DISCUSSED = 'DISCUSSED';
    public const CREATED = 'CREATED';
    public const UPDATED = 'UPDATED';
    public const REVIEWED = 'REVIEWED';
    public const EVIDENCE = 'EVIDENCE';

    public const ALL = [
        self::AGENDA, self::DISCUSSED, self::CREATED,
        self::UPDATED, self::REVIEWED, self::EVIDENCE,
    ];

    public static function isValid(string $value): bool
    {
        return in_array($value, self::ALL, true);
    }
}

/**
 * Note visibility.
 *
 * `incubator` notes must never be exposed to a company user, on any endpoint.
 */
final class SessionNoteVisibility
{
    public const SHARED = 'shared';
    public const INCUBATOR = 'incubator';

    public const ALL = [self::SHARED, self::INCUBATOR];

    public static function isValid(string $value): bool
    {
        return in_array($value, self::ALL, true);
    }
}

/** Attendance state for a participant. */
final class AttendanceState
{
    public const INVITED = 'invited';
    public const ATTENDED = 'attended';
    public const ABSENT = 'absent';
    public const APOLOGY = 'apology';

    public const ALL = [self::INVITED, self::ATTENDED, self::ABSENT, self::APOLOGY];

    public static function isValid(string $value): bool
    {
        return in_array($value, self::ALL, true);
    }
}

/** A participant is either an internal user or an external snapshot. */
final class ParticipantType
{
    public const INTERNAL = 'internal';
    public const EXTERNAL = 'external';

    public const ALL = [self::INTERNAL, self::EXTERNAL];

    public static function isValid(string $value): bool
    {
        return in_array($value, self::ALL, true);
    }
}

/** Agenda item coverage status. */
final class AgendaItemStatus
{
    public const PENDING = 'pending';
    public const COVERED = 'covered';
    public const DEFERRED = 'deferred';

    public const ALL = [self::PENDING, self::COVERED, self::DEFERRED];

    public static function isValid(string $value): bool
    {
        return in_array($value, self::ALL, true);
    }
}
