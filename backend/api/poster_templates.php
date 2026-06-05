<?php

require_once __DIR__ . '/../config.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$action = $_GET['action'] ?? 'entries';
$catalogFile = __DIR__ . '/../../backend/templates/catalog.json';

if (!file_exists($catalogFile)) {
    jsonResponse(['success' => false, 'message' => '模板目录不存在'], 500);
}

$allTemplates = json_decode(file_get_contents($catalogFile), true);
if (!$allTemplates || !is_array($allTemplates)) {
    jsonResponse(['success' => false, 'message' => '模板数据解析失败'], 500);
}

if ($action === 'detail') {
    $id = preg_replace('/[^a-zA-Z0-9_-]/', '', $_GET['id'] ?? '');
    if (!$id) jsonResponse(['success' => false, 'message' => '缺少 id 参数'], 400);
    $found = null;
    foreach ($allTemplates as $t) {
        if (($t['id'] ?? '') === $id) { $found = $t; break; }
    }
    if (!$found) jsonResponse(['success' => false, 'message' => '模板不存在'], 404);
    jsonResponse(['success' => true, 'template' => $found]);
}

// 按 entry 分组
$entries = [];
foreach ($allTemplates as $tpl) {
    $entryKey = $tpl['entry'] ?? '';
    if (!$entryKey) continue;
    if (!isset($entries[$entryKey])) {
        $entries[$entryKey] = [
            'entry' => $entryKey,
            'entryName' => $tpl['entryName'] ?? $entryKey,
            'category' => $tpl['category'] ?? '',
            'templates' => [],
        ];
    }
    $entries[$entryKey]['templates'][] = [
        'id' => $tpl['id'] ?? '',
        'name' => $tpl['name'] ?? '',
        'tier' => $tpl['tier'] ?? 'free',
        'thumbnail' => $tpl['thumbnail'] ?? '',
    ];
}

// 分类筛选
$category = $_GET['category'] ?? '';
if ($category) {
    $entries = array_values(array_filter($entries, function ($e) use ($category) {
        return $e['category'] === $category;
    }));
} else {
    $entries = array_values($entries);
}

jsonResponse(['success' => true, 'entries' => $entries]);
