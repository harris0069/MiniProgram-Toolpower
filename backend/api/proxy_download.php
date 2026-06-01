<?php
/**
 * 视频下载代理 - 绕过微信 downloadFile 域名白名单限制
 * 前端 wx.downloadFile → 本代理 → curl 流式转发抖音 CDN 视频
 */

require_once __DIR__ . '/../config.php';

$url = trim($_GET['url'] ?? '');

// 所有校验必须先于 header() 输出，否则 jsonResponse 无法设置 Content-Type
if (empty($url)) {
    jsonResponse(['success' => false, 'message' => '缺少 url 参数'], 400);
}

$host = parse_url($url, PHP_URL_HOST);
if (!$host) {
    jsonResponse(['success' => false, 'message' => '无效的 URL'], 400);
}

// 只允许代理视频类 URL（防止被滥用为开放代理）
$allowedHosts = ['douyin.com', 'douyincdn.com', 'douyinpic.com', 'snssdk.com', 'toutiaoimg.com', 'toutiaostatic.com'];
$allowed = false;
foreach ($allowedHosts as $h) {
    if (stripos($host, $h) !== false) { $allowed = true; break; }
}
if (!$allowed) {
    jsonResponse(['success' => false, 'message' => '不支持的来源域名'], 403);
}

if (!function_exists('curl_init')) {
    jsonResponse(['success' => false, 'message' => '服务器缺少 CURL 扩展'], 500);
}

// 流式转发，不缓冲全部内容到内存
header('Content-Type: video/mp4');
header('Access-Control-Allow-Origin: *');
// 禁用 Nginx 缓冲，确保流式传输
header('X-Accel-Buffering: no');

$ch = curl_init();
$fp = fopen('php://output', 'wb');

curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_FILE => $fp,
    CURLOPT_TIMEOUT => 120,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
    CURLOPT_BUFFERSIZE => 262144,
    CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    CURLOPT_REFERER => 'https://www.douyin.com/',
]);

curl_exec($ch);

$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);

fclose($fp);
curl_close($ch);

if ($error) {
    writeLog('ERROR', '代理下载失败', ['url' => substr($url, 0, 80), 'http_code' => $httpCode, 'error' => $error]);
} else {
    writeLog('INFO', '代理下载完成', ['url' => substr($url, 0, 80), 'http_code' => $httpCode]);
}
