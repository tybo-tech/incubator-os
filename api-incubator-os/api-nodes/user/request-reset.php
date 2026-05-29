<?php
/**
 * POST /api-nodes/user/request-reset.php
 * Body: { "email": "user@example.com" }
 *
 * Generates a password-reset token and returns reset metadata.
 * Frontend dispatches the actual email through EmailService.
 * Always returns 200.
 */
include_once '../../config/Database.php';
include_once '../../config/app.php';
include_once '../../models/User.php';

$data = json_decode(file_get_contents('php://input'), true);

$email = trim($data['email'] ?? '');

if (!$email) {
    http_response_code(400);
    echo json_encode(['error' => 'email is required']);
    exit;
}

try {
    $database = new Database();
    $db       = $database->connect();
    $userModel = new User($db);
  $dispatch = null;

    // Look up by email field
    $stmt = $db->prepare('SELECT id, full_name, email FROM users WHERE email = ? AND status != ? LIMIT 1');
    $stmt->execute([$email, 'inactive']);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        // Invalidate any existing unused tokens
        $db->prepare('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL')
           ->execute([$user['id']]);

        // Generate new token (64 hex chars = 32 random bytes)
        $token     = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+24 hours'));

        $db->prepare(
            'INSERT INTO password_reset_tokens (user_id, token, type, expires_at) VALUES (?, ?, ?, ?)'
        )->execute([$user['id'], $token, 'reset', $expiresAt]);

        $name = $user['full_name'] ?: $email;

        // Frontend will build the reset link dynamically using window.location.origin
        // This ensures the link matches the actual deployment (local, staging, production)
        $dispatch = [
            'recipient_name'  => $name,
            'recipient_email' => $user['email'],
            'token'           => $token,
        ];
    }

    // Always return 200
    $response = [
        'success' => true,
        'message' => 'If that email is registered, a reset link has been sent.',
        'dispatch' => $dispatch,
    ];

    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error. Please try again.']);
}
