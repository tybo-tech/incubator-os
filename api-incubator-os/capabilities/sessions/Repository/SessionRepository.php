<?php
declare(strict_types=1);

/**
 * Session persistence.
 *
 * A Session stores NO schedule columns: scheduled date/time lives on the linked
 * `calendar_events` row, so rescheduling happens through the calendar. Every read
 * here joins the event (when present) so callers get the schedule for free.
 *
 * Only live rows are returned. `deleted_at` is reserved (no delete endpoint this
 * sprint) but is honoured so a future soft delete needs no read changes.
 */
final class SessionRepository
{
    public function __construct(private PDO $db) {}

    // ---------------------------------------------------------------- reads

    /**
     * Company timeline with optional filters, including sub-resource counts.
     *
     * @param array{companyId:int, status?:?string, sessionType?:?string,
     *              facilitatorUserId?:?int, search?:?string} $filter
     * @return array<int,array<string,mixed>>
     */
    public function listByCompany(int $tenantId, array $filter): array
    {
        $sql = $this->baseSelect()
            . " WHERE s.tenant_id = :tenant AND s.deleted_at IS NULL AND s.company_id = :company";
        $params = ['tenant' => $tenantId, 'company' => $filter['companyId']];

        if (!empty($filter['status'])) {
            $sql .= " AND s.status = :status";
            $params['status'] = $filter['status'];
        }
        if (!empty($filter['sessionType'])) {
            $sql .= " AND s.session_type = :session_type";
            $params['session_type'] = $filter['sessionType'];
        }
        if (!empty($filter['facilitatorUserId'])) {
            $sql .= " AND s.facilitator_user_id = :facilitator";
            $params['facilitator'] = (int)$filter['facilitatorUserId'];
        }
        if (!empty($filter['search'])) {
            $sql .= " AND (s.subject LIKE :search OR s.purpose LIKE :search)";
            $params['search'] = '%' . $filter['search'] . '%';
        }

        // Deterministic ordering: soonest upcoming event first (sessions without
        // an event last), then newest created.
        $sql .= " ORDER BY (e.start_at IS NULL AND e.start_date IS NULL) ASC,
                         COALESCE(e.start_at, e.start_date) ASC, s.id DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * Upcoming Sessions the actor may see, within a bounded horizon.
     *
     * A Session is "upcoming" when its linked event starts on/after today and the
     * Session is not terminal. `companyIds` null = tenant-wide (admin).
     *
     * @param int[]|null $companyIds
     * @return array<int,array<string,mixed>>
     */
    public function listUpcoming(int $tenantId, ?array $companyIds, string $fromDate, string $toDate): array
    {
        $sql = $this->baseSelect()
            . " WHERE s.tenant_id = :tenant AND s.deleted_at IS NULL
                  AND s.status IN ('PREPARING','IN_PROGRESS')
                  AND (
                    (e.all_day = 1 AND e.start_date BETWEEN :from_date AND :to_date)
                    OR
                    (e.all_day = 0 AND e.start_at BETWEEN :from_at AND :to_at)
                  )";
        $params = [
            'tenant' => $tenantId,
            'from_date' => $fromDate,
            'to_date' => $toDate,
            'from_at' => $fromDate . ' 00:00:00',
            'to_at' => $toDate . ' 23:59:59',
        ];

        if ($companyIds !== null) {
            if (!$companyIds) {
                return [];
            }
            $placeholders = [];
            foreach (array_values(array_unique(array_map('intval', $companyIds))) as $i => $id) {
                $placeholders[] = ":co$i";
                $params["co$i"] = $id;
            }
            $sql .= " AND s.company_id IN (" . implode(',', $placeholders) . ")";
        }

        $sql .= " ORDER BY COALESCE(e.start_at, e.start_date) ASC, s.id ASC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /** Sessions linking a specific business record (backlinks). */
    /**
     * @param int[]|null $companyIds
     * @return array<int,array<string,mixed>>
     */
    public function listByEntityLink(int $tenantId, string $entityType, int $entityId, ?array $companyIds): array
    {
        $sql = $this->baseSelect()
            . " JOIN session_entity_links l ON l.session_id = s.id
                WHERE s.tenant_id = :tenant AND s.deleted_at IS NULL
                  AND l.entity_type = :entity_type AND l.entity_id = :entity_id";
        $params = ['tenant' => $tenantId, 'entity_type' => $entityType, 'entity_id' => $entityId];

        if ($companyIds !== null) {
            if (!$companyIds) {
                return [];
            }
            $placeholders = [];
            foreach (array_values(array_unique(array_map('intval', $companyIds))) as $i => $id) {
                $placeholders[] = ":co$i";
                $params["co$i"] = $id;
            }
            $sql .= " AND s.company_id IN (" . implode(',', $placeholders) . ")";
        }

        $sql .= " GROUP BY s.id ORDER BY s.id DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findById(int $id, int $tenantId): ?array
    {
        $stmt = $this->db->prepare(
            $this->baseSelect() . " WHERE s.id = :id AND s.tenant_id = :tenant AND s.deleted_at IS NULL"
        );
        $stmt->execute(['id' => $id, 'tenant' => $tenantId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findByCalendarEvent(int $calendarEventId, int $tenantId): ?array
    {
        $stmt = $this->db->prepare(
            $this->baseSelect() . " WHERE s.calendar_event_id = :event AND s.tenant_id = :tenant AND s.deleted_at IS NULL"
        );
        $stmt->execute(['event' => $calendarEventId, 'tenant' => $tenantId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /** The most recent COMPLETED Session in a company (preparation brief). */
    /**
     * @return array<string,mixed>|null
     */
    public function findLatestCompleted(int $companyId, int $tenantId, ?int $excludeId = null): ?array
    {
        $sql = $this->baseSelect()
            . " WHERE s.tenant_id = :tenant AND s.deleted_at IS NULL
                  AND s.company_id = :company AND s.status = 'COMPLETED'";
        $params = ['tenant' => $tenantId, 'company' => $companyId];
        if ($excludeId !== null) {
            $sql .= " AND s.id <> :exclude";
            $params['exclude'] = $excludeId;
        }
        $sql .= " ORDER BY s.completed_at DESC, s.id DESC LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    // ---------------------------------------------------------------- writes

    /**
     * @param array<string,mixed> $data
     */
    public function create(array $data): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO sessions
                (tenant_id, company_id, calendar_event_id, session_type, subject, purpose, status,
                 preparation_summary, closing_summary, facilitator_user_id, facilitator_label,
                 created_by, updated_by, version)
             VALUES
                (:tenant_id, :company_id, :calendar_event_id, :session_type, :subject, :purpose, :status,
                 :preparation_summary, :closing_summary, :facilitator_user_id, :facilitator_label,
                 :created_by, :updated_by, 1)"
        );
        $stmt->execute([
            'tenant_id' => (int)$data['tenant_id'],
            'company_id' => (int)$data['company_id'],
            'calendar_event_id' => $data['calendar_event_id'],
            'session_type' => $data['session_type'],
            'subject' => $data['subject'],
            'purpose' => $data['purpose'],
            'status' => $data['status'] ?? SessionStatus::PREPARING,
            'preparation_summary' => $data['preparation_summary'] ?? null,
            'closing_summary' => $data['closing_summary'] ?? null,
            'facilitator_user_id' => $data['facilitator_user_id'],
            'facilitator_label' => $data['facilitator_label'],
            'created_by' => (int)$data['created_by'],
            'updated_by' => $data['updated_by'],
        ]);
        return (int)$this->db->lastInsertId();
    }

    /**
     * Update preparation fields with optimistic concurrency.
     *
     * @param array<string,mixed> $data
     * @return int rows affected (0 = stale version / row gone)
     */
    public function updatePreparation(int $id, int $tenantId, int $expectedVersion, array $data): int
    {
        $stmt = $this->db->prepare(
            "UPDATE sessions SET
                session_type = :session_type,
                subject = :subject,
                purpose = :purpose,
                preparation_summary = :preparation_summary,
                closing_summary = :closing_summary,
                facilitator_user_id = :facilitator_user_id,
                facilitator_label = :facilitator_label,
                updated_by = :updated_by,
                version = version + 1
             WHERE id = :id AND tenant_id = :tenant AND deleted_at IS NULL AND version = :version"
        );
        $stmt->execute([
            'session_type' => $data['session_type'],
            'subject' => $data['subject'],
            'purpose' => $data['purpose'],
            'preparation_summary' => $data['preparation_summary'],
            'closing_summary' => $data['closing_summary'],
            'facilitator_user_id' => $data['facilitator_user_id'],
            'facilitator_label' => $data['facilitator_label'],
            'updated_by' => (int)$data['updated_by'],
            'id' => $id,
            'tenant' => $tenantId,
            'version' => $expectedVersion,
        ]);
        return $stmt->rowCount();
    }

    /** Transition to IN_PROGRESS. */
    public function markStarted(int $id, int $tenantId, int $expectedVersion, int $actorId): int
    {
        return $this->transition(
            $id,
            $tenantId,
            $expectedVersion,
            "status = 'IN_PROGRESS', started_at = UTC_TIMESTAMP(), updated_by = :actor",
            ['actor' => $actorId]
        );
    }

    /** Transition to COMPLETED, storing the closing summary. */
    public function markCompleted(int $id, int $tenantId, int $expectedVersion, int $actorId, ?string $closingSummary): int
    {
        $stmt = $this->db->prepare(
            "UPDATE sessions SET
                status = 'COMPLETED',
                completed_at = UTC_TIMESTAMP(),
                closing_summary = COALESCE(:closing, closing_summary),
                updated_by = :actor,
                version = version + 1
             WHERE id = :id AND tenant_id = :tenant AND deleted_at IS NULL AND version = :version"
        );
        $stmt->execute([
            'closing' => $closingSummary,
            'actor' => $actorId,
            'id' => $id,
            'tenant' => $tenantId,
            'version' => $expectedVersion,
        ]);
        return $stmt->rowCount();
    }

    /** Transition to CANCELLED, storing the (mandatory) reason. */
    public function markCancelled(int $id, int $tenantId, int $expectedVersion, int $actorId, string $reason): int
    {
        $stmt = $this->db->prepare(
            "UPDATE sessions SET
                status = 'CANCELLED',
                cancellation_reason = :reason,
                cancelled_at = UTC_TIMESTAMP(),
                cancelled_by = :actor,
                updated_by = :actor,
                version = version + 1
             WHERE id = :id AND tenant_id = :tenant AND deleted_at IS NULL AND version = :version"
        );
        $stmt->execute([
            'reason' => $reason,
            'actor' => $actorId,
            'id' => $id,
            'tenant' => $tenantId,
            'version' => $expectedVersion,
        ]);
        return $stmt->rowCount();
    }

    /**
     * @param array<string,mixed> $extraParams
     */
    private function transition(int $id, int $tenantId, int $expectedVersion, string $set, array $extraParams): int
    {
        $stmt = $this->db->prepare(
            "UPDATE sessions SET $set, version = version + 1
             WHERE id = :id AND tenant_id = :tenant AND deleted_at IS NULL AND version = :version"
        );
        $stmt->execute($extraParams + [
            'id' => $id,
            'tenant' => $tenantId,
            'version' => $expectedVersion,
        ]);
        return $stmt->rowCount();
    }

    // ---------------------------------------------------------------- participants

    /** @return array<int,array<string,mixed>> */
    public function participants(int $sessionId): array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM session_participants WHERE session_id = :id ORDER BY id ASC"
        );
        $stmt->execute(['id' => $sessionId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /** @param array<string,mixed> $d */
    public function addParticipant(int $sessionId, array $d): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO session_participants
                (session_id, participant_type, user_id, name, email, role, attendance, created_by)
             VALUES (:session, :type, :user_id, :name, :email, :role, :attendance, :created_by)"
        );
        try {
            $stmt->execute([
                'session' => $sessionId,
                'type' => $d['participantType'],
                'user_id' => $d['userId'],
                'name' => $d['name'],
                'email' => $d['email'],
                'role' => $d['role'],
                'attendance' => $d['attendance'] ?? AttendanceState::INVITED,
                'created_by' => $d['created_by'] ?? null,
            ]);
        } catch (PDOException $e) {
            // The generated `dedupe_key` unique constraint is the backstop for a
            // duplicate attendee (same user, or same email/name case-insensitively).
            if ($e->getCode() === '23000') {
                throw new SessionConflictException('That participant is already on this Session.');
            }
            throw $e;
        }
        return (int)$this->db->lastInsertId();
    }

    /** @param array<string,mixed> $d */
    public function updateParticipant(int $id, int $sessionId, array $d): int
    {
        $stmt = $this->db->prepare(
            "UPDATE session_participants SET
                participant_type = :type, user_id = :user_id, name = :name, email = :email,
                role = :role, attendance = :attendance
             WHERE id = :id AND session_id = :session"
        );
        $stmt->execute([
            'type' => $d['participantType'],
            'user_id' => $d['userId'],
            'name' => $d['name'],
            'email' => $d['email'],
            'role' => $d['role'],
            'attendance' => $d['attendance'],
            'id' => $id,
            'session' => $sessionId,
        ]);
        return $stmt->rowCount();
    }

    /** @return array<string,mixed>|null */
    public function findParticipant(int $id, int $sessionId): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM session_participants WHERE id = :id AND session_id = :session");
        $stmt->execute(['id' => $id, 'session' => $sessionId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function removeParticipant(int $id, int $sessionId): void
    {
        $stmt = $this->db->prepare("DELETE FROM session_participants WHERE id = :id AND session_id = :session");
        $stmt->execute(['id' => $id, 'session' => $sessionId]);
    }

    // ---------------------------------------------------------------- agenda

    /** @return array<int,array<string,mixed>> */
    public function agenda(int $sessionId): array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM session_agenda_items WHERE session_id = :id ORDER BY sort_order ASC, id ASC"
        );
        $stmt->execute(['id' => $sessionId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /** @param array<string,mixed> $d */
    public function addAgendaItem(int $sessionId, array $d): int
    {
        $next = $this->nextAgendaOrder($sessionId);
        $stmt = $this->db->prepare(
            "INSERT INTO session_agenda_items
                (session_id, sort_order, topic, description, status, presenter_user_id, presenter_label, created_by)
             VALUES (:session, :sort, :topic, :description, :status, :presenter_user_id, :presenter_label, :created_by)"
        );
        $stmt->execute([
            'session' => $sessionId,
            'sort' => $next,
            'topic' => $d['topic'],
            'description' => $d['description'],
            'status' => $d['status'] ?? AgendaItemStatus::PENDING,
            'presenter_user_id' => $d['presenterUserId'],
            'presenter_label' => $d['presenterLabel'],
            'created_by' => $d['created_by'] ?? null,
        ]);
        return (int)$this->db->lastInsertId();
    }

    /** @param array<string,mixed> $d */
    public function updateAgendaItem(int $id, int $sessionId, array $d): int
    {
        $stmt = $this->db->prepare(
            "UPDATE session_agenda_items SET
                topic = :topic, description = :description, status = :status,
                presenter_user_id = :presenter_user_id, presenter_label = :presenter_label
             WHERE id = :id AND session_id = :session"
        );
        $stmt->execute([
            'topic' => $d['topic'],
            'description' => $d['description'],
            'status' => $d['status'],
            'presenter_user_id' => $d['presenterUserId'],
            'presenter_label' => $d['presenterLabel'],
            'id' => $id,
            'session' => $sessionId,
        ]);
        return $stmt->rowCount();
    }

    /** @return array<string,mixed>|null */
    public function findAgendaItem(int $id, int $sessionId): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM session_agenda_items WHERE id = :id AND session_id = :session");
        $stmt->execute(['id' => $id, 'session' => $sessionId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function removeAgendaItem(int $id, int $sessionId): void
    {
        $stmt = $this->db->prepare("DELETE FROM session_agenda_items WHERE id = :id AND session_id = :session");
        $stmt->execute(['id' => $id, 'session' => $sessionId]);
        $this->renumberAgenda($sessionId);
    }

    /**
     * Reorder agenda items by an explicit ordered id list. Ids not owned by the
     * Session are ignored (never trusted).
     *
     * @param int[] $orderedIds
     */
    public function reorderAgenda(int $sessionId, array $orderedIds): void
    {
        $owned = [];
        foreach ($this->agenda($sessionId) as $item) {
            $owned[(int)$item['id']] = true;
        }
        $order = 0;
        $seen = [];
        $stmt = $this->db->prepare(
            "UPDATE session_agenda_items SET sort_order = :sort WHERE id = :id AND session_id = :session"
        );
        foreach ($orderedIds as $rawId) {
            $id = (int)$rawId;
            if (!isset($owned[$id]) || isset($seen[$id])) {
                continue;
            }
            $seen[$id] = true;
            $stmt->execute(['sort' => $order++, 'id' => $id, 'session' => $sessionId]);
        }
        // Anything the caller omitted keeps a stable place at the end.
        foreach (array_keys($owned) as $id) {
            if (!isset($seen[$id])) {
                $stmt->execute(['sort' => $order++, 'id' => $id, 'session' => $sessionId]);
            }
        }
    }

    private function nextAgendaOrder(int $sessionId): int
    {
        $stmt = $this->db->prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 FROM session_agenda_items WHERE session_id = :id");
        $stmt->execute(['id' => $sessionId]);
        return (int)$stmt->fetchColumn();
    }

    private function renumberAgenda(int $sessionId): void
    {
        $order = 0;
        $stmt = $this->db->prepare("UPDATE session_agenda_items SET sort_order = :sort WHERE id = :id");
        foreach ($this->agenda($sessionId) as $item) {
            $stmt->execute(['sort' => $order++, 'id' => (int)$item['id']]);
        }
    }

    // ---------------------------------------------------------------- notes

    /**
     * Notes for a Session, filtered by what the actor may see.
     *
     * @param bool $includeIncubator false for a company user — incubator notes are never returned.
     * @return array<int,array<string,mixed>>
     */
    public function notes(int $sessionId, bool $includeIncubator): array
    {
        $sql = "SELECT * FROM session_notes WHERE session_id = :id";
        if (!$includeIncubator) {
            $sql .= " AND visibility = 'shared'";
        }
        $sql .= " ORDER BY created_at ASC, id ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['id' => $sessionId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /** @param array<string,mixed> $d */
    public function addNote(int $sessionId, array $d): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO session_notes (session_id, visibility, content, author_user_id, author_label)
             VALUES (:session, :visibility, :content, :author_user_id, :author_label)"
        );
        $stmt->execute([
            'session' => $sessionId,
            'visibility' => $d['visibility'] ?? SessionNoteVisibility::SHARED,
            'content' => $d['content'],
            'author_user_id' => $d['author_user_id'] ?? null,
            'author_label' => $d['author_label'] ?? null,
        ]);
        return (int)$this->db->lastInsertId();
    }

    /** @param array<string,mixed> $d */
    public function updateNote(int $id, int $sessionId, int $expectedVersion, array $d): int
    {
        $stmt = $this->db->prepare(
            "UPDATE session_notes SET content = :content, visibility = :visibility, version = version + 1
             WHERE id = :id AND session_id = :session AND version = :version"
        );
        $stmt->execute([
            'content' => $d['content'],
            'visibility' => $d['visibility'],
            'id' => $id,
            'session' => $sessionId,
            'version' => $expectedVersion,
        ]);
        return $stmt->rowCount();
    }

    /** @return array<string,mixed>|null */
    public function findNote(int $id, int $sessionId): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM session_notes WHERE id = :id AND session_id = :session");
        $stmt->execute(['id' => $id, 'session' => $sessionId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function removeNote(int $id, int $sessionId): void
    {
        $stmt = $this->db->prepare("DELETE FROM session_notes WHERE id = :id AND session_id = :session");
        $stmt->execute(['id' => $id, 'session' => $sessionId]);
    }

    // ---------------------------------------------------------------- decisions

    /** @return array<int,array<string,mixed>> */
    public function decisions(int $sessionId): array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM session_decisions WHERE session_id = :id ORDER BY decision_date DESC, id DESC"
        );
        $stmt->execute(['id' => $sessionId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /** @param array<string,mixed> $d */
    public function addDecision(int $sessionId, array $d): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO session_decisions
                (session_id, decision_text, decision_date, rationale, recorded_by, recorded_by_label)
             VALUES (:session, :text, :date, :rationale, :recorded_by, :recorded_by_label)"
        );
        $stmt->execute([
            'session' => $sessionId,
            'text' => $d['decisionText'],
            'date' => $d['decisionDate'],
            'rationale' => $d['rationale'],
            'recorded_by' => $d['recorded_by'] ?? null,
            'recorded_by_label' => $d['recorded_by_label'] ?? null,
        ]);
        return (int)$this->db->lastInsertId();
    }

    /** @param array<string,mixed> $d */
    public function updateDecision(int $id, int $sessionId, int $expectedVersion, array $d): int
    {
        $stmt = $this->db->prepare(
            "UPDATE session_decisions SET
                decision_text = :text, decision_date = :date, rationale = :rationale, version = version + 1
             WHERE id = :id AND session_id = :session AND version = :version"
        );
        $stmt->execute([
            'text' => $d['decisionText'],
            'date' => $d['decisionDate'],
            'rationale' => $d['rationale'],
            'id' => $id,
            'session' => $sessionId,
            'version' => $expectedVersion,
        ]);
        return $stmt->rowCount();
    }

    /** @return array<string,mixed>|null */
    public function findDecision(int $id, int $sessionId): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM session_decisions WHERE id = :id AND session_id = :session");
        $stmt->execute(['id' => $id, 'session' => $sessionId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function removeDecision(int $id, int $sessionId): void
    {
        $stmt = $this->db->prepare("DELETE FROM session_decisions WHERE id = :id AND session_id = :session");
        $stmt->execute(['id' => $id, 'session' => $sessionId]);
    }

    // ---------------------------------------------------------------- links

    /** @return array<int,array<string,mixed>> */
    public function links(int $sessionId): array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM session_entity_links WHERE session_id = :id ORDER BY id ASC"
        );
        $stmt->execute(['id' => $sessionId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /** @param array<string,mixed> $d */
    public function addLink(int $sessionId, array $d): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO session_entity_links
                (session_id, entity_type, entity_id, relationship, label, created_by)
             VALUES (:session, :entity_type, :entity_id, :relationship, :label, :created_by)"
        );
        $stmt->execute([
            'session' => $sessionId,
            'entity_type' => $d['entityType'],
            'entity_id' => (int)$d['entityId'],
            'relationship' => $d['relationship'],
            'label' => $d['label'] ?? null,
            'created_by' => $d['created_by'] ?? null,
        ]);
        return (int)$this->db->lastInsertId();
    }

    /** @return array<string,mixed>|null */
    public function findLink(int $id, int $sessionId): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM session_entity_links WHERE id = :id AND session_id = :session");
        $stmt->execute(['id' => $id, 'session' => $sessionId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /** Does an identical link already exist? (UNIQUE is the backstop.) */
    public function hasLink(int $sessionId, string $entityType, int $entityId, string $relationship): bool
    {
        $stmt = $this->db->prepare(
            "SELECT 1 FROM session_entity_links
             WHERE session_id = :session AND entity_type = :type AND entity_id = :entity AND relationship = :rel
             LIMIT 1"
        );
        $stmt->execute(['session' => $sessionId, 'type' => $entityType, 'entity' => $entityId, 'rel' => $relationship]);
        return (bool)$stmt->fetchColumn();
    }

    public function removeLink(int $id, int $sessionId): void
    {
        $stmt = $this->db->prepare("DELETE FROM session_entity_links WHERE id = :id AND session_id = :session");
        $stmt->execute(['id' => $id, 'session' => $sessionId]);
    }

    // ---------------------------------------------------------------- activity

    /** @return array<int,array<string,mixed>> */
    public function activity(int $sessionId): array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM session_activities WHERE session_id = :id ORDER BY created_at ASC, id ASC"
        );
        $stmt->execute(['id' => $sessionId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * Append an activity row. Append-only: there is intentionally no update or
     * delete counterpart.
     *
     * @param array<string,mixed>|null $payload
     */
    public function logActivity(
        int $sessionId,
        int $companyId,
        ?int $actorId,
        ?string $actorLabel,
        string $action,
        ?string $detail = null,
        ?array $payload = null,
    ): void {
        $stmt = $this->db->prepare(
            "INSERT INTO session_activities
                (session_id, company_id, actor_user_id, actor_label, action, detail, payload)
             VALUES (:session, :company, :actor, :actor_label, :action, :detail, :payload)"
        );
        $stmt->execute([
            'session' => $sessionId,
            'company' => $companyId,
            'actor' => $actorId,
            'actor_label' => $actorLabel,
            'action' => $action,
            'detail' => $detail,
            'payload' => $payload !== null ? (json_encode($payload) ?: null) : null,
        ]);
    }

    // ---------------------------------------------------------------- shared select

    /**
     * The company a user belongs to, or null when the user does not exist.
     * Used to validate an internal participant.
     */
    public function userCompanyLookup(int $userId): ?int
    {
        $stmt = $this->db->prepare("SELECT company_id FROM users WHERE id = :id");
        $stmt->execute(['id' => $userId]);
        $value = $stmt->fetchColumn();
        return $value === false ? null : (int)$value;
    }

    /**
     * Base projection with the linked event joined so every read carries the
     * schedule, plus sub-resource counts for list screens.
     */
    private function baseSelect(): string
    {
        return "SELECT s.*,
                       c.name AS company_name,
                       creator.full_name AS created_by_name,
                       canceller.full_name AS cancelled_by_label,
                       e.title AS e_title, e.category AS e_category, e.status AS e_status,
                       e.all_day AS e_all_day, e.timezone AS e_timezone, e.location AS e_location,
                       e.start_date AS e_start_date, e.end_date AS e_end_date,
                       e.start_at AS e_start_at, e.end_at AS e_end_at, e.version AS e_version,
                       (SELECT COUNT(*) FROM session_participants p WHERE p.session_id = s.id) AS participant_count,
                       (SELECT COUNT(*) FROM session_agenda_items a WHERE a.session_id = s.id) AS agenda_count,
                       (SELECT COUNT(*) FROM session_decisions d WHERE d.session_id = s.id) AS decision_count,
                       (SELECT COUNT(*) FROM session_entity_links l WHERE l.session_id = s.id) AS link_count,
                       (SELECT r.status FROM session_visit_reports r WHERE r.session_id = s.id) AS visit_report_status
                FROM sessions s
                LEFT JOIN companies c ON c.id = s.company_id
                LEFT JOIN users creator ON creator.id = s.created_by
                LEFT JOIN users canceller ON canceller.id = s.cancelled_by
                LEFT JOIN calendar_events e ON e.id = s.calendar_event_id";
    }

    /**
     * Rebuild a compact event row from the joined `e_*` aliases, so callers pass
     * it straight to SessionMapper::eventProjection().
     *
     * @param array<string,mixed> $row
     * @return array<string,mixed>|null
     */
    public static function eventFromRow(array $row): ?array
    {
        if (($row['calendar_event_id'] ?? null) === null || !isset($row['e_title'])) {
            return null;
        }
        return [
            'id' => (int)$row['calendar_event_id'],
            'company_id' => $row['company_id'],
            'title' => $row['e_title'],
            'category' => $row['e_category'],
            'status' => $row['e_status'],
            'all_day' => $row['e_all_day'],
            'timezone' => $row['e_timezone'],
            'location' => $row['e_location'],
            'start_date' => $row['e_start_date'],
            'end_date' => $row['e_end_date'],
            'start_at' => $row['e_start_at'],
            'end_at' => $row['e_end_at'],
            'version' => $row['e_version'],
        ];
    }
}
