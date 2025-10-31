<?php
include_once '../../config/Database.php';
include_once '../../models/ComplianceRecord.php';

try {
    $database = new Database();
    $db = $database->connect();
    $complianceRecord = new ComplianceRecord($db);

    // Get summary statistics
    $sql = "SELECT 
                COUNT(*) as total_records,
                COUNT(DISTINCT company_id) as total_companies,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_records,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_records,
                SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_records,
                SUM(CASE WHEN status = 'Overdue' THEN 1 ELSE 0 END) as overdue_records
            FROM compliance_records";
    
    $stmt = $db->prepare($sql);
    $stmt->execute();
    $summary = $stmt->fetch(PDO::FETCH_ASSOC);

    // Get records by type
    $sql = "SELECT 
                type,
                COUNT(*) as count,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending
            FROM compliance_records 
            GROUP BY type 
            ORDER BY count DESC";
    
    $stmt = $db->prepare($sql);
    $stmt->execute();
    $byType = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get recent compliance records
    $recentRecords = $complianceRecord->listAll(['limit' => 10]);

    // Calculate compliance rate
    $completionRate = $summary['total_records'] > 0 
        ? round(($summary['completed_records'] / $summary['total_records']) * 100, 2) 
        : 0;

    echo json_encode([
        'success' => true,
        'data' => [
            'summary' => array_merge($summary, ['completion_rate' => $completionRate]),
            'by_type' => $byType,
            'recent_records' => $recentRecords
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>