<?php
/**
 * Test script for Company Accounts with account_type functionality
 * This script tests all the new account_type related features
 */

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../models/CompanyAccounts.php';

function testAccountTypes() {
    echo "\n=== Testing Company Accounts with account_type ===\n\n";

    try {
        $database = new Database();
        $db = $database->connect();
        $companyAccounts = new CompanyAccounts($db);

        // Test 1: Get valid account types
        echo "1. Testing getValidAccountTypes()...\n";
        $types = $companyAccounts->getValidAccountTypes();
        echo "Valid account types: " . json_encode($types, JSON_PRETTY_PRINT) . "\n\n";

        // Test 2: Create accounts with different types
        echo "2. Testing account creation with different types...\n";
        $testAccounts = [
            [
                'company_id' => 1,
                'account_name' => 'Test Domestic Revenue Account',
                'account_type' => 'domestic_revenue',
                'description' => 'Test domestic revenue account'
            ],
            [
                'company_id' => 1,
                'account_name' => 'Test Export Revenue Account',
                'account_type' => 'export_revenue',
                'description' => 'Test export revenue account'
            ],
            [
                'company_id' => 1,
                'account_name' => 'Test Expense Account',
                'account_type' => 'expense',
                'description' => 'Test expense account'
            ],
            [
                'company_id' => 1,
                'account_name' => 'Test Other Account',
                'account_type' => 'other',
                'description' => 'Test other account'
            ]
        ];

        $createdAccountIds = [];
        foreach ($testAccounts as $account) {
            $result = $companyAccounts->add($account);
            if ($result['success']) {
                $createdAccountIds[] = $result['data']['id'];
                echo "  ✓ Created {$account['account_type']} account: {$account['account_name']} (ID: {$result['data']['id']})\n";
            } else {
                echo "  ✗ Failed to create {$account['account_type']} account: {$result['message']}\n";
            }
        }
        echo "\n";

        // Test 3: Get accounts by type
        echo "3. Testing getByType() for each account type...\n";
        foreach (array_keys($types) as $type) {
            $result = $companyAccounts->getByType($type);
            if ($result['success']) {
                echo "  ✓ Found {$result['count']} accounts of type '{$type}'\n";
            } else {
                echo "  ✗ Failed to get accounts of type '{$type}': {$result['message']}\n";
            }
        }
        echo "\n";

        // Test 4: Get accounts by company and type
        echo "4. Testing getByCompanyIdAndType()...\n";
        foreach (array_keys($types) as $type) {
            $result = $companyAccounts->getByCompanyIdAndType(1, $type);
            if ($result['success']) {
                echo "  ✓ Found {$result['count']} accounts of type '{$type}' for company 1\n";
            } else {
                echo "  ✗ Failed to get accounts of type '{$type}' for company 1: {$result['message']}\n";
            }
        }
        echo "\n";

        // Test 5: Test filtering with listAll
        echo "5. Testing listAll() with account_type filter...\n";
        $result = $companyAccounts->listAll(['account_type' => 'domestic_revenue']);
        if ($result['success']) {
            echo "  ✓ Found {$result['count']} domestic_revenue accounts using listAll filter\n";
        } else {
            echo "  ✗ Failed to filter by account_type: {$result['message']}\n";
        }
        echo "\n";

        // Test 6: Test summary with account type breakdown
        echo "6. Testing getSummary() with account type breakdown...\n";
        $result = $companyAccounts->getSummary();
        if ($result['success']) {
            $summary = $result['data'];
            echo "  ✓ Summary statistics:\n";
            echo "    Total accounts: {$summary['total_accounts']}\n";
            echo "    Active accounts: {$summary['active_accounts']}\n";
            echo "    Domestic revenue accounts: {$summary['domestic_revenue_accounts']}\n";
            echo "    Export revenue accounts: {$summary['export_revenue_accounts']}\n";
            echo "    Expense accounts: {$summary['expense_accounts']}\n";
            echo "    Other accounts: {$summary['other_accounts']}\n";
        } else {
            echo "  ✗ Failed to get summary: {$result['message']}\n";
        }
        echo "\n";

        // Test 7: Test validation of invalid account type
        echo "7. Testing validation with invalid account type...\n";
        $invalidAccount = [
            'company_id' => 1,
            'account_name' => 'Test Invalid Account',
            'account_type' => 'invalid_type',
            'description' => 'This should fail'
        ];
        $result = $companyAccounts->add($invalidAccount);
        if (!$result['success']) {
            echo "  ✓ Correctly rejected invalid account type: {$result['message']}\n";
        } else {
            echo "  ✗ Unexpectedly accepted invalid account type\n";
        }
        echo "\n";

        // Test 8: Test updating account type
        echo "8. Testing account type update...\n";
        if (!empty($createdAccountIds)) {
            $testAccountId = $createdAccountIds[0];
            $result = $companyAccounts->update($testAccountId, ['account_type' => 'expense']);
            if ($result['success']) {
                echo "  ✓ Successfully updated account type to 'expense'\n";

                // Verify the update
                $getResult = $companyAccounts->getById($testAccountId);
                if ($getResult['success'] && $getResult['data']['account_type'] === 'expense') {
                    echo "  ✓ Verified account type was updated correctly\n";
                } else {
                    echo "  ✗ Account type update was not saved correctly\n";
                }
            } else {
                echo "  ✗ Failed to update account type: {$result['message']}\n";
            }
        }
        echo "\n";

        // Cleanup: Delete test accounts
        echo "9. Cleaning up test accounts...\n";
        foreach ($createdAccountIds as $accountId) {
            $result = $companyAccounts->delete($accountId);
            if ($result['success']) {
                echo "  ✓ Deleted test account ID: {$accountId}\n";
            } else {
                echo "  ✗ Failed to delete test account ID: {$accountId}\n";
            }
        }

        echo "\n=== Test completed ===\n";

    } catch (Exception $e) {
        echo "Error during testing: " . $e->getMessage() . "\n";
    }
}

// Run the tests
testAccountTypes();
?>
