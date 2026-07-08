// 链接解析工具 - 简化版
const { API_BASE } = require('../../utils/config');
const { checkText } = require('../../utils/security.js');
const UsageControl = require('../../utils/usageControl.js');

Page({
  data: {
    inputUrl: '',
    loading: false,
    parsed: false,
    errorMsg: '',
    coverUrl: '',
    coverError: false,
    videoTitle: '',
    authorName: '',
    selectedQuality: '高清',
    videoUrls: {},
    downloading: false,
    downloadProgress: 0,

    // 使用次数
    remainingUses: -1,
    showRedeemModal: false,
    redeemCode: '',
    redeemError: '',
    isRedeeming: false
  },

  onLoad() {
    this.checkFeatureEnabled();
  },

  onUnload() {
    if (this._downloadTask) {
      this._downloadTask.abort();
      this._downloadTask = null;
    }
  },

  async checkFeatureEnabled() {
    try {
      const res = await UsageControl.featureFlag('link_parse');
      if (!res.enabled) {
        const msg = res.message || '功能暂不可用';
        wx.showToast({ title: msg, icon: 'none', duration: 2000 });
        setTimeout(() => wx.navigateBack(), 2000);
        return;
      }
    } catch (e) {
      console.warn('[Link Parse] 获取功能开关失败', e);
    }
    this.fetchUsage();
  },

  onInput(e) {
    this.setData({ 
      inputUrl: e.detail.value, 
      parsed: false, 
      errorMsg: ''
    });
  },

  clearError() {
    this.setData({ errorMsg: '' });
  },

  pasteLink() {
    wx.getClipboardData({
      success: (res) => {
        this.setData({ 
          inputUrl: res.data || '', 
          parsed: false, 
          errorMsg: ''
        });
      },
      fail: () => {
        wx.showToast({
          title: '粘贴失败',
          icon: 'none'
        });
      }
    });
  },

  clearInput() {
    this.setData({ 
      inputUrl: '', 
      parsed: false, 
      errorMsg: '', 
      coverUrl: '', 
      coverError: false, 
      videoTitle: '', 
      authorName: '', 
      videoUrls: {},
      downloading: false
    });
  },

  onCoverError() {
    this.setData({ coverError: true });
  },

  selectQuality(e) {
    const quality = e.currentTarget.dataset.quality;
    if (!this.data.videoUrls[quality]) {
      wx.showToast({ 
        title: '该清晰度暂不可用', 
        icon: 'none' 
      });
      return;
    }
    this.setData({ selectedQuality: quality });
  },

  // 提取有效的抖音链接
  extractValidUrl(text) {
    if (!text) return '';
    
    // 匹配抖音链接的正则表达式
    const patterns = [
      /https?:\/\/v\.douyin\.com\/[A-Za-z0-9]+\/?/g,
      /https?:\/\/www\.douyin\.com\/video\/\d+/g,
      /https?:\/\/www\.iesdouyin\.com\/share\/video\/\d+/g
    ];
    
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        return matches[0];
      }
    }
    
    return '';
  },

  // 验证输入
  validateInput() {
    const text = this.data.inputUrl.trim();
    if (!text) {
      this.setData({ errorMsg: '请输入视频链接' });
      return false;
    }

    // 尝试提取有效链接
    const validUrl = this.extractValidUrl(text);
    if (!validUrl) {
      this.setData({ errorMsg: '未找到有效的抖音链接' });
      return false;
    }

    return validUrl;
  },

  /**
   * 查询当日剩余使用次数
   */
  async fetchUsage() {
    try {
      const res = await UsageControl.check('link_parse');
      this.setData({ remainingUses: res.remaining });
    } catch (e) {
      console.warn('[Link Parse] 获取使用次数失败', e);
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
      const res = await UsageControl.redeem('link_parse', code);

      wx.showToast({ title: res.message || '兑换成功', icon: 'success' });
      this.setData({
        showRedeemModal: false,
        redeemCode: '',
      });
      this.fetchUsage();
    } catch (e) {
      this.setData({ redeemError: e.message || '兑换失败' });
    } finally {
      this.setData({ isRedeeming: false });
    }
  },

  async parseLink() {
    const validUrl = this.validateInput();
    if (!validUrl) return;

    // 检查使用次数
    if (this.data.remainingUses === 0) {
      wx.showModal({
        title: '今日次数已用完',
        content: '链接解析每天限10次，请明日再试或输入兑换码增加次数',
        confirmText: '输入兑换码',
        cancelText: '关闭',
        success: (res) => {
          if (res.confirm) this.showRedeemModal();
        }
      });
      return;
    }

    const textOk = await checkText(this.data.inputUrl);
    if (!textOk.pass) { this.setData({ loading: false }); wx.showToast({ title: textOk.errMsg, icon: 'none' }); return; }

    this.setData({ 
      loading: true, 
      parsed: false, 
      errorMsg: ''
    });

    const ApiClient = require('../../utils/apiClient.js');
    const openid = await ApiClient.getOpenId();
    
    wx.request({
      url: API_BASE + '/douyin_parse.php',
      method: 'POST',
      data: { url: validUrl, openid: openid },
      timeout: 30000,
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        console.log('API响应:', res);
        
        if (res.data && res.data.success) {
          const urls = res.data.urls || {};
          const availableQualities = Object.keys(urls);
          const defaultQuality = availableQualities.includes('高清') ? '高清' : 
                                availableQualities.includes('超清') ? '超清' : 
                                availableQualities.includes('标清') ? '标清' : 
                                availableQualities[0] || '高清';
          
          this.setData({
            loading: false,
            parsed: true,
            coverUrl: res.data.cover || '',
            coverError: false,
            videoTitle: res.data.title || '未知标题',
            authorName: res.data.author || '未知作者',
            videoUrls: urls,
            selectedQuality: defaultQuality
          });
          
          // 刷新剩余次数
          this.fetchUsage();
          
          wx.showToast({
            title: '解析成功',
            icon: 'success'
          });
        } else {
          // 检查是否次数不足
          if (res.data && res.data.code === 'limit_exceeded') {
            this.setData({ errorMsg: res.data.message || '今日次数已用完' });
            wx.showModal({
              title: '今日次数已用完',
              content: res.data.message || '链接解析每天限10次',
              confirmText: '输入兑换码',
              cancelText: '关闭',
              success: (r) => {
                if (r.confirm) this.showRedeemModal();
              }
            });
            return;
          }
          this.setData({
            loading: false,
            parsed: false,
            errorMsg: (res.data && res.data.message) || '解析失败，请检查链接是否正确'
          });
          // 对某些已知错误给出附加建议
          const msg = res.data && res.data.message || '';
          if (msg.includes('Cookie') || msg.includes('管理员')) {
            this.setData({ errorMsg: msg + '。请联系开发者更新服务Cookie' });
          }
        }
      },
      fail: (err) => {
        console.error('API请求失败:', err);
        
        let msg = '解析失败，请稍后重试';
        if (err.errMsg && err.errMsg.includes('timeout')) {
          msg = '请求超时，请稍后重试';
        } else if (err.errMsg && err.errMsg.includes('fail')) {
          msg = '网络异常，请检查网络连接';
        }
        
        this.setData({
          loading: false,
          parsed: false,
          errorMsg: msg
        });
        
        wx.showToast({
          title: msg,
          icon: 'none',
          duration: 3000
        });
      }
    });
  },

  saveToAlbum() {
    const qualityPriority = ['超清', '高清', '标清'];
    const url = qualityPriority.reduce((found, q) => found || this.data.videoUrls[q], null);
    if (!url) {
      wx.showToast({ title: '暂无可用视频', icon: 'none' });
      return;
    }
    this._trySaveToAlbum(url);
  },

  _trySaveToAlbum(url) {
    this.setData({ downloading: true, downloadProgress: 0 });
    this._downloadTask = null;

    const proxyUrl = API_BASE + '/proxy_download.php?url=' + encodeURIComponent(url);
    const task = wx.downloadFile({
      url: proxyUrl,
      success: (res) => {
        this._downloadTask = null;
        if (res.statusCode !== 200) {
          this.setData({ downloading: false, downloadProgress: 0 });
          wx.showToast({ title: '下载失败', icon: 'none' });
          return;
        }
        wx.saveVideoToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            this.setData({ downloading: false });
            wx.showToast({ title: '已保存到相册', icon: 'success' });
          },
          fail: (err) => {
            this.setData({ downloading: false });
            if (err.errMsg.includes('auth deny')) {
              wx.showModal({
                title: '需要权限',
                content: '请在设置中开启相册写入权限',
                success: (r) => {
                  if (r.confirm) wx.openSetting();
                }
              });
              return;
            }
            wx.showToast({ title: '保存失败', icon: 'none' });
          }
        });
      },
      fail: (err) => {
        this._downloadTask = null;
        this.setData({ downloading: false, downloadProgress: 0 });
        if (err && err.errMsg && err.errMsg.includes('abort')) return;
        wx.showToast({ title: '下载失败', icon: 'none' });
      }
    });
    this._downloadTask = task;
    task.onProgressUpdate((res) => {
      if (res.progress > 0) {
        this.setData({ downloadProgress: res.progress });
      }
    });
    setTimeout(() => {
      if (this.data.downloading && this.data.downloadProgress === 0) {
        this.setData({ downloadProgress: 1 });
      }
    }, 2000);
  },

  cancelDownload() {
    if (this._downloadTask) {
      this._downloadTask.abort();
      this._downloadTask = null;
    }
    this.setData({ downloading: false, downloadProgress: 0 });
  },

  onShareAppMessage() {
    return { title: '抖音视频解析 - 无水印下载', path: '/pages/link-parse/index' };
  },

});