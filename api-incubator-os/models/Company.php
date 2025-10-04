<?php
declare(strict_types=1);

class Company
{
    private PDO $conn;

    /** Columns allowed to be written via add/update */
    private const WRITABLE = [
        'name','registration_no','bbbee_level','cipc_status',
        'service_offering','description','city','suburb','address','postal_code',
        'business_location','contact_number','email_address','trading_name',
        'youth_owned','black_ownership','black_women_ownership',
        'youth_owned_text','black_ownership_text','black_women_ownership_text',
        'compliance_notes','has_valid_bbbbee','has_tax_clearance','is_sars_registered',
        'has_cipc_registration','bbbee_valid_status','bbbee_expiry_date',
        'tax_valid_status','tax_pin_expiry_date','vat_number',
        'turnover_estimated','turnover_actual','permanent_employees','temporary_employees',
        'locations','industry_id'
    ];

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /** Create a new company. $data is an associative array with any WRITABLE keys. */
    public function add(array $data): array
    {
        $fields = $this->filterWritable($data);
        if (!isset($fields['name'])) {
            throw new InvalidArgumentException("Field 'name' is required");
        }

        $sql = "INSERT INTO companies (" . implode(',', array_keys($fields)) . ")
                VALUES (" . implode(',', array_fill(0, count($fields), '?')) . ")";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute(array_values($fields));

        return $this->getById((int)$this->conn->lastInsertId());
    }

    /** Full update (PATCH style). Only provided keys are updated. */
    public function update(int $id, array $data): ?array
    {
        $fields = $this->filterWritable($data);
        if (!$fields) return $this->getById($id);

        $sets = [];
        $params = [];
        foreach ($fields as $k => $v) {
            $sets[] = "{$k} = ?";
            $params[] = $v;
        }
        $params[] = $id;

        $sql = "UPDATE companies SET " . implode(', ', $sets) . ", updated_at = NOW() WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $this->getById($id);
    }

    /** Idempotent upsert by registration number (optional helper). */
    public function upsertByRegNo(string $registrationNo, array $data): array
    {
        $existing = $this->getByRegistrationNo($registrationNo);
        $data['registration_no'] = $registrationNo;

        if ($existing) {
            return $this->update((int)$existing['id'], $data);
        }
        return $this->add($data);
    }

    /**
     * Bulk insert companies.
     * Accepts an array of associative arrays (each a company payload with WRITABLE keys).
     * - Skips rows missing required 'name'.
     * - Optionally performs upsert by registration_no (if $upsertByRegistrationNo = true and registration_no provided).
     * - Wraps everything in a transaction for atomicity.
     * Returns an array with summary + inserted/updated rows.
     */
    public function bulkAdd(array $rows, bool $upsertByRegistrationNo = false): array
    {
        if (empty($rows)) {
            return [
                'count' => 0,
                'inserted' => [],
                'updated' => [],
                'skipped' => 0,
                'errors' => []
            ];
        }

        $inserted = [];
        $updated = [];
        $skipped = 0;
        $errors = [];

        $this->conn->beginTransaction();
        try {
            foreach ($rows as $idx => $raw) {
                try {
                    if (!is_array($raw)) { $skipped++; continue; }
                    if (empty($raw['name'])) { $skipped++; continue; }

                    if ($upsertByRegistrationNo && !empty($raw['registration_no'])) {
                        $existing = $this->getByRegistrationNo($raw['registration_no']);
                        if ($existing) {
                            $updated[] = $this->update((int)$existing['id'], $raw);
                            continue;
                        }
                    }

                    // Normal insert path
                    $inserted[] = $this->add($raw);
                } catch (Throwable $t) {
                    $errors[] = [ 'index' => $idx, 'message' => $t->getMessage() ];
                }
            }
            $this->conn->commit();
        } catch (Throwable $t) {
            $this->conn->rollBack();
            throw $t; // bubble up
        }

        return [
            'count' => count($inserted) + count($updated),
            'inserted_count' => count($inserted),
            'updated_count' => count($updated),
            'inserted' => $inserted,
            'updated' => $updated,
            'skipped' => $skipped,
            'errors' => $errors,
        ];
    }

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM companies WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    public function getByRegistrationNo(string $reg): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM companies WHERE registration_no = ?");
        $stmt->execute([$reg]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    /** Lightweight search with common filters + pagination */
    public function search(array $filters = [], int $limit = 50, int $offset = 0): array
    {
        $where = [];
        $params = [];

        if (!empty($filters['q'])) {
            $where[] = "(name LIKE ? OR registration_no LIKE ? OR city LIKE ?)";
            $q = '%' . $filters['q'] . '%';
            array_push($params, $q, $q, $q);
        }
        if (!empty($filters['industry_id'])) {
            $where[] = "industry_id = ?";
            $params[] = (int)$filters['industry_id'];
        }
        if (isset($filters['city'])) {
            $where[] = "city = ?";
            $params[] = $filters['city'];
        }
        if (isset($filters['bbbee_level'])) {
            $where[] = "bbbee_level = ?";
            $params[] = $filters['bbbee_level'];
        }
        if (isset($filters['has_tax_clearance'])) {
            $where[] = "has_tax_clearance = ?";
            $params[] = $filters['has_tax_clearance'] ? 1 : 0;
        }

        $sql = "SELECT * FROM companies";
        if ($where) $sql .= " WHERE " . implode(' AND ', $where);
        $sql .= " ORDER BY name ASC LIMIT ? OFFSET ?";

        $stmt = $this->conn->prepare($sql);
        foreach ($params as $i => $v) {
            $stmt->bindValue($i + 1, $v);
        }
        $stmt->bindValue(count($params) + 1, $limit, PDO::PARAM_INT);
        $stmt->bindValue(count($params) + 2, $offset, PDO::PARAM_INT);
        $stmt->execute();

        $out = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $out[] = $this->castRow($row);
        }
        return $out;
    }

    /** Get total count of search results (for pagination) */
    public function getSearchCount(array $filters = []): int
    {
        $where = [];
        $params = [];

        if (!empty($filters['q'])) {
            $where[] = "(name LIKE ? OR registration_no LIKE ? OR city LIKE ?)";
            $q = '%' . $filters['q'] . '%';
            array_push($params, $q, $q, $q);
        }
        if (!empty($filters['industry_id'])) {
            $where[] = "industry_id = ?";
            $params[] = (int)$filters['industry_id'];
        }
        if (isset($filters['city'])) {
            $where[] = "city = ?";
            $params[] = $filters['city'];
        }
        if (isset($filters['bbbee_level'])) {
            $where[] = "bbbee_level = ?";
            $params[] = $filters['bbbee_level'];
        }
        if (isset($filters['has_tax_clearance'])) {
            $where[] = "has_tax_clearance = ?";
            $params[] = $filters['has_tax_clearance'] ? 1 : 0;
        }

        $sql = "SELECT COUNT(*) FROM companies";
        if ($where) $sql .= " WHERE " . implode(' AND ', $where);

        $stmt = $this->conn->prepare($sql);
        foreach ($params as $i => $v) {
            $stmt->bindValue($i + 1, $v);
        }
        $stmt->execute();

        return (int)$stmt->fetchColumn();
    }

    /** Simple list (paged) */
    public function list(int $limit = 50, int $offset = 0): array
    {
        $stmt = $this->conn->prepare("SELECT * FROM companies ORDER BY created_at DESC LIMIT ? OFFSET ?");
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->bindValue(2, $offset, PDO::PARAM_INT);
        $stmt->execute();

        $rows = [];
        while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $rows[] = $this->castRow($r);
        }
        return $rows;
    }

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM companies WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    /** Helper: set industry by name (resolves to industries.id) */
    public function setIndustryByName(int $companyId, string $industryName): ?array
    {
        $stmt = $this->conn->prepare("SELECT id FROM industries WHERE name = ?");
        $stmt->execute([$industryName]);
        $iid = $stmt->fetchColumn();
        if (!$iid) {
            throw new RuntimeException("Industry not found: {$industryName}");
        }
        return $this->update($companyId, ['industry_id' => (int)$iid]);
    }

    /**
     * Get companies available for assignment to a cohort (not already assigned)
     * Returns minimal fields optimized for picker UI
     */
    public function getAvailableForCohort(
        int $cohortId,
        string $search = '',
        string $descriptionFilter = '',
        int $limit = 50,
        bool $full = false
    ): array
    {
        $selectCols = $full ? 'c.*' : 'c.id, c.name, c.email_address, c.registration_no';
        $sql = "SELECT DISTINCT {$selectCols} FROM companies c WHERE 1=1";

        $params = [];

        // Add search filter if provided
        if ($search) {
            $sql .= " AND (c.name LIKE ? OR c.email_address LIKE ? OR c.registration_no LIKE ?)";
            $searchTerm = "%{$search}%";
            $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm]);
        }

        // Filter by exact description/tag if provided (e.g. '#fy24')
        if ($descriptionFilter) {
            $sql .= " AND c.description = ?";
            $params[] = $descriptionFilter;
        }

        // Exclude companies already in this cohort (if cohort_id provided)
        if ($cohortId > 0) {
            $sql .= " AND c.id NOT IN (
                SELECT ci.company_id
                FROM categories_item ci
                WHERE ci.cohort_id = ? AND ci.status = 'active'
            )";
            $params[] = $cohortId;
        }

    // LIMIT handling: if limit <= 0, fetch all up to a safety cap
    $safetyCap = $full ? 5000 : 2000; // generous safety caps
    $effectiveLimit = ($limit <= 0) ? $safetyCap : min($limit, $safetyCap);
    $sql .= " ORDER BY c.name ASC LIMIT {$effectiveLimit}";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        $companies = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if ($full) {
            // Cast rows to include proper types
            return array_map(fn($r) => $this->castRow($r), $companies);
        }

        return array_map(function($row) {
            return [
                'id' => (int)$row['id'],
                'name' => $row['name'],
                'email_address' => $row['email_address'],
                'registration_no' => $row['registration_no']
            ];
        }, $companies);
    }

    /* ------------------------- internals ------------------------- */

    private function filterWritable(array $data): array
    {
        $out = [];
        foreach (self::WRITABLE as $k) {
            if (array_key_exists($k, $data)) {
                // normalize booleans/ints where appropriate
                if (in_array($k, ['youth_owned','black_ownership','black_women_ownership','has_valid_bbbbee','has_tax_clearance','is_sars_registered','has_cipc_registration'], true)) {
                    $out[$k] = $data[$k] ? 1 : 0;
                } elseif (in_array($k, ['permanent_employees','temporary_employees','industry_id'], true)) {
                    $out[$k] = is_null($data[$k]) ? null : (int)$data[$k];
                } elseif (in_array($k, ['turnover_estimated','turnover_actual'], true)) {
                    $out[$k] = is_null($data[$k]) ? null : (float)$data[$k];
                } else {
                    $out[$k] = $data[$k];
                }
            }
        }
        return $out;
    }

    private function castRow(array $row): array
    {
        // Cast known numeric/boolean fields for consistent API responses
        foreach (['youth_owned','black_ownership','black_women_ownership','has_valid_bbbbee','has_tax_clearance','is_sars_registered','has_cipc_registration'] as $b) {
            if (isset($row[$b])) $row[$b] = (bool)$row[$b];
        }
        foreach (['permanent_employees','temporary_employees','industry_id','id'] as $i) {
            if (isset($row[$i]) && $row[$i] !== null) $row[$i] = (int)$row[$i];
        }
        foreach (['turnover_estimated','turnover_actual'] as $d) {
            if (isset($row[$d]) && $row[$d] !== null) $row[$d] = (float)$row[$d];
        }
        return $row;
    }
}
