<?php
// generate_company_updates.php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

include_once '../../config/Database.php';

/* ---------- helpers ---------- */
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

function clean_str(?string $s): ?string {
    if ($s === null) return null;
    $s = preg_replace('/\s+/u', ' ', trim($s));
    return $s === '' ? null : $s;
}

/* ---------- main ---------- */
try {
    $file = $_GET['file'] ?? 'companies.json';

    $db = (new Database())->connect();
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // 1) Build DB company list (id, name, trading_name)
    $stmt = $db->query("SELECT id, name, trading_name FROM companies");
    $dbCompanies = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 2) Load JSON rows and map by canonicalized "Company Name"
    $rows = load_json_rows($file);
    $jsonMap = []; // canon_name -> ['sector'=>'...', 'contact'=>'...']
    foreach ($rows as $r) {
        $name = clean_str($r['Company Name'] ?? null);
        if (!$name) continue;
        $key = canon_key($name);
        if (!$key) continue;

        $sector  = clean_str($r['Business Sector'] ?? null);
        $contact = clean_str($r['Contact Person'] ?? null);

        // Prefer non-empty values; ignore fully empty lines
        if ($sector !== null || $contact !== null) {
            $jsonMap[$key] = [
                'sector'  => $sector,
                'contact' => $contact,
                // keep raw for debugging if needed
                '_raw_name' => $name,
            ];
        }
    }

    // 3) For each DB company, try to find a JSON match by name or trading_name
    $updates = [];
    $matched = 0;
    $unmatchedDb = [];
    $usedJsonKeys = [];

    foreach ($dbCompanies as $c) {
        $id   = (int)$c['id'];
        $name = $c['name'] ?? null;
        $tname= $c['trading_name'] ?? null;

        $k1 = canon_key($name);
        $k2 = canon_key($tname);

        $row = null;
        if ($k1 && isset($jsonMap[$k1])) {
            $row = $jsonMap[$k1];
            $usedJsonKeys[$k1] = true;
        } elseif ($k2 && isset($jsonMap[$k2])) {
            $row = $jsonMap[$k2];
            $usedJsonKeys[$k2] = true;
        }

        if (!$row) {
            $unmatchedDb[] = ['id'=>$id, 'name'=>$name, 'trading_name'=>$tname];
            continue;
        }

        // Only generate SET clauses for non-null values
        $sets = [];
        if ($row['contact'] !== null) {
            $sets[] = "contact_person=" . $db->quote($row['contact']);
        }
        if (empty($sets)) continue; // nothing to update

        $updates[] = "UPDATE companies SET " . implode(', ', $sets) . " WHERE id={$id};";
        $matched++;
    }

    // 4) JSON rows that didn’t match any DB company (helpful to review)
    $unmatchedJson = [];
    foreach ($jsonMap as $k => $v) {
        if (!isset($usedJsonKeys[$k])) {
            $unmatchedJson[] = ['company_name'=>$v['_raw_name'] ?? '(unknown)', 'sector'=>$v['sector'], 'contact'=>$v['contact']];
        }
    }

    // 5) Output: the SQL text plus a small summary
    echo json_encode([
        'ok' => true,
        'message' => 'Generated UPDATE statements. Copy/paste into your DB client.',
        'file' => $file,
        'summary' => [
            'db_companies'     => count($dbCompanies),
            'json_companies'   => count($jsonMap),
            'matched'          => $matched,
            'updates_generated'=> count($updates),
            'unmatched_db'     => count($unmatchedDb),
            'unmatched_json'   => count($unmatchedJson),
        ],
        // Raw SQL lines:
        'sql' => $updates,
        // Diagnostics if you need to reconcile names:
        'unmatched_db_sample' => array_slice($unmatchedDb, 0, 10),
        'unmatched_json_sample' => array_slice($unmatchedJson, 0, 10),
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);

} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['ok'=>false, 'error'=>$e->getMessage()]);
}
