#!/bin/bash

# Toolpower 一键部署脚本
# 上传所有 API 文件到服务器

set -e

SERVER_IP=${1:-"你的服务器IP"}
USERNAME=${2:-"root"}
DOMAIN="weixin"
WEB_ROOT="/www/wwwroot/$DOMAIN"
API_DIR="$WEB_ROOT/backend/api"

echo "开始部署 Toolpower API 到服务器: $SERVER_IP"

# 检查本地文件
BACKEND_DIR="backend/api"
if [ ! -d "$BACKEND_DIR" ]; then
    echo "错误: 找不到 $BACKEND_DIR 目录"
    exit 1
fi

echo "创建服务器目录结构..."
ssh $USERNAME@$SERVER_IP << 'EOF'
    mkdir -p /www/wwwroot/weixin/backend/api/data
    chown -R www-data:www-data /www/wwwroot/weixin
    chmod -R 755 /www/wwwroot/weixin
EOF

echo "上传 API 文件..."
scp backend/api/*.php $USERNAME@$SERVER_IP:$API_DIR/
scp backend/config.php $USERNAME@$SERVER_IP:$API_DIR/../

if [ -f "backend/data/redeem_codes.json" ]; then
    scp backend/data/redeem_codes.json $USERNAME@$SERVER_IP:$API_DIR/../data/
fi

if [ -f "backend/data/poster_unlocks.json" ]; then
    scp backend/data/poster_unlocks.json $USERNAME@$SERVER_IP:$API_DIR/../data/
fi

echo "上传模板目录..."
ssh $USERNAME@$SERVER_IP "mkdir -p $WEB_ROOT/backend/templates/images"
scp backend/templates/catalog.json $USERNAME@$SERVER_IP:$WEB_ROOT/backend/templates/
if ls backend/templates/images/* 2>/dev/null; then
    scp -r backend/templates/images/* $USERNAME@$SERVER_IP:$WEB_ROOT/backend/templates/images/
fi

echo "设置文件权限..."
ssh $USERNAME@$SERVER_IP << 'EOF'
    chown -R www-data:www-data /www/wwwroot/weixin
    find /www/wwwroot/weixin -type f -exec chmod 644 {} \;
    find /www/wwwroot/weixin -type d -exec chmod 755 {} \;
EOF

echo "部署完成！"
echo ""
echo "API 文件列表:"
ssh $USERNAME@$SERVER_IP "ls -la $API_DIR/"
echo ""
echo "健康检查: curl -s 'http://$SERVER_IP/backend/api/douyin_parse.php?health'"
