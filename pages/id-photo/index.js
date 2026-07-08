const app = getApp();
const { checkImage } = require('../../utils/security.js');
const UsageControl = require('../../utils/usageControl.js');

// 常用规格定义
const SPECS = [
  { id: 'small1', name: '小一寸', width: 22, height: 32, pxWidth: 260, pxHeight: 378, desc: '驾驶证/社保' },
  { id: '1inch', name: '一寸', width: 25, height: 35, pxWidth: 295, pxHeight: 413, desc: '简历/证件' },
  { id: 'large1', name: '大一寸', width: 33, height: 48, pxWidth: 390, pxHeight: 567, desc: '护照/部分签证' },
  { id: 'small2', name: '小二寸', width: 35, height: 45, pxWidth: 413, pxHeight: 531, desc: '部分签证/护照' },
  { id: '2inch', name: '二寸', width: 35, height: 49, pxWidth: 413, pxHeight: 579, desc: '毕业证/部分证件' },
  { id: 'large2', name: '大二寸', width: 35, height: 53, pxWidth: 413, pxHeight: 626, desc: '部分证书/留学' }
];

const COLORS = [
  { name: '白色', color: '#FFFFFF' },
  { name: '蓝色', color: '#438EDB' },
  { name: '红色', color: '#C41919' },
  { name: '灰色', color: '#CCCCCC' }
];

Page({
  data: {
    specs: SPECS,
    colors: COLORS,
    currentTab: 'spec',
    showColorPicker: false,
    
    // 当前设置
    currentSpec: SPECS[0],
    backgroundColor: '#FFFFFF',
    
    // Image state
    tempImagePath: null,
    imgWidth: 0,
    imgHeight: 0,
    
    // Gesture state
    imgX: 0,
    imgY: 0,
    imgScale: 1,
    imgRotate: 0,
    
    // Preview box size
    previewWidth: 200,
    previewHeight: 280,
    
    // 历史
    showHistoryPanel: false,
    historyList: [],
    
    // 抠图状态
    isTransparentBg: false,
    originalImagePath: null, // 保存原始图片路径
    isProcessingBg: false, // 是否正在处理背景

    // 安全区
    safeAreaBottom: 0,

    // 使用次数
    remainingUses: -1,
    showRedeemModal: false,
    redeemCode: '',
    redeemError: '',
    isRedeeming: false,

    // 6寸排版
    showLayoutPanel: false,
    layoutRows: 4,
    layoutCols: 4,
    layoutGap: 24,
    layoutOffsetX: 0,
    layoutOffsetY: 0,
    layoutTotal: 16,
    layoutPreviewUrl: '',
    layoutGenerating: false,
    layoutSinglePath: ''
  },
  
  // 触摸手势变量
  touchState: {
    lastX: 0,
    lastY: 0,
    lastDistance: 0,
    isTouching: false
  },

  onLoad() {
    this.checkFeatureEnabled();
    this.updatePreviewBoxSize(this.data.currentSpec);
    this.setData({ historyList: [] });
    this.fetchUsage();
    this.applySafeArea();
  },

  async checkFeatureEnabled() {
    try {
      const res = await UsageControl.featureFlag('id-photo');
      if (!res.enabled) {
        const msg = res.message || '功能暂不可用';
        wx.showToast({ title: msg, icon: 'none', duration: 2000 });
        setTimeout(() => wx.navigateBack(), 2000);
      }
    } catch (e) {
      console.warn('[ID Photo] 获取功能开关失败', e);
    }
  },

  applySafeArea() {
    try {
      const info = wx.getWindowInfo();
      const safeBottom = info.screenHeight - info.safeArea.bottom;
      if (safeBottom > 0) {
        this.setData({ safeAreaBottom: safeBottom });
      }
    } catch (e) {}
  },

  // Recalculate preview box size
  updatePreviewBoxSize(spec) {
    // 获取屏幕宽度，计算合适的显示比例
    const sysInfo = wx.getWindowInfo();
    const maxWidth = sysInfo.windowWidth * 0.8;
    const maxHeight = sysInfo.windowHeight * 0.5;
    
    const ratio = spec.width / spec.height;
    
    let w = maxWidth;
    let h = w / ratio;
    
    if (h > maxHeight) {
      h = maxHeight;
      w = h * ratio;
    }
    
    this.setData({
      previewWidth: w,
      previewHeight: h
    });
  },

  // 切换 Tab
  switchTab(e) {
    this.setData({ currentTab: e.currentTarget.dataset.tab });
  },

  // 设置规格
  setSpec(e) {
    const id = e.currentTarget.dataset.id;
    const spec = this.data.specs.find(s => s.id === id);
    if (spec) {
      this.setData({ currentSpec: spec });
      this.updatePreviewBoxSize(spec);
      // Reset placement after spec change
      if (this.data.tempImagePath) {
         this.resetImagePosition();
      }
    }
  },

  // 设置背景（自动触发抠图）
  async setBg(e) {
    const newColor = e.currentTarget.dataset.color;
    
    // 如果没有图片，直接设置颜色
    if (!this.data.tempImagePath) {
      this.setData({ backgroundColor: newColor });
      return;
    }
    
    // 如果已经是透明背景，直接切换颜色
    if (this.data.isTransparentBg) {
      this.setData({ backgroundColor: newColor });
      return;
    }
    
    // 第一次切换背景，需要抠图
    this.setData({ backgroundColor: newColor });
    
    // 显示提示
    wx.showLoading({ 
      title: 'AI 抠图中...',
      mask: true 
    });
    
    await this.autoRemoveBackground();
    
    wx.hideLoading();
  },

  async toggleColorPicker() {
    const customColors = [
      { label: '浅蓝 #DCEBFF', value: '#DCEBFF' },
      { label: '米白 #F7F1E3', value: '#F7F1E3' },
      { label: '淡粉 #F8D7DA', value: '#F8D7DA' },
      { label: '浅灰 #E5E7EB', value: '#E5E7EB' }
    ];

    this.setData({ showColorPicker: true });
    wx.showActionSheet({
      itemList: customColors.map(item => item.label),
      success: async (res) => {
        const newColor = customColors[res.tapIndex].value;
        
        // 如果没有图片，直接设置颜色
        if (!this.data.tempImagePath) {
          this.setData({ backgroundColor: newColor });
          return;
        }
        
        // 如果已经是透明背景，直接切换颜色
        if (this.data.isTransparentBg) {
          this.setData({ backgroundColor: newColor });
          return;
        }
        
        // 第一次切换背景，需要抠图
        this.setData({ backgroundColor: newColor });
        
        // 显示提示
        wx.showLoading({ 
          title: 'AI 抠图中...',
          mask: true 
        });
        
        await this.autoRemoveBackground();
        
        wx.hideLoading();
      },
      complete: () => {
        this.setData({ showColorPicker: false });
      }
    });
  },

  // 选择图片
  async chooseImage() {
    try {
      const res = await new Promise((resolve, reject) => {
        wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sourceType: ['album', 'camera'],
          sizeType: ['compressed'],
          success: resolve,
          fail: reject
        });
      });
      
      const tempFilePath = res.tempFiles[0].tempFilePath;
      const fileSize = res.tempFiles[0].size;
      
      // 检查文件大小
      if (fileSize > 4 * 1024 * 1024) {
        wx.showToast({
          title: '图片过大，请选择小于 4MB 的图片',
          icon: 'none'
        });
        return;
      }
      
      const imgOk = await checkImage(tempFilePath);
      if (!imgOk.pass) { wx.showToast({ title: imgOk.errMsg, icon: 'none' }); return; }

      this.setData({ 
        isTransparentBg: false,
        originalImagePath: tempFilePath
      });
      await this.loadImage(tempFilePath);
      
    } catch (error) {
      if (error.errMsg && !error.errMsg.includes('cancel')) {
        console.error('选择图片失败', error);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    }
  },

  loadImage(path) {
    wx.getImageInfo({
      src: path,
      success: (res) => {
        const previewW = this.data.previewWidth;
        const previewH = this.data.previewHeight;

        const imgRatio = res.width / res.height;
        const boxRatio = previewW / previewH;

        let drawWidth;
        let drawHeight;

        if (imgRatio > boxRatio) {
          drawHeight = previewH;
          drawWidth = drawHeight * imgRatio;
        } else {
          drawWidth = previewW;
          drawHeight = drawWidth / imgRatio;
        }

        this.setData({
          tempImagePath: path,
          imgWidth: drawWidth,
          imgHeight: drawHeight,
          imgX: (previewW - drawWidth) / 2,
          imgY: (previewH - drawHeight) / 2,
          imgScale: 1,
          imgRotate: 0
        });
      }
    });
  },
  
  resetImagePosition() {
    if (!this.data.tempImagePath) return;
    // 重新加载图片以完全重置状态
    this.loadImage(this.data.tempImagePath);
  },

  // 旋转
  rotateImage() {
    this.setData({ imgRotate: (this.data.imgRotate + 90) % 360 });
  },
  
  resetImage() {
    this.loadImage(this.data.tempImagePath);
  },

  // 手势处理
  onTouchStart(e) {
    if (e.touches.length === 1) {
      this.touchState.lastX = e.touches[0].clientX;
      this.touchState.lastY = e.touches[0].clientY;
      this.touchState.isTouching = true;
    } else if (e.touches.length === 2) {
      // 双指
      const xMove = e.touches[1].clientX - e.touches[0].clientX;
      const yMove = e.touches[1].clientY - e.touches[0].clientY;
      this.touchState.lastDistance = Math.sqrt(xMove * xMove + yMove * yMove);
      this.touchState.isTouching = true;
    }
  },

  onTouchMove(e) {
    if (!this.touchState.isTouching) return;

    if (e.touches.length === 1) {
      // 单指拖动
      const clientX = e.touches[0].clientX;
      const clientY = e.touches[0].clientY;
      
      const deltaX = clientX - this.touchState.lastX;
      const deltaY = clientY - this.touchState.lastY;
      
      // 计算新位置（暂不限制边界，保持灵活性）
      const newX = this.data.imgX + deltaX;
      const newY = this.data.imgY + deltaY;
      
      this.setData({
        imgX: newX,
        imgY: newY
      });
      
      this.touchState.lastX = clientX;
      this.touchState.lastY = clientY;
      
    } else if (e.touches.length === 2) {
      // 双指缩放
      const xMove = e.touches[1].clientX - e.touches[0].clientX;
      const yMove = e.touches[1].clientY - e.touches[0].clientY;
      const distance = Math.sqrt(xMove * xMove + yMove * yMove);
      
      const distanceDiff = distance - this.touchState.lastDistance;
      const newScale = this.data.imgScale + 0.005 * distanceDiff;
      
      // 限制缩放范围：0.2 到 5 倍
      const clampedScale = Math.max(0.2, Math.min(5, newScale));
      
      if (clampedScale !== this.data.imgScale) {
        this.setData({ imgScale: clampedScale });
      }
      
      this.touchState.lastDistance = distance;
    }
  },

  onTouchEnd() {
    this.touchState.isTouching = false;
  },

  // 生成证件照（不保存到相册）
  generatePhoto() {
    return new Promise((resolve, reject) => {
      if (!this.data.tempImagePath) {
        reject(new Error('没有图片'));
        return;
      }

      const spec = this.data.currentSpec;
      const scaleRatio = spec.pxWidth / this.data.previewWidth;

      const doDraw = (canvas) => {
        const ctx = canvas.getContext('2d');
        canvas.width = spec.pxWidth;
        canvas.height = spec.pxHeight;

        ctx.fillStyle = this.data.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const img = canvas.createImage();
        const timer = setTimeout(() => {
          reject(new Error('图片加载超时'));
        }, 10000);

        img.onload = () => {
          clearTimeout(timer);
          try {
            ctx.save();
            const cx = this.data.imgX + this.data.imgWidth / 2;
            const cy = this.data.imgY + this.data.imgHeight / 2;
            ctx.translate(cx * scaleRatio, cy * scaleRatio);
            ctx.rotate(this.data.imgRotate * Math.PI / 180);
            ctx.scale(this.data.imgScale, this.data.imgScale);
            ctx.drawImage(img, -this.data.imgWidth * scaleRatio / 2, -this.data.imgHeight * scaleRatio / 2, this.data.imgWidth * scaleRatio, this.data.imgHeight * scaleRatio);
            ctx.restore();

            wx.canvasToTempFilePath({
              canvas: canvas,
              fileType: 'jpg',
              quality: 1,
              success: (res) => resolve(res.tempFilePath),
              fail: () => reject(new Error('导出图片失败'))
            });
          } catch (e) {
            reject(new Error('绘制图片失败: ' + e.message));
          }
        };

        img.onerror = () => {
          clearTimeout(timer);
          reject(new Error('图片加载失败'));
        };

        img.src = this.data.tempImagePath;
      };

      // 优先使用离屏 Canvas（兼容 Skyline 和 WebView）
      try {
        const offscreen = wx.createOffscreenCanvas({ type: '2d', width: spec.pxWidth, height: spec.pxHeight });
        if (offscreen && offscreen.getContext) {
          doDraw(offscreen);
          return;
        }
      } catch (e) {}

      // 回退：从页面 Canvas 节点获取
      const query = wx.createSelectorQuery().in(this);
      query.select('#photoCanvas').fields({ node: true, size: true }).exec((res) => {
        if (res && res[0] && res[0].node) {
          doDraw(res[0].node);
        } else {
          reject(new Error('Canvas 不可用'));
        }
      });
    });
  },

  // 生成并保存到相册
  async savePhoto() {
    if (!this.data.tempImagePath) return;
    
    wx.showLoading({ title: '生成中...' });
    
    try {
      const tempFilePath = await this.generatePhoto();
      await this.saveToAlbum(tempFilePath);

    } catch (error) {
      console.error('生成失败', error);
      wx.hideLoading();
      wx.showToast({ title: '生成失败', icon: 'none' });
    }
  },
  
  async saveToAlbum(filePath) {
    const imgOk = await checkImage(filePath);
    if (!imgOk.pass) { wx.hideLoading(); wx.showToast({ title: imgOk.errMsg, icon: 'none' }); return; }
    wx.saveImageToPhotosAlbum({
      filePath: filePath,
      success: () => {
        wx.hideLoading();
        wx.showToast({ title: '已保存到相册', icon: 'success' });
      },
      fail: (err) => {
        wx.hideLoading();
        if (err.errMsg && err.errMsg.includes('auth')) {
          wx.showModal({
            title: '提示',
            content: '需要相册权限保存图片',
            confirmText: '去设置',
            success: (res) => {
               if (res.confirm) wx.openSetting();
            }
          });
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' });
        }
      }
    });
  },

  showHistory() { this.setData({ showHistoryPanel: true }); },
  hideHistory() { this.setData({ showHistoryPanel: false }); },

  onClosePanel() {
    this.setData({ showLayoutPanel: false, showRedeemModal: false, showHistoryPanel: false });
  },
  
  clearHistory() {
    this.setData({ historyList: [] });
  },
  
  previewHistory(e) {
    wx.previewImage({ urls: [e.currentTarget.dataset.url] });
  },
  
  saveHistoryImage(e) {
    this.saveToAlbum(e.currentTarget.dataset.path);
  },

  /**
   * 查询当日剩余使用次数
   */
  async fetchUsage() {
    try {
      const res = await UsageControl.check('id-photo');
      this.setData({ remainingUses: res.remaining });
    } catch (e) {
      console.warn('[ID Photo] 获取使用次数失败', e);
    }
  },

  showRedeemModal() {
    this.setData({ showRedeemModal: true, redeemCode: '', redeemError: '' });
  },

  hideRedeemModal() {
    this.setData({ showRedeemModal: false, redeemCode: '', redeemError: '' });
  },

  onRedeemInput(e) {
    this.setData({ redeemCode: e.detail.value, redeemError: '' });
  },

  async doRedeem() {
    const code = this.data.redeemCode.trim().toUpperCase();
    if (!code) return;

    this.setData({ isRedeeming: true, redeemError: '' });

    try {
      const res = await UsageControl.redeem('id-photo', code);

      wx.showToast({ title: res.message || '兑换成功', icon: 'success' });
      this.setData({
        showRedeemModal: false,
        redeemCode: '',
      });
      // 刷新使用次数
      this.fetchUsage();
    } catch (e) {
      this.setData({ redeemError: e.message || '兑换失败' });
    } finally {
      this.setData({ isRedeeming: false });
    }
  },

  /**
   * 自动抠图（用户无感知）- 使用后端API
   */
  async autoRemoveBackground() {
    // 如果正在处理或已经是透明背景，直接返回
    if (this.data.isProcessingBg || this.data.isTransparentBg) {
      return;
    }
    
    // 如果没有原始图片，直接返回
    if (!this.data.originalImagePath) {
      return;
    }
    
    this.setData({ isProcessingBg: true });
    
    const startTime = Date.now();
    
    try {
      const ApiClient = require('../../utils/apiClient.js');
      const openid = UsageControl._getOpenId();

      // 检查剩余次数
      const usage = await UsageControl.check('id-photo');
      if (usage.remaining <= 0) {
        throw new Error('今日AI抠图次数已用完，请明日再试或输入兑换码增加次数');
      }

      // 1. 将图片转换为Base64
      console.log('[ID Photo] 开始转换图片为Base64...');
      const imageBase64 = await ApiClient.imageToBase64(this.data.originalImagePath);
      console.log('[ID Photo] 图片转换成功，大小:', Math.round(imageBase64.length / 1024), 'KB');
      
      // 2. 调用人像分割API（带重试机制）
      console.log('[ID Photo] 开始调用人像分割API...');
      const result = await ApiClient.retry(async () => {
        return await ApiClient.removeBackground(imageBase64, openid);
      }, 2, 3000); // 最多重试2次，间隔3秒
      
      console.log('[ID Photo] API调用成功:', {
        id: result.id,
        processing_time: result.processing_time
      });
      
      // 4. 将Base64结果保存为本地文件
      console.log('[ID Photo] 开始保存处理结果...');
      const processedFilePath = await ApiClient.base64ToFile(result.result_image);
      console.log('[ID Photo] 处理结果保存成功:', processedFilePath);
      
      // 5. 加载处理后的图片
      this.setData({ isTransparentBg: true });
      await this.loadImage(processedFilePath);

      // 刷新剩余次数
      this.fetchUsage();
      
      const totalDuration = Date.now() - startTime;
      console.log('[ID Photo] 抠图完成，总耗时:', totalDuration + 'ms');
      
      // 显示成功提示
      wx.showToast({
        title: `AI抠图成功 (${(totalDuration / 1000).toFixed(1)}s)`,
        icon: 'success',
        duration: 2000
      });
      
      // 震动反馈
      try {
        wx.vibrateShort({ type: 'medium' });
      } catch (e) {}
      
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      
      console.error('================================');
      console.error('[ID Photo] 抠图失败');
      console.error('错误类型:', error.name);
      console.error('错误信息:', error.message);
      console.error('错误详情:', error);
      console.error('总耗时:', totalDuration + 'ms');
      console.error('================================');
      
      // 显示用户友好的错误提示
      let errorMsg = '抠图失败';
      let showRedeem = false;
      if (error.message.includes('用完') || error.message.includes('兑换码')) {
        errorMsg = error.message;
        showRedeem = true;
      } else if (error.message.includes('网络')) {
        errorMsg = '网络连接失败，请检查网络';
      } else if (error.message.includes('timeout')) {
        errorMsg = '处理超时，请重试';
      } else if (error.message.includes('API')) {
        errorMsg = '服务暂时不可用，请稍后重试';
      }
      
      // 刷新剩余次数
      this.fetchUsage();

      if (showRedeem) {
        wx.showModal({
          title: '今日次数已用完',
          content: errorMsg,
          confirmText: '输入兑换码',
          cancelText: '关闭',
          success: (res) => {
            if (res.confirm) {
              this.showRedeemModal();
            }
          }
        });
      } else {
        wx.showModal({
          title: '抠图失败',
          content: `${errorMsg}\n\n是否使用原图继续制作证件照？`,
          confirmText: '使用原图',
          cancelText: '重新选择',
          success: (res) => {
            if (res.confirm) {
              this.setData({ isTransparentBg: false });
            } else {
              this.chooseImage();
            }
          }
        });
      }
      
    } finally {
      this.setData({ isProcessingBg: false });
    }
  },

  // ========== 6寸排版打印 ==========

  calc6InchLayout(specPxW, specPxH) {
    const PAPER_W = 1200;
    const PAPER_H = 1800;
    const MARGIN = 40;
    const GAP = 24;
    const usableW = PAPER_W - MARGIN * 2;
    const usableH = PAPER_H - MARGIN * 2;
    const cols = Math.max(1, Math.floor((usableW + GAP) / (specPxW + GAP)));
    const rows = Math.max(1, Math.floor((usableH + GAP) / (specPxH + GAP)));
    const usedW = specPxW * cols + GAP * (cols - 1);
    const usedH = specPxH * rows + GAP * (rows - 1);
    return {
      cols, rows, gap: GAP,
      offsetX: Math.floor((PAPER_W - usedW) / 2),
      offsetY: Math.floor((PAPER_H - usedH) / 2),
    };
  },

  async showLayoutPrint() {
    if (!this.data.tempImagePath || this.data.layoutGenerating) return;
    this.setData({ layoutGenerating: true });
    wx.showLoading({ title: '生成排版中...' });
    try {
      const spec = this.data.currentSpec;
      const singlePath = await this.generatePhoto();
      const layout = this.calc6InchLayout(spec.pxWidth, spec.pxHeight);
      this.setData({
        layoutSinglePath: singlePath,
        layoutRows: layout.rows,
        layoutCols: layout.cols,
        layoutGap: layout.gap,
        layoutOffsetX: layout.offsetX,
        layoutOffsetY: layout.offsetY,
        layoutTotal: layout.rows * layout.cols,
      });
      await this.generateLayoutPreview();
      this.setData({ showLayoutPanel: true });
    } catch (e) {
      wx.showToast({ title: '排版生成失败', icon: 'none' });
    } finally {
      this.setData({ layoutGenerating: false });
      wx.hideLoading();
    }
  },

  hideLayoutPanel() {
    this.setData({ showLayoutPanel: false, layoutPreviewUrl: '', layoutSinglePath: '' });
  },

  drawLayoutOnCanvas(canvas, scale) {
    return new Promise((resolve, reject) => {
      const { layoutCols, layoutRows, layoutOffsetX, layoutOffsetY, layoutGap, layoutSinglePath } = this.data;
      const spec = this.data.currentSpec;
      const ctx = canvas.getContext('2d');
      const w = 1200 * scale;
      const h = 1800 * scale;
      canvas.width = w;
      canvas.height = h;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
      const img = canvas.createImage();
      const timer = setTimeout(() => reject(new Error('timeout')), 10000);
      img.onload = () => {
        clearTimeout(timer);
        try {
          for (let r = 0; r < layoutRows; r++) {
            for (let c = 0; c < layoutCols; c++) {
              const x = (layoutOffsetX + c * (spec.pxWidth + layoutGap)) * scale;
              const y = (layoutOffsetY + r * (spec.pxHeight + layoutGap)) * scale;
              ctx.drawImage(img, x, y, spec.pxWidth * scale, spec.pxHeight * scale);
            }
          }
          resolve();
        } catch (e) { reject(e); }
      };
      img.onerror = () => { clearTimeout(timer); reject(new Error('img load failed')); };
      img.src = layoutSinglePath;
    });
  },

  async generateLayoutPreview() {
    try {
      const canvas = wx.createOffscreenCanvas({ type: '2d', width: 120, height: 180 });
      await this.drawLayoutOnCanvas(canvas, 0.1);
      const res = await new Promise((resolve, reject) => {
        wx.canvasToTempFilePath({
          canvas, fileType: 'jpg', quality: 0.8,
          success: resolve, fail: reject
        });
      });
      this.setData({ layoutPreviewUrl: res.tempFilePath });
    } catch (e) {
      console.warn('[Layout] preview failed', e);
    }
  },

  async adjustLayoutRows(e) {
    const delta = parseInt(e.currentTarget.dataset.delta);
    const newRows = Math.max(1, this.data.layoutRows + delta);
    this.setData({ layoutRows: newRows, layoutTotal: newRows * this.data.layoutCols });
    await this.generateLayoutPreview();
  },

  async adjustLayoutCols(e) {
    const delta = parseInt(e.currentTarget.dataset.delta);
    const newCols = Math.max(1, this.data.layoutCols + delta);
    this.setData({ layoutCols: newCols, layoutTotal: this.data.layoutRows * newCols });
    await this.generateLayoutPreview();
  },

  async saveLayoutPhoto() {
    wx.showLoading({ title: '保存排版中...' });
    try {
      const canvas = wx.createOffscreenCanvas({ type: '2d', width: 1200, height: 1800 });
      await this.drawLayoutOnCanvas(canvas, 1);
      const canvasRes = await new Promise((resolve, reject) => {
        wx.canvasToTempFilePath({
          canvas, fileType: 'jpg', quality: 0.95,
          success: resolve, fail: reject
        });
      });
      const imgOk = await checkImage(canvasRes.tempFilePath);
      if (!imgOk.pass) { wx.hideLoading(); wx.showToast({ title: imgOk.errMsg, icon: 'none' }); return; }
      await new Promise((resolve, reject) => {
        wx.saveImageToPhotosAlbum({
          filePath: canvasRes.tempFilePath,
          success: () => { wx.hideLoading(); wx.showToast({ title: '已保存到相册', icon: 'success' }); resolve(); },
          fail: (err) => {
            wx.hideLoading();
            if (err.errMsg && err.errMsg.includes('auth')) {
              wx.showModal({ title: '提示', content: '需要相册权限保存图片', confirmText: '去设置', success: (r) => { if (r.confirm) wx.openSetting(); } });
            } else {
              wx.showToast({ title: '保存失败', icon: 'none' });
            }
            reject(err);
          }
        });
      });
      this.hideLayoutPanel();
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  clearAll() {
    this.setData({
      backgroundColor: '#FFFFFF',
      imgWidth: 0, imgHeight: 0,
      imgX: 0, imgY: 0,
      imgScale: 1, imgRotate: 0,
      originalImagePath: null,
      layoutPreviewUrl: '',
    });
  },

  onUnload() { this.clearAll(); },
  onHide() { this.clearAll(); },

  onShareAppMessage() {
    return { title: '证件照制作 - 一键换底色', path: '/pages/id-photo/index' };
  },

})

