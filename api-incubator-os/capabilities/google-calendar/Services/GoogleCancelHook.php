<?php
declare(strict_types=1);

/**
 * Google-side implementation of the Calendar capability's projection hook
 * (Sprint 010 Phase 4).
 *
 * Lives in `capabilities/google-calendar` because `capabilities/calendar` must not
 * depend on a projection capability. The calendar update/delete endpoints and the
 * Session cancel endpoint wire this in only when both capabilities are present.
 *
 * Contract:
 *   * Called AFTER the local transaction committed.
 *   * BEST-EFFORT: never throws. A Google failure records a retryable pending
 *     state on the sync row; it never rolls back the local change.
 *   * The sync row's stored connection is used (server-side), so a cancellation by
 *     an authorized user other than the original publisher still works.
 *
 * `onEventChanged` is a PUSH, but a local edit does not automatically call Google:
 * pushing is an explicit action (the `sync` command) so a burst of edits does not
 * spam attendees. The hook therefore only handles cancellation, which is the one
 * local change that must propagate without a user action. `onEventChanged` is a
 * no-op by design and documented as such.
 */
final class GoogleCancelHook implements GoogleEventSyncHook
{
    public function __construct(
        private readonly GoogleEventSyncService $service,
        private readonly PDO $db,
    ) {}

    public function onEventChanged(array $eventRow): void
    {
        // Reschedule/edit propagation is an explicit, user-initiated action
        // (`commands/sync.php`), not an automatic cascade, so no email is sent on
        // every edit. Intentionally a no-op.
    }

    public function onEventCancelled(array $eventRow): void
    {
        try {
            $this->service->cancelEvent($eventRow);
        } catch (Throwable $e) {
            // Absolute backstop: a projection failure must never surface here.
            if (class_exists('GoogleLog')) {
                GoogleLog::warning('Google cancel hook failed (best effort).', [
                    'event' => (int) ($eventRow['id'] ?? 0),
                ]);
            }
        }
    }
}
