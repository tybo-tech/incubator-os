<?php
declare(strict_types=1);

final class SwotImport
{
    private PDO $conn;

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /**
     * Count total SWOT items in nodes table
     */
    public function countSwotNodes(): int
    {
        $stmt = $this->conn->prepare("SELECT COUNT(*) as count FROM nodes WHERE type = 'swot_analysis'");
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int) $result['count'];
    }

    /**
     * Count current action items with SWOT context
     */
    public function countSwotActionItems(): int
    {
        $stmt = $this->conn->prepare("SELECT COUNT(*) as count FROM action_items WHERE context_type = 'swot'");
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int) $result['count'];
    }

    /**
     * Get all SWOT nodes from database (with duplicate prevention)
     */
    public function getAllSwotNodes(): array
    {
        // Get all nodes and handle duplicates in PHP to avoid SQL GROUP BY issues
        $stmt = $this->conn->prepare("
            SELECT * FROM nodes
            WHERE type = 'swot_analysis'
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
     * Extract and flatten SWOT items from JSON data
     */
    public function extractSwotItems(array $nodeData): array
    {
        $actionItems = [];
        $data = $nodeData['data'];
        $companyId = $nodeData['company_id'];
        $nodeId = $nodeData['id'];

        // SWOT categories structure: internal/external -> strengths/weaknesses/opportunities/threats
        $swotSections = [
            'internal' => ['strengths', 'weaknesses'],
            'external' => ['opportunities', 'threats']
        ];

        foreach ($swotSections as $section => $categories) {
            if (!isset($data[$section]) || !is_array($data[$section])) {
                continue;
            }

            foreach ($categories as $category) {
                if (!isset($data[$section][$category]) || !is_array($data[$section][$category])) {
                    continue;
                }

                foreach ($data[$section][$category] as $item) {
                    // Skip empty items
                    if (empty($item['description']) || trim($item['description']) === '') {
                        continue;
                    }

                    $actionItems[] = [
                        'tenant_id' => 1,
                        'client_id' => $companyId, // Using company_id as client_id for now
                        'company_id' => $companyId,
                        'context_type' => 'swot',
                        'category' => $this->formatCategoryName($category),
                        'description' => trim($item['description']),
                        'action_required' => $item['action_required'] ?? null,
                        'evidence' => null, // SWOT doesn't have evidence field like GPS
                        'assigned_to' => $item['assigned_to'] ?? null,
                        'target_date' => $this->formatTargetDate($item['target_date'] ?? null),
                        'status' => $this->mapStatus($item['status'] ?? 'identified'),
                        'priority' => $item['priority'] ?? 'medium',
                        'progress' => $this->calculateProgress($item['status'] ?? 'identified'),
                        'analysis_date' => $this->formatDateTime($item['date_added'] ?? null),
                        'is_complete' => ($item['status'] ?? 'identified') === 'completed' ? 1 : 0,
                        'impact_level' => $item['impact'] ?? null // Store SWOT-specific impact level
                    ];
                }
            }
        }

        return $actionItems;
    }

    /**
     * Import SWOT data to action_items table
     */
    public function importSwotToActionItems(): array
    {
        $this->conn->beginTransaction();

        try {
            $swotNodes = $this->getAllSwotNodes();
            $totalImported = 0;
            $importSummary = [
                'total_nodes' => count($swotNodes),
                'total_items_imported' => 0,
                'total_items_skipped' => 0,
                'companies_processed' => [],
                'categories_summary' => [],
                'impact_summary' => [],
                'errors' => []
            ];

            foreach ($swotNodes as $node) {
                try {
                    $actionItems = $this->extractSwotItems($node);

                    foreach ($actionItems as $item) {
                        // Check for duplicates before inserting
                        if ($this->actionItemExists($item)) {
                            $importSummary['total_items_skipped']++;
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

                        // Track impact levels
                        $impact = $item['impact_level'] ?? 'unknown';
                        if (!isset($importSummary['impact_summary'][$impact])) {
                            $importSummary['impact_summary'][$impact] = 0;
                        }
                        $importSummary['impact_summary'][$impact]++;
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

            $importSummary['total_items_imported'] = $totalImported;

            $this->conn->commit();
            return $importSummary;

        } catch (Exception $e) {
            $this->conn->rollBack();
            throw new Exception("SWOT Import failed: " . $e->getMessage());
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
     * Clear all SWOT action items (for re-import)
     */
    public function clearSwotActionItems(): int
    {
        $stmt = $this->conn->prepare("DELETE FROM action_items WHERE context_type = 'swot'");
        $stmt->execute();
        return $stmt->rowCount();
    }

    /**
     * Format category name for database
     */
    private function formatCategoryName(string $category): string
    {
        $categoryMap = [
            'strengths' => 'Strengths',
            'weaknesses' => 'Weaknesses',
            'opportunities' => 'Opportunities',
            'threats' => 'Threats'
        ];

        return $categoryMap[$category] ?? ucfirst($category);
    }

    /**
     * Map SWOT status to action items status
     */
    private function mapStatus(string $status): string
    {
        $statusMap = [
            'identified' => 'Identified',
            'in_progress' => 'In Progress',
            'completed' => 'Completed',
            'monitoring' => 'Monitoring',
            'cancelled' => 'Cancelled'
        ];

        return $statusMap[$status] ?? 'Identified';
    }

    /**
     * Calculate progress based on status
     */
    private function calculateProgress(string $status): float
    {
        $progressMap = [
            'identified' => 0.0,
            'in_progress' => 50.0,
            'completed' => 100.0,
            'monitoring' => 75.0,
            'cancelled' => 0.0
        ];

        return $progressMap[$status] ?? 0.0;
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
            'swot_nodes_count' => $this->countSwotNodes(),
            'swot_action_items_count' => $this->countSwotActionItems(),
            'companies_with_swot' => $this->getCompaniesWithSwot(),
            'category_breakdown' => $this->getCategoryBreakdown(),
            'impact_breakdown' => $this->getImpactBreakdown(),
            'status_breakdown' => $this->getStatusBreakdown()
        ];
    }

    /**
     * Get companies that have SWOT data
     */
    private function getCompaniesWithSwot(): array
    {
        $stmt = $this->conn->prepare("
            SELECT DISTINCT company_id, COUNT(*) as item_count
            FROM action_items
            WHERE context_type = 'swot'
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
            WHERE context_type = 'swot'
            GROUP BY category
        ");
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get breakdown by impact level (SWOT specific)
     */
    private function getImpactBreakdown(): array
    {
        // Since impact_level is not in action_items table, we'll need to get this from the original nodes
        $stmt = $this->conn->prepare("SELECT * FROM nodes WHERE type = 'swot_analysis'");
        $stmt->execute();

        $impactCounts = ['high' => 0, 'medium' => 0, 'low' => 0];

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $data = json_decode($row['data'], true);

            foreach (['internal', 'external'] as $section) {
                if (!isset($data[$section])) continue;

                foreach ($data[$section] as $category => $items) {
                    if (!is_array($items)) continue;

                    foreach ($items as $item) {
                        $impact = $item['impact'] ?? 'medium';
                        if (isset($impactCounts[$impact])) {
                            $impactCounts[$impact]++;
                        }
                    }
                }
            }
        }

        return $impactCounts;
    }

    /**
     * Get breakdown by status
     */
    private function getStatusBreakdown(): array
    {
        $stmt = $this->conn->prepare("
            SELECT status, COUNT(*) as count
            FROM action_items
            WHERE context_type = 'swot'
            GROUP BY status
        ");
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Preview SWOT import data
     */
    public function previewSwotImport(int $limit = 3): array
    {
        $swotNodes = $this->getAllSwotNodes();
        $previewData = [
            'total_nodes' => count($swotNodes),
            'preview_nodes' => []
        ];

        $nodeCount = 0;
        foreach ($swotNodes as $node) {
            if ($nodeCount >= $limit) break;

            $actionItems = $this->extractSwotItems($node);

            $previewData['preview_nodes'][] = [
                'node_id' => $node['id'],
                'company_id' => $node['company_id'],
                'items_count' => count($actionItems),
                'sample_items' => array_slice($actionItems, 0, 5) // Show first 5 items
            ];

            $nodeCount++;
        }

        return $previewData;
    }

    /**
     * Import SWOT items to the first existing node (UI-aligned approach)
     * This follows the same pattern as the UI which only works with the first SWOT node
     */
    public function importSwotToUINode(int $companyId): array
    {
        try {
            // Get the first existing SWOT node for this company (like the UI does)
            $stmt = $this->conn->prepare("
                SELECT * FROM nodes
                WHERE company_id = ? AND type = 'swot_analysis'
                ORDER BY created_at ASC
                LIMIT 1
            ");
            $stmt->execute([$companyId]);
            $existingNode = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$existingNode) {
                return [
                    'success' => false,
                    'message' => 'No existing SWOT node found for company ' . $companyId,
                    'items_merged' => 0
                ];
            }

            // Parse existing node data
            $existingData = json_decode($existingNode['data'], true) ?? [];

            // Initialize structure if needed
            if (!isset($existingData['internal'])) {
                $existingData['internal'] = ['strengths' => [], 'weaknesses' => []];
            }
            if (!isset($existingData['external'])) {
                $existingData['external'] = ['opportunities' => [], 'threats' => []];
            }

            // Get imported SWOT items for this company
            $importedItems = [];
            $allSwotNodes = $this->getAllSwotNodes();

            foreach ($allSwotNodes as $node) {
                if ((int)$node['company_id'] === $companyId) {
                    $items = $this->extractSwotItems($node);
                    $importedItems = array_merge($importedItems, $items);
                }
            }

            // Group imported items by category
            $groupedItems = [
                'strengths' => [],
                'weaknesses' => [],
                'opportunities' => [],
                'threats' => []
            ];

            foreach ($importedItems as $item) {
                switch (strtolower($item['category'])) {
                    case 'strengths':
                        $groupedItems['strengths'][] = $this->formatForUINode($item);
                        break;
                    case 'weaknesses':
                        $groupedItems['weaknesses'][] = $this->formatForUINode($item);
                        break;
                    case 'opportunities':
                        $groupedItems['opportunities'][] = $this->formatForUINode($item);
                        break;
                    case 'threats':
                        $groupedItems['threats'][] = $this->formatForUINode($item);
                        break;
                }
            }

            // Merge with existing data (avoiding duplicates)
            $mergedCount = 0;
            foreach ($groupedItems as $category => $items) {
                foreach ($items as $newItem) {
                    $isDuplicate = false;

                    // Check appropriate section based on category
                    $section = in_array($category, ['strengths', 'weaknesses']) ? 'internal' : 'external';

                    foreach ($existingData[$section][$category] ?? [] as $existingItem) {
                        if (strtolower(trim($existingItem['description'] ?? '')) === strtolower(trim($newItem['description']))) {
                            $isDuplicate = true;
                            break;
                        }
                    }

                    if (!$isDuplicate) {
                        $existingData[$section][$category][] = $newItem;
                        $mergedCount++;
                    }
                }
            }

            // Update the node with merged data
            if ($mergedCount > 0) {
                $existingData['last_updated'] = date('c');
                $updatedData = json_encode($existingData, JSON_PRETTY_PRINT);

                $updateStmt = $this->conn->prepare("
                    UPDATE nodes
                    SET data = ?, updated_at = NOW()
                    WHERE id = ?
                ");
                $updateStmt->execute([$updatedData, $existingNode['id']]);
            }

            return [
                'success' => true,
                'message' => "Merged {$mergedCount} new SWOT items into existing UI node",
                'items_merged' => $mergedCount,
                'existing_node_id' => $existingNode['id'],
                'company_id' => $companyId
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error merging SWOT data: ' . $e->getMessage(),
                'items_merged' => 0
            ];
        }
    }

    /**
     * Format imported SWOT item for UI node structure
     */
    private function formatForUINode(array $item): array
    {
        return [
            'description' => $item['description'],
            'action_required' => $item['action_required'] ?? null,
            'assigned_to' => $item['assigned_to'] ?? null,
            'target_date' => $item['target_date'] ?? null,
            'status' => $item['status'] ?? 'identified',
            'priority' => $item['priority'] ?? 'medium',
            'impact' => $item['impact_level'] ?? 'medium',
            'category' => strtolower($item['category']),
            'date_added' => date('c')
        ];
    }
}
?>
