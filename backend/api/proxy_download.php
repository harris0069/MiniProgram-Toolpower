<?php
/**
 * 视频下载代理 - 绕过微信 downloadFile 域名白名单限制
 * 前端 wx.downloadFile → 本代理 → curl 流式转发抖音 CDN 视频
 */

require_once __DIR__ . '/../config.php';
set_time_limit(0);

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
$allowedPatterns = ['douyin', 'snssdk', 'toutiao', 'douyincdn', 'douyinpic', 'pstatp', 'ixigua', 'zjcdn'];
$allowed = false;
foreach ($allowedPatterns as $p) {
    if (stripos($host, $p) !== false) { $allowed = true; break; }
}
if (!$allowed) {
    writeLog('WARNING', '代理请求被白名单拒绝', ['host' => $host, 'url' => substr($url, 0, 100)]);
    jsonResponse(['success' => false, 'message' => '不支持的来源域名'], 403);
}

if (!function_exists('curl_init')) {
    jsonResponse(['success' => false, 'message' => '服务器缺少 CURL 扩展'], 500);
}

$ch = curl_init();
$tmpFile = tmpfile();

curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_FILE => $tmpFile,
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

curl_close($ch);

if ($httpCode !== 200 || $error) {
    fclose($tmpFile);
    writeLog('ERROR', '代理下载失败', ['url' => substr($url, 0, 80), 'http_code' => $httpCode, 'error' => $error]);
    jsonResponse(['success' => false, 'message' => '视频源不可用'], 502);
}

writeLog('INFO', '代理下载完成', ['url' => substr($url, 0, 80), 'http_code' => $httpCode]);

rewind($tmpFile);
$stat = fstat($tmpFile);
header('Content-Type: video/mp4');
header('Content-Length: ' . $stat['size']);
header('Access-Control-Allow-Origin: *');
header('X-Accel-Buffering: no');
while (!feof($tmpFile)) {
    echo fread($tmpFile, 1048576);
    ob_flush();
    flush();
}
fclose($tmpFile);
