<?php
session_start();
require_once __DIR__ . '/../../config.php';

$configFile = __DIR__ . '/config.json';
$adminConfig = [];
if (file_exists($configFile)) {
    $adminConfig = json_decode(file_get_contents($configFile), true) ?: [];
}

$username = $adminConfig['username'] ?? 'admin';
$passwordHash = $adminConfig['password_hash'] ?? '';

// 处理登录
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['login'])) {
    $user = trim($_POST['username'] ?? '');
    $pass = $_POST['password'] ?? '';
    if ($user === $username && password_verify($pass, $passwordHash)) {
        $_SESSION['admin_logged_in'] = true;
        header('Location: index.php');
        exit;
    }
    $loginError = '用户名或密码错误';
}

// 处理退出
if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: index.php');
    exit;
}

$isLoggedIn = $_SESSION['admin_logged_in'] ?? false;
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ToolPower 管理后台</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: -apple-system, 'Segoe UI', sans-serif; background:#f5f5f5; color:#333; }
.header { background:#fff; padding:16px 24px; border-bottom:1px solid #e0e0e0; display:flex; justify-content:space-between; align-items:center; }
.header h1 { font-size:18px; }
.header a { color:#999; text-decoration:none; font-size:14px; }
.header a:hover { color:#333; }

.login-box { max-width:400px; margin:100px auto; background:#fff; border-radius:12px; padding:32px; box-shadow:0 2px 12px rgba(0,0,0,.08); }
.login-box h2 { margin-bottom:20px; font-size:18px; }
.login-box input { width:100%; padding:10px 12px; border:1px solid #ddd; border-radius:6px; font-size:14px; margin-bottom:12px; outline:none; }
.login-box input:focus { border-color:#07c; }
.login-box button { width:100%; padding:10px; background:#07c; color:#fff; border:none; border-radius:6px; font-size:15px; cursor:pointer; }
.login-box button:hover { background:#069; }
.login-error { color:#c62828; font-size:13px; margin-bottom:12px; }

.container { max-width:960px; margin:24px auto; padding:0 16px; }
.tabs { display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap; }
.tab { padding:8px 16px; background:#fff; border:1px solid #ddd; border-radius:6px; cursor:pointer; font-size:14px; }
.tab.active { background:#07c; color:#fff; border-color:#07c; }
.panel { display:none; background:#fff; border-radius:12px; padding:24px; box-shadow:0 1px 6px rgba(0,0,0,.06); }
.panel.active { display:block; }

.form-row { display:flex; gap:12px; margin-bottom:12px; align-items:center; flex-wrap:wrap; }
.form-row label { font-size:14px; min-width:60px; }
.form-row input, .form-row select, .form-row textarea { padding:8px 10px; border:1px solid #ddd; border-radius:6px; font-size:14px; outline:none; }
.form-row input:focus, .form-row select:focus, .form-row textarea:focus { border-color:#07c; }
.btn { padding:8px 16px; border:none; border-radius:6px; cursor:pointer; font-size:14px; }
.btn-primary { background:#07c; color:#fff; }
.btn-primary:hover { background:#069; }
.btn-danger { background:#c62828; color:#fff; }
.btn-danger:hover { background:#b71c1c; }
.btn-sm { padding:4px 10px; font-size:12px; }
.btn-ghost { background:transparent; border:1px solid #ddd; color:#666; }
.btn-ghost:hover { background:#f5f5f5; }

table { width:100%; border-collapse:collapse; font-size:14px; }
th, td { padding:10px 12px; text-align:left; border-bottom:1px solid #f0f0f0; }
th { font-weight:600; color:#666; font-size:13px; }
tr:hover { background:#fafafa; }

.stats-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:12px; margin-bottom:20px; }
.stat-card { background:#f8f9fa; border-radius:8px; padding:16px; }
.stat-card .label { font-size:12px; color:#999; }
.stat-card .value { font-size:24px; font-weight:600; margin-top:4px; }

.toast { position:fixed; top:20px; right:20px; padding:12px 20px; border-radius:8px; font-size:14px; z-index:9999; transition: opacity 0.3s; }
.toast.ok { background:#e8f5e9; color:#2e7d32; border:1px solid #c8e6c9; }
.toast.err { background:#fbe9e7; color:#c62828; border:1px solid #ffccbc; }

.tag { display:inline-block; padding:2px 8px; border-radius:4px; font-size:12px; }
.tag-green { background:#e8f5e9; color:#2e7d32; }
.tag-red { background:#fbe9e7; color:#c62828; }
.tag-blue { background:#e3f2fd; color:#1565c0; }

textarea.cookie-input { width:100%; height:200px; border:1px solid #ddd; border-radius:8px; padding:12px; font-size:13px; font-family:monospace; resize:vertical; outline:none; }
textarea.cookie-input:focus { border-color:#07c; }
.code-text { font-family: 'SF Mono', 'Consolas', monospace; letter-spacing: 1px; font-weight: 500; }
.copy-btn { cursor:pointer; padding:2px 6px; }

@media (max-width: 640px) {
  .login-box { margin: 60px auto; padding: 24px; }
  .btn { padding: 12px 20px; font-size: 15px; }
  .btn-sm { padding: 8px 14px; font-size: 13px; }
  .tab { padding: 10px 14px; font-size: 14px; }
  table { display: block; overflow-x: auto; white-space: nowrap; }
  .form-row input, .form-row select { padding: 12px; font-size: 16px; }
  .panel { padding: 16px; }
  .container { padding: 0 12px; margin: 12px auto; }
  .header { padding: 12px 16px; }
  .header h1 { font-size: 16px; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .stat-card { padding: 12px; }
  .stat-card .value { font-size: 20px; }
  .form-row { gap: 8px; }
  .form-row label { min-width: 50px; font-size: 14px; }
}
</style>
</head>
<body>

<?php if (!$isLoggedIn): ?>
<div class="login-box">
  <h2>ToolPower 管理后台</h2>
  <?php if (isset($loginError)): ?>
    <div class="login-error"><?= htmlspecialchars($loginError) ?></div>
  <?php endif; ?>
  <form method="post">
    <input type="hidden" name="login" value="1">
    <input type="text" name="username" placeholder="用户名" required>
    <input type="password" name="password" placeholder="密码" required>
    <button type="submit">登录</button>
  </form>
</div>

<?php else: ?>
<div class="header">
  <h1>ToolPower 管理后台</h1>
  <a href="?logout=1">退出登录</a>
</div>

<div class="container">
  <div class="tabs">
    <div class="tab active" onclick="switchTab('stats')">使用数据</div>
    <div class="tab" onclick="switchTab('codes')">兑换码管理</div>
    <div class="tab" onclick="switchTab('users')">用户权限</div>
    <div class="tab" onclick="switchTab('flags')">功能开关</div>
    <div class="tab" onclick="switchTab('templates')">模板管理</div>
    <div class="tab" onclick="switchTab('cookie')">Cookie更新</div>
  </div>

  <div id="panel-stats" class="panel active">
    <div class="form-row">
      <label>工具</label>
      <select id="stats-tool" onchange="loadStats()">
        <option value="">全部</option>
        <option value="id-photo">证件照</option>
        <option value="link_parse">链接解析</option>
        <option value="poster">一键海报</option>
      </select>
      <label>日期</label>
      <input type="date" id="stats-date" value="<?= date('Y-m-d') ?>">
      <button class="btn btn-primary" onclick="loadStats()">查询</button>
    </div>
    <div id="stats-overview" class="stats-grid"></div>
    <table id="stats-table">
      <thead><tr><th>OpenID</th><th>昵称</th><th>已用</th><th>剩余</th><th>状态</th></tr></thead>
      <tbody></tbody>
    </table>
  </div>

  <div id="panel-codes" class="panel">
    <div class="form-row">
      <label>工具</label>
      <select id="code-tool">
        <option value="id-photo">证件照</option>
        <option value="link_parse">链接解析</option>
      </select>
      <label>次数</label>
      <input type="number" id="code-count" value="10" min="1" style="width:80px">
      <label>兑换码</label>
      <input type="text" id="code-input" placeholder="留空自动生成" style="width:160px">
      <button class="btn btn-sm btn-ghost" onclick="generateCode()">🎲 生成</button>
      <button class="btn btn-primary" onclick="addCode()">添加</button>
    </div>
    <table>
      <thead><tr><th>兑换码</th><th>工具</th><th>次数</th><th>状态</th><th>有效期</th><th>使用人</th><th>操作</th></tr></thead>
      <tbody id="codes-body"></tbody>
    </table>
  </div>

  <div id="panel-users" class="panel">
    <div class="form-row">
      <input type="text" id="user-openid" placeholder="OpenID">
      <button class="btn btn-primary" onclick="loadUserPerm()">查询</button>
    </div>
    <div id="perm-tools" style="display:none; margin-bottom:16px; padding:12px; background:#f8f9fa; border-radius:8px;">
      <div style="font-size:14px; font-weight:500; margin-bottom:8px;">工具特权（勾选=无限次）：</div>
      <label style="display:inline-flex; align-items:center; gap:4px; margin-right:16px; font-size:14px;">
        <input type="checkbox" class="perm-cb" value="link_parse"> 链接解析
      </label>
      <label style="display:inline-flex; align-items:center; gap:4px; margin-right:16px; font-size:14px;">
        <input type="checkbox" class="perm-cb" value="poster"> 一键海报
      </label>
      <label style="display:inline-flex; align-items:center; gap:4px; margin-right:16px; font-size:14px;">
        <input type="checkbox" class="perm-cb" value="id-photo"> 证件照
      </label>
      <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn btn-sm btn-ghost" onclick="checkAll(true)">全选</button>
        <button class="btn btn-sm btn-ghost" onclick="checkAll(false)">取消全选</button>
        <button class="btn btn-primary" onclick="savePerm()">保存</button>
      </div>
    </div>
    <table>
      <thead><tr><th>昵称</th><th>OpenID</th><th>权限</th><th>首次活跃</th><th>最后活跃</th><th>操作</th></tr></thead>
      <tbody id="users-body"></tbody>
    </table>
  </div>

  <div id="panel-flags" class="panel">
    <table>
      <thead><tr><th>工具</th><th>状态</th><th>提示消息</th><th>操作</th></tr></thead>
      <tbody id="flags-body"></tbody>
    </table>
  </div>

  <div id="panel-templates" class="panel">
    <div style="margin-bottom:16px; padding:12px; background:#f8f9fa; border-radius:8px;" id="template-form">
      <div style="font-size:14px; font-weight:500; margin-bottom:8px;">添加/编辑模板</div>
      <input type="hidden" id="tpl-edit-id" value="">
      <div class="form-row">
        <label>ID</label>
        <input type="text" id="tpl-id" placeholder="如 dragon_boat_v1" style="width:160px">
      </div>
      <div class="form-row">
        <label>分组 entry</label>
        <input type="text" id="tpl-entry" placeholder="如 dragon_boat" style="width:140px">
        <label>分组名称</label>
        <input type="text" id="tpl-entry-name" placeholder="如 端午节" style="width:120px">
      </div>
      <div class="form-row">
        <label>模板名称</label>
        <input type="text" id="tpl-name" placeholder="如 端午安康" style="width:140px">
        <label>分类</label>
        <select id="tpl-category"><option value="节假日">节假日</option><option value="节气">节气</option></select>
        <label>等级</label>
        <select id="tpl-tier"><option value="free">免费</option><option value="premium">高级</option></select>
        <label>排序</label>
        <input type="number" id="tpl-sort" value="0" style="width:60px">
      </div>
      <div class="form-row">
        <label>背景图</label>
        <input type="file" id="tpl-bg" accept="image/jpeg,image/png" style="font-size:13px">
        <span style="font-size:12px;color:#999">≤500KB，为空则不更新</span>
      </div>
      <div class="form-row">
        <label>缩略图</label>
        <input type="file" id="tpl-thumb" accept="image/jpeg,image/png" style="font-size:13px">
        <span style="font-size:12px;color:#999">≤100KB，为空则不更新</span>
      </div>
      <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="saveTemplate()">保存模板</button>
        <button class="btn btn-sm btn-ghost" onclick="resetTemplateForm()">取消</button>
      </div>
    </div>
    <div style="margin-bottom:12px; display:flex; gap:8px; flex-wrap:wrap;">
      <button class="btn btn-sm btn-ghost filter-btn" data-cat="" onclick="filterTemplates('')" style="border-color:#07c;">全部</button>
      <button class="btn btn-sm btn-ghost filter-btn" data-cat="节假日" onclick="filterTemplates('节假日')">节假日</button>
      <button class="btn btn-sm btn-ghost filter-btn" data-cat="节气" onclick="filterTemplates('节气')">节气</button>
    </div>
    <table>
      <thead><tr><th>预览</th><th>ID</th><th>模板名称</th><th>分组</th><th>分类</th><th>等级</th><th>排序</th><th>操作</th></tr></thead>
      <tbody id="templates-body"></tbody>
    </table>
  </div>

  <div id="panel-cookie" class="panel">
    <p style="font-size:14px;color:#666;margin-bottom:12px;">从浏览器开发者工具 → Application → Cookies → douyin.com，全选复制后粘贴到下面。</p>
    <textarea id="cookie-input" class="cookie-input" placeholder="在此粘贴 Cookie 内容..."></textarea>
    <div style="margin-top:12px;">
      <button class="btn btn-primary" onclick="updateCookie()">更新 Cookie</button>
    </div>
    <div id="cookie-msg" style="margin-top:12px;display:none;"></div>
  </div>
</div>

<script>
const API = '/api/usage_control.php';

function toast(msg, type) {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2000);
}

async function apiCall(action, data = {}, baseUrl) {
  if (!baseUrl) baseUrl = API;
  try {
    const res = await fetch(baseUrl + '?action=' + action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('panel-' + name).classList.add('active');
  if (name === 'stats') loadStats();
  if (name === 'codes') loadCodes();
  if (name === 'users') loadUsers();
  if (name === 'flags') loadFlags();
  if (name === 'templates') loadTemplates();
}

async function loadStats() {
  const tool = document.getElementById('stats-tool').value;
  const date = document.getElementById('stats-date').value;
  const res = await apiCall('stats', { tool, date });
  if (!res.success) { toast(res.error, 'err'); return; }
  if (!tool) {
    const overview = res.overview || {};
    let html = '';
    for (const [t, info] of Object.entries(overview)) {
      html += '<div class="stat-card"><div class="label">' + info.name + '</div><div class="value">' + info.total_used + ' <span style="font-size:12px;color:#999">次</span></div></div>';
    }
    document.getElementById('stats-overview').innerHTML = html;
    document.querySelector('#stats-table tbody').innerHTML = '';
  } else {
    document.getElementById('stats-overview').innerHTML = '';
    const usage = res.usage || {};
    const users = await apiCall('all_users');
    const allUsers = users.users || {};
    let html = '';
    for (const [uid, info] of Object.entries(usage)) {
      const nickname = allUsers[uid]?.nickname || '未命名';
      html += '<tr><td>' + uid.substring(0, 16) + '...</td><td>' + nickname + '</td><td>' + (info.used || 0) + '</td><td>-</td><td>-</td></tr>';
    }
    document.querySelector('#stats-table tbody').innerHTML = html || '<tr><td colspan="5" style="text-align:center;color:#999">暂无数据</td></tr>';
  }
}

async function loadCodes() {
  const res = await apiCall('all_codes');
  if (!res.success) { toast(res.error, 'err'); return; }
  const codes = res.codes || {};
  let html = '';
  for (const [code, info] of Object.entries(codes)) {
    const count = info.bonus || 10;
    const active = info.active !== false;
    const expired = info.is_expired || false;
    const used = info.is_used || false;
    const tool = info.tool || '-';
    const usedBy = info.used_by || null;
    const usedAt = info.used_at || '';

    let statusHtml = '';
    if (used) statusHtml = '<span class="tag tag-red">已使用</span>';
    else if (expired) statusHtml = '<span class="tag tag-red">已过期</span>';
    else statusHtml = active ? '<span class="tag tag-green">启用</span>' : '<span class="tag tag-red">禁用</span>';

    let expiryText = '-';
    if (info.expires_at) {
      const d = new Date(info.expires_at * 1000);
      expiryText = d.toISOString().slice(0, 10);
    }

    let userText = '-';
    if (usedBy) {
      userText = (usedBy.nickname || usedBy.openid) + '<br><small>' + usedAt + '</small>';
    }

    const safeCode = code.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const canToggle = !used && !expired;
    const toggleBtn = canToggle
      ? '<button class="btn btn-sm btn-ghost" onclick="toggleCode(\'' + safeCode + '\',' + !active + ')">' + (active ? '禁用' : '启用') + '</button>'
      : '';
    const delBtn = used || expired
      ? '<button class="btn btn-sm btn-danger" onclick="deleteCode(\'' + safeCode + '\')">删除</button>'
      : '';

    html += '<tr><td><span class="code-text">' + code + '</span> <button class="btn btn-sm btn-ghost" onclick="copyCode(\'' + safeCode + '\')">📋</button></td>'
      + '<td>' + tool + '</td>'
      + '<td>' + count + '</td>'
      + '<td>' + statusHtml + '</td>'
      + '<td>' + expiryText + '</td>'
      + '<td>' + userText + '</td>'
      + '<td>' + toggleBtn + ' ' + delBtn + '</td></tr>';
  }
  document.getElementById('codes-body').innerHTML = html || '<tr><td colspan="7" style="text-align:center;color:#999">暂无兑换码</td></tr>';
}

async function addCode() {
  const code = document.getElementById('code-input').value.trim();
  const count = parseInt(document.getElementById('code-count').value) || 10;
  const tool = document.getElementById('code-tool').value;
  if (!tool) { toast('请选择工具', 'err'); return; }
  const res = await apiCall('add_code', { code, count, tool });
  if (res.success) { toast('已添加', 'ok'); document.getElementById('code-input').value = ''; loadCodes(); }
  else { toast(res.error, 'err'); }
}

function generateCode() {
  const us = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  const code = us.toString(36).toUpperCase();
  document.getElementById('code-input').value = code.slice(-8).padStart(8, '0');
}

function copyCode(code) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(() => toast('已复制', 'ok'));
  } else {
    const ta = document.createElement('textarea');
    ta.value = code;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    toast('已复制', 'ok');
  }
}

async function toggleCode(code, active) {
  const res = await apiCall('toggle_code', { code, active });
  if (res.success) { toast(res.message, 'ok'); loadCodes(); }
  else { toast(res.error, 'err'); }
}

async function deleteCode(code) {
  if (!confirm('确定删除兑换码 ' + code + ' 吗？')) return;
  const res = await apiCall('delete_code', { code });
  if (res.success) { toast('已删除', 'ok'); loadCodes(); }
  else { toast(res.error, 'err'); }
}

const toolNames = {'link_parse': '链接解析', 'poster': '一键海报', 'id-photo': '证件照'};

async function loadUsers() {
  const res = await apiCall('all_users');
  if (!res.success) { toast(res.error, 'err'); return; }
  const users = res.users || {};
  let html = '';
  for (const [uid, info] of Object.entries(users)) {
    const pt = info.privileged_tools || [];
    const oldPerm = info.permission || 'normal';
    let permHtml = '';
    if (Array.isArray(pt) && pt.length > 0) {
      if (pt.length === 3) {
        permHtml = '<span class="tag tag-blue">全局特权</span>';
      } else {
        permHtml = pt.map(function(t) { return '<span class="tag tag-blue">' + (toolNames[t] || t) + '</span>'; }).join(' ');
      }
    } else if (oldPerm === 'privilege') {
      permHtml = '<span class="tag tag-blue">全局特权</span>';
    } else {
      permHtml = '普通';
    }
    html += '<tr><td>' + (info.nickname || '未命名') + '</td><td>' + uid.substring(0, 20) + (uid.length > 20 ? '...' : '') + '</td><td>' + permHtml + '</td><td>' + (info.first_seen || '-') + '</td><td>' + (info.last_seen || '-') + '</td><td><button class="btn btn-sm btn-ghost" onclick="editUserPerm(\'' + uid.replace(/'/g, "\\'") + '\')">编辑权限</button></td></tr>';
  }
  document.getElementById('users-body').innerHTML = html || '<tr><td colspan="6" style="text-align:center;color:#999">暂无用户</td></tr>';
}

function editUserPerm(uid) {
  document.getElementById('user-openid').value = uid;
  loadUserPerm();
}

async function loadUserPerm() {
  const uid = document.getElementById('user-openid').value.trim();
  if (!uid) { toast('请输入 OpenID', 'err'); return; }
  const res = await apiCall('all_users');
  if (!res.success) { toast(res.error, 'err'); return; }
  const user = (res.users || {})[uid];
  if (!user) { toast('未找到该用户', 'err'); return; }
  const pt = user.privileged_tools || [];
  const oldPerm = user.permission || 'normal';
  document.querySelectorAll('.perm-cb').forEach(function(cb) { cb.checked = false; });
  if (Array.isArray(pt) && pt.length > 0) {
    pt.forEach(function(t) {
      var cb = document.querySelector('.perm-cb[value="' + t + '"]');
      if (cb) cb.checked = true;
    });
  } else if (oldPerm === 'privilege') {
    document.querySelectorAll('.perm-cb').forEach(function(cb) { cb.checked = true; });
  }
  document.getElementById('perm-tools').style.display = 'block';
}

function checkAll(checked) {
  document.querySelectorAll('.perm-cb').forEach(function(cb) { cb.checked = checked; });
}

async function savePerm() {
  const uid = document.getElementById('user-openid').value.trim();
  if (!uid) { toast('请输入 OpenID', 'err'); return; }
  var tools = [];
  document.querySelectorAll('.perm-cb:checked').forEach(function(cb) { tools.push(cb.value); });
  const res = await apiCall('set_permission', { target_openid: uid, privileged_tools: tools });
  if (res.success) { toast('已更新', 'ok'); loadUsers(); document.getElementById('perm-tools').style.display = 'none'; }
  else { toast(res.error, 'err'); }
}

async function loadFlags() {
  const tools = ['id-photo', 'link_parse', 'poster', 'watermark', 'watermark-eraser', 'image-compress'];
  const names = {'id-photo':'证件照','link_parse':'链接解析','poster':'一键海报','watermark':'水印工具','watermark-eraser':'水印擦除','image-compress':'图片压缩'};
  let html = '';
  for (const t of tools) {
    const res = await apiCall('flag', { tool: t });
    const enabled = res.success ? res.enabled : true;
    const msg = res.success ? (res.message || '') : '';
    html += '<tr><td>' + (names[t] || t) + '</td><td>' + (enabled ? '<span class="tag tag-green">开启</span>' : '<span class="tag tag-red">关闭</span>') + '</td><td style="max-width:200px;word-break:break-all;">' + msg + '</td><td><button class="btn btn-sm btn-ghost" onclick="toggleFlag(\'' + t + '\',' + !enabled + ')">' + (enabled ? '关闭' : '开启') + '</button></td></tr>';
  }
  document.getElementById('flags-body').innerHTML = html;
}

async function toggleFlag(tool, enabled) {
  const msg = prompt('功能关闭时的提示消息（开启时可留空）:');
  if (msg === null) return;
  const res = await apiCall('set_flag', { tool, enabled, message: msg });
  if (res.success) { toast('已更新', 'ok'); loadFlags(); }
  else { toast(res.error, 'err'); }
}

async function loadTemplates() {
  filterTemplates('');
}

async function filterTemplates(cat) {
  const res = await apiCall('entries', {}, '/api/poster_templates.php');
  if (!res.success) { toast(res.error, 'err'); return; }
  let entries = res.entries || [];
  if (cat) entries = entries.filter(function(e) { return e.category === cat; });
  let html = '';
  for (const entry of entries) {
    for (const tpl of entry.templates) {
      const sid = tpl.id.replace(/'/g, "\\'");
      const thumbHtml = tpl.thumbnail ? '<img src="' + tpl.thumbnail + '" style="width:48px;height:48px;object-fit:cover;border-radius:4px;" onerror="this.style.display=\'none\'">' : '-';
      const tierHtml = tpl.tier === 'premium' ? '<span class="tag tag-blue">高级</span>' : '免费';
      html += '<tr><td>' + thumbHtml + '</td><td style="font-family:monospace;font-size:12px;">' + tpl.id + '</td><td>' + (tpl.name || '-') + '</td><td>' + (entry.entryName || '-') + '</td><td>' + (entry.category || '-') + '</td><td>' + tierHtml + '</td><td>' + (tpl.sortOrder || 0) + '</td><td><button class="btn btn-sm btn-ghost" onclick="editTemplate(\'' + sid + '\')">编辑</button> <button class="btn btn-sm btn-danger" onclick="deleteTemplate(\'' + sid + '\')">删除</button></td></tr>';
    }
  }
  document.getElementById('templates-body').innerHTML = html || '<tr><td colspan="8" style="text-align:center;color:#999">暂无模板</td></tr>';
  document.querySelectorAll('#panel-templates .filter-btn').forEach(function(b) {
    b.style.borderColor = (b.dataset.cat === cat) ? '#07c' : '#ddd';
  });
}

function readFileAsBase64(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function() { resolve(reader.result); };
    reader.onerror = function() { reject(reader.error); };
    reader.readAsDataURL(file);
  });
}

async function saveTemplate() {
  var id = document.getElementById('tpl-id').value.trim();
  var entry = document.getElementById('tpl-entry').value.trim();
  var entryName = document.getElementById('tpl-entry-name').value.trim();
  var name = document.getElementById('tpl-name').value.trim();
  var category = document.getElementById('tpl-category').value;
  var tier = document.getElementById('tpl-tier').value;
  var sortOrder = parseInt(document.getElementById('tpl-sort').value) || 0;

  if (!id || !entry || !name) { toast('ID、分组 entry、模板名称不能为空', 'err'); return; }

  if (!/^[a-zA-Z0-9_-]+$/.test(id)) { toast('ID 只能包含字母数字下划线和中划线', 'err'); return; }

  var bgFile = document.getElementById('tpl-bg').files[0];
  var thumbFile = document.getElementById('tpl-thumb').files[0];

  if (bgFile && bgFile.size > 500 * 1024) { toast('背景图不能超过 500KB', 'err'); return; }
  if (thumbFile && thumbFile.size > 100 * 1024) { toast('缩略图不能超过 100KB', 'err'); return; }

  var tpl = { id: id, entry: entry, entryName: entryName, name: name, category: category, tier: tier, sortOrder: sortOrder };

  try {
    if (bgFile) tpl.bg_image = await readFileAsBase64(bgFile);
    if (thumbFile) tpl.thumb_image = await readFileAsBase64(thumbFile);
  } catch (e) {
    toast('图片读取失败', 'err');
    return;
  }

  const res = await apiCall('save_template', { template: tpl }, '/api/poster_templates.php');
  if (res.success) { toast('已保存', 'ok'); resetTemplateForm(); loadTemplates(); }
  else { toast(res.error, 'err'); }
}

function editTemplate(id) {
  document.getElementById('tpl-edit-id').value = id;
  document.getElementById('tpl-id').value = id;
  document.getElementById('tpl-id').disabled = true;
  document.getElementById('tpl-entry').value = '';
  document.getElementById('tpl-entry-name').value = '';
  document.getElementById('tpl-name').value = '';
  document.getElementById('tpl-sort').value = 0;
  document.getElementById('tpl-bg').value = '';
  document.getElementById('tpl-thumb').value = '';

  // 从列表数据反填 — 用 entries API 查
  apiCall('entries', {}, '/api/poster_templates.php').then(function(res) {
    if (!res.success) return;
    for (var e of res.entries || []) {
      for (var t of e.templates || []) {
        if (t.id === id) {
          document.getElementById('tpl-entry').value = e.entry;
          document.getElementById('tpl-entry-name').value = e.entryName;
          document.getElementById('tpl-name').value = t.name || '';
          document.getElementById('tpl-category').value = e.category || '节假日';
          document.getElementById('tpl-tier').value = t.tier === 'premium' ? 'premium' : 'free';
          document.getElementById('tpl-sort').value = t.sortOrder || 0;
          return;
        }
      }
    }
  });

  document.getElementById('panel-templates').querySelector('#template-form').scrollIntoView({ behavior: 'smooth' });
}

function resetTemplateForm() {
  document.getElementById('tpl-edit-id').value = '';
  document.getElementById('tpl-id').value = '';
  document.getElementById('tpl-id').disabled = false;
  document.getElementById('tpl-entry').value = '';
  document.getElementById('tpl-entry-name').value = '';
  document.getElementById('tpl-name').value = '';
  document.getElementById('tpl-category').value = '节假日';
  document.getElementById('tpl-tier').value = 'free';
  document.getElementById('tpl-sort').value = 0;
  document.getElementById('tpl-bg').value = '';
  document.getElementById('tpl-thumb').value = '';
}

async function deleteTemplate(id) {
  if (!confirm('确定删除模板 "' + id + '" 吗？\n对应的背景图和缩略图也会被删除。')) return;
  const res = await apiCall('delete_template', { id: id }, '/api/poster_templates.php');
  if (res.success) { toast('已删除', 'ok'); loadTemplates(); }
  else { toast(res.error, 'err'); }
}

async function updateCookie() {
  const cookies = document.getElementById('cookie-input').value;
  const msgEl = document.getElementById('cookie-msg');
  if (!cookies.trim()) { toast('请粘贴 Cookie 内容', 'err'); return; }
  msgEl.style.display = 'block';
  msgEl.style.background = '#fff3e0';
  msgEl.style.color = '#e65100';
  msgEl.style.padding = '12px';
  msgEl.style.borderRadius = '8px';
  msgEl.textContent = '更新中...';
  const res = await apiCall('update_cookie', { cookies });
  if (res.success) {
    msgEl.style.background = '#e8f5e9';
    msgEl.style.color = '#2e7d32';
    msgEl.textContent = res.message;
    toast('Cookie 更新成功', 'ok');
  } else {
    msgEl.style.background = '#fbe9e7';
    msgEl.style.color = '#c62828';
    msgEl.textContent = '更新失败：' + res.error;
    toast(res.error, 'err');
  }
}

loadStats();
</script>
<?php endif; ?>
</body>
</html>
