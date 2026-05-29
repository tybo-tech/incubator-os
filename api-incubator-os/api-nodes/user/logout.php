<?php
include_once '../../config/Database.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

session_unset();
session_destroy();

echo json_encode(['success' => true]);
