<?php
declare(strict_types=1);

/**
 * Session lifecycle state machine — the single source of truth for transitions.
 *
 *   PREPARING   -> IN_PROGRESS | CANCELLED
 *   IN_PROGRESS -> COMPLETED   | CANCELLED (reason required)
 *   COMPLETED   -> terminal (frozen)
 *   CANCELLED   -> terminal (frozen)
 *
 * Every other transition throws SessionStateException, which the responder maps
 * to `409` with `code = SESSION_INVALID_TRANSITION`.
 *
 * Completed Sessions MUST NOT be silently editable. The repository's audit
 * mechanism cannot support a controlled, auditable reopen today, so reopening is
 * deliberately not implemented (see the sprint doc).
 */
final class SessionStateMachine
{
    /** @var array<string,string[]> */
    private const ALLOWED = [
        SessionStatus::PREPARING => [SessionStatus::IN_PROGRESS, SessionStatus::CANCELLED],
        SessionStatus::IN_PROGRESS => [SessionStatus::COMPLETED, SessionStatus::CANCELLED],
        SessionStatus::COMPLETED => [],
        SessionStatus::CANCELLED => [],
    ];

    /** Actions that are only legal while a Session is still open. */
    public const MUTABLE_STATUSES = [SessionStatus::PREPARING, SessionStatus::IN_PROGRESS];

    public static function canTransition(string $from, string $to): bool
    {
        return in_array($to, self::ALLOWED[$from] ?? [], true);
    }

    /**
     * @throws SessionStateException
     */
    public static function assertTransition(string $from, string $to): void
    {
        if ($from === $to) {
            throw new SessionStateException(
                'SESSION_INVALID_TRANSITION: The Session is already ' . $from . '.'
            );
        }
        if (!self::canTransition($from, $to)) {
            throw new SessionStateException(
                'SESSION_INVALID_TRANSITION: Cannot move a Session from ' . $from . ' to ' . $to . '.'
            );
        }
    }

    /**
     * Completed and cancelled Sessions are frozen: operational content (agenda,
     * notes, decisions, links, participants, attendance, preparation fields) can
     * no longer be edited.
     *
     * @throws SessionStateException
     */
    public static function assertMutable(string $status): void
    {
        if (SessionStatus::isTerminal($status)) {
            throw new SessionStateException(
                'SESSION_FROZEN: A ' . $status . ' Session is read-only. Reopening is not supported.'
            );
        }
    }

    /**
     * Cancellation always requires a reason, in either cancellable state.
     *
     * @throws SessionValidationException
     */
    public static function assertCancellationReason(?string $reason): void
    {
        if ($reason === null || trim($reason) === '') {
            throw new SessionValidationException(json_encode([
                'cancellationReason' => 'A reason is required to cancel a Session.',
            ]) ?: 'A reason is required to cancel a Session.');
        }
    }
}
