<?php

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/usage_helper.php';

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
    set_time_limit(120);
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

    // 检查功能开关
    $configPath = __DIR__ . '/../config/usage_config.json';
    if (file_exists($configPath)) {
        $config = json_decode(file_get_contents($configPath), true);
        $toolConfig = $config['id-photo'] ?? null;
        if ($toolConfig && isset($toolConfig['feature_enabled']) && !$toolConfig['feature_enabled']) {
            $msg = $toolConfig['feature_message'] ?: '功能暂不可用';
            throw new Exception($msg);
        }
    }

    // 检查每日使用限制
    $remaining = getRemaining($openid, 'id-photo');
    if ($remaining <= 0) {
        throw new Exception('今日AI抠图次数已用完，请明日再试或输入兑换码增加次数');
    }

    // 提取 base64 数据
    $base64Data = preg_replace('#^data:image/\w+;base64,#i', '', $originalImage);
    if (!$base64Data || strlen($base64Data) < 100) {
        throw new Exception('无效的Base64图片数据');
    }

    // 1. 获取 OSS STS Token
    $startTime = microtime(true);
    $ossToken = getOssStsToken();
    writeLog('INFO', '获取 OSS STS Token 成功');

    // 2. 上传图片到阿里云临时 OSS
    $ossUrl = uploadToOss($ossToken, $base64Data);
    writeLog('INFO', '上传 OSS 成功', ['oss_url' => $ossUrl]);

    // 3. 调用阿里云人像分割（用 OSS URL）
    $result = callAliyunSegmentBody($ossUrl);
    $processingTime = (microtime(true) - $startTime) * 1000;

    if (!$result['success']) {
        throw new Exception($result['error']);
    }

    writeLog('INFO', '阿里云API调用成功', [
        'processing_time' => round($processingTime) . 'ms'
    ]);

    // 扣减使用次数
    incrementUsage($openid, 'id-photo');
    $remainingAfter = getRemaining($openid, 'id-photo');

    jsonResponse([
        'success' => true,
        'result_image' => $result['result_image'],
        'processing_time' => round($processingTime),
        'message' => '抠图成功',
        'remaining' => $remainingAfter,
    ]);

} catch (Exception $e) {
    writeLog('ERROR', '处理失败', ['error' => $e->getMessage()]);
    jsonResponse([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], 500);
}

// ========== 阿里云 API 签名 ==========

function aliApiSign($params, $method, $secret) {
    ksort($params);
    $canonical = '';
    foreach ($params as $k => $v) {
        $canonical .= '&' . rawurlencode($k) . '=' . rawurlencode($v);
    }
    $canonical = substr($canonical, 1);
    $stringToSign = $method . '&' . rawurlencode('/') . '&' . rawurlencode($canonical);
    return base64_encode(hash_hmac('sha1', $stringToSign, $secret . '&', true));
}

function aliApiRequest($endpoint, $action, $version, $extraParams = []) {
    $accessKeyId = ALIYUN_ACCESS_KEY_ID;
    $accessKeySecret = ALIYUN_ACCESS_KEY_SECRET;

    if (strpos($accessKeyId, 'YOUR_') === 0) {
        throw new Exception('阿里云AccessKey未配置');
    }

    $params = [
        'Action' => $action,
        'Format' => 'JSON',
        'Version' => $version,
        'RegionId' => ALIYUN_REGION,
        'AccessKeyId' => $accessKeyId,
        'SignatureMethod' => 'HMAC-SHA1',
        'SignatureVersion' => '1.0',
        'SignatureNonce' => md5(uniqid(mt_rand(), true)),
        'Timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
    ];
    $params = array_merge($params, $extraParams);

    $signature = aliApiSign($params, 'POST', $accessKeySecret);
    $params['Signature'] = $signature;

    $url = 'https://' . $endpoint . '/';

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($params),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
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
    if ($httpCode !== 200) {
        $errorData = json_decode($response, true);
        $msg = $errorData['Message'] ?? ($errorData['Code'] ?? '未知错误');
        throw new Exception("阿里云API调用失败: {$msg} (HTTP {$httpCode})");
    }

    $data = json_decode($response, true);
    if (!$data) {
        throw new Exception('阿里云API响应解析失败');
    }
    return $data;
}

// ========== 获取 OSS STS Token ==========

function getOssStsToken() {
    writeLog('INFO', '获取 OSS STS Token');
    $data = aliApiRequest('viapiutils.cn-shanghai.aliyuncs.com', 'GetOssStsToken', '2020-04-01');

    if (!isset($data['Data'])) {
        throw new Exception('获取 OSS STS Token 失败: ' . ($data['Message'] ?? '未知错误'));
    }
    return $data['Data'];
}

// ========== 上传图片到阿里云临时 OSS ==========

function uploadToOss($ossToken, $base64Data) {
    $host = 'https://viapi-customer-temp.oss-cn-shanghai.aliyuncs.com';
    $accessKeyId = ALIYUN_ACCESS_KEY_ID;
    $ossAccessKeyId = $ossToken['AccessKeyId'];
    $ossAccessKeySecret = $ossToken['AccessKeySecret'];
    $securityToken = $ossToken['SecurityToken'];

    // 生成 Policy（base64 编码）
    $expiration = gmdate('Y-m-d\TH:i:s', time() + 3600) . '.000Z';
    $policy = base64_encode(json_encode([
        'expiration' => $expiration,
        'conditions' => [
            ['eq', '$bucket', 'viapi-customer-temp'],
            ['starts-with', '$key', $accessKeyId],
        ]
    ]));

    // 签名 Policy
    $signature = base64_encode(hash_hmac('sha1', $policy, $ossAccessKeySecret, true));

    // 生成文件路径
    $key = $accessKeyId . '/' . substr(md5(uniqid(mt_rand(), true)), 0, 16) . '/segment.jpg';

    // 解码图片数据写入临时文件
    $imageData = base64_decode($base64Data);
    if (!$imageData) {
        throw new Exception('Base64 解码失败');
    }
    $tempFile = UPLOAD_DIR . 'oss_temp_' . md5(uniqid(mt_rand(), true)) . '.jpg';
    file_put_contents($tempFile, $imageData);

    writeLog('INFO', 'OSS 上传参数', [
        'key' => $key,
        'ossAccessKeyId' => $ossAccessKeyId,
        'policy_len' => strlen($policy),
    ]);

    try {
        $cfile = new CURLFile($tempFile, 'image/jpeg', 'segment.jpg');
        $fields = [
            'key' => $key,
            'policy' => $policy,
            'OSSAccessKeyId' => $ossAccessKeyId,
            'signature' => $signature,
            'x-oss-security-token' => $securityToken,
            'file' => $cfile,
        ];

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $host . '/',
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $fields,
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
            throw new Exception('OSS 上传失败: ' . $curlError);
        }

        writeLog('INFO', 'OSS 上传响应', ['http_code' => $httpCode, 'body' => substr($response, 0, 500)]);

        if ($httpCode !== 204) {
            throw new Exception("OSS 上传失败: HTTP {$httpCode}, body: " . substr($response, 0, 200));
        }

        return $host . '/' . $key;
    } finally {
        if (file_exists($tempFile)) {
            unlink($tempFile);
        }
    }
}

// ========== 调用阿里云人体分割 ==========

function callAliyunSegmentBody($imageUrl) {
    writeLog('INFO', '调用阿里云 SegmentBody', ['image_url' => $imageUrl]);

    $data = aliApiRequest('imageseg.cn-shanghai.aliyuncs.com', 'SegmentBody', '2019-12-30', [
        'ImageURL' => $imageUrl,
    ]);

    if (!isset($data['Data']['ImageURL'])) {
        $msg = $data['Message'] ?? ($data['Code'] ?? '未知错误');
        throw new Exception("阿里云 SegmentBody 失败: {$msg}");
    }

    // 下载分割结果图片
    $resultImageUrl = $data['Data']['ImageURL'];
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $resultImageUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_FOLLOWLOCATION => true,
    ]);
    $imageData = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError || !$imageData || $httpCode !== 200) {
        throw new Exception('下载分割结果图片失败: ' . ($curlError ?: "HTTP {$httpCode}"));
    }

    return [
        'success' => true,
        'result_image' => 'data:image/png;base64,' . base64_encode($imageData),
    ];
}
?>
