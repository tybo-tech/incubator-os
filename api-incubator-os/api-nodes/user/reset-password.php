<?php
/**
 * POST /api-nodes/user/reset-password.php
 * Body: { "token": "...", "password": "..." }
 *
 * Validates token, sets new password, marks token used, activates user if invited.
 */
include_once '../../config/Database.php';
include_once '../../models/User.php';

$data     = json_decode(file_get_contents('php://input'), true);
$token    = trim($data['token']    ?? '');
$password = $data['password'] ?? '';

if (!$token || !$password) {
    http_response_code(400);
    echo json_encode(['error' => 'token and password are required']);
    exit;
}

if (strlen($password) < 6) {
    http_response_code(422);
    echo json_encode(['error' => 'Password must be at least 6 characters.']);
    exit;
}

try {
    $database = new Database();
    $db       = $database->connect();

    // Fetch and validate token
    $stmt = $db->prepare(
        'SELECT t.id, t.user_id, t.type, t.expires_at, t.used_at, u.status
           FROM password_reset_tokens t
           JOIN users u ON u.id = t.user_id
          WHERE t.token = ?
          LIMIT 1'
    );
    $stmt->execute([$token]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid or already-used link.']);
        exit;
    }
    if ($row['used_at'] !== null) {
        http_response_code(400);
        echo json_encode(['error' => 'This link has already been used.']);
        exit;
    }
    if (strtotime($row['expires_at']) < time()) {
        http_response_code(400);
        echo json_encode(['error' => 'This link has expired. Please request a new one.']);
        exit;
    }
    if ($row['status'] === 'inactive') {
        http_response_code(403);
        echo json_encode(['error' => 'Your account is inactive. Please contact an administrator.']);
        exit;
    }

    // Set new password
    $userModel = new User($db);
    $updated = $userModel->update((int)$row['user_id'], ['password' => $password]);

    // If the user was in 'invited' status, promote to 'active'
    if ($row['status'] === 'invited') {
        $userModel->update((int)$row['user_id'], ['status' => 'active']);
    }

    // Mark token as used
    $db->prepare('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?')
       ->execute([$row['id']]);

    // Invalidate any other pending tokens for this user
    $db->prepare(
        'UPDATE password_reset_tokens SET used_at = NOW()
          WHERE user_id = ? AND id != ? AND used_at IS NULL'
    )->execute([$row['user_id'], $row['id']]);

    echo json_encode(['success' => true, 'message' => 'Password set successfully.']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error. Please try again.']);
}
