<?php
require_once __DIR__ . '/../config.php';
define('VERSION', '2.1.0');

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !isset($input['type'])) {
  echo json_encode(['pass' => true, '_v' => VERSION]);
  exit;
}

$type = $input['type'];

if ($type === 'login') {
  $openid = code2session($input['code'] ?? '');
  echo json_encode(['openid' => $openid ?: '', '_v' => VERSION]);
  exit;
}

$token = getAccessToken();
if (!$token) {
  echo json_encode(['pass' => true, '_v' => VERSION]);
  exit;
}

if ($type === 'text') {
  $result = checkText($token, $input['content'] ?? '', $input['openid'] ?? '');
} elseif ($type === 'image') {
  $result = checkImage($token, $input['image'] ?? '');
} elseif ($type === 'image_upload') {
  $filePath = $_FILES['image']['tmp_name'] ?? '';
  $result = $filePath && file_exists($filePath) ? checkImageFile($token, $filePath) : ['pass' => false, 'errMsg' => '内容包含违规信息'];
} else {
  $result = ['pass' => true];
}

$result['_v'] = VERSION;
echo json_encode($result);

function getAccessToken() {
  $url = "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=" . APPID . "&secret=" . APPSECRET;
  $resp = httpGet($url);
  if (!$resp) return null;
  $data = json_decode($resp, true);
  return $data['access_token'] ?? null;
}

function code2session($code) {
  if (!$code) return null;
  $url = "https://api.weixin.qq.com/sns/jscode2session?appid=" . APPID . "&secret=" . APPSECRET . "&js_code=" . urlencode($code) . "&grant_type=authorization_code";
  $resp = httpGet($url);
  if (!$resp) return null;
  $data = json_decode($resp, true);
  return $data['openid'] ?? null;
}

function checkText($token, $content, $openid) {
  $url = "https://api.weixin.qq.com/wxa/msg_sec_check?access_token=" . $token;
  $body = json_encode([
    'content' => $content,
    'version' => 2,
    'scene' => 2,
    'openid' => $openid,
  ]);
  $resp = httpPost($url, $body);
  if (!$resp) return ['pass' => true];
  $data = json_decode($resp, true);
  if (!$data) return ['pass' => true];
  if (isset($data['errcode']) && $data['errcode'] !== 0) {
    return ['pass' => false, 'errMsg' => '内容包含违规信息'];
  }
  if (($data['result']['suggest'] ?? 'pass') === 'risky') {
    return ['pass' => false, 'errMsg' => '内容包含违规信息'];
  }
  if (($data['errcode'] ?? 0) === 87014) {
    return ['pass' => false, 'errMsg' => '内容包含违规信息'];
  }
  return ['pass' => true];
}

function checkImage($token, $base64) {
  $raw = base64_decode($base64, true);
  if ($raw === false || strlen($raw) > 10 * 1024 * 1024) {
    return ['pass' => false, 'errMsg' => '内容包含违规信息'];
  }
  $tmp = tempnam(sys_get_temp_dir(), 'sec_');
  file_put_contents($tmp, $raw);
  $url = "https://api.weixin.qq.com/wxa/img_sec_check?access_token=" . $token;
  $resp = httpPostFile($url, $tmp);
  @unlink($tmp);
  if (!$resp) return ['pass' => true];
  $data = json_decode($resp, true);
  return ['pass' => !isset($data['errcode']) || $data['errcode'] !== 87014];
}

function checkImageFile($token, $filePath) {
  $url = "https://api.weixin.qq.com/wxa/img_sec_check?access_token=" . $token;
  $resp = httpPostFile($url, $filePath);
  if (!$resp) return ['pass' => true];
  $data = json_decode($resp, true);
  return ['pass' => !isset($data['errcode']) || $data['errcode'] !== 87014];
}

function httpGet($url) {
  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT => 10,
      CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $res = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);
    return $err ? false : $res;
  }
  return @file_get_contents($url);
}

function httpPost($url, $postData) {
  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_POST => true,
      CURLOPT_POSTFIELDS => $postData,
      CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT => 10,
      CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $res = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);
    return $err ? false : $res;
  }
  $opts = ['http' => [
    'method' => 'POST',
    'header' => 'Content-Type: application/json',
    'content' => $postData,
    'timeout' => 10,
  ]];
  return @file_get_contents($url, false, stream_context_create($opts));
}

function httpPostFile($url, $filePath) {
  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_POST => true,
      CURLOPT_POSTFIELDS => ['media' => new CURLFile($filePath)],
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT => 10,
      CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $res = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);
    return $err ? false : $res;
  }
  return false;
}
