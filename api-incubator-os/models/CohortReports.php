<?php
declare(strict_types=1);

class CohortReports
{
    private PDO $conn;

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /* =====================================================
       ===============  CORE COHORT REPORTS  ===============
       ===================================================== */

    /** Basic totals: clients, programs, cohorts, companies */
    public function overallSummary(): array
    {
        $sql = "
            SELECT
                (SELECT COUNT(*) FROM categories WHERE type = 'client') AS total_clients,
                (SELECT COUNT(*) FROM categories WHERE type = 'program') AS total_programs,
                (SELECT COUNT(*) FROM categories WHERE type = 'cohort') AS total_cohorts,
                (SELECT COUNT(DISTINCT company_id) FROM categories_item) AS total_companies
        ";
        return $this->fetchOne($sql);
    }

    /** Companies per program */
    public function companiesPerProgram(): array
    {
        $sql = "
            SELECT
                p.id AS program_id,
                p.name AS program,
                COUNT(ci.company_id) AS total_companies
            FROM categories p
            LEFT JOIN categories_item ci ON ci.program_id = p.id
            WHERE p.type = 'program'
            GROUP BY p.id, p.name
            ORDER BY total_companies DESC, p.name ASC
        ";
        return $this->fetchAll($sql);
    }

    /** Companies per cohort */
    public function companiesPerCohort(): array
    {
        $sql = "
            SELECT
                c.id AS cohort_id,
                c.name AS cohort,
                p.name AS program,
                COUNT(ci.company_id) AS total_companies
            FROM categories c
            LEFT JOIN categories_item ci ON ci.cohort_id = c.id
            LEFT JOIN categories p ON c.parent_id = p.id
            WHERE c.type = 'cohort'
            GROUP BY c.id, c.name, p.name
            ORDER BY total_companies DESC, c.name ASC
        ";
        return $this->fetchAll($sql);
    }

    /** Cohort composition by company sector */
    public function sectorDistributionByCohort(): array
    {
        $sql = "
            SELECT
                coh.id AS cohort_id,
                coh.name AS cohort,
                ind.name AS sector,
                COUNT(comp.id) AS total_companies
            FROM categories coh
            JOIN categories_item ci ON ci.cohort_id = coh.id
            JOIN companies comp ON ci.company_id = comp.id
            LEFT JOIN industries ind ON comp.industry_id = ind.id
            WHERE coh.type = 'cohort'
            GROUP BY coh.id, coh.name, ind.name
            ORDER BY coh.name ASC, total_companies DESC
        ";
        return $this->fetchAll($sql);
    }

    /** Active company count by client */
    public function activeCompaniesByClient(): array
    {
        $sql = "
            SELECT
                cli.id AS client_id,
                cli.name AS client,
                COUNT(DISTINCT ci.company_id) AS total_active
            FROM categories cli
            LEFT JOIN categories prog ON prog.parent_id = cli.id
            LEFT JOIN categories coh ON coh.parent_id = prog.id
            LEFT JOIN categories_item ci ON ci.cohort_id = coh.id
            WHERE cli.type = 'client' AND ci.status = 'active'
            GROUP BY cli.id, cli.name
            ORDER BY total_active DESC
        ";
        return $this->fetchAll($sql);
    }

    /** Enhanced cohort performance metrics */
    public function cohortPerformanceMetrics(int $cohortId = null): array
    {
        $whereClause = $cohortId ? "AND coh.id = :cohort_id" : "";
        $sql = "
            SELECT
                coh.id AS cohort_id,
                coh.name AS cohort_name,
                p.name AS program_name,
                cli.name AS client_name,
                COUNT(ci.company_id) AS total_companies,
                COUNT(CASE WHEN ci.status = 'active' THEN 1 END) AS active_companies,
                COUNT(CASE WHEN ci.status = 'completed' THEN 1 END) AS completed_companies,
                COUNT(CASE WHEN comp.has_valid_bbbbee = 1 THEN 1 END) AS bbbee_compliant,
                COUNT(CASE WHEN comp.has_tax_clearance = 1 THEN 1 END) AS tax_compliant,
                COUNT(CASE WHEN comp.has_cipc_registration = 1 THEN 1 END) AS cipc_compliant,
                COUNT(CASE WHEN comp.youth_owned = 1 THEN 1 END) AS youth_owned,
                COUNT(CASE WHEN comp.black_ownership = 1 THEN 1 END) AS black_owned,
                COUNT(CASE WHEN comp.black_women_ownership = 1 THEN 1 END) AS women_owned,
                AVG(comp.turnover_estimated) AS avg_turnover,
                SUM(comp.turnover_estimated) AS total_turnover,
                AVG(comp.permanent_employees + comp.temporary_employees) AS avg_employees,
                MIN(ci.joined_at) AS earliest_join,
                MAX(ci.joined_at) AS latest_join
            FROM categories coh
            LEFT JOIN categories_item ci ON ci.cohort_id = coh.id
            LEFT JOIN companies comp ON ci.company_id = comp.id
            LEFT JOIN categories p ON coh.parent_id = p.id
            LEFT JOIN categories cli ON p.parent_id = cli.id
            WHERE coh.type = 'cohort' $whereClause
            GROUP BY coh.id, coh.name, p.name, cli.name
            ORDER BY total_companies DESC, coh.name ASC
        ";

        $params = $cohortId ? ['cohort_id' => $cohortId] : [];
        return $this->fetchAll($sql, $params);
    }

    /** Industry distribution across all cohorts */
    public function industryDistribution(): array
    {
        $sql = "
            SELECT
                COALESCE(ind.name, 'Unspecified') AS industry,
                COUNT(DISTINCT comp.id) AS total_companies,
                COUNT(DISTINCT ci.cohort_id) AS cohorts_count,
                AVG(comp.turnover_estimated) AS avg_turnover,
                COUNT(CASE WHEN comp.youth_owned = 1 THEN 1 END) AS youth_owned_count,
                COUNT(CASE WHEN comp.black_women_ownership = 1 THEN 1 END) AS women_owned_count
            FROM companies comp
            JOIN categories_item ci ON ci.company_id = comp.id
            LEFT JOIN industries ind ON comp.industry_id = ind.id
            GROUP BY ind.id, ind.name
            ORDER BY total_companies DESC
        ";
        return $this->fetchAll($sql);
    }

    /** Compliance summary by cohort */
    public function complianceSummaryByCohort(int $cohortId = null): array
    {
        $whereClause = $cohortId ? "AND coh.id = :cohort_id" : "";
        $sql = "
            SELECT
                coh.id AS cohort_id,
                coh.name AS cohort_name,
                COUNT(comp.id) AS total_companies,
                ROUND(
                    (COUNT(CASE WHEN comp.has_valid_bbbbee = 1 THEN 1 END) * 100.0) / COUNT(comp.id), 2
                ) AS bbbee_compliance_rate,
                ROUND(
                    (COUNT(CASE WHEN comp.has_tax_clearance = 1 THEN 1 END) * 100.0) / COUNT(comp.id), 2
                ) AS tax_compliance_rate,
                ROUND(
                    (COUNT(CASE WHEN comp.has_cipc_registration = 1 THEN 1 END) * 100.0) / COUNT(comp.id), 2
                ) AS cipc_compliance_rate,
                ROUND(
                    (COUNT(CASE WHEN comp.has_valid_bbbbee = 1 AND comp.has_tax_clearance = 1 AND comp.has_cipc_registration = 1 THEN 1 END) * 100.0) / COUNT(comp.id), 2
                ) AS full_compliance_rate
            FROM categories coh
            JOIN categories_item ci ON ci.cohort_id = coh.id
            JOIN companies comp ON ci.company_id = comp.id
            WHERE coh.type = 'cohort' $whereClause
            GROUP BY coh.id, coh.name
            ORDER BY full_compliance_rate DESC, coh.name ASC
        ";

        $params = $cohortId ? ['cohort_id' => $cohortId] : [];
        return $this->fetchAll($sql, $params);
    }

    /** Financial metrics by cohort */
    public function financialMetricsByCohort(int $cohortId = null): array
    {
        $whereClause = $cohortId ? "AND coh.id = :cohort_id" : "";
        $sql = "
            SELECT
                coh.id AS cohort_id,
                coh.name AS cohort_name,
                p.name AS program_name,
                COUNT(comp.id) AS total_companies,
                SUM(comp.turnover_estimated) AS total_estimated_turnover,
                AVG(comp.turnover_estimated) AS avg_estimated_turnover,
                MIN(comp.turnover_estimated) AS min_turnover,
                MAX(comp.turnover_estimated) AS max_turnover,
                SUM(comp.permanent_employees + comp.temporary_employees) AS total_employees,
                AVG(comp.permanent_employees + comp.temporary_employees) AS avg_employees,
                COUNT(CASE WHEN comp.turnover_estimated > 0 THEN 1 END) AS companies_with_turnover,
                COUNT(CASE WHEN comp.turnover_estimated > 1000000 THEN 1 END) AS companies_over_1m
            FROM categories coh
            JOIN categories_item ci ON ci.cohort_id = coh.id
            JOIN companies comp ON ci.company_id = comp.id
            LEFT JOIN categories p ON coh.parent_id = p.id
            WHERE coh.type = 'cohort' $whereClause
            GROUP BY coh.id, coh.name, p.name
            ORDER BY total_estimated_turnover DESC, coh.name ASC
        ";

        $params = $cohortId ? ['cohort_id' => $cohortId] : [];
        return $this->fetchAll($sql, $params);
    }

    /** Geographic distribution of companies */
    public function geographicDistribution(int $cohortId = null): array
    {
        $whereClause = $cohortId ? "AND ci.cohort_id = :cohort_id" : "";
        $sql = "
            SELECT
                COALESCE(comp.business_location, comp.city, 'Unknown') AS location,
                COUNT(comp.id) AS company_count,
                COUNT(DISTINCT ci.cohort_id) AS cohort_count,
                AVG(comp.turnover_estimated) AS avg_turnover,
                GROUP_CONCAT(DISTINCT coh.name ORDER BY coh.name SEPARATOR ', ') AS cohorts
            FROM companies comp
            JOIN categories_item ci ON ci.company_id = comp.id
            JOIN categories coh ON ci.cohort_id = coh.id
            WHERE 1=1 $whereClause
            GROUP BY COALESCE(comp.business_location, comp.city, 'Unknown')
            ORDER BY company_count DESC
        ";

        $params = $cohortId ? ['cohort_id' => $cohortId] : [];
        return $this->fetchAll($sql, $params);
    }

    /** Time-based cohort analytics */
    public function cohortTimelineAnalytics(): array
    {
        $sql = "
            SELECT
                DATE_FORMAT(ci.joined_at, '%Y-%m') AS month_year,
                COUNT(DISTINCT ci.company_id) AS companies_joined,
                COUNT(DISTINCT ci.cohort_id) AS active_cohorts,
                AVG(comp.turnover_estimated) AS avg_turnover_joined
            FROM categories_item ci
            JOIN companies comp ON ci.company_id = comp.id
            WHERE ci.joined_at IS NOT NULL
            GROUP BY DATE_FORMAT(ci.joined_at, '%Y-%m')
            ORDER BY month_year DESC
            LIMIT 12
        ";
        return $this->fetchAll($sql);
    }

    /** Cohort comparison report */
    public function cohortComparison(array $cohortIds): array
    {
        if (empty($cohortIds)) {
            return [];
        }

        $placeholders = str_repeat('?,', count($cohortIds) - 1) . '?';
        $sql = "
            SELECT
                coh.id AS cohort_id,
                coh.name AS cohort_name,
                p.name AS program_name,
                COUNT(ci.company_id) AS total_companies,
                COUNT(CASE WHEN ci.status = 'active' THEN 1 END) AS active_companies,
                ROUND(AVG(comp.turnover_estimated), 2) AS avg_turnover,
                COUNT(CASE WHEN comp.has_valid_bbbbee = 1 AND comp.has_tax_clearance = 1 AND comp.has_cipc_registration = 1 THEN 1 END) AS fully_compliant,
                COUNT(CASE WHEN comp.youth_owned = 1 THEN 1 END) AS youth_owned,
                COUNT(CASE WHEN comp.black_women_ownership = 1 THEN 1 END) AS women_owned,
                COUNT(DISTINCT comp.industry_id) AS industry_diversity
            FROM categories coh
            LEFT JOIN categories_item ci ON ci.cohort_id = coh.id
            LEFT JOIN companies comp ON ci.company_id = comp.id
            LEFT JOIN categories p ON coh.parent_id = p.id
            WHERE coh.id IN ($placeholders)
            GROUP BY coh.id, coh.name, p.name
            ORDER BY total_companies DESC
        ";
        return $this->fetchAll($sql, $cohortIds);
    }

    /* =====================================================
       ===============  INTERNAL UTILITIES  =================
       ===================================================== */

    private function fetchAll(string $sql, array $params = []): array
    {
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function fetchOne(string $sql, array $params = []): ?array
    {
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }
}
