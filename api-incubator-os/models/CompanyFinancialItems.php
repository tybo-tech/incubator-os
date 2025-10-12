<?php
declare(strict_types=1);

final class CompanyFinancialItems
{
    private PDO $conn;

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /* =========================================================================
       CREATE / UPDATE
       ========================================================================= */

    /**
     * Add a financial item (works for cost, asset, liability, equity, etc.)
     */
    public function add(array $data): array
    {
        $sql = "INSERT INTO company_financial_items (
                    tenant_id, client_id, company_id, program_id, cohort_id, year_,
                    item_type, category_id, name, amount, note,
                    status_id, created_by, updated_by, created_at, updated_at
                ) VALUES (
                    :tenant_id, :client_id, :company_id, :program_id, :cohort_id, :year_,
                    :item_type, :category_id, :name, :amount, :note,
                    :status_id, :created_by, :updated_by, NOW(), NOW()
                )";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            ':tenant_id'   => $data['tenant_id'] ?? null,
            ':client_id'   => $data['client_id'],
            ':company_id'  => $data['company_id'],
            ':program_id'  => $data['program_id'] ?? null,
            ':cohort_id'   => $data['cohort_id'] ?? null,
            ':year_'       => $data['year_'],
            ':item_type'   => strtolower($data['item_type']),
            ':category_id' => $data['category_id'] ?? null,
            ':name'        => $data['name'],
            ':amount'      => $data['amount'] ?? 0,
            ':note'        => $data['note'] ?? null,
            ':status_id'   => $data['status_id'] ?? 1,
            ':created_by'  => $data['created_by'] ?? null,
            ':updated_by'  => $data['updated_by'] ?? null,
        ]);

        $result = $this->getById((int)$this->conn->lastInsertId());

        // Auto-recalculate profit summaries for cost items
        $itemType = strtolower($data['item_type']);
        if (in_array($itemType, ['direct_cost', 'operational_cost'])) {
            try {
                $this->recalculateProfitForYear(
                    (int)$data['company_id'],
                    (int)$data['year_']
                );
            } catch (Throwable $e) {
                error_log("Profit recalc failed for company {$data['company_id']}, year {$data['year_']}: " . $e->getMessage());
                // Continue execution - cost update succeeded even if profit sync failed
            }
        }

        return $result;
    }

    /**
     * Update a financial item.
     */
    public function update(int $id, array $fields): ?array
    {
        // Get the current record first to check for changes that need profit recalculation
        $current = $this->getById($id);
        if (!$current) return null;

        $allowed = [
            'item_type','category_id','name','amount','note','status_id','updated_by'
        ];
        $sets = [];
        $params = [];

        foreach ($allowed as $col) {
            if (array_key_exists($col, $fields)) {
                $sets[] = "$col = :$col";
                $params[":$col"] = $fields[$col];
            }
        }

        if (!$sets) return $this->getById($id);

        $params[':id'] = $id;
        $sql = "UPDATE company_financial_items
                SET " . implode(', ', $sets) . ", updated_at = NOW()
                WHERE id = :id";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        $result = $this->getById($id);

        // Auto-recalculate profit summaries if cost-related fields changed
        $needsRecalc = false;
        if (isset($fields['amount']) && $fields['amount'] !== $current['amount']) {
            $needsRecalc = true;
        }
        if (isset($fields['item_type']) && strtolower($fields['item_type']) !== $current['item_type']) {
            $needsRecalc = true;
        }

        if ($needsRecalc) {
            $itemType = isset($fields['item_type']) ? strtolower($fields['item_type']) : $current['item_type'];
            if (in_array($itemType, ['direct_cost', 'operational_cost']) || in_array($current['item_type'], ['direct_cost', 'operational_cost'])) {
                try {
                    $this->recalculateProfitForYear(
                        $current['company_id'],
                        $current['year_']
                    );
                } catch (Throwable $e) {
                    error_log("Profit recalc failed for company {$current['company_id']}, year {$current['year_']}: " . $e->getMessage());
                    // Continue execution - cost update succeeded even if profit sync failed
                }
            }
        }

        return $result;
    }

    /* =========================================================================
       READ METHODS
       ========================================================================= */

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT cfi.*, c.name as category_name
                                      FROM company_financial_items cfi
                                      LEFT JOIN categories c ON cfi.category_id = c.id
                                      WHERE cfi.id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->cast($row) : null;
    }

    public function listByCompany(int $companyId, ?string $type = null, ?int $year = null): array
    {
        $sql = "SELECT cfi.*, c.name as category_name
                FROM company_financial_items cfi
                LEFT JOIN financial_categories c ON cfi.category_id = c.id
                WHERE cfi.company_id = :company_id";
        $params = [':company_id' => $companyId];

        if ($type) {
            $sql .= " AND cfi.item_type = :type";
            $params[':type'] = strtolower($type);
        }
        if ($year) {
            $sql .= " AND cfi.year_ = :year_";
            $params[':year_'] = $year;
        }

        $sql .= " ORDER BY cfi.year_ DESC, cfi.name ASC";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return array_map([$this, 'cast'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function listByType(string $type, ?int $companyId = null, ?int $year = null): array
    {
        $sql = "SELECT cfi.*, c.name as category_name
                FROM company_financial_items cfi
                LEFT JOIN categories c ON cfi.category_id = c.id
                WHERE cfi.item_type = :type";
        $params = [':type' => strtolower($type)];

        if ($companyId) {
            $sql .= " AND cfi.company_id = :company_id";
            $params[':company_id'] = $companyId;
        }
        if ($year) {
            $sql .= " AND cfi.year_ = :year_";
            $params[':year_'] = $year;
        }

        $sql .= " ORDER BY cfi.name ASC";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return array_map([$this, 'cast'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /* =========================================================================
       DELETE
       ========================================================================= */

    public function delete(int $id): bool
    {
        // Get the record before deletion for profit recalculation
        $current = $this->getById($id);

        $stmt = $this->conn->prepare("DELETE FROM company_financial_items WHERE id = ?");
        $stmt->execute([$id]);
        $deleted = $stmt->rowCount() > 0;

        // Auto-recalculate profit summaries if we deleted a cost item
        if ($deleted && $current && in_array($current['item_type'], ['direct_cost', 'operational_cost'])) {
            try {
                $this->recalculateProfitForYear(
                    $current['company_id'],
                    $current['year_']
                );
            } catch (Throwable $e) {
                error_log("Profit recalc failed after delete for company {$current['company_id']}, year {$current['year_']}: " . $e->getMessage());
            }
        }

        return $deleted;
    }

    public function deleteByCompanyYear(int $companyId, int $year, string $type): int
    {
        $stmt = $this->conn->prepare("
            DELETE FROM company_financial_items
            WHERE company_id = ? AND year_ = ? AND item_type = ?
        ");
        $stmt->execute([$companyId, $year, strtolower($type)]);
        return $stmt->rowCount();
    }

    /* =========================================================================
       AGGREGATES / SUMMARIES
       ========================================================================= */

    /**
     * Get total amount per item_type (assets, liabilities, costs, etc.)
     */
    public function getTotalsByTypeAndYear(int $companyId, int $year): array
    {
        $sql = "SELECT item_type, SUM(amount) AS total_amount
                FROM company_financial_items
                WHERE company_id = ? AND year_ = ?
                GROUP BY item_type";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$companyId, $year]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $out = [];
        foreach ($rows as $r) {
            $out[$r['item_type']] = (float)$r['total_amount'];
        }
        return $out;
    }

    /**
     * Totals grouped by category and type.
     */
    public function getTotalsByCategory(int $companyId, int $year): array
    {
        $sql = "SELECT
                    fi.category_id,
                    fc.name AS category_name,
                    fi.item_type,
                    SUM(fi.amount) AS total_amount
                FROM company_financial_items fi
                LEFT JOIN financial_categories fc ON fc.id = fi.category_id
                WHERE fi.company_id = ? AND fi.year_ = ?
                GROUP BY fi.category_id, fi.item_type, fc.name
                ORDER BY fi.item_type, fc.name";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$companyId, $year]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /* =========================================================================
       HELPERS
       ========================================================================= */

    /**
     * Recalculate profit margins after a cost update.
     */
    private function recalculateProfitForYear(int $companyId, int $year): void
    {
        // 1. Get revenue total
        $stmt = $this->conn->prepare("
            SELECT (revenue_q1 + revenue_q2 + revenue_q3 + revenue_q4) AS total_revenue
            FROM company_revenue_summary
            WHERE company_id = ? AND year_ = ?
            LIMIT 1
        ");
        $stmt->execute([$companyId, $year]);
        $revenueTotal = (float)($stmt->fetchColumn() ?? 0);

        // 2. Get total direct and operational costs
        $totals = $this->getTotalsByTypeAndYear($companyId, $year);
        $directCosts = $totals['direct_cost'] ?? 0;
        $operationalCosts = $totals['operational_cost'] ?? 0;

        // 3. Compute profit layers
        $grossProfit = $revenueTotal - $directCosts;
        $operatingProfit = $grossProfit - $operationalCosts;

        // 4. Compute margins safely
        $grossMargin = $revenueTotal > 0 ? round(($grossProfit / $revenueTotal) * 100, 2) : 0;
        $operatingMargin = $revenueTotal > 0 ? round(($operatingProfit / $revenueTotal) * 100, 2) : 0;

        // 5. Update or create company_profit_summary record
        $stmt = $this->conn->prepare("
            INSERT INTO company_profit_summary (
                company_id, year_, gross_total, gross_margin,
                operating_total, operating_margin, created_at, updated_at
            ) VALUES (
                :company_id, :year_, :gross_total, :gross_margin,
                :operating_total, :operating_margin, NOW(), NOW()
            ) ON DUPLICATE KEY UPDATE
                gross_total = :gross_total,
                gross_margin = :gross_margin,
                operating_total = :operating_total,
                operating_margin = :operating_margin,
                updated_at = NOW()
        ");
        $stmt->execute([
            ':company_id' => $companyId,
            ':year_' => $year,
            ':gross_total' => $grossProfit,
            ':gross_margin' => $grossMargin,
            ':operating_total' => $operatingProfit,
            ':operating_margin' => $operatingMargin
        ]);
    }

    private function cast(array $row): array
    {
        $ints = [
            'id','tenant_id','client_id','company_id','program_id',
            'cohort_id','category_id','status_id','year_'
        ];
        foreach ($ints as $k) {
            if (isset($row[$k]) && $row[$k] !== null) {
                $row[$k] = (int)$row[$k];
            }
        }

        if (isset($row['amount'])) {
            $row['amount'] = (float)$row['amount'];
        }

        $row['item_type'] = strtolower((string)($row['item_type'] ?? ''));
        return $row;
    }
}
