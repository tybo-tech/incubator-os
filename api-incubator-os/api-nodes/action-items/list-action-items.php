<?php
include_once '../../config/Database.php';
include_once '../../models/ActionItems.php';
include_once '../../config/headers.php';

try {
    $database = new Database();
    $db = $database->connect();
    $actionItems = new ActionItems($db);

    // Build filters from query parameters
    $filters = [];
    
    if (isset($_GET['tenant_id'])) {
        $filters['tenant_id'] = (int) $_GET['tenant_id'];
    }
    
    if (isset($_GET['company_id'])) {
        $filters['company_id'] = (int) $_GET['company_id'];
    }
    
    if (isset($_GET['context_type'])) {
        $filters['context_type'] = $_GET['context_type'];
    }
    
    if (isset($_GET['category'])) {
        $filters['category'] = $_GET['category'];
    }
    
    if (isset($_GET['status'])) {
        $filters['status'] = $_GET['status'];
    }
    
    if (isset($_GET['priority'])) {
        $filters['priority'] = $_GET['priority'];
    }
    
    if (isset($_GET['assigned_to_user_id'])) {
        $filters['assigned_to_user_id'] = (int) $_GET['assigned_to_user_id'];
    }
    
    if (isset($_GET['is_archived'])) {
        $filters['is_archived'] = (int) $_GET['is_archived'];
    }
    
    if (isset($_GET['search'])) {
        $filters['search'] = $_GET['search'];
    }
    
    if (isset($_GET['limit'])) {
        $filters['limit'] = (int) $_GET['limit'];
    }
    
    if (isset($_GET['offset'])) {
        $filters['offset'] = (int) $_GET['offset'];
    }

    $result = $actionItems->listAll($filters);
    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}