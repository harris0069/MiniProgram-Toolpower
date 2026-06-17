<?php

require_once __DIR__ . '/../config.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$action = $_GET['action'] ?? $input['action'] ?? 'entries';
$catalogFile = __DIR__ . '/../../backend/templates/catalog.json';
$imagesDir = __DIR__ . '/../../backend/templates/images/';

function loadCatalog() {
    global $catalogFile;
    if (!file_exists($catalogFile)) return [];
    $data = json_decode(file_get_contents($catalogFile), true);
    return is_array($data) ? $data : [];
}

function saveCatalog($templates) {
    global $catalogFile;
    $json = json_encode($templates, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if (file_exists($catalogFile)) {
        copy($catalogFile, $catalogFile . '.bak');
    }
    file_put_contents($catalogFile, $json, LOCK_EX);
    if (file_get_contents($catalogFile) !== $json) {
        throw new Exception('模板文件写入校验失败');
    }
}

function decodeImage($base64Data, $outputPath, $maxBytes) {
    if (strpos($base64Data, 'base64,') !== false) {
        $base64Data = substr($base64Data, strpos($base64Data, 'base64,') + 7);
    }
    $binary = base64_decode($base64Data, true);
    if ($binary === false) throw new Exception('图片解码失败');
    if (strlen($binary) > $maxBytes) throw new Exception('图片超过大小限制');
    file_put_contents($outputPath, $binary);
}

// ===== 管理 action（需登录） =====
$adminActions = ['save_template', 'delete_template'];
if (in_array($action, $adminActions)) {
    @session_start();
    if (empty($_SESSION['admin_logged_in'])) {
        jsonResponse(['success' => false, 'error' => '未登录'], 401);
    }
    try {
        if ($action === 'save_template') {
            $tpl = $input['template'] ?? [];
            if (!$tpl || empty($tpl['id'])) throw new Exception('缺少模板 ID');

            $id = preg_replace('/[^a-zA-Z0-9_-]/', '', $tpl['id']);
            $entry = trim($tpl['entry'] ?? '');
            $entryName = trim($tpl['entryName'] ?? '');
            $name = trim($tpl['name'] ?? '');
            $category = in_array($tpl['category'] ?? '', ['节假日', '节气']) ? $tpl['category'] : '节假日';
            $tier = ($tpl['tier'] ?? 'free') === 'premium' ? 'premium' : 'free';
            $sortOrder = (int)($tpl['sortOrder'] ?? 0);

            if (!$entry || !$name) throw new Exception('分组 entry 和模板名称不能为空');

            $templates = loadCatalog();

            $foundIndex = null;
            foreach ($templates as $i => $t) {
                if (($t['id'] ?? '') === $id) { $foundIndex = $i; break; }
            }

            $newTemplate = [
                'id' => $id,
                'entry' => $entry,
                'entryName' => $entryName,
                'name' => $name,
                'category' => $category,
                'tier' => $tier,
                'sortOrder' => $sortOrder,
            ];

            if (!empty($tpl['bg_image'])) {
                $bgPath = $imagesDir . $id . '_bg.jpg';
                decodeImage($tpl['bg_image'], $bgPath, 500 * 1024);
                $newTemplate['bg'] = '/templates/images/' . $id . '_bg.jpg';
            } elseif ($foundIndex !== null) {
                $newTemplate['bg'] = $templates[$foundIndex]['bg'] ?? '';
            } else {
                $newTemplate['bg'] = '';
            }

            if (!empty($tpl['thumb_image'])) {
                $thumbPath = $imagesDir . $id . '_thumb.jpg';
                decodeImage($tpl['thumb_image'], $thumbPath, 100 * 1024);
                $newTemplate['thumbnail'] = '/templates/images/' . $id . '_thumb.jpg';
            } elseif ($foundIndex !== null) {
                $newTemplate['thumbnail'] = $templates[$foundIndex]['thumbnail'] ?? '';
            } else {
                $newTemplate['thumbnail'] = '';
            }

            if ($foundIndex !== null) {
                $templates[$foundIndex] = $newTemplate;
            } else {
                $templates[] = $newTemplate;
            }

            saveCatalog($templates);
            jsonResponse(['success' => true, 'message' => '模板已保存', 'template' => $newTemplate]);
        }

        if ($action === 'delete_template') {
            $id = preg_replace('/[^a-zA-Z0-9_-]/', '', $input['id'] ?? '');
            if (!$id) throw new Exception('缺少模板 ID');

            $templates = loadCatalog();
            $foundIndex = null;
            foreach ($templates as $i => $t) {
                if (($t['id'] ?? '') === $id) { $foundIndex = $i; break; }
            }
            if ($foundIndex === null) throw new Exception('模板不存在');

            array_splice($templates, $foundIndex, 1);
            saveCatalog($templates);

            $bgFile = $imagesDir . $id . '_bg.jpg';
            $thumbFile = $imagesDir . $id . '_thumb.jpg';
            if (file_exists($bgFile)) unlink($bgFile);
            if (file_exists($thumbFile)) unlink($thumbFile);

            jsonResponse(['success' => true, 'message' => '模板已删除']);
        }
    } catch (\Throwable $e) {
        jsonResponse(['success' => false, 'error' => $e->getMessage()]);
    }
}

// ===== 前台 GET action（原有逻辑不变）=====
if (!file_exists($catalogFile)) {
    jsonResponse(['success' => false, 'message' => '模板目录不存在'], 500);
}

$allTemplates = loadCatalog();

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
        'sortOrder' => (int)($tpl['sortOrder'] ?? 0),
    ];
}

// 分组内按 sortOrder 排序
foreach ($entries as &$entry) {
    usort($entry['templates'], function($a, $b) {
        return ($a['sortOrder'] ?? 0) - ($b['sortOrder'] ?? 0);
    });
}
unset($entry);

$category = $_GET['category'] ?? '';
if ($category) {
    $entries = array_values(array_filter($entries, function ($e) use ($category) {
        return $e['category'] === $category;
    }));
} else {
    $entries = array_values($entries);
}

jsonResponse(['success' => true, 'entries' => $entries]);
