<?php
declare(strict_types=1);

/**
 * Hook the Calendar capability consults AFTER a local event change is committed,
 * so an outbound projection (today: Google Calendar) can be kept in step.
 *
 * The Calendar capability must not depend on any projection capability, so it
 * declares this tiny interface and the projection capability supplies the concrete
 * implementation at endpoint wiring time. When no hook is injected (e.g. a
 * calendar-only deployment) it behaves exactly as before.
 *
 * Contract: the hook is called AFTER the local write has been committed. It is
 * BEST-EFFORT — an implementation MUST NOT throw for a remote failure, because a
 * projection failure must never roll back or fail the authoritative local change.
 * Each method returns a short, secret-free status string for diagnostics only.
 */
interface GoogleEventSyncHook
{
    /**
     * The local event was created/updated. Push the change to the projection.
     *
     * @param array<string,mixed> $eventRow the committed `calendar_events` row
     */
    public function onEventChanged(array $eventRow): void;

    /**
     * The local event was cancelled (directly or via a Session cancellation).
     * Best-effort cancel of the projection.
     *
     * @param array<string,mixed> $eventRow the committed `calendar_events` row
     */
    public function onEventCancelled(array $eventRow): void;
}

/**
 * The no-op default. Injecting this (or nothing at all) leaves the Calendar
 * capability behaving exactly as it did before the hook existed.
 */
final class NullGoogleEventSyncHook implements GoogleEventSyncHook
{
    public function onEventChanged(array $eventRow): void {}

    public function onEventCancelled(array $eventRow): void {}
}
