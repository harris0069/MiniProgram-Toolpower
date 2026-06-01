#!/bin/bash

# Toolpower 一键部署脚本
# 上传所有 API 文件到服务器

set -e

SERVER_IP=${1:-"xcx.huangyiling.top"}
USERNAME=${2:-"root"}
DOMAIN="xcx.huangyiling.top"
WEB_ROOT="/var/www/$DOMAIN"
API_DIR="$WEB_ROOT/api"

echo "开始部署 Toolpower API 到服务器: $SERVER_IP"

# 检查本地文件
BACKEND_DIR="backend/api"
if [ ! -d "$BACKEND_DIR" ]; then
    echo "错误: 找不到 $BACKEND_DIR 目录"
    exit 1
fi

echo "创建服务器目录结构..."
ssh $USERNAME@$SERVER_IP << 'EOF'
    mkdir -p /var/www/xcx.huangyiling.top/api/data
    chown -R www-data:www-data /var/www/xcx.huangyiling.top
    chmod -R 755 /var/www/xcx.huangyiling.top
EOF

echo "上传 API 文件..."
scp backend/api/*.php $USERNAME@$SERVER_IP:$API_DIR/
scp backend/config.php $USERNAME@$SERVER_IP:$API_DIR/../

if [ -f "backend/data/redeem_codes.json" ]; then
    scp backend/data/redeem_codes.json $USERNAME@$SERVER_IP:$API_DIR/../data/
fi

echo "设置文件权限..."
ssh $USERNAME@$SERVER_IP << 'EOF'
    chown -R www-data:www-data /var/www/xcx.huangyiling.top
    find /var/www/xcx.huangyiling.top -type f -exec chmod 644 {} \;
    find /var/www/xcx.huangyiling.top -type d -exec chmod 755 {} \;
EOF

echo "部署完成！"
echo ""
echo "API 文件列表:"
ssh $USERNAME@$SERVER_IP "ls -la $API_DIR/"
echo ""
echo "健康检查: curl -s 'https://$DOMAIN/api/douyin_parse.php?health'"
