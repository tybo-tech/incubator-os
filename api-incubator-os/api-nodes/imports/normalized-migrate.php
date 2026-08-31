<?php
include_once '../../config/Database.php';
include_once '../../models/NormalizedMigrator.php';
include_once '../../config/headers.php';

try {
    $database = new Database();
    $db = $database->connect();
    $migrator = new NormalizedMigrator($db);

    $method = $_SERVER['REQUEST_METHOD'];
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST;

    $action = $input['action'] ?? $_GET['action'] ?? 'preview';
    $companyIds = $input['companyIds'] ?? $input['company_ids'] ?? ($_GET['companyIds'] ?? null);
    $dryRun = isset($input['dryRun']) ? (bool)$input['dryRun'] : (isset($_GET['dryRun']) ? $_GET['dryRun']==='1' : false);

    // Normalize companyIds
    if (is_string($companyIds)) $companyIds = array_map('intval', explode(',', $companyIds));
    if (!is_array($companyIds)) $companyIds = $companyIds ? [(int)$companyIds] : [];

    // Default sample as per sprint: 59,107,126 if none provided and not explicit all
    $explicitAll = ($input['all'] ?? $_GET['all'] ?? '') === '1' || $action === 'migrate-all';

    switch ($action) {
        case 'preview':
            if (!$companyIds && !$explicitAll) $companyIds = [59,107,126];
            if ($explicitAll) $companyIds = [];
            $result = $migrator->preview($companyIds);
            echo json_encode(['success'=>true,'action'=>'preview','data'=>$result], JSON_PRETTY_PRINT);
            break;

        case 'migrate':
        case 'import':
            if (!$companyIds && !$explicitAll) $companyIds = [59,107,126];
            if ($explicitAll) $companyIds = [];
            $result = $migrator->migrate($companyIds, $dryRun);
            echo json_encode(['success'=>true,'action'=>'migrate','dry_run'=>$dryRun,'data'=>$result], JSON_PRETTY_PRINT);
            break;

        case 'clear':
            // Protected: CLI/dev-only — see NormalizedMigrator::clearForCompanies() guard.
            // In production, prefer a new migration batch over deleting live targets.
            if (!$companyIds) throw new InvalidArgumentException("companyIds required for clear");
            $isCli = php_sapi_name() === 'cli';
            $allowFlag = getenv('ALLOW_DESTRUCTIVE_MIGRATION') === 'true' || ($_ENV['ALLOW_DESTRUCTIVE_MIGRATION'] ?? '') === 'true';
            if (!$isCli && !$allowFlag) {
                http_response_code(403);
                echo json_encode(['success'=>false,'error'=>'clear is CLI/dev-only. Set ALLOW_DESTRUCTIVE_MIGRATION=true for controlled re-migration. In production, create a new batch instead of clearing live data.'], JSON_PRETTY_PRINT);
                break;
            }
            $result = $migrator->clearForCompanies($companyIds);
            echo json_encode(['success'=>true,'action'=>'clear','data'=>$result], JSON_PRETTY_PRINT);
            break;

        case 'counts':
            // Quick counts of normalized tables
            $tables = ['swot_analyses','swot_items','gps_targets','gps_target_sources','gps_target_tasks','gps_target_updates','gps_target_metrics','nodes'];
            $counts = [];
            foreach ($tables as $t) {
                try {
                    $stmt = $db->query("SELECT COUNT(*) FROM `$t`");
                    $counts[$t] = (int)$stmt->fetchColumn();
                } catch (Throwable $e) {
                    $counts[$t] = 'missing: '.$e->getMessage();
                }
            }
            // nodes breakdown
            $stmt = $db->query("SELECT type, COUNT(*) as c FROM nodes GROUP BY type");
            $nodeBreakdown = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success'=>true,'counts'=>$counts,'node_breakdown'=>$nodeBreakdown], JSON_PRETTY_PRINT);
            break;

        default:
            http_response_code(400);
            echo json_encode(['success'=>false,'error'=>'Unknown action','available'=>['preview','migrate','clear','counts'],'hint'=>'POST {action: preview|migrate, companyIds: [59,107,126], dryRun: false}']);
            break;
    }
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['success'=>false,'error'=>$e->getMessage(),'trace'=> $e->getTraceAsString()], JSON_PRETTY_PRINT);
}
