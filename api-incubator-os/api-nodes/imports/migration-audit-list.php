<?php
include_once '../../config/Database.php';
include_once '../../models/User.php';
include_once '../../helpers/AuthGuard.php';
include_once '../../config/headers.php';

try {
    $db = (new Database())->connect();
    $authUser = auth_require_user($db);
    if (!auth_is_migration_admin($authUser)) {
        http_response_code(403);
        echo json_encode(['success'=>false,'error'=>'Forbidden — audit history requires System Administrator (Coordinator not permitted).']);
        exit;
    }
    $limit = (int)($_GET['limit'] ?? 20);
    $limit = max(1, min(100, $limit));
    $offset = (int)($_GET['offset'] ?? 0);
    // ensure table exists (migration should have created it)
    $stmt = $db->query("SELECT COUNT(*) FROM normalized_migration_audits");
    // fetch audits — include durable reporting columns
    $stmt = $db->prepare("SELECT id, user_id, user_email, user_role, action, company_ids, result_summary, errors, status, error_message, ip_address, operation_type, migration_key, title, description, environment, commit_sha, created_at FROM normalized_migration_audits ORDER BY created_at DESC LIMIT ? OFFSET ?");
    $stmt->bindValue(1, $limit, PDO::PARAM_INT);
    $stmt->bindValue(2, $offset, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    // decode JSON fields for frontend convenience
    foreach ($rows as &$r) {
        $r['company_ids'] = $r['company_ids'] ? json_decode($r['company_ids'], true) : [];
        $r['result_summary'] = $r['result_summary'] ? json_decode($r['result_summary'], true) : null;
        $r['errors'] = $r['errors'] ? json_decode($r['errors'], true) : null;
    }
    echo json_encode(['success'=>true,'audits'=>$rows], JSON_PRETTY_PRINT);
} catch (Throwable $e) {
    error_log("migration-audit-list failed: " . $e->getMessage() . " trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode(['success'=>false,'error'=>'Unable to load audit history. Please try again later.'], JSON_PRETTY_PRINT);
}
