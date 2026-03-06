const app = getApp();

// 工具函数：格式化文件大小
const formatSize = (size) => {
  if (size < 1024) return size + 'B';
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + 'KB';
  return (size / 1024 / 1024).toFixed(2) + 'MB';
};

Page({
  data: {
    images: [], // { tempFilePath, width, height, size, originalSizeStr, rotation, compressedFilePath, cWidth, cHeight, cSize, compressedSizeStr, compressionRate, status }
    quality: 80,
    scale: 1, // 尺寸缩放比例
    isProcessing: false,
    hasCompressed: false
  },

  onLoad() {
    // 页面加载
  },

  // 选择图片
  chooseImage() {
    const currentCount = this.data.images.length;
    if (currentCount >= 3) {
      wx.showToast({ title: '最多选择3张', icon: 'none' });
      return;
    }

    wx.chooseImage({
      count: 3 - currentCount,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFiles = res.tempFiles;
        const newImages = [];

        wx.showLoading({ title: '加载中...' });

        for (const file of tempFiles) {
          // 校验大小 (20MB)
          if (file.size > 20 * 1024 * 1024) {
            wx.showToast({ title: '部分图片超过20MB已过滤', icon: 'none' });
            continue;
          }

          // 获取图片信息
          try {
            const info = await wx.getImageInfo({ src: file.path });
            newImages.push({
              tempFilePath: file.path,
              width: info.width,
              height: info.height,
              size: file.size,
              originalSizeStr: formatSize(file.size),
              rotation: 0,
              status: 'waiting',
              compressedFilePath: null
            });
          } catch (e) {
            console.error('Get image info failed', e);
            wx.showToast({ title: '无法识别图片', icon: 'none' });
          }
        }

        this.setData({
          images: [...this.data.images, ...newImages],
          hasCompressed: false // 新增图片后重置压缩状态
        });

        wx.hideLoading();
      }
    });
  },

  // 移除图片
  removeImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images;
    images.splice(index, 1);
    this.setData({ 
      images,
      hasCompressed: images.length > 0 && images.every(img => img.compressedFilePath) 
    });
  },

  // 旋转图片 (仅修改预览旋转角度，实际压缩时处理)
  rotateImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images;
    images[index].rotation = (images[index].rotation + 90) % 360;
    // 旋转后需要重新压缩
    images[index].compressedFilePath = null;
    images[index].status = 'waiting';
    
    this.setData({ 
      images,
      hasCompressed: false 
    });
  },

  // 预览图片
  previewImage(e) {
    const index = e.currentTarget.dataset.index;
    const img = this.data.images[index];
    // 优先预览压缩后的，如果没有则预览原图
    const url = img.compressedFilePath || img.tempFilePath;
    wx.previewImage({
      current: url,
      urls: this.data.images.map(i => i.compressedFilePath || i.tempFilePath)
    });
  },

  // 设置质量
  setQuality(e) {
    this.setData({ quality: e.currentTarget.dataset.val, hasCompressed: false });
  },

  onQualityChange(e) {
    this.setData({ quality: e.detail.value, hasCompressed: false });
  },

  // 设置尺寸
  setScale(e) {
    this.setData({ scale: e.currentTarget.dataset.val, hasCompressed: false });
  },

  // 开始压缩
  async startCompress() {
    if (this.data.images.length === 0) return;
    
    this.setData({ isProcessing: true });

    const images = this.data.images;
    const quality = this.data.quality;
    const scale = this.data.scale;

    for (let i = 0; i < images.length; i++) {
      images[i].status = 'processing';
      this.setData({ images });

      try {
        const result = await this.compressOneImage(images[i], quality, scale);
        images[i] = { ...images[i], ...result, status: 'done' };
      } catch (err) {
        console.error('Compression failed', err);
        images[i].status = 'error';
        wx.showToast({ title: '第' + (i+1) + '张压缩失败', icon: 'none' });
      }
      this.setData({ images });
    }

    this.setData({ 
      isProcessing: false,
      hasCompressed: true
    });
    
    wx.showToast({ title: '压缩完成', icon: 'success' });
  },

  // 单张图片压缩核心逻辑
  compressOneImage(imgObj, quality, scale) {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery();
      query.select('#compressCanvas')
        .fields({ node: true, size: true })
        .exec(async (res) => {
          if (!res[0] || !res[0].node) {
            // 如果 Canvas 获取失败，降级尝试 wx.compressImage (不支持旋转和缩放)
            if (scale === 1 && imgObj.rotation === 0) {
               wx.compressImage({
                 src: imgObj.tempFilePath,
                 quality: quality,
                 success: (res) => {
                   this.getCompressedInfo(res.tempFilePath, imgObj.size).then(resolve).catch(reject);
                 },
                 fail: reject
               });
               return;
            }
            reject(new Error('Canvas not found'));
            return;
          }

          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');

          // 计算目标尺寸
          let targetWidth = imgObj.width * scale;
          let targetHeight = imgObj.height * scale;
          
          // 处理旋转后的宽高
          const rotation = imgObj.rotation;
          const isRotated = rotation % 180 !== 0;
          
          // 如果旋转90或270度，画布宽高需要交换 (逻辑尺寸)
          const canvasWidth = isRotated ? targetHeight : targetWidth;
          const canvasHeight = isRotated ? targetWidth : targetHeight;

          // 设置 Canvas 画布尺寸 (物理像素 = 逻辑尺寸 * dpr，这里为了简化直接用逻辑尺寸，因为 Canvas 2D 最好设大点防止模糊，但小程序有限制)
          // 限制最大 Canvas 尺寸防止崩溃 (4096 is safe limit usually)
          const MAX_SIZE = 4096;
          let dpr = 1; 
          // 简单处理：如果图太大，就不乘 dpr 或者缩小
          
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;

          const image = canvas.createImage();
          image.src = imgObj.tempFilePath;
          
          image.onload = () => {
            // 清除画布
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // 旋转中心点
            ctx.save();
            ctx.translate(canvasWidth / 2, canvasHeight / 2);
            ctx.rotate(rotation * Math.PI / 180);
            
            // 绘制图片 (drawImage 使用原图尺寸，绘制到目标区域)
            // 这里的坐标系已经旋转，所以绘制宽高应该是 缩放后的原图宽高
            // x, y 是相对于中心点的偏移
            ctx.drawImage(image, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
            
            ctx.restore();

            // 导出图片
            wx.canvasToTempFilePath({
              canvas: canvas,
              fileType: 'jpg', // 默认 jpg 以获得更好的压缩控制
              quality: quality / 100, // 0-1
              success: (res) => {
                this.getCompressedInfo(res.tempFilePath, imgObj.size).then(resolve).catch(reject);
              },
              fail: reject
            });
          };

          image.onerror = reject;
        });
    });
  },

  // 获取压缩后的图片信息
  async getCompressedInfo(filePath, originalSize) {
    return new Promise((resolve, reject) => {
      wx.getFileInfo({
        filePath: filePath,
        success: (fileRes) => {
          wx.getImageInfo({
            src: filePath,
            success: (imgRes) => {
              const size = fileRes.size;
              const rate = ((originalSize - size) / originalSize * 100).toFixed(1);
              resolve({
                compressedFilePath: filePath,
                cWidth: imgRes.width,
                cHeight: imgRes.height,
                cSize: size,
                compressedSizeStr: formatSize(size),
                compressionRate: rate > 0 ? rate : 0 // 负压缩率显示0
              });
            },
            fail: reject
          });
        },
        fail: reject
      });
    });
  },

  // 批量保存
  async saveAll() {
    if (this.data.isProcessing) return;

    const imagesToSave = this.data.images.filter(img => img.compressedFilePath);
    if (imagesToSave.length === 0) return;

    // 检查权限
    try {
      await this.checkWriteAccess();
    } catch (e) {
      return; // 权限被拒绝或引导失败
    }

    wx.showLoading({ title: '保存中...' });
    
    let successCount = 0;
    for (const img of imagesToSave) {
      try {
        await wx.saveImageToPhotosAlbum({ filePath: img.compressedFilePath });
        successCount++;
      } catch (e) {
        console.error('Save failed', e);
      }
    }

    wx.hideLoading();
    wx.showToast({
      title: `成功保存 ${successCount} 张`,
      icon: 'success'
    });
  },

  // 检查相册权限
  checkWriteAccess() {
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success(res) {
          if (!res.authSetting['scope.writePhotosAlbum']) {
            wx.authorize({
              scope: 'scope.writePhotosAlbum',
              success() {
                resolve();
              },
              fail() {
                wx.showModal({
                  title: '提示',
                  content: '保存图片需要访问相册，请在设置中开启',
                  showCancel: true,
                  confirmText: '去设置',
                  success(modalRes) {
                    if (modalRes.confirm) {
                      wx.openSetting({
                        success(settingRes) {
                          if (settingRes.authSetting['scope.writePhotosAlbum']) {
                            resolve();
                          } else {
                            reject();
                          }
                        }
                      });
                    } else {
                      reject();
                    }
                  }
                });
              }
            });
          } else {
            resolve();
          }
        },
        fail: reject
      });
    });
  }
})