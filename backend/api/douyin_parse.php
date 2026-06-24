<?php
/**
 * 抖音视频解析API - 生产环境版本
 * 部署到: xcx.huangyiling.top/api/douyin_parse.php
 */

// 错误报告设置
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// 设置响应头
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// 处理OPTIONS预检请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 健康检查接口
if (isset($_GET['health'])) {
    jsonResponse([
        'status' => 'ok',
        'timestamp' => date('Y-m-d H:i:s'),
        'version' => '1.0.0',
        'php_version' => PHP_VERSION
    ]);
}

// 只允许POST请求
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => '仅支持POST请求'], 405);
}

require_once __DIR__ . '/usage_helper.php';

// 获取输入参数
$input = json_decode(file_get_contents('php://input'), true);
$url = trim($input['url'] ?? '');
$openid = trim($input['openid'] ?? '');

// 记录请求日志
writeLog('INFO', '收到解析请求', ['url' => substr($url, 0, 50) . '...', 'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown']);

// 验证输入
if (empty($url)) {
    jsonResponse(['success' => false, 'message' => '请提供视频链接'], 400);
}

// 验证是否为抖音链接
if (!preg_match('/douyin\.com|v\.douyin\.com/i', $url)) {
    jsonResponse(['success' => false, 'message' => '仅支持抖音链接'], 400);
}

// 检查功能开关
$configPath = __DIR__ . '/../config/usage_config.json';
if (file_exists($configPath)) {
    $cfg = json_decode(file_get_contents($configPath), true);
    $tc = $cfg['link_parse'] ?? null;
    if ($tc && isset($tc['feature_enabled']) && !$tc['feature_enabled']) {
        $msg = $tc['feature_message'] ?: '功能暂不可用';
        jsonResponse(['success' => false, 'message' => $msg], 403);
    }
}

// 使用次数检查
if ($openid) {
    $remaining = getRemaining($openid, 'link_parse');
    if ($remaining <= 0) {
        writeLog('WARNING', '使用次数不足', ['openid' => $openid]);
        jsonResponse([
            'success' => false,
            'message' => '今日解析次数已用完，请明日再试或输入兑换码增加次数',
            'code' => 'limit_exceeded'
        ], 403);
    }
}

try {
    // 调用解析服务
    $result = parseDouyinVideo($url);
    
    // 记录使用次数
    if ($openid) {
        incrementUsage($openid, 'link_parse');
    }
    
    // 记录成功日志
    writeLog('INFO', '解析成功', ['has_urls' => !empty($result['urls'])]);
    
    jsonResponse($result);
} catch (Throwable $e) {
    // 记录错误日志
    $errorMsg = '解析失败: ' . $e->getMessage();
    writeLog('ERROR', $errorMsg);
    
    jsonResponse(['success' => false, 'message' => $errorMsg], 500);
}

/**
 * 解析抖音视频
 */
function parseDouyinVideo($url) {
    // 方法1: 尝试使用免费的第三方API
    try {
        $result = callThirdPartyAPI($url);
        if ($result['success']) {
            return $result;
        }
    } catch (Exception $e) {
        writeLog('ERROR', '自部署解析服务失败', ['error' => $e->getMessage()]);
    }
    
    throw new Exception('解析失败，请稍后重试');
}

/**
 * 调用第三方API
 */
function callThirdPartyAPI($url) {
    if (!function_exists('curl_init')) {
        throw new Exception('服务器缺少 PHP CURL 扩展，无法调用远程 API');
    }
    // 仅使用自部署解析服务
    $apiList = [
        [
            'url' => 'http://localhost:8088/api/hybrid/video_data',
            'method' => 'GET',
            'data' => ['url' => $url, 'minimal' => false],
            'type' => 'local'
        ]
    ];
    
    foreach ($apiList as $api) {
        try {
            $result = makeApiRequest($api['url'], $api['method'], $api['data'], $api['type']);
            if ($result['success']) {
                return $result;
            }
        } catch (Exception $e) {
            writeLog('WARNING', 'API失败', ['api' => $api['url'], 'error' => $e->getMessage()]);
            continue;
        }
    }
    
    throw new Exception('自部署解析服务不可用');
}

/**
 * 发起API请求
 */
function makeApiRequest($apiUrl, $method, $data, $apiType = '') {
    $ch = curl_init();
    
    if ($method === 'POST') {
        $postData = json_encode($data);
        curl_setopt_array($ch, [
            CURLOPT_URL => $apiUrl,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $postData,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            ]
        ]);
    } else {
        $queryString = http_build_query($data);
        curl_setopt_array($ch, [
            CURLOPT_URL => $apiUrl . '?' . $queryString,
            CURLOPT_HTTPHEADER => [
                'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            ]
        ]);
    }
    
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    // 添加调试日志
    writeLog('DEBUG', 'API响应', [
        'api' => $apiUrl,
        'http_code' => $httpCode,
        'response_length' => strlen($response),
        'error' => $error
    ]);
    
    if ($error) {
        throw new Exception('网络请求失败: ' . $error);
    }
    
    if ($httpCode !== 200) {
        // 记录非200响应的body，便于诊断
        $bodySample = mb_substr($response, 0, 500);
        writeLog('WARNING', 'API非200响应', [
            'api' => $apiUrl,
            'http_code' => $httpCode,
            'body' => $bodySample
        ]);
        // 尝试从响应体中提取API返回的错误信息
        $errData = json_decode($response, true);
        $apiMsg = '';
        if ($errData) {
            $apiMsg = $errData['message'] ?? $errData['msg'] ?? $errData['error'] ?? '';
        }
        // 将常见英文错误映射为中文提示
        $userMsg = $apiMsg;
        if ($apiMsg) {
            $keywordMap = [
                'video not found' => '视频不存在或已删除',
                'not found' => '视频不存在或已删除',
                'private' => '该视频已设为私密',
                'login' => '该视频需要登录才能查看',
                'cookie' => '服务Cookie异常，请联系管理员',
                'expire' => '服务Cookie已过期，请联系管理员',
                'rate limit' => '请求太频繁，请稍后重试',
                'block' => '该视频已被屏蔽',
                'copyright' => '该视频因版权原因不可用',
            ];
            foreach ($keywordMap as $keyword => $replacement) {
                if (stripos($apiMsg, $keyword) !== false) {
                    $userMsg = $replacement;
                    break;
                }
            }
        }
        $msg = $userMsg ?: "API调用失败，HTTP状态码: {$httpCode}";
        throw new Exception($msg);
    }
    
    $data = json_decode($response, true);
    
    if (!$data) {
        throw new Exception('API响应解析失败');
    }
    
    // 根据不同API格式进行解析
    return parseApiResponse($data, $apiUrl, $apiType);
}

/**
 * 解析不同API的响应格式
 */
function parseApiResponse($data, $apiUrl, $apiType = '') {
    // API 1: 自部署API
    if ($apiType === 'local') {
        if (isset($data['code']) && $data['code'] == 200 && isset($data['data'])) {
            return formatLocalApiResponse($data['data']);
        }
        throw new Exception('API返回错误: ' . ($data['message'] ?? '未知错误'));
    }
    
    // API 2: api.douyin.wtf 格式
    if (strpos($apiUrl, 'douyin.wtf') !== false) {
        if (isset($data['code']) && $data['code'] == 200 && isset($data['data'])) {
            return formatDouyinWtfResponse($data['data']);
        }
        throw new Exception('API返回错误: ' . ($data['message'] ?? '未知错误'));
    }
    
    // API 3: api.lolimi.cn 格式
    if (strpos($apiUrl, 'lolimi.cn') !== false) {
        if (isset($data['code']) && $data['code'] === 200) {
            return formatLolimiResponse($data);
        }
        throw new Exception('API返回错误: ' . ($data['msg'] ?? '未知错误'));
    }
    
    throw new Exception('未知的API响应格式');
}

/**
 * 格式化自部署API响应
 */
function formatLocalApiResponse($videoData) {
    $urls = [];
    
    // 从 bit_rate 数组中提取最高质量的视频（无水印）
    if (isset($videoData['video']['bit_rate']) && is_array($videoData['video']['bit_rate'])) {
        foreach ($videoData['video']['bit_rate'] as $bitrate) {
            $gearName = $bitrate['gear_name'] ?? '';
            $playUrl = $bitrate['play_addr']['url_list'][0] ?? '';
            
            if ($playUrl) {
                if (strpos($gearName, '4k') !== false || strpos($gearName, '4_1') !== false) {
                    $urls['超清'] = $playUrl;
                } elseif (strpos($gearName, '1080') !== false && !isset($urls['高清'])) {
                    $urls['高清'] = $playUrl;
                } elseif (strpos($gearName, '720') !== false && !isset($urls['标清'])) {
                    $urls['标清'] = $playUrl;
                }
            }
        }
    }
    
    // 若 bit_rate 无数据，使用 play_addr
    if (empty($urls) && isset($videoData['video']['play_addr']['url_list'])) {
        $urlList = $videoData['video']['play_addr']['url_list'];
        if (count($urlList) > 0) {
            $urls['高清'] = $urlList[0];
        }
    }
    
    if (empty($urls)) {
        throw new Exception('未找到可用的视频下载链接');
    }
    
    // 获取作者头像作为封面（video.cover 比 origin_cover 更快加载）
    $cover = $videoData['video']['cover']['url_list'][0] ?? 
             $videoData['video']['origin_cover']['url_list'][0] ?? '';
    
    return [
        'success' => true,
        'source' => 'localhost:8088',
        'title' => $videoData['desc'] ?? '未知标题',
        'author' => $videoData['author']['nickname'] ?? '未知作者',
        'cover' => $cover,
        'urls' => $urls
    ];
}

/**
 * 格式化 douyin.wtf API响应
 */
function formatDouyinWtfResponse($videoData) {
    $urls = [];
    
    // 从 bit_rate 数组中提取不同质量的视频
    if (isset($videoData['video']['bit_rate']) && is_array($videoData['video']['bit_rate'])) {
        foreach ($videoData['video']['bit_rate'] as $bitrate) {
            $gearName = $bitrate['gear_name'] ?? '';
            $playUrl = $bitrate['play_addr']['url_list'][0] ?? '';
            
            if ($playUrl) {
                // 根据 gear_name 映射到中文质量标签
                if (strpos($gearName, '1080') !== false) {
                    $urls['超清'] = $playUrl;
                } elseif (strpos($gearName, '720') !== false) {
                    $urls['高清'] = $playUrl;
                } elseif (strpos($gearName, '540') !== false) {
                    $urls['标清'] = $playUrl;
                }
            }
        }
    }
    
    // 如果 bit_rate 没有数据，使用 play_addr
    if (empty($urls) && isset($videoData['video']['play_addr']['url_list'])) {
        $urlList = $videoData['video']['play_addr']['url_list'];
        if (count($urlList) > 0) {
            $urls['高清'] = $urlList[0];
        }
    }
    
    // 确保至少有一个下载链接
    if (empty($urls)) {
        throw new Exception('未找到可用的视频下载链接');
    }
    
    return [
        'success' => true,
        'title' => $videoData['desc'] ?? '未知标题',
        'author' => $videoData['author']['nickname'] ?? '未知作者',
        'cover' => $videoData['video']['cover']['url_list'][0] ?? '',
        'urls' => $urls
    ];
}

/**
 * 格式化 lolimi API响应
 */
function formatLolimiResponse($data) {
    $urls = [];
    if (isset($data['video_url'])) {
        $urls['高清'] = $data['video_url'];
    }
    if (isset($data['video_url_hd'])) {
        $urls['超清'] = $data['video_url_hd'];
    }
    
    return [
        'success' => true,
        'title' => $data['title'] ?? '未知标题',
        'author' => $data['author'] ?? '未知作者',
        'cover' => $data['cover'] ?? '',
        'urls' => $urls
    ];
}

?>