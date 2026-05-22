Page({
  data: {
    // 原图信息
    originalImage: '',
    originalSize: '',
    originalWidth: 0,
    originalHeight: 0,
    originalBytes: 0,

    // 压缩后信息
    compressedImage: '',
    compressedSize: '',
    compressedBytes: 0,
    compressionRatio: 0,

    // 控制参数
    quality: 80,  // 默认80%
    isCompressing: false
  },

  // Canvas 实例（不放在 data 中）
  canvas: null,
  ctx: null,
  compressTimer: null,

  onLoad() {
    // 页面加载完成
  },

  onReady() {
    // 页面渲染完成后初始化 Canvas
    console.log('[Compress] 页面渲染完成，初始化Canvas');
    this.initCanvas();
  },

  // 初始化 Canvas
  initCanvas() {
    const that = this;
    
    try {
      const query = wx.createSelectorQuery();
      query.select('#compressCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          console.log('[Compress] Canvas查询结果:', res);
          
          if (res && res.length > 0 && res[0] && res[0].node) {
            const canvas = res[0].node;
            const ctx = canvas.getContext('2d');
            
            if (canvas && ctx) {
              that.canvas = canvas;
              that.ctx = ctx;
              console.log('[Compress] Canvas初始化成功');
            } else {
              console.error('[Compress] Canvas 或 Context 获取失败');
              wx.showToast({
                title: 'Canvas初始化失败',
                icon: 'none'
              });
            }
          } else {
            console.error('[Compress] Canvas 节点未找到，查询结果:', res);
            wx.showToast({
              title: 'Canvas节点未找到',
              icon: 'none'
            });
          }
        });
    } catch (e) {
      console.error('[Compress] Canvas 初始化异常:', e);
      wx.showToast({
        title: 'Canvas初始化异常',
        icon: 'none'
      });
    }
  },

  // 选择图片
  selectImage() {
    const that = this;
    
    wx.showActionSheet({
      itemList: ['从相册选择', '拍照'],
      success: (res) => {
        if (typeof res.tapIndex === 'undefined') {
          return;
        }
        
        const sourceType = res.tapIndex === 0 ? ['album'] : ['camera'];
        
        wx.chooseImage({
          count: 1,
          sizeType: ['original'],
          sourceType: sourceType,
          success: (chooseRes) => {
            if (chooseRes && chooseRes.tempFilePaths && chooseRes.tempFilePaths.length > 0) {
              const tempFilePath = chooseRes.tempFilePaths[0];
              that.loadImage(tempFilePath);
            } else {
              wx.showToast({
                title: '未选择图片',
                icon: 'none'
              });
            }
          },
          fail: (err) => {
            if (err && err.errMsg && err.errMsg.indexOf('cancel') === -1) {
              wx.showToast({
                title: '选择图片失败',
                icon: 'none'
              });
            }
          }
        });
      },
      fail: (err) => {
        // 用户取消选择
      }
    });
  },

  // 加载图片信息
  loadImage(filePath) {
    if (!filePath) {
      wx.showToast({
        title: '图片路径无效',
        icon: 'none'
      });
      return;
    }

    const that = this;
    
    wx.showLoading({
      title: '加载中...',
      mask: true
    });

    // 获取图片信息
    wx.getImageInfo({
      src: filePath,
      success: (imgInfo) => {
        if (!imgInfo || !imgInfo.width || !imgInfo.height) {
          wx.hideLoading();
          wx.showToast({
            title: '图片信息无效',
            icon: 'none'
          });
          return;
        }

        // 获取文件大小
        try {
          const fs = wx.getFileSystemManager();
          const stats = fs.statSync(filePath);
          const fileSize = stats && stats.size ? stats.size : 0;

          if (fileSize === 0) {
            wx.hideLoading();
            wx.showToast({
              title: '无法获取文件大小',
              icon: 'none'
            });
            return;
          }

          that.setData({
            originalImage: filePath,
            originalWidth: imgInfo.width,
            originalHeight: imgInfo.height,
            originalBytes: fileSize,
            originalSize: that.formatSize(fileSize),
            compressedImage: '',
            compressedSize: '',
            compressionRatio: 0
          });

          wx.hideLoading();

          // 自动进行一次压缩
          setTimeout(() => {
            that.compressImage();
          }, 300);

        } catch (e) {
          wx.hideLoading();
          wx.showToast({
            title: '获取图片信息失败',
            icon: 'none'
          });
          console.error('获取文件信息失败:', e);
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({
          title: '图片加载失败',
          icon: 'none'
        });
        console.error('getImageInfo 失败:', err);
      }
    });
  },

  // 压缩图片
  compressImage() {
    const { originalImage, originalWidth, originalHeight, quality, isCompressing } = this.data;

    console.log('[Compress] 开始压缩，参数:', {
      originalImage,
      originalWidth,
      originalHeight,
      quality,
      isCompressing,
      hasCanvas: !!this.canvas,
      hasCtx: !!this.ctx
    });

    if (!originalImage) {
      console.error('[Compress] 没有原图');
      wx.showToast({
        title: '请先选择图片',
        icon: 'none'
      });
      return;
    }

    if (isCompressing) {
      console.log('[Compress] 正在压缩中，跳过');
      return;
    }

    if (!this.canvas || !this.ctx) {
      console.log('[Compress] Canvas 未初始化，尝试重新初始化');
      
      wx.showToast({
        title: 'Canvas初始化中...',
        icon: 'loading',
        duration: 1000
      });
      
      this.initCanvas();
      
      setTimeout(() => {
        if (this.canvas && this.ctx) {
          console.log('[Compress] Canvas重新初始化成功，继续压缩');
          this.compressImage();
        } else {
          console.error('[Compress] Canvas重新初始化失败');
          wx.showToast({
            title: 'Canvas初始化失败，请重启小程序',
            icon: 'none',
            duration: 2000
          });
        }
      }, 800);
      return;
    }

    const that = this;
    const canvas = this.canvas;
    const ctx = this.ctx;

    this.setData({ isCompressing: true });

    try {
      // 质量100% = 原图，直接返回原图
      if (quality === 100) {
        console.log('[Compress] 质量100%，直接使用原图');
        this.setData({
          compressedImage: originalImage,
          compressedBytes: this.data.originalBytes,
          compressedSize: this.data.originalSize,
          compressionRatio: 0,
          isCompressing: false
        });
        return;
      }

      // 计算目标尺寸
      // 质量影响尺寸：质量越低，尺寸越小
      const maxSize = 4096; // 最大尺寸
      const qualityFactor = quality / 100; // 质量系数 0.3-0.99
      
      let targetWidth = originalWidth;
      let targetHeight = originalHeight;

      // 根据质量调整尺寸
      // 质量30%时，尺寸缩小到原来的60%
      // 质量50%时，尺寸缩小到原来的75%
      // 质量80%时，尺寸保持100%
      // 质量99%时，尺寸保持100%
      let sizeFactor = 1.0;
      if (quality < 80) {
        // 质量低于80%时，按比例缩小尺寸
        sizeFactor = 0.6 + (quality / 80) * 0.4; // 0.6 到 1.0
      }

      targetWidth = Math.floor(originalWidth * sizeFactor);
      targetHeight = Math.floor(originalHeight * sizeFactor);

      // 限制最大尺寸
      if (targetWidth > maxSize || targetHeight > maxSize) {
        if (targetWidth > targetHeight) {
          targetHeight = Math.floor(targetHeight * (maxSize / targetWidth));
          targetWidth = maxSize;
        } else {
          targetWidth = Math.floor(targetWidth * (maxSize / targetHeight));
          targetHeight = maxSize;
        }
      }

      // 确保尺寸至少为1
      targetWidth = Math.max(1, targetWidth);
      targetHeight = Math.max(1, targetHeight);

      console.log('[Compress] 目标尺寸:', { 
        targetWidth, 
        targetHeight, 
        sizeFactor,
        qualityFactor 
      });

      // 设置 Canvas 尺寸
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      console.log('[Compress] Canvas尺寸设置:', {
        width: canvas.width,
        height: canvas.height
      });

      // 创建图片对象
      const img = canvas.createImage();
      
      img.onload = () => {
        console.log('[Compress] 图片加载成功，开始绘制');
        
        try {
          // 绘制图片
          ctx.clearRect(0, 0, targetWidth, targetHeight);
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          
          console.log('[Compress] 图片绘制完成，开始导出');

          // 导出压缩后的图片
          // 质量参数：确保按比例压缩
          const exportQuality = Math.max(0.3, Math.min(0.99, quality / 100));

          wx.canvasToTempFilePath({
            canvas: canvas,
            x: 0,
            y: 0,
            width: targetWidth,
            height: targetHeight,
            destWidth: targetWidth,
            destHeight: targetHeight,
            quality: exportQuality,
            fileType: 'jpg',
            success: (res) => {
              console.log('[Compress] 导出成功:', res);
              
              if (!res || !res.tempFilePath) {
                that.setData({ isCompressing: false });
                wx.showToast({
                  title: '压缩失败：无法导出',
                  icon: 'none'
                });
                return;
              }

              const compressedPath = res.tempFilePath;

              // 获取压缩后的文件大小
              try {
                const fs = wx.getFileSystemManager();
                const stats = fs.statSync(compressedPath);
                const compressedBytes = stats && stats.size ? stats.size : 0;
                const originalBytes = that.data.originalBytes || 1;
                
                const ratio = Math.round((1 - compressedBytes / originalBytes) * 100);

                console.log('[Compress] 压缩完成:', {
                  originalBytes,
                  compressedBytes,
                  ratio,
                  quality
                });

                that.setData({
                  compressedImage: compressedPath,
                  compressedBytes: compressedBytes,
                  compressedSize: that.formatSize(compressedBytes),
                  compressionRatio: ratio > 0 ? ratio : 0,
                  isCompressing: false
                });

              } catch (e) {
                console.error('[Compress] 获取压缩文件信息失败:', e);
                that.setData({ isCompressing: false });
                wx.showToast({
                  title: '获取文件信息失败',
                  icon: 'none'
                });
              }
            },
            fail: (err) => {
              console.error('[Compress] canvasToTempFilePath 失败:', err);
              that.setData({ isCompressing: false });
              
              let errorMsg = '导出失败';
              if (err && err.errMsg) {
                if (err.errMsg.includes('canvas is empty')) {
                  errorMsg = 'Canvas为空，请重新选择图片';
                } else if (err.errMsg.includes('fail')) {
                  errorMsg = '导出失败，请重试';
                } else {
                  errorMsg = '导出失败: ' + err.errMsg;
                }
              }
              
              wx.showModal({
                title: '压缩失败',
                content: errorMsg,
                showCancel: true,
                confirmText: '重试',
                cancelText: '取消',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    // 延迟重试
                    setTimeout(() => {
                      that.compressImage();
                    }, 500);
                  }
                }
              });
            }
          });
        } catch (e) {
          console.error('[Compress] Canvas 绘制失败:', e);
          that.setData({ isCompressing: false });
          wx.showToast({
            title: '绘制失败',
            icon: 'none'
          });
        }
      };

      img.onerror = (e) => {
        console.error('[Compress] 图片加载失败:', e);
        that.setData({ isCompressing: false });
        wx.showToast({
          title: '图片加载失败',
          icon: 'none'
        });
      };

      console.log('[Compress] 开始加载图片:', originalImage);
      img.src = originalImage;

    } catch (e) {
      console.error('[Compress] 压缩异常:', e);
      this.setData({ isCompressing: false });
      wx.showToast({
        title: '压缩异常: ' + e.message,
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 质量滑块变化（拖动中）
  onQualityChanging(e) {
    if (e && e.detail && typeof e.detail.value !== 'undefined') {
      this.setData({
        quality: e.detail.value
      });
    }
  },

  // 质量滑块变化（松手后）
  onQualityChange(e) {
    if (!e || !e.detail || typeof e.detail.value === 'undefined') {
      return;
    }

    this.setData({
      quality: e.detail.value
    });
    
    // 防抖：延迟压缩
    if (this.compressTimer) {
      clearTimeout(this.compressTimer);
    }
    
    this.compressTimer = setTimeout(() => {
      this.compressImage();
    }, 300);
  },

  // 设置预设质量
  setQuality(e) {
    if (!e || !e.currentTarget || !e.currentTarget.dataset) {
      return;
    }

    const value = parseInt(e.currentTarget.dataset.value);
    
    if (isNaN(value)) {
      return;
    }

    this.setData({
      quality: value
    });
    
    // 立即压缩
    setTimeout(() => {
      this.compressImage();
    }, 100);
  },

  // 预览原图
  previewOriginal() {
    const { originalImage } = this.data;
    
    if (originalImage) {
      wx.previewImage({
        urls: [originalImage],
        current: originalImage
      });
    }
  },

  // 预览压缩图
  previewCompressed() {
    const { compressedImage } = this.data;
    
    if (compressedImage) {
      wx.previewImage({
        urls: [compressedImage],
        current: compressedImage
      });
    }
  },

  // 重新选择
  reselect() {
    this.setData({
      originalImage: '',
      originalSize: '',
      originalWidth: 0,
      originalHeight: 0,
      originalBytes: 0,
      compressedImage: '',
      compressedSize: '',
      compressedBytes: 0,
      compressionRatio: 0,
      quality: 80  // 重置为默认80%
    });
  },

  // 保存图片
  saveImage() {
    const { compressedImage } = this.data;
    
    if (!compressedImage) {
      wx.showToast({
        title: '请先压缩图片',
        icon: 'none'
      });
      return;
    }

    const that = this;

    // 检查权限状态
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.writePhotosAlbum'] === false) {
          // 权限被明确拒绝，引导用户去设置
          wx.showModal({
            title: '需要相册权限',
            content: '保存图片需要访问您的相册，请在设置中开启权限',
            confirmText: '去设置',
            cancelText: '取消',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.openSetting({
                  success: (settingRes) => {
                    if (settingRes && settingRes.authSetting && settingRes.authSetting['scope.writePhotosAlbum']) {
                      that.doSaveImage();
                    } else {
                      wx.showToast({
                        title: '需要开启相册权限',
                        icon: 'none'
                      });
                    }
                  }
                });
              }
            }
          });
        } else if (res.authSetting['scope.writePhotosAlbum'] === true) {
          // 已有权限，直接保存
          that.doSaveImage();
        } else {
          // 未授权过，请求权限
          wx.authorize({
            scope: 'scope.writePhotosAlbum',
            success: () => {
              that.doSaveImage();
            },
            fail: () => {
              // 用户拒绝授权
              wx.showModal({
                title: '需要相册权限',
                content: '保存图片需要访问您的相册，请授权后重试',
                confirmText: '重新授权',
                cancelText: '取消',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    // 再次尝试授权
                    wx.authorize({
                      scope: 'scope.writePhotosAlbum',
                      success: () => {
                        that.doSaveImage();
                      },
                      fail: () => {
                        wx.showToast({
                          title: '需要相册权限才能保存',
                          icon: 'none'
                        });
                      }
                    });
                  }
                }
              });
            }
          });
        }
      },
      fail: () => {
        wx.showToast({
          title: '获取权限状态失败',
          icon: 'none'
        });
      }
    });
  },

  // 执行保存
  doSaveImage() {
    const { compressedImage } = this.data;

    if (!compressedImage) {
      wx.showToast({
        title: '没有可保存的图片',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '保存中...',
      mask: true
    });

    wx.saveImageToPhotosAlbum({
      filePath: compressedImage,
      success: () => {
        wx.hideLoading();
        wx.showModal({
          title: '保存成功',
          content: '图片已保存到相册',
          showCancel: false,
          confirmText: '完成'
        });
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('保存失败:', err);
        
        let errorMsg = '保存失败';
        if (err && err.errMsg) {
          if (err.errMsg.includes('auth deny') || err.errMsg.includes('authorize')) {
            errorMsg = '需要相册权限才能保存图片';
          } else if (err.errMsg.includes('fail')) {
            errorMsg = '保存失败，可能是存储空间不足';
          } else {
            errorMsg = '保存失败: ' + err.errMsg;
          }
        }
        
        wx.showModal({
          title: '保存失败',
          content: errorMsg,
          showCancel: true,
          confirmText: '重试',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              // 重试保存
              setTimeout(() => {
                this.doSaveImage();
              }, 500);
            }
          }
        });
      }
    });
  },

  // 格式化文件大小
  formatSize(bytes) {
    if (!bytes || bytes === 0) {
      return '0 B';
    }
    
    if (bytes < 1024) {
      return bytes + ' B';
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' KB';
    } else {
      return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    }
  },

  onUnload() {
    // 清理定时器
    if (this.compressTimer) {
      clearTimeout(this.compressTimer);
      this.compressTimer = null;
    }
    
    // 清理 Canvas 引用
    this.canvas = null;
    this.ctx = null;
  },

  // 分享配置
  onShareAppMessage() {
    return {
      title: '图片压缩工具 - 快速压缩图片',
      path: '/pages/image-compress/index',
      imageUrl: ''
    };
  },

  onShareTimeline() {
    return {
      title: '图片压缩工具 - 快速压缩图片'
    };
  }
});
