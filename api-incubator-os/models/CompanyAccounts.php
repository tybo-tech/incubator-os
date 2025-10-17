<?php
require_once __DIR__ . '/../common/common.php';

class CompanyAccounts
{
    private $pdo;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Add a new company account
     *
     * @param array $data Account data including company_id, account_name, description, etc.
     * @return array Result with success status and account data or error message
     */
    public function add($data)
    {
        try {
            // Validate required fields
            $validation = $this->validateAccountData($data, false);
            if (!$validation['success']) {
                return $validation;
            }

            // Check for duplicate account names within the same company
            if ($this->hasAccountNameConflict($data['company_id'], $data['account_name'])) {
                return [
                    'success' => false,
                    'message' => 'An account with this name already exists for this company'
                ];
            }

            $sql = "INSERT INTO company_accounts (
                        company_id,
                        account_name,
                        account_type,
                        description,
                        account_number,
                        attachments,
                        is_active
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)";

            $stmt = $this->pdo->prepare($sql);
            $success = $stmt->execute([
                $data['company_id'],
                $data['account_name'],
                $data['account_type'] ?? 'domestic_revenue',
                $data['description'] ?? null,
                $data['account_number'] ?? null,
                isset($data['attachments']) ? json_encode($data['attachments']) : null,
                $data['is_active'] ?? 1
            ]);

            if ($success) {
                $accountId = $this->pdo->lastInsertId();
                $account = $this->getById($accountId);

                if ($account['success']) {
                    return [
                        'success' => true,
                        'message' => 'Company account created successfully',
                        'data' => $account['data']
                    ];
                } else {
                    return [
                        'success' => true,
                        'message' => 'Company account created successfully',
                        'data' => null
                    ];
                }
            } else {
                return [
                    'success' => false,
                    'message' => 'Failed to create company account'
                ];
            }
        } catch (Exception $e) {
            error_log("Error adding company account: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Database error occurred while creating account'
            ];
        }
    }

    /**
     * Update an existing company account
     *
     * @param int $id Account ID
     * @param array $data Updated account data
     * @return array Result with success status and account data or error message
     */
    public function update($id, $data)
    {
        try {
            // Check if account exists
            $existing = $this->getById($id);
            if (!$existing['success']) {
                return $existing;
            }

            // Validate data
            $validation = $this->validateAccountData($data, true);
            if (!$validation['success']) {
                return $validation;
            }

            // Check for name conflicts (excluding current account)
            if (isset($data['account_name'])) {
                $companyId = $data['company_id'] ?? $existing['data']['company_id'];
                if ($this->hasAccountNameConflict($companyId, $data['account_name'], $id)) {
                    return [
                        'success' => false,
                        'message' => 'An account with this name already exists for this company'
                    ];
                }
            }

            $setParts = [];
            $params = [];

            // Build dynamic update query
            $updatableFields = [
                'company_id', 'account_name', 'account_type', 'description',
                'account_number', 'is_active'
            ];

            foreach ($updatableFields as $field) {
                if (isset($data[$field])) {
                    $setParts[] = "$field = ?";
                    $params[] = $data[$field];
                }
            }

            // Handle attachments separately (JSON field)
            if (isset($data['attachments'])) {
                $setParts[] = "attachments = ?";
                $params[] = json_encode($data['attachments']);
            }

            if (empty($setParts)) {
                return [
                    'success' => false,
                    'message' => 'No valid fields provided for update'
                ];
            }

            $params[] = $id;
            $sql = "UPDATE company_accounts SET " . implode(', ', $setParts) . " WHERE id = ?";

            $stmt = $this->pdo->prepare($sql);
            $success = $stmt->execute($params);

            if ($success) {
                $account = $this->getById($id);
                return [
                    'success' => true,
                    'message' => 'Company account updated successfully',
                    'data' => $account['data']
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Failed to update company account'
                ];
            }
        } catch (Exception $e) {
            error_log("Error updating company account: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Database error occurred while updating account'
            ];
        }
    }

    /**
     * Get a single company account by ID
     *
     * @param int $id Account ID
     * @return array Result with success status and account data or error message
     */
    public function getById($id)
    {
        try {
            $sql = "SELECT ca.*, c.name as company_name
                    FROM company_accounts ca
                    LEFT JOIN companies c ON ca.company_id = c.id
                    WHERE ca.id = ?";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$id]);
            $account = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($account) {
                // Parse JSON attachments
                if ($account['attachments']) {
                    $account['attachments'] = json_decode($account['attachments'], true);
                }

                return [
                    'success' => true,
                    'data' => $account
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Company account not found'
                ];
            }
        } catch (Exception $e) {
            error_log("Error fetching company account: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Database error occurred while fetching account'
            ];
        }
    }

    /**
     * Get all company accounts with optional filters
     *
     * @param array $filters Optional filters (company_id, account_type, is_active, limit, offset)
     * @return array Result with success status and accounts data or error message
     */
    public function listAll($filters = [])
    {
        try {
            $sql = "SELECT ca.*, c.name as company_name
                    FROM company_accounts ca
                    LEFT JOIN companies c ON ca.company_id = c.id";

            $conditions = [];
            $params = [];

            // Apply filters
            if (isset($filters['company_id'])) {
                $conditions[] = "ca.company_id = ?";
                $params[] = $filters['company_id'];
            }

            if (isset($filters['account_type'])) {
                $conditions[] = "ca.account_type = ?";
                $params[] = $filters['account_type'];
            }

            if (isset($filters['is_active'])) {
                $conditions[] = "ca.is_active = ?";
                $params[] = $filters['is_active'];
            }

            if (!empty($conditions)) {
                $sql .= " WHERE " . implode(' AND ', $conditions);
            }

            $sql .= " ORDER BY ca.account_name ASC";

            // Apply pagination
            if (isset($filters['limit'])) {
                $sql .= " LIMIT ?";
                $params[] = (int)$filters['limit'];

                if (isset($filters['offset'])) {
                    $sql .= " OFFSET ?";
                    $params[] = (int)$filters['offset'];
                }
            }

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            $accounts = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Parse JSON attachments for each account
            foreach ($accounts as &$account) {
                if ($account['attachments']) {
                    $account['attachments'] = json_decode($account['attachments'], true);
                }
            }

            return [
                'success' => true,
                'data' => $accounts,
                'count' => count($accounts)
            ];
        } catch (Exception $e) {
            error_log("Error listing company accounts: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Database error occurred while fetching accounts'
            ];
        }
    }

    /**
     * Get accounts by company ID
     *
     * @param int $companyId Company ID
     * @param bool $activeOnly Whether to return only active accounts
     * @return array Result with success status and accounts data or error message
     */
    public function getByCompanyId($companyId, $activeOnly = true)
    {
        $filters = ['company_id' => $companyId];
        if ($activeOnly) {
            $filters['is_active'] = 1;
        }

        return $this->listAll($filters);
    }

    /**
     * Get accounts by company ID and account type
     *
     * @param int $companyId Company ID
     * @param string $accountType Account type ('domestic_revenue', 'export_revenue', 'expense', 'other')
     * @param bool $activeOnly Whether to return only active accounts
     * @return array Result with success status and accounts data or error message
     */
    public function getByCompanyIdAndType($companyId, $accountType, $activeOnly = true)
    {
        $filters = [
            'company_id' => $companyId,
            'account_type' => $accountType
        ];
        if ($activeOnly) {
            $filters['is_active'] = 1;
        }

        return $this->listAll($filters);
    }

    /**
     * Get accounts by type across all companies
     *
     * @param string $accountType Account type ('domestic_revenue', 'export_revenue', 'expense', 'other')
     * @param bool $activeOnly Whether to return only active accounts
     * @return array Result with success status and accounts data or error message
     */
    public function getByType($accountType, $activeOnly = true)
    {
        $filters = ['account_type' => $accountType];
        if ($activeOnly) {
            $filters['is_active'] = 1;
        }

        return $this->listAll($filters);
    }

    /**
     * Get available account types
     *
     * @return array List of valid account types
     */
    public function getValidAccountTypes()
    {
        return [
            'domestic_revenue' => 'Domestic Revenue',
            'export_revenue' => 'Export Revenue',
            'expense' => 'Expense',
            'other' => 'Other'
        ];
    }

    /**
     * Delete a company account
     *
     * @param int $id Account ID
     * @return array Result with success status and message
     */
    public function delete($id)
    {
        try {
            // Check if account exists
            $existing = $this->getById($id);
            if (!$existing['success']) {
                return $existing;
            }

            $sql = "DELETE FROM company_accounts WHERE id = ?";
            $stmt = $this->pdo->prepare($sql);
            $success = $stmt->execute([$id]);

            if ($success) {
                return [
                    'success' => true,
                    'message' => 'Company account deleted successfully'
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Failed to delete company account'
                ];
            }
        } catch (Exception $e) {
            error_log("Error deleting company account: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Database error occurred while deleting account'
            ];
        }
    }

    /**
     * Toggle account active status
     *
     * @param int $id Account ID
     * @param bool $active New active status
     * @return array Result with success status and message
     */
    public function setActive($id, $active = true)
    {
        try {
            $sql = "UPDATE company_accounts SET is_active = ? WHERE id = ?";
            $stmt = $this->pdo->prepare($sql);
            $success = $stmt->execute([$active ? 1 : 0, $id]);

            if ($success) {
                $account = $this->getById($id);
                if ($account['success']) {
                    return [
                        'success' => true,
                        'message' => 'Account status updated successfully',
                        'data' => $account['data']
                    ];
                } else {
                    return [
                        'success' => true,
                        'message' => 'Account status updated successfully',
                        'data' => null
                    ];
                }
            } else {
                return [
                    'success' => false,
                    'message' => 'Failed to update account status'
                ];
            }
        } catch (Exception $e) {
            error_log("Error updating account status: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Database error occurred while updating status'
            ];
        }
    }

    /**
     * Get summary statistics for company accounts
     *
     * @param int $companyId Optional company ID to filter by
     * @return array Result with success status and summary data
     */
    public function getSummary($companyId = null)
    {
        try {
            $sql = "SELECT
                        COUNT(*) as total_accounts,
                        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_accounts,
                        COUNT(CASE WHEN is_active = 0 THEN 1 END) as inactive_accounts,
                        COUNT(CASE WHEN account_type = 'domestic_revenue' THEN 1 END) as domestic_revenue_accounts,
                        COUNT(CASE WHEN account_type = 'export_revenue' THEN 1 END) as export_revenue_accounts,
                        COUNT(CASE WHEN account_type = 'expense' THEN 1 END) as expense_accounts,
                        COUNT(CASE WHEN account_type = 'other' THEN 1 END) as other_accounts";

            $params = [];

            if ($companyId) {
                $sql .= " FROM company_accounts WHERE company_id = ?";
                $params[] = $companyId;
            } else {
                $sql .= " FROM company_accounts";
            }

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            $summary = $stmt->fetch(PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'data' => $summary
            ];
        } catch (Exception $e) {
            error_log("Error getting accounts summary: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Database error occurred while fetching summary'
            ];
        }
    }

    /**
     * Validate account data
     *
     * @param array $data Account data to validate
     * @param bool $isUpdate Whether this is an update operation
     * @return array Validation result
     */
    private function validateAccountData($data, $isUpdate = false)
    {
        $errors = [];

        // Required fields for new accounts
        if (!$isUpdate) {
            if (empty($data['company_id'])) {
                $errors[] = 'Company ID is required';
            }
            if (empty($data['account_name'])) {
                $errors[] = 'Account name is required';
            }
        }

        // Validate company_id if provided
        if (isset($data['company_id']) && !is_numeric($data['company_id'])) {
            $errors[] = 'Company ID must be a valid number';
        }

        // Validate account_name if provided
        if (isset($data['account_name'])) {
            if (empty(trim($data['account_name']))) {
                $errors[] = 'Account name cannot be empty';
            } elseif (strlen($data['account_name']) > 150) {
                $errors[] = 'Account name cannot exceed 150 characters';
            }
        }

        // Validate account_type if provided
        if (isset($data['account_type'])) {
            $validTypes = ['domestic_revenue', 'export_revenue', 'expense', 'other'];
            if (!in_array($data['account_type'], $validTypes)) {
                $errors[] = 'Account type must be one of: ' . implode(', ', $validTypes);
            }
        }

        // Validate account_number if provided
        if (isset($data['account_number']) && !empty($data['account_number'])) {
            if (strlen($data['account_number']) > 50) {
                $errors[] = 'Account number cannot exceed 50 characters';
            }
        }

        // Validate is_active if provided
        if (isset($data['is_active']) && !in_array($data['is_active'], [0, 1, '0', '1', true, false])) {
            $errors[] = 'Active status must be a boolean value';
        }

        // Validate attachments if provided
        if (isset($data['attachments']) && !is_array($data['attachments'])) {
            $errors[] = 'Attachments must be an array';
        }

        return [
            'success' => empty($errors),
            'message' => empty($errors) ? 'Validation passed' : implode(', ', $errors),
            'errors' => $errors
        ];
    }

    /**
     * Check if account name already exists for a company
     *
     * @param int $companyId Company ID
     * @param string $accountName Account name to check
     * @param int|null $excludeId Account ID to exclude from check (for updates)
     * @return bool True if conflict exists, false otherwise
     */
    private function hasAccountNameConflict($companyId, $accountName, $excludeId = null)
    {
        try {
            $sql = "SELECT id FROM company_accounts
                    WHERE company_id = ? AND account_name = ?";
            $params = [$companyId, $accountName];

            if ($excludeId) {
                $sql .= " AND id != ?";
                $params[] = $excludeId;
            }

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);

            return $stmt->fetch() !== false;
        } catch (Exception $e) {
            error_log("Error checking account name conflict: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Check if company exists
     *
     * @param int $companyId Company ID
     * @return bool True if company exists, false otherwise
     */
    private function companyExists($companyId)
    {
        try {
            $sql = "SELECT id FROM companies WHERE id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$companyId]);

            return $stmt->fetch() !== false;
        } catch (Exception $e) {
            error_log("Error checking company existence: " . $e->getMessage());
            return false;
        }
    }
}
?>
