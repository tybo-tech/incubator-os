<?php
declare(strict_types=1);

class IndustryReports
{
    private PDO $conn;

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /* =====================================================
       ===============  CORE INDUSTRY REPORTS  ===============
       ===================================================== */

    /** Company count per industry */
    public function companiesPerIndustry(): array
    {
        $sql = "
            SELECT
                i.id,
                i.name AS industry,
                COALESCE(p.name, 'Root') AS parent_sector,
                COUNT(c.id) AS total_companies
            FROM industries i
            LEFT JOIN industries p ON i.parent_id = p.id
            LEFT JOIN companies c ON c.industry_id = i.id
            GROUP BY i.id, i.name, p.name
            ORDER BY total_companies DESC, i.name ASC
        ";
        return $this->fetchAll($sql);
    }

    /** Average and total turnover by industry */
    public function financialByIndustry(): array
    {
        $sql = "
            SELECT
                i.id,
                i.name AS industry,
                ROUND(AVG(c.turnover_actual), 2) AS avg_turnover,
                ROUND(SUM(c.turnover_actual), 2) AS total_turnover,
                COUNT(c.id) AS total_companies
            FROM industries i
            LEFT JOIN companies c ON c.industry_id = i.id
            GROUP BY i.id, i.name
            ORDER BY total_turnover DESC
        ";
        return $this->fetchAll($sql);
    }

    /** Employment distribution per industry */
    public function employmentByIndustry(): array
    {
        $sql = "
            SELECT
                i.id,
                i.name AS industry,
                SUM(c.permanent_employees) AS permanent,
                SUM(c.temporary_employees) AS temporary,
                SUM(c.permanent_employees + c.temporary_employees) AS total_employees
            FROM industries i
            LEFT JOIN companies c ON c.industry_id = i.id
            GROUP BY i.id, i.name
            ORDER BY total_employees DESC
        ";
        return $this->fetchAll($sql);
    }

    /** Ownership diversity (youth, black, women) */
    public function diversityByIndustry(): array
    {
        $sql = "
            SELECT
                i.id,
                i.name AS industry,
                SUM(c.youth_owned) AS youth_owned,
                SUM(c.black_ownership) AS black_owned,
                SUM(c.black_women_ownership) AS women_owned,
                COUNT(c.id) AS total_companies
            FROM industries i
            LEFT JOIN companies c ON c.industry_id = i.id
            GROUP BY i.id, i.name
            ORDER BY total_companies DESC
        ";
        return $this->fetchAll($sql);
    }

    /** Industries with most active companies */
    public function topIndustries(int $limit = 5): array
    {
        $sql = "
            SELECT
                i.name AS industry,
                COUNT(c.id) AS total
            FROM industries i
            JOIN companies c ON c.industry_id = i.id
            GROUP BY i.id, i.name
            ORDER BY total DESC
            LIMIT " . (int)$limit;

        return $this->fetchAll($sql);
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
}
