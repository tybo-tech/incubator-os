<?php
declare(strict_types=1);

/**
 * GET company site visits (`?company_id=`) with their report summaries.
 *
 * Optional filters: report_status, visit_kind, from, to, search.
 * Company access is enforced inside the service before any read.
 */

include_once __DIR__ . '/../_bootstrap.php';

$companyId = (int)($_GET['company_id'] ?? 0);

try {
    $db = (new Database())->connect();
    $actor = auth_require_user($db);

    $result = (new ListCompanySiteVisits(
        sessions_visit_service($db, $actor),
    ))->execute(
        companyId: $companyId,
        reportStatus: isset($_GET['report_status']) && $_GET['report_status'] !== '' ? (string)$_GET['report_status'] : null,
        visitKind: isset($_GET['visit_kind']) && $_GET['visit_kind'] !== '' ? (string)$_GET['visit_kind'] : null,
        from: isset($_GET['from']) && $_GET['from'] !== '' ? (string)$_GET['from'] : null,
        to: isset($_GET['to']) && $_GET['to'] !== '' ? (string)$_GET['to'] : null,
        search: isset($_GET['search']) && $_GET['search'] !== '' ? (string)$_GET['search'] : null,
    );

    echo json_encode($result);
} catch (Throwable $e) {
    SessionErrorResponder::respond($e);
}
