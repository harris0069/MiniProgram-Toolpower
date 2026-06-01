# Toolpower UI 设计系统

## 一、核心 Token

### 1.1 颜色

```css
/* 全局变量 (app.wxss) */
--primary-color: #1677FF;   /* 微信蓝 */
--orange-color:  #FF7D00;   /* 节气/重点标记 */
--red-color:     #F53F3F;   /* 节假日/警示 */
--warn-color:    #F53F3F;
--text-color:    #333333;   /* 主文本 */
--sub-text-color:#666666;   /* 次要文本 */
--bg-color:      #F5F5F5;  /* 页面背景 */
--border-color:  #f0f0f0;  /* 边框 */
```

| 用途 | 色值 | 备注 |
|---|---|---|
| 页面背景 | `#F5F5F5` (浅灰) | 1-2 级灰度示意 |
| 白色卡片 | `#FFFFFF` | 通用 |
| 主文本 | `#333333` | 标题 / 正文 |
| 次要文本 | `#666666` | 正文 / 标签 |
| 弱提示 | `#999999` | 说明 / 占位符 |
| 弱化文本 | `#BFBFBF` | 极弱/禁用 |
| 边框 | `#f0f0f0` | 分割线 / 卡片边框 |
| 输入框背景 | `#F8F8F8` / `#f5f5f5` | 表单字段 |
| 错误提示背景 | `#FFF0F0` | 错误框 |
| 错误提示文字 | `#E74C3C` | 错误文字 |
| 警告提示背景 | `#FFF8E1` / `#FFF9E6` | 声明/免责 |
| 警告提示文字 | `#B8860B` / `#F57C00` | 警告文字 |

### 1.2 间距

| Token | 值 | 用途 |
|---|---|---|
| `--space-xs` | `8rpx` | 紧凑间距 |
| `--space-sm` | `12rpx` | 常用元素间距 |
| `--space-md` | `16rpx` | 按钮组 / 选项间距 |
| `--space-lg` | `20rpx` | 卡片间距 / section 间距 |
| `--space-xl` | `24rpx` | 卡片内边距 |
| `--space-2xl` | `30rpx` | 页面左右边距 / 大卡片内边距 |
| `--space-3xl` | `32rpx` | 表单项 padding |
| `--space-4xl` | `40rpx` | 强调区域 padding |

**页面边距规范：** 容器 `padding: 0 30rpx` 或 `padding: 20rpx 30rpx`

### 1.3 圆角

| Token | 值 | 用途 |
|---|---|---|
| `--radius-sm` | `8rpx` | 标签、小元素 |
| `--radius-md` | `12rpx` | 输入框、选项卡片 |
| `--radius-lg` | `16rpx` | 卡片、弹窗、区域 |
| `--radius-xl` | `20rpx` | 大卡片、场景卡片 |
| `--radius-round` | `999rpx` / `50%` | 圆形头像、按钮、色块 |

### 1.4 字体

| Token | 值 | 用途 |
|---|---|---|
| `--font-h1` | `32rpx`（16px） | 页面标题 |
| `--font-h2` | `30rpx`（15px） | 卡片标题 |
| `--font-body` | `28rpx`（14px） | 正文 |
| `--font-caption` | `26rpx`（13px） | 输入文字、按钮文字 |
| `--font-small` | `24rpx`（12px） | 辅助说明、标签 |
| `--font-tiny` | `22rpx`（11px） | 极小文字 |

**字重：** `400` 正常 / `500` 中等 / `600` 加粗

**字族：** `-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Heiti SC", sans-serif`

### 1.5 阴影

| Token | 值 | 用途 |
|---|---|---|
| `--shadow-sm` | `0 2rpx 8rpx rgba(0,0,0,0.04)` | 卡片轻微阴影 |
| `--shadow-md` | `0 4rpx 12rpx rgba(0,0,0,0.06)` | 普通阴影 |
| `--shadow-lg` | `0 8rpx 24rpx rgba(0,0,0,0.10)` | 弹出层 / 强调阴影 |
| `--shadow-xl` | `0 12rpx 40rpx rgba(0,0,0,0.15)` | 模态 / 顶层 |

**按钮阴影（带主题色）：** `0 8rpx 24rpx rgba(主色, 0.3~0.4)`

---

## 二、组件规范

### 2.1 导航栏

```html
<navigation-bar title="页面标题" back="{{true}}" color="black" background="#FFF"></navigation-bar>
```

- 高度: iOS `44px` + safe-top, Android `48px` + safe-top
- 标题字号: `17px`, 字重 `bold`
- 所有页面使用 `"navigationStyle": "custom"`

### 2.2 按钮

**主按钮：**
```css
.btn-primary {
  height: 88rpx;
  line-height: 88rpx;
  border-radius: var(--radius-sm);
  font-size: 16px;
  color: #FFFFFF;
  background: var(--primary-color);   /* 或渐变 */
  box-shadow: 0 4rpx 12rpx rgba(主色, 0.3);
  transition: all 0.2s;
}
.btn-primary:active { opacity: 0.7; transform: scale(0.96); }
```

**次要按钮：**
```css
.btn-secondary {
  height: 88rpx;
  line-height: 88rpx;
  border-radius: var(--radius-sm);
  font-size: 16px;
  color: #666;
  background: #f5f5f5;
  border: 2rpx solid #d9d9d9;
}
```

**禁用状态：** `opacity: 0.5; pointer-events: none`

**按钮大小：**
| 类型 | 高度 |
|---|---|
| 全局按钮 | `88rpx` |
| 大按钮（强调） | `96rpx` |
| 中小按钮 | `64rpx` ~ `80rpx` |

### 2.3 卡片

```css
.card {
  background: #FFFFFF;
  border-radius: var(--radius-xl);   /* 20rpx */
  padding: var(--space-xl);          /* 24rpx */
  margin-bottom: var(--space-lg);    /* 20rpx */
  box-shadow: var(--shadow-sm);
}
```

注意：`link-parse` 页面用 `#f8f9fa` 背景，其余页面统一白色。

### 2.4 输入框

```css
.input {
  height: 88rpx;
  padding: 0 var(--space-lg);
  border-radius: var(--radius-md);   /* 12rpx */
  background: #F8F8F8;
  font-size: var(--font-caption);
  border: 2rpx solid #e0e0e0;
  box-sizing: border-box;
}
.input:focus { border-color: var(--primary-color); }
```

### 2.5 错误提示框

```css
.error-box {
  padding: var(--space-lg);
  background: #FFF0F0;
  border-radius: var(--radius-md);
  font-size: var(--font-caption);
  color: #E74C3C;
}
```

### 2.6 声明/法律提示框

```css
.disclaimer {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-lg);
  background: #FFF8E1;
  border-radius: var(--radius-lg);
  font-size: var(--font-small);
  color: #B8860B;
  line-height: 1.5;
}
```

---

## 三、页面主题色板

| 页面 | 主题色 | 渐变 | 页面背景 |
|---|---|---|---|
| 首页 index | `#5B3A8C` 紫 | -- | `#FFF9F0` |
| 链接解析 link-parse | `#7EC8E3` 蓝 | `#A8D8EA` → `#7EC8E3` | `#FFFFFF` |
| 转盘 wheel-decision | `#FF6B6B` 红 | `#FF6B6B` → `#FF8E8E` | `#f5f5f5` |
| 节拍器 metronome | `#1A5F4A` 深绿 | -- | `#F8F7F4` |
| 水印 watermark | `#4A90D9` 蓝 | -- | `#F7F8FA` |
| 证件照 id-photo | `--primary-color` 深绿 | -- | `var(--bg-color)` |
| 纪念日 anniversary | `#FF6B9D` 粉 | `#FF6B9D` → `#FF8FB3` | `#FFF5F8` 渐变 |
| 图片压缩 image-compress | `#07c160` 微信绿 | -- | `#f5f5f5` |
| 日历 calendar | `#E85D4C` 珊瑚红 | -- | `#F7F6F3` |
| BMI | `#D4B98C` 金 | -- | 跟随 metronome |
| 尺子 ruler | `var(--primary-color)` 蓝 | -- | `#f5f5f5` |

---

## 四、通用规范

1. **安全区域：** 所有页面底部使用 `padding-bottom: calc(env(safe-area-inset-bottom))`
2. **动效时长：** 基础 `200ms`, 快 `150ms`, 慢 `300ms`, 缓动 `ease-out`
3. **加载动画：** fadeIn, fadeInUp, slideUp 三种常用入场
4. **Slider 滑块：** `block-size="28"`, 主题色 `activeColor`
5. **Switch 开关：** `color` 传入主题色
6. **封面/图片占位：** 加载失败时显示 56rpx 图标 + 24rpx 灰色文字
7. **不可用选项：** `opacity: 0.35; text-decoration: line-through; pointer-events: none`
8. **页面容器：** `class="container"` 自带 safe-area 适配
