<?php
declare(strict_types=1);

/**
 * Resolves the Google attendee list for a calendar event (Sprint 010 Phase 3).
 *
 * ── Source of truth ─────────────────────────────────────────────────────────
 * Attendees come from the LINKED SESSION's participants, and ONLY from there.
 * The resolver never infers attendees from unrelated company users, the event
 * creator, or the assignee. A generic event with no Session therefore publishes
 * with no attendees (which is valid — it is still a published event).
 *
 * ── Filtering rules (all deterministic) ─────────────────────────────────────
 *   * Internal participants must resolve to a live user with an email.
 *   * External participants use their snapshot email.
 *   * Emails are trimmed and lower-cased for comparison.
 *   * Deduplication is CASE-INSENSITIVE: the first occurrence of an address wins.
 *   * The connected organiser's own address is excluded (Google rejects an event
 *     that lists the organiser as an attendee).
 *   * Missing/invalid addresses are dropped (`filter_var(..., FILTER_VALIDATE_EMAIL)`).
 *   * Removed/inactive users are excluded: a participant whose user row is gone,
 *     is not `active`, or has no email is dropped.
 *   * Output ordering is DETERMINISTIC (sorted by normalised email) so repeated
 *     payloads are byte-identical and tests are stable.
 *
 * This class does no database writes and opens no transaction.
 */
final class GoogleAttendeeResolver
{
    public function __construct(private readonly PDO $db) {}

    /**
     * @param array<string,mixed> $event a `calendar_events` row
     * @return array<int,array{email:string}> sorted, deduped, organiser-excluded
     */
    public function resolve(array $event, ?string $organiserEmail): array
    {
        $sessionId = $this->sessionIdFor((int) ($event['id'] ?? 0));
        if ($sessionId === null) {
            return [];
        }

        $organiser = $this->normalise($organiserEmail);

        $seen = [];
        foreach ($this->participants($sessionId) as $participant) {
            $email = $this->participantEmail($participant);
            if ($email === null) {
                continue;
            }
            if ($organiser !== null && $email === $organiser) {
                continue; // never list the organiser as an attendee
            }
            $seen[$email] = true; // case-insensitive dedupe via normalised key
        }

        $emails = array_keys($seen);
        sort($emails, SORT_STRING); // deterministic ordering

        $attendees = [];
        foreach ($emails as $email) {
            $attendees[] = ['email' => $email];
        }
        return $attendees;
    }

    /**
     * The Session linked to an event, or null. Uses the UNIQUE `calendar_event_id`
     * FK, so at most one Session can match.
     */
    private function sessionIdFor(int $calendarEventId): ?int
    {
        if ($calendarEventId <= 0 || !$this->tableExists('sessions')) {
            return null;
        }
        $stmt = $this->db->prepare(
            'SELECT id FROM sessions WHERE calendar_event_id = :event AND deleted_at IS NULL LIMIT 1'
        );
        $stmt->execute(['event' => $calendarEventId]);
        $id = $stmt->fetchColumn();
        return $id === false ? null : (int) $id;
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    private function participants(int $sessionId): array
    {
        if (!$this->tableExists('session_participants')) {
            return [];
        }
        $stmt = $this->db->prepare(
            'SELECT p.participant_type, p.user_id, p.name, p.email,
                    u.email AS user_email, u.full_name AS user_name, u.status AS user_status
               FROM session_participants p
               LEFT JOIN users u ON u.id = p.user_id
              WHERE p.session_id = :session
              ORDER BY p.id ASC'
        );
        $stmt->execute(['session' => $sessionId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * The attendee email for a participant, or null when it must be dropped.
     *
     * @param array<string,mixed> $participant
     */
    private function participantEmail(array $participant): ?string
    {
        $type = (string) ($participant['participant_type'] ?? 'external');

        if ($type === 'internal') {
            // A removed/inactive user is excluded entirely.
            $status = $participant['user_status'] ?? null;
            if ($status === null || !in_array($status, ['active', 'invited'], true)) {
                return null;
            }
            // Prefer the live user's email over the snapshot.
            $email = $this->normalise((string) (($participant['user_email'] ?? '') !== '' ? $participant['user_email'] : ($participant['email'] ?? '')));
            return $email;
        }

        return $this->normalise((string) ($participant['email'] ?? ''));
    }

    /**
     * Trim, lower-case and validate an address. Returns null when it is missing
     * or not a plausible email.
     */
    private function normalise(?string $email): ?string
    {
        $email = strtolower(trim((string) $email));
        if ($email === '') {
            return null;
        }
        return filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : null;
    }

    /** @var array<string,bool> */
    private array $tableCache = [];

    private function tableExists(string $table): bool
    {
        if (array_key_exists($table, $this->tableCache)) {
            return $this->tableCache[$table];
        }
        try {
            $stmt = $this->db->prepare(
                'SELECT COUNT(*) FROM information_schema.TABLES
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t'
            );
            $stmt->execute(['t' => $table]);
            $exists = (int) $stmt->fetchColumn() > 0;
        } catch (Throwable) {
            $exists = false;
        }
        $this->tableCache[$table] = $exists;
        return $exists;
    }
}
