<?php
declare(strict_types=1);

/**
 * Typed exceptions for the Sessions capability.
 *
 * Mirrors CalendarExceptions: endpoints map each type to a distinct HTTP status.
 * `SessionConflictException` is also used to return the calendar's
 * `SESSION_LINKED` code when a linked calendar event is deleted.
 */
final class SessionValidationException extends RuntimeException {}
final class SessionNotFoundException extends RuntimeException {}
final class SessionForbiddenException extends RuntimeException {}
final class SessionConflictException extends RuntimeException {}
final class SessionStateException extends RuntimeException {}
