<?php
/**
 * 节日海报 - 使用次数 & 解锁检查
 * POST ?action=check_usage&openid=xxx       → 检查本周是否已用
 * POST ?action=increment_usage&openid=xxx   → 标记已用
 * POST ?action=check_unlock&openid=xxx&template=xxx  → 检查模板是否解锁
 */

require_once __DIR__ . '/../config.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => '仅支持POST'], 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$openid = trim($input['openid'] ?? '');
$action = trim($_GET['action'] ?? '');

if (!$openid) jsonResponse(['success' => false, 'message' => '缺少 openid'], 400);

$dataDir = __DIR__ . '/../data';

// 解锁文件
$unlockFile = $dataDir . '/poster_unlocks.json';
$unlocks = [];
if (file_exists($unlockFile)) {
    $unlocks = json_decode(file_get_contents($unlockFile), true) ?: [];
}

if ($action === 'check_unlock') {
    $templateId = preg_replace('/[^a-zA-Z0-9_-]/', '', $input['template'] ?? '');
    $userUnlocks = $unlocks[$openid] ?? [];
    $unlocked = in_array('*', $userUnlocks) || in_array($templateId, $userUnlocks);
    jsonResponse(['success' => true, 'unlocked' => $unlocked]);
}

// 使用次数文件（按周）
$weekStart = date('o-W'); // ISO 8601 year-week
$usageFile = $dataDir . '/poster_usage_' . $weekStart . '.json';
$usage = [];
if (file_exists($usageFile)) {
    $usage = json_decode(file_get_contents($usageFile), true) ?: [];
}

if ($action === 'check_usage') {
    $used = isset($usage[$openid]);
    jsonResponse(['success' => true, 'used' => $used, 'remaining' => $used ? 0 : 1]);
}

if ($action === 'increment_usage') {
    $usage[$openid] = time();
    $fh = fopen($usageFile, 'c');
    if ($fh && flock($fh, LOCK_EX)) {
        ftruncate($fh, 0);
        fwrite($fh, json_encode($usage, JSON_PRETTY_PRINT));
        flock($fh, LOCK_UN);
    }
    if ($fh) fclose($fh);
    jsonResponse(['success' => true, 'message' => '已记录']);
}

jsonResponse(['success' => false, 'message' => '未知操作'], 400);
