const API_BASE = 'https://xcx.huangyiling.top/api';
const IMG_BASE = 'https://xcx.huangyiling.top';

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    mode: 'category',
    categoryTab: '全部',
    entries: [],
    filteredEntries: [],

    currentEntry: null,
    templates: [],
    selectedTemplate: null,
    templateDetail: null,

    canvasWidth: 0,
    canvasHeight: 0,
    bgImage: null,
    bgPath: '',
    hasImage: false,

    logoImage: null,
    logoPath: '',
    logoScale: 0.3,
    logoScalePercent: 30,
    logoX: 0.5,
    logoY: 0.15,

    bgColor: '',
    bgOpacity: 30,
    bgFeather: 70,

    editTab: 'logo',
    texts: [],
    currentText: null,

    isDragging: false,
    dragTarget: '',
    touchStartX: 0,
    touchStartY: 0,
    dragOriginX: 0,
    dragOriginY: 0,

    used: false,
    remaining: 1,
    saving: false,

    unlockModal: false,
    unlockMsg: '',
    previewMode: false,
  },

  onLoad() {
    const info = wx.getWindowInfo();
    this.setData({
      statusBarHeight: info.statusBarHeight || 0,
      navBarHeight: (info.statusBarHeight || 0) + 44,
    });
  },

  onShow() {
    if (this.data.mode === 'category') this.loadEntries();
  },

  // === API ===

  loadEntries() {
    wx.request({
      url: API_BASE + '/poster_templates.php?action=entries',
      timeout: 10000,
      success: (res) => {
        if (res.data && res.data.success) {
          const entries = res.data.entries || [];
          this.setData({ entries, filteredEntries: this.filterEntries(entries, this.data.categoryTab) });
        }
      },
    });
  },

  filterEntries(entries, cat) {
    if (cat === '全部') return entries;
    return entries.filter(e => e.category === cat);
  },

  onCategoryTab(e) {
    const cat = e.currentTarget.dataset.cat;
    this.setData({
      categoryTab: cat,
      filteredEntries: this.filterEntries(this.data.entries, cat),
    });
  },

  // === Entry detail ===

  enterEntry(e) {
    const entry = e.currentTarget.dataset.entry;
    const found = this.data.entries.find(e => e.entry === entry);
    if (!found) return;
    this.setData({
      mode: 'entry',
      currentEntry: found,
      templates: found.templates,
    });
  },

  selectTemplate(e) {
    const id = e.currentTarget.dataset.id;
    const tpl = this.data.templates.find(t => t.id === id);
    if (!tpl) return;
    if (tpl.tier === 'premium') {
      this.checkUnlock(tpl);
      return;
    }
    this.loadTemplateDetail(tpl);
  },

  checkUnlock(tpl) {
    const ApiClient = require('../../utils/apiClient.js');
    ApiClient.getOpenId().then(openid => {
      wx.request({
        url: API_BASE + '/poster_usage.php?action=check_unlock',
        method: 'POST',
        data: { openid, template: tpl.id },
        timeout: 10000,
        success: (res) => {
          if (res.data && res.data.success && res.data.unlocked) {
            this.loadTemplateDetail(tpl);
          } else {
            this.setData({
              unlockModal: true,
              unlockMsg: '该模板为高级模板，请联系小程序开发者解锁后使用。',
            });
          }
        },
      });
    });
  },

  closeUnlock() {
    this.setData({ unlockModal: false });
  },

  previewTemplate() {
    const tpl = this.data.templates.find(t => t.id === this.data.selectedTemplate?.id);
    if (tpl) {
      this.closeUnlock();
      wx.showToast({ title: '预览模式', icon: 'none' });
      this.loadTemplateDetail(tpl, true);
    }
  },

  loadTemplateDetail(tpl, preview = false) {
    wx.showLoading({ title: '加载模板...' });
    wx.request({
      url: API_BASE + '/poster_templates.php?action=detail&id=' + tpl.id,
      timeout: 15000,
      success: (res) => {
        if (res.data && res.data.success && res.data.template) {
          const detail = res.data.template;
          this.setData({
            mode: 'edit',
            selectedTemplate: tpl,
            templateDetail: detail,
            texts: [],
            currentText: null,
            previewMode: preview,
            bgPath: '',
            hasImage: false,
            bgImage: null,
            logoImage: null,
            logoPath: '',
            logoScale: 0.3,
            logoScalePercent: 30,
            logoX: 0.5,
            logoY: 0.15,
            bgColor: '',
            bgOpacity: 30,
            bgFeather: 70,
            editTab: 'logo',
          });
          wx.hideLoading();
          this.initCanvas();
          this.checkUsage();
        } else {
          wx.hideLoading();
          wx.showToast({ title: '模板加载失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络异常', icon: 'none' });
      },
    });
  },

  checkUsage() {
    const ApiClient = require('../../utils/apiClient.js');
    ApiClient.getOpenId().then(openid => {
      wx.request({
        url: API_BASE + '/poster_usage.php?action=check_usage',
        method: 'POST',
        data: { openid },
        timeout: 10000,
        success: (res) => {
          if (res.data && res.data.success) {
            this.setData({ used: res.data.used, remaining: res.data.remaining });
          }
        },
      });
    });
  },

  // === Canvas init ===

  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#posterCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res[0] || !res[0].node) {
        setTimeout(() => this.initCanvas(), 200);
        return;
      }
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const info = wx.getWindowInfo();
      const dpr = info.pixelRatio || 2;
      const cw = res[0].width;
      const ch = res[0].height;
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      ctx.scale(dpr, dpr);
      this.canvas = canvas;
      this.ctx = ctx;
      this.dpr = dpr;
      this.setData({ canvasWidth: cw, canvasHeight: ch });
      this.loadBgImage();
    });
  },

  loadBgImage() {
    if (!this.canvas || !this.data.templateDetail) return;
    const canvas = this.canvas;
    const img = canvas.createImage();
    let bgUrl = this.data.templateDetail.bg;
    if (bgUrl && !bgUrl.startsWith('http')) bgUrl = IMG_BASE + bgUrl;
    img.onload = () => {
      this.setData({ bgImage: img, bgPath: bgUrl, hasImage: true });
      this.drawCanvas();
    };
    img.onerror = () => {
      wx.showToast({ title: '背景加载失败', icon: 'none' });
    };
    img.src = bgUrl;
  },

  // === Drawing ===

  drawCanvas() {
    if (!this.ctx || !this.data.hasImage) return;
    const ctx = this.ctx;
    const { canvasWidth, canvasHeight, bgImage, bgColor, bgOpacity, bgFeather, logoImage, logoX, logoY, texts, previewMode } = this.data;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // 1. BG image
    if (bgImage) {
      ctx.drawImage(bgImage, 0, 0, canvasWidth, canvasHeight);
    }

    // 2. BG color overlay
    if (bgColor) {
      const cx = canvasWidth / 2;
      const cy = canvasHeight / 2;
      const maxR = Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight) / 2;
      const r = maxR * (bgFeather / 100);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, hexToRgba(bgColor, bgOpacity / 100));
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // 3. Logo
    if (logoImage) {
      const maxW = canvasWidth * 0.4;
      let lw = logoImage.width;
      let lh = logoImage.height;
      const ratio = lw / lh;
      if (lw > maxW) { lw = maxW; lh = lw / ratio; }
      const lx = logoX * canvasWidth - lw / 2;
      const ly = logoY * canvasHeight - lh / 2;
      ctx.drawImage(logoImage, lx, ly, lw, lh);
    }

    // 4. User-added texts
    texts.forEach(t => {
      if (!t.content) return;
      ctx.save();
      ctx.font = `${t.fontSize * (canvasWidth / 1080)}px sans-serif`;
      ctx.fillStyle = t.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.content, t.x * canvasWidth, t.y * canvasHeight);
      ctx.restore();
    });

    // 5. Preview watermark
    if (previewMode) {
      ctx.save();
      ctx.font = 'bold 36px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.rotate(-0.3);
      for (let i = -2; i < 4; i++) {
        for (let j = -2; j < 4; j++) {
          ctx.fillText('预览·请联系开发者', i * 300, j * 300);
        }
      }
      ctx.restore();
    }
  },

  // === Logo ===

  chooseLogo() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original'],
      success: (res) => {
        const path = res.tempFilePaths[0];
        const img = this.canvas.createImage();
        img.onload = () => {
          this.setData({ logoImage: img, logoPath: path });
          this.drawCanvas();
        };
        img.src = path;
      },
    });
  },

  onLogoScale(e) {
    const v = e.detail.value;
    this.setData({ logoScale: v / 100, logoScalePercent: v });
    this.drawCanvas();
  },

  quickLogoPosition(e) {
    const pos = e.currentTarget.dataset.position;
    const margin = 0.05;
    let x = 0.5, y = 0.5;
    switch (pos) {
      case 'top-left': x = margin; y = margin; break;
      case 'top-right': x = 1 - margin; y = margin; break;
      case 'center': x = 0.5; y = 0.5; break;
      case 'bottom-left': x = margin; y = 1 - margin; break;
      case 'bottom-right': x = 1 - margin; y = 1 - margin; break;
    }
    this.setData({ logoX: x, logoY: y });
    this.drawCanvas();
  },

  // === BG Color ===

  setBgColor(e) {
    this.setData({ bgColor: e.currentTarget.dataset.color });
    this.drawCanvas();
  },

  onBgOpacity(e) {
    this.setData({ bgOpacity: e.detail.value });
    this.drawCanvas();
  },

  onBgFeather(e) {
    this.setData({ bgFeather: e.detail.value });
    this.drawCanvas();
  },

  // === Free Text ===

  addText() {
    const key = 't' + Date.now();
    const newText = { key, content: '双击编辑文字', color: '#ffffff', fontSize: 28, x: 0.5, y: 0.5 };
    const texts = [...this.data.texts, newText];
    this.setData({ texts, currentText: newText, editTab: 'text' });
    this.drawCanvas();
  },

  deleteText(e) {
    const key = e.currentTarget.dataset.key;
    const texts = this.data.texts.filter(t => t.key !== key);
    const ct = texts.length > 0 ? texts[texts.length - 1] : null;
    this.setData({ texts, currentText: ct, editTab: ct ? 'text' : 'logo' });
    this.drawCanvas();
  },

  onTextSelect(e) {
    const key = e.currentTarget.dataset.key;
    const ct = this.data.texts.find(t => t.key === key);
    if (ct) this.setData({ currentText: ct, editTab: 'text' });
  },

  onTextInput(e) {
    const { key } = e.currentTarget.dataset;
    const texts = this.data.texts.map(t => t.key === key ? { ...t, content: e.detail.value } : t);
    const ct = texts.find(t => t.key === key);
    this.setData({ texts, currentText: ct });
    this.drawCanvas();
  },

  onTextColor(e) {
    const { key, color } = e.currentTarget.dataset;
    const texts = this.data.texts.map(t => t.key === key ? { ...t, color } : t);
    const ct = texts.find(t => t.key === key);
    this.setData({ texts, currentText: ct });
    this.drawCanvas();
  },

  onTextFontSize(e) {
    const { key } = e.currentTarget.dataset;
    const v = parseInt(e.detail.value);
    const texts = this.data.texts.map(t => t.key === key ? { ...t, fontSize: v } : t);
    const ct = texts.find(t => t.key === key);
    this.setData({ texts, currentText: ct });
    this.drawCanvas();
  },

  switchEditTab(e) {
    this.setData({ editTab: e.currentTarget.dataset.tab });
  },

  // === Canvas touch ===

  onTouchStart(e) {
    const touch = e.touches[0];
    if (!touch) return;
    const x = touch.x;
    const y = touch.y;
    const { canvasWidth, canvasHeight, texts, logoImage } = this.data;

    for (const t of texts) {
      const tx = t.x * canvasWidth;
      const ty = t.y * canvasHeight;
      const fs = t.fontSize * (canvasWidth / 1080);
      if (Math.abs(x - tx) < fs * 3 && Math.abs(y - ty) < fs) {
        this.setData({ isDragging: true, dragTarget: 'text_' + t.key, touchStartX: x, touchStartY: y, dragOriginX: t.x, dragOriginY: t.y });
        return;
      }
    }

    if (logoImage) {
      const lx = this.data.logoX * canvasWidth;
      const ly = this.data.logoY * canvasHeight;
      if (Math.abs(x - lx) < 60 && Math.abs(y - ly) < 60) {
        this.setData({ isDragging: true, dragTarget: 'logo', touchStartX: x, touchStartY: y, dragOriginX: this.data.logoX, dragOriginY: this.data.logoY });
      }
    }
  },

  onTouchMove(e) {
    if (!this.data.isDragging) return;
    const touch = e.touches[0];
    if (!touch) return;
    const dx = (touch.x - this.data.touchStartX) / this.data.canvasWidth;
    const dy = (touch.y - this.data.touchStartY) / this.data.canvasHeight;
    const target = this.data.dragTarget;

    if (target === 'logo') {
      this.setData({
        logoX: Math.max(0, Math.min(1, this.data.dragOriginX + dx)),
        logoY: Math.max(0, Math.min(1, this.data.dragOriginY + dy)),
      });
    } else if (target.startsWith('text_')) {
      const key = target.replace('text_', '');
      const texts = this.data.texts.map(t => {
        if (t.key === key) {
          return { ...t, x: Math.max(0, Math.min(1, this.data.dragOriginX + dx)), y: Math.max(0, Math.min(1, this.data.dragOriginY + dy)) };
        }
        return t;
      });
      this.setData({ texts });
    }
    this.drawCanvas();
  },

  onTouchEnd() {
    this.setData({ isDragging: false, dragTarget: '' });
  },

  // === Save & Export ===

  async saveToAlbum() {
    if (this.data.previewMode) {
      wx.showToast({ title: '预览模式不可保存', icon: 'none' });
      return;
    }
    if (this.data.used) {
      wx.showToast({ title: '本周已使用过，下周再来', icon: 'none' });
      return;
    }
    if (this.data.saving) return;

    this.setData({ saving: true });
    wx.showLoading({ title: '生成中...' });

    try {
      const exportW = 1080;
      const exportH = 1920;

      const canvas = wx.createOffscreenCanvas({ type: '2d', width: exportW, height: exportH });
      const ctx = canvas.getContext('2d');

      const bgImg = await loadImage(canvas, this.data.bgPath);
      ctx.drawImage(bgImg, 0, 0, exportW, exportH);

      if (this.data.bgColor) {
        const cx = exportW / 2;
        const cy = exportH / 2;
        const maxR = Math.sqrt(exportW * exportW + exportH * exportH) / 2;
        const r = maxR * (this.data.bgFeather / 100);
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, hexToRgba(this.data.bgColor, this.data.bgOpacity / 100));
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, exportW, exportH);
      }

      if (this.data.logoImage) {
        const maxW = exportW * 0.4;
        let lw = this.data.logoImage.width;
        let lh = this.data.logoImage.height;
        const ratio = lw / lh;
        if (lw > maxW) { lw = maxW; lh = lw / ratio; }
        const logoImg2 = await loadImage(canvas, this.data.logoPath);
        const lx = this.data.logoX * exportW - lw / 2;
        const ly = this.data.logoY * exportH - lh / 2;
        ctx.drawImage(logoImg2, lx, ly, lw, lh);
      }

      this.data.texts.forEach(t => {
        if (!t.content) return;
        ctx.save();
        ctx.font = `${t.fontSize * (exportW / 1080)}px sans-serif`;
        ctx.fillStyle = t.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(t.content, t.x * exportW, t.y * exportH);
        ctx.restore();
      });

      const tmp = await new Promise((resolve, reject) => {
        wx.canvasToTempFilePath({ canvas, fileType: 'png', quality: 1, success: resolve, fail: reject });
      });

      wx.hideLoading();
      this.setData({ saving: false });

      wx.saveImageToPhotosAlbum({
        filePath: tmp.tempFilePath,
        success: () => {
          wx.showToast({ title: '已保存到相册', icon: 'success' });
          this.incrementUsage();
        },
        fail: (err) => {
          if (err.errMsg.includes('auth deny')) {
            wx.showModal({ title: '需要权限', content: '请在设置中开启相册写入权限', success: (r) => { if (r.confirm) wx.openSetting(); } });
          } else {
            wx.showToast({ title: '保存失败', icon: 'none' });
          }
        },
      });
    } catch (e) {
      wx.hideLoading();
      this.setData({ saving: false });
      wx.showToast({ title: '生成失败', icon: 'none' });
      console.error(e);
    }
  },

  incrementUsage() {
    const ApiClient = require('../../utils/apiClient.js');
    ApiClient.getOpenId().then(openid => {
      wx.request({
        url: API_BASE + '/poster_usage.php?action=increment_usage',
        method: 'POST',
        data: { openid },
      });
      this.setData({ used: true, remaining: 0 });
    });
  },

  // === Navigation ===

  onBack() {
    if (this.data.mode === 'entry') {
      this.setData({ mode: 'category', currentEntry: null });
    } else if (this.data.mode === 'edit') {
      this.setData({ mode: 'entry' });
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
    return { title: '一键海报 - 快速制作精美海报', path: '/pages/poster/index' };
  },
});

function hexToRgba(hex, alpha) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function loadImage(canvas, src) {
  return new Promise((resolve, reject) => {
    const img = canvas.createImage();
    const timer = setTimeout(() => reject(new Error('timeout')), 15000);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); reject(new Error('load fail')); };
    img.src = src;
  });
}
