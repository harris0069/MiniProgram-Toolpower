<?php
/**
 * @deprecated 已废弃，请使用 usage_control.php?action=redeem
 * 保留此文件仅作兼容，新老前端均已迁移至新 unified 接口。
 */
http_response_code(410);
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['success' => false, 'error' => '此接口已废弃，请使用新接口'], JSON_UNESCAPED_UNICODE);
exit;

// --- 以下为旧实现，不再执行 ---

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
    $code = trim(strtoupper($input['code'] ?? ''));
    $tool = trim($input['tool'] ?? '');

    if (!$openid) {
        throw new Exception('缺少openid');
    }
    if (!$code) {
        throw new Exception('请输入兑换码');
    }

    // 加载兑换码列表
    $codesFile = USAGE_DIR . 'redeem_codes.json';
    if (!file_exists($codesFile)) {
        throw new Exception('兑换码服务暂不可用');
    }
    $codes = json_decode(file_get_contents($codesFile), true);

    if (!isset($codes[$code]) || !$codes[$code]['active']) {
        throw new Exception('无效的兑换码');
    }

    // 检查当天是否已用过此码（所有工具共享）
    $redeemedFile = USAGE_DIR . 'redeemed_' . date('Y-m-d') . '.json';
    $redeemed = [];
    if (file_exists($redeemedFile)) {
        $redeemed = json_decode(file_get_contents($redeemedFile), true) ?: [];
    }
    if (isset($redeemed[$openid]) && in_array($code, $redeemed[$openid])) {
        throw new Exception('该兑换码今天已使用过');
    }

    // 增加10次机会
    addBonus($openid, BONUS_PER_CODE, $tool);

    // 记录已兑换
    $redeemed[$openid][] = $code;
    file_put_contents($redeemedFile, json_encode($redeemed, JSON_PRETTY_PRINT));

    jsonResponse([
        'success' => true,
        'message' => '兑换成功，今天增加' . BONUS_PER_CODE . '次使用机会',
        'added' => BONUS_PER_CODE,
    ]);
} catch (Exception $e) {
    jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
}
