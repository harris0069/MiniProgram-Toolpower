# Toolpower 一键部署脚本 (PowerShell)
# .\deploy.ps1 -ServerIP "你的服务器IP" -Username "root"

param(
    [string]$ServerIP = "你的服务器IP",
    [string]$Username = "root",
    [string]$Domain = "weixin"
)

$WebRoot = "/www/wwwroot/$Domain"
$ApiDir = "$WebRoot/backend/api"

Write-Host "部署 Toolpower API 到服务器: $ServerIP" -ForegroundColor Green

if (-not (Test-Path "backend/api/douyin_parse.php")) {
    Write-Host "错误: 找不到 backend/api/douyin_parse.php" -ForegroundColor Red
    exit 1
}

Write-Host "创建服务器目录结构..." -ForegroundColor Yellow

$createDirScript = @"
mkdir -p /www/wwwroot/weixin/backend/api/data
chown -R www-data:www-data /www/wwwroot/weixin
chmod -R 755 /www/wwwroot/weixin
"@

ssh "$Username@$ServerIP" $createDirScript

Write-Host "上传所有 API 文件..." -ForegroundColor Yellow
scp "backend/api/*.php" "$Username@$ServerIP`:$ApiDir/"
scp "backend/config.php" "$Username@$ServerIP`:$WebRoot/backend/"

if (Test-Path "backend/data/redeem_codes.json") {
    scp "backend/data/redeem_codes.json" "$Username@$ServerIP`:$ApiDir/../data/"
}

if (Test-Path "backend/data/poster_unlocks.json") {
    scp "backend/data/poster_unlocks.json" "$Username@$ServerIP`:$ApiDir/../data/"
}

Write-Host "上传模板目录..." -ForegroundColor Yellow
ssh "$Username@$ServerIP" "mkdir -p $WebRoot/backend/templates/images"
scp "backend/templates/catalog.json" "$Username@$ServerIP`:$WebRoot/backend/templates/"
if (Get-ChildItem "backend/templates/images/*" -ErrorAction SilentlyContinue) {
    scp -r backend/templates/images/* "$Username@$ServerIP`:$WebRoot/backend/templates/images/"
}

Write-Host "设置文件权限..." -ForegroundColor Yellow
$permScript = @"
chown -R www-data:www-data /www/wwwroot/weixin
find /www/wwwroot/weixin -type f -exec chmod 644 {} \;
find /www/wwwroot/weixin -type d -exec chmod 755 {} \;
"@

ssh "$Username@$ServerIP" $permScript

Write-Host ""
Write-Host "部署完成！" -ForegroundColor Green
Write-Host ("健康检查: curl -s 'http://" + $ServerIP + "/backend/api/douyin_parse.php?health'")
