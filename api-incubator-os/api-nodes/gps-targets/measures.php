<?php
include_once '../../config/Database.php';
include_once '../../models/User.php';
include_once '../../models/MetricTypeAccount.php';
include_once '../../helpers/AuthGuard.php';
include_once '../../config/headers.php';
/**
 * GET → measures (metric types) that have at least one GLOBAL account binding.
 *   ?company_id=N → additionally reports, per measure, how many accounts resolve for that
 *                   company and a `usable` flag.
 *
 * Read-only helper for the target popup measure-binding UI (Sprint 007 Phase 7).
 *
 * IMPORTANT: a global binding does NOT imply the measure is usable for a company. `usable`
 * is company-specific (it counts `resolveAccounts()` for `company_id`). Consumers must treat
 * a measure with no company accounts as unavailable / `no_accounts`, never as company-ready.
 */
try {
    $db = (new Database())->connect();
    $authUser = auth_require_user($db);
    $companyId = (int)($_GET['company_id'] ?? 0);
    if ($companyId) auth_require_company_access($authUser, $companyId);

    $stmt = $db->query("
        SELECT DISTINCT mt.id, mt.code, mt.name, mt.unit
        FROM metric_types mt
        JOIN metric_type_accounts mta ON mta.metric_type_id = mt.id
        ORDER BY mt.id ASC
    ");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $bindings = $companyId ? new MetricTypeAccount($db) : null;
    foreach ($rows as &$r) {
        $r['id'] = (int)$r['id'];
        if ($bindings !== null) {
            $accounts = $bindings->resolveAccounts((int)$r['id'], $companyId);
            $r['account_count'] = count($accounts);
            $r['usable'] = count($accounts) > 0;
        }
    }
    unset($r);
    echo json_encode($rows);
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
