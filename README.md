# Toolpower (啊对对工具箱)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> 一个功能丰富的微信小程序多功能工具箱，集成 13+ 实用工具。
> A feature-rich WeChat Mini Program toolbox with 13+ utility tools.

---

## Features / 功能特性

| Tool | Description |
|------|-------------|
| 📅 万年历 | 农历节气、节日、宜忌查询 |
| 📏 尺子 | 屏幕测量工具 |
| 🎵 节拍器 | 音频节拍工具 |
| 🖼️ 证件照 | 标准证件照制作，AI 抠图 |
| 📦 图片压缩 | 图片压缩工具 |
| 💧 水印工具 | 添加/去除水印 |
| ✨ 拂去虚纹 | OpenCV 图像修复（Docker） |
| 📊 BMI 计算器 | 身体质量指数 |
| 🎡 转盘决策 | 随机决策转盘 |
| 🔗 链接解析 | 抖音/TikTok 视频解析 |
| 🎨 一键海报 | 39 套节日/节气海报模板 |
| ❤️ 纪念日 | 重要日期追踪与管理 |

---

## Tech Stack / 技术栈

| Layer | Technology |
|-------|-----------|
| **Frontend** | WeChat Mini Program (WXML + WXSS + JavaScript) |
| **Backend** | PHP 8.2+ (Nginx) |
| **AI Service** | Alibaba Cloud Portrait Segmentation |
| **Docker Service** | OpenCV Inpainting (Python Flask) |
| **Video Parsing** | Douyin TikTok Download API (Docker) |
| **Data Storage** | Flat JSON files (file-locked) |

---

## Project Structure / 项目结构

```
Toolpower/
├── app.js / app.json / app.wxss    # 小程序入口 Mini program entry
├── pages/                           # 页面 Pages (13 tools)
├── utils/                           # 工具库 Utilities
│   ├── config.js                    # ⚠️ 本地配置（已 gitignore）Local config
│   └── config.example.js            # 配置模板 Config template
├── components/                      # 公共组件 Shared components
├── backend/                         # 后端 PHP API
│   ├── config.php                   # ⚠️ 本地配置（已 gitignore）Local config
│   ├── config.example.php           # 配置模板 Config template
│   ├── api/                         # API endpoints
│   │   └── admin/                   # 管理后台 Admin panel
│   └── templates/                   # 海报模板 Poster templates
├── docker/                          # Docker services
│   └── inpaint/                     # OpenCV 图像修复服务
├── deploy.ps1 / deploy.sh           # 部署脚本 Deployment scripts
└── deploy_steps.md                  # 部署指南 Deployment guide
```

---

## Quick Start / 快速开始

### Prerequisites / 前置要求

- [WeChat Developer Tools](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- PHP 8.2+ server (Nginx recommended)
- (Optional) Docker for inpainting service

### Frontend Setup / 前端配置

```bash
# 1. 克隆仓库
git clone https://github.com/YOUR_USERNAME/Toolpower.git

# 2. 复制前端配置文件并填入真实值（以下文件已 gitignore，不会提交）
#    Copy frontend config and fill in real values:
cp utils/config.example.js utils/config.js
# 编辑 utils/config.js，将 YOUR_DOMAIN 替换为你的服务器域名
# Edit utils/config.js, replace YOUR_DOMAIN with your server domain

# 3. 在微信开发者工具中导入项目
#    Import project into WeChat Developer Tools
# 4. 在 project.config.json 中设置你的 AppID
#    Set your AppID in project.config.json
```

### Backend Setup / 后端配置

```bash
# 1. 复制后端配置文件并填入真实值
#    Copy backend config and fill in real values:
cp backend/config.example.php backend/config.php
# 编辑 backend/config.php，替换所有 YOUR_* 占位符
# Edit backend/config.php, replace all YOUR_* placeholders

# 2. 复制管理员配置文件
#    Copy admin config:
cp backend/api/admin/config.example.json backend/api/admin/config.json

# 3. 部署到服务器（详见 deploy_steps.md）
#    Deploy to server (see deploy_steps.md for details)
```

### What to Replace / 需要替换的内容

| Placeholder / 占位符 | Where / 位置 | Description / 说明 |
|---|---|---|
| `YOUR_DOMAIN` | `utils/config.js` | 你的后端服务器域名 Your server domain |
| `YOUR_APPID` | `project.config.json` | 微信小程序 AppID |
| `YOUR_APPID` | `backend/config.php` | 微信小程序 AppID |
| `YOUR_APPSECRET` | `backend/config.php` | 微信小程序 AppSecret |
| `YOUR_ALIYUN_KEY_ID` | `backend/config.php` | 阿里云 AccessKey ID |
| `YOUR_ALIYUN_KEY_SECRET` | `backend/config.php` | 阿里云 AccessKey Secret |
| `YOUR_BCRYPT_HASH` | `backend/api/admin/config.json` | 管理员密码哈希 Admin password hash |
| `你的服务器IP` | `deploy.ps1` / `deploy.sh` | 服务器 IP 地址 |

---

## Deployment / 部署指南

See [deploy_steps.md](deploy_steps.md) for detailed deployment instructions.

---

## License / 开源协议

MIT License. See [LICENSE](LICENSE) for details.