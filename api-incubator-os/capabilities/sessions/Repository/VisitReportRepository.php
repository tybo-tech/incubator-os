<?php
declare(strict_types=1);

/**
 * Site-visit report persistence.
 *
 * A report is a sub-resource of a `site_visit` Session (one-to-one). This
 * repository owns ONLY the four visit tables introduced by migration #26; the
 * Session itself stays owned by SessionRepository.
 *
 * Two concurrency tokens, deliberately distinct:
 *   - `version`         optimistic concurrency for ANY mutation (content, status).
 *   - `current_version` the latest issued snapshot number (0 until issued).
 *
 * No transactions here: the calling command handler owns the transaction
 * (`TransactionManager`), so a nested transaction can never occur.
 */
final class VisitReportRepository
{
    public function __construct(private PDO $db) {}

    // ---------------------------------------------------------------- report reads

    /**
     * @return array<string,mixed>|null
     */
    public function findBySession(int $sessionId, int $tenantId): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM session_visit_reports WHERE session_id = :session AND tenant_id = :tenant"
        );
        $stmt->execute(['session' => $sessionId, 'tenant' => $tenantId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findById(int $id, int $tenantId): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM session_visit_reports WHERE id = :id AND tenant_id = :tenant"
        );
        $stmt->execute(['id' => $id, 'tenant' => $tenantId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Company site visits: every `site_visit` Session, with its report summary
     * LEFT JOINed (a visit Session may have no report row yet).
     *
     * The `e_*` aliases mirror SessionRepository::baseSelect so
     * `SessionRepository::eventFromRow()` can project the schedule.
     *
     * @param array{companyId:int, reportStatus?:?string, visitKind?:?string,
     *              from?:?string, to?:?string, search?:?string} $filter
     * @return array<int,array<string,mixed>>
     */
    public function listByCompany(int $tenantId, array $filter): array
    {
        $sql = "SELECT s.id AS session_id, s.company_id, s.calendar_event_id, s.subject,
                       s.status AS session_status, s.facilitator_label,
                       s.created_at AS session_created_at, s.updated_at AS session_updated_at,
                       c.name AS company_name,
                       r.id AS report_id, r.status AS report_status, r.visit_kind,
                       r.actual_visit_date, r.actual_location, r.current_version,
                       r.issued_at, r.created_at AS report_created_at, r.updated_at AS report_updated_at,
                       e.title AS e_title, e.category AS e_category, e.status AS e_status,
                       e.all_day AS e_all_day, e.timezone AS e_timezone, e.location AS e_location,
                       e.start_date AS e_start_date, e.end_date AS e_end_date,
                       e.start_at AS e_start_at, e.end_at AS e_end_at, e.version AS e_version
                FROM sessions s
                LEFT JOIN companies c ON c.id = s.company_id
                LEFT JOIN session_visit_reports r ON r.session_id = s.id
                LEFT JOIN calendar_events e ON e.id = s.calendar_event_id
                WHERE s.tenant_id = :tenant AND s.deleted_at IS NULL
                  AND s.session_type = 'site_visit' AND s.company_id = :company";
        $params = ['tenant' => $tenantId, 'company' => $filter['companyId']];

        if (!empty($filter['reportStatus'])) {
            if ($filter['reportStatus'] === 'none') {
                $sql .= " AND r.id IS NULL";
            } else {
                $sql .= " AND r.status = :report_status";
                $params['report_status'] = $filter['reportStatus'];
            }
        }
        if (!empty($filter['visitKind'])) {
            $sql .= " AND r.visit_kind = :visit_kind";
            $params['visit_kind'] = $filter['visitKind'];
        }
        if (!empty($filter['from'])) {
            $sql .= " AND COALESCE(r.actual_visit_date, e.start_date, DATE(e.start_at)) >= :from";
            $params['from'] = $filter['from'];
        }
        if (!empty($filter['to'])) {
            $sql .= " AND COALESCE(r.actual_visit_date, e.start_date, DATE(e.start_at)) <= :to";
            $params['to'] = $filter['to'];
        }
        if (!empty($filter['search'])) {
            $sql .= " AND (s.subject LIKE :search OR r.actual_location LIKE :search)";
            $params['search'] = '%' . $filter['search'] . '%';
        }

        $sql .= " ORDER BY COALESCE(r.actual_visit_date, e.start_date, DATE(e.start_at)) DESC,
                          s.id DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    // ---------------------------------------------------------------- report writes

    /**
     * Create the (single) draft report row for a site_visit Session, applying
     * the first-save header values so a create is a single write (version 1).
     *
     * @param array<string,mixed> $d normalised header values
     */
    public function createDraft(int $sessionId, int $companyId, int $tenantId, int $actorId, array $d = []): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO session_visit_reports
                (tenant_id, session_id, company_id, categories_item_id, visit_kind, actual_visit_date,
                 actual_location, operating_status, next_visit_target_date, follow_up_method,
                 follow_up_session_id, status, current_version, version, created_by, updated_by)
             VALUES (:tenant, :session, :company, :enrolment, :kind, :actual_date,
                 :actual_location, :operating_status, :next_date, :follow_up_method,
                 :follow_up_session, :status, 0, 1, :created_by, :updated_by)"
        );
        $stmt->execute([
            'tenant' => $tenantId,
            'session' => $sessionId,
            'company' => $companyId,
            'enrolment' => $d['categoriesItemId'] ?? null,
            'kind' => $d['visitKind'] ?? VisitKind::SCHEDULED,
            'actual_date' => $d['actualVisitDate'] ?? null,
            'actual_location' => $d['actualLocation'] ?? null,
            'operating_status' => $d['operatingStatus'] ?? null,
            'next_date' => $d['nextVisitTargetDate'] ?? null,
            'follow_up_method' => $d['followUpMethod'] ?? null,
            'follow_up_session' => $d['followUpSessionId'] ?? null,
            'status' => VisitReportStatus::DRAFT,
            'created_by' => $actorId,
            'updated_by' => $actorId,
        ]);
        return (int)$this->db->lastInsertId();
    }

    /**
     * Upsert the report HEADER with optimistic concurrency.
     *
     * @param array<string,mixed> $d
     * @return int rows affected (0 = stale version / row gone)
     */
    public function updateHeader(int $id, int $tenantId, int $expectedVersion, array $d): int
    {
        $stmt = $this->db->prepare(
            "UPDATE session_visit_reports SET
                categories_item_id = :enrolment,
                visit_kind = :kind,
                actual_visit_date = :actual_date,
                actual_location = :actual_location,
                operating_status = :operating_status,
                next_visit_target_date = :next_date,
                follow_up_method = :follow_up_method,
                follow_up_session_id = :follow_up_session,
                updated_by = :actor,
                version = version + 1
             WHERE id = :id AND tenant_id = :tenant AND status = 'draft' AND version = :version"
        );
        $stmt->execute([
            'enrolment' => $d['categoriesItemId'],
            'kind' => $d['visitKind'],
            'actual_date' => $d['actualVisitDate'],
            'actual_location' => $d['actualLocation'],
            'operating_status' => $d['operatingStatus'],
            'next_date' => $d['nextVisitTargetDate'],
            'follow_up_method' => $d['followUpMethod'],
            'follow_up_session' => $d['followUpSessionId'],
            'actor' => (int)$d['updated_by'],
            'id' => $id,
            'tenant' => $tenantId,
            'version' => $expectedVersion,
        ]);
        return $stmt->rowCount();
    }

    /**
     * Transition draft -> issued. Guarded on BOTH status and version, so two
     * concurrent issue requests cannot both win, and a retry after success
     * returns 0 rows (surfaced as VISIT_ALREADY_ISSUED).
     */
    public function markIssued(int $id, int $tenantId, int $expectedVersion, int $versionNo, int $actorId): int
    {
        $stmt = $this->db->prepare(
            "UPDATE session_visit_reports SET
                status = 'issued',
                current_version = :version_no,
                issued_by = :actor,
                issued_at = UTC_TIMESTAMP(),
                updated_by = :actor,
                version = version + 1
             WHERE id = :id AND tenant_id = :tenant AND status = 'draft' AND version = :version"
        );
        $stmt->execute([
            'version_no' => $versionNo,
            'actor' => $actorId,
            'id' => $id,
            'tenant' => $tenantId,
            'version' => $expectedVersion,
        ]);
        return $stmt->rowCount();
    }

    /**
     * Transition issued -> acknowledged, bound to the exact issued snapshot.
     */
    public function markAcknowledged(
        int $id,
        int $tenantId,
        int $expectedVersion,
        int $expectedCurrentVersion,
        int $actorId,
    ): int {
        $stmt = $this->db->prepare(
            "UPDATE session_visit_reports SET
                status = 'acknowledged',
                acknowledged_by = :actor,
                acknowledged_at = UTC_TIMESTAMP(),
                updated_by = :actor,
                version = version + 1
             WHERE id = :id AND tenant_id = :tenant AND status = 'issued'
               AND current_version = :current_version AND version = :version"
        );
        $stmt->execute([
            'actor' => $actorId,
            'id' => $id,
            'tenant' => $tenantId,
            'current_version' => $expectedCurrentVersion,
            'version' => $expectedVersion,
        ]);
        return $stmt->rowCount();
    }

    // ---------------------------------------------------------------- items

    /** @return array<int,array<string,mixed>> */
    public function listItems(int $reportId, ?string $section = null): array
    {
        $sql = "SELECT * FROM session_visit_items WHERE report_id = :report";
        $params = ['report' => $reportId];
        if ($section !== null) {
            $sql .= " AND section = :section";
            $params['section'] = $section;
        }
        $sql .= " ORDER BY section ASC, sort_order ASC, id ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /** @return array<string,mixed>|null */
    public function findItem(int $id, int $reportId): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM session_visit_items WHERE id = :id AND report_id = :report");
        $stmt->execute(['id' => $id, 'report' => $reportId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /** @param array<string,mixed> $d */
    public function addItem(int $reportId, string $section, array $d): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO session_visit_items
                (report_id, section, sort_order, title, detail, impact, created_by)
             VALUES (:report, :section, :sort, :title, :detail, :impact, :created_by)"
        );
        $stmt->execute([
            'report' => $reportId,
            'section' => $section,
            'sort' => $this->nextItemOrder($reportId, $section),
            'title' => $d['title'],
            'detail' => $d['detail'],
            'impact' => $d['impact'],
            'created_by' => $d['created_by'] ?? null,
        ]);
        return (int)$this->db->lastInsertId();
    }

    /** @param array<string,mixed> $d */
    public function updateItem(int $id, int $reportId, array $d): int
    {
        $stmt = $this->db->prepare(
            "UPDATE session_visit_items SET
                title = :title, detail = :detail, impact = :impact
             WHERE id = :id AND report_id = :report"
        );
        $stmt->execute([
            'title' => $d['title'],
            'detail' => $d['detail'],
            'impact' => $d['impact'],
            'id' => $id,
            'report' => $reportId,
        ]);
        return $stmt->rowCount();
    }

    public function removeItem(int $id, int $reportId): void
    {
        $item = $this->findItem($id, $reportId);
        $stmt = $this->db->prepare("DELETE FROM session_visit_items WHERE id = :id AND report_id = :report");
        $stmt->execute(['id' => $id, 'report' => $reportId]);
        if ($item) {
            $this->renumberItems($reportId, (string)$item['section']);
        }
    }

    /**
     * Reorder items within one section by an explicit ordered id list. Ids not
     * owned by the report (or belonging to another section) are ignored.
     *
     * @param int[] $orderedIds
     */
    public function reorderItems(int $reportId, string $section, array $orderedIds): void
    {
        $owned = [];
        foreach ($this->listItems($reportId, $section) as $item) {
            $owned[(int)$item['id']] = true;
        }
        $order = 0;
        $seen = [];
        $stmt = $this->db->prepare(
            "UPDATE session_visit_items SET sort_order = :sort
             WHERE id = :id AND report_id = :report AND section = :section"
        );
        foreach ($orderedIds as $rawId) {
            $id = (int)$rawId;
            if (!isset($owned[$id]) || isset($seen[$id])) {
                continue;
            }
            $seen[$id] = true;
            $stmt->execute(['sort' => $order++, 'id' => $id, 'report' => $reportId, 'section' => $section]);
        }
        foreach (array_keys($owned) as $id) {
            if (!isset($seen[$id])) {
                $stmt->execute(['sort' => $order++, 'id' => $id, 'report' => $reportId, 'section' => $section]);
            }
        }
    }

    private function nextItemOrder(int $reportId, string $section): int
    {
        $stmt = $this->db->prepare(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM session_visit_items
             WHERE report_id = :report AND section = :section"
        );
        $stmt->execute(['report' => $reportId, 'section' => $section]);
        return (int)$stmt->fetchColumn();
    }

    private function renumberItems(int $reportId, string $section): void
    {
        $order = 0;
        $stmt = $this->db->prepare("UPDATE session_visit_items SET sort_order = :sort WHERE id = :id");
        foreach ($this->listItems($reportId, $section) as $item) {
            $stmt->execute(['sort' => $order++, 'id' => (int)$item['id']]);
        }
    }

    // ---------------------------------------------------------------- sign-offs

    /** @return array<int,array<string,mixed>> */
    public function listSignoffs(int $reportId): array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM session_visit_signoffs WHERE report_id = :report ORDER BY id ASC"
        );
        $stmt->execute(['report' => $reportId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /** @return array<string,mixed>|null */
    public function findSignoff(int $reportId, string $role): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM session_visit_signoffs WHERE report_id = :report AND role = :role"
        );
        $stmt->execute(['report' => $reportId, 'role' => $role]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Upsert a sign-off for one role (UNIQUE (report_id, role)).
     *
     * `report_version_no` is deliberately NOT touched here: it stays NULL while
     * the report is a draft and is stamped to the issued version at issue time.
     */
    public function upsertSignoff(int $reportId, string $role, array $d): void
    {
        $stmt = $this->db->prepare(
            "INSERT INTO session_visit_signoffs
                (report_id, role, name, designation, signed_at, signature_ref, created_by)
             VALUES (:report, :role, :name, :designation, UTC_TIMESTAMP(), :signature_ref, :created_by)
             ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                designation = VALUES(designation),
                signature_ref = VALUES(signature_ref),
                signed_at = UTC_TIMESTAMP(),
                updated_at = UTC_TIMESTAMP()"
        );
        $stmt->execute([
            'report' => $reportId,
            'role' => $role,
            'name' => $d['name'],
            'designation' => $d['designation'],
            'signature_ref' => $d['signatureRef'],
            'created_by' => $d['created_by'] ?? null,
        ]);
    }

    public function clearSignoff(int $reportId, string $role): void
    {
        $stmt = $this->db->prepare(
            "DELETE FROM session_visit_signoffs WHERE report_id = :report AND role = :role"
        );
        $stmt->execute(['report' => $reportId, 'role' => $role]);
    }

    /**
     * Bind every collected sign-off to the exact issued version. Called inside
     * the issue transaction so an acknowledgement can never apply silently to a
     * later re-issue.
     */
    public function stampSignoffsVersion(int $reportId, int $versionNo): void
    {
        $stmt = $this->db->prepare(
            "UPDATE session_visit_signoffs
             SET report_version_no = :version_no, signed_at = COALESCE(signed_at, UTC_TIMESTAMP())
             WHERE report_id = :report"
        );
        $stmt->execute(['version_no' => $versionNo, 'report' => $reportId]);
    }

    // ---------------------------------------------------------------- versions

    /** @return array<int,array<string,mixed>> */
    public function listVersions(int $reportId): array
    {
        $stmt = $this->db->prepare(
            "SELECT id, report_id, version_no, rendered_doc_ref, issued_by, issued_at, created_at
             FROM session_visit_report_versions
             WHERE report_id = :report ORDER BY version_no DESC"
        );
        $stmt->execute(['report' => $reportId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /** @return array<string,mixed>|null */
    public function findVersion(int $reportId, int $versionNo): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM session_visit_report_versions WHERE report_id = :report AND version_no = :version"
        );
        $stmt->execute(['report' => $reportId, 'version' => $versionNo]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function maxVersionNo(int $reportId): int
    {
        $stmt = $this->db->prepare(
            "SELECT COALESCE(MAX(version_no), 0) FROM session_visit_report_versions WHERE report_id = :report"
        );
        $stmt->execute(['report' => $reportId]);
        return (int)$stmt->fetchColumn();
    }

    /**
     * Insert the immutable snapshot version. The UNIQUE (report_id, version_no)
     * key is the backstop against a duplicate version on a retry.
     */
    public function insertVersion(int $reportId, int $versionNo, string $snapshotJson, int $actorId): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO session_visit_report_versions
                (report_id, version_no, snapshot_json, issued_by, issued_at)
             VALUES (:report, :version_no, :snapshot, :actor, UTC_TIMESTAMP())"
        );
        $stmt->execute([
            'report' => $reportId,
            'version_no' => $versionNo,
            'snapshot' => $snapshotJson,
            'actor' => $actorId,
        ]);
        return (int)$this->db->lastInsertId();
    }

    // ---------------------------------------------------------------- supporting reads

    /** @return array<string,mixed>|null */
    public function companyProfile(int $companyId): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT id, name, trading_name, registration_no, description, service_offering,
                    bbbee_level, city, suburb, address, business_location, contact_person,
                    contact_number, email_address
             FROM companies WHERE id = :id"
        );
        $stmt->execute(['id' => $companyId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /** @return array<string,mixed>|null */
    public function enrolment(int $categoriesItemId): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT ci.id, ci.cohort_id, ci.program_id, ci.client_id, ci.company_id, ci.status,
                    co.name AS cohort_name, pr.name AS program_name
             FROM categories_item ci
             LEFT JOIN categories co ON co.id = ci.cohort_id
             LEFT JOIN categories pr ON pr.id = ci.program_id
             WHERE ci.id = :id"
        );
        $stmt->execute(['id' => $categoriesItemId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /** @return array<string,mixed>|null */
    public function followUpSession(int $sessionId): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT id, subject, status, company_id, session_type, calendar_event_id
             FROM sessions WHERE id = :id AND deleted_at IS NULL"
        );
        $stmt->execute(['id' => $sessionId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Linked actions (Targets and their tasks) for a Session — the execution
     * work the visit agreed to. Read from `session_entity_links`; labels are
     * resolved from the canonical tables.
     *
     * @return array<int,array<string,mixed>>
     */
    public function linkedActions(int $sessionId): array
    {
        $stmt = $this->db->prepare(
            "SELECT l.id AS link_id, l.entity_type, l.entity_id, l.relationship, l.label,
                    g.title AS target_title,
                    tk.title AS task_title
             FROM session_entity_links l
             LEFT JOIN gps_targets g
                ON l.entity_type = 'gps_target' AND g.id = l.entity_id
             LEFT JOIN gps_target_tasks tk
                ON l.entity_type = 'gps_target_task' AND tk.id = l.entity_id
             WHERE l.session_id = :session
               AND l.entity_type IN ('gps_target','gps_target_task')
             ORDER BY l.id ASC"
        );
        $stmt->execute(['session' => $sessionId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $out = [];
        foreach ($rows as $r) {
            $label = $r['label'] ?? null;
            if ($label === null) {
                $label = $r['entity_type'] === 'gps_target' ? $r['target_title'] : $r['task_title'];
            }
            $out[] = [
                'linkId' => (int)$r['link_id'],
                'entityType' => (string)$r['entity_type'],
                'entityId' => (int)$r['entity_id'],
                'relationship' => (string)$r['relationship'],
                'label' => $label !== null ? (string)$label : null,
            ];
        }
        return $out;
    }

    public function userName(?int $userId): ?string
    {
        if ($userId === null || $userId <= 0) {
            return null;
        }
        $stmt = $this->db->prepare("SELECT full_name FROM users WHERE id = :id");
        $stmt->execute(['id' => $userId]);
        $value = $stmt->fetchColumn();
        if ($value === false) {
            return null;
        }
        $name = trim((string)$value);
        return $name !== '' ? $name : null;
    }

    /** Does an `active` enrolment belong to this company? */
    public function enrolmentBelongsToCompany(int $categoriesItemId, int $companyId): bool
    {
        $stmt = $this->db->prepare(
            "SELECT 1 FROM categories_item WHERE id = :id AND company_id = :company AND status = 'active' LIMIT 1"
        );
        $stmt->execute(['id' => $categoriesItemId, 'company' => $companyId]);
        return (bool)$stmt->fetchColumn();
    }

    /** Does a follow-up Session exist in the same company? */
    public function sessionBelongsToCompany(int $sessionId, int $companyId): bool
    {
        $stmt = $this->db->prepare(
            "SELECT 1 FROM sessions WHERE id = :id AND company_id = :company AND deleted_at IS NULL LIMIT 1"
        );
        $stmt->execute(['id' => $sessionId, 'company' => $companyId]);
        return (bool)$stmt->fetchColumn();
    }
}
