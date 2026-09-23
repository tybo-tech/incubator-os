<?php
declare(strict_types=1);

/**
 * Calendar event persistence.
 *
 * Date-range reads return events that OVERLAP the requested window, not only
 * those whose start falls inside it:
 *
 *   timed:   start_at < :end AND end_at > :start
 *   all-day: start_date <= :end_date AND end_date >= :start_date
 *
 * Only live rows (deleted_at IS NULL) are ever returned.
 */
final class CalendarEventRepository
{
    /** @var array<string,bool> */
    private array $tableCache = [];

    public function __construct(private PDO $db) {}

    /**
     * Bounded range listing.
     *
     * @param array{
     *   startDate:string, endDate:string,
     *   companyId?:?int, includeSystem:bool,
     *   companyIds?:int[], category?:?string, status?:?string,
     *   search?:?string, assigneeUserId?:?int
     * } $filter
     * @return array<int,array<string,mixed>>
     */
    public function listByRange(int $tenantId, array $filter): array
    {
        $sql = "SELECT e.*, c.name AS company_name, u.full_name AS created_by_name
                FROM calendar_events e
                LEFT JOIN companies c ON c.id = e.company_id
                LEFT JOIN users u ON u.id = e.created_by
                WHERE e.tenant_id = :tenant
                  AND e.deleted_at IS NULL
                  AND (
                    (e.all_day = 1 AND e.start_date <= :end_date AND e.end_date >= :start_date)
                    OR
                    (e.all_day = 0 AND e.start_at < :end_at AND e.end_at > :start_at)
                  )";
        $params = [
            'tenant' => $tenantId,
            'start_date' => $filter['startDate'],
            'end_date' => $filter['endDate'],
            'start_at' => $filter['startDate'] . ' 00:00:00',
            'end_at' => $filter['endDate'] . ' 23:59:59',
        ];

        $companyId = $filter['companyId'] ?? null;
        if ($companyId !== null) {
            if (!empty($filter['includeSystem'])) {
                $sql .= " AND (e.company_id = :company OR e.company_id IS NULL)";
            } else {
                $sql .= " AND e.company_id = :company";
            }
            $params['company'] = $companyId;
        } elseif (!empty($filter['companyIds'])) {
            $ids = array_values(array_unique(array_map('intval', $filter['companyIds'])));
            $placeholders = [];
            foreach ($ids as $i => $id) {
                $placeholders[] = ":co$i";
                $params["co$i"] = $id;
            }
            $sql .= " AND (e.company_id IN (" . implode(',', $placeholders) . ") OR e.company_id IS NULL)";
        }

        if (!empty($filter['category'])) {
            $sql .= " AND e.category = :category";
            $params['category'] = $filter['category'];
        }
        if (!empty($filter['status'])) {
            $sql .= " AND e.status = :status";
            $params['status'] = $filter['status'];
        }
        if (!empty($filter['assigneeUserId'])) {
            $sql .= " AND e.assignee_user_id = :assignee";
            $params['assignee'] = (int)$filter['assigneeUserId'];
        }
        if (!empty($filter['search'])) {
            $sql .= " AND (e.title LIKE :search OR e.description LIKE :search OR e.location LIKE :search)";
            $params['search'] = '%' . $filter['search'] . '%';
        }

        $sql .= " ORDER BY e.all_day DESC, COALESCE(e.start_at, e.start_date) ASC, e.id ASC";

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
            "SELECT e.*, c.name AS company_name, u.full_name AS created_by_name
             FROM calendar_events e
             LEFT JOIN companies c ON c.id = e.company_id
             LEFT JOIN users u ON u.id = e.created_by
             WHERE e.id = :id AND e.tenant_id = :tenant AND e.deleted_at IS NULL"
        );
        $stmt->execute(['id' => $id, 'tenant' => $tenantId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Idempotency lookup: a previously-created event for the same creator + token.
     *
     * @return array<string,mixed>|null
     */
    public function findByClientToken(int $createdBy, string $token, int $tenantId): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM calendar_events
             WHERE created_by = :created_by AND client_token = :token AND tenant_id = :tenant
             LIMIT 1"
        );
        $stmt->execute(['created_by' => $createdBy, 'token' => $token, 'tenant' => $tenantId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * @param array<string,mixed> $data
     */
    public function create(array $data): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO calendar_events
                (tenant_id, company_id, created_by, updated_by, assignee_user_id, assignee_label,
                 title, description, category, status, all_day, timezone, location,
                 start_date, end_date, start_at, end_at, version, client_token)
             VALUES
                (:tenant_id, :company_id, :created_by, :updated_by, :assignee_user_id, :assignee_label,
                 :title, :description, :category, :status, :all_day, :timezone, :location,
                 :start_date, :end_date, :start_at, :end_at, 1, :client_token)"
        );
        $stmt->execute($this->bindings($data));
        return (int)$this->db->lastInsertId();
    }

    /**
     * Optimistic-concurrency update. Returns the number of rows affected; 0 means
     * the version did not match (stale write) or the row was removed concurrently.
     *
     * @param array<string,mixed> $data
     */
    public function update(int $id, int $tenantId, int $expectedVersion, array $data): int
    {
        $stmt = $this->db->prepare(
            "UPDATE calendar_events SET
                company_id = :company_id,
                updated_by = :updated_by,
                assignee_user_id = :assignee_user_id,
                assignee_label = :assignee_label,
                title = :title,
                description = :description,
                category = :category,
                status = :status,
                all_day = :all_day,
                timezone = :timezone,
                location = :location,
                start_date = :start_date,
                end_date = :end_date,
                start_at = :start_at,
                end_at = :end_at,
                version = version + 1
             WHERE id = :id AND tenant_id = :tenant AND deleted_at IS NULL AND version = :version"
        );
        $params = $this->bindings($data);
        $params['id'] = $id;
        $params['tenant'] = $tenantId;
        $params['version'] = $expectedVersion;
        unset($params['tenant_id'], $params['created_by'], $params['client_token']);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    public function softDelete(int $id, int $tenantId, int $deletedBy, int $expectedVersion): int
    {
        $stmt = $this->db->prepare(
            "UPDATE calendar_events
             SET deleted_at = UTC_TIMESTAMP(), deleted_by = :deleted_by, version = version + 1
             WHERE id = :id AND tenant_id = :tenant AND deleted_at IS NULL AND version = :version"
        );
        $stmt->execute([
            'deleted_by' => $deletedBy,
            'id' => $id,
            'tenant' => $tenantId,
            'version' => $expectedVersion,
        ]);
        return $stmt->rowCount();
    }

    /**
     * Set an event's status (used by the Sessions capability to cancel the linked
     * event when its Session is cancelled). Optimistic-concurrency guarded.
     */
    public function setStatus(int $id, int $tenantId, string $status, int $updatedBy, int $expectedVersion): int
    {
        $stmt = $this->db->prepare(
            "UPDATE calendar_events
             SET status = :status, updated_by = :updated_by, version = version + 1
             WHERE id = :id AND tenant_id = :tenant AND deleted_at IS NULL AND version = :version"
        );
        $stmt->execute([
            'status' => $status,
            'updated_by' => $updatedBy,
            'id' => $id,
            'tenant' => $tenantId,
            'version' => $expectedVersion,
        ]);
        return $stmt->rowCount();
    }

    /**
     * Map event id -> linked session id, for the given event ids.
     *
     * The `sessions` table belongs to the Sessions capability. When it is not
     * present (calendar deployed alone) this returns an empty map, so the calendar
     * works unchanged and simply never shows a Session indicator.
     *
     * @param int[] $eventIds
     * @return array<int,int>
     */
    public function sessionIdsForEvents(array $eventIds): array
    {
        if (!$eventIds || !$this->tableExists('sessions')) {
            return [];
        }
        $ids = array_values(array_unique(array_map('intval', $eventIds)));
        $placeholders = [];
        $params = [];
        foreach ($ids as $i => $id) {
            $placeholders[] = ":e$i";
            $params["e$i"] = $id;
        }
        $stmt = $this->db->prepare(
            "SELECT calendar_event_id, id FROM sessions
             WHERE calendar_event_id IN (" . implode(',', $placeholders) . ") AND deleted_at IS NULL"
        );
        $stmt->execute($params);
        $map = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
            $map[(int)$row['calendar_event_id']] = (int)$row['id'];
        }
        return $map;
    }

    /** Cached table existence check (one query per request). */
    private function tableExists(string $table): bool
    {
        if (array_key_exists($table, $this->tableCache)) {
            return $this->tableCache[$table];
        }
        try {
            $stmt = $this->db->prepare(
                "SELECT COUNT(*) FROM information_schema.TABLES
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t"
            );
            $stmt->execute(['t' => $table]);
            $exists = (int)$stmt->fetchColumn() > 0;
        } catch (Throwable) {
            $exists = false;
        }
        $this->tableCache[$table] = $exists;
        return $exists;
    }

    // ---------- links ----------

    /**
     * @return array<int,array<string,mixed>>
     */
    public function linksForEvent(int $eventId): array
    {
        $stmt = $this->db->prepare(
            "SELECT entity_type, entity_id, label FROM calendar_event_links
             WHERE calendar_event_id = :id ORDER BY id ASC"
        );
        $stmt->execute(['id' => $eventId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * @param array<int,array<string,mixed>> $links
     */
    public function replaceLinks(int $eventId, array $links, int $createdBy): void
    {
        $del = $this->db->prepare("DELETE FROM calendar_event_links WHERE calendar_event_id = :id");
        $del->execute(['id' => $eventId]);

        if (!$links) {
            return;
        }
        $ins = $this->db->prepare(
            "INSERT INTO calendar_event_links (calendar_event_id, entity_type, entity_id, label, created_by)
             VALUES (:event_id, :entity_type, :entity_id, :label, :created_by)"
        );
        foreach ($links as $link) {
            $ins->execute([
                'event_id' => $eventId,
                'entity_type' => $link['entityType'],
                'entity_id' => (int)$link['entityId'],
                'label' => $link['label'] ?? null,
                'created_by' => $createdBy,
            ]);
        }
    }

    /**
     * @param array<string,mixed> $data
     * @return array<string,mixed>
     */
    private function bindings(array $data): array
    {
        return [
            'tenant_id' => (int)$data['tenant_id'],
            'company_id' => $data['company_id'],
            'created_by' => (int)$data['created_by'],
            'updated_by' => $data['updated_by'] !== null ? (int)$data['updated_by'] : null,
            'assignee_user_id' => $data['assignee_user_id'] !== null ? (int)$data['assignee_user_id'] : null,
            'assignee_label' => $data['assignee_label'],
            'title' => $data['title'],
            'description' => $data['description'],
            'category' => $data['category'],
            'status' => $data['status'],
            'all_day' => $data['all_day'] ? 1 : 0,
            'timezone' => $data['timezone'],
            'location' => $data['location'],
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
            'start_at' => $data['start_at'],
            'end_at' => $data['end_at'],
            'client_token' => $data['client_token'] ?? null,
        ];
    }
}
