<?php

include_once '../../config/Database.php';
include_once '../../models/NodeGrantFund.php';


try {
    $database = new Database();
    $db = $database->connect();
    $node = new NodeGrantFund($db);
    $result = $node->scoreReport();

    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'error' => $e->getMessage()
    ]);
}
