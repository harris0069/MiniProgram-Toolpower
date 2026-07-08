# Toolpower 部署指南

## 快速部署

```powershell
# Windows PowerShell
.\deploy.ps1 -ServerIP "你的服务器IP" -Username "root"
```

```bash
# Linux/macOS
./deploy.sh 你的服务器IP root
```

## 部署内容

`deploy.sh` 会上传 `backend/api/*.php` + `backend/config.php` + `backend/data/redeem_codes.json` 到服务器。

## 服务器要求

- Ubuntu 22.04+, Nginx, PHP 8.2+, Docker
- Docker 容器: `evil0ctal/douyin_tiktok_download_api` (端口 8088)
- PHP 禁用函数: exec/shell_exec/proc_open/popen
- open_basedir 限制文件访问

## 验证部署

```bash
# 健康检查
curl -s 'https://YOUR_DOMAIN/api/douyin_parse.php?health'

# 测试 API
curl -X POST 'https://YOUR_DOMAIN/api/douyin_parse.php' \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://v.douyin.com/xxxxx","openid":"test"}'
```
