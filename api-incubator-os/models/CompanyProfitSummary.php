<?php
declare(strict_types=1);

final class CompanyProfitSummary
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

    public function add(array $data): array
    {
        $sql = "INSERT INTO company_profit_summary (
                    tenant_id, client_id, company_id, program_id, cohort_id, year_,
                    gross_q1, gross_q2, gross_q3, gross_q4,
                    operating_q1, operating_q2, operating_q3, operating_q4,
                    npbt_q1, npbt_q2, npbt_q3, npbt_q4,
                    gross_margin, operating_margin, npbt_margin,
                    unit, notes, title,
                    status_id, created_by, updated_by, created_at, updated_at
                ) VALUES (
                    :tenant_id, :client_id, :company_id, :program_id, :cohort_id, :year_,
                    :gross_q1, :gross_q2, :gross_q3, :gross_q4,
                    :operating_q1, :operating_q2, :operating_q3, :operating_q4,
                    :npbt_q1, :npbt_q2, :npbt_q3, :npbt_q4,
                    :gross_margin, :operating_margin, :npbt_margin,
                    :unit, :notes, :title,
                    :status_id, :created_by, :updated_by, NOW(), NOW()
                )";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            ':tenant_id' => $data['tenant_id'] ?? null,
            ':client_id' => $data['client_id'],
            ':company_id' => $data['company_id'],
            ':program_id' => $data['program_id'] ?? null,
            ':cohort_id' => $data['cohort_id'] ?? null,
            ':year_' => $data['year_'],
            ':gross_q1' => $data['gross_q1'] ?? 0,
            ':gross_q2' => $data['gross_q2'] ?? 0,
            ':gross_q3' => $data['gross_q3'] ?? 0,
            ':gross_q4' => $data['gross_q4'] ?? 0,
            ':operating_q1' => $data['operating_q1'] ?? 0,
            ':operating_q2' => $data['operating_q2'] ?? 0,
            ':operating_q3' => $data['operating_q3'] ?? 0,
            ':operating_q4' => $data['operating_q4'] ?? 0,
            ':npbt_q1' => $data['npbt_q1'] ?? 0,
            ':npbt_q2' => $data['npbt_q2'] ?? 0,
            ':npbt_q3' => $data['npbt_q3'] ?? 0,
            ':npbt_q4' => $data['npbt_q4'] ?? 0,
            ':gross_margin' => $data['gross_margin'] ?? 0,
            ':operating_margin' => $data['operating_margin'] ?? 0,
            ':npbt_margin' => $data['npbt_margin'] ?? 0,
            ':unit' => $data['unit'] ?? 'USD',
            ':notes' => $data['notes'] ?? null,
            ':title' => $data['title'] ?? null,
            ':status_id' => $data['status_id'] ?? 1,
            ':created_by' => $data['created_by'] ?? null,
            ':updated_by' => $data['updated_by'] ?? null,
        ]);

        return $this->getById((int)$this->conn->lastInsertId());
    }

    public function update(int $id, array $fields): ?array
    {
        $allowed = [
            'gross_q1','gross_q2','gross_q3','gross_q4',
            'operating_q1','operating_q2','operating_q3','operating_q4',
            'npbt_q1','npbt_q2','npbt_q3','npbt_q4',
            'gross_margin','operating_margin','npbt_margin',
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
        $sql = "UPDATE company_profit_summary
                SET " . implode(', ', $sets) . ", updated_at = NOW()
                WHERE id = :id";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $this->getById($id);
    }

    /* =========================================================================
       READ
       ========================================================================= */

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM company_profit_summary WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->cast($row) : null;
    }

    public function listByCompany(int $companyId): array
    {
        $stmt = $this->conn->prepare("SELECT * FROM company_profit_summary WHERE company_id = ? ORDER BY year_ DESC");
        $stmt->execute([$companyId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function listByProgram(int $programId): array
    {
        $stmt = $this->conn->prepare("SELECT * FROM company_profit_summary WHERE program_id = ? ORDER BY company_id, year_ DESC");
        $stmt->execute([$programId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function listByCohort(int $cohortId): array
    {
        $stmt = $this->conn->prepare("SELECT * FROM company_profit_summary WHERE cohort_id = ? ORDER BY company_id, year_ DESC");
        $stmt->execute([$cohortId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function listByYear(int $year): array
    {
        $stmt = $this->conn->prepare("SELECT * FROM company_profit_summary WHERE year_ = ? ORDER BY company_id ASC");
        $stmt->execute([$year]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /* =========================================================================
       DELETE
       ========================================================================= */

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM company_profit_summary WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    /* =========================================================================
       ANALYTICS / SUMMARY
       ========================================================================= */

    public function getTotalsByCompany(int $companyId): array
    {
        $sql = "SELECT
                    SUM(gross_q1 + gross_q2 + gross_q3 + gross_q4) AS gross_total,
                    SUM(operating_q1 + operating_q2 + operating_q3 + operating_q4) AS operating_total,
                    SUM(npbt_q1 + npbt_q2 + npbt_q3 + npbt_q4) AS npbt_total
                FROM company_profit_summary
                WHERE company_id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$companyId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
    }

    public function getYearlyTrend(int $companyId): array
    {
        $sql = "SELECT
                    year_,
                    (gross_q1 + gross_q2 + gross_q3 + gross_q4) AS gross_total,
                    (operating_q1 + operating_q2 + operating_q3 + operating_q4) AS operating_total,
                    (npbt_q1 + npbt_q2 + npbt_q3 + npbt_q4) AS npbt_total
                FROM company_profit_summary
                WHERE company_id = ?
                ORDER BY year_ ASC";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$companyId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /* =========================================================================
       HELPERS
       ========================================================================= */

    private function cast(array $row): array
    {
        $ints = ['id','tenant_id','client_id','company_id','program_id','cohort_id','status_id','year_'];
        foreach ($ints as $k) {
            if (isset($row[$k]) && $row[$k] !== null) {
                $row[$k] = (int)$row[$k];
            }
        }
        $decimals = [
            'gross_q1','gross_q2','gross_q3','gross_q4',
            'operating_q1','operating_q2','operating_q3','operating_q4',
            'npbt_q1','npbt_q2','npbt_q3','npbt_q4',
            'gross_margin','operating_margin','npbt_margin'
        ];
        foreach ($decimals as $k) {
            if (isset($row[$k])) {
                $row[$k] = (float)$row[$k];
            }
        }
        return $row;
    }
}
