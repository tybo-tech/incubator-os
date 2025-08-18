<?php
declare(strict_types=1);

header('Content-Type: application/json');

include_once '../../config/Database.php';
include_once '../../models/Node.php';
include_once '../../models/CompanyMigrator.php'; // put CompanyMigrator.php here

$input = json_decode(file_get_contents('php://input'), true) ?? [];

try {
    $database = new Database();
    $db = $database->connect();

    // repositories/services
    $node = new Node($db);
    $migrator = new CompanyMigrator($db);

    // flags
    // prefer JSON body "apply": true|false; fallback to query ?apply=1
    $apply = false;
    if (array_key_exists('apply', $input)) {
        $apply = filter_var($input['apply'], FILTER_VALIDATE_BOOLEAN);
    } elseif (isset($_GET['apply'])) {
        $apply = filter_var($_GET['apply'], FILTER_VALIDATE_BOOLEAN);
    }

    // run
    $report = $migrator->migrateAll($node, $apply);

    echo json_encode([
        'mode'   => $apply ? 'apply' : 'dry-run',
        'report' => $report
    ], JSON_UNESCAPED_SLASHES);

} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
