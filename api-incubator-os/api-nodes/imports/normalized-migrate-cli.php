<?php
declare(strict_types=1);

/**
 * CLI-only migrator for normalized SWOT/GPS model
 * Usage:
 *   php normalized-migrate-cli.php --action=preview --companyIds=59,107,126
 *   php normalized-migrate-cli.php --action=migrate --companyIds=59,107,126 --dryRun=0
 *   php normalized-migrate-cli.php --action=migrate --all=1
 *   php normalized-migrate-cli.php --action=clear --companyIds=59,107,126
 *   php normalized-migrate-cli.php --action=counts
 *
 * Requires ALLOW_DESTRUCTIVE_MIGRATION=true for clear via env if not already CLI (always CLI here)
 */

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    echo json_encode(['error' => 'This script is CLI-only. Use normalized-migrate.php via HTTP with admin auth for preview/counts, or run this file via CLI.']);
    exit;
}

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../models/NormalizedMigrator.php';

$opts = getopt('', ['action:', 'companyIds:', 'all', 'dryRun:', 'help']);
if (isset($opts['help']) || !isset($opts['action'])) {
    echo "Usage: php normalized-migrate-cli.php --action=preview|migrate|clear|counts [--companyIds=59,107,126] [--all] [--dryRun=0|1]\n";
    exit(0);
}

$action = $opts['action'];
$companyIds = [];
if (isset($opts['companyIds'])) {
    $companyIds = array_map('intval', explode(',', $opts['companyIds']));
}
$explicitAll = isset($opts['all']);
$dryRun = isset($opts['dryRun']) ? (bool)intval($opts['dryRun']) : false;

try {
    $database = new Database();
    $db = $database->connect();
    $migrator = new NormalizedMigrator($db);

    switch ($action) {
        case 'preview':
            if (!$companyIds && !$explicitAll) $companyIds = [59,107,126];
            if ($explicitAll) $companyIds = [];
            $result = $migrator->preview($companyIds);
            echo json_encode(['success'=>true,'action'=>'preview','data'=>$result], JSON_PRETTY_PRINT) . PHP_EOL;
            break;
        case 'migrate':
        case 'import':
            if (!$companyIds && !$explicitAll) $companyIds = [59,107,126];
            if ($explicitAll) $companyIds = [];
            $result = $migrator->migrate($companyIds, $dryRun);
            echo json_encode(['success'=>true,'action'=>'migrate','dry_run'=>$dryRun,'data'=>$result], JSON_PRETTY_PRINT) . PHP_EOL;
            break;
        case 'clear':
            if (!$companyIds) { fwrite(STDERR, "companyIds required for clear\n"); exit(1); }
            $result = $migrator->clearForCompanies($companyIds);
            echo json_encode(['success'=>true,'action'=>'clear','data'=>$result], JSON_PRETTY_PRINT) . PHP_EOL;
            break;
        case 'counts':
            $tables = ['swot_analyses','swot_items','gps_targets','gps_target_sources','gps_target_tasks','gps_target_updates','gps_target_metrics','nodes'];
            $counts = [];
            foreach ($tables as $t) {
                try { $stmt = $db->query("SELECT COUNT(*) FROM `$t`"); $counts[$t] = (int)$stmt->fetchColumn(); }
                catch (Throwable $e) { $counts[$t] = 'missing: '.$e->getMessage(); }
            }
            $stmt = $db->query("SELECT type, COUNT(*) as c FROM nodes GROUP BY type");
            $nodeBreakdown = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success'=>true,'counts'=>$counts,'node_breakdown'=>$nodeBreakdown], JSON_PRETTY_PRINT) . PHP_EOL;
            break;
        default:
            fwrite(STDERR, "Unknown action: $action\n");
            exit(1);
    }
} catch (Throwable $e) {
    fwrite(STDERR, "Error: " . $e->getMessage() . PHP_EOL);
    fwrite(STDERR, $e->getTraceAsString() . PHP_EOL);
    exit(1);
}
