<?php
include_once '../../config/Database.php';
include_once '../../models/NormalizedMigrator.php';
include_once '../../models/User.php';
include_once '../../helpers/AuthGuard.php';
include_once '../../config/headers.php';

/**
 * Normalized migration — Admin HTTP endpoint (Apache-only production)
 *
 * Sprint 005 hardening (final):
 *  preview — System Administrator, POST, explicit companyIds
 *  migrate — System Administrator, POST, explicit companyIds + confirm="MIGRATE_NORMALIZED_SWOT_GPS"
 *  clear, migrate-all — CLI-only (this endpoint rejects HTTP)
 *  migrate via GET is rejected; ALLOW_HTTP_MIGRATE removed (admin is the gate, not an env flag)
 *  Every preview/migrate is audit-logged to normalized_migration_audits for the future Admin UI.
 */

function audit_migration(PDO $db, ?array $authUser, string $action, array $companyIds, ?string $confirm, array $result, string $status, ?string $errorMessage): void
{
    try {
        // Ensure table exists (migration may not have run yet in dev) — best-effort
        $db->exec("CREATE TABLE IF NOT EXISTS `normalized_migration_audits` (
          `id` BIGINT NOT NULL AUTO_INCREMENT,
          `user_id` INT DEFAULT NULL,
          `user_email` VARCHAR(255) DEFAULT NULL,
          `user_role` VARCHAR(100) DEFAULT NULL,
          `action` ENUM('preview','migrate','migrate-all','clear','counts') NOT NULL,
          `company_ids` JSON DEFAULT NULL,
          `confirm_provided` VARCHAR(100) DEFAULT NULL,
          `result_summary` JSON DEFAULT NULL,
          `errors` JSON DEFAULT NULL,
          `status` ENUM('success','error') NOT NULL DEFAULT 'success',
          `error_message` TEXT DEFAULT NULL,
          `ip_address` VARCHAR(45) DEFAULT NULL,
          `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci");
    } catch (Throwable $e) { /* ignore */ }

    try {
        $stmt = $db->prepare("INSERT INTO normalized_migration_audits (user_id, user_email, user_role, action, company_ids, confirm_provided, result_summary, errors, status, error_message, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $userId = $authUser['id'] ?? null;
        $userEmail = $authUser['email'] ?? $authUser['username'] ?? null;
        $userRole = $authUser['role'] ?? null;
        $ip = $_SERVER['REMOTE_ADDR'] ?? null;
        // Extract errors array from result if present
        $errorsJson = null;
        if (isset($result['swot']['errors']) || isset($result['gps']['errors'])) {
            $errors = array_merge($result['swot']['errors'] ?? [], $result['gps']['errors'] ?? []);
            $errorsJson = $errors ? json_encode($errors, JSON_UNESCAPED_UNICODE) : null;
        } elseif (isset($result['errors'])) {
            $errorsJson = json_encode($result['errors'], JSON_UNESCAPED_UNICODE);
        }
        $companyIdsJson = json_encode(array_values($companyIds), JSON_UNESCAPED_UNICODE);
        $resultJson = json_encode($result, JSON_UNESCAPED_UNICODE);
        $stmt->execute([
            $userId ? (int)$userId : null,
            $userEmail,
            $userRole,
            $action,
            $companyIdsJson,
            $confirm,
            $resultJson,
            $errorsJson,
            $status,
            $errorMessage,
            $ip,
        ]);
    } catch (Throwable $e) {
        // Audit failure must not break migration — log to error_log
        error_log("normalized_migration_audits insert failed: " . $e->getMessage());
    }
}

try {
    $database = new Database();
    $db = $database->connect();
    $migrator = new NormalizedMigrator($db);
    $isCli = php_sapi_name() === 'cli';

    // CLI via this file is deprecated — use normalized-migrate-cli.php.
    // We keep a minimal CLI path for local podman exec testing without a session,
    // but production (Apache) will always hit the HTTP branch below.
    if ($isCli) {
        // Allow CLI preview/migrate for local dev without admin session, but require explicit companyIds/confirm.
        $raw = file_get_contents('php://input');
        $input = json_decode($raw, true);
        if (!$input) $input = $_POST;
        // Also support argv for backwards-compat: php file --action=preview --companyIds=59,11
        if (empty($input) && isset($argv)) {
            $cliArgs = [];
            foreach ($argv as $a) {
                if (str_starts_with($a, '--action=')) $cliArgs['action'] = substr($a, 9);
                if (str_starts_with($a, '--companyIds=')) $cliArgs['companyIds'] = substr($a, 13);
            }
            if ($cliArgs) $input = array_merge($input ?? [], $cliArgs);
        }
        $action = $input['action'] ?? $_GET['action'] ?? 'preview';
        $companyIds = $input['companyIds'] ?? $input['company_ids'] ?? ($_GET['companyIds'] ?? null);
        if (is_string($companyIds)) $companyIds = array_map('intval', explode(',', $companyIds));
        if (!is_array($companyIds)) $companyIds = $companyIds ? [(int)$companyIds] : [];
        $confirm = $input['confirm'] ?? null;

        switch ($action) {
            case 'preview':
                if (!$companyIds) { http_response_code(400); echo json_encode(['success'=>false,'error'=>'companyIds required — explicit list required, e.g. [59,11]']); exit; }
                $result = $migrator->preview($companyIds);
                audit_migration($db, null, 'preview', $companyIds, $confirm, $result, 'success', null);
                echo json_encode(['success'=>true,'action'=>'preview','data'=>$result], JSON_PRETTY_PRINT);
                exit;
            case 'migrate':
            case 'import':
                if (!$companyIds) { http_response_code(400); echo json_encode(['success'=>false,'error'=>'companyIds required — explicit list required, e.g. [59,11]']); exit; }
                if ($confirm !== 'MIGRATE_NORMALIZED_SWOT_GPS') { http_response_code(400); echo json_encode(['success'=>false,'error'=>'confirm required — send confirm: MIGRATE_NORMALIZED_SWOT_GPS']); exit; }
                $result = $migrator->migrate($companyIds, false);
                audit_migration($db, null, 'migrate', $companyIds, $confirm, $result, 'success', null);
                echo json_encode(['success'=>true,'action'=>'migrate','dry_run'=>false,'data'=>$result], JSON_PRETTY_PRINT);
                exit;
            case 'migrate-all':
                http_response_code(403);
                echo json_encode(['success'=>false,'error'=>'migrate-all is CLI-only. Use normalized-migrate-cli.php --action=migrate --all or pass explicit companyIds.'], JSON_PRETTY_PRINT);
                exit;
            case 'clear':
                if (!$companyIds) throw new InvalidArgumentException("companyIds required for clear");
                $result = $migrator->clearForCompanies($companyIds);
                audit_migration($db, null, 'clear', $companyIds, $confirm, $result, 'success', null);
                echo json_encode(['success'=>true,'action'=>'clear','data'=>$result], JSON_PRETTY_PRINT);
                exit;
        }
        // fall through to HTTP handling if not matched — but CLI will have exited
    }

    // --- HTTP (Apache) — admin-controlled, POST-only ---
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($method !== 'POST') {
        // Spec: reject when action is sent through GET
        if (isset($_GET['action'])) {
            http_response_code(405);
            echo json_encode(['success'=>false,'error'=>'Method not allowed — migration actions must be POST with JSON body, not GET.','hint'=>'POST /api-nodes/imports/normalized-migrate.php {\"action\":\"preview\",\"companyIds\":[59,11]}'], JSON_PRETTY_PRINT);
            exit;
        }
        http_response_code(405);
        echo json_encode(['success'=>false,'error'=>'Method not allowed — use POST.','hint'=>'POST {action: preview|migrate, companyIds: [59,11], confirm: MIGRATE_NORMALIZED_SWOT_GPS}'], JSON_PRETTY_PRINT);
        exit;
    }

    // Auth: must be logged-in System Administrator
    $authUser = auth_require_user($db);
    if (!auth_is_admin($authUser)) {
        http_response_code(403);
        echo json_encode(['success'=>false,'error'=>'Forbidden — preview/migrate requires System Administrator.'], JSON_PRETTY_PRINT);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) $input = $_POST;
    // Reject GET-sourced action even on POST (explicit spec)
    if (isset($_GET['action']) && !isset($input['action'])) {
        http_response_code(400);
        echo json_encode(['success'=>false,'error'=>'action must be sent in POST JSON body, not via GET query string.'], JSON_PRETTY_PRINT);
        exit;
    }
    $action = $input['action'] ?? null;
    if (!$action) {
        http_response_code(400);
        echo json_encode(['success'=>false,'error'=>'action required','available'=>['preview','migrate'],'hint'=>'POST {action: preview|migrate, companyIds: [59,11]}'], JSON_PRETTY_PRINT);
        exit;
    }

    $companyIds = $input['companyIds'] ?? $input['company_ids'] ?? null;
    if (is_string($companyIds)) $companyIds = array_map('intval', explode(',', $companyIds));
    if (!is_array($companyIds)) $companyIds = $companyIds ? [(int)$companyIds] : [];
    $companyIds = array_values(array_filter(array_map('intval', $companyIds), fn($v)=>$v>0));
    $confirm = $input['confirm'] ?? null;

    switch ($action) {
        case 'preview':
            if (empty($companyIds)) {
                http_response_code(400);
                echo json_encode(['success'=>false,'error'=>'companyIds required — explicit list required, e.g. [59,11]','hint'=>'POST {\"action\":\"preview\",\"companyIds\":[59,11]}'], JSON_PRETTY_PRINT);
                exit;
            }
            $result = $migrator->preview($companyIds);
            audit_migration($db, $authUser, 'preview', $companyIds, $confirm, $result, 'success', null);
            echo json_encode(['success'=>true,'action'=>'preview','data'=>$result], JSON_PRETTY_PRINT);
            break;

        case 'migrate':
        case 'import':
            if (empty($companyIds)) {
                http_response_code(400);
                echo json_encode(['success'=>false,'error'=>'companyIds required — explicit list required, e.g. [59,11]'], JSON_PRETTY_PRINT);
                exit;
            }
            if ($confirm !== 'MIGRATE_NORMALIZED_SWOT_GPS') {
                http_response_code(400);
                echo json_encode(['success'=>false,'error'=>'confirm required — send confirm: MIGRATE_NORMALIZED_SWOT_GPS','hint'=>'POST {\"action\":\"migrate\",\"companyIds\":[59,11],\"confirm\":\"MIGRATE_NORMALIZED_SWOT_GPS\"}'], JSON_PRETTY_PRINT);
                exit;
            }
            try {
                $result = $migrator->migrate($companyIds, false);
                audit_migration($db, $authUser, 'migrate', $companyIds, $confirm, $result, 'success', null);
                echo json_encode(['success'=>true,'action'=>'migrate','dry_run'=>false,'data'=>$result], JSON_PRETTY_PRINT);
            } catch (Throwable $e) {
                audit_migration($db, $authUser, 'migrate', $companyIds, $confirm, ['error'=>$e->getMessage()], 'error', $e->getMessage());
                throw $e;
            }
            break;

        case 'migrate-all':
            http_response_code(403);
            echo json_encode(['success'=>false,'error'=>'migrate-all is CLI-only. Production requires explicit companyIds.','hint'=>'Use normalized-migrate-cli.php --action=migrate --all for full migration, or POST {action:migrate, companyIds:[...]}'], JSON_PRETTY_PRINT);
            break;

        case 'clear':
            http_response_code(403);
            echo json_encode(['success'=>false,'error'=>'clear is CLI/developer-only — never expose in production. Use normalized-migrate-cli.php --action=clear --companyIds=...'], JSON_PRETTY_PRINT);
            break;

        case 'counts':
            // Admin-only diagnostic
            $tables = ['swot_analyses','swot_items','gps_targets','gps_target_sources','gps_target_tasks','gps_target_updates','gps_target_metrics','nodes','normalized_migration_audits'];
            $counts = [];
            foreach ($tables as $t) {
                try { $stmt = $db->query("SELECT COUNT(*) FROM `$t`"); $counts[$t] = (int)$stmt->fetchColumn(); }
                catch (Throwable $e) { $counts[$t] = 'missing: '.$e->getMessage(); }
            }
            $stmt = $db->query("SELECT type, COUNT(*) as c FROM nodes GROUP BY type");
            $nodeBreakdown = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success'=>true,'counts'=>$counts,'node_breakdown'=>$nodeBreakdown], JSON_PRETTY_PRINT);
            break;

        default:
            http_response_code(400);
            echo json_encode(['success'=>false,'error'=>'Unknown action','available'=>['preview','migrate'],'hint'=>'POST {action: preview|migrate, companyIds: [59,11], confirm: MIGRATE_NORMALIZED_SWOT_GPS}'], JSON_PRETTY_PRINT);
            break;
    }
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['success'=>false,'error'=>$e->getMessage(),'trace'=> $e->getTraceAsString()], JSON_PRETTY_PRINT);
}
