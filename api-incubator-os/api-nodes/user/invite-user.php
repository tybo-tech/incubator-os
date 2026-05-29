<?php
/**
 * POST /api-nodes/user/invite-user.php
 * Body: { "user_id": 123 }
 *
 * Admin-only: generates an invite token, sends the user an email to set their password,
 * and updates their status to 'invited'.
 */
include_once '../../config/Database.php';
include_once '../../config/app.php';
include_once '../../models/User.php';
include_once '../../helpers/Mailer.php';

// Require authenticated session
if (session_status() !== PHP_SESSION_ACTIVE) session_start();

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorised.']);
    exit;
}

$data   = json_decode(file_get_contents('php://input'), true);
$userId = (int)($data['user_id'] ?? 0);

if (!$userId) {
    http_response_code(400);
    echo json_encode(['error' => 'user_id is required']);
    exit;
}

try {
    $database  = new Database();
    $db        = $database->connect();
    $userModel = new User($db);

    $user = $userModel->getById($userId);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found.']);
        exit;
    }

    $email = $user['email'] ?? '';
    $name  = $user['full_name'] ?? $user['username'] ?? $email;

    if (!$email) {
        http_response_code(422);
        echo json_encode(['error' => 'This user has no email address set. Please update their profile first.']);
        exit;
    }

    // Invalidate any existing unused tokens for this user
    $db->prepare('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL')
       ->execute([$userId]);

    // Generate invite token
    $token     = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', strtotime('+72 hours')); // 3 days for invite

    $db->prepare(
        'INSERT INTO password_reset_tokens (user_id, token, type, expires_at) VALUES (?, ?, ?, ?)'
    )->execute([$userId, $token, 'invite', $expiresAt]);

    // Mark user as invited
    $userModel->update($userId, ['status' => 'invited']);

    // Frontend will build the invite link dynamically using window.location.origin
    // Return token and dispatch metadata for frontend email send
    echo json_encode([
        'success' => true,
        'message' => 'Invitation prepared. Email will be sent to ' . $email,
        'dispatch' => [
            'recipient_name'  => $name,
            'recipient_email' => $email,
            'token'           => $token,
        ],
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error. Please try again.']);
}

