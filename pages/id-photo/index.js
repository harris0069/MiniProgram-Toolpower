const app = getApp();

// 常用规格定义
const SPECS = [
  { id: '1inch', name: '一寸', width: 25, height: 35, pxWidth: 295, pxHeight: 413, desc: '简历/证件' },
  { id: '2inch', name: '二寸', width: 35, height: 49, pxWidth: 413, pxHeight: 579, desc: '护照/签证' },
  { id: 'small1', name: '小一寸', width: 22, height: 32, pxWidth: 260, pxHeight: 378, desc: '驾驶证/社保' },
  { id: 'large1', name: '大一寸', width: 33, height: 48, pxWidth: 390, pxHeight: 567, desc: '部分护照' },
  { id: '5inch', name: '五寸', width: 89, height: 127, pxWidth: 1051, pxHeight: 1500, desc: '生活照' }
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
    isProcessingBg: false // 是否正在处理背景
  },
  
  // 触摸手势变量
  touchState: {
    lastX: 0,
    lastY: 0,
    lastDistance: 0,
    isTouching: false
  },

  onLoad() {
    this.updatePreviewBoxSize(this.data.currentSpec);
    this.loadHistory();
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

  // 选择图片（直接加载，不询问）
  async chooseImage() {
    try {
      // 1. 选择图片
      const res = await new Promise((resolve, reject) => {
        wx.chooseImage({
          count: 1,
          sizeType: ['compressed'], // 使用压缩图，避免超过 4MB
          sourceType: ['album', 'camera'],
          success: resolve,
          fail: reject
        });
      });
      
      const tempFilePath = res.tempFilePaths[0];
      const fileSize = res.tempFiles[0].size;
      
      // 检查文件大小
      if (fileSize > 4 * 1024 * 1024) {
        wx.showToast({
          title: '图片过大，请选择小于 4MB 的图片',
          icon: 'none'
        });
        return;
      }
      
      // 2. 直接加载原图，保存原始路径
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
      
      const query = wx.createSelectorQuery();
      query.select('#photoCanvas')
        .fields({ node: true, size: true })
        .exec(async (res) => {
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          
          const spec = this.data.currentSpec;
          
          // Render at the target export size.
          canvas.width = spec.pxWidth;
          canvas.height = spec.pxHeight;
          
          // Fill the selected background color.
          ctx.fillStyle = this.data.backgroundColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Map preview coordinates into export canvas coordinates.
          const scaleRatio = spec.pxWidth / this.data.previewWidth;
          
          const img = canvas.createImage();
          img.src = this.data.tempImagePath;
          
          img.onload = () => {
            ctx.save();
            
            // Move to the image center, then apply rotation and scaling.
            const previewImgCenterX = this.data.imgX + this.data.imgWidth / 2;
            const previewImgCenterY = this.data.imgY + this.data.imgHeight / 2;
            
            // Convert preview center to canvas center.
            const canvasImgCenterX = previewImgCenterX * scaleRatio;
            const canvasImgCenterY = previewImgCenterY * scaleRatio;
            
            ctx.translate(canvasImgCenterX, canvasImgCenterY);
            ctx.rotate(this.data.imgRotate * Math.PI / 180);
            ctx.scale(this.data.imgScale, this.data.imgScale);
            
            // Draw the transformed image around its center point.
            const drawW = this.data.imgWidth * scaleRatio;
            const drawH = this.data.imgHeight * scaleRatio;
            
            ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
            
            ctx.restore();
            
            // 导出
            wx.canvasToTempFilePath({
              canvas: canvas,
              fileType: 'jpg',
              quality: 1,
              success: (res) => {
                resolve(res.tempFilePath);
              },
              fail: (err) => {
                console.error(err);
                reject(err);
              }
            });
          };
          
          img.onerror = (err) => {
            reject(err);
          };
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
      this.addToHistory(tempFilePath, this.data.currentSpec.name);
    } catch (error) {
      console.error('生成失败', error);
      wx.hideLoading();
      wx.showToast({ title: '生成失败', icon: 'none' });
    }
  },

  // 仅保存到本地（不生成新图）
  async saveToLocal() {
    if (!this.data.tempImagePath) return;
    
    wx.showLoading({ title: '保存中...' });
    
    try {
      const tempFilePath = await this.generatePhoto();
      await this.saveToAlbum(tempFilePath);
      this.addToHistory(tempFilePath, this.data.currentSpec.name);
    } catch (error) {
      console.error('保存失败', error);
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },
  
  saveToAlbum(filePath) {
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
            title: '\u63d0\u793a',
            content: '\u9700\u8981\u76f8\u518c\u6743\u9650\u4fdd\u5b58\u56fe\u7247',
            confirmText: '\u53bb\u8bbe\u7f6e',
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

  removeSavedFiles(paths) {
    const fileSystemManager = wx.getFileSystemManager();
    (paths || []).filter(Boolean).forEach((filePath) => {
      try {
        // 检查文件是否存在
        const stats = fileSystemManager.statSync(filePath);
        if (stats) {
          fileSystemManager.unlinkSync(filePath);
        }
      } catch (error) {
        // 文件可能已被删除或不存在，记录警告但不中断流程
        console.warn('Remove saved file failed', filePath, error);
      }
    });
  },

  // 历史记录逻辑
  loadHistory() {
    const list = wx.getStorageSync('idphoto_history') || [];
    this.setData({ historyList: list });
  },
  
  addToHistory(path, specName) {
    wx.getFileSystemManager().saveFile({
      tempFilePath: path,
      success: (res) => {
        const savedPath = res.savedFilePath;
        const now = new Date();
        const h = now.getHours().toString().padStart(2, '0');
        const m = now.getMinutes().toString().padStart(2, '0');
        const item = {
          path: savedPath,
          specName: specName,
          timestamp: Date.now(),
          dateStr: now.toLocaleDateString() + ' ' + h + ':' + m
        };

        let list = [item, ...this.data.historyList];
        const removedItems = list.length > 3 ? list.slice(3) : [];
        if (removedItems.length > 0) {
          this.removeSavedFiles(removedItems.map(historyItem => historyItem.path));
          list = list.slice(0, 3);
        }

        this.setData({ historyList: list });
        wx.setStorageSync('idphoto_history', list);
      },
      fail: (error) => {
        console.error('Save history file failed', error);
      }
    });
  },
  
  showHistory() { this.setData({ showHistoryPanel: true }); },
  hideHistory() { this.setData({ showHistoryPanel: false }); },
  
  clearHistory() {
    this.removeSavedFiles(this.data.historyList.map(item => item.path));
    this.setData({ historyList: [] });
    wx.removeStorageSync('idphoto_history');
    // 可选：删除本地文件释放空间
  },
  
  previewHistory(e) {
    wx.previewImage({ urls: [e.currentTarget.dataset.url] });
  },
  
  saveHistoryImage(e) {
    this.saveToAlbum(e.currentTarget.dataset.path);
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
      // 引入API客户端
      const ApiClient = require('../../utils/apiClient.js');
      
      // 1. 将图片转换为Base64
      console.log('[ID Photo] 开始转换图片为Base64...');
      const imageBase64 = await ApiClient.imageToBase64(this.data.originalImagePath);
      console.log('[ID Photo] 图片转换成功，大小:', Math.round(imageBase64.length / 1024), 'KB');
      
      // 2. 获取用户openid
      const openid = await ApiClient.getOpenId();
      console.log('[ID Photo] 获取openid:', openid);
      
      // 3. 调用人像分割API（带重试机制）
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
      if (error.message.includes('网络')) {
        errorMsg = '网络连接失败，请检查网络';
      } else if (error.message.includes('timeout')) {
        errorMsg = '处理超时，请重试';
      } else if (error.message.includes('API')) {
        errorMsg = '服务暂时不可用，请稍后重试';
      }
      
      wx.showModal({
        title: '抠图失败',
        content: `${errorMsg}\n\n是否使用原图继续制作证件照？`,
        confirmText: '使用原图',
        cancelText: '重新选择',
        success: (res) => {
          if (res.confirm) {
            // 使用原图继续
            this.setData({ isTransparentBg: false });
          } else {
            // 重新选择图片
            this.chooseImage();
          }
        }
      });
      
    } finally {
      this.setData({ isProcessingBg: false });
    }
  },

  // 分享配置
  onShareAppMessage() {
    return {
      title: '证件照工具 - 快速制作证件照',
      path: '/pages/id-photo/index',
      imageUrl: ''
    };
  },

  onShareTimeline() {
    return {
      title: '证件照工具 - 快速制作证件照'
    };
  }
})

