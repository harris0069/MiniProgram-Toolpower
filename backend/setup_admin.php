<?php
/**
 * 生成管理后台密码哈希
 * 运行方式: php setup_admin.php
 * 生成后会自动更新 admin/config.json
 */

$configFile = __DIR__ . '/api/admin/config.json';
$password = 'Aa112233';
$hash = password_hash($password, PASSWORD_BCRYPT);

$config = [
    'username' => 'admin',
    'password_hash' => $hash,
    'description' => "密码: {$password}",
];

file_put_contents($configFile, json_encode($config, JSON_PRETTY_PRINT));
echo "密码哈希已生成并保存到 admin/config.json\n";
echo "哈希值: {$hash}\n";
