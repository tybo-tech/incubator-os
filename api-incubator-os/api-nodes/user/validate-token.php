<?php
/**
 * GET /api-nodes/user/validate-token.php?token=xxx
 *
 * Returns { valid: true, type: 'reset'|'invite', user: { id, full_name, email } }
 * or      { valid: false, message: '...' }
 */
include_once '../../config/Database.php';

$token = trim($_GET['token'] ?? '');

if (!$token) {
    http_response_code(400);
    echo json_encode(['valid' => false, 'message' => 'Token is required.']);
    exit;
}

try {
    $database = new Database();
    $db       = $database->connect();

    $stmt = $db->prepare(
        'SELECT t.id, t.user_id, t.type, t.expires_at, t.used_at,
                u.full_name, u.email, u.status
           FROM password_reset_tokens t
           JOIN users u ON u.id = t.user_id
          WHERE t.token = ?
          LIMIT 1'
    );
    $stmt->execute([$token]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        echo json_encode(['valid' => false, 'message' => 'This link is invalid or has already been used.']);
        exit;
    }

    if ($row['used_at'] !== null) {
        echo json_encode(['valid' => false, 'message' => 'This link has already been used.']);
        exit;
    }

    if (strtotime($row['expires_at']) < time()) {
        echo json_encode(['valid' => false, 'message' => 'This link has expired. Please request a new one.']);
        exit;
    }

    if ($row['status'] === 'inactive') {
        echo json_encode(['valid' => false, 'message' => 'Your account is inactive. Please contact an administrator.']);
        exit;
    }

    echo json_encode([
        'valid' => true,
        'type'  => $row['type'],
        'user'  => [
            'id'        => (int)$row['user_id'],
            'full_name' => $row['full_name'],
            'email'     => $row['email'],
        ],
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['valid' => false, 'message' => 'Server error. Please try again.']);
}
