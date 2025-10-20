<?php
declare(strict_types=1);

final class ActionItems
{
    private PDO $conn;

    // Define writable fields for security - matches action_items table structure
    private const WRITABLE = [
        'tenant_id', 'company_id', 'context_type', 'category', 'description',
        'status', 'priority', 'progress', 'target_completion_date', 'actual_completion_date',
        'owner_user_id', 'assigned_to_user_id', 'estimated_hours', 'actual_hours',
        'budget_allocated', 'budget_spent', 'dependencies', 'notes', 'tags',
        'source_data', 'metrics', 'is_archived'
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
     * Add a new action item.
     */
    public function add(array $data): array
    {
        $filteredData = $this->filterWritable($data);

        $sql = "INSERT INTO action_items (
                    tenant_id, company_id, context_type, category, description,
                    status, priority, progress, target_completion_date, actual_completion_date,
                    owner_user_id, assigned_to_user_id, estimated_hours, actual_hours,
                    budget_allocated, budget_spent, dependencies, notes, tags,
                    source_data, metrics, is_archived, created_at, updated_at
                ) VALUES (
                    :tenant_id, :company_id, :context_type, :category, :description,
                    :status, :priority, :progress, :target_completion_date, :actual_completion_date,
                    :owner_user_id, :assigned_to_user_id, :estimated_hours, :actual_hours,
                    :budget_allocated, :budget_spent, :dependencies, :notes, :tags,
                    :source_data, :metrics, :is_archived, NOW(), NOW()
                )";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            ':tenant_id'                => $filteredData['tenant_id'] ?? null,
            ':company_id'               => $filteredData['company_id'],
            ':context_type'             => $filteredData['context_type'],
            ':category'                 => $filteredData['category'],
            ':description'              => $filteredData['description'],
            ':status'                   => $filteredData['status'] ?? 'pending',
            ':priority'                 => $filteredData['priority'] ?? 'medium',
            ':progress'                 => $filteredData['progress'] ?? 0,
            ':target_completion_date'   => $filteredData['target_completion_date'] ?? null,
            ':actual_completion_date'   => $filteredData['actual_completion_date'] ?? null,
            ':owner_user_id'            => $filteredData['owner_user_id'] ?? null,
            ':assigned_to_user_id'      => $filteredData['assigned_to_user_id'] ?? null,
            ':estimated_hours'          => $filteredData['estimated_hours'] ?? null,
            ':actual_hours'             => $filteredData['actual_hours'] ?? null,
            ':budget_allocated'         => $filteredData['budget_allocated'] ?? null,
            ':budget_spent'             => $filteredData['budget_spent'] ?? null,
            ':dependencies'             => $filteredData['dependencies'] ?? null,
            ':notes'                    => $filteredData['notes'] ?? null,
            ':tags'                     => $filteredData['tags'] ?? null,
            ':source_data'              => $filteredData['source_data'] ?? null,
            ':metrics'                  => $filteredData['metrics'] ?? null,
            ':is_archived'              => $filteredData['is_archived'] ?? 0
        ]);

        $id = (int) $this->conn->lastInsertId();
        return $this->getById($id);
    }

    /**
     * Update an existing action item.
     */
    public function update(int $id, array $data): array
    {
        $filteredData = $this->filterWritable($data);

        $sql = "UPDATE action_items
                SET tenant_id = :tenant_id,
                    company_id = :company_id,
                    context_type = :context_type,
                    category = :category,
                    description = :description,
                    status = :status,
                    priority = :priority,
                    progress = :progress,
                    target_completion_date = :target_completion_date,
                    actual_completion_date = :actual_completion_date,
                    owner_user_id = :owner_user_id,
                    assigned_to_user_id = :assigned_to_user_id,
                    estimated_hours = :estimated_hours,
                    actual_hours = :actual_hours,
                    budget_allocated = :budget_allocated,
                    budget_spent = :budget_spent,
                    dependencies = :dependencies,
                    notes = :notes,
                    tags = :tags,
                    source_data = :source_data,
                    metrics = :metrics,
                    is_archived = :is_archived,
                    updated_at = NOW()
                WHERE id = :id";

        $stmt = $this->conn->prepare($sql);
        $result = $stmt->execute([
            ':id'                       => $id,
            ':tenant_id'                => $filteredData['tenant_id'] ?? null,
            ':company_id'               => $filteredData['company_id'],
            ':context_type'             => $filteredData['context_type'],
            ':category'                 => $filteredData['category'],
            ':description'              => $filteredData['description'],
            ':status'                   => $filteredData['status'] ?? 'pending',
            ':priority'                 => $filteredData['priority'] ?? 'medium',
            ':progress'                 => $filteredData['progress'] ?? 0,
            ':target_completion_date'   => $filteredData['target_completion_date'] ?? null,
            ':actual_completion_date'   => $filteredData['actual_completion_date'] ?? null,
            ':owner_user_id'            => $filteredData['owner_user_id'] ?? null,
            ':assigned_to_user_id'      => $filteredData['assigned_to_user_id'] ?? null,
            ':estimated_hours'          => $filteredData['estimated_hours'] ?? null,
            ':actual_hours'             => $filteredData['actual_hours'] ?? null,
            ':budget_allocated'         => $filteredData['budget_allocated'] ?? null,
            ':budget_spent'             => $filteredData['budget_spent'] ?? null,
            ':dependencies'             => $filteredData['dependencies'] ?? null,
            ':notes'                    => $filteredData['notes'] ?? null,
            ':tags'                     => $filteredData['tags'] ?? null,
            ':source_data'              => $filteredData['source_data'] ?? null,
            ':metrics'                  => $filteredData['metrics'] ?? null,
            ':is_archived'              => $filteredData['is_archived'] ?? 0
        ]);

        if (!$result || $stmt->rowCount() === 0) {
            throw new Exception("Action item with ID $id not found or no changes made");
        }

        return $this->getById($id);
    }

    /* =========================================================================
       READ
       ========================================================================= */

    /**
     * Get an action item by ID.
     */
    public function getById(int $id): array
    {
        $stmt = $this->conn->prepare("SELECT * FROM action_items WHERE id = ?");
        $stmt->execute([$id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$result) {
            throw new Exception("Action item with ID $id not found");
        }

        return $this->castTypes($result);
    }

    /**
     * Get all action items with optional filters.
     */
    public function listAll(array $filters = []): array
    {
        $sql = "SELECT * FROM action_items WHERE 1=1";
        $params = [];

        // Apply filters
        if (isset($filters['tenant_id'])) {
            $sql .= " AND tenant_id = :tenant_id";
            $params[':tenant_id'] = (int) $filters['tenant_id'];
        }

        if (isset($filters['company_id'])) {
            $sql .= " AND company_id = :company_id";
            $params[':company_id'] = (int) $filters['company_id'];
        }

        if (isset($filters['context_type'])) {
            $sql .= " AND context_type = :context_type";
            $params[':context_type'] = $filters['context_type'];
        }

        if (isset($filters['category'])) {
            $sql .= " AND category = :category";
            $params[':category'] = $filters['category'];
        }

        if (isset($filters['status'])) {
            $sql .= " AND status = :status";
            $params[':status'] = $filters['status'];
        }

        if (isset($filters['priority'])) {
            $sql .= " AND priority = :priority";
            $params[':priority'] = $filters['priority'];
        }

        if (isset($filters['assigned_to_user_id'])) {
            $sql .= " AND assigned_to_user_id = :assigned_to_user_id";
            $params[':assigned_to_user_id'] = (int) $filters['assigned_to_user_id'];
        }

        if (isset($filters['is_archived'])) {
            $sql .= " AND is_archived = :is_archived";
            $params[':is_archived'] = (int) $filters['is_archived'];
        }

        if (isset($filters['search'])) {
            $sql .= " AND (description LIKE :search OR notes LIKE :search OR tags LIKE :search)";
            $params[':search'] = '%' . $filters['search'] . '%';
        }

        // Default ordering
        $sql .= " ORDER BY created_at DESC, id DESC";

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
     * Get action items by context type (swot or gps).
     */
    public function getByContextType(string $contextType, array $filters = []): array
    {
        $filters['context_type'] = $contextType;
        return $this->listAll($filters);
    }

    /**
     * Get action items by company and context type.
     */
    public function getByCompanyAndContext(int $companyId, string $contextType, array $filters = []): array
    {
        $filters['company_id'] = $companyId;
        $filters['context_type'] = $contextType;
        return $this->listAll($filters);
    }

    /**
     * Get action items by status.
     */
    public function getByStatus(string $status, array $filters = []): array
    {
        $filters['status'] = $status;
        return $this->listAll($filters);
    }

    /* =========================================================================
       DELETE
       ========================================================================= */

    /**
     * Delete an action item.
     */
    public function delete(int $id): bool
    {
        // First check if the action item exists
        $this->getById($id);

        $stmt = $this->conn->prepare("DELETE FROM action_items WHERE id = ?");
        return $stmt->execute([$id]) && $stmt->rowCount() > 0;
    }

    /**
     * Archive an action item (soft delete).
     */
    public function archive(int $id): array
    {
        return $this->update($id, ['is_archived' => 1]);
    }

    /**
     * Unarchive an action item.
     */
    public function unarchive(int $id): array
    {
        return $this->update($id, ['is_archived' => 0]);
    }

    /* =========================================================================
       BUSINESS LOGIC
       ========================================================================= */

    /**
     * Mark action item as completed.
     */
    public function markCompleted(int $id): array
    {
        return $this->update($id, [
            'status' => 'completed',
            'progress' => 100,
            'actual_completion_date' => date('Y-m-d H:i:s')
        ]);
    }

    /**
     * Update progress of an action item.
     */
    public function updateProgress(int $id, int $progress): array
    {
        if ($progress < 0 || $progress > 100) {
            throw new InvalidArgumentException("Progress must be between 0 and 100");
        }

        $updateData = ['progress' => $progress];
        
        // Auto-complete if progress reaches 100%
        if ($progress === 100) {
            $updateData['status'] = 'completed';
            $updateData['actual_completion_date'] = date('Y-m-d H:i:s');
        }

        return $this->update($id, $updateData);
    }

    /**
     * Get statistics for action items.
     */
    public function getStatistics(array $filters = []): array
    {
        $sql = "SELECT
                    COUNT(*) as total_items,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_items,
                    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_items,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_items,
                    COUNT(CASE WHEN status = 'on_hold' THEN 1 END) as on_hold_items,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_items,
                    COUNT(CASE WHEN is_archived = 1 THEN 1 END) as archived_items,
                    AVG(progress) as average_progress,
                    COUNT(CASE WHEN context_type = 'swot' THEN 1 END) as swot_items,
                    COUNT(CASE WHEN context_type = 'gps' THEN 1 END) as gps_items
                FROM action_items WHERE 1=1";

        $params = [];

        // Apply same filters as listAll
        if (isset($filters['company_id'])) {
            $sql .= " AND company_id = :company_id";
            $params[':company_id'] = (int) $filters['company_id'];
        }

        if (isset($filters['context_type'])) {
            $sql .= " AND context_type = :context_type";
            $params[':context_type'] = $filters['context_type'];
        }

        if (isset($filters['is_archived'])) {
            $sql .= " AND is_archived = :is_archived";
            $params[':is_archived'] = (int) $filters['is_archived'];
        }

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            'total_items' => (int) $result['total_items'],
            'pending_items' => (int) $result['pending_items'],
            'in_progress_items' => (int) $result['in_progress_items'],
            'completed_items' => (int) $result['completed_items'],
            'on_hold_items' => (int) $result['on_hold_items'],
            'cancelled_items' => (int) $result['cancelled_items'],
            'archived_items' => (int) $result['archived_items'],
            'average_progress' => round((float) $result['average_progress'], 2),
            'swot_items' => (int) $result['swot_items'],
            'gps_items' => (int) $result['gps_items']
        ];
    }

    /**
     * Get action items by category with counts.
     */
    public function getCategoryBreakdown(array $filters = []): array
    {
        $sql = "SELECT 
                    category,
                    COUNT(*) as total_count,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
                    AVG(progress) as average_progress
                FROM action_items 
                WHERE 1=1";

        $params = [];

        if (isset($filters['company_id'])) {
            $sql .= " AND company_id = :company_id";
            $params[':company_id'] = (int) $filters['company_id'];
        }

        if (isset($filters['context_type'])) {
            $sql .= " AND context_type = :context_type";
            $params[':context_type'] = $filters['context_type'];
        }

        if (isset($filters['is_archived'])) {
            $sql .= " AND is_archived = :is_archived";
            $params[':is_archived'] = (int) $filters['is_archived'];
        }

        $sql .= " GROUP BY category ORDER BY total_count DESC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(function($row) {
            return [
                'category' => $row['category'],
                'total_count' => (int) $row['total_count'],
                'completed_count' => (int) $row['completed_count'],
                'average_progress' => round((float) $row['average_progress'], 2)
            ];
        }, $results);
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
            'tenant_id' => isset($row['tenant_id']) ? (int) $row['tenant_id'] : null,
            'company_id' => (int) $row['company_id'],
            'context_type' => (string) $row['context_type'],
            'category' => (string) $row['category'],
            'description' => (string) $row['description'],
            'status' => (string) $row['status'],
            'priority' => (string) $row['priority'],
            'progress' => (int) $row['progress'],
            'target_completion_date' => $row['target_completion_date'] ?? null,
            'actual_completion_date' => $row['actual_completion_date'] ?? null,
            'owner_user_id' => isset($row['owner_user_id']) ? (int) $row['owner_user_id'] : null,
            'assigned_to_user_id' => isset($row['assigned_to_user_id']) ? (int) $row['assigned_to_user_id'] : null,
            'estimated_hours' => isset($row['estimated_hours']) ? (float) $row['estimated_hours'] : null,
            'actual_hours' => isset($row['actual_hours']) ? (float) $row['actual_hours'] : null,
            'budget_allocated' => isset($row['budget_allocated']) ? (float) $row['budget_allocated'] : null,
            'budget_spent' => isset($row['budget_spent']) ? (float) $row['budget_spent'] : null,
            'dependencies' => $row['dependencies'] ?? null,
            'notes' => $row['notes'] ?? null,
            'tags' => $row['tags'] ?? null,
            'source_data' => $row['source_data'] ?? null,
            'metrics' => $row['metrics'] ?? null,
            'is_archived' => isset($row['is_archived']) ? (bool) $row['is_archived'] : false,
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at']
        ];
    }
}