const app = getApp();

Page({
  data: {
    // UI状态
    showAdvanced: false,
    
    // 预览交互
    previewScale: 1,
    previewX: 0,
    previewY: 0,
    isInteracting: false,
    
    // 印章配置
    config: {
      companyName: '测试科技有限责任公司',
      centerText: '专用章',
      centerTextTop: false,
      securityCode: '1101050000000',
      fontType: 'song',
      shape: 'circle',
      borderWidth: 5,
      showPattern: true,
      color: '#D4380D',
      opacity: 100,
      showWatermark: false,
      watermarkText: '电子印章 仅供参考'
    },
    
    // 历史栈 (撤销用)
    historyStack: [],
    
    // 预设
    presetColors: ['#D4380D', '#0055AA', '#000000', '#1A5F4A', '#FF0000', '#333333'],
    canUndo: false
  },

  onLoad() {
    this.initCanvas();
    this.pushHistory(); // 初始状态
  },

  // --- 1. UI 交互 ---
  
  toggleAdvanced() {
    this.setData({ showAdvanced: !this.data.showAdvanced });
  },
  
  onInputFocus() {}, 
  onInputBlur() {},

  // --- 2. 核心逻辑：实时渲染 & 撤销 ---

  updateConfig(key, value) {
    if (this.data.config[key] !== value) {
       this.pushHistory();
    }
    this.setData({
      [`config.${key}`]: value
    }, () => {
      this.drawSeal();
    });
  },

  setConfig(e) {
    const { key, value } = e.currentTarget.dataset;
    this.updateConfig(key, value);
    wx.vibrateShort({ type: 'light' });
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key;
    const value = e.detail.value;
    this.setData({ [`config.${key}`]: value });
    this.drawSeal();
  },

  onSliderChange(e) {
      const key = e.currentTarget.dataset.key;
      const value = e.detail.value;
      
      if (e.type === 'changing') {
          this.setData({ [`config.${key}`]: value });
          this.drawSeal();
      } 
      else if (e.type === 'change') {
          this.updateConfig(key, value);
      }
  },
  
  togglePattern(e) {
      this.updateConfig('showPattern', e.detail.value);
  },
  
  toggleWatermark(e) {
      this.updateConfig('showWatermark', e.detail.value);
  },

  // 历史栈管理
  pushHistory() {
      const current = JSON.parse(JSON.stringify(this.data.config));
      const stack = this.data.historyStack;
      stack.push(current);
      if (stack.length > 20) stack.shift(); 
      this.setData({ historyStack: stack, canUndo: stack.length > 1 });
  },
  
  undo() {
      if (this.data.historyStack.length <= 1) return;
      const stack = this.data.historyStack;
      stack.pop(); 
      const prev = stack[stack.length - 1]; 
      
      this.setData({
          config: prev,
          historyStack: stack,
          canUndo: stack.length > 1
      }, () => {
          this.drawSeal();
          wx.vibrateShort({ type: 'medium' });
      });
  },

  // --- 3. 预览区手势交互 ---
  onTouchStart(e) {
    if (e.touches.length === 2) {
      const x1 = e.touches[0].pageX;
      const y1 = e.touches[0].pageY;
      const x2 = e.touches[1].pageX;
      const y2 = e.touches[1].pageY;
      this.startDistance = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
      this.startScale = this.data.previewScale;
      this.setData({ isInteracting: true });
    } else if (e.touches.length === 1) {
      this.startX = e.touches[0].pageX;
      this.startY = e.touches[0].pageY;
      this.startPreviewX = this.data.previewX;
      this.startPreviewY = this.data.previewY;
      this.setData({ isInteracting: true });
    }
  },

  onTouchMove(e) {
    if (e.touches.length === 2) {
      const x1 = e.touches[0].pageX;
      const y1 = e.touches[0].pageY;
      const x2 = e.touches[1].pageX;
      const y2 = e.touches[1].pageY;
      const newDistance = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
      const scale = this.startScale * (newDistance / this.startDistance);
      if (scale >= 0.2 && scale <= 1.5) {
          this.setData({ previewScale: scale });
      }
    } else if (e.touches.length === 1) {
        const dx = e.touches[0].pageX - this.startX;
        const dy = e.touches[0].pageY - this.startY;
        this.setData({
            previewX: this.startPreviewX + dx,
            previewY: this.startPreviewY + dy
        });
    }
  },

  onTouchEnd() {
    this.setData({ isInteracting: false });
  },
  
  resetPreview() {
      this.setData({
          previewScale: 1,
          previewX: 0,
          previewY: 0
      });
      wx.vibrateShort({ type: 'light' });
  },

  // --- 4. Canvas 绘制 ---
  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#sealCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);

        this.canvas = canvas;
        this.ctx = ctx;
        this.dpr = dpr;
        this.drawSeal();
      });
  },

  drawSeal() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    const dpr = this.dpr;
    const w = width / dpr;
    const h = height / dpr;
    const cx = w / 2;
    const cy = h / 2;
    const config = this.data.config;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    
    ctx.strokeStyle = config.color;
    ctx.fillStyle = config.color;
    ctx.lineWidth = config.borderWidth;
    ctx.globalAlpha = config.opacity / 100;
    
    // 文本排版预处理
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    if (config.shape === 'circle') this.drawCircle(ctx, cx, cy, config);
    else if (config.shape === 'oval') this.drawOval(ctx, cx, cy, config);
    else if (config.shape === 'square') this.drawSquare(ctx, cx, cy, config);
    else if (config.shape === 'rhombus') this.drawRhombus(ctx, cx, cy, config);
    else if (config.shape === 'shield') this.drawShield(ctx, cx, cy, config);

    ctx.restore();
  },

  // --- 形状绘制 ---
  
  // 1. 圆形 (保持原逻辑，优化字间距)
  drawCircle(ctx, cx, cy, config) {
    const radius = 100;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.stroke();
    
    if (config.showPattern) {
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, radius - 6, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.lineWidth = config.borderWidth;
    }

    this.drawStar(ctx, cx, cy, 28);
    this.drawCurvedText(ctx, config.companyName, cx, cy, radius - 20, true);
    this.drawCurvedText(ctx, config.securityCode, cx, cy, radius - 20, false);
    
    ctx.font = `bold 18px ${this.getFontFamily(config.fontType)}`;
    const textY = config.centerTextTop ? cy - 50 : cy + 50;
    ctx.fillText(config.centerText, cx, textY);
  },

  // 2. 椭圆 (优化：文字沿椭圆路径排列，非简单压缩)
  drawOval(ctx, cx, cy, config) {
    const rx = 110;
    const ry = 75;
    
    // 绘制椭圆边框
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
    ctx.stroke();
    
    if (config.showPattern) {
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx - 4, ry - 4, 0, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.lineWidth = config.borderWidth;
    }

    // 绘制椭圆弧形文字 (上半部分)
    // 算法：将椭圆弧长分段，计算每段的角度和切线方向
    // 简化实现：使用非均匀分布的角度插值来模拟椭圆路径
    this.drawEllipticalText(ctx, config.companyName, cx, cy, rx - 14, ry - 14, true);


    
    

    // 副文字居中 (几何中心)
    ctx.font = `bold 18px ${this.getFontFamily(config.fontType)}`;
    ctx.fillText(config.centerText, cx, cy);

    // 底部编码
    ctx.font = '12px Helvetica';
    ctx.fillText(config.securityCode, cx, cy + ry - 12);
  },
  
  // 椭圆文字绘制辅助函数
  drawEllipticalText(ctx, text, cx, cy, rx, ry, isTop) {
      if (!text) return;
      ctx.save();
      
      // 字体设置
      const fontSize = 18;
      ctx.font = `bold ${fontSize}px ${this.getFontFamily(this.data.config.fontType)}`;
      
      // 文本压缩：模拟透视
      ctx.scale(1, 0.85); // 纵向压缩 85%
      const scaledCy = cy / 0.85; // 修正中心点Y坐标
      
      // 角度范围：顶部覆盖约 160 度 (-80 到 80 度，相对于 -90 度顶部)
      // 计算每个字符的“椭圆角”
      const totalAngle = Math.PI * 0.9; 
      const startAngle = -Math.PI / 2 - totalAngle / 2;
      const angleStep = totalAngle / (text.length + 1);
      
      for (let i = 0; i < text.length; i++) {
          const char = text[i];
          const theta = startAngle + (i + 1) * angleStep;
          
          // 椭圆参数方程
          // x = rx * cos(theta)
          // y = ry * sin(theta)
          const x = cx + rx * Math.cos(theta);
          const y = scaledCy + ry * Math.sin(theta);
          
          ctx.save();
          ctx.translate(x, y);
          // 旋转角度：切线方向 + 90度
          // tan(alpha) = (ry/rx) * tan(theta)  (椭圆法线斜率倒数相关，这里简化用圆近似修正)
          // 修正：对于文字排列，直接指向圆心可能不够，椭圆需要修正角度
          let rotateAngle = theta + Math.PI / 2;
          
          // 简单的椭圆角度修正
          const dx = -rx * Math.sin(theta);
          const dy = ry * Math.cos(theta);
          rotateAngle = Math.atan2(dy, dx) + Math.PI / 2;

          ctx.rotate(rotateAngle);
          ctx.fillText(char, 0, 0);
          ctx.restore();
      }
      
      ctx.restore();
  },

  // 3. 方形 (保持)
  drawSquare(ctx, cx, cy, config) {
    const size = 180;
    const half = size / 2;
    ctx.strokeRect(cx - half, cy - half, size, size);
    
    if (config.showPattern) {
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - half + 6, cy - half + 6, size - 12, size - 12);
        ctx.lineWidth = config.borderWidth;
    }

    // 自动字号调整
    let fontSize = 20;
    if (config.companyName.length > 8) fontSize = 16;
    if (config.companyName.length > 12) fontSize = 14;
    
    ctx.font = `bold ${fontSize}px ${this.getFontFamily(config.fontType)}`;
    
    // 换行处理
    const maxWidth = size - 20;
    if (ctx.measureText(config.companyName).width > maxWidth) {
         // 简单分行：一半一半
         const mid = Math.ceil(config.companyName.length / 2);
         ctx.fillText(config.companyName.substring(0, mid), cx, cy - 50);
         ctx.fillText(config.companyName.substring(mid), cx, cy - 25);
    } else {
         ctx.fillText(config.companyName, cx, cy - 40);
    }
    
    ctx.font = `bold 24px ${this.getFontFamily(config.fontType)}`;
    ctx.fillText(config.centerText, cx, cy + 20);
    ctx.font = '12px Helvetica';
    ctx.fillText(config.securityCode, cx, cy + 70);
  },
  
  // 4. 菱形 (优化：圆角菱形，上下三角布局)
  drawRhombus(ctx, cx, cy, config) {
      const w = 240; // 宽
      const h = 160; // 高
      const r = 10; // 圆角半径
      
      // 绘制圆角菱形路径
      ctx.beginPath();
      ctx.moveTo(cx, cy - h/2 + r); // 顶
      ctx.quadraticCurveTo(cx, cy - h/2, cx + r * (w/h), cy - h/2 + r); // 顶角圆弧处理略复杂，简化为直线连接后用 lineJoin='round'
      
      // 使用 lineJoin 实现圆角
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, cy - h/2);
      ctx.lineTo(cx + w/2, cy);
      ctx.lineTo(cx, cy + h/2);
      ctx.lineTo(cx - w/2, cy);
      ctx.closePath();
      ctx.stroke();
      ctx.lineJoin = 'miter'; // 恢复
      
      // 内花纹
      if (config.showPattern) {
          ctx.lineWidth = 1;
          ctx.beginPath();
          const gap = 6;
          ctx.moveTo(cx, cy - h/2 + gap);
          ctx.lineTo(cx + w/2 - gap, cy);
          ctx.lineTo(cx, cy + h/2 - gap);
          ctx.lineTo(cx - w/2 + gap, cy);
          ctx.closePath();
          ctx.stroke();
          ctx.lineWidth = config.borderWidth;
      }
      
      // 五角星：严格居中
      // 大小：短对角线(h)的 1/5 = 32
      this.drawStar(ctx, cx, cy, h / 5);
      
      // 文字布局：上下三角
      // 上三角：公司名
      ctx.font = `bold 16px ${this.getFontFamily(config.fontType)}`;
      // 沿两条边排列太复杂，改为上方水平居中，但做字间距调整
      // 或者分为两行
      const splitIndex = Math.ceil(config.companyName.length / 2);
      const part1 = config.companyName.substring(0, splitIndex);
      const part2 = config.companyName.substring(splitIndex);
      
      // 简单的上下分布
      ctx.fillText(config.companyName, cx, cy - h/4 - 10);
      
      // 下三角：公司类型/副文字
      ctx.font = `bold 16px ${this.getFontFamily(config.fontType)}`;
      // 如果公司名很长，这里显示有限责任公司
      // 这里根据需求，下三角放 "有限责任公司" 或 副文字
      // 假设副文字放中间五角星下方，或者下三角区域
      ctx.fillText(config.centerText, cx, cy + h/4 + 20);
      
      // 编码
      ctx.font = '10px Helvetica';
      ctx.fillText(config.securityCode, cx, cy + h/2 - 15);
  },
  
  // 5. 盾形 (优化：比例，防溢出)
  drawShield(ctx, cx, cy, config) {
      const w = 180;
      const h = 216; // 1:1.2
      const topH = h * 0.3; // 顶部平直区域 30%
      
      // 绘制盾牌
      ctx.beginPath();
      // 左上
      ctx.moveTo(cx - w/2, cy - h/2);
      // 右上
      ctx.lineTo(cx + w/2, cy - h/2);
      // 右侧平直
      ctx.lineTo(cx + w/2, cy - h/2 + topH);
      // 右下圆弧
      ctx.bezierCurveTo(cx + w/2, cy + h/2, cx, cy + h/2, cx, cy + h/2);
      // 左下圆弧
      ctx.bezierCurveTo(cx, cy + h/2, cx - w/2, cy + h/2, cx - w/2, cy - h/2 + topH);
      // 左侧平直
      ctx.lineTo(cx - w/2, cy - h/2);
      ctx.closePath();
      ctx.stroke();
      
      // 内花纹
      if (config.showPattern) {
           ctx.lineWidth = 1;
           const gap = 5;
           ctx.beginPath();
           ctx.moveTo(cx - w/2 + gap, cy - h/2 + gap);
           ctx.lineTo(cx + w/2 - gap, cy - h/2 + gap);
           ctx.lineTo(cx + w/2 - gap, cy - h/2 + topH);
           ctx.bezierCurveTo(cx + w/2 - gap, cy + h/2 - gap, cx, cy + h/2 - gap, cx, cy + h/2 - gap);
           ctx.bezierCurveTo(cx, cy + h/2 - gap, cx - w/2 + gap, cy + h/2 - gap, cx - w/2 + gap, cy - h/2 + topH);
           ctx.lineTo(cx - w/2 + gap, cy - h/2 + gap);
           ctx.stroke();
           ctx.lineWidth = config.borderWidth;
      }
      
      // 五角星：居中
      this.drawStar(ctx, cx, cy, w / 4);
      
      // 公司名：自动字号压缩
      let fontSize = 24;
      ctx.font = `bold ${fontSize}px ${this.getFontFamily(config.fontType)}`;
      const maxTextW = w - 30; // 安全边距
      
      // 级联降级
      while (ctx.measureText(config.companyName).width > maxTextW && fontSize > 12) {
          fontSize -= 2;
          ctx.font = `bold ${fontSize}px ${this.getFontFamily(config.fontType)}`;
      }
      
      // 如果还是太宽，分两行
      if (ctx.measureText(config.companyName).width > maxTextW) {
          fontSize = 16;
          ctx.font = `bold ${fontSize}px ${this.getFontFamily(config.fontType)}`;
          const mid = Math.ceil(config.companyName.length / 2);
          ctx.fillText(config.companyName.substring(0, mid), cx, cy - h/2 + 40);
          ctx.fillText(config.companyName.substring(mid), cx, cy - h/2 + 60);
      } else {
          ctx.fillText(config.companyName, cx, cy - h/2 + 50);
      }
      
      // 副文字：下移
      ctx.font = `bold 18px ${this.getFontFamily(config.fontType)}`;
      ctx.fillText(config.centerText, cx, cy + h/3);
  },

  drawStar(ctx, x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = this.data.config.color; // 确保与边框同色
    ctx.beginPath();
    const dig = Math.PI / 5 * 4;
    for (let i = 0; i < 5; i++) {
      const x = Math.sin(i * dig);
      const y = Math.cos(i * dig);
      ctx.lineTo(x * r, -y * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  drawCurvedText(ctx, text, cx, cy, radius, isTop, totalAngleOverride) {
    if (!text) return;
    ctx.save();
    
    // 动态字间距
    let spacing = 0;
    if (text.length <= 6) spacing = 0.2; // 短文本加宽
    if (text.length >= 12) spacing = -0.1; // 长文本压缩
    
    // 字体大小自动调整
    let fontSize = 20;
    if (text.length > 12) fontSize = 16;
    ctx.font = `bold ${fontSize}px ${this.getFontFamily(this.data.config.fontType)}`;
    
    const totalAngle = totalAngleOverride || (isTop ? Math.PI * 0.8 : Math.PI * 0.5);
    // 考虑字间距调整角度
    const anglePerChar = (totalAngle / (text.length + 1)) * (1 + spacing);
    
    const startAngle = isTop 
        ? -Math.PI / 2 - (anglePerChar * (text.length - 1)) / 2
        : Math.PI / 2 - (anglePerChar * (text.length - 1)) / 2;
    
    for (let i = 0; i < text.length; i++) {
      ctx.save();
      const angle = startAngle + i * anglePerChar;
      ctx.translate(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      if (isTop) ctx.rotate(angle + Math.PI / 2);
      else ctx.rotate(angle - Math.PI / 2);
      ctx.fillText(text[i], 0, 0);
      ctx.restore();
    }
    ctx.restore();
  },

  getFontFamily(type) {
      switch(type) {
          case 'song': return 'SimSun, "Songti SC"';
          case 'hei': return 'SimHei, "Heiti SC", sans-serif';
          case 'kai': return 'KaiTi, "Kaiti SC"';
          default: return 'sans-serif';
      }
  },

  // --- 保存 ---
  saveImage() {
    wx.vibrateShort({ type: 'medium' });
    wx.canvasToTempFilePath({
      canvas: this.canvas,
      width: 300,
      height: 300,
      destWidth: 1000,
      destHeight: 1000,
      success: (res) => {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
             // 弹出分享引导
             wx.showModal({
                 title: '保存成功',
                 content: '印章已保存到相册。是否去分享给好友？',
                 confirmText: '去分享',
                 confirmColor: '#1A5F4A',
                 success: (r) => {
                     if (r.confirm) {
                         wx.showToast({ title: '请点击右上角分享', icon: 'none' });
                     }
                 }
             });
          },
          fail: () => wx.showToast({ title: '保存失败', icon: 'none' })
        });
      }
    });
  },
  
  showSaveOptions() {
      wx.showActionSheet({
          itemList: ['保存高清透明版 (PNG)', '保存带背景版 (JPG)'],
          success: (res) => {
              if (res.tapIndex === 0) this.saveImage();
              else wx.showToast({ title: '带背景版开发中', icon: 'none' });
          }
      });
  },

  onShareAppMessage() {
      return {
          title: '制作我的电子印章',
          path: '/pages/electronic-seal/electronic-seal'
      };
  }
});