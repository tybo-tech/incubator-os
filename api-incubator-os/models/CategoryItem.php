<?php
declare(strict_types=1);

/**
 * CategoryItem Model - Manages company participation in cohorts
 *
 * Handles the enhanced categories_item table with:
 * - cohort_id, program_id, client_id (hierarchy)
 * - company_id (participant)
 * - status, joined_at, left_at (lifecycle)
 * - notes, added_by_user_id (metadata)
 */
final class CategoryItem
{
    private PDO $conn;

    /** Writable fields for company-cohort assignments */
    private const WRITABLE = [
        'cohort_id', 'program_id', 'client_id', 'company_id',
        'status', 'joined_at', 'left_at', 'notes', 'added_by_user_id'
    ];

    /** Valid status values */
    private const VALID_STATUSES = ['active', 'completed', 'withdrawn'];

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /* =========================================================================
       COMPANY-COHORT MANAGEMENT
       ========================================================================= */

    /**
     * Add a company to a cohort with full hierarchy context
     */
    public function attachCompany(
        int $cohortId,
        int $companyId,
        ?int $addedByUserId = null,
        ?string $notes = null
    ): array {
        // Get hierarchy context from cohort
        $hierarchy = $this->getCohortHierarchy($cohortId);
        if (!$hierarchy) {
            throw new InvalidArgumentException("Cohort {$cohortId} not found");
        }

        // Check if already exists
        if ($this->getAssignment($cohortId, $companyId)) {
            throw new InvalidArgumentException("Company {$companyId} already assigned to cohort {$cohortId}");
        }

        $sql = "INSERT INTO categories_item (
                    cohort_id, program_id, client_id, company_id,
                    status, joined_at, notes, added_by_user_id
                ) VALUES (?, ?, ?, ?, 'active', NOW(), ?, ?)";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            $cohortId,
            $hierarchy['program_id'],
            $hierarchy['client_id'],
            $companyId,
            $notes,
            $addedByUserId
        ]);

        return $this->getById((int)$this->conn->lastInsertId());
    }

    /**
     * Remove a company from a cohort
     */
    public function detachCompany(int $cohortId, int $companyId): bool
    {
        $sql = "DELETE FROM categories_item WHERE cohort_id = ? AND company_id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$cohortId, $companyId]);

        return $stmt->rowCount() > 0;
    }

    /**
     * Update company participation status or metadata
     */
    public function updateAssignment(int $assignmentId, array $data): ?array
    {
        $fields = $this->filterWritable($data);
        if (!$fields) return $this->getById($assignmentId);

        // Validate status if provided
        if (isset($fields['status']) && !in_array($fields['status'], self::VALID_STATUSES)) {
            throw new InvalidArgumentException("Invalid status: {$fields['status']}");
        }

        $sets = [];
        $params = [];
        foreach ($fields as $key => $value) {
            $sets[] = "{$key} = ?";
            $params[] = $value;
        }
        $params[] = $assignmentId;

        $sql = "UPDATE categories_item SET " . implode(', ', $sets) . " WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $this->getById($assignmentId);
    }

    /* =========================================================================
       QUERY METHODS
       ========================================================================= */

    /**
     * Get assignment by ID
     */
    public function getById(int $id): ?array
    {
        $sql = "SELECT ci.*, c.name as company_name, c.email_address, c.registration_no
                FROM categories_item ci
                LEFT JOIN companies c ON c.id = ci.company_id
                WHERE ci.id = ?";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? $this->castAssignment($row) : null;
    }

    /**
     * Get specific company-cohort assignment
     */
    public function getAssignment(int $cohortId, int $companyId): ?array
    {
        $sql = "SELECT ci.*, c.name as company_name, c.email_address, c.registration_no
                FROM categories_item ci
                LEFT JOIN companies c ON c.id = ci.company_id
                WHERE ci.cohort_id = ? AND ci.company_id = ?";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$cohortId, $companyId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? $this->castAssignment($row) : null;
    }

    /**
     * List all companies in a specific cohort
     */
    public function getCompaniesInCohort(int $cohortId, ?string $status = null): array
    {
        $sql = "SELECT c.*, ci.status, ci.joined_at, ci.left_at, ci.notes, ci.id as assignment_id
                FROM categories_item ci
                INNER JOIN companies c ON c.id = ci.company_id
                WHERE ci.cohort_id = ?";

        $params = [$cohortId];

        if ($status) {
            $sql .= " AND ci.status = ?";
            $params[] = $status;
        }

        $sql .= " ORDER BY ci.joined_at DESC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return array_map([$this, 'castCompanyAssignment'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * List all companies in a specific program (across cohorts)
     */
    public function getCompaniesInProgram(int $programId, ?string $status = null): array
    {
        $sql = "SELECT c.*, ci.status, ci.joined_at, ci.left_at, ci.notes, ci.cohort_id,
                       cat.name as cohort_name, ci.id as assignment_id
                FROM categories_item ci
                INNER JOIN companies c ON c.id = ci.company_id
                INNER JOIN categories cat ON cat.id = ci.cohort_id
                WHERE ci.program_id = ?";

        $params = [$programId];

        if ($status) {
            $sql .= " AND ci.status = ?";
            $params[] = $status;
        }

        $sql .= " ORDER BY ci.joined_at DESC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return array_map([$this, 'castCompanyAssignment'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * Get company's participation history across all programs
     */
    public function getCompanyParticipation(int $companyId): array
    {
        $sql = "SELECT ci.*,
                       cli.name as client_name,
                       prog.name as program_name,
                       coh.name as cohort_name
                FROM categories_item ci
                LEFT JOIN categories cli ON cli.id = ci.client_id
                LEFT JOIN categories prog ON prog.id = ci.program_id
                LEFT JOIN categories coh ON coh.id = ci.cohort_id
                WHERE ci.company_id = ?
                ORDER BY ci.joined_at DESC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$companyId]);

        return array_map([$this, 'castAssignment'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /* =========================================================================
       STATISTICS & REPORTING
       ========================================================================= */

    /**
     * Get statistics for a category (client/program/cohort)
     */
    public function getCategoryStatistics(int $categoryId, string $categoryType): array
    {
        $stats = [];

        switch ($categoryType) {
            case 'client':
                $stats = $this->getClientStatistics($categoryId);
                break;
            case 'program':
                $stats = $this->getProgramStatistics($categoryId);
                break;
            case 'cohort':
                $stats = $this->getCohortStatistics($categoryId);
                break;
        }

        return $stats;
    }

    /**
     * Get client-level statistics
     */
    private function getClientStatistics(int $clientId): array
    {
        $sql = "SELECT
                    COUNT(DISTINCT ci.program_id) as programs_count,
                    COUNT(DISTINCT ci.cohort_id) as cohorts_count,
                    COUNT(DISTINCT ci.company_id) as companies_count,
                    COUNT(DISTINCT CASE WHEN ci.status = 'active' THEN ci.company_id END) as active_companies,
                    COUNT(DISTINCT CASE WHEN ci.status = 'completed' THEN ci.company_id END) as completed_companies
                FROM categories_item ci
                WHERE ci.client_id = ?";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$clientId]);

        return $this->castStatistics($stmt->fetch(PDO::FETCH_ASSOC));
    }

    /**
     * Get program-level statistics
     */
    private function getProgramStatistics(int $programId): array
    {
        $sql = "SELECT
                    COUNT(DISTINCT ci.cohort_id) as cohorts_count,
                    COUNT(DISTINCT ci.company_id) as companies_count,
                    COUNT(DISTINCT CASE WHEN ci.status = 'active' THEN ci.company_id END) as active_companies,
                    COUNT(DISTINCT CASE WHEN ci.status = 'completed' THEN ci.company_id END) as completed_companies
                FROM categories_item ci
                WHERE ci.program_id = ?";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$programId]);

        return $this->castStatistics($stmt->fetch(PDO::FETCH_ASSOC));
    }

    /**
     * Get cohort-level statistics
     */
    private function getCohortStatistics(int $cohortId): array
    {
        $sql = "SELECT
                    COUNT(DISTINCT ci.company_id) as companies_count,
                    COUNT(DISTINCT CASE WHEN ci.status = 'active' THEN ci.company_id END) as active_companies,
                    COUNT(DISTINCT CASE WHEN ci.status = 'completed' THEN ci.company_id END) as completed_companies,
                    COUNT(DISTINCT CASE WHEN ci.status = 'withdrawn' THEN ci.company_id END) as withdrawn_companies
                FROM categories_item ci
                WHERE ci.cohort_id = ?";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$cohortId]);

        return $this->castStatistics($stmt->fetch(PDO::FETCH_ASSOC));
    }

    /* =========================================================================
       HELPER METHODS
       ========================================================================= */

    /**
     * Get cohort hierarchy (program_id, client_id) for denormalization
     */
    private function getCohortHierarchy(int $cohortId): ?array
    {
        $sql = "SELECT
                    coh.id as cohort_id,
                    prog.id as program_id,
                    cli.id as client_id
                FROM categories coh
                LEFT JOIN categories prog ON prog.id = coh.parent_id AND prog.type = 'program'
                LEFT JOIN categories cli ON cli.id = prog.parent_id AND cli.type = 'client'
                WHERE coh.id = ? AND coh.type = 'cohort'";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$cohortId]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Filter input data to only writable fields
     */
    private function filterWritable(array $data): array
    {
        return array_intersect_key($data, array_flip(self::WRITABLE));
    }

    /**
     * Cast assignment record for API response
     */
    private function castAssignment(array $row): array
    {
        return [
            'id' => (int)$row['id'],
            'cohort_id' => (int)$row['cohort_id'],
            'program_id' => (int)$row['program_id'],
            'client_id' => $row['client_id'] ? (int)$row['client_id'] : null,
            'company_id' => (int)$row['company_id'],
            'status' => $row['status'],
            'joined_at' => $row['joined_at'],
            'left_at' => $row['left_at'],
            'notes' => $row['notes'],
            'added_by_user_id' => $row['added_by_user_id'] ? (int)$row['added_by_user_id'] : null,
            'created_at' => $row['created_at'],
            // Include company info if joined
            'company_name' => $row['company_name'] ?? null,
            'company_email' => $row['email_address'] ?? null,
            'company_registration' => $row['registration_no'] ?? null,
            // Include hierarchy names if joined
            'client_name' => $row['client_name'] ?? null,
            'program_name' => $row['program_name'] ?? null,
            'cohort_name' => $row['cohort_name'] ?? null,
        ];
    }

    /**
     * Cast company record with assignment info for API response
     */
    private function castCompanyAssignment(array $row): array
    {
        return [
            'id' => (int)$row['id'],
            'name' => $row['name'],
            'email_address' => $row['email_address'],
            'registration_no' => $row['registration_no'],
            'contact_person' => $row['contact_person'],
            'contact_number' => $row['contact_number'],
            'city' => $row['city'],
            'industry' => $row['sector_name'],
            // Assignment specific fields
            'assignment_id' => (int)$row['assignment_id'],
            'status' => $row['status'],
            'joined_at' => $row['joined_at'],
            'left_at' => $row['left_at'],
            'notes' => $row['notes'],
            'cohort_id' => $row['cohort_id'] ?? null,
            'cohort_name' => $row['cohort_name'] ?? null,
        ];
    }

    /**
     * Cast statistics for API response
     */
    private function castStatistics(array $row): array
    {
        $stats = [];
        foreach ($row as $key => $value) {
            $stats[$key] = $value !== null ? (int)$value : 0;
        }
        return $stats;
    }
}
?>
