<?php

// 阿里云配置
define('ALIYUN_ACCESS_KEY_ID', 'YOUR_ALIYUN_ACCESS_KEY_ID');
define('ALIYUN_ACCESS_KEY_SECRET', 'YOUR_ALIYUN_ACCESS_KEY_SECRET');
define('ALIYUN_REGION', 'cn-shanghai');

// 服务器公网地址（用于阿里云API回调下载临时图片）
define('SERVER_PUBLIC_URL', 'https://yourdomain.com');

// 文件上传配置
define('UPLOAD_DIR', __DIR__ . '/uploads/');
define('MAX_FILE_SIZE', 5 * 1024 * 1024);

// 日志配置
define('LOG_DIR', __DIR__ . '/logs/');
define('LOG_LEVEL', 'INFO');

if (!is_dir(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0755, true);
}
if (!is_dir(LOG_DIR)) {
    mkdir(LOG_DIR, 0755, true);
}

function writeLog($level, $message, $context = []) {
    if (!in_array($level, ['DEBUG', 'INFO', 'WARNING', 'ERROR'])) {
        return;
    }
    $logFile = LOG_DIR . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    $contextStr = $context ? ' ' . json_encode($context, JSON_UNESCAPED_UNICODE) : '';
    file_put_contents($logFile, "[{$timestamp}] [{$level}] {$message}{$contextStr}" . PHP_EOL, FILE_APPEND | LOCK_EX);
}

function jsonResponse($data, $httpCode = 200) {
    http_response_code($httpCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function validateRequired($data, $requiredFields) {
    $missing = [];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || $data[$field] === '' || $data[$field] === null) {
            $missing[] = $field;
        }
    }
    if (!empty($missing)) {
        throw new Exception('缺少必需参数: ' . implode(', ', $missing));
    }
}