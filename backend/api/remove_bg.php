<?php

require_once '../config.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

try {
    writeLog('INFO', '收到人像分割请求');

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }

    validateRequired($input, ['original_image']);

    $originalImage = $input['original_image'];
    $openid = $input['openid'] ?? 'anonymous';

    writeLog('INFO', '参数验证通过', [
        'openid' => $openid,
        'image_size' => strlen($originalImage)
    ]);

    // 1. 保存临时图片
    $imageData = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $originalImage));
    if (!$imageData) {
        throw new Exception('无效的Base64图片数据');
    }

    $ext = 'jpg';
    $tempName = 'bg_' . date('YmdHis') . '_' . substr(md5(uniqid(mt_rand(), true)), 0, 8) . '.' . $ext;
    $tempPath = UPLOAD_DIR . $tempName;
    file_put_contents($tempPath, $imageData);

    // 2. 构造公网可访问的临时图片URL
    $imageUrl = rtrim(SERVER_PUBLIC_URL, '/') . '/uploads/' . $tempName;

    // 3. 调用阿里云人像分割
    $startTime = microtime(true);
    $result = callAliyunSegmentBody($imageUrl);
    $processingTime = (microtime(true) - $startTime) * 1000;

    // 4. 清理临时图片
    @unlink($tempPath);

    if (!$result['success']) {
        throw new Exception($result['error']);
    }

    writeLog('INFO', '阿里云API调用成功', [
        'processing_time' => round($processingTime) . 'ms'
    ]);

    jsonResponse([
        'success' => true,
        'result_image' => $result['result_image'],
        'processing_time' => round($processingTime),
        'message' => '抠图成功'
    ]);

} catch (Exception $e) {
    writeLog('ERROR', '处理失败', ['error' => $e->getMessage()]);
    jsonResponse([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], 500);
}

/**
 * 调用阿里云视觉智能平台 - 人体分割 (SegmentBody)
 */
function callAliyunSegmentBody($imageUrl) {
    $accessKeyId = ALIYUN_ACCESS_KEY_ID;
    $accessKeySecret = ALIYUN_ACCESS_KEY_SECRET;

    if (strpos($accessKeyId, 'YOUR_') === 0) {
        throw new Exception('阿里云AccessKey未配置');
    }

    $params = [
        'Action' => 'SegmentBody',
        'Format' => 'JSON',
        'Version' => '2019-12-30',
        'RegionId' => ALIYUN_REGION,
        'AccessKeyId' => $accessKeyId,
        'SignatureMethod' => 'HMAC-SHA1',
        'SignatureVersion' => '1.0',
        'SignatureNonce' => md5(uniqid(mt_rand(), true)),
        'Timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
        'ImageURL' => $imageUrl,
    ];

    ksort($params);

    $canonicalizedQueryString = '';
    foreach ($params as $key => $value) {
        $canonicalizedQueryString .= '&' . rawurlencode($key) . '=' . rawurlencode($value);
    }
    $canonicalizedQueryString = substr($canonicalizedQueryString, 1);

    $stringToSign = 'GET&' . rawurlencode('/') . '&' . rawurlencode($canonicalizedQueryString);
    $signature = base64_encode(hash_hmac('sha1', $stringToSign, $accessKeySecret . '&', true));

    $url = 'https://imageseg.' . ALIYUN_REGION . '.aliyuncs.com/?' . $canonicalizedQueryString . '&Signature=' . rawurlencode($signature);

    writeLog('INFO', '调用阿里云SegmentBody', ['url_length' => strlen($url)]);

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 60,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        throw new Exception('阿里云API网络请求失败: ' . $curlError);
    }

    writeLog('INFO', '阿里云API响应', ['http_code' => $httpCode]);

    if ($httpCode !== 200) {
        $errorData = json_decode($response, true);
        $msg = $errorData['Message'] ?? ($errorData['Code'] ?? '未知错误');
        throw new Exception("阿里云API调用失败: {$msg} (HTTP {$httpCode})");
    }

    $data = json_decode($response, true);
    if (!$data || !isset($data['Data']['ImageURL'])) {
        throw new Exception('阿里云API返回格式异常');
    }

    // 下载分割结果图片
    $resultImageUrl = $data['Data']['ImageURL'];
    $imageData = file_get_contents($resultImageUrl);
    if (!$imageData) {
        throw new Exception('下载分割结果失败');
    }

    return [
        'success' => true,
        'result_image' => 'data:image/png;base64,' . base64_encode($imageData),
    ];
}
?>