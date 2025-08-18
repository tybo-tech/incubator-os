<?php
declare(strict_types=1);

final class CompanyMigrator
{
    public function __construct(private PDO $pdo) {
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /**
     * Run migration for all nodes where type='company'.
     * - Default is a dry run (no DB writes) unless $apply=true
     */
    public function migrateAll(Node $nodeRepo, bool $apply = false): array
    {
        $report = ['total'=>0,'inserted'=>0,'updated'=>0,'skipped'=>0,'errors'=>0,'logs'=>[]];

        // fetch all company nodes
        $nodes = $nodeRepo->getByType('company');
        $report['total'] = count($nodes);

        // optional: wrap writes
        if ($apply) $this->pdo->beginTransaction();

        try {
            foreach ($nodes as $n) {
                try {
                    $mapped = $this->mapNodeToCompanyRow($n);
                    // determine if row exists (idempotent by name+registration_no)
                    $existingId = $this->findCompanyId($mapped['name'], $mapped['registration_no']);

                    if ($existingId) {
                        if ($apply) $this->updateCompany($existingId, $mapped);
                        $report['updated']++;
                        $report['logs'][] = "UPDATE: {$mapped['name']} ({$mapped['registration_no']})";
                    } else {
                        if ($apply) $this->insertCompany($mapped);
                        $report['inserted']++;
                        $report['logs'][] = "INSERT: {$mapped['name']} ({$mapped['registration_no']})";
                    }
                } catch (\Throwable $e) {
                    $report['errors']++;
                    $report['logs'][] = "ERR node#{$n['id']}: ".$e->getMessage();
                }
            }

            if ($apply) $this->pdo->commit();
        } catch (\Throwable $e) {
            if ($apply && $this->pdo->inTransaction()) $this->pdo->rollBack();
            $report['errors']++;
            $report['logs'][] = 'FATAL: '.$e->getMessage();
        }

        return $report;
    }

    /**
     * Map a single Node row (with ->data) into a flat companies row (column => value).
     * Expects Node::getByType() format: ['id'=>..,'data'=>(object)]
     */
    private function mapNodeToCompanyRow(array $node): array
    {
        $d = is_object($node['data']) ? (array)$node['data'] : (array)$node['data'];

        // helpers
        $g  = fn(string $k, $def=null) => array_key_exists($k, $d) ? $d[$k] : $def;
        $yn = function($v): int {
            $s = strtolower(trim((string)$v));
            return in_array($s, ['yes','y','true','1'], true) ? 1 : 0;
        };

        $email = $this->normalizeEmail((string)($g('email_address','') ?? ''));
        $contactNumber = $this->squashSpaces((string)($g('contact_number','') ?? ''));
        $serviceOffering = (string)($g('service_offering', $g('description','')) ?? '');

        // compliance nested object (flatten)
        $c = (array)($g('compliance', []) ?? []);
        $complianceNotes      = $this->safeStr($c['notes'] ?? null);
        $hasValidBbbbee       = isset($c['has_valid_bbbbee'])   ? $yn($c['has_valid_bbbbee'])   : 0;
        $hasTaxClearance      = isset($c['has_tax_clearance'])  ? $yn($c['has_tax_clearance'])  : 0;
        $isSarsRegistered     = isset($c['is_sars_registered']) ? $yn($c['is_sars_registered']) : 0;
        $hasCipcRegistration  = isset($c['has_cipc_registration']) ? $yn($c['has_cipc_registration']) : 0;

        // dates (strings or Excel serials)
        $bbbeeExpiry   = $this->normalizeDate($g('bbbee_expiry_date', null));
        $taxPinExpiry  = $this->normalizeDate($g('tax_pin_expiry_date', null));

        // turnover: write exactly as-is (no scaling here)
        $turnoverEstimated = $this->toDecimal($g('turnover_estimated', 0));
        $turnoverActual    = $this->toDecimal($g('turnover_actual', 0));
        $turnoverRaw       = $this->compactCurrencyRaw((string)($g('company_turnover_raw','') ?? ''));

        // booleans from top-level strings
        $youthOwned          = $yn($g('youth_owned','No'));
        $blackOwnership      = $yn($g('black_ownership','No'));
        $blackWomenOwnership = $yn($g('black_women_ownership','No'));

        // preserve the original Yes/No text (optional)
        $youthOwnedText          = $this->shortYN($g('youth_owned', null));
        $blackOwnershipText      = $this->shortYN($g('black_ownership', null));
        $blackWomenOwnershipText = $this->shortYN($g('black_women_ownership', null));

        // final flat map (exact table columns)
        return [
            'name'                       => $this->safeStr($g('name','')),
            'registration_no'            => $this->safeStr($g('registration_no', null)),
            'bbbee_level'                => $this->safeStr($g('bbbee_level', null)),
            'cipc_status'                => $this->safeStr($g('cipc_status', null)),

            'industry'                   => $this->safeStr($g('industry', null)),
            'service_offering'           => $this->safeStr($serviceOffering),
            'description'                => $this->safeStr($g('description', null)),

            'city'                       => $this->safeStr($g('city', null)),
            'suburb'                     => $this->safeStr($g('suburb', null)),
            'address'                    => $this->safeStr($g('address', null)),
            'postal_code'                => $this->safeStr($g('postal_code', null)),
            'business_location'          => $this->safeStr($g('business_location', null)),

            'contact_person'             => $this->safeStr($g('contact_person', null)),
            'contact_number'             => $contactNumber,
            'email_address'              => $email,
            'trading_name'               => $this->safeStr($g('trading_name', null)),

            'youth_owned'                => $youthOwned,
            'black_ownership'            => $blackOwnership,
            'black_women_ownership'      => $blackWomenOwnership,
            'youth_owned_text'           => $youthOwnedText,
            'black_ownership_text'       => $blackOwnershipText,
            'black_women_ownership_text' => $blackWomenOwnershipText,

            'compliance_notes'           => $complianceNotes,
            'has_valid_bbbbee'           => $hasValidBbbbee,
            'has_tax_clearance'          => $hasTaxClearance,
            'is_sars_registered'         => $isSarsRegistered,
            'has_cipc_registration'      => $hasCipcRegistration,
            'bbbee_valid_status'         => $this->safeStr($g('bbbee_valid_status', null)),
            'bbbee_expiry_date'          => $bbbeeExpiry,
            'tax_valid_status'           => $this->safeStr($g('tax_valid_status', null)),
            'tax_pin_expiry_date'        => $taxPinExpiry,
            'vat_number'                 => $this->safeStr($g('vat_number', null)),

            'turnover_estimated'         => $turnoverEstimated,
            'turnover_actual'            => $turnoverActual,
            'company_turnover_raw'       => $turnoverRaw,

            'permanent_employees'        => $this->toInt($g('permanent_employees', 0)),
            'temporary_employees'        => $this->toInt($g('temporary_employees', 0)),

            'locations'                  => $this->safeStr($g('locations', null)),
        ];
    }

    private function insertCompany(array $row): void
    {
        $cols = array_keys($row);
        $placeholders = implode(',', array_fill(0, count($cols), '?'));
        $sql = "INSERT INTO companies (".implode(',', $cols).") VALUES ($placeholders)";
        $this->pdo->prepare($sql)->execute(array_values($row));
    }

    private function updateCompany(int $id, array $row): void
    {
        $set = implode(',', array_map(fn($k) => "$k = ?", array_keys($row)));
        $sql = "UPDATE companies SET $set WHERE id = ?";
        $vals = array_values($row);
        $vals[] = $id;
        $this->pdo->prepare($sql)->execute($vals);
    }

    private function findCompanyId(?string $name, ?string $reg): ?int
    {
        // Upsert key: prefer name+registration_no; if reg is empty, use name only.
        if ($name === null || trim($name) === '') return null;

        if ($reg && trim($reg) !== '') {
            $s = $this->pdo->prepare("SELECT id FROM companies WHERE name = ? AND registration_no = ? LIMIT 1");
            $s->execute([$name, $reg]);
        } else {
            $s = $this->pdo->prepare("SELECT id FROM companies WHERE name = ? LIMIT 1");
            $s->execute([$name]);
        }
        $id = $s->fetchColumn();
        return $id ? (int)$id : null;
    }

    // ── Normalizers ────────────────────────────────────────────────────────────

    private function safeStr($v): ?string
    {
        if ($v === null) return null;
        $s = trim(str_replace("\xC2\xA0", ' ', (string)$v)); // strip NBSP
        return $s === '' ? null : $s;
    }

    private function squashSpaces(string $s): string
    {
        $s = str_replace("\xC2\xA0", ' ', $s);
        return trim(preg_replace('/\s+/', ' ', $s));
    }

    private function normalizeEmail(string $email): ?string
    {
        $email = trim($email);
        if ($email === '') return null;
        if (preg_match('/<([^>]+)>/', $email, $m)) {
            $email = trim($m[1]);
        }
        // crude validation: keep if contains '@'
        return (strpos($email, '@') !== false) ? $email : $email;
    }

    private function shortYN($v): ?string
    {
        if ($v === null) return null;
        $s = strtolower(trim((string)$v));
        if (in_array($s, ['yes','y','true','1'], true)) return 'Yes';
        if (in_array($s, ['no','n','false','0'], true))  return 'No';
        return $v === '' ? null : (string)$v;
    }

    private function toDecimal($v): float
    {
        if ($v === null || $v === '') return 0.0;
        return (float)$v;
    }

    private function toInt($v): int
    {
        if ($v === null || $v === '') return 0;
        return (int)$v;
    }

    private function normalizeDate($v): ?string
    {
        if ($v === null) return null;
        $sv = trim((string)$v);
        if ($sv === '' || strtolower($sv) === 'nil') return null;

        // numeric Excel serial (approx 1900 system)
        if (preg_match('/^\d{3,6}$/', $sv)) {
            $n = (int)$sv;
            if ($n >= 20000 && $n <= 60000) {
                $base = new DateTime('1899-12-30', new DateTimeZone('UTC'));
                $base->modify('+'.$n.' days');
                return $base->format('Y-m-d');
            }
        }

        // try natural text
        try {
            $dt = new DateTime($sv);
            return $dt->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }

    private function compactCurrencyRaw(string $s): ?string
    {
        $s = str_replace("\xC2\xA0", ' ', $s); // NBSP -> space
        $s = trim(preg_replace('/\s+/', ' ', $s));
        return $s === '' ? null : $s;
    }
}
