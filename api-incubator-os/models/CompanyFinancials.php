<?php
declare(strict_types=1);

class CompanyFinancials
{
    private PDO $conn;

    /**
     * Columns allowed to be written (exclude id, quarter, quarter_label, created_at, updated_at).
     * Matches table `company_financials`.
     */
    private const WRITABLE = [
        'company_id','period_date','year','month',
        'turnover_monthly_avg',
        'is_pre_ignition',
        'turnover','cost_of_sales','business_expenses',
        'gross_profit','net_profit',
        'gp_margin','np_margin',
        'cash_on_hand','debtors','creditors',
        'inventory_on_hand','working_capital_ratio','net_assets',
        'notes',
    ];

    /** Integer-ish fields (cast to int on read; is_pre_ignition cast to bool separately) */
    private const INTS = ['id','company_id','year','month','quarter'];

    /** Decimal fields (kept as strings for precision) */
    private const DECS = [
        'turnover_monthly_avg',
        'turnover','cost_of_sales','business_expenses',
        'gross_profit','net_profit',
        'gp_margin','np_margin',
        'cash_on_hand','debtors','creditors',
        'inventory_on_hand','working_capital_ratio','net_assets'
    ];

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /* =============================== Create =============================== */

    /**
     * Insert a new monthly record.
     * Requires: company_id, period_date (YYYY-MM-DD). year/month are optional; will be derived if omitted.
     * Returns the inserted row.
     */
    public function add(array $data): array
    {
        $data = $this->prepareTemporal($data); // derive/validate year & month

        foreach (['company_id','period_date','year','month'] as $req) {
            if (!isset($data[$req])) {
                throw new InvalidArgumentException("$req is required");
            }
        }

        $row = $this->sanitizeForWrite($data);
        if (!$row) {
            throw new InvalidArgumentException('No valid fields to insert');
        }

        $cols = array_keys($row);
        $place = implode(',', array_fill(0, count($cols), '?'));
        $sql = "INSERT INTO company_financials (" . implode(',', $cols) . ") VALUES ($place)";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute(array_values($row));

        return $this->getById((int)$this->conn->lastInsertId()) ?? [];
    }

    /**
     * Upsert by unique (company_id, period_date).
     * If exists → update; else → insert. Returns the row.
     */
    public function upsert(array $data): array
    {
        $data = $this->prepareTemporal($data);

        foreach (['company_id','period_date','year','month'] as $req) {
            if (!isset($data[$req])) {
                throw new InvalidArgumentException("$req is required");
            }
        }

        $row = $this->sanitizeForWrite($data);
        $cols = array_keys($row);
        $vals = array_values($row);

        $updates = [];
        foreach ($cols as $c) {
            if (in_array($c, ['company_id','period_date'], true)) continue; // key columns
            $updates[] = "$c = VALUES($c)";
        }
        $updates[] = "updated_at = NOW()";

        $place = implode(',', array_fill(0, count($cols), '?'));
        $sql = "INSERT INTO company_financials (" . implode(',', $cols) . ")
                VALUES ($place)
                ON DUPLICATE KEY UPDATE " . implode(', ', $updates);

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($vals);

        return $this->getByCompanyPeriod((int)$data['company_id'], (string)$data['period_date']) ?? [];
    }

    /* =============================== Update =============================== */

    /**
     * Patch update by id. Only provided keys are updated.
     * Returns updated row or null if not found.
     */
    public function update(int $id, array $data): ?array
    {
        if (isset($data['period_date']) || isset($data['year']) || isset($data['month'])) {
            $data = $this->prepareTemporal($data); // enforce consistency if any temporal changes
        }

        $row = $this->sanitizeForWrite($data);
        if (!$row) return $this->getById($id);

        $sets = [];
        $params = [];
        foreach ($row as $k => $v) {
            $sets[] = "$k = ?";
            $params[] = $v;
        }
        $params[] = $id;

        $sql = "UPDATE company_financials SET " . implode(', ', $sets) . ", updated_at = NOW() WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $this->getById($id);
    }

    /* ================================ Read ================================ */

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM company_financials WHERE id = ?");
        $stmt->execute([$id]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);
        return $r ? $this->castRow($r) : null;
    }

    public function getByCompanyPeriod(int $companyId, string $periodDate): ?array
    {
        $this->assertDateYmd($periodDate, 'period_date');
        $stmt = $this->conn->prepare("SELECT * FROM company_financials WHERE company_id = ? AND period_date = ?");
        $stmt->execute([$companyId, $periodDate]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);
        return $r ? $this->castRow($r) : null;
    }

    /** Convenience: get by (company_id, year, month) unique key */
    public function getByCompanyYearMonth(int $companyId, int $year, int $month): ?array
    {
        $stmt = $this->conn->prepare(
            "SELECT * FROM company_financials WHERE company_id = ? AND year = ? AND month = ?"
        );
        $stmt->execute([$companyId, $year, $month]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);
        return $r ? $this->castRow($r) : null;
    }

    /**
     * List with filters + pagination + ordering.
     * $opts:
     *  - company_id (int)
     *  - year (int), month (int), quarter (int 1–4), is_pre_ignition (bool|int)
     *  - from_date, to_date    (YYYY-MM-DD inclusive bounds)
     *  - order_by: period_date|year|month|created_at|updated_at|turnover|net_profit|turnover_monthly_avg|gp_margin|np_margin
     *  - order_dir: ASC|DESC (default DESC on period_date)
     *  - limit (int, default 50), offset (int, default 0)
     */
    public function list(array $opts = []): array
    {
        $where = [];
        $params = [];

        if (isset($opts['company_id'])) {
            $where[] = "company_id = ?";
            $params[] = (int)$opts['company_id'];
        }
        if (isset($opts['year'])) {
            $where[] = "year = ?";
            $params[] = (int)$opts['year'];
        }
        if (isset($opts['month'])) {
            $where[] = "month = ?";
            $params[] = (int)$opts['month'];
        }
        if (isset($opts['quarter'])) {
            $where[] = "quarter = ?";
            $params[] = (int)$opts['quarter'];
        }
        if (isset($opts['is_pre_ignition'])) {
            $where[] = "is_pre_ignition = ?";
            $params[] = (int)!!$opts['is_pre_ignition'];
        }
        if (!empty($opts['from_date'])) {
            $this->assertDateYmd($opts['from_date'], 'from_date');
            $where[] = "period_date >= ?";
            $params[] = $opts['from_date'];
        }
        if (!empty($opts['to_date'])) {
            $this->assertDateYmd($opts['to_date'], 'to_date');
            $where[] = "period_date <= ?";
            $params[] = $opts['to_date'];
        }

        $orderBy = $this->safeOrderBy($opts['order_by'] ?? 'period_date');
        $orderDir = strtoupper($opts['order_dir'] ?? 'DESC');
        if (!in_array($orderDir, ['ASC','DESC'], true)) $orderDir = 'DESC';

        $limit  = max(0, (int)($opts['limit']  ?? 50));
        $offset = max(0, (int)($opts['offset'] ?? 0));

        $sql = "SELECT * FROM company_financials";
        if ($where) $sql .= " WHERE " . implode(' AND ', $where);
        $sql .= " ORDER BY $orderBy $orderDir";
        if ($limit > 0) $sql .= " LIMIT $limit OFFSET $offset";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        $out = [];
        while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $out[] = $this->castRow($r);
        }
        return $out;
    }

    /** Count rows for the same filters as list() (for pagination totals). */
    public function count(array $opts = []): int
    {
        $where = [];
        $params = [];

        if (isset($opts['company_id'])) {
            $where[] = "company_id = ?";
            $params[] = (int)$opts['company_id'];
        }
        if (isset($opts['year'])) {
            $where[] = "year = ?";
            $params[] = (int)$opts['year'];
        }
        if (isset($opts['month'])) {
            $where[] = "month = ?";
            $params[] = (int)$opts['month'];
        }
        if (isset($opts['quarter'])) {
            $where[] = "quarter = ?";
            $params[] = (int)$opts['quarter'];
        }
        if (isset($opts['is_pre_ignition'])) {
            $where[] = "is_pre_ignition = ?";
            $params[] = (int)!!$opts['is_pre_ignition'];
        }
        if (!empty($opts['from_date'])) {
            $this->assertDateYmd($opts['from_date'], 'from_date');
            $where[] = "period_date >= ?";
            $params[] = $opts['from_date'];
        }
        if (!empty($opts['to_date'])) {
            $this->assertDateYmd($opts['to_date'], 'to_date');
            $where[] = "period_date <= ?";
            $params[] = $opts['to_date'];
        }

        $sql = "SELECT COUNT(*) FROM company_financials";
        if ($where) $sql .= " WHERE " . implode(' AND ', $where);

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        return (int)$stmt->fetchColumn();
    }

    /** Latest record for a company by period_date. */
    public function latestForCompany(int $companyId): ?array
    {
        $stmt = $this->conn->prepare(
            "SELECT * FROM company_financials WHERE company_id = ? ORDER BY period_date DESC LIMIT 1"
        );
        $stmt->execute([$companyId]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);
        return $r ? $this->castRow($r) : null;
    }

    /* =============================== Delete =============================== */

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM company_financials WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    public function deleteByCompanyPeriod(int $companyId, string $periodDate): bool
    {
        $this->assertDateYmd($periodDate, 'period_date');
        $stmt = $this->conn->prepare("DELETE FROM company_financials WHERE company_id = ? AND period_date = ?");
        $stmt->execute([$companyId, $periodDate]);
        return $stmt->rowCount() > 0;
    }

    /* =============================== Utils =============================== */

    private function safeOrderBy(string $col): string
    {
        static $allowed = [
            'period_date','year','month','created_at','updated_at',
            'turnover','net_profit',
            'turnover_monthly_avg','gp_margin','np_margin'
        ];
        return in_array($col, $allowed, true) ? $col : 'period_date';
    }

    /** Derive/validate year & month relative to period_date. */
    private function prepareTemporal(array $data): array
    {
        if (!empty($data['period_date'])) {
            $this->assertDateYmd($data['period_date'], 'period_date');
            $y = (int)substr($data['period_date'], 0, 4);
            $m = (int)substr($data['period_date'], 5, 2);
            if (!isset($data['year']))  $data['year']  = $y;
            if (!isset($data['month'])) $data['month'] = $m;
        }

        // If year/month provided, ensure they match period_date if it exists
        if (!empty($data['period_date']) && isset($data['year'], $data['month'])) {
            $y = (int)substr($data['period_date'], 0, 4);
            $m = (int)substr($data['period_date'], 5, 2);
            if ((int)$data['year'] !== $y || (int)$data['month'] !== $m) {
                throw new InvalidArgumentException("year/month must match period_date");
            }
        }
        return $data;
    }

    /** Validate YYYY-MM-DD string. */
    private function assertDateYmd(?string $s, string $field): void
    {
        if ($s === null) throw new InvalidArgumentException("$field is required");
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $s)) {
            throw new InvalidArgumentException("$field must be YYYY-MM-DD");
        }
        // Extra guard: checkdate
        $y = (int)substr($s, 0, 4);
        $m = (int)substr($s, 5, 2);
        $d = (int)substr($s, 8, 2);
        if (!checkdate($m, $d, $y)) {
            throw new InvalidArgumentException("$field is not a valid calendar date");
        }
    }

    /** Accept only WRITABLE keys and coerce types for DB. */
    private function sanitizeForWrite(array $data): array
    {
        $out = [];
        foreach (self::WRITABLE as $k) {
            if (!array_key_exists($k, $data)) continue;

            $v = $data[$k];
            if ($k === 'is_pre_ignition') {
                $out[$k] = $v === null ? null : (int)!!$v; // store as 0/1
            } elseif (in_array($k, self::INTS, true)) {
                $out[$k] = $v === null ? null : (int)$v;
            } elseif (in_array($k, self::DECS, true)) {
                // Keep DECIMALs precise as strings
                $out[$k] = $v === null ? null : (string)$v;
            } elseif ($k === 'period_date') {
                $this->assertDateYmd((string)$v, 'period_date');
                $out[$k] = $v;
            } else {
                $out[$k] = $v;
            }
        }
        return $out;
    }

    /**
     * Cast DB row into friendly PHP types:
     * - ints for INTS
     * - bool for is_pre_ignition
     * - DECIMALs remain strings for exactness
     */
    private function castRow(array $row): array
    {
        foreach (self::INTS as $k) {
            if (array_key_exists($k, $row) && $row[$k] !== null) {
                $row[$k] = (int)$row[$k];
            }
        }
        if (array_key_exists('is_pre_ignition', $row) && $row['is_pre_ignition'] !== null) {
            $row['is_pre_ignition'] = (bool)$row['is_pre_ignition'];
        }
        foreach (self::DECS as $k) {
            if (array_key_exists($k, $row) && $row[$k] !== null) {
                $row[$k] = (string)$row[$k];
            }
        }
        return $row;
    }
}
