<?php

require_once 'usage_helper.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $openid = trim($input['openid'] ?? '');
    $tool = trim($input['tool'] ?? '');

    if (!$openid) {
        throw new Exception('缺少openid');
    }

    $usage = getUsageData($openid, $tool);
    $remaining = getRemaining($openid, $tool);
    $limit = $tool === 'link_parse' ? DAILY_LIMIT_LINK_PARSE : DAILY_LIMIT;
    $totalLimit = $limit + ($usage['bonus'] ?? 0);

    jsonResponse([
        'success' => true,
        'remaining' => $remaining,
        'used' => $usage['used'] ?? 0,
        'limit' => $limit,
        'bonus' => $usage['bonus'] ?? 0,
        'total_limit' => $totalLimit,
    ]);
} catch (Exception $e) {
    jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
}
