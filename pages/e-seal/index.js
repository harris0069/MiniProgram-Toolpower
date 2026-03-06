const app = getApp();

Page({
  data: {
    companyName: '测试科技有限公司',
    securityCode: '1101050000000',
    centerText: '专用章',
    color: '#FF0000',
    shape: 'circle', // circle, oval
    
    // Canvas 尺寸
    width: 240,
    height: 240
  },

  onLoad() {
    this.initCanvas();
  },

  // 输入事件
  onCompanyInput(e) { this.setData({ companyName: e.detail.value }); this.draw(); },
  onCodeInput(e) { this.setData({ securityCode: e.detail.value }); this.draw(); },
  onCenterInput(e) { this.setData({ centerText: e.detail.value }); this.draw(); },
  
  setColor(e) { this.setData({ color: e.currentTarget.dataset.color }); this.draw(); },
  setShape(e) { this.setData({ shape: e.currentTarget.dataset.shape }); this.draw(); },
  
  reset() {
    this.setData({
      companyName: '测试科技有限公司',
      securityCode: '1101050000000',
      centerText: '专用章',
      color: '#FF0000',
      shape: 'circle'
    });
    this.draw();
  },

  // Canvas 初始化
  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#sealCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');

        // 处理 dpr
        const dpr = wx.getSystemInfoSync().pixelRatio;
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);

        this.canvas = canvas;
        this.ctx = ctx;
        this.draw();
      });
  },

  // 绘制印章
  draw() {
    if (!this.ctx) return;
    
    const ctx = this.ctx;
    const width = this.data.width;
    const height = this.data.height;
    const cx = width / 2;
    const cy = height / 2;
    
    // 清空
    ctx.clearRect(0, 0, width, height);
    
    // 设置样式
    ctx.strokeStyle = this.data.color;
    ctx.lineWidth = 5;
    ctx.fillStyle = this.data.color;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    
    if (this.data.shape === 'circle') {
      this.drawCircleSeal(ctx, cx, cy);
    } else {
      this.drawOvalSeal(ctx, cx, cy);
    }
  },

  drawCircleSeal(ctx, cx, cy) {
    const radius = 100; // 印章半径
    
    // 1. 绘制边框
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.stroke();
    
    // 2. 绘制五角星
    this.drawStar(ctx, cx, cy, 30);
    
    // 3. 绘制顶部公司名 (弧形文字)
    this.drawCurvedText(ctx, this.data.companyName, cx, cy, radius - 20);
    
    // 4. 绘制底部编码
    ctx.font = 'bold 14px Helvetica';
    // 简单绘制在底部，也可以做微弧形
    ctx.fillText(this.data.securityCode, cx, cy + radius - 15);
    
    // 5. 绘制中心文字
    ctx.font = 'bold 18px Helvetica';
    ctx.fillText(this.data.centerText, cx, cy + 50);
  },
  
  drawOvalSeal(ctx, cx, cy) {
    const radiusX = 100;
    const radiusY = 70;
    
    // 1. 绘制椭圆边框
    ctx.beginPath();
    ctx.ellipse(cx, cy, radiusX, radiusY, 0, 0, 2 * Math.PI);
    ctx.stroke();
    
    // 2. 绘制中心文字 (椭圆章通常只有中心文字和公司名)
    ctx.font = 'bold 18px Helvetica';
    ctx.fillText(this.data.centerText, cx, cy + 10);
    
    // 3. 公司名 (椭圆章通常也是弧形，但曲率不同，这里简化处理为上方文字)
    // 简单的上方文字
    ctx.font = 'bold 16px Helvetica';
    ctx.fillText(this.data.companyName, cx, cy - 30);
    
    // 4. 底部编码
    ctx.font = '12px Helvetica';
    ctx.fillText(this.data.securityCode, cx, cy + 45);
  },

  // 绘制五角星
  drawStar(ctx, x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    const dig = Math.PI / 5 * 4;
    for (let i = 0; i < 5; i++) {
      const x = Math.sin(i * dig);
      const y = Math.cos(i * dig);
      ctx.lineTo(x * r, -y * r); // 向上
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  // 绘制弧形文字
  drawCurvedText(ctx, text, cx, cy, radius) {
    if (!text) return;
    
    ctx.save();
    ctx.font = 'bold 22px Helvetica'; // 字号
    
    // 计算总角度范围 (假设每个字占一定角度)
    // 根据字数动态调整字间距
    const totalAngle = Math.PI * 0.8; // 顶部占 144度
    const anglePerChar = totalAngle / (text.length + 1);
    const startAngle = -Math.PI / 2 - (totalAngle / 2) + anglePerChar;
    
    for (let i = 0; i < text.length; i++) {
      ctx.save();
      const angle = startAngle + i * anglePerChar;
      ctx.translate(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      ctx.rotate(angle + Math.PI / 2); // 文字旋转90度垂直于半径
      ctx.fillText(text[i], 0, 0);
      ctx.restore();
    }
    
    ctx.restore();
  },

  // 保存图片
  saveImage() {
    wx.canvasToTempFilePath({
      canvas: this.canvas,
      success: (res) => {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            wx.showToast({ title: '已保存', icon: 'success' });
          },
          fail: (err) => {
            if (err.errMsg && err.errMsg.includes('auth')) {
              wx.openSetting();
            } else {
              wx.showToast({ title: '保存失败', icon: 'none' });
            }
          }
        });
      },
      fail: (err) => {
        console.error(err);
        wx.showToast({ title: '生成失败', icon: 'none' });
      }
    });
  }
})