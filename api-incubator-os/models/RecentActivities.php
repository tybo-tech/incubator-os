<?php
declare(strict_types=1);

final class RecentActivities
{
    private PDO $conn;

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /* =========================================================================
       CREATE
       ========================================================================= */

    /**
     * Log a new activity event
     */
    public function addActivity(array $data): int
    {
        $sql = "INSERT INTO recent_activities
                (tenant_id, company_id, user_id, module, action, reference_id, description, activity_date, created_at)
                VALUES (:tenant_id, :company_id, :user_id, :module, :action, :reference_id, :description, :activity_date, NOW())";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            ':tenant_id'      => $data['tenant_id'] ?? null,
            ':company_id'     => $data['company_id'] ?? null,
            ':user_id'        => $data['user_id'] ?? null,
            ':module'         => $data['module'] ?? null,
            ':action'         => $data['action'] ?? null,
            ':reference_id'   => $data['reference_id'] ?? null,
            ':description'    => $data['description'] ?? '',
            ':activity_date'  => $data['activity_date'] ?? date('Y-m-d H:i:s')
        ]);

        return (int)$this->conn->lastInsertId();
    }

    /* =========================================================================
       READ
       ========================================================================= */

    /**
     * Retrieve activities with optional filters
     *
     * Filters supported:
     * - module (string)
     * - company_id (int)
     * - user_id (int)
     * - action (string)
     * - start_date / end_date (date range)
     * - limit (int)
     */
    public function getActivities(array $filters = []): array
    {
        $where = [];
        $params = [];

        if (!empty($filters['module'])) {
            $where[] = 'module = ?';
            $params[] = $filters['module'];
        }

        if (!empty($filters['company_id'])) {
            $where[] = 'company_id = ?';
            $params[] = (int)$filters['company_id'];
        }

        if (!empty($filters['user_id'])) {
            $where[] = 'user_id = ?';
            $params[] = (int)$filters['user_id'];
        }

        if (!empty($filters['action'])) {
            $where[] = 'action = ?';
            $params[] = $filters['action'];
        }

        if (!empty($filters['start_date']) && !empty($filters['end_date'])) {
            $where[] = 'activity_date BETWEEN ? AND ?';
            $params[] = $filters['start_date'];
            $params[] = $filters['end_date'];
        }

        $sql = "SELECT * FROM recent_activities";
        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $sql .= ' ORDER BY activity_date DESC';

        if (!empty($filters['limit'])) {
            $sql .= ' LIMIT ' . (int)$filters['limit'];
        } else {
            $sql .= ' LIMIT 50';
        }

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Retrieve a single activity by ID
     */
    public function getActivityById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM recent_activities WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Retrieve activities for a specific module (shortcut)
     */
    public function getActivitiesByModule(string $module, int $limit = 50): array
    {
        return $this->getActivities(['module' => $module, 'limit' => $limit]);
    }

    /* =========================================================================
       UTILITIES
       ========================================================================= */

    /**
     * Get a human-friendly recent summary (e.g., dashboard preview)
     */
    public function getRecentSummary(int $limit = 10): array
    {
        $sql = "SELECT id, description, module, action, activity_date
                FROM recent_activities
                ORDER BY activity_date DESC
                LIMIT :limit";

        $stmt = $this->conn->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
