<?php
// Receives JSON: {image:base64, strokes:[{size, points:[{x,y}]}], natural_w, natural_h, img_w, img_h}
// Generates mask from strokes using GD, forwards to Docker OpenCV

require_once __DIR__ . '/../config.php';

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['image']) || empty($input['strokes'])) {
    jsonResponse(['success' => false, 'message' => '缺少图片或笔触数据'], 400);
}

// 检查功能开关
$configPath = __DIR__ . '/../config/usage_config.json';
if (file_exists($configPath)) {
    $config = json_decode(file_get_contents($configPath), true);
    $toolConfig = $config['watermark-eraser'] ?? null;
    if ($toolConfig && isset($toolConfig['feature_enabled']) && !$toolConfig['feature_enabled']) {
        $msg = $toolConfig['feature_message'] ?: '功能暂不可用';
        jsonResponse(['success' => false, 'message' => $msg], 403);
    }
}

$imgB64  = $input['image'];
$strokes = $input['strokes'];
$natW    = (int)($input['natural_w'] ?? 0);
$natH    = (int)($input['natural_h'] ?? 0);
$imgW    = (int)($input['img_w'] ?? 0);
$imgH    = (int)($input['img_h'] ?? 0);

$imgBin = base64_decode($imgB64, true);
if ($imgBin === false) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => '图片数据解码失败']);
    exit;
}

if (strlen($imgBin) > 15 * 1024 * 1024) {
    http_response_code(413);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => '文件过大']);
    exit;
}

// Save image temp file
$imgTmp = tempnam(__DIR__ . '/../data', 'wm_img_');
file_put_contents($imgTmp, $imgBin);

// Generate mask from strokes using GD
$maskTmp = tempnam(__DIR__ . '/../data', 'wm_msk_');
if ($imgW > 0 && $imgH > 0 && function_exists('imagecreatetruecolor')) {
    $mask = imagecreatetruecolor($imgW, $imgH);
    $black = imagecolorallocate($mask, 0, 0, 0);
    $white = imagecolorallocate($mask, 255, 255, 255);
    imagefill($mask, 0, 0, $black);

    foreach ($strokes as $seg) {
        $size = max(1, (int)($seg['size'] ?? 1));
        $points = $seg['points'] ?? [];
        $cnt = count($points);

        imagesetthickness($mask, $size);
        for ($i = 1; $i < $cnt; $i++) {
            imageline($mask,
                (int)$points[$i-1]['x'], (int)$points[$i-1]['y'],
                (int)$points[$i]['x'], (int)$points[$i]['y'],
                $white);
        }

        imagesetthickness($mask, 1);
        for ($i = 0; $i < $cnt; $i++) {
            imagefilledellipse($mask,
                (int)$points[$i]['x'], (int)$points[$i]['y'],
                $size, $size,
                $white);
        }
    }

    imagepng($mask, $maskTmp);
    imagedestroy($mask);
} else {
    // Fallback: 1x1 black mask (no removal)
    $mask = imagecreatetruecolor(1, 1);
    imagefill($mask, 0, 0, imagecolorallocate($mask, 0, 0, 0));
    imagepng($mask, $maskTmp);
    imagedestroy($mask);
}

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

header('Content-Type: image/png');
echo $result;
