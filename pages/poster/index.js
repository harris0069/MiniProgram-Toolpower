const API_BASE = 'https://xcx.huangyiling.top/api';
const IMG_BASE = 'https://xcx.huangyiling.top';
const { checkText, checkImage } = require('../../utils/security.js');
const UsageControl = require('../../utils/usageControl.js');

const ENTRY_ICONS = {
  '元旦': '🎉', '春节': '🧧', '元宵节': '🏮', '清明节': '🌿',
  '劳动节': '💪', '端午节': '🐉', '七夕节': '💕', '中秋节': '🌙',
  '国庆节': '🎊', '重阳节': '🌸', '圣诞节': '🎄', '情人节': '💖',
  '母亲节': '🌷', '父亲节': '👔', '教师节': '📚', '儿童节': '🍭',
  '妇女节': '👩', '植树节': '🌳', '建军节': '⭐', '腊八节': '🥣',
  '小年': '🧹', '除夕': '🧨',
  '立春': '🌱', '雨水': '🌧️', '惊蛰': '⚡', '春分': '🌸',
  '清明': '🌿', '谷雨': '🌾', '立夏': '🌞', '小满': '🌻',
  '芒种': '🌾', '夏至': '☀️', '小暑': '🔥', '大暑': '🥵',
  '立秋': '🍂', '处暑': '🍁', '白露': '💧', '秋分': '🌰',
  '寒露': '❄️', '霜降': '🥶', '立冬': '⛄', '小雪': '🌨️',
  '大雪': '❄️', '冬至': '🥟', '小寒': '🧊', '大寒': '🧣',
};

function entryIcon(entry) {
  return ENTRY_ICONS[entry.entryName] || (entry.category === '节气' ? '🌿' : '🎉');
}

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    mode: 'category',
    categoryTab: '全部',
    entries: [],
    filteredEntries: [],
    IMG_BASE: IMG_BASE,
    canvasW: 0,
    canvasH: 0,
    imageRatio: 1,
    fullscreenOpen: false,
    fullscreenSrc: '',

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
    logoScale: 1,
    logoScalePercent: 100,
    logoX: 0.5,
    logoY: 0.15,

    bgColor: '',
    bgOpacity: 30,
    bgFeather: 70,

    activeTool: null,
    toolbarExpanded: false,
    texts: [],
    currentText: null,
    currentTextKey: null,

    isDragging: false,
    dragTarget: '',
    touchStartX: 0,
    touchStartY: 0,
    dragOriginX: 0,
    dragOriginY: 0,
    pickingColor: false,

    used: false,
    remaining: 1,
    saving: false,

    unlockModal: false,
    unlockMsg: '',
    previewMode: false,
  },

  onLoad() {
    const info = wx.getWindowInfo();
    const navH = (info.statusBarHeight || 0) + 44;
    this.setData({
      statusBarHeight: info.statusBarHeight || 0,
      navBarHeight: navH,
      editPageHeight: info.windowHeight - navH,
      fullscreenOpen: false,
      fullscreenSrc: '',
    });
    this._onResize = (res) => {
      const navH2 = (res.statusBarHeight || 0) + 44;
      this.setData({ editPageHeight: res.windowHeight - navH2 });
    };
    wx.onWindowResize(this._onResize);
  },

  onShow() {
    this.setData({ fullscreenOpen: false, fullscreenSrc: '' });
    if (this.data.mode === 'category') this.loadEntries();
    if (this.data.mode === 'edit' && this.data.bgPath && !this.canvas) {
      wx.nextTick(() => this.initCanvas());
    }
  },

  // === API ===

  loadEntries() {
    if (this._entriesLoaded) return;
    this._entriesLoaded = true;
    wx.request({
      url: API_BASE + '/poster_templates.php?action=entries',
      timeout: 10000,
      success: (res) => {
        if (res.data && res.data.success) {
          const entries = res.data.entries || [];
          this.setData({ entries, filteredEntries: this.filterEntries(entries, this.data.categoryTab) });
        } else {
          wx.showToast({ title: '数据加载失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络异常', icon: 'none' });
      },
    });
  },

  filterEntries(entries, cat) {
    let list = cat === '全部' ? entries : entries.filter(e => e.category === cat);
    return list.map(e => ({ ...e, _icon: entryIcon(e) }));
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

  async checkUnlock(tpl) {
    try {
      const res = await UsageControl.checkUnlock('poster', tpl.id);
      if (res.unlocked) {
        this.loadTemplateDetail(tpl);
      } else {
        this.setData({
          unlockModal: true,
          unlockMsg: '该模板为高级模板，请联系小程序开发者解锁后使用。',
        });
      }
    } catch (e) {
      wx.showToast({ title: '解锁检查失败', icon: 'none' });
    }
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
            currentTextKey: null,
            previewMode: preview,
            bgPath: '',
            hasImage: false,
            bgImage: null,
            logoImage: null,
            logoPath: '',
            logoScale: 1,
            logoScalePercent: 100,
            logoX: 0.5,
            logoY: 0.15,
            bgColor: '',
            bgOpacity: 30,
            bgFeather: 70,
    activeTool: null,
    toolbarExpanded: false,
            fullscreenOpen: false,
            fullscreenSrc: '',
          });
          wx.hideLoading();
          this.getBgDimensions(detail);
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

  getBgDimensions(detail) {
    let bgUrl = detail.bg;
    if (bgUrl && !bgUrl.startsWith('http')) bgUrl = IMG_BASE + bgUrl;
    if (!bgUrl) { this.initCanvas(); return; }
    wx.getImageInfo({
      src: bgUrl,
      success: (res) => {
        const info = wx.getWindowInfo();
        const screenW = info.windowWidth;
        const ratio = res.width / res.height;
        // Only reserve toolbar height (expandable panels use overflow clipping)
        const maxEditorBottomPx = 90;
        const previewH = Math.max(200, this.data.editPageHeight - maxEditorBottomPx);
        let cvW, cvH;
        if (previewH * ratio <= screenW) {
          cvH = Math.round(previewH);
          cvW = Math.round(cvH * ratio);
        } else {
          cvW = Math.round(screenW);
          cvH = Math.round(cvW / ratio);
        }
        this.setData({ bgPath: bgUrl, imageRatio: ratio, canvasW: cvW, canvasH: cvH, hasImage: true }, () => {
          wx.nextTick(() => this.initCanvas());
        });
      },
      fail: () => { wx.showToast({ title: '背景加载失败', icon: 'none' }); },
    });
  },

  async checkUsage() {
    try {
      const res = await UsageControl.check('poster');
      this.setData({ used: res.used > 0, remaining: res.remaining });
    } catch (e) {
      console.warn('[Poster] 获取使用次数失败', e);
    }
  },

  // === Canvas init ===

  initCanvas(retryCount) {
    if (this._destroyed) return;
    const MAX_RETRY = 15;
    const count = retryCount || 0;
    if (count >= MAX_RETRY) return;
    const query = wx.createSelectorQuery();
    query.select('#posterCanvas').fields({ node: true, size: true }).exec((res) => {
      if (this._destroyed) return;
      if (!res[0] || !res[0].node) {
        this._initTimer = setTimeout(() => this.initCanvas(count + 1), 200);
        return;
      }
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const info = wx.getWindowInfo();
      const dpr = info.pixelRatio || 2;
      const cw = res[0].width;
      const ch = res[0].height;
      // Preserve existing content if canvas already exists
      const isResize = !!this.canvas;
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      ctx.scale(dpr, dpr);
      this.canvas = canvas;
      this.ctx = ctx;
      this.dpr = dpr;
      this.setData({ canvasWidth: cw, canvasHeight: ch });
      if (!isResize) {
        this.loadBgImage();
      } else {
        // Re-draw with new dimensions
        this.drawCanvas();
      }
    });
  },

  loadBgImage() {
    if (!this.canvas || !this.data.templateDetail) return;
    const canvas = this.canvas;
    const img = canvas.createImage();
    img.onload = () => {
      if (!this.canvas) return;
      this.setData({ bgImage: img, hasImage: true });
      this.updateCanvas();
      this._loadPendingLogo();
    };
    img.onerror = () => {
      this.setData({ bgImage: null, hasImage: false });
      wx.showToast({ title: '背景加载失败', icon: 'none' });
    };
    img.src = this.data.bgPath;
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
      let lw = logoImage.width;
      let lh = logoImage.height;
      const ratio = lw / lh;
      const maxW = canvasWidth * 0.4;
      if (lw > maxW) { lw = maxW; lh = lw / ratio; }
      const scale = this.data.logoScale || 0.3;
      lw = lw * scale;
      lh = lh * scale;
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

  updateCanvas() {
    this.drawCanvas();
  },

  // === Logo ===

  chooseLogo() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['original'],
      success: (res) => {
        const path = res.tempFiles[0] && res.tempFiles[0].tempFilePath;
        if (!path) return;
        if (!this.canvas) { this.pendingLogoPath = path; return; }
        const img = this.canvas.createImage();
        img.onload = () => {
          if (!this.canvas) return;
          this.setData({ logoImage: img, logoPath: path, activeTool: 'logo', toolbarExpanded: true });
          this.updateCanvas();
        };
        img.src = path;
      },
      fail: () => {},
    });
  },

  _loadPendingLogo() {
    if (this.pendingLogoPath && this.canvas) {
      const path = this.pendingLogoPath;
      this.pendingLogoPath = null;
      const img = this.canvas.createImage();
      img.onload = () => {
        if (!this.canvas) return;
        this.setData({ logoImage: img, logoPath: path, activeTool: 'logo', toolbarExpanded: true });
        this.updateCanvas();
      };
      img.src = path;
    }
  },

  onLogoScale(e) {
    const v = e.detail.value;
    this.setData({ logoScale: v / 100, logoScalePercent: v });
    this.updateCanvas();
  },

  // === BG Color ===

  setBgColor(e) {
    this.setData({ bgColor: e.currentTarget.dataset.color });
    this.updateCanvas();
  },

  onBgOpacity(e) {
    this.setData({ bgOpacity: e.detail.value });
    this.updateCanvas();
  },

  onBgFeather(e) {
    this.setData({ bgFeather: e.detail.value });
    this.updateCanvas();
  },

  // === Free Text ===

  addText() {
    const key = 't' + Date.now();
    const newText = { key, content: '', color: '#ffffff', fontSize: 28, x: 0.5, y: 0.5 };
    const texts = [...this.data.texts, newText];
    this.setData({ texts, currentText: newText, currentTextKey: newText.key, activeTool: 'text', toolbarExpanded: true });
    this.updateCanvas();
  },

  deleteText() {
    const ct = this.data.currentText;
    if (!ct) return;
    const texts = this.data.texts.filter(t => t.key !== ct.key);
    const newCt = texts.length > 0 ? texts[texts.length - 1] : null;
    this.setData({ texts, currentText: newCt, currentTextKey: newCt ? newCt.key : null, activeTool: newCt ? 'text' : null });
    this.updateCanvas();
  },

  onTextSelect(e) {
    const key = e.currentTarget.dataset.key;
    const ct = this.data.texts.find(t => t.key === key);
    if (ct) this.setData({ currentText: ct, currentTextKey: ct.key, activeTool: 'text', toolbarExpanded: true });
  },

  onTextInput(e) {
    const { key } = e.currentTarget.dataset;
    const texts = this.data.texts.map(t => t.key === key ? { ...t, content: e.detail.value } : t);
    const ct = texts.find(t => t.key === key);
    this.setData({ texts, currentText: ct, currentTextKey: ct.key });
    this.updateCanvas();
  },

  onTextColor(e) {
    const { key, color } = e.currentTarget.dataset;
    const texts = this.data.texts.map(t => t.key === key ? { ...t, color } : t);
    const ct = texts.find(t => t.key === key);
    this.setData({ texts, currentText: ct, currentTextKey: ct.key });
    this.updateCanvas();
  },

  onTextFontSize(e) {
    const { key } = e.currentTarget.dataset;
    const v = parseInt(e.detail.value);
    const texts = this.data.texts.map(t => t.key === key ? { ...t, fontSize: v } : t);
    const ct = texts.find(t => t.key === key);
    this.setData({ texts, currentText: ct, currentTextKey: ct.key });
    this.updateCanvas();
  },

  startColorPicker() {
    if (this.data.pickingColor) { this.setData({ pickingColor: false }); return; }
    this.setData({ pickingColor: true });
    wx.showToast({ title: '点击画布吸取颜色', icon: 'none' });
  },

  _pickColorFromCanvas(x, y) {
    if (!this.ctx) return null;
    const dpr = this.dpr || 2;
    try {
      const data = this.ctx.getImageData(x * dpr, y * dpr, 1, 1).data;
      if (!data || data.length < 3) return null;
      const [r, g, b] = data;
      return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    } catch (e) { return null; }
  },

  switchTool(e) {
    const tool = e.currentTarget.dataset.tool;
    this.setData({ activeTool: this.data.activeTool === tool ? null : tool, toolbarExpanded: true });
  },

  toggleToolbar() {
    const expanded = !this.data.toolbarExpanded;
    if (this.data.pickingColor) {
      this.setData({ pickingColor: false });
    }
    this.setData({ toolbarExpanded: expanded, activeTool: expanded ? (this.data.activeTool || 'text') : null });
  },

  // === Canvas touch ===

  onTouchStart(e) {
    const touch = e.touches[0];
    if (!touch) return;

    const x = touch.x;
    const y = touch.y;
    if (x < 0 || x > this.data.canvasWidth || y < 0 || y > this.data.canvasHeight) return;

    if (this.data.pickingColor) {
      const color = this._pickColorFromCanvas(x, y);
      if (color && this.data.currentText) {
        const key = this.data.currentText.key;
        const texts = this.data.texts.map(t => t.key === key ? { ...t, color } : t);
        this.setData({ texts, currentText: { ...this.data.currentText, color }, currentTextKey: this.data.currentText.key, pickingColor: false });
        this.updateCanvas();
        wx.showToast({ title: `已取色 ${color}`, icon: 'none' });
      } else {
        this.setData({ pickingColor: false });
        wx.showToast({ title: '取色失败', icon: 'none' });
      }
      return;
    }

    const { canvasWidth, canvasHeight, texts, logoImage } = this.data;

    for (const t of texts) {
      const tx = t.x * canvasWidth;
      const ty = t.y * canvasHeight;
      const fs = t.fontSize * (canvasWidth / 1080);
      if (Math.abs(x - tx) < fs * 3 && Math.abs(y - ty) < fs) {
        this.setData({ dragTarget: 'text_' + t.key, touchStartX: x, touchStartY: y, dragOriginX: t.x, dragOriginY: t.y, currentText: t, currentTextKey: t.key, isDragging: false });
        return;
      }
    }

    if (logoImage) {
      const lx = this.data.logoX * canvasWidth;
      const ly = this.data.logoY * canvasHeight;
      const hitR = Math.max(30, canvasWidth * 0.05);
      if (Math.abs(x - lx) < hitR && Math.abs(y - ly) < hitR) {
        this.setData({ isDragging: false, dragTarget: 'logo', touchStartX: x, touchStartY: y, dragOriginX: this.data.logoX, dragOriginY: this.data.logoY });
      }
    }
  },

  onTouchMove(e) {
    if (!this.data.dragTarget) return;
    const touch = e.touches[0];
    if (!touch) return;
    const cx = touch.x;
    const cy = touch.y;

    if (!this.data.isDragging) {
      const dx = Math.abs(cx - this.data.touchStartX);
      const dy = Math.abs(cy - this.data.touchStartY);
      if (dx < 10 && dy < 10) return;
      this.setData({ isDragging: true });
    }

    const dx = (cx - this.data.touchStartX) / this.data.canvasWidth;
    const dy = (cy - this.data.touchStartY) / this.data.canvasHeight;
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
    if (!this.data.isDragging && this.data.dragTarget) {
      if (this.data.dragTarget.startsWith('text_')) {
        this.setData({ activeTool: 'text', toolbarExpanded: true });
      } else if (this.data.dragTarget === 'logo') {
        this.setData({ activeTool: 'logo', toolbarExpanded: true });
      }
    }
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
      const textOk = await checkText(this.data.texts.map(t => t.content).filter(Boolean).join(''));
      if (!textOk.pass) { wx.hideLoading(); this.setData({ saving: false }); wx.showToast({ title: textOk.errMsg, icon: 'none' }); return; }

      const exportW = 1080;
      const exportH = Math.round(exportW / (this.data.imageRatio || 1));

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
        let lw = this.data.logoImage.width;
        let lh = this.data.logoImage.height;
        const ratio = lw / lh;
        const maxW = exportW * 0.4;
        if (lw > maxW) { lw = maxW; lh = lw / ratio; }
        const scale = this.data.logoScale || 0.3;
        lw = lw * scale;
        lh = lh * scale;
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
        wx.canvasToTempFilePath({ canvas, fileType: 'png', quality: 1, success: resolve, fail: reject }, this);
      });

      const imgOk = await checkImage(tmp.tempFilePath);
      if (!imgOk.pass) { wx.hideLoading(); this.setData({ saving: false }); wx.showToast({ title: imgOk.errMsg, icon: 'none' }); return; }

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

  async incrementUsage() {
    try {
      await UsageControl.increment('poster');
      this.setData({ used: true, remaining: 0 });
    } catch (e) {
      console.warn('[Poster] 记录使用失败', e);
    }
  },

  // === Fullscreen preview ===

  openFullscreen() {
    if (this.data.fullscreenOpen || this._fsLock || !this.canvas) return;
    this._fsLock = true;
    wx.canvasToTempFilePath({
      canvas: this.canvas,
      fileType: 'png',
      quality: 0.8,
      success: (res) => {
        if (!res.tempFilePath) return;
        this.setData({ fullscreenSrc: res.tempFilePath, fullscreenOpen: true });
      },
    }, this);
    setTimeout(() => { this._fsLock = false; }, 500);
  },

  closeFullscreen() {
    if (!this.data.fullscreenOpen || this._fsLock) return;
    this._fsLock = true;
    this.setData({ fullscreenOpen: false, fullscreenSrc: '' });
    setTimeout(() => { this._fsLock = false; }, 300);
  },

  // === Navigation ===

  onBack() {
    if (this.data.mode === 'entry') {
      this.setData({ mode: 'category', currentEntry: null });
    } else if (this.data.mode === 'edit') {
      this.clearCanvasData();
      this.setData({ mode: 'entry' });
    } else {
      const pages = getCurrentPages();
      if (pages.length > 1) {
        wx.navigateBack();
      } else {
        wx.reLaunch({ url: '/pages/index/index' });
      }
    }
  },

  clearCanvasData() {
    this._clearTimers();
    this.canvas = null;
    this.ctx = null;
    this.pendingLogoPath = null;
    this._fsLock = null;
    this.setData({
      canvasWidth: 0, canvasHeight: 0,
      bgImage: null, logoImage: null, hasImage: false,
      bgPath: '', canvasW: 0, canvasH: 0,
      fullscreenOpen: false, fullscreenSrc: '',
    });
  },

  clearAll() {
    this.canvas = null;
    this.ctx = null;
    this._entriesLoaded = false;
    this.setData({
      mode: 'category', currentEntry: null, templates: [],
      selectedTemplate: null, templateDetail: null,
      canvasWidth: 0, canvasHeight: 0,
      bgImage: null, bgPath: '', hasImage: false,
      logoImage: null, logoPath: '', texts: [],
      bgColor: '', bgOpacity: 30, bgFeather: 70,
      imageRatio: 1, canvasW: 0, canvasH: 0,
            fullscreenOpen: false, fullscreenSrc: '',
            pickingColor: false,
          });
  },

  onShareAppMessage() {
    return { title: '一键海报 - 快速制作精美海报', path: '/pages/poster/index' };
  },

  onUnload() { this._destroyed = true; this._clearTimers(); if (this._onResize) wx.offWindowResize(this._onResize); this.clearAll(); },
  _clearTimers() {
    if (this._initTimer) { clearTimeout(this._initTimer); this._initTimer = null; }
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
