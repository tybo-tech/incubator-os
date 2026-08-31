<?php
declare(strict_types=1);

/**
 * Node -> Normalized migrator
 *
 * Preserves `nodes` untouched. Migrates the LATEST meaningful node per company+type
 * (by updated_at) into swot_analyses/swot_items and gps_targets.
 * Duplicates (like 38 SWOT rows for company 11) are flagged, not merged.
 * GPS source links default to legacy_unlinked — no guessing via source_key.
 */
class NormalizedMigrator
{
    private PDO $conn;

    private const GPS_CATEGORIES = ['finance','sales_marketing','strategy_general','personal_development'];
    private const SWOT_MAP = [
        'strengths' => ['section'=>'internal','category'=>'strength'],
        'weaknesses' => ['section'=>'internal','category'=>'weakness'],
        'opportunities' => ['section'=>'external','category'=>'opportunity'],
        'threats' => ['section'=>'external','category'=>'threat'],
    ];

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /**
     * Resolved company_id: nodes.company_id when >0 else JSON data.company_id when >0.
     * Covers legacy rows 1946-1951 etc where column is NULL but JSON has "11".
     */
    private function resolveCompanyId(array $node): int
    {
        $col = (int)($node['company_id'] ?? 0);
        if ($col > 0) return $col;
        $raw = (string)($node['data'] ?? '');
        if ($raw === '') return 0;
        $data = json_decode($raw, true);
        if (!is_array($data)) return 0;
        // JSON may store "11" as string; cast to int
        $j = isset($data['company_id']) ? (int)$data['company_id'] : 0;
        return $j > 0 ? $j : 0;
    }

    /**
     * Migrate selected companies to normalized tables.
     * @param int[] $companyIds empty = all companies (not recommended for first run)
     * @param bool $dryRun if true, rolls back at end and reports what would happen
     * @return array summary
     */
    public function migrate(array $companyIds = [], bool $dryRun = false): array
    {
        $companyIds = array_map('intval', $companyIds);
        $summary = [
            'dry_run' => $dryRun,
            'started_at' => date('c'),
            'company_filter' => $companyIds,
            'swot' => ['nodes_seen'=>0,'nodes_selected'=>0,'nodes_skipped_duplicates'=>0,'analyses_created'=>0,'items_created'=>0,'items_skipped_empty'=>0,'errors'=>[]],
            'gps' => ['nodes_seen'=>0,'nodes_selected'=>0,'nodes_skipped_duplicates'=>0,'targets_created'=>0,'targets_skipped_empty'=>0,'sources_created'=>0,'errors'=>[]],
            'duplicates_flagged' => [],
            'companies_processed' => [],
        ];

        $this->conn->beginTransaction();
        try {
            // --- SWOT migration ---
            $swotNodes = $this->fetchNodes('swot_analysis', $companyIds);
            $summary['swot']['nodes_seen'] = count($swotNodes);
            $selectedSwot = $this->selectLatestPerCompany($swotNodes);
            $summary['swot']['nodes_selected'] = count($selectedSwot);
            $summary['swot']['nodes_skipped_duplicates'] = $summary['swot']['nodes_seen'] - $summary['swot']['nodes_selected'];
            foreach ($this->duplicateInfo($swotNodes) as $dup) $summary['duplicates_flagged'][] = $dup;

            foreach ($selectedSwot as $node) {
                $sp = 'sp_swot_' . (int)$node['id'];
                $this->conn->exec("SAVEPOINT $sp");
                $rcid = $this->resolveCompanyId($node);
                try {
                    $res = $this->migrateSwotNode($node);
                    $summary['swot']['analyses_created'] += $res['analyses'];
                    $summary['swot']['items_created'] += $res['items_created'];
                    $summary['swot']['items_skipped_empty'] += $res['items_skipped'];
                    $summary['companies_processed'][$rcid] = true;
                    $this->conn->exec("RELEASE SAVEPOINT $sp");
                } catch (Throwable $e) {
                    $this->conn->exec("ROLLBACK TO SAVEPOINT $sp");
                    $this->conn->exec("RELEASE SAVEPOINT $sp");
                    $summary['swot']['errors'][] = ['node_id'=>$node['id'],'company_id'=>$rcid,'error'=>$e->getMessage()];
                }
            }

            // --- GPS migration ---
            $gpsNodes = $this->fetchNodes('gps_targets', $companyIds);
            $summary['gps']['nodes_seen'] = count($gpsNodes);
            $selectedGps = $this->selectLatestPerCompany($gpsNodes);
            $summary['gps']['nodes_selected'] = count($selectedGps);
            $summary['gps']['nodes_skipped_duplicates'] = $summary['gps']['nodes_seen'] - $summary['gps']['nodes_selected'];
            foreach ($this->duplicateInfo($gpsNodes) as $dup) {
                if (!in_array($dup, $summary['duplicates_flagged'])) $summary['duplicates_flagged'][] = $dup;
            }

            foreach ($selectedGps as $node) {
                $sp = 'sp_gps_' . (int)$node['id'];
                $this->conn->exec("SAVEPOINT $sp");
                $rcid = $this->resolveCompanyId($node);
                try {
                    $res = $this->migrateGpsNode($node);
                    $summary['gps']['targets_created'] += $res['targets_created'];
                    $summary['gps']['targets_skipped_empty'] += $res['targets_skipped'];
                    $summary['gps']['sources_created'] += $res['sources_created'];
                    $summary['companies_processed'][$rcid] = true;
                    $this->conn->exec("RELEASE SAVEPOINT $sp");
                } catch (Throwable $e) {
                    $this->conn->exec("ROLLBACK TO SAVEPOINT $sp");
                    $this->conn->exec("RELEASE SAVEPOINT $sp");
                    $summary['gps']['errors'][] = ['node_id'=>$node['id'],'company_id'=>$rcid,'error'=>$e->getMessage()];
                }
            }

            $summary['companies_processed'] = array_keys($summary['companies_processed']);
            sort($summary['companies_processed']);

            if ($dryRun) {
                $this->conn->rollBack();
                $summary['rolled_back'] = true;
            } else {
                $this->conn->commit();
                $summary['rolled_back'] = false;
            }
            $summary['finished_at'] = date('c');
            return $summary;
        } catch (Throwable $e) {
            $this->conn->rollBack();
            throw new RuntimeException("NormalizedMigrator failed: " . $e->getMessage(), 0, $e);
        }
    }

    /** Preview what would be migrated without writing */
    public function preview(array $companyIds = []): array
    {
        return $this->migrate($companyIds, true);
    }

    /**
     * Clear normalized data for given companies (for re-migrate).
     * PROTECTED: CLI / dev-only. Production should create new batches, not delete live data.
     * Requires either CLI execution or ALLOW_DESTRUCTIVE_MIGRATION=true env flag.
     */
    public function clearForCompanies(array $companyIds): array
    {
        if (!$companyIds) throw new InvalidArgumentException("companyIds required for clear");
        // Guard: only allow from CLI or explicit dev flag
        $isCli = php_sapi_name() === 'cli';
        $allowFlag = getenv('ALLOW_DESTRUCTIVE_MIGRATION') === 'true' || ($_ENV['ALLOW_DESTRUCTIVE_MIGRATION'] ?? '') === 'true';
        if (!$isCli && !$allowFlag) {
            throw new RuntimeException("clearForCompanies is CLI/dev-only. Set ALLOW_DESTRUCTIVE_MIGRATION=true for controlled re-migration, or use a new migration batch for production.");
        }
        $companyIds = array_map('intval', $companyIds);
        $in = implode(',', array_fill(0, count($companyIds), '?'));
        $this->conn->beginTransaction();
        try {
            // gps in dependency order
            $this->conn->prepare("DELETE gts FROM gps_target_sources gts JOIN gps_targets gt ON gt.id = gts.gps_target_id WHERE gt.company_id IN ($in)")->execute($companyIds);
            $this->conn->prepare("DELETE gtt FROM gps_target_tasks gtt JOIN gps_targets gt ON gt.id = gtt.gps_target_id WHERE gt.company_id IN ($in)")->execute($companyIds);
            $this->conn->prepare("DELETE gtu FROM gps_target_updates gtu JOIN gps_targets gt ON gt.id = gtu.gps_target_id WHERE gt.company_id IN ($in)")->execute($companyIds);
            $this->conn->prepare("DELETE gtm FROM gps_target_metrics gtm JOIN gps_targets gt ON gt.id = gtm.gps_target_id WHERE gt.company_id IN ($in)")->execute($companyIds);
            $stmt = $this->conn->prepare("DELETE FROM gps_targets WHERE company_id IN ($in)");
            $stmt->execute($companyIds);
            $gpsDeleted = $stmt->rowCount();

            // swot
            $this->conn->prepare("DELETE si FROM swot_items si JOIN swot_analyses sa ON sa.id = si.swot_analysis_id WHERE sa.company_id IN ($in)")->execute($companyIds);
            $stmt2 = $this->conn->prepare("DELETE FROM swot_analyses WHERE company_id IN ($in)");
            $stmt2->execute($companyIds);
            $swotDeleted = $stmt2->rowCount();

            $this->conn->commit();
            return ['gps_targets_deleted'=>$gpsDeleted, 'swot_analyses_deleted'=>$swotDeleted, 'companies'=>$companyIds];
        } catch (Throwable $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }

    // -----------------------------------------------------------------
    // Internals
    // -----------------------------------------------------------------

    private function fetchNodes(string $type, array $companyIds): array
    {
        if ($companyIds) {
            $in = implode(',', array_fill(0, count($companyIds), '?'));
            // Include JSON fallback so rows with NULL column but data.company_id=11 are found for --companyIds=11.
            // Example legacy rows 1946-1951: company_id NULL, data->company_id "11".
            $sql = "SELECT * FROM nodes WHERE type = ? AND (company_id IN ($in) OR CAST(JSON_UNQUOTE(JSON_EXTRACT(data, '$.company_id')) AS UNSIGNED) IN ($in)) ORDER BY updated_at ASC";
            $stmt = $this->conn->prepare($sql);
            // type + col filter + json filter
            $stmt->execute(array_merge([$type], $companyIds, $companyIds));
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            // Narrow to exact resolved match: column>0 ? column : json
            $rows = array_values(array_filter($rows, function (array $r) use ($companyIds): bool {
                return in_array($this->resolveCompanyId($r), $companyIds, true);
            }));
            return $rows;
        } else {
            $stmt = $this->conn->prepare("SELECT * FROM nodes WHERE type = ? ORDER BY updated_at ASC");
            $stmt->execute([$type]);
        }
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        // decode data lazily in caller
        return $rows;
    }

    /** @return array<int, array> latest row per company — uses resolved company_id (column>0 ? column : json) */
    private function selectLatestPerCompany(array $rows): array
    {
        $latest = [];
        foreach ($rows as $row) {
            $cid = $this->resolveCompanyId($row);
            if ($cid === 0) continue; // skip orphaned rows with no company
            // keep latest by updated_at (rows are ordered ASC, so overwrite)
            $latest[$cid] = $row;
        }
        return array_values($latest);
    }

    private function duplicateInfo(array $rows): array
    {
        $byCompany = [];
        foreach ($rows as $r) {
            $cid = $this->resolveCompanyId($r);
            if ($cid === 0) $cid = 0;
            $byCompany[$cid][] = $r;
        }
        $out = [];
        foreach ($byCompany as $cid => $grp) {
            if (count($grp) > 1) {
                $out[] = ['company_id'=>$cid,'total_nodes'=>count($grp),'selected_node_id'=>(int)end($grp)['id'],'all_ids'=>array_map(fn($x)=>(int)$x['id'],$grp),'hint'=>'autosave/version duplicates — only latest migrated'];
            }
        }
        return $out;
    }

    private function migrateSwotNode(array $node): array
    {
        $data = json_decode((string)$node['data'], true);
        if (!is_array($data)) $data = [];
        $companyId = $this->resolveCompanyId($node);
        if ($companyId === 0) throw new RuntimeException("SWOT node {$node['id']} has no resolvable company_id (column and JSON both empty)");
        $legacyNodeId = (int)$node['id'];

        // Check if already migrated (idempotency: legacy_node_id unique per company)
        $chk = $this->conn->prepare("SELECT id FROM swot_analyses WHERE legacy_node_id = ? LIMIT 1");
        $chk->execute([$legacyNodeId]);
        if ($chk->fetchColumn()) {
            return ['analyses'=>0,'items_created'=>0,'items_skipped'=>0];
        }

        $analysisDate = $data['analysis_date'] ?? $data['last_updated'] ?? $node['updated_at'] ?? $node['created_at'] ?? date('Y-m-d H:i:s');
        $summary = $data['summary'] ?? null;
        $isComplete = !empty($data['is_complete']);
        $status = $isComplete ? 'completed' : 'draft';

        // Ensure only one current per company: new one becomes current if none exists
        $curChk = $this->conn->prepare("SELECT id FROM swot_analyses WHERE company_id = ? AND is_current = 1 LIMIT 1");
        $curChk->execute([$companyId]);
        $hasCurrent = (bool)$curChk->fetchColumn();
        $isCurrent = $hasCurrent ? 0 : 1;

        $stmt = $this->conn->prepare("INSERT INTO swot_analyses (company_id, analysis_date, summary, status, is_current, legacy_node_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $companyId,
            $this->toDateTime($analysisDate),
            $summary,
            $status,
            $isCurrent,
            $legacyNodeId,
            $node['created_at'] ?? date('Y-m-d H:i:s'),
            $node['updated_at'] ?? date('Y-m-d H:i:s'),
        ]);
        $analysisId = (int)$this->conn->lastInsertId();
        $itemsCreated = 0; $itemsSkipped = 0;

        // Extract 4 quadrants — now with legacy_path for deterministic identity
        $extracted = $this->extractSwotItems($data);
        foreach ($extracted as $item) {
            if (empty(trim((string)($item['description'] ?? ''))) ) { $itemsSkipped++; continue; }
            // Skip obvious junk: single char or placeholder numbers like "1","12","123","S"
            $desc = trim((string)$item['description']);
            if ($this->isJunkDescription($desc)) { $itemsSkipped++; continue; }

            $legacyPath = $item['legacy_path'] ?? null;
            // Idempotency via legacy_path + swot_analysis_id (UNIQUE)
            if ($legacyPath) {
                $chk = $this->conn->prepare("SELECT id FROM swot_items WHERE swot_analysis_id = ? AND legacy_path = ? LIMIT 1");
                $chk->execute([$analysisId, $legacyPath]);
                if ($chk->fetchColumn()) { $itemsSkipped++; continue; }
            }
            $stmt2 = $this->conn->prepare("INSERT INTO swot_items (swot_analysis_id, category, description, impact, priority, status, recommended_response, owner_user_id, owner_label, target_date, date_added, legacy_source_key, legacy_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt2->execute([
                $analysisId,
                $item['category'],
                $desc,
                $this->normalizeEnum($item['impact'] ?? 'medium', ['low','medium','high','critical'], 'medium'),
                $this->normalizeEnum($item['priority'] ?? 'medium', ['low','medium','high','critical'], 'medium'),
                strtolower(trim((string)($item['status'] ?? 'identified'))),
                $item['recommended_response'] ?? $item['action_required'] ?? null,
                null, // owner_user_id — resolve later
                $item['assigned_to'] ?? $item['owner_label'] ?? null,
                $this->toDate($item['target_date'] ?? null),
                $this->toDateTime($item['date_added'] ?? null),
                $item['source_key'] ?? null,
                $legacyPath,
            ]);
            $itemsCreated++;
        }

        return ['analyses'=>1,'items_created'=>$itemsCreated,'items_skipped'=>$itemsSkipped];
    }

    private function extractSwotItems(array $data): array
    {
        $out = [];
        // Primary shape: internal {strengths, weaknesses}, external {opportunities, threats}
        $quadrants = [
            ['path'=>['internal','strengths'],'category'=>'strength','legacy_prefix'=>'internal.strengths'],
            ['path'=>['internal','weaknesses'],'category'=>'weakness','legacy_prefix'=>'internal.weaknesses'],
            ['path'=>['external','opportunities'],'category'=>'opportunity','legacy_prefix'=>'external.opportunities'],
            ['path'=>['external','threats'],'category'=>'threat','legacy_prefix'=>'external.threats'],
        ];
        foreach ($quadrants as $q) {
            $arr = $data[$q['path'][0]][$q['path'][1]] ?? null;
            if (!is_array($arr)) continue;
            foreach ($arr as $idx => $item) {
                if (!is_array($item)) continue;
                $out[] = [
                    'category' => $q['category'],
                    'description' => $item['description'] ?? '',
                    'impact' => $item['impact'] ?? 'medium',
                    'priority' => $item['priority'] ?? 'medium',
                    'status' => $item['status'] ?? 'identified',
                    'recommended_response' => $item['action_required'] ?? $item['recommended_response'] ?? null,
                    'action_required' => $item['action_required'] ?? null,
                    'assigned_to' => $item['assigned_to'] ?? null,
                    'target_date' => $item['target_date'] ?? null,
                    'date_added' => $item['date_added'] ?? null,
                    'source_key' => $item['source_key'] ?? null,
                    'legacy_path' => $q['legacy_prefix'] . "[$idx]",
                ];
            }
        }
        return $out;
    }

    private function migrateGpsNode(array $node): array
    {
        $data = json_decode((string)$node['data'], true);
        if (!is_array($data)) $data = [];
        $companyId = $this->resolveCompanyId($node);
        if ($companyId === 0) throw new RuntimeException("GPS node {$node['id']} has no resolvable company_id (column and JSON both empty)");
        $legacyNodeId = (int)$node['id'];

        $targetsCreated = 0; $targetsSkipped = 0; $sourcesCreated = 0;

        foreach (self::GPS_CATEGORIES as $cat) {
            $targets = $data[$cat]['targets'] ?? null;
            if (!is_array($targets)) continue;
            foreach ($targets as $idx => $t) {
                if (!is_array($t)) continue;
                $desc = trim((string)($t['description'] ?? ''));
                if ($desc === '' || $this->isJunkDescription($desc)) { $targetsSkipped++; continue; }

                $legacyPath = "$cat.targets[$idx]";
                // Idempotency via legacy_node_id + legacy_path (UNIQUE), not description
                $chk = $this->conn->prepare("SELECT id FROM gps_targets WHERE legacy_node_id = ? AND legacy_path = ? LIMIT 1");
                $chk->execute([$legacyNodeId, $legacyPath]);
                if ($chk->fetchColumn()) { $targetsSkipped++; continue; }

                $title = trim((string)($t['title'] ?? ''));
                if ($title === '') $title = mb_substr($desc, 0, 80);
                if (mb_strlen($title) > 255) $title = mb_substr($title, 0, 252) . '...';

                $status = $this->mapGpsStatus($t['status'] ?? 'not_started');
                $priority = $this->normalizeEnum($t['priority'] ?? 'medium', ['low','medium','high','critical'], 'medium');
                $impact = isset($t['impact']) ? $this->normalizeEnum($t['impact'], ['low','medium','high','critical'], 'medium') : null;
                $dueDate = $this->toDate($t['due_date'] ?? $t['target_date'] ?? null);
                $progress = isset($t['progress_percentage']) ? (float)$t['progress_percentage'] : 0;
                $evidence = $t['evidence'] ?? $t['success_evidence_required'] ?? null;
                $assigned = $t['assigned_to'] ?? $t['owner_label'] ?? null;

                $stmt = $this->conn->prepare("INSERT INTO gps_targets (company_id, category, title, description, priority, impact, status, owner_user_id, owner_label, due_date, progress_mode, manual_progress_percentage, success_evidence_required, legacy_node_id, legacy_path, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?, ?, ?, ?, ?, ?, ?)");
                $completedAt = $status === 'completed' ? date('Y-m-d H:i:s') : null;
                $createdAt = $this->toDateTime($t['date_added'] ?? $node['created_at'] ?? null) ?? date('Y-m-d H:i:s');
                $updatedAt = $this->toDateTime($node['updated_at'] ?? null) ?? date('Y-m-d H:i:s');
                $stmt->execute([
                    $companyId,
                    $cat,
                    $title,
                    $desc,
                    $priority,
                    $impact,
                    $status,
                    null, // owner_user_id
                    $assigned,
                    $dueDate,
                    $progress,
                    $evidence,
                    $legacyNodeId,
                    $legacyPath,
                    $completedAt,
                    $createdAt,
                    $updatedAt,
                ]);
                $gpsId = (int)$this->conn->lastInsertId();
                $targetsCreated++;

                // Create legacy_unlinked source so every target is accounted for
                $stmt2 = $this->conn->prepare("INSERT INTO gps_target_sources (gps_target_id, source_type, notes) VALUES (?, 'legacy_unlinked', ?)");
                $hint = isset($t['source_key']) ? "Migrated from nodes#{$legacyNodeId} source_key={$t['source_key']} — needs manual linking to swot_item" : "Migrated from nodes#{$legacyNodeId} — no source_key";
                $stmt2->execute([$gpsId, $hint]);
                $sourcesCreated++;
            }
        }

        return ['targets_created'=>$targetsCreated,'targets_skipped'=>$targetsSkipped,'sources_created'=>$sourcesCreated];
    }

    private function isJunkDescription(string $desc): bool
    {
        $d = trim($desc);
        if (mb_strlen($d) < 3) return true;
        // placeholder numbers
        if (preg_match('/^\d{1,4}$/', $d)) return true;
        // single letter or repeated char
        if (preg_match('/^(.)\1{0,3}$/', $d)) return true;
        // known placeholders
        $lower = strtolower($d);
        if (in_array($lower, ['s','sge','sgi','sgiant','1','12','123','test','null','undefined'], true)) return true;
        if (str_contains($lower, 'analyze your business') && mb_strlen($d) < 80) return true;
        return false;
    }

    private function mapGpsStatus(mixed $s): string
    {
        $map = [
            'not_started'=>'not_started','notstarted'=>'not_started','identified'=>'not_started',
            'in_progress'=>'in_progress','inprogress'=>'in_progress','planning'=>'in_progress',
            'at_risk'=>'at_risk','atrisk'=>'at_risk',
            'completed'=>'completed','done'=>'completed',
            'cancelled'=>'cancelled','canceled'=>'cancelled',
        ];
        $k = strtolower(trim((string)$s));
        $k = str_replace([' ', '-'], '_', $k);
        return $map[$k] ?? 'not_started';
    }

    private function normalizeEnum(mixed $v, array $allowed, string $def): string
    {
        $v = strtolower(trim((string)$v));
        return in_array($v, $allowed, true) ? $v : $def;
    }

    private function toDate(mixed $v): ?string
    {
        if (empty($v)) return null;
        try { return (new DateTime((string)$v))->format('Y-m-d'); } catch (Throwable) { return null; }
    }

    private function toDateTime(mixed $v): ?string
    {
        if (empty($v)) return null;
        try { return (new DateTime((string)$v))->format('Y-m-d H:i:s'); } catch (Throwable) { return null; }
    }
}
