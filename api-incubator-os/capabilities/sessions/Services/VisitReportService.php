<?php
declare(strict_types=1);

/**
 * Site-visit report lifecycle orchestration.
 *
 * Owns the rules the schema cannot: draft creation on first save, content
 * gating by status, issue (snapshot + version increment, atomically) and
 * acknowledgement bound to the exact issued version.
 *
 * TRANSACTIONS: the command handler owns the transaction; this service never
 * opens one. It is called inside `TransactionManager::execute()` so every write
 * in a single command commits or rolls back together — notably, an issue writes
 * the status change, the sign-off version stamp and the snapshot in one unit.
 *
 * AUDIT: every mutation appends a `session_activities` row with the actor
 * (visit.report.saved / .issued / .acknowledged / .section.changed /
 * .signoff.set / .signoff.cleared). Snapshot CONTENT is never logged.
 */
final class VisitReportService
{
    public function __construct(
        private VisitReportRepository $repo,
        private SessionRepository $sessions,
        private VisitReportValidator $validator,
        private VisitSnapshotBuilder $snapshot,
        private SessionAccessPolicy $policy,
    ) {}

    // ---------------------------------------------------------------- reads

    /**
     * Full report (or the empty draft shape) for a site_visit Session.
     *
     * @return VisitReportResponse
     */
    public function getBySession(int $sessionId): VisitReportResponse
    {
        $session = $this->requireSession($sessionId);
        $this->policy->assertCanViewSession($session);
        $this->validator->assertSiteVisitSession($session);

        $event = SessionRepository::eventFromRow($session);
        $report = $this->repo->findBySession($sessionId, $this->policy->tenantId());
        if (!$report) {
            return VisitReportMapper::emptyDraft($session, $event);
        }
        return $this->render($session, $report, $event);
    }

    /**
     * Company site-visit list with report summaries.
     *
     * @param array{reportStatus?:?string, visitKind?:?string, from?:?string, to?:?string, search?:?string} $filter
     * @return array<int,array<string,mixed>>
     */
    public function listByCompany(int $companyId, array $filter): array
    {
        $this->policy->assertCanAccessCompany($companyId);
        $rows = $this->repo->listByCompany($this->policy->tenantId(), [
            'companyId' => $companyId,
            'reportStatus' => $filter['reportStatus'] ?? null,
            'visitKind' => $filter['visitKind'] ?? null,
            'from' => $filter['from'] ?? null,
            'to' => $filter['to'] ?? null,
            'search' => $filter['search'] ?? null,
        ]);
        $out = [];
        foreach ($rows as $row) {
            $out[] = VisitReportMapper::toSummaryArray($row, SessionRepository::eventFromRow($row));
        }
        return $out;
    }

    /**
     * Issued snapshot metadata for a report.
     *
     * @return array<int,array<string,mixed>>
     */
    public function listVersions(int $sessionId): array
    {
        $session = $this->requireSession($sessionId);
        $this->policy->assertCanViewSession($session);
        $this->validator->assertSiteVisitSession($session);

        $report = $this->repo->findBySession($sessionId, $this->policy->tenantId());
        if (!$report) {
            return [];
        }

        $out = [];
        foreach ($this->repo->listVersions((int)$report['id']) as $v) {
            $out[] = [
                'versionNo' => (int)$v['version_no'],
                'issuedBy' => $v['issued_by'] !== null ? (int)$v['issued_by'] : null,
                'issuedByName' => $this->repo->userName($v['issued_by'] !== null ? (int)$v['issued_by'] : null),
                'issuedAt' => $v['issued_at'] !== null ? (string)$v['issued_at'] : null,
                'renderedDocRef' => $v['rendered_doc_ref'] !== null ? (string)$v['rendered_doc_ref'] : null,
            ];
        }
        return $out;
    }

    // ---------------------------------------------------------------- header save

    /**
     * Upsert the draft report header (creating the report on first save).
     *
     * @param array<string,mixed> $payload
     * @return VisitReportResponse
     */
    public function saveHeader(int $sessionId, array $payload): VisitReportResponse
    {
        $session = $this->requireSession($sessionId);
        $this->policy->assertCanModifySession($session);
        $this->validator->assertSiteVisitSession($session);

        $companyId = (int)$session['company_id'];
        $report = $this->repo->findBySession($sessionId, $this->policy->tenantId());
        if ($report) {
            VisitReportStateMachine::assertEditable((string)$report['status']);
        }

        $this->validator->validateHeader($payload);
        $this->assertEnrolment($payload['categoriesItemId'] ?? null, $companyId);
        $this->assertFollowUpSession($payload['followUpSessionId'] ?? null, $companyId, $sessionId);

        if (!$report) {
            $reportId = $this->repo->createDraft($sessionId, $companyId, $this->policy->tenantId(), $this->policy->actorId(), [
                'categoriesItemId' => $this->intOrNull($payload['categoriesItemId'] ?? null),
                'visitKind' => isset($payload['visitKind']) && $payload['visitKind'] !== null
                    ? (string)$payload['visitKind']
                    : VisitKind::SCHEDULED,
                'actualVisitDate' => $this->dateOrNull($payload['actualVisitDate'] ?? null),
                'actualLocation' => $this->nullable($payload['actualLocation'] ?? null),
                'operatingStatus' => $this->nullable($payload['operatingStatus'] ?? null),
                'nextVisitTargetDate' => $this->dateOrNull($payload['nextVisitTargetDate'] ?? null),
                'followUpMethod' => $this->nullable($payload['followUpMethod'] ?? null),
                'followUpSessionId' => $this->intOrNull($payload['followUpSessionId'] ?? null),
            ]);
            $report = $this->repo->findBySession($sessionId, $this->policy->tenantId());
            $this->log($sessionId, $companyId, 'visit.report.saved', 'Visit report created', ['reportId' => $reportId]);
        } else {
            $expected = (int)($payload['version'] ?? $report['version']);
            $affected = $this->repo->updateHeader((int)$report['id'], $this->policy->tenantId(), $expected, [
                // A field is only overwritten when the key is present: an absent
                // key keeps the stored value, while an explicit null clears it.
                'categoriesItemId' => array_key_exists('categoriesItemId', $payload)
                    ? $this->intOrNull($payload['categoriesItemId'])
                    : ($report['categories_item_id'] !== null ? (int)$report['categories_item_id'] : null),
                'visitKind' => array_key_exists('visitKind', $payload) && $payload['visitKind'] !== null
                    ? (string)$payload['visitKind']
                    : (string)$report['visit_kind'],
                'actualVisitDate' => array_key_exists('actualVisitDate', $payload)
                    ? $this->dateOrNull($payload['actualVisitDate'])
                    : ($report['actual_visit_date'] !== null ? (string)$report['actual_visit_date'] : null),
                'actualLocation' => array_key_exists('actualLocation', $payload)
                    ? $this->nullable($payload['actualLocation'])
                    : ($report['actual_location'] !== null ? (string)$report['actual_location'] : null),
                'operatingStatus' => array_key_exists('operatingStatus', $payload)
                    ? $this->nullable($payload['operatingStatus'])
                    : ($report['operating_status'] !== null ? (string)$report['operating_status'] : null),
                'nextVisitTargetDate' => array_key_exists('nextVisitTargetDate', $payload)
                    ? $this->dateOrNull($payload['nextVisitTargetDate'])
                    : ($report['next_visit_target_date'] !== null ? (string)$report['next_visit_target_date'] : null),
                'followUpMethod' => array_key_exists('followUpMethod', $payload)
                    ? $this->nullable($payload['followUpMethod'])
                    : ($report['follow_up_method'] !== null ? (string)$report['follow_up_method'] : null),
                'followUpSessionId' => array_key_exists('followUpSessionId', $payload)
                    ? $this->intOrNull($payload['followUpSessionId'])
                    : ($report['follow_up_session_id'] !== null ? (int)$report['follow_up_session_id'] : null),
                'updated_by' => $this->policy->actorId(),
            ]);
            if ($affected === 0) {
                throw new SessionConflictException(
                    'VISIT_STALE: This report was changed by someone else. Reload and try again.'
                );
            }
            $report = $this->repo->findBySession($sessionId, $this->policy->tenantId());
            $this->log($sessionId, $companyId, 'visit.report.saved', 'Visit report updated', ['reportId' => (int)$report['id']]);
        }

        return $this->render($session, $report, SessionRepository::eventFromRow($session));
    }

    // ---------------------------------------------------------------- sections

    /**
     * Manage one section's items: add | update | reorder | delete.
     *
     * @param array<string,mixed> $payload
     * @return VisitReportResponse
     */
    public function manageSection(int $sessionId, string $action, string $section, array $payload): VisitReportResponse
    {
        if (!VisitSection::isValid($section)) {
            throw new SessionValidationException(json_encode(['section' => 'Unknown section: ' . $section]) ?: 'Unknown section.');
        }

        $session = $this->requireSession($sessionId);
        $this->policy->assertCanModifySession($session);
        $this->validator->assertSiteVisitSession($session);

        $report = $this->requireDraftReport($sessionId);
        VisitReportStateMachine::assertEditable((string)$report['status']);
        $reportId = (int)$report['id'];
        $companyId = (int)$session['company_id'];

        switch ($action) {
            case 'add':
                $this->validator->validateItem($section, $payload);
                $this->repo->addItem($reportId, $section, [
                    'title' => trim((string)$payload['title']),
                    'detail' => $this->nullable($payload['detail'] ?? null),
                    'impact' => $this->nullable($payload['impact'] ?? null),
                    'created_by' => $this->policy->actorId(),
                ]);
                $this->log($sessionId, $companyId, 'visit.section.changed', 'Item added to ' . $section, ['section' => $section]);
                break;

            case 'update':
                $item = $this->requireItem($reportId, $payload);
                $this->validator->validateItem($section, $payload);
                $this->repo->updateItem((int)$item['id'], $reportId, [
                    'title' => trim((string)$payload['title']),
                    'detail' => $this->nullable($payload['detail'] ?? null),
                    'impact' => $this->nullable($payload['impact'] ?? null),
                ]);
                $this->log($sessionId, $companyId, 'visit.section.changed', 'Item updated in ' . $section, ['section' => $section]);
                break;

            case 'reorder':
                $ids = $payload['orderedIds'] ?? ($payload['ids'] ?? []);
                if (!is_array($ids) || !$ids) {
                    throw new SessionValidationException(json_encode([
                        'orderedIds' => 'An ordered list of item ids is required.',
                    ]) ?: 'An ordered list of item ids is required.');
                }
                $this->repo->reorderItems($reportId, $section, $ids);
                $this->log($sessionId, $companyId, 'visit.section.changed', 'Section reordered: ' . $section, ['section' => $section]);
                break;

            case 'delete':
                $item = $this->requireItem($reportId, $payload);
                $this->repo->removeItem((int)$item['id'], $reportId);
                $this->log($sessionId, $companyId, 'visit.section.changed', 'Item removed from ' . $section, ['section' => $section]);
                break;

            default:
                throw new SessionValidationException('Unknown section action: ' . $action);
        }

        $report = $this->repo->findBySession($sessionId, $this->policy->tenantId());
        return $this->render($session, $report ?? [], SessionRepository::eventFromRow($session));
    }

    // ---------------------------------------------------------------- sign-off

    /**
     * @param array<string,mixed> $payload
     * @return VisitReportResponse
     */
    public function manageSignoff(int $sessionId, string $action, array $payload): VisitReportResponse
    {
        $session = $this->requireSession($sessionId);
        $this->policy->assertCanModifySession($session);
        $this->validator->assertSiteVisitSession($session);

        $report = $this->requireDraftReport($sessionId);
        VisitReportStateMachine::assertEditable((string)$report['status']);
        $reportId = (int)$report['id'];
        $companyId = (int)$session['company_id'];

        $role = (string)($payload['role'] ?? '');
        switch ($action) {
            case 'set':
                $this->validator->validateSignoff($payload);
                $this->repo->upsertSignoff($reportId, $role, [
                    'name' => trim((string)$payload['name']),
                    'designation' => $this->nullable($payload['designation'] ?? null),
                    'signatureRef' => $this->nullable($payload['signatureRef'] ?? null),
                    'created_by' => $this->policy->actorId(),
                ]);
                $this->log($sessionId, $companyId, 'visit.signoff.set', 'Sign-off set for ' . $role, ['role' => $role]);
                break;

            case 'clear':
                if (!VisitSignoffRole::isValid($role)) {
                    throw new SessionValidationException(json_encode(['role' => 'Unknown sign-off role: ' . $role]) ?: 'Unknown sign-off role.');
                }
                $this->repo->clearSignoff($reportId, $role);
                $this->log($sessionId, $companyId, 'visit.signoff.cleared', 'Sign-off cleared for ' . $role, ['role' => $role]);
                break;

            default:
                throw new SessionValidationException('Unknown sign-off action: ' . $action);
        }

        $report = $this->repo->findBySession($sessionId, $this->policy->tenantId());
        return $this->render($session, $report ?? [], SessionRepository::eventFromRow($session));
    }

    // ---------------------------------------------------------------- issue

    /**
     * draft -> issued: validate, snapshot, increment version — atomically.
     *
     * @param array<string,mixed> $payload {version?}
     * @return VisitReportResponse
     */
    public function issue(int $sessionId, array $payload): VisitReportResponse
    {
        $session = $this->requireSession($sessionId);
        $this->policy->assertCanModifySession($session);
        $this->validator->assertSiteVisitSession($session);

        $report = $this->repo->findBySession($sessionId, $this->policy->tenantId());
        if (!$report) {
            throw new SessionNotFoundException('This site visit has no report to issue yet.');
        }
        VisitReportStateMachine::assertIssuable((string)$report['status']);
        $this->validator->assertIssuable($session, $report);

        $reportId = (int)$report['id'];
        $companyId = (int)$session['company_id'];
        $expected = (int)($payload['version'] ?? $report['version']);

        // The next version number is MAX(existing) + 1, so a retry can never
        // reuse a version even if `current_version` lagged. UNIQUE
        // (report_id, version_no) is the final backstop.
        $nextVersion = max((int)$report['current_version'], $this->repo->maxVersionNo($reportId)) + 1;

        $snapshotJson = json_encode(
            $this->snapshot->build($report, $session, SessionRepository::eventFromRow($session), [
                'id' => $this->policy->actorId(),
                'name' => $this->policy->actorName(),
            ], $nextVersion)
        );
        if ($snapshotJson === false) {
            throw new SessionConflictException('VISIT_SNAPSHOT_FAILED: The report snapshot could not be built.');
        }

        // Order: version row first (immutable audit anchor), then sign-off
        // version stamp, then the guarded status transition. The status
        // transition is guarded on BOTH status='draft' AND version, so two
        // concurrent issues cannot both succeed.
        $this->repo->insertVersion($reportId, $nextVersion, $snapshotJson, $this->policy->actorId());
        $this->repo->stampSignoffsVersion($reportId, $nextVersion);
        $affected = $this->repo->markIssued($reportId, $this->policy->tenantId(), $expected, $nextVersion, $this->policy->actorId());
        if ($affected === 0) {
            // Lost the race (or a stale version). The version row insert above is
            // rolled back with the transaction by the caller.
            $fresh = $this->repo->findBySession($sessionId, $this->policy->tenantId());
            if ($fresh && (string)$fresh['status'] !== VisitReportStatus::DRAFT) {
                throw new SessionConflictException('VISIT_ALREADY_ISSUED: This report has already been issued.');
            }
            throw new SessionConflictException('VISIT_STALE: This report was changed by someone else. Reload and try again.');
        }

        $this->log($sessionId, $companyId, 'visit.report.issued', 'Visit report issued', [
            'reportId' => $reportId,
            'version' => $nextVersion,
        ]);

        $report = $this->repo->findBySession($sessionId, $this->policy->tenantId());
        return $this->render($session, $report ?? [], SessionRepository::eventFromRow($session));
    }

    // ---------------------------------------------------------------- acknowledge

    /**
     * issued -> acknowledged, bound to the exact issued version.
     *
     * @param array<string,mixed> $payload {version?:int, reportVersion?:int}
     * @return VisitReportResponse
     */
    public function acknowledge(int $sessionId, array $payload): VisitReportResponse
    {
        $session = $this->requireSession($sessionId);
        $this->policy->assertCanModifySession($session);
        $this->validator->assertSiteVisitSession($session);

        $report = $this->repo->findBySession($sessionId, $this->policy->tenantId());
        if (!$report) {
            throw new SessionNotFoundException('This site visit has no report to acknowledge.');
        }
        VisitReportStateMachine::assertAcknowledgeable((string)$report['status']);

        // The caller may name the issued version they believe they are
        // acknowledging. It must match the report's current issued version, so an
        // acknowledgement can never silently apply to a different version.
        $requestedVersion = $this->intOrNull($payload['reportVersion'] ?? ($payload['issuedVersion'] ?? null));
        $currentVersion = (int)$report['current_version'];
        if ($requestedVersion !== null && $requestedVersion !== $currentVersion) {
            throw new SessionConflictException(
                'VISIT_VERSION_MISMATCH: This acknowledgement targets version ' . $requestedVersion
                . ' but the issued version is ' . $currentVersion . '.'
            );
        }

        $expected = (int)($payload['version'] ?? $report['version']);
        $affected = $this->repo->markAcknowledged(
            (int)$report['id'],
            $this->policy->tenantId(),
            $expected,
            $currentVersion,
            $this->policy->actorId()
        );
        if ($affected === 0) {
            throw new SessionConflictException('VISIT_STALE: This report was changed by someone else. Reload and try again.');
        }

        $this->log($sessionId, (int)$session['company_id'], 'visit.report.acknowledged', 'Visit report acknowledged', [
            'reportId' => (int)$report['id'],
            'version' => $currentVersion,
        ]);

        $report = $this->repo->findBySession($sessionId, $this->policy->tenantId());
        return $this->render($session, $report ?? [], SessionRepository::eventFromRow($session));
    }

    // ---------------------------------------------------------------- internals

    /**
     * @return array<string,mixed>
     */
    private function requireSession(int $sessionId): array
    {
        $session = $this->sessions->findById($sessionId, $this->policy->tenantId());
        if (!$session) {
            throw new SessionNotFoundException("Session $sessionId was not found.");
        }
        return $session;
    }

    /**
     * @return array<string,mixed>
     */
    private function requireDraftReport(int $sessionId): array
    {
        $report = $this->repo->findBySession($sessionId, $this->policy->tenantId());
        if (!$report) {
            throw new SessionNotFoundException('This site visit has no report yet. Save the report first.');
        }
        return $report;
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    private function requireItem(int $reportId, array $payload): array
    {
        $id = (int)($payload['id'] ?? 0);
        if ($id <= 0) {
            throw new SessionValidationException(json_encode(['id' => 'An item id is required.']) ?: 'An item id is required.');
        }
        $item = $this->repo->findItem($id, $reportId);
        if (!$item) {
            throw new SessionNotFoundException("Visit item $id was not found on this report.");
        }
        return $item;
    }

    private function assertEnrolment(mixed $categoriesItemId, int $companyId): void
    {
        $id = $this->intOrNull($categoriesItemId);
        if ($id === null) {
            return;
        }
        if ($this->repo->enrolment($id) === null) {
            throw new SessionNotFoundException("Enrolment $id was not found.");
        }
        if (!$this->repo->enrolmentBelongsToCompany($id, $companyId)) {
            throw new SessionForbiddenException('The enrolment belongs to a different company or is not active.');
        }
    }

    private function assertFollowUpSession(mixed $followUpSessionId, int $companyId, int $sessionId): void
    {
        $id = $this->intOrNull($followUpSessionId);
        if ($id === null) {
            return;
        }
        if ($id === $sessionId) {
            throw new SessionValidationException(json_encode([
                'followUpSessionId' => 'A visit cannot be its own follow-up.',
            ]) ?: 'Invalid follow-up Session.');
        }
        if (!$this->repo->sessionBelongsToCompany($id, $companyId)) {
            throw new SessionValidationException(json_encode([
                'followUpSessionId' => 'The follow-up Session must belong to the same company.',
            ]) ?: 'Invalid follow-up Session.');
        }
    }

    /**
     * @param array<string,mixed> $session
     * @param array<string,mixed> $report
     * @param array<string,mixed>|null $event
     */
    private function render(array $session, array $report, ?array $event): VisitReportResponse
    {
        if (!$report || !isset($report['id'])) {
            return VisitReportMapper::emptyDraft($session, $event);
        }
        $reportId = (int)$report['id'];
        $enrolment = $report['categories_item_id'] !== null
            ? $this->repo->enrolment((int)$report['categories_item_id'])
            : null;
        $followUp = $report['follow_up_session_id'] !== null
            ? $this->repo->followUpSession((int)$report['follow_up_session_id'])
            : null;

        return VisitReportMapper::toReport(
            $report,
            $session,
            $event,
            $this->repo->listItems($reportId),
            $this->repo->listSignoffs($reportId),
            $this->repo->linkedActions((int)$report['session_id']),
            $enrolment,
            $followUp,
            [
                'issuedByName' => $this->repo->userName($report['issued_by'] !== null ? (int)$report['issued_by'] : null),
                'acknowledgedByName' => $this->repo->userName($report['acknowledged_by'] !== null ? (int)$report['acknowledged_by'] : null),
            ],
        );
    }

    /**
     * @param array<string,mixed>|null $payload
     */
    private function log(int $sessionId, int $companyId, string $action, string $detail, ?array $payload = null): void
    {
        $this->sessions->logActivity(
            $sessionId,
            $companyId,
            $this->policy->actorId(),
            $this->policy->actorName(),
            $action,
            $detail,
            $payload
        );
    }

    private function nullable(mixed $v): ?string
    {
        if ($v === null) {
            return null;
        }
        $t = trim((string)$v);
        return $t === '' ? null : $t;
    }

    private function intOrNull(mixed $v): ?int
    {
        if ($v === null || $v === '') {
            return null;
        }
        $i = (int)$v;
        return $i > 0 ? $i : null;
    }

    private function dateOrNull(mixed $v): ?string
    {
        $t = $this->nullable($v);
        return $t !== null && CalendarValidator::isValidDate($t) ? $t : null;
    }
}
