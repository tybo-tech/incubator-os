<?php
declare(strict_types=1);

/**
 * MetricTypeAccount — binds a metric_type (measure definition) to a financial account source.
 *
 * A binding is global to the measure definition (`metric_types`). At read time it is resolved
 * **per company**: `account_type` is matched against that company's `company_accounts` rows.
 * `account_id` is an optional pin to one specific `company_accounts.id`; NULL means
 * "resolve by account_type within the company".
 *
 * Used by TargetMeasurementService (Sprint 007 Phase 3) to derive actuals from
 * `company_financial_yearly_stats` without re-entering financial data.
 */
class MetricTypeAccount
{
    private PDO $conn;

    private const WRITABLE = ['metric_type_id','account_type','account_id','is_revenue','combine_mode'];
    private const ACCOUNT_TYPES = ['domestic_revenue','export_revenue','expense','other'];
    private const COMBINE_MODES = ['sum','avg','latest'];

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /**
     * Create or update a binding. Upsert key: (metric_type_id, account_type, account_id).
     */
    public function bind(array $data): array
    {
        $f = $this->filterWritable($data);
        if (empty($f['metric_type_id'])) throw new InvalidArgumentException("metric_type_id is required");
        if (empty($f['account_type'])) throw new InvalidArgumentException("account_type is required");

        $f['metric_type_id'] = (int)$f['metric_type_id'];
        $f['account_type'] = $this->normalizeAccountType($f['account_type']);
        $f['account_id'] = isset($f['account_id']) && $f['account_id'] !== null && $f['account_id'] !== ''
            ? (int)$f['account_id'] : null;
        $f['is_revenue'] = array_key_exists('is_revenue', $f) ? (int)(bool)$f['is_revenue'] : 1;
        $f['combine_mode'] = $this->normalizeCombineMode($f['combine_mode'] ?? 'sum');

        $this->assertMetricTypeExists($f['metric_type_id']);
        if ($f['account_id'] !== null) $this->assertAccountExists($f['account_id']);

        $existing = $this->findBinding($f['metric_type_id'], $f['account_type'], $f['account_id']);
        if ($existing) {
            return $this->update((int)$existing['id'], $f);
        }

        $stmt = $this->conn->prepare(
            "INSERT INTO metric_type_accounts (metric_type_id, account_type, account_id, is_revenue, combine_mode)
             VALUES (?, ?, ?, ?, ?)"
        );
        $stmt->execute([$f['metric_type_id'], $f['account_type'], $f['account_id'], $f['is_revenue'], $f['combine_mode']]);
        return $this->getById((int)$this->conn->lastInsertId());
    }

    public function update(int $id, array $data): ?array
    {
        $existing = $this->getById($id);
        if (!$existing) throw new RuntimeException("metric_type_accounts id $id not found");

        $f = $this->filterWritable($data);
        if (isset($f['metric_type_id'])) {
            $f['metric_type_id'] = (int)$f['metric_type_id'];
            $this->assertMetricTypeExists($f['metric_type_id']);
        }
        if (isset($f['account_type'])) $f['account_type'] = $this->normalizeAccountType($f['account_type']);
        if (array_key_exists('account_id', $f)) {
            $f['account_id'] = $f['account_id'] !== null && $f['account_id'] !== '' ? (int)$f['account_id'] : null;
            if ($f['account_id'] !== null) $this->assertAccountExists($f['account_id']);
        }
        if (array_key_exists('is_revenue', $f)) $f['is_revenue'] = (int)(bool)$f['is_revenue'];
        if (isset($f['combine_mode'])) $f['combine_mode'] = $this->normalizeCombineMode($f['combine_mode']);
        if (!$f) return $existing;

        $sets = []; $params = [];
        foreach ($f as $k => $v) { $sets[] = "$k = ?"; $params[] = $v; }
        $params[] = $id;
        $stmt = $this->conn->prepare(
            "UPDATE metric_type_accounts SET " . implode(', ', $sets) . ", updated_at = NOW() WHERE id = ?"
        );
        $stmt->execute($params);
        return $this->getById($id);
    }

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare(
            "SELECT mta.*, mt.code AS metric_code, mt.name AS metric_name, mt.unit AS metric_unit
             FROM metric_type_accounts mta
             LEFT JOIN metric_types mt ON mt.id = mta.metric_type_id
             WHERE mta.id = ?"
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    public function findBinding(int $metricTypeId, string $accountType, ?int $accountId): ?array
    {
        $stmt = $this->conn->prepare(
            "SELECT * FROM metric_type_accounts
             WHERE metric_type_id = ? AND account_type = ? AND (account_id <=> ?)
             LIMIT 1"
        );
        $stmt->execute([$metricTypeId, $accountType, $accountId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    public function listByType(int $metricTypeId): array
    {
        $stmt = $this->conn->prepare(
            "SELECT mta.*, mt.code AS metric_code, mt.name AS metric_name, mt.unit AS metric_unit
             FROM metric_type_accounts mta
             LEFT JOIN metric_types mt ON mt.id = mta.metric_type_id
             WHERE mta.metric_type_id = ?
             ORDER BY mta.account_type ASC, mta.id ASC"
        );
        $stmt->execute([$metricTypeId]);
        return array_map([$this, 'castRow'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function listAll(array $filters = []): array
    {
        $sql = "SELECT mta.*, mt.code AS metric_code, mt.name AS metric_name, mt.unit AS metric_unit
                FROM metric_type_accounts mta
                LEFT JOIN metric_types mt ON mt.id = mta.metric_type_id
                WHERE 1=1";
        $params = [];
        if (isset($filters['metric_type_id'])) { $sql .= " AND mta.metric_type_id = ?"; $params[] = (int)$filters['metric_type_id']; }
        if (isset($filters['account_type'])) { $sql .= " AND mta.account_type = ?"; $params[] = $this->normalizeAccountType($filters['account_type']); }
        $sql .= " ORDER BY mta.metric_type_id ASC, mta.account_type ASC, mta.id ASC";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        return array_map([$this, 'castRow'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function unbind(int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM metric_type_accounts WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Resolve a measure's bindings to concrete, active accounts for ONE company.
     *
     * - Company-scoped: only accounts where company_accounts.company_id = $companyId.
     * - `account_id` pin: matched by id (must belong to the company, or it is ignored).
     * - `account_type` binding: matched against the company's accounts of that type.
     * - Overlapping bindings are **deduplicated by account id** — each account appears once.
     *
     * @return array<int,array{account_id:int,company_id:int,account_name:string,account_type:string,combine_mode:string,is_revenue:int,binding_id:int}>
     */
    public function resolveAccounts(int $metricTypeId, int $companyId): array
    {
        $sql = "SELECT ca.id AS account_id, ca.company_id, ca.account_name, ca.account_type,
                       mta.id AS binding_id, mta.combine_mode, mta.is_revenue
                FROM metric_type_accounts mta
                JOIN company_accounts ca
                  ON ca.company_id = ?
                 AND ca.is_active = 1
                 AND (
                      (mta.account_id IS NOT NULL AND ca.id = mta.account_id)
                   OR (mta.account_id IS NULL AND ca.account_type = mta.account_type)
                 )
                WHERE mta.metric_type_id = ?
                ORDER BY ca.id ASC, mta.id ASC";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$companyId, $metricTypeId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $seen = [];
        $out = [];
        foreach ($rows as $row) {
            $accountId = (int)$row['account_id'];
            if (isset($seen[$accountId])) continue; // dedup by account id — first binding wins
            $seen[$accountId] = true;
            $out[] = [
                'account_id' => $accountId,
                'company_id' => (int)$row['company_id'],
                'account_name' => (string)$row['account_name'],
                'account_type' => (string)$row['account_type'],
                'combine_mode' => (string)$row['combine_mode'],
                'is_revenue' => (int)$row['is_revenue'],
                'binding_id' => (int)$row['binding_id'],
            ];
        }
        return $out;
    }

    private function assertMetricTypeExists(int $metricTypeId): void
    {
        $stmt = $this->conn->prepare("SELECT id FROM metric_types WHERE id = ?");
        $stmt->execute([$metricTypeId]);
        if (!$stmt->fetchColumn()) throw new RuntimeException("metric_types id $metricTypeId not found");
    }

    private function assertAccountExists(int $accountId): void
    {
        $stmt = $this->conn->prepare("SELECT id FROM company_accounts WHERE id = ?");
        $stmt->execute([$accountId]);
        if (!$stmt->fetchColumn()) throw new RuntimeException("company_accounts id $accountId not found");
    }

    private function filterWritable(array $data): array
    {
        $out = [];
        foreach (self::WRITABLE as $k) if (array_key_exists($k, $data)) $out[$k] = $data[$k];
        return $out;
    }

    private function normalizeAccountType(mixed $v): string
    {
        $v = strtolower(trim((string)$v));
        if (!in_array($v, self::ACCOUNT_TYPES, true)) {
            throw new InvalidArgumentException("Invalid account_type '$v' — allowed: " . implode(', ', self::ACCOUNT_TYPES));
        }
        return $v;
    }

    private function normalizeCombineMode(mixed $v): string
    {
        $v = strtolower(trim((string)$v));
        return in_array($v, self::COMBINE_MODES, true) ? $v : 'sum';
    }

    private function castRow(array $row): array
    {
        $row['id'] = (int)$row['id'];
        $row['metric_type_id'] = (int)$row['metric_type_id'];
        if (isset($row['account_id']) && $row['account_id'] !== null) $row['account_id'] = (int)$row['account_id'];
        $row['is_revenue'] = (int)$row['is_revenue'];
        return $row;
    }
}
