const API_BASE = 'https://xcx.huangyiling.top/api';
const MAX_MASK_DIM = 1600;
const { checkImage } = require('../../utils/security.js');
const UsageControl = require('../../utils/usageControl.js');

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    mode: 'select',
    brushSize: 20,
    processing: false,
    progressText: '',
    resultPath: '',
    canvasReady: false,
  },

  segments: [],
  currentSegment: null,
  isDrawing: false,
  canvas: null,
  ctx: null,
  bgImage: null,
  resultImage: null,
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
    this.checkFeatureEnabled();
    const info = wx.getWindowInfo();
    this.setData({
      statusBarHeight: info.statusBarHeight || 0,
      navBarHeight: (info.statusBarHeight || 0) + 44,
    });
  },

  async checkFeatureEnabled() {
    try {
      const res = await UsageControl.featureFlag('watermark-eraser');
      if (!res.enabled) {
        const msg = res.message || '功能暂不可用';
        wx.showToast({ title: msg, icon: 'none', duration: 2000 });
        setTimeout(() => wx.navigateBack(), 2000);
      }
    } catch (e) {
      console.warn('[Watermark Eraser] 获取功能开关失败', e);
    }
  },

  // === Select ===

  async chooseImage() {
    const res = await new Promise((resolve) => {
      wx.chooseImage({ count: 1, sizeType: ['original'], success: resolve, fail: () => resolve(null) });
    });
    if (!res) return;
    const path = res.tempFilePaths[0];
    const imgOk = await checkImage(path);
    if (!imgOk.pass) { wx.showToast({ title: imgOk.errMsg, icon: 'none' }); return; }
    this.imgPath = path;
    this.segments = [];
    this.resultImage = null;
    this.setData({ mode: 'edit', canvasReady: false });
    wx.nextTick(() => this.initCanvas());
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
    }
  },

  // === Touch ===

  getCanvasXY(e) {
    const touch = e.touches[0];
    // Use clientX/clientY (viewport-relative) → same system as boundingClientRect
    const cx = touch.clientX !== undefined ? touch.clientX : touch.x;
    const cy = touch.clientY !== undefined ? touch.clientY : touch.y;
    return {
      x: cx - this.canvasLeft,
      y: cy - this.canvasTop,
    };
  },

  onTouchStart(e) {
    if (this.data.processing || !this.data.canvasReady) return;

    // Result mode → long-press compare
    if (this.data.mode === 'result') {
      this._lpTimer = setTimeout(() => {
        this._showingOriginal = true;
        this._lpTimer = null;
        const cw = this.canvas.width / this.dpr;
        const ch = this.canvas.height / this.dpr;
        this.ctx.clearRect(0, 0, cw, ch);
        this.ctx.drawImage(this.bgImage, this.drawX, this.drawY, this.drawW, this.drawH);
      }, 400);
      return;
    }

    if (this.data.mode !== 'edit') return;
    const p = this.getCanvasXY(e);
    this.isDrawing = true;
    this.currentSegment = {
      points: [p],
      size: this.data.brushSize,
    };
    this.segments.push(this.currentSegment);
  },

  onTouchMove(e) {
    if (this.data.processing) return;

    // Result mode → cancel long-press if finger dragged before timer fires
    if (this.data.mode === 'result') {
      if (this._lpTimer) {
        clearTimeout(this._lpTimer);
        this._lpTimer = null;
      }
      return;
    }

    if (!this.isDrawing || this.data.mode !== 'edit') return;
    const p = this.getCanvasXY(e);
    this.currentSegment.points.push(p);

    const ctx = this.ctx;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = this.currentSegment.size;
    ctx.strokeStyle = 'rgba(255,0,0,0.55)';
    const pts = this.currentSegment.points;
    ctx.beginPath();
    ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();

  },

  onTouchEnd() {
    // Result mode → restore result if showing original
    if (this._lpTimer) {
      clearTimeout(this._lpTimer);
      this._lpTimer = null;
    }
    if (this._showingOriginal) {
      this._showingOriginal = false;
      const cw = this.canvas.width / this.dpr;
      const ch = this.canvas.height / this.dpr;
      this.ctx.clearRect(0, 0, cw, ch);
      this.ctx.drawImage(this.resultImage, this.drawX, this.drawY, this.drawW, this.drawH);
      return;
    }

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

    this.setData({ processing: true, progressText: '上传中...' });

    try {
      const ow = this.imgWidth;
      const oh = this.imgHeight;
      const fs = wx.getFileSystemManager();

      // Collect stroke data in image coordinates
      const strokes = [];
      for (const seg of this.segments) {
        if (seg.points.length < 2) continue;
        const points = seg.points.map(p => this.canvasToImage(p.x, p.y));
        strokes.push({
          size: seg.size * (ow / this.drawW),
          points,
        });
      }

      this.setData({ progressText: '处理中...' });
      const imageBase64 = fs.readFileSync(this.imgPath, 'base64');

      const result = await this.uploadImage(imageBase64, strokes, {
        naturalW: this.imageNaturalW,
        naturalH: this.imageNaturalH,
        imgW: ow,
        imgH: oh,
      });

      this.setData({ progressText: '下载中...', resultPath: result });

      // Draw result on canvas at same position as original
      const resultImg = this.canvas.createImage();
      resultImg.onload = () => {
        this.resultImage = resultImg;
        const cw = this.canvas.width / this.dpr;
        const ch = this.canvas.height / this.dpr;
        this.ctx.clearRect(0, 0, cw, ch);
        this.ctx.drawImage(resultImg, this.drawX, this.drawY, this.drawW, this.drawH);
        this.setData({ mode: 'result', processing: false });
      };
      resultImg.src = result;
    } catch (e) {
      this.setData({ processing: false });
      wx.showToast({ title: '处理失败，请重试', icon: 'none' });
      console.error(e);
    }
  },

  uploadImage(imgB64, strokes, opts) {
    return new Promise((resolve, reject) => {
      const fs = wx.getFileSystemManager();
      const body = JSON.stringify({
        image: imgB64,
        strokes: strokes,
        natural_w: opts.naturalW,
        natural_h: opts.naturalH,
        img_w: opts.imgW,
        img_h: opts.imgH,
      });

      wx.request({
        url: API_BASE + '/remove_watermark.php',
        method: 'POST',
        header: { 'content-type': 'application/json' },
        data: body,
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

  // === Result actions ===

  redoEdit() {
    this.segments = [];
    this.resultImage = null;
    this.clearAndRedraw();
    this.setData({ mode: 'edit', resultPath: '' });
  },

  async saveToAlbum() {
    const imgOk = await checkImage(this.data.resultPath);
    if (!imgOk.pass) { wx.showToast({ title: imgOk.errMsg, icon: 'none' }); return; }
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
    this.resultImage = null;
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
        wx.reLaunch({ url: '/pages/index/index' });
      }
    }
  },

  onUnload() { this.startOver(); },
  onHide() { this.startOver(); },
});
