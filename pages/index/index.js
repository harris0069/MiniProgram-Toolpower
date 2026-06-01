const API_BASE = 'https://xcx.huangyiling.top/api';

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    favoriteTools: [],
    allTools: [],
    isManaging: false,
    featureFlags: {},
    flagsLoaded: false,
    tools: [
      {
        id: 'calendar',
        name: '万年历',
        page: 'calendar',
        emoji: '📆',
        bgColor: 'linear-gradient(135deg, #FFD4A3 0%, #FFDDB3 100%)'
      },
      {
        id: 'ruler',
        name: '尺子',
        page: 'ruler',
        emoji: '📏',
        bgColor: 'linear-gradient(135deg, #B0C4DE 0%, #C0D4EE 100%)'
      },
      {
        id: 'metronome',
        name: '节拍器',
        page: 'metronome',
        emoji: '🎵',
        bgColor: 'linear-gradient(135deg, #B0E0E6 0%, #ADD8E6 100%)'
      },
      {
        id: 'id-photo',
        name: '证件照',
        page: 'id-photo',
        emoji: '📷',
        bgColor: 'linear-gradient(135deg, #DDA0DD 0%, #E6B8E6 100%)'
      },
      {
        id: 'image-compress',
        name: '图片压缩',
        page: 'image-compress',
        emoji: '🖼️',
        bgColor: 'linear-gradient(135deg, #FFB6C1 0%, #FFC0CB 100%)'
      },
      {
        id: 'watermark',
        name: '水印工具',
        page: 'watermark',
        emoji: '💧',
        bgColor: 'linear-gradient(135deg, #87CEEB 0%, #98D8F8 100%)'
      },
      {
        id: 'bmi',
        name: 'BMI计算器',
        page: 'bmi',
        emoji: '⚖️',
        bgColor: 'linear-gradient(135deg, #98FB98 0%, #B0FFA8 100%)'
      },
      {
        id: 'anniversary',
        name: '纪念日',
        page: 'anniversary',
        emoji: '💝',
        bgColor: 'linear-gradient(135deg, #FFB6D9 0%, #FFC9E3 100%)'
      },
      {
        id: 'wheel-decision',
        name: '转盘决策',
        page: 'wheel-decision',
        emoji: '🎯',
        bgColor: 'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)'
      },
      {
        id: 'link-parse',
        name: '链接解析',
        page: 'link-parse',
        emoji: '🎬',
        bgColor: 'linear-gradient(135deg, #A8D8EA 0%, #C4E0F0 100%)'
      }
    ]
  },

  onLoad() {
    const systemInfo = wx.getWindowInfo();
    const statusBarHeight = systemInfo.statusBarHeight || 0;
    const navBarHeight = statusBarHeight + 44;
    
    this.setData({ statusBarHeight, navBarHeight });
    
    this.fetchFeatureFlags().then(() => this.loadToolsData());
  },

  onShow() {
    if (this.data.flagsLoaded) {
      this.loadToolsData();
    } else {
      this.fetchFeatureFlags().then(() => this.loadToolsData());
    }
  },

  async fetchFeatureFlags() {
    try {
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: API_BASE + '/feature_flags.php',
          timeout: 5000,
          success: resolve,
          fail: reject
        });
      });
      if (res.data && res.data.success) {
        this.setData({ featureFlags: res.data.flags });
      }
    } catch (e) {
      console.warn('[Index] 获取功能开关失败', e);
    }
    this.setData({ flagsLoaded: true });
  },

  loadToolsData() {
    const favorites = wx.getStorageSync('tool_favorites') || [];
    
    // 过滤被后台关闭的功能
    const enabledTools = this.data.tools.filter(t => {
      const flagKey = t.id.replace(/-/g, '_');
      return this.data.featureFlags[flagKey] !== false;
    });
    
    const favoriteTools = favorites
      .map(id => enabledTools.find(t => t.id === id))
      .filter(t => t);
    
    const allTools = enabledTools.filter(tool => !favorites.includes(tool.id));
    
    this.setData({ favoriteTools, allTools });
  },

  // 导航到工具页面
  navigateToTool(e) {
    const page = e.currentTarget.dataset.page;
    
    wx.navigateTo({
      url: page.includes('/') ? `/pages/${page}` : `/pages/${page}/index`
    });
  },

  // 长按常用工具 - 移除收藏
  onFavoriteLongPress(e) {
    const toolId = e.currentTarget.dataset.id;
    const tool = this.data.favoriteTools.find(t => t.id === toolId);
    
    if (!tool) return;
    
    // 如果处于管理模式，直接移除
    if (this.data.isManaging) {
      this.removeFavorite(toolId);
      return;
    }
    
    wx.showModal({
      title: '移除常用',
      content: `确定要将"${tool.name}"从常用工具中移除吗？`,
      confirmText: '移除',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          this.removeFavorite(toolId);
        }
      }
    });
  },

  // 长按全部工具 - 添加到常用
  onToolLongPress(e) {
    const toolId = e.currentTarget.dataset.id;
    const tool = this.data.allTools.find(t => t.id === toolId);
    
    if (!tool) return;
    
    wx.showActionSheet({
      itemList: ['添加到常用'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.addToFavorite(toolId);
        }
      }
    });
  },

  // 添加到常用
  addToFavorite(toolId) {
    let favorites = wx.getStorageSync('tool_favorites') || [];
    
    // 检查是否已达上限（最多6个，2行×3列）
    if (favorites.length >= 6) {
      wx.showToast({
        title: '最多收藏6个工具，请先移除一些',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 检查是否已存在
    if (favorites.includes(toolId)) {
      wx.showToast({
        title: '该工具已在常用中',
        icon: 'none'
      });
      return;
    }
    
    // 添加到常用
    favorites.push(toolId);
    wx.setStorageSync('tool_favorites', favorites);
    
    wx.showToast({
      title: '已添加到常用',
      icon: 'success',
      duration: 1500
    });
    
    this.loadToolsData();
  },

  // 移除常用
  removeFavorite(toolId) {
    let favorites = wx.getStorageSync('tool_favorites') || [];
    favorites = favorites.filter(id => id !== toolId);
    wx.setStorageSync('tool_favorites', favorites);
    
    wx.showToast({
      title: '已移除',
      icon: 'success',
      duration: 1500
    });
    
    // 如果移除后常用工具为空，自动退出管理模式
    if (favorites.length === 0 && this.data.isManaging) {
      this.setData({ isManaging: false });
    }
    
    this.loadToolsData();
  },

  // 切换管理模式
  toggleManageMode() {
    const isManaging = !this.data.isManaging;
    this.setData({ isManaging });
    
    if (isManaging) {
      wx.showToast({
        title: '点击工具即可移除',
        icon: 'none',
        duration: 1500
      });
    }
  },

  // 管理模式下点击移除
  onFavoriteClick(e) {
    if (this.data.isManaging) {
      const toolId = e.currentTarget.dataset.id;
      this.removeFavorite(toolId);
    } else {
      // 正常跳转
      this.navigateToTool(e);
    }
  },

  // 分享配置
  onShareAppMessage() {
    return {
      title: '实用工具箱 - 你的生活小助手',
      path: '/pages/index/index',
      imageUrl: ''
    };
  },

  onShareTimeline() {
    return {
      title: '实用工具箱 - 你的生活小助手'
    };
  }
});