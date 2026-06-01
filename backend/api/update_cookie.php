<?php
header('Content-Type: text/html; charset=utf-8');

$message = '';
$success = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = trim($_POST['cookies'] ?? '');
    if (!$raw) {
        $message = '请粘贴 Cookie 内容';
        $success = false;
    } else {
        $pairs = [];
        foreach (explode("\n", $raw) as $line) {
            $line = trim($line);
            if ($line === '' || stripos($line, '名称') !== false || stripos($line, 'Name') !== false) continue;
            $parts = explode("\t", $line);
            if (count($parts) >= 2) {
                $name = trim($parts[0]);
                $value = trim($parts[1]);
                if ($name !== '') {
                    $pairs[] = $name . '=' . $value;
                }
            }
        }
        if (empty($pairs)) {
            $message = '未识别到有效的 Cookie 条目，请确认格式是否正确';
            $success = false;
        } else {
            $cookieStr = implode('; ', $pairs);
            $payload = json_encode(['service' => 'douyin', 'cookie' => $cookieStr]);
            $ch = curl_init('http://localhost:8088/api/hybrid/update_cookie');
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $payload,
                CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 10,
            ]);
            $resp = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);
            if ($error) {
                $message = '请求失败：' . $error;
                $success = false;
            } elseif ($httpCode !== 200) {
                $message = 'API 返回 HTTP ' . $httpCode . '：' . $resp;
                $success = false;
            } else {
                $data = json_decode($resp, true);
                if ($data && ($data['code'] ?? 0) === 200) {
                    $message = 'Cookie 更新成功！共解析 ' . count($pairs) . ' 个字段';
                    $success = true;
                } else {
                    $message = 'API 返回错误：' . ($data['message'] ?? $resp);
                    $success = false;
                }
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>更新抖音 Cookie</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: -apple-system, 'Segoe UI', sans-serif; background: #f5f5f5; display:flex; justify-content:center; align-items:center; min-height:100vh; }
.card { background:#fff; border-radius:12px; padding:32px; width:90%; max-width:640px; box-shadow:0 2px 12px rgba(0,0,0,.08); }
h1 { font-size:20px; margin-bottom:8px; }
p.desc { color:#666; font-size:14px; margin-bottom:20px; line-height:1.6; }
textarea { width:100%; height:240px; border:1px solid #ddd; border-radius:8px; padding:12px; font-size:13px; font-family:monospace; resize:vertical; outline:none; }
textarea:focus { border-color:#07c; }
.btn { margin-top:16px; width:100%; padding:12px; background:#07c; color:#fff; border:none; border-radius:8px; font-size:16px; cursor:pointer; }
.btn:hover { background:#069; }
.btn:disabled { opacity:.5; cursor:not-allowed; }
.msg { margin-top:16px; padding:12px 16px; border-radius:8px; font-size:14px; }
.msg.ok { background:#e8f5e9; color:#2e7d32; border:1px solid #c8e6c9; }
.msg.err { background:#fbe9e7; color:#c62828; border:1px solid #ffccbc; }
.msg pre { margin-top:8px; font-size:12px; white-space:pre-wrap; word-break:break-all; }
code { background:#f0f0f0; padding:2px 6px; border-radius:4px; font-size:13px; }
</style>
</head>
<body>
<div class="card">
<h1>更新抖音 Cookie</h1>
<p class="desc">
从浏览器开发者工具 → Application → Cookies → douyin.com，全选复制后粘贴到下面。<br>
支持表格格式（Tab 分隔）或 <code>key=value; key=value</code> 格式。
</p>
<?php if ($message): ?>
<div class="msg <?= $success ? 'ok' : 'err' ?>"><?= htmlspecialchars($message) ?></div>
<?php endif; ?>
<form method="post">
<textarea name="cookies" placeholder="在此粘贴 Cookie 内容..."><?= htmlspecialchars($_POST['cookies'] ?? '') ?></textarea>
<button class="btn" type="submit">更新 Cookie</button>
</form>
</div>
</body>
</html>
