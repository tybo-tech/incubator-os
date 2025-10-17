<?php
/**
 * Migration script to update existing company accounts with default account_type
 * This script should be run after adding the account_type column to ensure
 * all existing accounts have a proper account_type value.
 */

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../models/CompanyAccounts.php';

try {
    echo "Starting account_type migration...\n";

    $database = new Database();
    $db = $database->connect();

    // Check if account_type column exists
    $checkColumn = $db->query("SHOW COLUMNS FROM company_accounts LIKE 'account_type'");
    if ($checkColumn->rowCount() === 0) {
        echo "Error: account_type column does not exist. Please run the ALTER TABLE command first.\n";
        exit(1);
    }

    // Get accounts with NULL account_type
    $stmt = $db->query("SELECT COUNT(*) as count FROM company_accounts WHERE account_type IS NULL");
    $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    if ($count === 0) {
        echo "No accounts need updating. All accounts already have account_type set.\n";
        exit(0);
    }

    echo "Found {$count} accounts without account_type. Updating...\n";

    // Update accounts with NULL account_type to 'domestic_revenue' (default)
    $updateStmt = $db->prepare("UPDATE company_accounts SET account_type = 'domestic_revenue' WHERE account_type IS NULL");
    $success = $updateStmt->execute();

    if ($success) {
        $updatedRows = $updateStmt->rowCount();
        echo "Successfully updated {$updatedRows} accounts with default account_type 'domestic_revenue'.\n";

        // Verify the update
        $verifyStmt = $db->query("SELECT COUNT(*) as count FROM company_accounts WHERE account_type IS NULL");
        $remainingNull = $verifyStmt->fetch(PDO::FETCH_ASSOC)['count'];

        if ($remainingNull === 0) {
            echo "Migration completed successfully. All accounts now have account_type set.\n";
        } else {
            echo "Warning: {$remainingNull} accounts still have NULL account_type.\n";
        }

        // Show summary by account type
        echo "\nAccount type summary:\n";
        $summaryStmt = $db->query("
            SELECT
                account_type,
                COUNT(*) as count
            FROM company_accounts
            GROUP BY account_type
            ORDER BY account_type
        ");

        while ($row = $summaryStmt->fetch(PDO::FETCH_ASSOC)) {
            echo "  {$row['account_type']}: {$row['count']} accounts\n";
        }

    } else {
        echo "Error: Failed to update accounts.\n";
        exit(1);
    }

} catch (Exception $e) {
    echo "Error during migration: " . $e->getMessage() . "\n";
    exit(1);
}
?>
