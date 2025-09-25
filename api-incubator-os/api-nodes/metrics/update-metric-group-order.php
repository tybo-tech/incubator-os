<?php
include_once '../../config/Database.php';
include_once '../../models/Metrics.php';

$data = json_decode(file_get_contents('php://input'), true);
try {
    if(!$data || !isset($data['orders']) || !is_array($data['orders'])) {
        throw new Exception('orders array is required');
    }

    $database = new Database();
    $db = $database->connect();
    $m = new Metrics($db);

    // Start transaction for atomic updates
    $db->beginTransaction();

    $success = true;
    $updatedCount = 0;

    foreach($data['orders'] as $orderItem) {
        if(!isset($orderItem['id']) || !isset($orderItem['order_no'])) {
            throw new Exception('Each order item must have id and order_no');
        }

        $id = (int)$orderItem['id'];
        $orderNo = (int)$orderItem['order_no'];

        $result = $m->updateGroupOrder($id, $orderNo);
        if($result) {
            $updatedCount++;
        } else {
            $success = false;
            break;
        }
    }

    if($success) {
        $db->commit();
        echo json_encode(['success' => true, 'updated_count' => $updatedCount]);
    } else {
        $db->rollBack();
        throw new Exception('Failed to update group orders');
    }

} catch (Exception $e) {
    if(isset($db)) {
        $db->rollBack();
    }
    http_response_code(400);
    echo json_encode(['error'=>$e->getMessage()]);
}
?>
