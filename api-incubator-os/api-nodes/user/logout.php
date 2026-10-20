<?php
include_once '../../config/Database.php';
include_once '../../helpers/Session.php';

app_session_start();

session_unset();
session_destroy();

// Expire the client cookie too, now that the session cookie is persistent.
if (isset($_COOKIE[session_name()])) {
    setcookie(session_name(), '', [
        'expires' => time() - 3600,
        'path' => '/',
        'domain' => '',
        'secure' => true,
        'httponly' => true,
        'samesite' => 'None',
    ]);
}

echo json_encode(['success' => true]);
