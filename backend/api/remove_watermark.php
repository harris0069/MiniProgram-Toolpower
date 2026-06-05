<?php
// accept_json(): POST with JSON body {image: base64, mask: base64, natural_w, natural_h}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['image']) || empty($input['mask'])) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => '缺少图片或蒙版']);
    exit;
}

$imgB64  = $input['image'];
$maskB64 = $input['mask'];
$natW    = (int)($input['natural_w'] ?? 0);
$natH    = (int)($input['natural_h'] ?? 0);

$imgBin = base64_decode($imgB64, true);
$maskBin = base64_decode($maskB64, true);
if ($imgBin === false || $maskBin === false) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => '数据解码失败']);
    exit;
}

if (strlen($imgBin) > 15 * 1024 * 1024) {
    http_response_code(413);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => '文件过大']);
    exit;
}

// Save temp files
$imgTmp  = tempnam(__DIR__ . '/../data', 'wm_img_');
$maskTmp = tempnam(__DIR__ . '/../data', 'wm_msk_');
file_put_contents($imgTmp, $imgBin);
file_put_contents($maskTmp, $maskBin);

// Forward to Docker OpenCV
$ch = curl_init('http://127.0.0.1:8009/inpaint');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 120,
    CURLOPT_POSTFIELDS     => [
        'image' => new CURLFile($imgTmp, 'image/jpeg', 'image'),
        'mask'  => new CURLFile($maskTmp, 'image/png', 'mask.png'),
    ],
]);

$result = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);
unlink($imgTmp);
unlink($maskTmp);

if ($error) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => '后端服务异常: ' . $error]);
    exit;
}

if ($httpCode !== 200) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => '后端处理失败']);
    exit;
}

// Return raw PNG (status 200)
header('Content-Type: image/png');
echo $result;
