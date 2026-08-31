<?php
declare(strict_types=1);

/**
 * Shared authorization guard for normalized SWOT/GPS endpoints.
 * Uses the same session pattern as api-nodes/user/invite-user.php and validate-session.php.
 *
 * - requireAuth(PDO $db): returns authenticated user array or exits 401
 * - requireCompanyAccess(array $user, int $companyId): exits 403 if user not allowed for that company
 *   Admin roles (System Administrator, Coordinator) can access any company.
 *   Regular users can only access their own company_id.
 * - requireTargetAccess(PDO $db, array $user, int $gpsTargetId): resolves target's company_id then checks.
 * - requireSwotAccess(PDO $db, array $user, int $swotAnalysisId|SwotItemId): similar.
 * - auth_enforce_request(PDO $db, array $user, array $input): generic check for company_id / gps_target_id / swot ids
 */

// Auto-start session before any headers are sent (when included before headers.php)
if (php_sapi_name() !== 'cli' && session_status() !== PHP_SESSION_ACTIVE) {
    // Only start if headers not already sent; otherwise auth_require_user will handle it
    if (!headers_sent()) {
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'domain' => '',
            'secure' => true,
            'httponly' => true,
            'samesite' => 'None',
        ]);
        @session_start();
    }
}
function auth_require_user(PDO $db): array
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'domain' => '',
            'secure' => true,
            'httponly' => true,
            'samesite' => 'None',
        ]);
        session_start();
    }

    $userId = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 0;
    if ($userId <= 0) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorised — no active session. Please log in.']);
        exit;
    }

    // Load user directly (avoid circular include of User model if not needed)
    // Use User model if available, else raw query
    if (class_exists('User')) {
        $u = new User($db);
        $row = $u->getById($userId);
    } else {
        $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    if (!$row || (isset($row['status']) && $row['status'] !== 'active' && $row['status'] !== 'invited')) {
        http_response_code(401);
        echo json_encode(['error' => 'Session expired or user inactive.']);
        exit;
    }

    return $row;
}

function auth_is_admin(array $user): bool
{
    $role = strtolower(trim((string)($user['role'] ?? '')));
    return in_array($role, ['system administrator','coordinator','admin'], true)
        || in_array($user['role'] ?? '', ['System Administrator','Coordinator'], true);
}

function auth_require_company_access(array $user, int $companyId): void
{
    if ($companyId <= 0) return; // nothing to check
    if (auth_is_admin($user)) return;
    $userCompanyId = (int)($user['company_id'] ?? 0);
    // 0 means no company assigned (staff) — deny by default unless admin
    if ($userCompanyId !== $companyId) {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden — you do not have access to this company.', 'company_id' => $companyId]);
        exit;
    }
}

function auth_require_target_access(PDO $db, array $user, int $gpsTargetId): array
{
    $stmt = $db->prepare("SELECT * FROM gps_targets WHERE id = ?");
    $stmt->execute([$gpsTargetId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => "gps_targets id $gpsTargetId not found"]);
        exit;
    }
    auth_require_company_access($user, (int)$row['company_id']);
    return $row;
}

function auth_require_swot_analysis_access(PDO $db, array $user, int $analysisId): array
{
    $stmt = $db->prepare("SELECT * FROM swot_analyses WHERE id = ?");
    $stmt->execute([$analysisId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => "swot_analyses id $analysisId not found"]);
        exit;
    }
    auth_require_company_access($user, (int)$row['company_id']);
    return $row;
}

function auth_require_swot_item_access(PDO $db, array $user, int $swotItemId): array
{
    $stmt = $db->prepare("SELECT si.*, sa.company_id FROM swot_items si JOIN swot_analyses sa ON sa.id = si.swot_analysis_id WHERE si.id = ?");
    $stmt->execute([$swotItemId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => "swot_items id $swotItemId not found"]);
        exit;
    }
    auth_require_company_access($user, (int)$row['company_id']);
    return $row;
}

/**
 * Generic request enforcer — checks whatever company/target/swot identifiers are present
 * in the merged input (GET + JSON body). Call after auth_require_user() in each endpoint.
 */
function auth_enforce_request(PDO $db, array $user, array $input = []): void
{
    // If input not yet read (auth called before json_decode), try to read body
    if (empty($input) && in_array($_SERVER['REQUEST_METHOD'] ?? '', ['POST','PUT','PATCH'])) {
        $raw = @file_get_contents('php://input');
        $json = json_decode($raw, true);
        if (is_array($json)) $input = array_merge($input, $json);
    }
    // Merge GET as fallback for read endpoints
    $merged = array_merge($_GET, $input);
    // company_id direct
    if (isset($merged['company_id']) && (int)$merged['company_id'] > 0) {
        auth_require_company_access($user, (int)$merged['company_id']);
    }
    // gps_target_id
    if (isset($merged['gps_target_id']) && (int)$merged['gps_target_id'] > 0) {
        auth_require_target_access($db, $user, (int)$merged['gps_target_id']);
    }
    // swot_analysis_id
    if (isset($merged['swot_analysis_id']) && (int)$merged['swot_analysis_id'] > 0) {
        auth_require_swot_analysis_access($db, $user, (int)$merged['swot_analysis_id']);
    }
    // swot_item_id
    if (isset($merged['swot_item_id']) && (int)$merged['swot_item_id'] > 0) {
        auth_require_swot_item_access($db, $user, (int)$merged['swot_item_id']);
    }
    // For endpoints that use generic `id` — try to infer via table check
    // We do not enforce here for ambiguous `id`; individual endpoints should call explicit check for get/update/delete
}
