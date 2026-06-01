# Toolpower 一键部署脚本 (PowerShell)
# .\deploy.ps1 -ServerIP "xcx.huangyiling.top" -Username "root"

param(
    [string]$ServerIP = "xcx.huangyiling.top",
    [string]$Username = "root",
    [string]$Domain = "xcx.huangyiling.top"
)

$WebRoot = "/var/www/$Domain"
$ApiDir = "$WebRoot/api"

Write-Host "部署 Toolpower API 到服务器: $ServerIP" -ForegroundColor Green

if (-not (Test-Path "backend/api/douyin_parse.php")) {
    Write-Host "错误: 找不到 backend/api/douyin_parse.php" -ForegroundColor Red
    exit 1
}

Write-Host "创建服务器目录结构..." -ForegroundColor Yellow

$createDirScript = @"
mkdir -p /var/www/xcx.huangyiling.top/api/data
chown -R www-data:www-data /var/www/xcx.huangyiling.top
chmod -R 755 /var/www/xcx.huangyiling.top
"@

ssh "$Username@$ServerIP" $createDirScript

Write-Host "上传所有 API 文件..." -ForegroundColor Yellow
scp "backend/api/*.php" "$Username@$ServerIP`:$ApiDir/"
scp "backend/config.php" "$Username@$ServerIP`:$WebRoot/"

if (Test-Path "backend/data/redeem_codes.json") {
    scp "backend/data/redeem_codes.json" "$Username@$ServerIP`:$ApiDir/../data/"
}

Write-Host "设置文件权限..." -ForegroundColor Yellow
$permScript = @"
chown -R www-data:www-data /var/www/xcx.huangyiling.top
find /var/www/xcx.huangyiling.top -type f -exec chmod 644 {} \;
find /var/www/xcx.huangyiling.top -type d -exec chmod 755 {} \;
"@

ssh "$Username@$ServerIP" $permScript

Write-Host ""
Write-Host "部署完成！" -ForegroundColor Green
Write-Host "健康检查: curl -s 'https://$Domain/api/douyin_parse.php?health'"
