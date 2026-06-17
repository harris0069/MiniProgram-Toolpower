// 纪念日工具 - 列表页 V1.0.2
Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    anniversaryList: [], // 纪念日列表
    isEmpty: true, // 是否为空
    touchStartX: 0, // 触摸开始X坐标
    touchStartY: 0, // 触摸开始Y坐标
    currentSwipeId: '' // 当前左滑的卡片ID
  },

  onLoad() {
    // 获取系统信息，适配不同设备
    const systemInfo = wx.getWindowInfo();
    const statusBarHeight = systemInfo.statusBarHeight || 0;
    const navBarHeight = statusBarHeight + 44;
    
    this.setData({
      statusBarHeight,
      navBarHeight
    });
    
    this.loadAnniversaryList();
  },

  onShow() {
    // 每次显示页面时刷新列表
    this.loadAnniversaryList();
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadAnniversaryList();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 500);
  },

  // 加载纪念日列表
  loadAnniversaryList() {
    try {
      let list = wx.getStorageSync('anniversary_list') || [];
      
      // 计算每个纪念日的计时信息
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      list = list.map(item => {
        let targetDate = new Date(item.dateValue);
        targetDate.setHours(0, 0, 0, 0);
        
        // 如果是重复事件且今年已过，计算明年的日期
        if (item.repeat) {
          const currentYear = today.getFullYear();
          const targetYear = targetDate.getFullYear();
          const targetMonth = targetDate.getMonth();
          const targetDay = targetDate.getDate();
          
          // 创建今年的目标日期
          let thisYearTarget = new Date(currentYear, targetMonth, targetDay);
          thisYearTarget.setHours(0, 0, 0, 0);
          
          // 如果今年的日期已过，使用明年的日期
          if (thisYearTarget < today) {
            targetDate = new Date(currentYear + 1, targetMonth, targetDay);
            targetDate.setHours(0, 0, 0, 0);
          } else {
            targetDate = thisYearTarget;
          }
        }
        
        const diffTime = targetDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let countText = '';
        let isToday = false;
        let sortPriority = 0;
        
        if (diffDays === 0) {
          countText = '今天';
          isToday = true;
          sortPriority = 1; // 最高优先级
        } else if (diffDays > 0) {
          if (item.repeat && targetDate.getFullYear() > today.getFullYear()) {
            countText = `距离明年还有${diffDays}天`;
          } else {
            countText = `还有${diffDays}天`;
          }
          sortPriority = 2; // 未来事件
        } else {
          countText = `已过去${Math.abs(diffDays)}天`;
          sortPriority = 3; // 过去事件
        }
        
        return {
          ...item,
          countText,
          isToday,
          diffDays: Math.abs(diffDays),
          sortPriority,
          swipeLeft: false // 左滑状态
        };
      });
      
      // 智能排序
      list.sort((a, b) => {
        // 1. 按优先级排序
        if (a.sortPriority !== b.sortPriority) {
          return a.sortPriority - b.sortPriority;
        }
        
        // 2. 同优先级按天数排序
        if (a.sortPriority === 2 || a.sortPriority === 3) {
          return a.diffDays - b.diffDays;
        }
        
        // 3. 其他情况按创建时间倒序
        return b.createTime - a.createTime;
      });
      
      this.setData({
        anniversaryList: list,
        isEmpty: list.length === 0
      });
    } catch (error) {
      console.error('加载纪念日列表失败:', error);
      
      // 数据异常处理
      wx.showModal({
        title: '数据异常',
        content: '数据异常，请重新添加纪念日',
        showCancel: false,
        confirmText: '确定',
        success: () => {
          this.setData({
            anniversaryList: [],
            isEmpty: true
          });
        }
      });
    }
  },

  // 触摸开始
  onTouchStart(e) {
    const { clientX, clientY } = e.touches[0];
    this.setData({
      touchStartX: clientX,
      touchStartY: clientY
    });
  },

  // 触摸移动
  onTouchMove(e) {
    const { clientX, clientY } = e.touches[0];
    const { touchStartX, touchStartY } = this.data;
    
    const deltaX = clientX - touchStartX;
    const deltaY = clientY - touchStartY;
    
    // 判断是否为左滑操作（横向滑动距离大于纵向）
    if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < -30) {
      const id = e.currentTarget.dataset.id;
      
      // 更新列表，设置当前卡片为左滑状态
      const list = this.data.anniversaryList.map(item => ({
        ...item,
        swipeLeft: item.id === id
      }));
      
      this.setData({
        anniversaryList: list,
        currentSwipeId: id
      });
    }
  },

  // 触摸结束
  onTouchEnd(e) {
    // 重置触摸坐标
    this.setData({
      touchStartX: 0,
      touchStartY: 0
    });
  },

  // 长按卡片
  onCardLongPress(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.anniversaryList.find(a => a.id === id);
    
    if (!item) return;
    
    wx.showActionSheet({
      itemList: ['分享纪念日卡片'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.shareAnniversary(item);
        }
      }
    });
  },

  // 跳转到新建页面
  goToCreate() {
    const totalCount = this.data.anniversaryList.length;
    
    // 检查是否达到上限
    if (totalCount >= 200) {
      wx.showModal({
        title: '提示',
        content: '最多可创建200个纪念日，请删除不需要的纪念日后再添加',
        showCancel: false,
        confirmText: '我知道了'
      });
      return;
    }
    
    wx.navigateTo({
      url: '/pages/anniversary/create'
    });
  },

  // 跳转到详情页
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/anniversary/detail?id=${id}`
    });
  },

  // 编辑纪念日
  editAnniversary(e) {
    // 阻止事件冒泡，避免触发卡片点击
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    
    const id = e.currentTarget.dataset.id;
    
    // 重置所有卡片的左滑状态
    const list = this.data.anniversaryList.map(item => ({
      ...item,
      swipeLeft: false
    }));
    
    this.setData({
      anniversaryList: list,
      currentSwipeId: ''
    });
    
    wx.navigateTo({
      url: `/pages/anniversary/create?id=${id}`
    });
  },

  // 删除纪念日
  deleteAnniversary(e) {
    // 阻止事件冒泡，避免触发卡片点击
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    
    const id = e.currentTarget.dataset.id;
    const item = this.data.anniversaryList.find(a => a.id === id);
    
    if (!item) return;
    
    wx.showModal({
      title: '删除纪念日',
      content: `确定要删除"${item.name}"吗？删除后无法恢复`,
      confirmText: '删除',
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          try {
            let list = wx.getStorageSync('anniversary_list') || [];
            list = list.filter(a => a.id !== id);
            wx.setStorageSync('anniversary_list', list);
            
            wx.showToast({
              title: '删除成功',
              icon: 'success',
              duration: 1500
            });
            
            this.loadAnniversaryList();
          } catch (error) {
            console.error('删除失败:', error);
            wx.showToast({
              title: '删除失败，请重试',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 分享纪念日
  shareAnniversary(item) {
    wx.showToast({
      title: '分享功能开发中',
      icon: 'none',
      duration: 2000
    });
    // TODO: 实现分享功能
  },

  // 返回首页
  goBack() {
    wx.reLaunch({
      url: '/pages/index/index'
    });
  }
});
