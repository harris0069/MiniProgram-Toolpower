const app = getApp();

// 常见设备屏幕尺寸数据库（单位：英寸）
const DEVICE_SCREEN_SIZE = {
  // iPhone
  'iPhone 14 Pro Max': 6.7,
  'iPhone 14 Pro': 6.1,
  'iPhone 14 Plus': 6.7,
  'iPhone 14': 6.1,
  'iPhone 13 Pro Max': 6.7,
  'iPhone 13 Pro': 6.1,
  'iPhone 13': 6.1,
  'iPhone 13 mini': 5.4,
  'iPhone 12 Pro Max': 6.7,
  'iPhone 12 Pro': 6.1,
  'iPhone 12': 6.1,
  'iPhone 12 mini': 5.4,
  'iPhone 11 Pro Max': 6.5,
  'iPhone 11 Pro': 5.8,
  'iPhone 11': 6.1,
  'iPhone XS Max': 6.5,
  'iPhone XS': 5.8,
  'iPhone XR': 6.1,
  'iPhone X': 5.8,
  // 华为
  'HUAWEI Mate 50 Pro': 6.74,
  'HUAWEI Mate 40 Pro': 6.76,
  'HUAWEI P50 Pro': 6.6,
  'HUAWEI P40 Pro': 6.58,
  // 小米
  'MI 13 Pro': 6.73,
  'MI 12 Pro': 6.73,
  'MI 11': 6.81,
  // OPPO
  'OPPO Find X5 Pro': 6.7,
  'OPPO Find X3 Pro': 6.7,
  // vivo
  'vivo X90 Pro': 6.78,
  'vivo X80 Pro': 6.78
};

Page({
  data: {
    // 尺子方向：horizontal / vertical
    orientation: 'horizontal',
    
    // 单位：cm / inch
    unit: 'cm',
    
    // 屏幕信息
    screenWidth: 0,
    screenHeight: 0,
    pixelRatio: 1,
    
    // 计算出的每毫米像素数
    pxPerMm: 0,
    
    // 是否锁定屏幕
    isLocked: false,
    
    // 彩蛋相关
    slideCount: 0,
    showEasterEgg: false,
    easterEggText: '',
    
    // Canvas 相关
    canvasWidth: 0,
    canvasHeight: 0
  },

  onLoad() {
    this.initScreen();
  },

  onReady() {
    this.drawRuler();
  },

  // 初始化屏幕信息
  initScreen() {
    const sysInfo = wx.getWindowInfo();
    const deviceInfo = wx.getDeviceInfo();
    
    const screenWidth = sysInfo.screenWidth;
    const screenHeight = sysInfo.screenHeight;
    const pixelRatio = sysInfo.pixelRatio || 2;
    
    // 使用微信提供的实际物理像素密度
    // pixelRatio 就是设备的像素比，可以直接用来计算 PPI
    // 标准做法：使用 CSS 像素和物理像素的关系
    
    // 计算屏幕对角线的物理像素
    const diagonalPhysicalPx = Math.sqrt(
      Math.pow(screenWidth * pixelRatio, 2) +
      Math.pow(screenHeight * pixelRatio, 2)
    );
    
    // 尝试从设备型号获取准确的屏幕尺寸
    const model = deviceInfo.model || '';
    let screenSizeInch = this.getScreenSizeFromModel(model);
    
    // 如果无法识别设备，使用更精确的估算算法
    if (screenSizeInch === 0) {
      // 根据物理像素密度和分辨率进行更准确的估算
      // 现代手机的 PPI 通常在 300-500 之间
      
      // 使用屏幕宽度和 pixelRatio 来估算
      const physicalWidth = screenWidth * pixelRatio;
      
      if (physicalWidth >= 1440) {
        // 2K 及以上分辨率
        screenSizeInch = 6.5;
      } else if (physicalWidth >= 1080) {
        // 1080p 分辨率
        screenSizeInch = 6.1;
      } else if (physicalWidth >= 828) {
        // 828p 分辨率（iPhone 11 等）
        screenSizeInch = 6.1;
      } else if (physicalWidth >= 750) {
        // 750p 分辨率（iPhone 6/7/8 等）
        screenSizeInch = 4.7;
      } else {
        // 更低分辨率
        screenSizeInch = 5.5;
      }
    }
    
    // 计算 PPI（每英寸像素数）
    const ppi = diagonalPhysicalPx / screenSizeInch;
    
    // 计算每毫米的 CSS 像素数（注意：这里用 CSS 像素，不是物理像素）
    // 1 英寸 = 25.4 毫米
    const pxPerMm = (ppi / 25.4) / pixelRatio;
    
    this.setData({
      screenWidth,
      screenHeight,
      pixelRatio,
      pxPerMm,
      canvasWidth: screenWidth,
      canvasHeight: screenHeight
    });
  },

  // 从设备型号获取屏幕尺寸
  getScreenSizeFromModel(model) {
    // 精确匹配
    if (DEVICE_SCREEN_SIZE[model]) {
      return DEVICE_SCREEN_SIZE[model];
    }
    
    // 模糊匹配
    for (let deviceName in DEVICE_SCREEN_SIZE) {
      // 移除空格和特殊字符进行比较
      const normalizedModel = model.replace(/[\s-_]/g, '').toLowerCase();
      const normalizedDevice = deviceName.replace(/[\s-_]/g, '').toLowerCase();
      
      if (normalizedModel.includes(normalizedDevice) || normalizedDevice.includes(normalizedModel)) {
        return DEVICE_SCREEN_SIZE[deviceName];
      }
    }
    
    return 0;
  },

  // 检测设备型号（简化版，主要用于显示提示）
  detectDevice() {
    const sysInfo = wx.getDeviceInfo();
    const model = sysInfo.model || '';
    
    // 检查是否匹配到已知设备
    for (let deviceName in DEVICE_SCREEN_SIZE) {
      if (model.includes(deviceName) || deviceName.includes(model)) {
        wx.showToast({
          title: `已识别: ${deviceName}`,
          icon: 'none',
          duration: 2000
        });
        return;
      }
    }
    
    // 未匹配到，提示用户校准
    wx.showToast({
      title: '建议使用校准功能',
      icon: 'none',
      duration: 2000
    });
  },

  // 绘制尺子
  drawRuler() {
    const query = wx.createSelectorQuery();
    query.select('#rulerCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) return;
        
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        
        const dpr = this.data.pixelRatio;
        const width = this.data.canvasWidth;
        const height = this.data.canvasHeight;
        
        // 设置 Canvas 实际大小
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        
        // 缩放绘图上下文
        ctx.scale(dpr, dpr);
        
        // 清空画布
        ctx.clearRect(0, 0, width, height);
        
        // 绘制背景
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, width, height);
        
        // 绘制尺子
        if (this.data.orientation === 'horizontal') {
          this.drawHorizontalRuler(ctx, width, height);
        } else {
          this.drawVerticalRuler(ctx, width, height);
        }
      });
  },

  // 绘制横向尺子
  drawHorizontalRuler(ctx, width, height) {
    const pxPerMm = this.data.pxPerMm;
    const unit = this.data.unit;
    
    // 尺子高度
    const rulerHeight = 120;
    // 紧贴顶部边缘（留出导航栏空间，约 88rpx = 44px）
    const startY = 50;
    
    // 绘制尺子背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, startY, width, rulerHeight);
    
    // 绘制边框
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, startY, width, rulerHeight);
    
    // 绘制顶部边缘指示线（红色虚线）
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, startY);
    ctx.lineTo(width, startY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // 添加边缘标识
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('← 0 (屏幕边缘)', 10, startY - 10);
    
    // 绘制刻度
    ctx.strokeStyle = '#333';
    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    
    if (unit === 'cm') {
      // 厘米刻度
      const pxPerCm = pxPerMm * 10;
      const maxCm = Math.ceil(width / pxPerCm);
      
      for (let i = 0; i <= maxCm * 10; i++) {
        const x = i * pxPerMm;
        if (x > width) break;
        
        if (i % 10 === 0) {
          // 厘米刻度（长）
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, startY);
          ctx.lineTo(x, startY + 40);
          ctx.stroke();
          
          // 标注数字（跳过 0，避免与边缘标识重叠）
          if (i > 0) {
            ctx.fillText((i / 10).toString(), x, startY + 55);
          }
        } else if (i % 5 === 0) {
          // 5毫米刻度（中）
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x, startY);
          ctx.lineTo(x, startY + 25);
          ctx.stroke();
        } else {
          // 1毫米刻度（短）
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, startY);
          ctx.lineTo(x, startY + 15);
          ctx.stroke();
        }
      }
      
      // 绘制单位标识
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('cm', width - 10, startY + rulerHeight - 20);
      
    } else {
      // 英寸刻度
      const pxPerInch = pxPerMm * 25.4;
      const maxInch = Math.ceil(width / pxPerInch);
      
      for (let i = 0; i <= maxInch * 16; i++) {
        const x = i * (pxPerInch / 16);
        if (x > width) break;
        
        if (i % 16 === 0) {
          // 英寸刻度（长）
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, startY);
          ctx.lineTo(x, startY + 40);
          ctx.stroke();
          
          // 标注数字（跳过 0）
          if (i > 0) {
            ctx.fillText((i / 16).toString(), x, startY + 55);
          }
        } else if (i % 8 === 0) {
          // 1/2 英寸刻度（中）
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x, startY);
          ctx.lineTo(x, startY + 30);
          ctx.stroke();
        } else if (i % 4 === 0) {
          // 1/4 英寸刻度
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x, startY);
          ctx.lineTo(x, startY + 20);
          ctx.stroke();
        } else {
          // 1/16 英寸刻度（短）
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, startY);
          ctx.lineTo(x, startY + 10);
          ctx.stroke();
        }
      }
      
      // 绘制单位标识
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('inch', width - 10, startY + rulerHeight - 20);
    }
  },

  // 绘制纵向尺子
  drawVerticalRuler(ctx, width, height) {
    const pxPerMm = this.data.pxPerMm;
    const unit = this.data.unit;
    
    // 尺子宽度
    const rulerWidth = 120;
    // 紧贴右侧边缘
    const startX = width - rulerWidth;
    
    // 绘制尺子背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(startX, 0, rulerWidth, height);
    
    // 绘制边框
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX, 0, rulerWidth, height);
    
    // 绘制右侧边缘指示线（红色虚线）- 0刻度线在屏幕右边缘
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(width, 0);
    ctx.lineTo(width, height);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // 添加边缘标识（0刻度在右侧屏幕边缘）- 竖排文字，从上往下
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 14px sans-serif';
    ctx.save();
    
    // 在尺子左侧空白区域显示提示文字
    const labelX = startX / 2;  // 空白区域中央
    const labelY = 50;           // 从顶部开始
    
    // 竖排显示每个字符，箭头在最上方指向0刻度起始位置
    const text = '↑0刻度在右侧边缘';
    const chars = text.split('');
    const lineHeight = 20;  // 字符间距
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    chars.forEach((char, index) => {
      ctx.fillText(char, labelX, labelY + index * lineHeight);
    });
    
    ctx.restore();
    
    // 绘制刻度（从右向左递增，刻度线从左向右延伸到屏幕边缘）
    ctx.strokeStyle = '#333';
    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    
    if (unit === 'cm') {
      // 厘米刻度
      const pxPerCm = pxPerMm * 10;
      const maxCm = Math.ceil(height / pxPerCm);
      
      for (let i = 0; i <= maxCm * 10; i++) {
        const y = i * pxPerMm;
        if (y > height) break;
        
        if (i % 10 === 0) {
          // 厘米刻度（长）- 从左侧向右延伸到屏幕边缘
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(width - 40, y);  // 起点：距离屏幕边缘40px
          ctx.lineTo(width, y);       // 终点：屏幕边缘
          ctx.stroke();
          
          // 标注数字（跳过 0）- 数字在刻度左侧，旋转180度
          if (i > 0) {
            ctx.save();
            ctx.translate(width - 55, y);
            ctx.rotate(Math.PI / 2);  // 旋转90度（顺时针），相当于文字180度翻转
            ctx.fillText((i / 10).toString(), 0, 0);
            ctx.restore();
          }
        } else if (i % 5 === 0) {
          // 5毫米刻度（中）
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(width - 25, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        } else {
          // 1毫米刻度（短）
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(width - 15, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      }
      
      // 绘制单位标识（旋转180度）
      ctx.font = 'bold 16px sans-serif';
      ctx.save();
      ctx.translate(startX + 30, height - 20);
      ctx.rotate(Math.PI / 2);  // 旋转90度（顺时针）
      ctx.textAlign = 'right';
      ctx.fillText('cm', 0, 0);
      ctx.restore();
      
    } else {
      // 英寸刻度
      const pxPerInch = pxPerMm * 25.4;
      const maxInch = Math.ceil(height / pxPerInch);
      
      for (let i = 0; i <= maxInch * 16; i++) {
        const y = i * (pxPerInch / 16);
        if (y > height) break;
        
        if (i % 16 === 0) {
          // 英寸刻度（长）- 从左侧向右延伸到屏幕边缘
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(width - 40, y);
          ctx.lineTo(width, y);
          ctx.stroke();
          
          // 标注数字（跳过 0）- 旋转180度
          if (i > 0) {
            ctx.save();
            ctx.translate(width - 55, y);
            ctx.rotate(Math.PI / 2);  // 旋转90度（顺时针）
            ctx.fillText((i / 16).toString(), 0, 0);
            ctx.restore();
          }
        } else if (i % 8 === 0) {
          // 1/2 英寸刻度（中）
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(width - 30, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        } else if (i % 4 === 0) {
          // 1/4 英寸刻度
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(width - 20, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        } else {
          // 1/16 英寸刻度（短）
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(width - 10, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      }
      
      // 绘制单位标识（旋转180度）
      ctx.font = 'bold 16px sans-serif';
      ctx.save();
      ctx.translate(startX + 30, height - 20);
      ctx.rotate(Math.PI / 2);  // 旋转90度（顺时针）
      ctx.textAlign = 'right';
      ctx.fillText('inch', 0, 0);
      ctx.restore();
    }
  },

  // 切换方向
  toggleOrientation() {
    if (this.data.isLocked) return;
    
    this.setData({
      orientation: this.data.orientation === 'horizontal' ? 'vertical' : 'horizontal'
    });
    
    this.drawRuler();
    this.checkEasterEgg();
  },

  // 切换单位
  toggleUnit() {
    if (this.data.isLocked) return;
    
    this.setData({
      unit: this.data.unit === 'cm' ? 'inch' : 'cm'
    });
    
    this.drawRuler();
  },

  // 锁定/解锁屏幕
  toggleLock() {
    this.setData({
      isLocked: !this.data.isLocked
    });
    
    wx.showToast({
      title: this.data.isLocked ? '已锁定' : '已解锁',
      icon: 'success',
      duration: 1000
    });
  },

  // 检查彩蛋
  checkEasterEgg() {
    const slideCount = this.data.slideCount + 1;
    this.setData({ slideCount });
    
    if (slideCount === 10) {
      const easterEggTexts = [
        '量半天量了个寂寞，啊对对对，你说的都对😏',
        '量来量去还是那么长，啊对对对👀',
        '你这是在测量还是在玩我？啊对对对🤪',
        '量了10次了，累不累啊？啊对对对😴',
        '恭喜你发现了彩蛋！啊对对对🎉'
      ];
      
      const randomText = easterEggTexts[Math.floor(Math.random() * easterEggTexts.length)];
      
      this.setData({
        showEasterEgg: true,
        easterEggText: randomText,
        slideCount: 0
      });
      
      // 3秒后隐藏彩蛋
      setTimeout(() => {
        this.setData({ showEasterEgg: false });
      }, 3000);
      
      // 震动反馈
      try {
        wx.vibrateShort({ type: 'heavy' });
      } catch (e) {}
    }
  },

  // 分享配置
  onShareAppMessage() {
    return {
      title: '尺子工具 - 随时随地测量',
      path: '/pages/ruler/index',
      imageUrl: ''
    };
  },

  onShareTimeline() {
    return {
      title: '尺子工具 - 随时随地测量'
    };
  }
});
