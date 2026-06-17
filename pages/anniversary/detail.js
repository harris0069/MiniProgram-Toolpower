// 纪念日工具 - 详情页 V1.0.2
Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    anniversary: null, // 纪念日详情
    countText: '', // 计时文案
    diffDays: 0, // 天数差
    bgColor: '', // 背景色
    anniversary: 0, // 周年数
    showAnniversary: false // 是否显示周年
  },

  onLoad(options) {
    // 获取系统信息
    const systemInfo = wx.getWindowInfo();
    const statusBarHeight = systemInfo.statusBarHeight || 0;
    const navBarHeight = statusBarHeight + 44;
    
    this.setData({
      statusBarHeight,
      navBarHeight
    });
    
    // 获取纪念日ID
    const id = options.id;
    if (id) {
      this.loadAnniversaryDetail(id);
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none',
        duration: 2000
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
    }
  },

  // 加载纪念日详情
  loadAnniversaryDetail(id) {
    try {
      const list = wx.getStorageSync('anniversary_list') || [];
      const anniversary = list.find(item => item.id === id);
      
      if (anniversary) {
        // 计算计时信息
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let targetDate = new Date(anniversary.dateValue);
        targetDate.setHours(0, 0, 0, 0);
        
        const originalDate = new Date(anniversary.dateValue);
        originalDate.setHours(0, 0, 0, 0);
        
        // 计算周年
        let anniversaryYear = 0;
        let showAnniversary = false;
        
        if (anniversary.repeat) {
          const currentYear = today.getFullYear();
          const originalYear = originalDate.getFullYear();
          anniversaryYear = currentYear - originalYear;
          
          if (anniversaryYear >= 1) {
            showAnniversary = true;
          }
          
          // 如果是重复事件且今年已过，计算明年的日期
          const targetMonth = targetDate.getMonth();
          const targetDay = targetDate.getDate();
          
          let thisYearTarget = new Date(currentYear, targetMonth, targetDay);
          thisYearTarget.setHours(0, 0, 0, 0);
          
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
        let bgColor = '';
        
        if (diffDays === 0) {
          countText = '今天';
          bgColor = '#FFE5E5'; // 浅红色
        } else if (diffDays > 0) {
          if (anniversary.repeat && targetDate.getFullYear() > today.getFullYear()) {
            countText = `距离明年还有 ${diffDays} 天`;
          } else {
            countText = `还有 ${diffDays} 天`;
          }
          bgColor = diffDays <= 30 ? '#FFF4E5' : '#E5F4FF'; // 浅黄色或浅蓝色
        } else {
          countText = `已过去 ${Math.abs(diffDays)} 天`;
          bgColor = '#FFE5E5'; // 浅红色
        }
        
        this.setData({ 
          anniversary,
          countText,
          diffDays: Math.abs(diffDays),
          bgColor,
          anniversaryYear,
          showAnniversary
        });
      } else {
        wx.showToast({
          title: '纪念日不存在',
          icon: 'none',
          duration: 2000
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 2000);
      }
    } catch (error) {
      console.error('加载纪念日详情失败:', error);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none',
        duration: 2000
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
    }
  },

  // 编辑纪念日
  editAnniversary() {
    if (!this.data.anniversary) return;
    
    wx.navigateTo({
      url: `/pages/anniversary/create?id=${this.data.anniversary.id}`
    });
  },

  // 删除纪念日
  deleteAnniversary() {
    if (!this.data.anniversary) return;
    
    wx.showModal({
      title: '删除纪念日',
      content: `确定要删除"${this.data.anniversary.name}"吗？删除后无法恢复`,
      confirmText: '删除',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          try {
            let list = wx.getStorageSync('anniversary_list') || [];
            list = list.filter(item => item.id !== this.data.anniversary.id);
            wx.setStorageSync('anniversary_list', list);
            
            wx.showToast({
              title: '删除成功',
              icon: 'success',
              duration: 1500
            });
            
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
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

  // 返回
  goBack() {
    wx.navigateBack();
  }
});
