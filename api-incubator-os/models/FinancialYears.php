<?php
declare(strict_types=1);

final class FinancialYears
{
    private PDO $conn;

    // Define writable fields for security
    private const WRITABLE = [
        'name', 'start_month', 'end_month', 'fy_start_year', 'fy_end_year',
        'is_active', 'description'
    ];

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /* =========================================================================
       CREATE / UPDATE
       ========================================================================= */

    /**
     * Add a new financial year.
     */
    public function add(array $data): array
    {
        $filteredData = $this->filterWritable($data);

        $sql = "INSERT INTO financial_years (
                    name, start_month, end_month, fy_start_year, fy_end_year,
                    is_active, description, created_at, updated_at
                ) VALUES (
                    :name, :start_month, :end_month, :fy_start_year, :fy_end_year,
                    :is_active, :description, NOW(), NOW()
                )";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            ':name'          => $filteredData['name'],
            ':start_month'   => $filteredData['start_month'],
            ':end_month'     => $filteredData['end_month'],
            ':fy_start_year' => $filteredData['fy_start_year'],
            ':fy_end_year'   => $filteredData['fy_end_year'],
            ':is_active'     => $filteredData['is_active'] ?? 0,
            ':description'   => $filteredData['description'] ?? null
        ]);

        $id = (int) $this->conn->lastInsertId();
        return $this->getById($id);
    }

    /**
     * Update an existing financial year.
     */
    public function update(int $id, array $data): array
    {
        $filteredData = $this->filterWritable($data);

        $sql = "UPDATE financial_years
                SET name = :name,
                    start_month = :start_month,
                    end_month = :end_month,
                    fy_start_year = :fy_start_year,
                    fy_end_year = :fy_end_year,
                    is_active = :is_active,
                    description = :description,
                    updated_at = NOW()
                WHERE id = :id";

        $stmt = $this->conn->prepare($sql);
        $result = $stmt->execute([
            ':id'            => $id,
            ':name'          => $filteredData['name'],
            ':start_month'   => $filteredData['start_month'],
            ':end_month'     => $filteredData['end_month'],
            ':fy_start_year' => $filteredData['fy_start_year'],
            ':fy_end_year'   => $filteredData['fy_end_year'],
            ':is_active'     => $filteredData['is_active'] ?? 0,
            ':description'   => $filteredData['description'] ?? null
        ]);

        if (!$result || $stmt->rowCount() === 0) {
            throw new Exception("Financial year with ID $id not found or no changes made");
        }

        return $this->getById($id);
    }

    /* =========================================================================
       READ
       ========================================================================= */

    /**
     * Get a financial year by ID.
     */
    public function getById(int $id): array
    {
        $stmt = $this->conn->prepare("SELECT * FROM financial_years WHERE id = ?");
        $stmt->execute([$id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$result) {
            throw new Exception("Financial year with ID $id not found");
        }

        return $this->castTypes($result);
    }

    /**
     * Get all financial years with optional filters.
     */
    public function listAll(array $filters = []): array
    {
        $sql = "SELECT * FROM financial_years WHERE 1=1";
        $params = [];

        // Apply filters
        if (isset($filters['is_active'])) {
            $sql .= " AND is_active = :is_active";
            $params[':is_active'] = (int) $filters['is_active'];
        }

        if (isset($filters['year'])) {
            $sql .= " AND (fy_start_year = :year OR fy_end_year = :year)";
            $params[':year'] = (int) $filters['year'];
        }

        if (isset($filters['start_year'])) {
            $sql .= " AND fy_start_year >= :start_year";
            $params[':start_year'] = (int) $filters['start_year'];
        }

        if (isset($filters['end_year'])) {
            $sql .= " AND fy_end_year <= :end_year";
            $params[':end_year'] = (int) $filters['end_year'];
        }

        // Default ordering
        $sql .= " ORDER BY id";

        // Pagination
        if (isset($filters['limit'])) {
            $sql .= " LIMIT " . (int) $filters['limit'];
            if (isset($filters['offset'])) {
                $sql .= " OFFSET " . (int) $filters['offset'];
            }
        }

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map([$this, 'castTypes'], $results);
    }

    /**
     * Get active financial years only.
     */
    public function getActive(): array
    {
        return $this->listAll(['is_active' => 1]);
    }

    /**
     * Get current active financial year.
     */
    public function getCurrentActive(): ?array
    {
        $activeYears = $this->getActive();

        // Return the first active year, or null if none found
        return count($activeYears) > 0 ? $activeYears[0] : null;
    }

    /**
     * Get financial years within a specific range.
     */
    public function getByYearRange(int $startYear, int $endYear): array
    {
        return $this->listAll([
            'start_year' => $startYear,
            'end_year' => $endYear
        ]);
    }

    /* =========================================================================
       DELETE
       ========================================================================= */

    /**
     * Delete a financial year.
     */
    public function delete(int $id): bool
    {
        // First check if the financial year exists
        $this->getById($id);

        $stmt = $this->conn->prepare("DELETE FROM financial_years WHERE id = ?");
        return $stmt->execute([$id]) && $stmt->rowCount() > 0;
    }

    /* =========================================================================
       BUSINESS LOGIC
       ========================================================================= */

    /**
     * Set a financial year as active (and deactivate others).
     */
    public function setActive(int $id): array
    {
        $this->conn->beginTransaction();

        try {
            // First verify the financial year exists
            $this->getById($id);

            // Deactivate all other financial years
            $stmt = $this->conn->prepare("UPDATE financial_years SET is_active = 0 WHERE id != ?");
            $stmt->execute([$id]);

            // Activate the selected financial year
            $stmt = $this->conn->prepare("UPDATE financial_years SET is_active = 1, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$id]);

            $this->conn->commit();
            return $this->getById($id);

        } catch (Exception $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }

    /**
     * Generate financial year name based on start and end years.
     */
    public function generateName(int $startYear, int $endYear): string
    {
        return "FY {$startYear}/" . substr((string) $endYear, -2);
    }

    /**
     * Check if a financial year period conflicts with existing ones.
     */
    public function hasConflict(int $startYear, int $endYear, ?int $excludeId = null): bool
    {
        $sql = "SELECT id FROM financial_years
                WHERE ((fy_start_year = :start_year AND fy_end_year = :end_year))";

        $params = [
            ':start_year' => $startYear,
            ':end_year' => $endYear
        ];

        if ($excludeId) {
            $sql .= " AND id != :exclude_id";
            $params[':exclude_id'] = $excludeId;
        }

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $stmt->rowCount() > 0;
    }

    /**
     * Get the months that belong to a financial year.
     */
    public function getMonthsInYear(int $id): array
    {
        $fy = $this->getById($id);
        $months = [];

        $startMonth = $fy['start_month'];
        $endMonth = $fy['end_month'];
        $startYear = $fy['fy_start_year'];
        $endYear = $fy['fy_end_year'];

        $currentMonth = $startMonth;
        $currentYear = $startYear;

        while (true) {
            $months[] = [
                'month' => $currentMonth,
                'year' => $currentYear,
                'name' => date('F Y', mktime(0, 0, 0, $currentMonth, 1, $currentYear))
            ];

            // Move to next month
            $currentMonth++;
            if ($currentMonth > 12) {
                $currentMonth = 1;
                $currentYear++;
            }

            // Break if we've reached the end
            if ($currentYear > $endYear ||
                ($currentYear === $endYear && $currentMonth > $endMonth)) {
                break;
            }
        }

        return $months;
    }

    /* =========================================================================
       UTILITIES
       ========================================================================= */

    /**
     * Filter data to only include writable fields.
     */
    private function filterWritable(array $data): array
    {
        return array_intersect_key($data, array_flip(self::WRITABLE));
    }

    /**
     * Cast database types to proper PHP types.
     */
    private function castTypes(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'name' => (string) $row['name'],
            'start_month' => (int) $row['start_month'],
            'end_month' => (int) $row['end_month'],
            'fy_start_year' => (int) $row['fy_start_year'],
            'fy_end_year' => (int) $row['fy_end_year'],
            'is_active' => (bool) $row['is_active'],
            'description' => $row['description'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at']
        ];
    }

    /**
     * Get summary statistics.
     */
    public function getSummary(): array
    {
        $sql = "SELECT
                    COUNT(*) as total_years,
                    COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_years,
                    MIN(fy_start_year) as earliest_year,
                    MAX(fy_end_year) as latest_year
                FROM financial_years";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            'total_years' => (int) $result['total_years'],
            'active_years' => (int) $result['active_years'],
            'earliest_year' => (int) $result['earliest_year'],
            'latest_year' => (int) $result['latest_year']
        ];
    }
}
