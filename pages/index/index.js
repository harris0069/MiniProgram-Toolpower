Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    favoriteTools: [], // 常用工具（最多8个）
    allTools: [], // 全部工具（排除已收藏的）
    isManaging: false, // 是否处于管理模式
    tools: [
      {
        id: 'calendar',
        name: '万年历',
        page: 'calendar',
        emoji: '📆',
        bgColor: 'linear-gradient(135deg, #FFD4A3 0%, #FFDDB3 100%)' // 浅橙色
      },
      {
        id: 'ruler',
        name: '尺子',
        page: 'ruler',
        emoji: '📏',
        bgColor: 'linear-gradient(135deg, #B0C4DE 0%, #C0D4EE 100%)' // 淡蓝灰
      },
      {
        id: 'image-compress',
        name: '图片压缩',
        page: 'image-compress',
        emoji: '🖼️',
        bgColor: 'linear-gradient(135deg, #FFB6C1 0%, #FFC0CB 100%)' // 柔和粉色
      },
      {
        id: 'watermark',
        name: '水印工具',
        page: 'watermark',
        emoji: '💧',
        bgColor: 'linear-gradient(135deg, #87CEEB 0%, #98D8F8 100%)' // 天蓝色
      },
      {
        id: 'metronome',
        name: '节拍器',
        page: 'metronome',
        emoji: '🎵',
        bgColor: 'linear-gradient(135deg, #B0E0E6 0%, #ADD8E6 100%)' // 浅蓝色
      },
      {
        id: 'bmi',
        name: 'BMI计算器',
        page: 'bmi',
        emoji: '⚖️',
        bgColor: 'linear-gradient(135deg, #98FB98 0%, #B0FFA8 100%)' // 薄荷绿
      },
      {
        id: 'anniversary',
        name: '纪念日',
        page: 'anniversary',
        emoji: '💝',
        bgColor: 'linear-gradient(135deg, #FFB6D9 0%, #FFC9E3 100%)' // 粉红色
      },
      {
        id: 'electronic-seal',
        name: '电子印章',
        page: 'electronic-seal/electronic-seal',
        emoji: '🔏',
        bgColor: 'linear-gradient(135deg, #FFE4B5 0%, #FFEDC0 100%)' // 淡黄色
      },
      {
        id: 'wheel-decision',
        name: '转盘决策',
        page: 'wheel-decision',
        emoji: '🎯',
        bgColor: 'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)' // 粉红渐变
      },
      {
        id: 'id-photo',
        name: '证件照',
        page: 'id-photo',
        emoji: '📷',
        bgColor: 'linear-gradient(135deg, #DDA0DD 0%, #E6B8E6 100%)' // 浅紫色
      }
    ]
  },

  onLoad() {
    // 获取系统信息，适配不同设备
    const systemInfo = wx.getWindowInfo();
    const statusBarHeight = systemInfo.statusBarHeight || 0;
    const navBarHeight = statusBarHeight + 44; // 状态栏高度 + 导航栏高度
    
    this.setData({
      statusBarHeight,
      navBarHeight
    });
    
    this.loadToolsData();
  },

  onShow() {
    // 每次显示页面时刷新工具列表
    this.loadToolsData();
  },

  // 加载工具数据
  loadToolsData() {
    const favorites = wx.getStorageSync('tool_favorites') || [];
    
    // 获取常用工具列表
    const favoriteTools = favorites
      .map(id => this.data.tools.find(t => t.id === id))
      .filter(t => t); // 过滤掉可能不存在的工具
    
    // 获取全部工具列表（排除已收藏的）
    const allTools = this.data.tools.filter(tool => !favorites.includes(tool.id));
    
    this.setData({
      favoriteTools,
      allTools
    });
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