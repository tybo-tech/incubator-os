<?php
declare(strict_types=1);

/**
 * Controlled linked-entity types for a calendar event.
 *
 * These are the canonical repository names (tables / node types), NOT the
 * frontend display labels. The frontend maps `target` -> `gps_target`, etc.
 *
 * Each type resolves to an owning `company_id`; the service verifies the linked
 * record exists, belongs to the same company as the event, and is reachable by
 * the actor.
 */
final class CalendarLinkEntityType
{
    public const GPS_TARGET = 'gps_target';
    public const SWOT_ITEM = 'swot_item';
    public const GPS_TARGET_TASK = 'gps_target_task';
    public const FINANCIAL_INDICATOR = 'financial_indicator';
    public const ACHIEVEMENT = 'achievement';
    public const ACHIEVEMENT_EVIDENCE = 'achievement_evidence';

    public const ALL = [
        self::GPS_TARGET,
        self::SWOT_ITEM,
        self::GPS_TARGET_TASK,
        self::FINANCIAL_INDICATOR,
        self::ACHIEVEMENT,
        self::ACHIEVEMENT_EVIDENCE,
    ];

    public static function isValid(string $value): bool
    {
        return in_array($value, self::ALL, true);
    }
}
