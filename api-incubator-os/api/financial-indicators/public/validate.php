<?php

include_once '../../../config/Database.php';
include_once '../../../config/headers.php';
include_once '../../../capabilities/financial-indicators/Repository/FinancialIndicatorLinkRepository.php';

$token = basename(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

try {
    $db = (new Database())->connect();
    $linkRepo = new FinancialIndicatorLinkRepository($db);
    $request = $linkRepo->getByToken($token);

    if (!$request) {
        http_response_code(404);
        echo json_encode(['valid' => false, 'error' => 'Invalid token']);
        exit;
    }

    $data = $request['data'];
    $status = $data['status'] ?? 'pending';
    $expiresAt = $data['expires_at'] ?? '';

    if ($status === 'completed') {
        echo json_encode(['valid' => false, 'error' => 'This link has already been used']);
        exit;
    }

    if ($expiresAt && strtotime($expiresAt) < time()) {
        echo json_encode(['valid' => false, 'error' => 'This link has expired']);
        exit;
    }

    echo json_encode([
        'valid' => true,
        'financialYear' => (int)($data['financial_year'] ?? 0),
        'month' => (int)($data['month'] ?? 0),
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['valid' => false, 'error' => $e->getMessage()]);
}
