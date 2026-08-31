<?php
include_once '../../config/Database.php';
include_once '../../models/User.php';
include_once '../../helpers/AuthGuard.php';
include_once '../../config/headers.php';

try {
    $db = (new Database())->connect();
    $authUser = auth_require_user($db);
    if (!auth_is_admin($authUser)) {
        http_response_code(403);
        echo json_encode(['success'=>false,'error'=>'Forbidden — audit history requires System Administrator.']);
        exit;
    }
    $limit = (int)($_GET['limit'] ?? 20);
    $limit = max(1, min(100, $limit));
    $offset = (int)($_GET['offset'] ?? 0);
    // ensure table exists (migration should have created it)
    $stmt = $db->query("SELECT COUNT(*) FROM normalized_migration_audits");
    // fetch audits
    $stmt = $db->prepare("SELECT id, user_id, user_email, user_role, action, company_ids, result_summary, errors, status, error_message, ip_address, created_at FROM normalized_migration_audits ORDER BY created_at DESC LIMIT ? OFFSET ?");
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
    http_response_code(400);
    echo json_encode(['success'=>false,'error'=>$e->getMessage()], JSON_PRETTY_PRINT);
}
