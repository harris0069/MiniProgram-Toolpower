<?php
/**
 * 统一使用控制接口
 * 
 * 前台 actions:
 *   check      - 查询剩余次数
 *   redeem     - 兑换码兑换
 *   increment  - 记录使用
 *   flag       - 功能开关
 *   user_info  - 记录用户昵称
 *   vip_check  - 检查是否特权用户
 *   unlock     - 检查模板解锁（兼容旧海报）
 * 
 * 管理后台 actions:
 *   all_users      - 用户列表
 *   set_permission - 设置权限
 *   all_codes      - 兑换码列表
 *   add_code       - 添加兑换码
 *   toggle_code    - 启用/禁用兑换码
 *   set_flag       - 修改功能开关
 *   update_cookie  - 更新Cookie
 *   stats          - 使用统计
 */

require_once __DIR__ . '/../config.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// === 基础路径 ===
define('DATA_DIR', __DIR__ . '/../data/');
define('CONFIG_FILE', __DIR__ . '/../config/usage_config.json');

if (!is_dir(DATA_DIR)) {
    mkdir(DATA_DIR, 0755, true);
}

// === 工具函数 ===

function loadJson($file, $default = []) {
    if (!file_exists($file)) return $default;
    $content = file_get_contents($file);
    return json_decode($content, true) ?: $default;
}

function saveJson($file, $data) {
    if (file_exists($file)) {
        copy($file, $file . '.bak');
    }
    $fh = fopen($file, 'c');
    if (!$fh || !flock($fh, LOCK_EX)) {
        if ($fh) fclose($fh);
        throw new Exception('文件写入失败：无法锁定 ' . basename($file));
    }
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        flock($fh, LOCK_UN);
        fclose($fh);
        throw new Exception('JSON 编码失败');
    }
    ftruncate($fh, 0);
    fwrite($fh, $json);
    flock($fh, LOCK_UN);
    fclose($fh);
    $readBack = file_get_contents($file);
    if ($readBack !== $json) {
        throw new Exception('文件写入校验失败：数据不一致');
    }
}

function generateRedeemCode() {
    $us = (int)(microtime(true) * 1000000);
    $code = strtoupper(base_convert($us, 10, 36));
    return str_pad(substr($code, -8), 8, '0', STR_PAD_LEFT);
}

function loadConfig() {
    return loadJson(CONFIG_FILE, []);
}

function getConfig($tool) {
    $config = loadConfig();
    return $config[$tool] ?? null;
}

// === 使用数据（兼容旧格式）===

function getUsageFilePath($tool, $period = null) {
    $config = getConfig($tool);
    if (!$config) return null;
    
    if (($config['weekly_limit'] ?? 0) > 0) {
        // 按周存储
        $week = $period ?: date('o-W');
        return DATA_DIR . 'usage_' . $tool . '_' . $week . '.json';
    } else {
        // 按天存储
        $day = $period ?: date('Y-m-d');
        return DATA_DIR . 'usage_' . $tool . '_' . $day . '.json';
    }
}

// 兼容旧的 usage_helper.php 格式
function getLegacyUsageFilePath($tool, $period = null) {
    $day = $period ?: date('Y-m-d');
    if ($tool === 'id-photo') {
        // 旧的 id-photo 数据在 usage_YYYY-MM-DD.json（无工具后缀）
        return DATA_DIR . 'usage_' . $day . '.json';
    } elseif ($tool === 'link_parse') {
        return DATA_DIR . 'usage_link_parse_' . $day . '.json';
    }
    return null;
}

function getUsageData($openid, $tool) {
    $file = getUsageFilePath($tool);
    if (!$file) return ['used' => 0, 'bonus' => 0];
    
    $data = loadJson($file, []);
    if (isset($data[$openid])) {
        return $data[$openid];
    }
    
    // 尝试读取旧格式
    $legacyFile = getLegacyUsageFilePath($tool);
    if ($legacyFile && file_exists($legacyFile)) {
        $legacy = loadJson($legacyFile, []);
        if (isset($legacy[$openid])) {
            return $legacy[$openid];
        }
    }
    
    return ['used' => 0, 'bonus' => 0];
}

function saveUsageData($openid, $usage, $tool) {
    $file = getUsageFilePath($tool);
    if (!$file) return;
    
    $data = loadJson($file, []);
    $data[$openid] = $usage;
    saveJson($file, $data);
}

function getRemaining($openid, $tool) {
    $config = getConfig($tool);
    if (!$config) return 0;
    
    // 特权用户不限次数
    if (isPrivilegeUser($openid, $tool)) {
        return 999999;
    }
    
    $usage = getUsageData($openid, $tool);
    $dailyLimit = $config['daily_limit'] ?? 0;
    $weeklyLimit = $config['weekly_limit'] ?? 0;
    $bonus = $usage['bonus'] ?? 0;
    $used = $usage['used'] ?? 0;
    
    if ($weeklyLimit > 0) {
        // 按周限制：used > 0 表示本周已用
        $used = $used > 0 ? 1 : 0;
        $totalLimit = $weeklyLimit + $bonus;
    } else {
        $totalLimit = $dailyLimit + $bonus;
    }
    
    return max(0, $totalLimit - $used);
}

function incrementUsage($openid, $tool) {
    $config = getConfig($tool);
    if (!$config) return;
    
    if (($config['weekly_limit'] ?? 0) > 0) {
        // 按周限制：保留已有 bonus，不清零
        $file = getUsageFilePath($tool);
        $data = loadJson($file, []);
        $existing = $data[$openid] ?? ['used' => 0, 'bonus' => 0];
        $data[$openid] = ['used' => 1, 'bonus' => $existing['bonus'] ?? 0];
        saveJson($file, $data);
    } else {
        // 按天限制
        $usage = getUsageData($openid, $tool);
        $usage['used'] = ($usage['used'] ?? 0) + 1;
        $usage['bonus'] = $usage['bonus'] ?? 0;
        saveUsageData($openid, $usage, $tool);
    }
}

function addBonus($openid, $count, $tool) {
    $usage = getUsageData($openid, $tool);
    $usage['bonus'] = ($usage['bonus'] ?? 0) + $count;
    $usage['used'] = $usage['used'] ?? 0;
    saveUsageData($openid, $usage, $tool);
}

function findCodeKey($codes, $rawCode) {
    $code = trim($rawCode);
    if (isset($codes[$code])) return $code;
    $upperCode = strtoupper($code);
    if (isset($codes[$upperCode])) return $upperCode;
    foreach ($codes as $key => $val) {
        if (strtoupper($key) === $upperCode) return $key;
    }
    return null;
}

// === 权限检查 ===

function isPrivilegeUser($openid, $tool) {
    $users = loadJson(DATA_DIR . 'users.json', []);
    $user = $users[$openid] ?? [];
    
    // 按工具权限
    $privilegedTools = $user['privileged_tools'] ?? null;
    if (is_array($privilegedTools)) {
        return in_array($tool, $privilegedTools);
    }
    
    // 旧全局特权（向后兼容）
    return ($user['permission'] ?? '') === 'privilege';
}

// === 请求处理 ===

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$action = trim($_GET['action'] ?? $input['action'] ?? '');
$openid = trim($input['openid'] ?? $_GET['openid'] ?? '');
$tool = trim($input['tool'] ?? $_GET['tool'] ?? '');

$adminActions = ['all_users', 'set_permission', 'all_codes', 'add_code', 'toggle_code', 'delete_code', 'set_flag', 'update_cookie', 'stats'];
if (in_array($action, $adminActions)) {
    @session_start();
    if (empty($_SESSION['admin_logged_in'])) {
        jsonResponse(['success' => false, 'error' => '未登录'], 401);
    }
}

try {
    switch ($action) {
        
        // ==================== 前台 actions ====================
        
        case 'check':
            writeLog('INFO', 'check 请求', ['openid' => $openid, 'tool' => $tool]);
            if (!$openid) throw new Exception('缺少 openid');
            $config = getConfig($tool);
            if (!$config) throw new Exception('未知工具: ' . $tool);
            
            $usage = getUsageData($openid, $tool);
            $remaining = getRemaining($openid, $tool);
            $dailyLimit = $config['daily_limit'] ?? 0;
            $weeklyLimit = $config['weekly_limit'] ?? 0;
            $bonus = $usage['bonus'] ?? 0;
            $isPrivilege = isPrivilegeUser($openid, $tool);
            
            $limit = $weeklyLimit > 0 ? $weeklyLimit : $dailyLimit;
            $totalLimit = $limit + $bonus;
            $used = $usage['used'] ?? 0;
            
            jsonResponse([
                'success' => true,
                'remaining' => $remaining,
                'used' => $used,
                'limit' => $limit,
                'bonus' => $bonus,
                'total_limit' => $totalLimit,
                'is_privilege' => $isPrivilege,
                'mode' => $weeklyLimit > 0 ? 'weekly' : 'daily',
            ]);
            break;
        
        case 'redeem':
            if (!$openid) throw new Exception('缺少 openid');
            $code = trim($input['code'] ?? '');
            if (!$code) throw new Exception('请输入兑换码');
            if (!$tool) throw new Exception('缺少工具标识');
            
            $config = getConfig($tool);
            if (!$config) throw new Exception('未知工具: ' . $tool);
            if (empty($config['redeem_enabled'])) throw new Exception('该工具不支持兑换码');
            
            $codes = loadJson(DATA_DIR . 'redeem_codes.json', []);
            
            $matchedKey = findCodeKey($codes, $code);
            if (!$matchedKey) throw new Exception('无效的兑换码');
            
            $info = $codes[$matchedKey];
            
            // 检查激活状态
            if (!($info['active'] ?? true)) throw new Exception('该兑换码已被禁用');
            
            // 检查是否已使用
            if (!empty($info['used_by'])) throw new Exception('该兑换码已被使用');
            
            // 检查有效期（旧码可能没有 expires_at，跳过）
            if (!empty($info['expires_at']) && $info['expires_at'] < time()) {
                throw new Exception('该兑换码已过期');
            }
            
            // 检查工具匹配（旧码可能没有 tool 字段，跳过）
            if (!empty($info['tool']) && $info['tool'] !== $tool) {
                throw new Exception('此兑换码不适用于当前工具');
            }
            
            // 奖励次数：优先用码自身 bonus，fallback 到配置
            $bonusCount = $info['bonus'] ?? ($config['bonus_per_code'] ?? 10);
            addBonus($openid, $bonusCount, $tool);
            
            // 标记已使用
            $users = loadJson(DATA_DIR . 'users.json', []);
            $nickname = $users[$openid]['nickname'] ?? '';
            $codes[$matchedKey]['used_by'] = ['openid' => $openid, 'nickname' => $nickname];
            $codes[$matchedKey]['used_at'] = date('Y-m-d H:i:s');
            $codes[$matchedKey]['active'] = false;
            saveJson(DATA_DIR . 'redeem_codes.json', $codes);
            
            jsonResponse([
                'success' => true,
                'message' => '兑换成功，增加' . $bonusCount . '次使用机会',
                'added' => $bonusCount,
            ]);
            break;
        
        case 'increment':
            if (!$openid) throw new Exception('缺少 openid');
            $config = getConfig($tool);
            if ($config && ($config['daily_limit'] > 0 || $config['weekly_limit'] > 0)) {
                if (getRemaining($openid, $tool) <= 0) {
                    throw new Exception('使用次数已用完');
                }
            }
            incrementUsage($openid, $tool);
            jsonResponse(['success' => true, 'message' => '已记录']);
            break;
        
        case 'flag':
            $config = getConfig($tool);
            if (!$config) throw new Exception('未知工具: ' . $tool);
            
            jsonResponse([
                'success' => true,
                'enabled' => $config['feature_enabled'] ?? true,
                'message' => $config['feature_message'] ?? '',
            ]);
            break;
        
        case 'setNickname':
        case 'user_info':
            if (!$openid) throw new Exception('缺少 openid');
            $nickname = trim($input['nickname'] ?? '');
            
            $users = loadJson(DATA_DIR . 'users.json', []);
            if (!isset($users[$openid])) {
                $users[$openid] = [
                    'nickname' => $nickname ?: '未命名',
                    'first_seen' => date('Y-m-d H:i:s'),
                    'last_seen' => date('Y-m-d H:i:s'),
                    'permission' => 'normal',
                ];
            } else {
                $users[$openid]['last_seen'] = date('Y-m-d H:i:s');
                if ($nickname && $nickname !== '未命名') {
                    $users[$openid]['nickname'] = $nickname;
                }
            }
            saveJson(DATA_DIR . 'users.json', $users);
            jsonResponse(['success' => true]);
            break;
        
        case 'vip_check':
            if (!$openid) throw new Exception('缺少 openid');
            $isPrivilege = isPrivilegeUser($openid, 'link_parse') || isPrivilegeUser($openid, 'poster') || isPrivilegeUser($openid, 'id-photo');
            jsonResponse([
                'success' => true,
                'is_privilege' => $isPrivilege,
            ]);
            break;
        
        case 'unlock':
            if (!$openid) throw new Exception('缺少 openid');
            $templateId = preg_replace('/[^a-zA-Z0-9_-]/', '', $input['template'] ?? '');
            
            // 特权用户全部解锁
            if (isPrivilegeUser($openid, 'poster')) {
                jsonResponse(['success' => true, 'unlocked' => true]);
                break;
            }
            
            // 兼容旧的 poster_unlocks.json
            $unlocks = loadJson(DATA_DIR . 'poster_unlocks.json', []);
            $userUnlocks = $unlocks[$openid] ?? [];
            $unlocked = in_array('*', $userUnlocks) || in_array($templateId, $userUnlocks);
            
            jsonResponse(['success' => true, 'unlocked' => $unlocked]);
            break;
        
        // ==================== 管理后台 actions ====================
        
        case 'all_users':
            $users = loadJson(DATA_DIR . 'users.json', []);
            jsonResponse(['success' => true, 'users' => $users]);
            break;
        
        case 'set_permission':
            $targetOpenid = trim($input['target_openid'] ?? '');
            if (!$targetOpenid) throw new Exception('缺少 openid');
            
            $users = loadJson(DATA_DIR . 'users.json', []);
            if (!isset($users[$targetOpenid])) {
                $users[$targetOpenid] = [
                    'nickname' => '未命名',
                    'first_seen' => date('Y-m-d H:i:s'),
                    'last_seen' => '-',
                ];
            }
            
            $privilegedTools = $input['privileged_tools'] ?? null;
            if (is_array($privilegedTools)) {
                // 新格式：按工具设置
                $users[$targetOpenid]['privileged_tools'] = array_values(array_intersect($privilegedTools, ['link_parse', 'poster', 'id-photo']));
                unset($users[$targetOpenid]['permission']);
            } else {
                // 旧格式兼容
                $permission = trim($input['permission'] ?? 'normal');
                if (!in_array($permission, ['normal', 'privilege'])) {
                    throw new Exception('权限类型无效');
                }
                if ($permission === 'privilege') {
                    $users[$targetOpenid]['privileged_tools'] = ['link_parse', 'poster', 'id-photo'];
                    unset($users[$targetOpenid]['permission']);
                } else {
                    $users[$targetOpenid]['permission'] = 'normal';
                    unset($users[$targetOpenid]['privileged_tools']);
                }
            }
            
            saveJson(DATA_DIR . 'users.json', $users);
            jsonResponse(['success' => true, 'message' => '权限已更新']);
            break;
        
        case 'all_codes':
            $codes = loadJson(DATA_DIR . 'redeem_codes.json', []);
            
            // 自动迁移小写 key 到大写
            $normalized = [];
            $needsSave = false;
            foreach ($codes as $key => $val) {
                $upperKey = strtoupper($key);
                if ($upperKey !== $key) {
                    $normalized[$upperKey] = $val;
                    $needsSave = true;
                } else {
                    $normalized[$key] = $val;
                }
            }
            if ($needsSave) {
                saveJson(DATA_DIR . 'redeem_codes.json', $normalized);
                $codes = $normalized;
            }
            
            // 附加状态字段
            $now = time();
            foreach ($codes as &$info) {
                $info['is_expired'] = !empty($info['expires_at']) && $info['expires_at'] < $now;
                $info['is_used'] = !empty($info['used_by']);
            }
            unset($info);
            
            jsonResponse(['success' => true, 'codes' => $codes]);
            break;
        
        case 'add_code':
            $code = trim(strtoupper($input['code'] ?? ''));
            $tool = trim($input['tool'] ?? '');
            $count = intval($input['count'] ?? 10);
            
            if (!$tool) throw new Exception('请选择工具');
            if ($count < 1) throw new Exception('次数必须大于0');
            
            $config = loadConfig();
            if (!isset($config[$tool])) throw new Exception('未知工具: ' . $tool);
            
            if (!$code) {
                $code = generateRedeemCode();
            }
            
            $codes = loadJson(DATA_DIR . 'redeem_codes.json', []);
            if (isset($codes[$code])) throw new Exception('兑换码已存在');
            
            $now = time();
            $codes[$code] = [
                'active' => true,
                'bonus' => $count,
                'tool' => $tool,
                'created_at' => $now,
                'expires_at' => $now + 7 * 24 * 3600,
                'used_by' => null,
                'used_at' => null,
            ];
            saveJson(DATA_DIR . 'redeem_codes.json', $codes);
            jsonResponse(['success' => true, 'message' => '兑换码已添加', 'code' => $code]);
            break;
        
        case 'toggle_code':
            $code = trim($input['code'] ?? '');
            $active = $input['active'] ?? true;
            
            if (!$code) throw new Exception('缺少兑换码');
            
            $codes = loadJson(DATA_DIR . 'redeem_codes.json', []);
            $matchedKey = findCodeKey($codes, $code);
            if (!$matchedKey) throw new Exception('兑换码不存在');
            
            $codes[$matchedKey]['active'] = (bool) $active;
            saveJson(DATA_DIR . 'redeem_codes.json', $codes);
            jsonResponse(['success' => true, 'message' => $active ? '已启用' : '已禁用']);
            break;
        
        case 'delete_code':
            $code = trim($input['code'] ?? '');
            if (!$code) throw new Exception('缺少兑换码');
            
            $codes = loadJson(DATA_DIR . 'redeem_codes.json', []);
            $matchedKey = findCodeKey($codes, $code);
            if (!$matchedKey) throw new Exception('兑换码不存在');
            
            unset($codes[$matchedKey]);
            saveJson(DATA_DIR . 'redeem_codes.json', $codes);
            jsonResponse(['success' => true, 'message' => '已删除']);
            break;
        
        case 'set_flag':
            $flagTool = trim($input['tool'] ?? '');
            $enabled = $input['enabled'] ?? true;
            $message = trim($input['message'] ?? '');
            
            if (!$flagTool) throw new Exception('缺少工具名');
            
            $config = loadConfig();
            if (!isset($config[$flagTool])) throw new Exception('未知工具: ' . $flagTool);
            
            $config[$flagTool]['feature_enabled'] = (bool) $enabled;
            $config[$flagTool]['feature_message'] = $message;
            saveJson(CONFIG_FILE, $config);
            jsonResponse(['success' => true, 'message' => '功能开关已更新']);
            break;
        
        case 'update_cookie':
            $raw = trim($input['cookies'] ?? '');
            if (!$raw) throw new Exception('请粘贴 Cookie 内容');
            
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
                throw new Exception('未识别到有效的 Cookie 条目');
            }
            
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
            
            if ($error) throw new Exception('请求失败：' . $error);
            if ($httpCode !== 200) throw new Exception('API 返回 HTTP ' . $httpCode);
            
            $data = json_decode($resp, true);
            if (!$data || ($data['code'] ?? 0) !== 200) {
                throw new Exception('API 返回错误：' . ($data['message'] ?? $resp));
            }
            
            jsonResponse([
                'success' => true,
                'message' => 'Cookie 更新成功！共解析 ' . count($pairs) . ' 个字段',
            ]);
            break;
        
        case 'stats':
            $statsTool = trim($input['tool'] ?? '');
            $date = trim($input['date'] ?? date('Y-m-d'));
            
            if (!$statsTool) {
                // 返回所有工具的概览
                $config = loadConfig();
                $overview = [];
                foreach ($config as $t => $c) {
                    $file = getUsageFilePath($t, $date);
                    $data = $file ? loadJson($file, []) : [];
                    $totalUsed = 0;
                    foreach ($data as $u) {
                        $totalUsed += $u['used'] ?? 0;
                    }
                    $overview[$t] = [
                        'name' => $c['name'],
                        'users' => count($data),
                        'total_used' => $totalUsed,
                    ];
                }
                jsonResponse(['success' => true, 'overview' => $overview]);
            } else {
                $file = getUsageFilePath($statsTool, $date);
                $data = $file ? loadJson($file, []) : [];
                jsonResponse(['success' => true, 'usage' => $data]);
            }
            break;
        
        default:
            throw new Exception('未知操作: ' . $action);
    }
    
} catch (Exception $e) {
    jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
}
