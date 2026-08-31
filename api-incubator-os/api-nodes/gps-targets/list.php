<?php
include_once '../../config/Database.php';
include_once '../../models/GpsTarget.php';
include_once '../../models/User.php';
include_once '../../helpers/AuthGuard.php';
include_once '../../config/headers.php';
try {
    $db = (new Database())->connect();
    $authUser = auth_require_user($db);
    $authInput = $input ?? [];
    if (!is_array($authInput)) $authInput = [];
    auth_enforce_request($db, $authUser, array_merge($_GET, $authInput));
    $model = new GpsTarget($db);
    $filters = [];
    if (isset($_GET['company_id'])) $filters['company_id'] = (int)$_GET['company_id'];
    if (isset($_GET['category'])) $filters['category'] = $_GET['category'];
    if (isset($_GET['status'])) $filters['status'] = $_GET['status'];
    if (isset($_GET['priority'])) $filters['priority'] = $_GET['priority'];
    if (isset($_GET['search'])) $filters['search'] = $_GET['search'];
    if (isset($_GET['limit'])) $filters['limit'] = (int)$_GET['limit'];
    if (isset($_GET['offset'])) $filters['offset'] = (int)$_GET['offset'];
    echo json_encode($model->listAll($filters));
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
