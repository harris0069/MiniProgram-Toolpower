# Toolpower 海报后端部署脚本
param(
    [string]$ServerIP = "xcx.huangyiling.top",
    [string]$Username = "root"
)

$WebRoot = "/var/www/xcx.huangyiling.top"
$ApiDir = "$WebRoot/api"

Write-Host "Uploading poster backend to $ServerIP..." -ForegroundColor Green

# Create directories
ssh ${Username}@${ServerIP} "mkdir -p ${ApiDir}/data ${WebRoot}/backend/templates && chown -R www-data:www-data ${WebRoot} && chmod -R 755 ${WebRoot}"

# Upload API files
scp backend/api/poster_templates.php backend/api/poster_usage.php ${Username}@${ServerIP}:${ApiDir}/

# Upload data files
scp backend/data/poster_unlocks.json ${Username}@${ServerIP}:${ApiDir}/../data/

# Upload template directories
foreach ($dir in Get-ChildItem backend/templates -Directory) {
    Write-Host "  Uploading $($dir.Name)..."
    scp -r $dir.FullName ${Username}@${ServerIP}:${WebRoot}/backend/templates/
}

# Fix permissions
ssh ${Username}@${ServerIP} "chown -R www-data:www-data ${WebRoot} && find ${WebRoot} -type f -exec chmod 644 {} \; && find ${WebRoot} -type d -exec chmod 755 {} \;"

Write-Host "Done!" -ForegroundColor Green
