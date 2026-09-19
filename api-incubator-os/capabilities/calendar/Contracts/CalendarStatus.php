<?php
declare(strict_types=1);

/**
 * Calendar event status.
 *
 * `cancelled` keeps the event visible but marked cancelled; it is a distinct
 * operation from soft deletion (`deleted_at`).
 */
final class CalendarStatus
{
    public const SCHEDULED = 'scheduled';
    public const COMPLETED = 'completed';
    public const CANCELLED = 'cancelled';

    public const ALL = [self::SCHEDULED, self::COMPLETED, self::CANCELLED];

    public static function isValid(string $value): bool
    {
        return in_array($value, self::ALL, true);
    }
}
