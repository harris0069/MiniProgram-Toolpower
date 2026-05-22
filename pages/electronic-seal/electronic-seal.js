Page({
  data: {
    // 当前形状
    currentShape: 'circle',
    
    // 文字内容
    outerText: 'XX科技有限公司',
    centerText: '合同专用章',
    line1Text: '公司名称',
    line2Text: '部门名称',
    line3Text: '专用章',
    
    // 样式参数
    sealColor: '#DE2910',
    fontSize: 100,
    borderWidth: 2,
    
    // UI 状态
    showHelpModal: false
  },

  // Canvas 实例
  canvas: null,
  ctx: null,
  canvasSize: 600, // 输出尺寸

  onLoad() {
    // 首次进入显示帮助
    this.setData({ showHelpModal: true });
  },

  onReady() {
    this.initCanvas();
  },

  // 初始化 Canvas
  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#sealCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res && res[0] && res[0].node) {
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          
          const dpr = wx.getWindowInfo().pixelRatio || 2;
          canvas.width = this.canvasSize * dpr;
          canvas.height = this.canvasSize * dpr;
          ctx.scale(dpr, dpr);
          
          this.canvas = canvas;
          this.ctx = ctx;
          
          // 绘制初始印章
          this.drawSeal();
        }
      });
  },

  // 绘制印章
  drawSeal() {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const size = this.canvasSize;
    const centerX = size / 2;
    const centerY = size / 2;

    // 清空画布
    ctx.clearRect(0, 0, size, size);

    // 设置样式
    ctx.strokeStyle = this.data.sealColor;
    ctx.fillStyle = this.data.sealColor;
    ctx.lineWidth = this.data.borderWidth;

    // 根据形状绘制
    switch (this.data.currentShape) {
      case 'circle':
        this.drawCircleSeal(ctx, centerX, centerY);
        break;
      case 'oval':
        this.drawOvalSeal(ctx, centerX, centerY, false);
        break;
      case 'oval-h':
        this.drawOvalSeal(ctx, centerX, centerY, true);
        break;
      case 'square':
        this.drawSquareSeal(ctx, centerX, centerY);
        break;
      case 'rect':
        this.drawRectSeal(ctx, centerX, centerY);
        break;
    }
  },

  // 绘制圆形印章
  drawCircleSeal(ctx, cx, cy) {
    const radius = 220;
    const innerRadius = 180;
    
    // 绘制外圈
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // 绘制内圈
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    ctx.stroke();

    // 绘制外圈文字（弧形排列）
    if (this.data.outerText) {
      this.drawArcText(ctx, this.data.outerText, cx, cy, radius - 25, Math.PI * 0.65);
    }

    // 绘制中心文字
    if (this.data.centerText) {
      const fontSize = 36 * (this.data.fontSize / 100);
      ctx.font = `bold ${fontSize}px "SimSun", serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // 如果中心文字较长，分两行显示
      if (this.data.centerText.length > 5) {
        const half = Math.ceil(this.data.centerText.length / 2);
        const line1 = this.data.centerText.substring(0, half);
        const line2 = this.data.centerText.substring(half);
        ctx.fillText(line1, cx, cy - fontSize / 2);
        ctx.fillText(line2, cx, cy + fontSize / 2);
      } else {
        ctx.fillText(this.data.centerText, cx, cy + 10);
      }
    }

    // 绘制五角星
    this.drawStar(ctx, cx, cy - 70, 22);
  },

  // 绘制椭圆印章
  drawOvalSeal(ctx, cx, cy, horizontal) {
    const radiusX = horizontal ? 280 : 220;
    const radiusY = horizontal ? 160 : 180;
    const innerRadiusX = horizontal ? 250 : 190;
    const innerRadiusY = horizontal ? 130 : 150;

    // 绘制外椭圆
    ctx.beginPath();
    ctx.ellipse(cx, cy, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // 绘制内椭圆
    ctx.beginPath();
    ctx.ellipse(cx, cy, innerRadiusX, innerRadiusY, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 绘制文字（多行）
    const fontSize = 32 * (this.data.fontSize / 100);
    ctx.font = `bold ${fontSize}px "SimSun", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lineHeight = fontSize + 8;
    let startY = cy;
    
    // 根据有多少行文字来调整起始位置
    const lines = [this.data.line1Text, this.data.line2Text, this.data.line3Text].filter(t => t);
    if (lines.length === 3) {
      startY = cy - lineHeight;
    } else if (lines.length === 2) {
      startY = cy - lineHeight / 2;
    }

    if (this.data.line1Text) {
      ctx.fillText(this.data.line1Text, cx, startY);
    }
    if (this.data.line2Text) {
      ctx.fillText(this.data.line2Text, cx, startY + lineHeight);
    }
    if (this.data.line3Text) {
      ctx.fillText(this.data.line3Text, cx, startY + lineHeight * 2);
    }
  },

  // 绘制方形印章
  drawSquareSeal(ctx, cx, cy) {
    const size = 380;
    const innerSize = 340;
    const x = cx - size / 2;
    const y = cy - size / 2;
    const innerX = cx - innerSize / 2;
    const innerY = cy - innerSize / 2;

    // 绘制外边框
    ctx.strokeRect(x, y, size, size);
    
    // 绘制内边框
    ctx.strokeRect(innerX, innerY, innerSize, innerSize);

    // 绘制文字
    const fontSize = 38 * (this.data.fontSize / 100);
    ctx.font = `bold ${fontSize}px "SimSun", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lineHeight = fontSize + 12;
    let startY = cy;
    
    // 根据有多少行文字来调整起始位置
    const lines = [this.data.line1Text, this.data.line2Text, this.data.line3Text].filter(t => t);
    if (lines.length === 3) {
      startY = cy - lineHeight;
    } else if (lines.length === 2) {
      startY = cy - lineHeight / 2;
    }

    if (this.data.line1Text) {
      ctx.fillText(this.data.line1Text, cx, startY);
    }
    if (this.data.line2Text) {
      ctx.fillText(this.data.line2Text, cx, startY + lineHeight);
    }
    if (this.data.line3Text) {
      ctx.fillText(this.data.line3Text, cx, startY + lineHeight * 2);
    }
  },

  // 绘制矩形印章
  drawRectSeal(ctx, cx, cy) {
    const width = 420;
    const height = 280;
    const innerWidth = 380;
    const innerHeight = 240;
    const x = cx - width / 2;
    const y = cy - height / 2;
    const innerX = cx - innerWidth / 2;
    const innerY = cy - innerHeight / 2;

    // 绘制外边框
    ctx.strokeRect(x, y, width, height);
    
    // 绘制内边框
    ctx.strokeRect(innerX, innerY, innerWidth, innerHeight);

    // 绘制文字
    const fontSize = 36 * (this.data.fontSize / 100);
    ctx.font = `bold ${fontSize}px "SimSun", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lineHeight = fontSize + 10;
    let startY = cy;
    
    // 根据有多少行文字来调整起始位置
    const lines = [this.data.line1Text, this.data.line2Text, this.data.line3Text].filter(t => t);
    if (lines.length === 3) {
      startY = cy - lineHeight;
    } else if (lines.length === 2) {
      startY = cy - lineHeight / 2;
    }

    if (this.data.line1Text) {
      ctx.fillText(this.data.line1Text, cx, startY);
    }
    if (this.data.line2Text) {
      ctx.fillText(this.data.line2Text, cx, startY + lineHeight);
    }
    if (this.data.line3Text) {
      ctx.fillText(this.data.line3Text, cx, startY + lineHeight * 2);
    }
  },

  // 绘制弧形文字
  drawArcText(ctx, text, cx, cy, radius, angleRange) {
    const chars = text.split('');
    const charCount = chars.length;
    const angleStep = angleRange / (charCount > 1 ? charCount - 1 : 1);
    const startAngle = Math.PI / 2 + angleRange / 2;

    const fontSize = 30 * (this.data.fontSize / 100);
    ctx.font = `bold ${fontSize}px "SimSun", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    chars.forEach((char, i) => {
      const angle = startAngle - angleStep * i;
      const x = cx + radius * Math.cos(angle);
      const y = cy - radius * Math.sin(angle);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-angle + Math.PI / 2);
      ctx.fillText(char, 0, 0);
      ctx.restore();
    });
  },

  // 绘制五角星
  drawStar(ctx, cx, cy, radius) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      const innerAngle = angle + Math.PI / 5;
      const innerX = (radius * 0.38) * Math.cos(innerAngle);
      const innerY = (radius * 0.38) * Math.sin(innerAngle);
      ctx.lineTo(innerX, innerY);
    }
    
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  // 选择形状
  selectShape(e) {
    const shape = e.currentTarget.dataset.shape;
    this.setData({ currentShape: shape });
    this.drawSeal();
  },

  // 文字输入
  onOuterTextInput(e) {
    this.setData({ outerText: e.detail.value });
    this.drawSeal();
  },

  onCenterTextInput(e) {
    this.setData({ centerText: e.detail.value });
    this.drawSeal();
  },

  onLine1Input(e) {
    this.setData({ line1Text: e.detail.value });
    this.drawSeal();
  },

  onLine2Input(e) {
    this.setData({ line2Text: e.detail.value });
    this.drawSeal();
  },

  onLine3Input(e) {
    this.setData({ line3Text: e.detail.value });
    this.drawSeal();
  },

  // 选择颜色
  selectColor(e) {
    const color = e.currentTarget.dataset.color;
    this.setData({ sealColor: color });
    this.drawSeal();
  },

  // 调整字体大小（拖动中）
  onFontSizeChanging(e) {
    this.setData({ fontSize: e.detail.value });
  },

  // 调整字体大小（松手后）
  onFontSizeChange(e) {
    const value = e.detail.value;
    this.setData({ fontSize: value });
    this.drawSeal();
  },

  // 调整边框粗细（拖动中）
  onBorderWidthChanging(e) {
    this.setData({ borderWidth: e.detail.value });
  },

  // 调整边框粗细（松手后）
  onBorderWidthChange(e) {
    const value = e.detail.value;
    this.setData({ borderWidth: value });
    this.drawSeal();
  },

  // 重置
  resetSeal() {
    const shape = this.data.currentShape;
    
    if (shape === 'circle') {
      this.setData({
        outerText: 'XX科技有限公司',
        centerText: '合同专用章',
        sealColor: '#DE2910',
        fontSize: 100,
        borderWidth: 2
      });
    } else {
      this.setData({
        line1Text: '公司名称',
        line2Text: '部门名称',
        line3Text: '专用章',
        sealColor: '#DE2910',
        fontSize: 100,
        borderWidth: 2
      });
    }
    
    this.drawSeal();
    
    wx.showToast({
      title: '已重置',
      icon: 'success'
    });
  },

  // 下载印章
  downloadSeal() {
    if (!this.canvas) {
      wx.showToast({
        title: 'Canvas 未初始化',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '生成中...',
      mask: true
    });

    // 导出图片
    wx.canvasToTempFilePath({
      canvas: this.canvas,
      fileType: 'png',
      quality: 1,
      success: (res) => {
        wx.hideLoading();
        
        // 保存到相册
        wx.authorize({
          scope: 'scope.writePhotosAlbum',
          success: () => {
            this.saveToAlbum(res.tempFilePath);
          },
          fail: () => {
            wx.showModal({
              title: '需要相册权限',
              content: '保存图片需要访问您的相册',
              confirmText: '去设置',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  wx.openSetting({
                    success: (settingRes) => {
                      if (settingRes.authSetting['scope.writePhotosAlbum']) {
                        this.saveToAlbum(res.tempFilePath);
                      }
                    }
                  });
                }
              }
            });
          }
        });
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({
          title: '生成失败',
          icon: 'none'
        });
      }
    }, this);
  },

  // 保存到相册
  saveToAlbum(filePath) {
    wx.saveImageToPhotosAlbum({
      filePath: filePath,
      success: () => {
        wx.showToast({
          title: '已保存到相册',
          icon: 'success'
        });
      },
      fail: (err) => {
        wx.showModal({
          title: '保存失败',
          content: err.errMsg || '请重试',
          showCancel: false
        });
      }
    });
  },

  // 显示帮助
  showHelp() {
    this.setData({ showHelpModal: true });
  },

  // 隐藏帮助
  hideHelp() {
    this.setData({ showHelpModal: false });
  },

  // 阻止冒泡
  stopPropagation() {},

  // 分享配置
  onShareAppMessage() {
    return {
      title: '电子印章 - 快速生成电子印章',
      path: '/pages/electronic-seal/electronic-seal',
      imageUrl: ''
    };
  },

  onShareTimeline() {
    return {
      title: '电子印章 - 快速生成电子印章'
    };
  }
});
