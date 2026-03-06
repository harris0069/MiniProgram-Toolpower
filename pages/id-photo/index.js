const app = getApp();

// 常用规格定义
const SPECS = [
  { id: '1inch', name: '一寸', width: 25, height: 35, pxWidth: 295, pxHeight: 413, desc: '简历/证件' },
  { id: '2inch', name: '二寸', width: 35, height: 49, pxWidth: 413, pxHeight: 579, desc: '护照/签证' },
  { id: 'small1', name: '小一寸', width: 22, height: 32, pxWidth: 260, pxHeight: 378, desc: '驾照/社保' },
  { id: 'large1', name: '大一寸', width: 33, height: 48, pxWidth: 390, pxHeight: 567, desc: '部分护照' },
  { id: '5inch', name: '五寸', width: 89, height: 127, pxWidth: 1051, pxHeight: 1500, desc: '生活照' }
];

const COLORS = [
  { name: '白', color: '#FFFFFF' },
  { name: '蓝', color: '#438EDB' },
  { name: '红', color: '#C41919' },
  { name: '灰', color: '#CCCCCC' }
];

Page({
  data: {
    specs: SPECS,
    colors: COLORS,
    currentTab: 'spec',
    
    // 当前设置
    currentSpec: SPECS[0],
    backgroundColor: '#FFFFFF',
    
    // 图片状态
    tempImagePath: null,
    imgWidth: 0,
    imgHeight: 0,
    
    // 手势状态
    imgX: 0,
    imgY: 0,
    imgScale: 1,
    imgRotate: 0,
    
    // 预览框尺寸 (根据屏幕适配)
    previewWidth: 200,
    previewHeight: 280,
    
    // 历史
    showHistoryPanel: false,
    historyList: []
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

  // 更新预览框尺寸
  updatePreviewBoxSize(spec) {
    // 获取屏幕宽度，计算合适的显示比例
    const sysInfo = wx.getSystemInfoSync();
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
      // 重置图片位置，防止跑偏
      if (this.data.tempImagePath) {
         this.resetImagePosition();
      }
    }
  },

  // 设置背景
  setBg(e) {
    this.setData({ backgroundColor: e.currentTarget.dataset.color });
  },

  // 选择图片
  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const path = res.tempFilePaths[0];
        this.loadImage(path);
      }
    });
  },

  loadImage(path) {
    wx.getImageInfo({
      src: path,
      success: (res) => {
        // 计算初始显示尺寸（适应预览框）
        // 默认让图片宽度填满预览框，或者高度填满
        const previewW = this.data.previewWidth;
        const previewH = this.data.previewHeight;
        
        const imgRatio = res.width / res.height;
        const boxRatio = previewW / previewH;
        
        let drawWidth, drawHeight;
        
        // 默认 cover 模式：短边填满
        if (imgRatio > boxRatio) {
          // 图片更宽，以高度为准
          drawHeight = previewH;
          drawWidth = drawHeight * imgRatio;
        } else {
          // 图片更高，以宽度为准
          drawWidth = previewW;
          drawHeight = drawWidth / imgRatio;
        }

        this.setData({
          tempImagePath: path,
          imgWidth: drawWidth,
          imgHeight: drawHeight,
          // 居中
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
    // 重新触发一次 loadImage 的计算逻辑，或者简单居中
    // 这里简单重置为 scale 1 居中
    const previewW = this.data.previewWidth;
    const previewH = this.data.previewHeight;
    const drawWidth = this.data.imgWidth;
    const drawHeight = this.data.imgHeight;
    
    this.setData({
      imgX: (previewW - drawWidth) / 2,
      imgY: (previewH - drawHeight) / 2,
      imgScale: 1,
      imgRotate: 0
    });
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
      
      this.setData({
        imgX: this.data.imgX + deltaX,
        imgY: this.data.imgY + deltaY
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
      
      if (newScale > 0.1 && newScale < 5) {
        this.setData({ imgScale: newScale });
      }
      
      this.touchState.lastDistance = distance;
    }
  },

  onTouchEnd() {
    this.touchState.isTouching = false;
  },

  // 生成保存
  savePhoto() {
    if (!this.data.tempImagePath) return;
    
    wx.showLoading({ title: '生成中...' });
    
    const query = wx.createSelectorQuery();
    query.select('#photoCanvas')
      .fields({ node: true, size: true })
      .exec(async (res) => {
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        
        const spec = this.data.currentSpec;
        
        // 设置 Canvas 为目标高分尺寸
        canvas.width = spec.pxWidth;
        canvas.height = spec.pxHeight;
        
        // 填充背景色
        ctx.fillStyle = this.data.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 计算图片在 Canvas 中的位置
        // 比例转换: 预览框尺寸 -> 目标Canvas尺寸
        const scaleRatio = spec.pxWidth / this.data.previewWidth;
        
        const img = canvas.createImage();
        img.src = this.data.tempImagePath;
        
        img.onload = () => {
          ctx.save();
          
          // 变换坐标系
          // 1. 移动到图片中心点 (考虑偏移和缩放)
          // 图片当前在预览框中的显示中心
          const previewImgCenterX = this.data.imgX + this.data.imgWidth / 2;
          const previewImgCenterY = this.data.imgY + this.data.imgHeight / 2;
          
          // 映射到 Canvas 坐标
          const canvasImgCenterX = previewImgCenterX * scaleRatio;
          const canvasImgCenterY = previewImgCenterY * scaleRatio;
          
          ctx.translate(canvasImgCenterX, canvasImgCenterY);
          ctx.rotate(this.data.imgRotate * Math.PI / 180);
          ctx.scale(this.data.imgScale, this.data.imgScale);
          
          // 绘制图片 (以中心点为基准)
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
              this.saveToAlbum(res.tempFilePath);
              this.addToHistory(res.tempFilePath, spec.name);
            },
            fail: (err) => {
              console.error(err);
              wx.hideLoading();
              wx.showToast({ title: '生成失败', icon: 'none' });
            }
          });
        };
      });
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
        // 检查权限
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

  // 历史记录逻辑
  loadHistory() {
    const list = wx.getStorageSync('idphoto_history') || [];
    this.setData({ historyList: list });
  },
  
  addToHistory(path, specName) {
    // 保存文件到本地存储 (因为 tempFilePath 会失效，这里为了演示只存 temp，实际应 saveFile)
    wx.getFileSystemManager().saveFile({
      tempFilePath: path,
      success: (res) => {
        const savedPath = res.savedFilePath;
        const item = {
          path: savedPath,
          specName: specName,
          timestamp: Date.now(),
          dateStr: new Date().toLocaleDateString() + ' ' + new Date().getHours() + ':' + new Date().getMinutes()
        };
        
        let list = [item, ...this.data.historyList];
        if (list.length > 3) list = list.slice(0, 3);
        
        this.setData({ historyList: list });
        wx.setStorageSync('idphoto_history', list);
      }
    });
  },
  
  showHistory() { this.setData({ showHistoryPanel: true }); },
  hideHistory() { this.setData({ showHistoryPanel: false }); },
  
  clearHistory() {
    this.setData({ historyList: [] });
    wx.removeStorageSync('idphoto_history');
    // 可选：删除本地文件释放空间
  },
  
  previewHistory(e) {
    wx.previewImage({ urls: [e.currentTarget.dataset.url] });
  },
  
  saveHistoryImage(e) {
    this.saveToAlbum(e.currentTarget.dataset.path);
  }
})