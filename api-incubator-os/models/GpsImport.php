<?php
declare(strict_types=1);

final class GpsImport
{
    private PDO $conn;

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /**
     * Count total GPS items in nodes table
     */
    public function countGpsNodes(): int
    {
        $stmt = $this->conn->prepare("SELECT COUNT(*) as count FROM nodes WHERE type = 'gps_targets'");
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int) $result['count'];
    }

    /**
     * Count current action items with GPS context
     */
    public function countGpsActionItems(): int
    {
        $stmt = $this->conn->prepare("SELECT COUNT(*) as count FROM action_items WHERE context_type = 'gps'");
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int) $result['count'];
    }

    /**
     * Get all GPS nodes from database (with duplicate prevention)
     */
    public function getAllGpsNodes(): array
    {
        // Get all nodes and handle duplicates in PHP to avoid SQL GROUP BY issues
        $stmt = $this->conn->prepare("
            SELECT * FROM nodes
            WHERE type = 'gps_targets'
            ORDER BY company_id, created_at
        ");
        $stmt->execute();

        $results = [];
        $seenHashes = [];

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            // Create hash to detect duplicates
            $dataHash = md5($row['company_id'] . '|' . $row['data']);

            if (!isset($seenHashes[$dataHash])) {
                $seenHashes[$dataHash] = true;
                $row['data'] = json_decode($row['data'], true);
                $results[] = $row;
            }
        }

        return $results;
    }

    /**
     * Extract and flatten GPS targets from JSON data
     */
    public function extractGpsTargets(array $nodeData): array
    {
        $actionItems = [];
        $data = $nodeData['data'];
        $companyId = $nodeData['company_id'];
        $nodeId = $nodeData['id'];

        // Categories to process
        $categories = ['finance', 'sales_marketing', 'strategy_general', 'personal_development'];

        foreach ($categories as $category) {
            if (!isset($data[$category]['targets']) || !is_array($data[$category]['targets'])) {
                continue;
            }

            foreach ($data[$category]['targets'] as $target) {
                // Skip empty targets
                if (empty($target['description']) || trim($target['description']) === '') {
                    continue;
                }

                $actionItems[] = [
                    'tenant_id' => 1,
                    'client_id' => $companyId, // Using company_id as client_id for now
                    'company_id' => $companyId,
                    'context_type' => 'gps',
                    'category' => $this->formatCategoryName($category),
                    'description' => trim($target['description']),
                    'action_required' => null, // GPS targets don't have action_required field
                    'evidence' => $target['evidence'] ?? null,
                    'assigned_to' => $target['assigned_to'] ?? null,
                    'target_date' => $this->formatTargetDate($target['due_date'] ?? null),
                    'status' => $this->mapStatus($target['status'] ?? 'not_started'),
                    'priority' => $target['priority'] ?? null,
                    'progress' => $target['progress_percentage'] ?? 0,
                    'analysis_date' => $this->formatDateTime($target['date_added'] ?? null),
                    'is_complete' => ($target['status'] ?? 'not_started') === 'completed' ? 1 : 0
                ];
            }
        }

        return $actionItems;
    }

    /**
     * Import GPS data to action_items table
     */
    public function importGpsToActionItems(): array
    {
        $this->conn->beginTransaction();

        try {
            $gpsNodes = $this->getAllGpsNodes();
            $totalImported = 0;
            $importSummary = [
                'total_nodes' => count($gpsNodes),
                'total_targets_imported' => 0,
                'total_targets_skipped' => 0,
                'companies_processed' => [],
                'categories_summary' => [],
                'errors' => []
            ];

            foreach ($gpsNodes as $node) {
                try {
                    $actionItems = $this->extractGpsTargets($node);

                    foreach ($actionItems as $item) {
                        // Check for duplicates before inserting
                        if ($this->actionItemExists($item)) {
                            $importSummary['total_targets_skipped']++;
                            continue; // Skip duplicates
                        }

                        $this->insertActionItem($item);
                        $totalImported++;

                        // Track category counts
                        $category = $item['category'];
                        if (!isset($importSummary['categories_summary'][$category])) {
                            $importSummary['categories_summary'][$category] = 0;
                        }
                        $importSummary['categories_summary'][$category]++;
                    }

                    // Track companies processed
                    $companyId = $node['company_id'];
                    if (!in_array($companyId, $importSummary['companies_processed'])) {
                        $importSummary['companies_processed'][] = $companyId;
                    }

                } catch (Exception $e) {
                    $importSummary['errors'][] = [
                        'node_id' => $node['id'],
                        'company_id' => $node['company_id'],
                        'error' => $e->getMessage()
                    ];
                }
            }

            $importSummary['total_targets_imported'] = $totalImported;

            $this->conn->commit();
            return $importSummary;

        } catch (Exception $e) {
            $this->conn->rollBack();
            throw new Exception("Import failed: " . $e->getMessage());
        }
    }

    /**
     * Check if action item already exists (duplicate prevention)
     */
    private function actionItemExists(array $item): bool
    {
        $sql = "SELECT COUNT(*) as count FROM action_items
                WHERE company_id = ? AND context_type = ? AND category = ?
                AND description = ?";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            $item['company_id'],
            $item['context_type'],
            $item['category'],
            $item['description']
        ]);

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int)$result['count'] > 0;
    }

    /**
     * Insert action item into database with duplicate prevention
     */
    private function insertActionItem(array $item): void
    {
        // Check for duplicates first
        if ($this->actionItemExists($item)) {
            return; // Skip if already exists
        }

        $sql = "INSERT INTO action_items (
            tenant_id, client_id, company_id, context_type, category,
            description, action_required, evidence, assigned_to, target_date,
            status, priority, progress, analysis_date, is_complete, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            $item['tenant_id'],
            $item['client_id'],
            $item['company_id'],
            $item['context_type'],
            $item['category'],
            $item['description'],
            $item['action_required'],
            $item['evidence'],
            $item['assigned_to'],
            $item['target_date'],
            $item['status'],
            $item['priority'],
            $item['progress'],
            $item['analysis_date'],
            $item['is_complete']
        ]);
    }

    /**
     * Clear all GPS action items (for re-import)
     */
    public function clearGpsActionItems(): int
    {
        $stmt = $this->conn->prepare("DELETE FROM action_items WHERE context_type = 'gps'");
        $stmt->execute();
        return $stmt->rowCount();
    }

    /**
     * Format category name for database
     */
    private function formatCategoryName(string $category): string
    {
        $categoryMap = [
            'finance' => 'Finance',
            'sales_marketing' => 'Sales & Marketing',
            'strategy_general' => 'Strategy/General',
            'personal_development' => 'Personal Development'
        ];

        return $categoryMap[$category] ?? ucfirst(str_replace('_', ' ', $category));
    }

    /**
     * Map GPS status to action items status
     */
    private function mapStatus(string $status): string
    {
        $statusMap = [
            'not_started' => 'Not Started',
            'in_progress' => 'In Progress',
            'completed' => 'Completed',
            'overdue' => 'Overdue',
            'cancelled' => 'Cancelled'
        ];

        return $statusMap[$status] ?? 'Not Started';
    }

    /**
     * Format target date for database
     */
    private function formatTargetDate(?string $date): ?string
    {
        if (empty($date) || $date === '') {
            return null;
        }

        try {
            $dateObj = new DateTime($date);
            return $dateObj->format('Y-m-d');
        } catch (Exception $e) {
            return null;
        }
    }

    /**
     * Format datetime for database
     */
    private function formatDateTime(?string $datetime): ?string
    {
        if (empty($datetime)) {
            return null;
        }

        try {
            $dateObj = new DateTime($datetime);
            return $dateObj->format('Y-m-d H:i:s');
        } catch (Exception $e) {
            return null;
        }
    }

    /**
     * Get import statistics
     */
    public function getImportStats(): array
    {
        return [
            'gps_nodes_count' => $this->countGpsNodes(),
            'gps_action_items_count' => $this->countGpsActionItems(),
            'companies_with_gps' => $this->getCompaniesWithGps(),
            'category_breakdown' => $this->getCategoryBreakdown()
        ];
    }

    /**
     * Get companies that have GPS data
     */
    private function getCompaniesWithGps(): array
    {
        $stmt = $this->conn->prepare("
            SELECT DISTINCT company_id, COUNT(*) as target_count
            FROM action_items
            WHERE context_type = 'gps'
            GROUP BY company_id
            ORDER BY company_id
        ");
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get breakdown by category
     */
    private function getCategoryBreakdown(): array
    {
        $stmt = $this->conn->prepare("
            SELECT category, COUNT(*) as count,
                   SUM(CASE WHEN is_complete = 1 THEN 1 ELSE 0 END) as completed,
                   AVG(progress) as avg_progress
            FROM action_items
            WHERE context_type = 'gps'
            GROUP BY category
        ");
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
?>
