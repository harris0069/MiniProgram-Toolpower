// 水印工具 - 主页面
Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    
    // 水印类型：text=文字水印, image=图片水印, tiled=全屏平铺
    watermarkType: 'text',
    
    // 底图相关
    baseImage: null,        // 底图 Image 对象
    baseImagePath: '',      // 底图路径
    baseImageWidth: 0,      // 底图原始宽度
    baseImageHeight: 0,     // 底图原始高度
    
    // Canvas 相关
    canvasWidth: 0,         // Canvas 宽度
    canvasHeight: 0,        // Canvas 高度
    canvasScale: 1,         // Canvas 缩放比例（用于适配屏幕）
    previewScale: 1,        // 预览缩放比例（双指缩放）
    
    // 文字水印参数
    textWatermark: {
      content: '',
      fontSize: 48,
      color: '#ffffff',
      opacity: 0.4,
      rotation: 0,
      lines: []             // 多行文字
    },
    
    // 图片水印参数
    imageWatermark: {
      path: '',
      image: null,
      scale: 0.5,
      rotation: 0,
      opacity: 0.5
    },
    
    // 平铺水印参数
    tiledWatermark: {
      mode: 'text',         // text=文字平铺, image=图片平铺
      textContent: '',
      imagePath: '',
      rowGap: 60,
      colGap: 60,
      rotation: 30
    },
    
    // 水印位置
    watermarkPosition: {
      x: 0,
      y: 0
    },
    
    // 交互状态
    isDragging: false,      // 是否正在拖拽
    touchStartX: 0,
    touchStartY: 0,
    lastWatermarkX: 0,
    lastWatermarkY: 0,
    showGuidelines: false,  // 是否显示辅助参考线
    
    // 双指缩放相关
    isZooming: false,       // 是否正在缩放
    lastDistance: 0,        // 上次两指距离
    
    // 按钮状态
    hasImage: false,        // 是否已选择图片
    canSave: false          // 是否可以保存
  },

  onLoad() {
    // 获取系统信息
    const systemInfo = wx.getWindowInfo();
    const statusBarHeight = systemInfo.statusBarHeight || 0;
    const navBarHeight = statusBarHeight + 44;
    
    this.setData({
      statusBarHeight,
      navBarHeight
    });
    
    // 初始化 Canvas
    this.initCanvas();
    
    // 清空上次的水印记录
    this.clearWatermarkData();
  },

  // 初始化 Canvas
  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#watermarkCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) return;
        
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        
        // 获取屏幕信息
        const systemInfo = wx.getWindowInfo();
        const dpr = systemInfo.pixelRatio || 2;
        
        // 使用查询到的实际尺寸
        const canvasWidth = res[0].width;
        const canvasHeight = res[0].height;
        
        // 设置 Canvas 实际大小
        canvas.width = canvasWidth * dpr;
        canvas.height = canvasHeight * dpr;
        
        // 缩放绘图上下文
        ctx.scale(dpr, dpr);
        
        // 保存 Canvas 相关对象
        this.canvas = canvas;
        this.ctx = ctx;
        this.dpr = dpr;
        
        this.setData({
          canvasWidth,
          canvasHeight
        });
        
        // 绘制初始状态
        this.drawCanvas();
      });
  },

  // 绘制 Canvas
  drawCanvas() {
    if (!this.ctx) return;
    
    const ctx = this.ctx;
    const { canvasWidth, canvasHeight } = this.data;
    
    // 清空画布
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // 绘制背景
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // 如果没有底图，绘制网格背景
    if (!this.data.baseImage) {
      this.drawGridBackground();
    }
    
    // 如果有底图，绘制底图
    if (this.data.baseImage) {
      this.drawBaseImage();
      
      // 根据水印类型绘制水印
      if (this.data.watermarkType === 'text') {
        this.drawTextWatermark();
      } else if (this.data.watermarkType === 'image') {
        this.drawImageWatermark();
      } else if (this.data.watermarkType === 'tiled') {
        this.drawTiledWatermark();
      }
      
      // 绘制辅助参考线（拖拽时显示）
      if (this.data.showGuidelines) {
        this.drawGuidelines();
      }
    } else {
      // 显示提示文字
      ctx.fillStyle = '#666';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('点击下方按钮选择图片', canvasWidth / 2, canvasHeight / 2);
      
      // 绘制图标提示
      ctx.font = '48px sans-serif';
      ctx.fillText('📁', canvasWidth / 2, canvasHeight / 2 - 60);
    }
  },

  // 绘制网格背景
  drawGridBackground() {
    if (!this.ctx) return;
    
    const ctx = this.ctx;
    const { canvasWidth, canvasHeight } = this.data;
    const gridSize = 20; // 网格大小
    
    ctx.save();
    
    // 设置网格样式
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 1;
    
    // 绘制垂直线
    for (let x = 0; x <= canvasWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }
    
    // 绘制水平线
    for (let y = 0; y <= canvasHeight; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }
    
    ctx.restore();
  },

  // 绘制辅助参考线
  drawGuidelines() {
    if (!this.ctx || !this.imageDrawParams) return;
    
    const ctx = this.ctx;
    const { watermarkPosition } = this.data;
    const { drawX, drawY, drawWidth, drawHeight } = this.imageDrawParams;
    
    ctx.save();
    
    // 设置虚线样式
    ctx.strokeStyle = '#FF6B9D';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.globalAlpha = 0.6;
    
    // 绘制水平参考线
    ctx.beginPath();
    ctx.moveTo(drawX, watermarkPosition.y);
    ctx.lineTo(drawX + drawWidth, watermarkPosition.y);
    ctx.stroke();
    
    // 绘制垂直参考线
    ctx.beginPath();
    ctx.moveTo(watermarkPosition.x, drawY);
    ctx.lineTo(watermarkPosition.x, drawY + drawHeight);
    ctx.stroke();
    
    ctx.restore();
  },

  // 绘制底图
  drawBaseImage() {
    if (!this.data.baseImage || !this.ctx) return;
    
    const ctx = this.ctx;
    const { canvasWidth, canvasHeight, baseImageWidth, baseImageHeight } = this.data;
    
    // 预留边距，避免图片紧贴边缘
    const padding = 20;
    const availableWidth = canvasWidth - padding * 2;
    const availableHeight = canvasHeight - padding * 2;
    
    // 计算图片在 Canvas 中的显示尺寸和位置（保持宽高比，居中显示）
    let drawWidth, drawHeight, drawX, drawY;
    
    const imageRatio = baseImageWidth / baseImageHeight;
    const availableRatio = availableWidth / availableHeight;
    
    if (imageRatio > availableRatio) {
      // 图片更宽，以宽度为准
      drawWidth = availableWidth;
      drawHeight = availableWidth / imageRatio;
      drawX = padding;
      drawY = (canvasHeight - drawHeight) / 2;
    } else {
      // 图片更高，以高度为准
      drawHeight = availableHeight;
      drawWidth = availableHeight * imageRatio;
      drawX = (canvasWidth - drawWidth) / 2;
      drawY = padding;
    }
    
    // 保存绘制参数，供后续使用
    this.imageDrawParams = {
      drawWidth,
      drawHeight,
      drawX,
      drawY
    };
    
    // 绘制图片
    ctx.drawImage(this.data.baseImage, drawX, drawY, drawWidth, drawHeight);
  },

  // 绘制文字水印
  drawTextWatermark() {
    if (!this.ctx || !this.data.textWatermark.content) return;
    
    const ctx = this.ctx;
    const { textWatermark, watermarkPosition } = this.data;
    const { content, fontSize, color, opacity, rotation } = textWatermark;
    
    // 保存当前状态
    ctx.save();
    
    // 移动到水印位置
    ctx.translate(watermarkPosition.x, watermarkPosition.y);
    
    // 应用旋转
    ctx.rotate((rotation * Math.PI) / 180);
    
    // 应用透明度
    ctx.globalAlpha = opacity;
    
    // 设置文字样式
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 启用抗锯齿
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // 绘制文字（支持多行）
    if (textWatermark.lines && textWatermark.lines.length > 0) {
      // 多行文字
      const lineHeight = fontSize * 1.2;
      const totalHeight = lineHeight * textWatermark.lines.length;
      const startY = -totalHeight / 2 + lineHeight / 2;
      
      textWatermark.lines.forEach((line, index) => {
        const y = startY + index * lineHeight;
        ctx.font = `${line.fontSize || fontSize}px sans-serif`;
        ctx.fillText(line.content, 0, y);
      });
    } else {
      // 单行文字
      ctx.fillText(content, 0, 0);
    }
    
    // 恢复状态
    ctx.restore();
  },

  // 文字输入
  onTextInput(e) {
    const value = e.detail.value;
    this.setData({
      'textWatermark.content': value,
      canSave: this.data.hasImage && value.length > 0
    });
    this.drawCanvas();
    this.saveParams();
  },

  // 字号调节
  onFontSizeChange(e) {
    const value = e.detail.value;
    this.setData({
      'textWatermark.fontSize': value
    });
    this.drawCanvas();
    this.saveParams();
  },

  // 透明度调节
  onTextOpacityChange(e) {
    const value = e.detail.value / 100;
    this.setData({
      'textWatermark.opacity': value
    });
    this.drawCanvas();
    this.saveParams();
  },

  // 旋转角度调节
  onTextRotationChange(e) {
    const value = e.detail.value;
    this.setData({
      'textWatermark.rotation': value
    });
    this.drawCanvas();
    this.saveParams();
  },

  // 设置文字旋转角度（快捷按钮）
  setTextRotation(e) {
    const angle = parseInt(e.currentTarget.dataset.angle);
    this.setData({
      'textWatermark.rotation': angle
    });
    this.drawCanvas();
    this.saveParams();
  },

  // 设置文字颜色
  setTextColor(e) {
    const color = e.currentTarget.dataset.color;
    this.setData({
      'textWatermark.color': color
    });
    this.drawCanvas();
    this.saveParams();
  },

  // 添加一行文字
  addTextLine() {
    const lines = this.data.textWatermark.lines || [];
    
    if (lines.length >= 3) {
      wx.showToast({
        title: '最多添加3行文字',
        icon: 'none'
      });
      return;
    }
    
    lines.push({
      content: '',
      fontSize: 48
    });
    
    this.setData({
      'textWatermark.lines': lines
    });
  },

  // 删除一行文字
  removeTextLine(e) {
    const index = e.currentTarget.dataset.index;
    const lines = this.data.textWatermark.lines || [];
    
    lines.splice(index, 1);
    
    this.setData({
      'textWatermark.lines': lines
    });
    
    this.drawCanvas();
    this.saveParams();
  },

  // 多行文字输入
  onLineTextInput(e) {
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;
    
    this.setData({
      [`textWatermark.lines[${index}].content`]: value
    });
    
    this.drawCanvas();
    this.saveParams();
  },

  // 多行文字字号调节
  onLineFontSizeChange(e) {
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;
    
    this.setData({
      [`textWatermark.lines[${index}].fontSize`]: value
    });
    
    this.drawCanvas();
    this.saveParams();
  },

  // 绘制图片水印
  drawImageWatermark() {
    if (!this.ctx || !this.data.imageWatermark.image) return;
    
    const ctx = this.ctx;
    const { imageWatermark, watermarkPosition } = this.data;
    const { image, scale, rotation, opacity } = imageWatermark;
    
    // 保存当前状态
    ctx.save();
    
    // 移动到水印位置
    ctx.translate(watermarkPosition.x, watermarkPosition.y);
    
    // 应用旋转
    ctx.rotate((rotation * Math.PI) / 180);
    
    // 应用透明度
    ctx.globalAlpha = opacity;
    
    // 启用抗锯齿
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // 计算绘制尺寸（保持宽高比）
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    
    // 以中心点为原点绘制
    ctx.drawImage(
      image,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );
    
    // 恢复状态
    ctx.restore();
  },

  // 选择水印图
  chooseWatermarkImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original'],
      sourceType: ['album'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        this.loadWatermarkImage(tempFilePath);
      },
      fail: (err) => {
        console.error('选择水印图失败:', err);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  // 加载水印图
  loadWatermarkImage(path) {
    wx.showLoading({ title: '加载中...' });
    
    if (!this.canvas) {
      wx.hideLoading();
      wx.showToast({
        title: 'Canvas 未初始化',
        icon: 'none'
      });
      return;
    }
    
    // 创建 Image 对象
    const img = this.canvas.createImage();
    
    img.onload = () => {
      this.setData({
        'imageWatermark.path': path,
        'imageWatermark.image': img,
        canSave: this.data.hasImage
      });
      
      wx.hideLoading();
      this.drawCanvas();
      this.saveParams();
      
      wx.showToast({
        title: '水印图加载成功',
        icon: 'success',
        duration: 1500
      });
    };
    
    img.onerror = (err) => {
      wx.hideLoading();
      console.error('水印图加载失败:', err);
      
      wx.showToast({
        title: '水印图加载失败',
        icon: 'none'
      });
    };
    
    img.src = path;
  },

  // 图片水印缩放
  onImageScaleChange(e) {
    const value = e.detail.value / 100;
    this.setData({
      'imageWatermark.scale': value
    });
    this.drawCanvas();
    this.saveParams();
  },

  // 图片水印透明度
  onImageOpacityChange(e) {
    const value = e.detail.value / 100;
    this.setData({
      'imageWatermark.opacity': value
    });
    this.drawCanvas();
    this.saveParams();
  },

  // 图片水印旋转
  onImageRotationChange(e) {
    const value = e.detail.value;
    this.setData({
      'imageWatermark.rotation': value
    });
    this.drawCanvas();
    this.saveParams();
  },

  // 绘制平铺水印
  drawTiledWatermark() {
    if (!this.ctx) return;
    
    const { tiledWatermark, textWatermark } = this.data;
    const { mode, textContent, rowGap, colGap, rotation } = tiledWatermark;
    
    if (mode === 'text' && !textContent) return;
    if (mode === 'image' && !this.data.imageWatermark.image) return;
    
    const ctx = this.ctx;
    const { canvasWidth, canvasHeight } = this.data;
    
    // 保存当前状态
    ctx.save();
    
    // 计算单个水印单元的尺寸
    let unitWidth, unitHeight;
    
    if (mode === 'text') {
      // 文字模式
      ctx.font = `${textWatermark.fontSize}px sans-serif`;
      const metrics = ctx.measureText(textContent);
      unitWidth = metrics.width;
      unitHeight = textWatermark.fontSize;
    } else {
      // 图片模式
      const img = this.data.imageWatermark.image;
      unitWidth = img.width * this.data.imageWatermark.scale;
      unitHeight = img.height * this.data.imageWatermark.scale;
    }
    
    // 计算需要多少行多少列（考虑旋转后的覆盖范围）
    const diagonal = Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight);
    const cols = Math.ceil(diagonal / (unitWidth + colGap)) + 2;
    const rows = Math.ceil(diagonal / (unitHeight + rowGap)) + 2;
    
    // 从中心开始平铺
    const startX = -cols * (unitWidth + colGap) / 2;
    const startY = -rows * (unitHeight + rowGap) / 2;
    
    // 移动到画布中心
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    
    // 应用整体旋转
    ctx.rotate((rotation * Math.PI) / 180);
    
    // 绘制平铺水印
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = startX + col * (unitWidth + colGap);
        const y = startY + row * (unitHeight + rowGap);
        
        ctx.save();
        ctx.translate(x, y);
        
        if (mode === 'text') {
          // 绘制文字
          ctx.globalAlpha = textWatermark.opacity;
          ctx.fillStyle = textWatermark.color;
          ctx.font = `${textWatermark.fontSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(textContent, 0, 0);
        } else {
          // 绘制图片
          const img = this.data.imageWatermark.image;
          const scale = this.data.imageWatermark.scale;
          ctx.globalAlpha = this.data.imageWatermark.opacity;
          ctx.drawImage(
            img,
            -img.width * scale / 2,
            -img.height * scale / 2,
            img.width * scale,
            img.height * scale
          );
        }
        
        ctx.restore();
      }
    }
    
    // 恢复状态
    ctx.restore();
  },

  // 设置平铺模式
  setTiledMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({
      'tiledWatermark.mode': mode
    });
    this.drawCanvas();
    this.saveParams();
  },

  // 平铺文字输入
  onTiledTextInput(e) {
    const value = e.detail.value;
    this.setData({
      'tiledWatermark.textContent': value,
      canSave: this.data.hasImage && value.length > 0
    });
    this.drawCanvas();
    this.saveParams();
  },

  // 行间距调节
  onRowGapChange(e) {
    const value = e.detail.value;
    this.setData({
      'tiledWatermark.rowGap': value
    });
    this.drawCanvas();
    this.saveParams();
  },

  // 列间距调节
  onColGapChange(e) {
    const value = e.detail.value;
    this.setData({
      'tiledWatermark.colGap': value
    });
    this.drawCanvas();
    this.saveParams();
  },

  // 平铺旋转角度
  onTiledRotationChange(e) {
    const value = e.detail.value;
    this.setData({
      'tiledWatermark.rotation': value
    });
    this.drawCanvas();
    this.saveParams();
  },

  // 设置平铺旋转角度（快捷按钮）
  setTiledRotation(e) {
    const angle = parseInt(e.currentTarget.dataset.angle);
    this.setData({
      'tiledWatermark.rotation': angle
    });
    this.drawCanvas();
    this.saveParams();
  },

  // 切换水印类型
  switchWatermarkType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ watermarkType: type });
    this.drawCanvas();
  },

  // 选择图片
  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        this.loadImage(tempFilePath);
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  // 加载图片
  loadImage(path) {
    wx.showLoading({ title: '加载中...' });
    
    // 获取图片信息
    wx.getImageInfo({
      src: path,
      success: (info) => {
        // 检查图片大小
        const isLarge = info.width > 5000 || info.height > 5000;
        const fileSize = info.width * info.height * 4 / (1024 * 1024); // 估算文件大小（MB）
        
        if (isLarge || fileSize > 20) {
          wx.showToast({
            title: '图片过大，正在自动压缩...',
            icon: 'none',
            duration: 2000
          });
          
          // 自动压缩：限制最大尺寸为 4096
          const maxSize = 4096;
          let targetWidth = info.width;
          let targetHeight = info.height;
          
          if (info.width > maxSize || info.height > maxSize) {
            if (info.width > info.height) {
              targetWidth = maxSize;
              targetHeight = Math.round(maxSize * info.height / info.width);
            } else {
              targetHeight = maxSize;
              targetWidth = Math.round(maxSize * info.width / info.height);
            }
          }
          
          // 使用压缩后的尺寸
          this.createImageObject(path, targetWidth, targetHeight);
        } else {
          // 直接使用原始尺寸
          this.createImageObject(path, info.width, info.height);
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('获取图片信息失败:', err);
        
        // 判断错误类型
        if (err.errMsg && err.errMsg.includes('fail')) {
          wx.showModal({
            title: '图片加载失败',
            content: '请选择 JPG 或 PNG 格式的图片',
            showCancel: false
          });
        } else {
          wx.showToast({
            title: '图片加载失败，请重试',
            icon: 'none'
          });
        }
      }
    });
  },

  // 创建 Image 对象
  createImageObject(path, width, height) {
    if (!this.canvas) {
      wx.hideLoading();
      wx.showToast({
        title: 'Canvas 未初始化',
        icon: 'none'
      });
      return;
    }
    
    // 创建 Image 对象
    const img = this.canvas.createImage();
    
    img.onload = () => {
      this.setData({
        baseImage: img,
        baseImagePath: path,
        baseImageWidth: width,
        baseImageHeight: height,
        hasImage: true,
        canSave: true
      });
      
      // 计算水印默认位置（图片中心偏下）
      const x = this.data.canvasWidth / 2;
      const y = this.data.canvasHeight * 0.7;
      this.setData({
        'watermarkPosition.x': x,
        'watermarkPosition.y': y
      });
      
      wx.hideLoading();
      
      // 绘制 Canvas
      this.drawCanvas();
      
      wx.showToast({
        title: '图片加载成功',
        icon: 'success',
        duration: 1500
      });
    };
    
    img.onerror = (err) => {
      wx.hideLoading();
      console.error('图片加载失败:', err);
      
      wx.showModal({
        title: '渲染异常',
        content: '图片渲染失败，请尝试选择较小的图片',
        showCancel: false
      });
    };
    
    img.src = path;
  },



  // 重置
  reset() {
    wx.showModal({
      title: '重置',
      content: '确定要清除所有水印吗？',
      confirmText: '确定',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          // 保存当前底图信息
          const currentBaseImage = this.data.baseImage;
          const currentBaseImagePath = this.data.baseImagePath;
          const currentBaseImageWidth = this.data.baseImageWidth;
          const currentBaseImageHeight = this.data.baseImageHeight;
          const currentHasImage = this.data.hasImage;
          
          // 清空水印数据
          this.clearWatermarkData();
          
          // 恢复底图信息（保留已选择的图片）
          if (currentHasImage) {
            this.setData({
              baseImage: currentBaseImage,
              baseImagePath: currentBaseImagePath,
              baseImageWidth: currentBaseImageWidth,
              baseImageHeight: currentBaseImageHeight,
              hasImage: currentHasImage,
              canSave: true
            });
          }
          
          this.drawCanvas();
          
          wx.showToast({
            title: '已重置',
            icon: 'success'
          });
        }
      }
    });
  },

  // 清空水印数据
  clearWatermarkData() {
    this.setData({
      // 重置水印类型
      watermarkType: 'text',
      
      // 清空底图
      baseImage: null,
      baseImagePath: '',
      baseImageWidth: 0,
      baseImageHeight: 0,
      
      // 重置文字水印
      'textWatermark.content': '',
      'textWatermark.fontSize': 48,
      'textWatermark.color': '#ffffff',
      'textWatermark.opacity': 0.4,
      'textWatermark.rotation': 0,
      'textWatermark.lines': [],
      
      // 重置图片水印
      'imageWatermark.path': '',
      'imageWatermark.image': null,
      'imageWatermark.scale': 0.5,
      'imageWatermark.rotation': 0,
      'imageWatermark.opacity': 0.5,
      
      // 重置平铺水印
      'tiledWatermark.mode': 'text',
      'tiledWatermark.textContent': '',
      'tiledWatermark.imagePath': '',
      'tiledWatermark.rowGap': 60,
      'tiledWatermark.colGap': 60,
      'tiledWatermark.rotation': 30,
      
      // 重置水印位置
      'watermarkPosition.x': 0,
      'watermarkPosition.y': 0,
      
      // 重置状态
      hasImage: false,
      canSave: false,
      isDragging: false,
      showGuidelines: false,
      isZooming: false
    });
    
    // 清空 Canvas
    if (this.canvas && this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    // 清空本地存储的参数
    try {
      wx.removeStorageSync('watermark_params');
    } catch (err) {
      console.error('清空参数失败:', err);
    }
  },

  // 加载参数
  loadParams() {
    try {
      const params = wx.getStorageSync('watermark_params');
      if (params) {
        // 恢复参数
        this.setData({
          watermarkType: params.type || 'text',
          textWatermark: params.text || this.data.textWatermark,
          imageWatermark: params.image || this.data.imageWatermark,
          tiledWatermark: params.tiled || this.data.tiledWatermark,
          watermarkPosition: params.position || this.data.watermarkPosition
        });
      }
    } catch (err) {
      console.error('加载参数失败:', err);
    }
  },

  // 保存参数（防抖）
  saveParams() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    
    this.saveTimer = setTimeout(() => {
      try {
        const params = {
          type: this.data.watermarkType,
          text: this.data.textWatermark,
          image: {
            path: this.data.imageWatermark.path,
            scale: this.data.imageWatermark.scale,
            rotation: this.data.imageWatermark.rotation,
            opacity: this.data.imageWatermark.opacity
          },
          tiled: this.data.tiledWatermark,
          position: this.data.watermarkPosition
        };
        
        wx.setStorageSync('watermark_params', params);
      } catch (err) {
        console.error('保存参数失败:', err);
      }
    }, 500);
  },

  // ========== 模块五：自由拖拽定位 ==========
  
  // Canvas 触摸开始
  onCanvasTouchStart(e) {
    // 平铺模式不支持拖拽
    if (this.data.watermarkType === 'tiled') return;
    
    const touches = e.touches;
    
    if (touches.length === 1) {
      // 单指触摸 - 可能是拖拽水印
      const touch = touches[0];
      const x = touch.x;
      const y = touch.y;
      
      // 检查是否命中水印
      if (this.hitTestWatermark(x, y)) {
        this.setData({
          isDragging: true,
          showGuidelines: true,
          touchStartX: x,
          touchStartY: y,
          lastWatermarkX: this.data.watermarkPosition.x,
          lastWatermarkY: this.data.watermarkPosition.y
        });
        this.drawCanvas();
      }
    } else if (touches.length === 2) {
      // 双指触摸 - 缩放预览
      this.setData({
        isZooming: true,
        lastDistance: this.getDistance(touches[0], touches[1])
      });
    }
  },

  // Canvas 触摸移动
  onCanvasTouchMove(e) {
    const touches = e.touches;
    
    if (this.data.isDragging && touches.length === 1) {
      // 拖拽水印
      const touch = touches[0];
      const x = touch.x;
      const y = touch.y;
      
      const deltaX = x - this.data.touchStartX;
      const deltaY = y - this.data.touchStartY;
      
      let newX = this.data.lastWatermarkX + deltaX;
      let newY = this.data.lastWatermarkY + deltaY;
      
      // 边界限制（水印不可拖出图片边界）
      if (this.imageDrawParams) {
        const { drawX, drawY, drawWidth, drawHeight } = this.imageDrawParams;
        newX = Math.max(drawX, Math.min(newX, drawX + drawWidth));
        newY = Math.max(drawY, Math.min(newY, drawY + drawHeight));
      }
      
      this.setData({
        'watermarkPosition.x': newX,
        'watermarkPosition.y': newY
      });
      
      this.drawCanvas();
    } else if (this.data.isZooming && touches.length === 2) {
      // 双指缩放预览
      const distance = this.getDistance(touches[0], touches[1]);
      const scale = distance / this.data.lastDistance;
      
      let newScale = this.data.previewScale * scale;
      newScale = Math.max(1, Math.min(newScale, 3)); // 限制缩放范围 1x-3x
      
      this.setData({
        previewScale: newScale,
        lastDistance: distance
      });
    }
  },

  // Canvas 触摸结束
  onCanvasTouchEnd(e) {
    if (this.data.isDragging) {
      this.setData({ 
        isDragging: false,
        showGuidelines: false
      });
      this.drawCanvas();
      this.saveParams();
    }
    
    if (this.data.isZooming) {
      this.setData({ isZooming: false });
    }
  },

  // 命中检测 - 判断触摸点是否在水印范围内
  hitTestWatermark(x, y) {
    const { watermarkType, watermarkPosition, textWatermark, imageWatermark } = this.data;
    
    if (watermarkType === 'text' && textWatermark.content) {
      // 文字水印命中检测
      const fontSize = textWatermark.fontSize;
      const hitRange = fontSize * 2; // 命中范围为字号的2倍
      
      const dx = x - watermarkPosition.x;
      const dy = y - watermarkPosition.y;
      
      return Math.abs(dx) < hitRange && Math.abs(dy) < hitRange;
    } else if (watermarkType === 'image' && imageWatermark.image) {
      // 图片水印命中检测
      const img = imageWatermark.image;
      const scale = imageWatermark.scale;
      const width = img.width * scale;
      const height = img.height * scale;
      
      const dx = x - watermarkPosition.x;
      const dy = y - watermarkPosition.y;
      
      return Math.abs(dx) < width / 2 && Math.abs(dy) < height / 2;
    }
    
    return false;
  },

  // 计算两点距离
  getDistance(touch1, touch2) {
    const dx = touch1.x - touch2.x;
    const dy = touch1.y - touch2.y;
    return Math.sqrt(dx * dx + dy * dy);
  },

  // 快捷定位水印
  quickPosition(e) {
    const position = e.currentTarget.dataset.position;
    
    if (!this.imageDrawParams) {
      wx.showToast({
        title: '请先选择图片',
        icon: 'none'
      });
      return;
    }
    
    const { drawX, drawY, drawWidth, drawHeight } = this.imageDrawParams;
    let x, y;
    
    // 计算水印尺寸（用于边距计算）
    const margin = 40; // 边距
    
    switch (position) {
      case 'top-left':
        x = drawX + margin;
        y = drawY + margin;
        break;
      case 'top-right':
        x = drawX + drawWidth - margin;
        y = drawY + margin;
        break;
      case 'bottom-left':
        x = drawX + margin;
        y = drawY + drawHeight - margin;
        break;
      case 'bottom-right':
        x = drawX + drawWidth - margin;
        y = drawY + drawHeight - margin;
        break;
      case 'center':
        x = drawX + drawWidth / 2;
        y = drawY + drawHeight / 2;
        break;
      default:
        return;
    }
    
    this.setData({
      'watermarkPosition.x': x,
      'watermarkPosition.y': y
    });
    
    this.drawCanvas();
    this.saveParams();
    
    wx.showToast({
      title: '位置已调整',
      icon: 'success',
      duration: 1000
    });
  },

  // ========== 模块八：导出保存 ==========
  
  // 保存到相册
  saveToAlbum() {
    if (!this.data.hasImage) {
      wx.showToast({
        title: '请先选择图片',
        icon: 'none'
      });
      return;
    }
    
    // 检查是否有水印内容
    const hasWatermark = this.checkHasWatermark();
    if (!hasWatermark) {
      wx.showToast({
        title: '请先添加水印',
        icon: 'none'
      });
      return;
    }
    
    // 弹出格式选择
    wx.showActionSheet({
      itemList: ['保存为 JPG（推荐）', '保存为 PNG'],
      success: (res) => {
        const format = res.tapIndex === 0 ? 'jpg' : 'png';
        const quality = res.tapIndex === 0 ? 0.9 : 1;
        this.exportAndSave(format, quality);
      }
    });
  },

  // 检查是否有水印内容
  checkHasWatermark() {
    const { watermarkType, textWatermark, imageWatermark, tiledWatermark } = this.data;
    
    if (watermarkType === 'text') {
      return textWatermark.content.length > 0;
    } else if (watermarkType === 'image') {
      return imageWatermark.image !== null;
    } else if (watermarkType === 'tiled') {
      if (tiledWatermark.mode === 'text') {
        return tiledWatermark.textContent.length > 0;
      } else {
        return imageWatermark.image !== null;
      }
    }
    
    return false;
  },

  // 导出并保存
  exportAndSave(format, quality) {
    wx.showLoading({ title: '正在保存...' });
    
    // 检查相册权限
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.writePhotosAlbum'] === false) {
          // 权限被明确拒绝
          wx.hideLoading();
          this.showPermissionDenied();
          return;
        } else if (res.authSetting['scope.writePhotosAlbum'] === true) {
          // 已有权限，直接导出
          this.exportImage(format, quality);
        } else {
          // 未授权过，请求权限
          wx.authorize({
            scope: 'scope.writePhotosAlbum',
            success: () => {
              this.exportImage(format, quality);
            },
            fail: () => {
              wx.hideLoading();
              this.showPermissionDenied();
            }
          });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({
          title: '获取权限状态失败',
          icon: 'none'
        });
      }
    });
  },

  // 导出图片
  exportImage(format, quality) {
    const query = wx.createSelectorQuery();
    query.select('#watermarkCanvas')
      .fields({ node: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          wx.hideLoading();
          wx.showToast({
            title: 'Canvas未找到，请重试',
            icon: 'none'
          });
          return;
        }
        
        const canvas = res[0].node;
        
        // 确保Canvas有内容
        if (!canvas.width || !canvas.height) {
          wx.hideLoading();
          wx.showToast({
            title: 'Canvas尺寸异常，请重新选择图片',
            icon: 'none'
          });
          return;
        }
        
        console.log('[Watermark] 导出图片:', {
          format,
          quality,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height
        });
        
        wx.canvasToTempFilePath({
          canvas: canvas,
          x: 0,
          y: 0,
          width: canvas.width,
          height: canvas.height,
          destWidth: canvas.width,
          destHeight: canvas.height,
          fileType: format,
          quality: quality,
          success: (res) => {
            console.log('[Watermark] Canvas导出成功:', res);
            if (res && res.tempFilePath) {
              this.saveImageToAlbum(res.tempFilePath);
            } else {
              wx.hideLoading();
              wx.showToast({
                title: '导出失败：无效的文件路径',
                icon: 'none'
              });
            }
          },
          fail: (err) => {
            wx.hideLoading();
            console.error('导出图片失败:', err);
            
            let errorMsg = '图片导出失败';
            if (err && err.errMsg) {
              if (err.errMsg.includes('canvas is empty')) {
                errorMsg = 'Canvas为空，请确保已添加图片和水印';
              } else if (err.errMsg.includes('fail')) {
                errorMsg = '导出失败，请重试';
              } else {
                errorMsg = '导出失败: ' + err.errMsg;
              }
            }
            
            wx.showModal({
              title: '导出失败',
              content: errorMsg,
              showCancel: true,
              confirmText: '重试',
              cancelText: '取消',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  // 延迟重试
                  setTimeout(() => {
                    this.exportImage(format, quality);
                  }, 500);
                }
              }
            });
          }
        });
      });
  },

  // 保存图片到相册
  saveImageToAlbum(tempFilePath) {
    wx.saveImageToPhotosAlbum({
      filePath: tempFilePath,
      success: () => {
        wx.hideLoading();
        
        // 简洁的吐司提示
        wx.showToast({
          title: '已保存到相册',
          icon: 'success',
          duration: 2000
        });
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('保存到相册失败:', err);
        
        let errorMsg = '保存失败';
        let showRetry = true;
        
        if (err && err.errMsg) {
          if (err.errMsg.includes('auth deny') || err.errMsg.includes('authorize')) {
            // 权限被拒绝
            this.showPermissionDenied();
            return;
          } else if (err.errMsg.includes('fail')) {
            errorMsg = '保存失败，可能是存储空间不足或系统异常';
          } else {
            errorMsg = '保存失败: ' + err.errMsg;
          }
        }
        
        wx.showModal({
          title: '保存失败',
          content: errorMsg,
          showCancel: showRetry,
          confirmText: '重试',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm && showRetry) {
              // 延迟重试
              setTimeout(() => {
                this.saveImageToAlbum(tempFilePath);
              }, 500);
            }
          }
        });
      }
    });
  },

  // 显示权限被拒绝提示
  showPermissionDenied() {
    wx.showModal({
      title: '需要相册权限',
      content: '保存图片需要访问您的相册，请前往设置开启权限',
      confirmText: '去设置',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting({
            success: (settingRes) => {
              if (settingRes.authSetting['scope.writePhotosAlbum']) {
                wx.showToast({
                  title: '权限已开启，请重新保存',
                  icon: 'success'
                });
              } else {
                wx.showToast({
                  title: '需要开启相册权限',
                  icon: 'none'
                });
              }
            },
            fail: () => {
              wx.showToast({
                title: '打开设置失败',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },

  // 分享配置
  onShareAppMessage() {
    return {
      title: '水印工具 - 轻松添加水印',
      path: '/pages/watermark/index',
      imageUrl: ''
    };
  },

  onShareTimeline() {
    return {
      title: '水印工具 - 轻松添加水印'
    };
  }
});
