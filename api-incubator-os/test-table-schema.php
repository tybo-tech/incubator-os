<?php
// Quick test to check action_items table schema
require_once 'config/database.php';

try {
    $database = new Database();
    $db = $database->connect();

    // Show table structure
    $query = "DESCRIBE action_items";
    $stmt = $db->prepare($query);
    $stmt->execute();

    echo "ACTION_ITEMS TABLE SCHEMA:\n";
    echo "-------------------------\n";
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo sprintf("%-20s %-15s %-10s %-10s %-15s %-15s\n",
            $row['Field'],
            $row['Type'],
            $row['Null'],
            $row['Key'],
            $row['Default'] ?? 'NULL',
            $row['Extra'] ?? ''
        );
    }

    echo "\n\nSample data (first 3 rows):\n";
    echo "----------------------------\n";
    $query2 = "SELECT * FROM action_items LIMIT 3";
    $stmt2 = $db->prepare($query2);
    $stmt2->execute();

    while ($row = $stmt2->fetch(PDO::FETCH_ASSOC)) {
        print_r($row);
        echo "\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
