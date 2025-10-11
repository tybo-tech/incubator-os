<?php
declare(strict_types=1);

final class CompanyRevenueSummary
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
     * Add a new revenue summary record.
     */
    public function add(array $data): array
    {
        $sql = "INSERT INTO company_revenue_summary (
                    tenant_id, client_id, company_id, program_id, cohort_id,
                    category_id, cycle_id,
                    year_,
                    revenue_q1, revenue_q2, revenue_q3, revenue_q4,
                    export_q1, export_q2, export_q3, export_q4,
                    unit, notes, title,
                    status_id, created_by, updated_by, created_at, updated_at
                ) VALUES (
                    :tenant_id, :client_id, :company_id, :program_id, :cohort_id,
                    :category_id, :cycle_id,
                    :year_,
                    :revenue_q1, :revenue_q2, :revenue_q3, :revenue_q4,
                    :export_q1, :export_q2, :export_q3, :export_q4,
                    :unit, :notes, :title,
                    :status_id, :created_by, :updated_by, NOW(), NOW()
                )";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            ':tenant_id'   => $data['tenant_id'] ?? null,
            ':client_id'   => $data['client_id'],
            ':company_id'  => $data['company_id'],
            ':program_id'  => $data['program_id'] ?? null,
            ':cohort_id'   => $data['cohort_id'] ?? null,
            ':category_id' => $data['category_id'] ?? null,
            ':cycle_id'    => $data['cycle_id'] ?? null,
            ':year_'       => $data['year_'],
            ':revenue_q1'  => $data['revenue_q1'] ?? 0,
            ':revenue_q2'  => $data['revenue_q2'] ?? 0,
            ':revenue_q3'  => $data['revenue_q3'] ?? 0,
            ':revenue_q4'  => $data['revenue_q4'] ?? 0,
            ':export_q1'   => $data['export_q1'] ?? 0,
            ':export_q2'   => $data['export_q2'] ?? 0,
            ':export_q3'   => $data['export_q3'] ?? 0,
            ':export_q4'   => $data['export_q4'] ?? 0,
            ':unit'        => $data['unit'] ?? 'USD',
            ':notes'       => $data['notes'] ?? null,
            ':title'       => $data['title'] ?? null,
            ':status_id'   => $data['status_id'] ?? 1,
            ':created_by'  => $data['created_by'] ?? null,
            ':updated_by'  => $data['updated_by'] ?? null,
        ]);

        return $this->getById((int)$this->conn->lastInsertId());
    }

    /**
     * Update an existing record.
     */
    public function update(int $id, array $fields): ?array
    {
        $allowed = [
            'revenue_q1','revenue_q2','revenue_q3','revenue_q4',
            'export_q1','export_q2','export_q3','export_q4',
            'unit','notes','title','status_id','updated_by'
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
        $sql = "UPDATE company_revenue_summary
                SET " . implode(', ', $sets) . ", updated_at = NOW()
                WHERE id = :id";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $this->getById($id);
    }

    /* =========================================================================
       READ METHODS
       ========================================================================= */

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM company_revenue_summary WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->cast($row) : null;
    }

    public function listByCompany(int $companyId): array
    {
        $stmt = $this->conn->prepare("SELECT * FROM company_revenue_summary WHERE company_id = ? ORDER BY year_");
        $stmt->execute([$companyId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function listByProgram(int $programId): array
    {
        $stmt = $this->conn->prepare("SELECT * FROM company_revenue_summary WHERE program_id = ? ORDER BY company_id, year_ DESC");
        $stmt->execute([$programId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function listByCohort(int $cohortId): array
    {
        $stmt = $this->conn->prepare("SELECT * FROM company_revenue_summary WHERE cohort_id = ? ORDER BY company_id, year_ DESC");
        $stmt->execute([$cohortId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function listByYear(int $year): array
    {
        $stmt = $this->conn->prepare("SELECT * FROM company_revenue_summary WHERE year_ = ? ORDER BY company_id ASC");
        $stmt->execute([$year]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /* =========================================================================
       DELETE
       ========================================================================= */

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM company_revenue_summary WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    /* =========================================================================
       AGGREGATES / ANALYTICS
       ========================================================================= */

    /**
     * Get aggregate totals for a company across all years.
     */
    public function getTotalsByCompany(int $companyId): array
    {
        $sql = "SELECT
                    SUM(revenue_q1 + revenue_q2 + revenue_q3 + revenue_q4) AS total_revenue,
                    SUM(export_q1 + export_q2 + export_q3 + export_q4) AS total_export,
                    CASE WHEN SUM(revenue_q1 + revenue_q2 + revenue_q3 + revenue_q4) > 0
                        THEN ROUND((SUM(export_q1 + export_q2 + export_q3 + export_q4) /
                                    SUM(revenue_q1 + revenue_q2 + revenue_q3 + revenue_q4)) * 100, 2)
                        ELSE 0 END AS avg_export_ratio
                FROM company_revenue_summary
                WHERE company_id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$companyId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * Get yearly trend summary for a given company.
     */
    public function getYearlyTrend(int $companyId): array
    {
        $sql = "SELECT
                    year_,
                    (revenue_q1 + revenue_q2 + revenue_q3 + revenue_q4) AS revenue_total,
                    (export_q1 + export_q2 + export_q3 + export_q4) AS export_total,
                    CASE WHEN (revenue_q1 + revenue_q2 + revenue_q3 + revenue_q4) > 0
                        THEN ROUND(((export_q1 + export_q2 + export_q3 + export_q4) /
                                    (revenue_q1 + revenue_q2 + revenue_q3 + revenue_q4)) * 100, 2)
                        ELSE 0 END AS export_ratio
                FROM company_revenue_summary
                WHERE company_id = ?
                ORDER BY year_ ASC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$companyId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /* =========================================================================
       INTERNAL HELPERS
       ========================================================================= */

    private function cast(array $row): array
    {
        $ints = ['id','tenant_id','client_id','company_id','program_id','cohort_id','category_id','cycle_id','status_id','year_'];
        foreach ($ints as $k) {
            if (isset($row[$k]) && $row[$k] !== null) {
                $row[$k] = (int)$row[$k];
            }
        }
        $decimals = [
            'revenue_q1','revenue_q2','revenue_q3','revenue_q4',
            'export_q1','export_q2','export_q3','export_q4'
        ];
        foreach ($decimals as $k) {
            if (isset($row[$k])) {
                $row[$k] = (float)$row[$k];
            }
        }
        return $row;
    }
}
