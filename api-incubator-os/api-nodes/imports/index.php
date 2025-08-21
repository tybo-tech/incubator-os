<?php
// purchases_import.php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

include_once '../../config/Database.php';

/* ------------ helpers ------------- */
function load_json_rows(string $filename): array {
    $path = __DIR__ . DIRECTORY_SEPARATOR . $filename;
    if (!is_file($path) || !is_readable($path)) {
        throw new RuntimeException("JSON file not found: {$filename}");
    }
    $raw = file_get_contents($path);
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new RuntimeException("Invalid JSON in {$filename}: " . json_last_error_msg());
    }
    return is_array($data) ? $data : [];
}

function canon_key(?string $s): ?string {
    if ($s === null) return null;
    $s = strtolower($s);
    $s = str_replace('&', ' and ', $s);
    $s = preg_replace('/[.,()]/u', ' ', $s);
    $s = preg_replace('/\b(proprietary\s+limited|pty\s*ltd|ltd|cc)\b/u', ' ', $s);
    $s = preg_replace('/\s+/u', ' ', trim($s));
    return $s === '' ? null : $s;
}

function yn_int(?string $s): int {
    $s = strtolower(trim((string)$s));
    return (int) in_array($s, ['yes','y','true','1'], true);
}

function parse_money(?string $s): ?string {
    if ($s === null) return null;
    $s = preg_replace('/[R\s,   ]/u', '', trim($s)); // strip R, spaces (incl. thin), commas
    if ($s === '' || $s === '-' || $s === '—') return null;
    if (!str_contains($s, '.')) $s .= '.00';
    if (!is_numeric($s)) return null;
    return number_format((float)$s, 2, '.', '');
}

function clean_str(?string $s): ?string {
    if ($s === null) return null;
    $s = preg_replace('/\s+/u', ' ', trim($s));
    return $s === '' ? null : $s;
}

function build_company_cache(PDO $pdo): array {
    $cache = [];
    $stmt = $pdo->query("SELECT id, name, trading_name FROM companies");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $id = (int)$row['id'];
        foreach (['name','trading_name'] as $col) {
            $ck = canon_key($row[$col] ?? null);
            if ($ck) $cache[$ck] = $id;
        }
    }
    return $cache;
}

/* ------------ main ------------- */
try {
    $file     = $_GET['file']   ?? 'purchases.json';
    $doCommit = isset($_GET['commit']) && $_GET['commit'] === '1';
    $allowNew = isset($_GET['allow_new_companies']) && $_GET['allow_new_companies'] === '1';

    $rows = load_json_rows($file);

    $db = (new Database())->connect();
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $companyCache = build_company_cache($db);

    $insert = $db->prepare("
      INSERT INTO company_purchases
        (company_id, purchase_type, service_provider, items, amount,
         purchase_order, invoice_received, invoice_type, items_received, aligned_with_presentation, source_file)
      VALUES
        (:company_id, :purchase_type, :service_provider, :items, :amount,
         :purchase_order, :invoice_received, :invoice_type, :items_received, :aligned_with_presentation, :source_file)
    ");

    // optional stub creation for missing companies
    $insertStub = $db->prepare("INSERT INTO companies (name) VALUES (:name)");

    $summary = [
        'file' => $file,
        'dry_run' => !$doCommit,
        'rows_seen' => 0,
        'inserted' => 0,
        'skipped' => 0,
        'missing_companies' => [],
        'notes' => [],
        'examples' => [],
    ];

    if ($doCommit) $db->beginTransaction();

    foreach ($rows as $row) {
        $summary['rows_seen']++;

        // Skip aggregates like "Total Grant Disbursement" or blank company
        $companyRaw = clean_str($row['Company Name'] ?? null);
        if (!$companyRaw || stripos($companyRaw, 'total grant') !== false) {
            $summary['skipped']++;
            continue;
        }

        $ckey = canon_key($companyRaw);
        $companyId = $ckey ? ($companyCache[$ckey] ?? null) : null;

        if (!$companyId && $allowNew && $doCommit) {
            // create minimal stub to attach purchases now
            $insertStub->execute([':name' => $companyRaw]);
            $companyId = (int)$db->lastInsertId();
            $companyCache[$ckey] = $companyId;
        }

        if (!$companyId) {
            $summary['skipped']++;
            $summary['missing_companies'][] = $companyRaw;
            continue;
        }

        // Normalize fields
        $purchaseType   = clean_str($row['Purchase Type'] ?? null);
        $serviceProv    = clean_str($row['Service Provider'] ?? null);
        $items          = clean_str($row['List of items'] ?? null);
        $amount         = parse_money($row[' Amount '] ?? null);
        $po             = yn_int($row[' Purchase Order '] ?? null);
        $invReceived    = yn_int($row['Invoice Received'] ?? null);
        $invoiceType    = clean_str($row[' Type of invoice in file '] ?? null);
        $itemsReceived  = yn_int($row[' Items Received '] ?? null);
        // Note: the sample key is misspelled "presntation" — handle both
        $aligned        = yn_int($row[' Quotes align to presntation '] ?? ($row['Quotes align to presentation'] ?? null));

        if ($doCommit) {
            $insert->execute([
                ':company_id' => $companyId,
                ':purchase_type' => $purchaseType,
                ':service_provider' => $serviceProv,
                ':items' => $items,
                ':amount' => $amount,
                ':purchase_order' => $po,
                ':invoice_received' => $invReceived,
                ':invoice_type' => $invoiceType,
                ':items_received' => $itemsReceived,
                ':aligned_with_presentation' => $aligned,
                ':source_file' => $file,
            ]);
        }
        $summary['inserted']++;

        if (count($summary['examples']) < 3) {
            $summary['examples'][] = [
                'company_id' => $companyId,
                'purchase_type' => $purchaseType,
                'service_provider' => $serviceProv,
                'amount' => $amount
            ];
        }
    }

    if ($doCommit) $db->commit();

    echo json_encode([
        'ok' => true,
        'message' => $doCommit
            ? 'Purchases import committed.'
            : 'Preview only (dry-run). Add ?commit=1 to write.',
        'summary' => $summary
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);

} catch (Throwable $e) {
    if (isset($db) && $db instanceof PDO && $db->inTransaction()) $db->rollBack();
    http_response_code(400);
    echo json_encode(['ok'=>false, 'error'=>$e->getMessage()]);
}
