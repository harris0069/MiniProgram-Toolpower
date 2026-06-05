const API_BASE = 'https://xcx.huangyiling.top/api';
const MAX_MASK_DIM = 1600;

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    mode: 'select',
    brushSize: 20,
    processing: false,
    resultPath: '',
    canvasReady: false,
  },

  segments: [],
  currentSegment: null,
  isDrawing: false,
  canvas: null,
  ctx: null,
  bgImage: null,
  imgWidth: 0,
  imgHeight: 0,
  imgPath: '',
  drawX: 0,
  drawY: 0,
  drawW: 0,
  drawH: 0,
  dpr: 1,
  canvasLeft: 0,
  canvasTop: 0,
  imageNaturalW: 0,
  imageNaturalH: 0,

  onLoad() {
    const info = wx.getWindowInfo();
    this.setData({
      statusBarHeight: info.statusBarHeight || 0,
      navBarHeight: (info.statusBarHeight || 0) + 44,
    });
  },

  // === Select ===

  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original'],
      success: (res) => {
        this.imgPath = res.tempFilePaths[0];
        this.segments = [];
        this.setData({ mode: 'edit', canvasReady: false });
        wx.nextTick(() => this.initCanvas());
      },
    });
  },

  // === Canvas ===

  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#paintCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res[0] || !res[0].node) {
        setTimeout(() => this.initCanvas(), 200);
        return;
      }
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const info = wx.getWindowInfo();
      this.dpr = info.pixelRatio || 2;
      const cw = res[0].width;
      const ch = res[0].height;
      canvas.width = cw * this.dpr;
      canvas.height = ch * this.dpr;
      ctx.scale(this.dpr, this.dpr);
      this.canvas = canvas;
      this.ctx = ctx;
      // Get canvas position for touch coordinate mapping
      wx.createSelectorQuery().select('#paintCanvas').boundingClientRect((rect) => {
        this.canvasLeft = rect.left || 0;
        this.canvasTop = rect.top || 0;
        this.setData({ canvasReady: true });
      }).exec();
      this.loadImage(cw, ch);
    });
  },

  loadImage(cw, ch) {
    const img = this.canvas.createImage();
    img.onload = () => {
      this.bgImage = img;
      this.imageNaturalW = img.width;
      this.imageNaturalH = img.height;

      const imgRatio = img.width / img.height;
      const canvasRatio = cw / ch;
      if (imgRatio > canvasRatio) {
        this.drawW = cw;
        this.drawH = cw / imgRatio;
        this.drawX = 0;
        this.drawY = (ch - this.drawH) / 2;
      } else {
        this.drawH = ch;
        this.drawW = ch * imgRatio;
        this.drawX = (cw - this.drawW) / 2;
        this.drawY = 0;
      }

      // Limit working resolution for mask/upload
      const maxSide = Math.max(this.imageNaturalW, this.imageNaturalH);
      if (maxSide > MAX_MASK_DIM) {
        const scale = MAX_MASK_DIM / maxSide;
        this.imgWidth = Math.round(this.imageNaturalW * scale);
        this.imgHeight = Math.round(this.imageNaturalH * scale);
      } else {
        this.imgWidth = this.imageNaturalW;
        this.imgHeight = this.imageNaturalH;
      }

      this.clearAndRedraw();
    };
    img.src = this.imgPath;
  },

  clearAndRedraw() {
    if (!this.ctx || !this.bgImage) return;
    const cw = this.canvas.width / this.dpr;
    const ch = this.canvas.height / this.dpr;
    this.ctx.clearRect(0, 0, cw, ch);
    this.ctx.drawImage(this.bgImage, this.drawX, this.drawY, this.drawW, this.drawH);

    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    for (const seg of this.segments) {
      if (seg.points.length < 2) continue;
      this.ctx.beginPath();
      this.ctx.lineWidth = seg.size;
      this.ctx.strokeStyle = 'rgba(255,0,0,0.55)';
      this.ctx.moveTo(seg.points[0].x, seg.points[0].y);
      for (let i = 1; i < seg.points.length; i++) {
        this.ctx.lineTo(seg.points[i].x, seg.points[i].y);
      }
      this.ctx.stroke();
      // Draw circles at each point to fill gaps
      for (const p of seg.points) {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, seg.size / 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  },

  // === Touch ===

  getCanvasXY(e) {
    const touch = e.touches[0];
    return {
      x: touch.x - this.canvasLeft,
      y: touch.y - this.canvasTop,
    };
  },

  onTouchStart(e) {
    if (!this.data.canvasReady || this.data.processing) return;
    const p = this.getCanvasXY(e);
    this.isDrawing = true;
    this.currentSegment = {
      points: [p],
      size: this.data.brushSize,
    };
    this.segments.push(this.currentSegment);
  },

  onTouchMove(e) {
    if (!this.isDrawing || this.data.processing) return;
    const p = this.getCanvasXY(e);
    this.currentSegment.points.push(p);

    const ctx = this.ctx;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = this.currentSegment.size;
    ctx.strokeStyle = 'rgba(255,0,0,0.55)';
    ctx.fillStyle = 'rgba(255,0,0,0.55)';
    const pts = this.currentSegment.points;
    // Draw line segment
    ctx.beginPath();
    ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    // Draw circle at current point to fill gaps
    ctx.beginPath();
    ctx.arc(p.x, p.y, this.currentSegment.size / 2, 0, Math.PI * 2);
    ctx.fill();
  },

  onTouchEnd() {
    this.isDrawing = false;
    this.currentSegment = null;
  },

  // === Tools ===

  undoLast() {
    this.segments.pop();
    this.clearAndRedraw();
  },

  clearMask() {
    this.segments = [];
    this.clearAndRedraw();
  },

  onBrushSize(e) {
    this.setData({ brushSize: e.detail.value });
  },

  // === Image coords conversion ===

  canvasToImage(cx, cy) {
    const x = ((cx - this.drawX) / this.drawW) * this.imgWidth;
    const y = ((cy - this.drawY) / this.drawH) * this.imgHeight;
    return {
      x: Math.max(0, Math.min(this.imgWidth, x)),
      y: Math.max(0, Math.min(this.imgHeight, y)),
    };
  },

  // === Process ===

  async processImage() {
    if (this.data.processing) return;
    if (this.segments.length === 0) {
      wx.showToast({ title: '请先涂抹水印区域', icon: 'none' });
      return;
    }

    this.setData({ processing: true });
    wx.showLoading({ title: '去除中...' });

    try {
      const ow = this.imgWidth;
      const oh = this.imgHeight;

      // Mask offscreen canvas at limited resolution
      const maskCanvas = wx.createOffscreenCanvas({ type: '2d', width: ow, height: oh });
      const mctx = maskCanvas.getContext('2d');
      mctx.fillStyle = '#000000';
      mctx.fillRect(0, 0, ow, oh);

      mctx.lineCap = 'round';
      mctx.lineJoin = 'round';
      for (const seg of this.segments) {
        if (seg.points.length < 2) continue;
        const first = this.canvasToImage(seg.points[0].x, seg.points[0].y);
        mctx.beginPath();
        mctx.lineWidth = seg.size * (ow / this.drawW);
        mctx.strokeStyle = '#ffffff';
        mctx.moveTo(first.x, first.y);
        for (let i = 1; i < seg.points.length; i++) {
          const p = this.canvasToImage(seg.points[i].x, seg.points[i].y);
          mctx.lineTo(p.x, p.y);
        }
        mctx.stroke();
        // Fill circles at each point
        mctx.fillStyle = '#ffffff';
        for (const p of seg.points) {
          const cp = this.canvasToImage(p.x, p.y);
          mctx.beginPath();
          mctx.arc(cp.x, cp.y, seg.size * (ow / this.drawW) / 2, 0, Math.PI * 2);
          mctx.fill();
        }
      }

      // Export mask
      const maskRes = await new Promise((resolve, reject) => {
        wx.canvasToTempFilePath({
          canvas: maskCanvas,
          fileType: 'png',
          success: resolve,
          fail: reject,
        });
      });

      // Upload
      const result = await this.uploadImage(maskRes.tempFilePath, {
        imagePath: this.imgPath,
        naturalW: this.imageNaturalW,
        naturalH: this.imageNaturalH,
      });

      this.setData({ resultPath: result, mode: 'result', processing: false });
      wx.hideLoading();
    } catch (e) {
      wx.hideLoading();
      this.setData({ processing: false });
      wx.showToast({ title: '处理失败，请重试', icon: 'none' });
      console.error(e);
    }
  },

  uploadImage(maskPath, opts) {
    return new Promise((resolve, reject) => {
      // Read files as base64
      const fs = wx.getFileSystemManager();
      const imgB64 = fs.readFileSync(opts.imagePath, 'base64');
      const maskB64 = fs.readFileSync(maskPath, 'base64');

      wx.request({
        url: API_BASE + '/remove_watermark.php',
        method: 'POST',
        header: { 'content-type': 'application/json' },
        data: JSON.stringify({
          image: imgB64,
          mask: maskB64,
          natural_w: opts.naturalW,
          natural_h: opts.naturalH,
        }),
        timeout: 120000,
        responseType: 'arraybuffer',
        enableHttp2: true,
        success: (res) => {
          if (res.statusCode === 200) {
            const tmp = wx.env.USER_DATA_PATH + '/inpaint_result.png';
            fs.writeFileSync(tmp, res.data);
            resolve(tmp);
          } else {
            let msg = '处理失败';
            try {
              const text = new TextDecoder('utf-8').decode(res.data);
              const d = JSON.parse(text);
              msg = d.message || msg;
            } catch (_) {}
            reject(new Error(msg));
          }
        },
        fail: reject,
      });
    });
  },

  // === Save & Navigation ===

  saveToAlbum() {
    wx.saveImageToPhotosAlbum({
      filePath: this.data.resultPath,
      success: () => wx.showToast({ title: '已保存', icon: 'success' }),
      fail: (err) => {
        if (err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '需要权限',
            content: '请在设置中开启相册写入权限',
            success: (r) => { if (r.confirm) wx.openSetting(); },
          });
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' });
        }
      },
    });
  },

  startOver() {
    this.segments = [];
    this.bgImage = null;
    this.imgPath = '';
    this.canvas = null;
    this.ctx = null;
    this.setData({ mode: 'select', resultPath: '', canvasReady: false });
  },

  onBack() {
    if (this.data.mode === 'edit') {
      this.startOver();
    } else if (this.data.mode === 'result') {
      this.startOver();
    } else {
      const pages = getCurrentPages();
      if (pages.length > 1) {
        wx.navigateBack();
      } else {
        wx.switchTab({ url: '/pages/index/index' });
      }
    }
  },

  onShareAppMessage() {
    return { title: '拂去虚纹 - 涂抹水印区域一键去除', path: '/pages/watermark-eraser/index' };
  },
});
