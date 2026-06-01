<?php

require_once __DIR__ . '/../config.php';

define('DAILY_LIMIT', 3);
define('DAILY_LIMIT_LINK_PARSE', 10);
define('BONUS_PER_CODE', 10);
define('USAGE_DIR', __DIR__ . '/../data/');

if (!is_dir(USAGE_DIR)) {
    mkdir(USAGE_DIR, 0755, true);
}

function getUsageFilePath($tool = '') {
    $suffix = $tool ? '_' . $tool : '';
    return USAGE_DIR . 'usage' . $suffix . '_' . date('Y-m-d') . '.json';
}

function getUsageData($openid, $tool = '') {
    $file = getUsageFilePath($tool);
    $data = [];
    if (file_exists($file)) {
        $fh = fopen($file, 'r');
        if ($fh && flock($fh, LOCK_SH)) {
            $content = file_get_contents($file);
            $data = json_decode($content, true) ?: [];
            flock($fh, LOCK_UN);
        }
        if ($fh) fclose($fh);
    }
    return $data[$openid] ?? ['used' => 0, 'bonus' => 0];
}

function saveUsageData($openid, $usage, $tool = '') {
    $file = getUsageFilePath($tool);
    $data = [];
    if (file_exists($file)) {
        $content = file_get_contents($file);
        $data = json_decode($content, true) ?: [];
    }
    $data[$openid] = $usage;
    $fh = fopen($file, 'c');
    if ($fh && flock($fh, LOCK_EX)) {
        ftruncate($fh, 0);
        fwrite($fh, json_encode($data, JSON_PRETTY_PRINT));
        flock($fh, LOCK_UN);
    }
    if ($fh) fclose($fh);
}

function getRemaining($openid, $tool = '') {
    $usage = getUsageData($openid, $tool);
    $limit = $tool === 'link_parse' ? DAILY_LIMIT_LINK_PARSE : DAILY_LIMIT;
    $totalLimit = $limit + ($usage['bonus'] ?? 0);
    $remaining = $totalLimit - ($usage['used'] ?? 0);
    return max(0, $remaining);
}

function incrementUsage($openid, $tool = '') {
    $usage = getUsageData($openid, $tool);
    $usage['used'] = ($usage['used'] ?? 0) + 1;
    $usage['bonus'] = $usage['bonus'] ?? 0;
    saveUsageData($openid, $usage, $tool);
}

function addBonus($openid, $count, $tool = '') {
    $usage = getUsageData($openid, $tool);
    $usage['bonus'] = ($usage['bonus'] ?? 0) + $count;
    $usage['used'] = $usage['used'] ?? 0;
    saveUsageData($openid, $usage, $tool);
}
