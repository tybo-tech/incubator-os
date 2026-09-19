<?php
declare(strict_types=1);

/**
 * Typed exceptions for the Calendar capability.
 * Co-located (like models/Achievement.php) because they are always loaded together
 * and the endpoints map each type to a distinct HTTP status.
 */

final class CalendarValidationException extends RuntimeException {}
final class CalendarNotFoundException extends RuntimeException {}
final class CalendarForbiddenException extends RuntimeException {}
final class CalendarConflictException extends RuntimeException {}
