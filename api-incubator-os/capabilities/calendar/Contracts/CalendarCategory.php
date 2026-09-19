<?php
declare(strict_types=1);

/**
 * Calendar categories. Canonical DB values — the frontend labels are display-only.
 */
final class CalendarCategory
{
    public const MEETING = 'meeting';
    public const DEADLINE = 'deadline';
    public const REVIEW = 'review';
    public const CHECK_IN = 'check_in';
    public const REMINDER = 'reminder';
    public const MILESTONE = 'milestone';
    public const OTHER = 'other';

    public const ALL = [
        self::MEETING, self::DEADLINE, self::REVIEW, self::CHECK_IN,
        self::REMINDER, self::MILESTONE, self::OTHER,
    ];

    public static function isValid(string $value): bool
    {
        return in_array($value, self::ALL, true);
    }
}
