// 纪念日工具 - 新建/编辑页面 V1.0.2
const { checkText } = require('../../utils/security.js');
Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    isEdit: false, // 是否为编辑模式
    editId: '', // 编辑的纪念日ID
    emoji: '💝', // 选中的emoji
    name: '', // 纪念日名称
    nameLength: 0, // 名称长度
    date: '', // 选中的日期 YYYY-MM-DD
    dateDisplay: '', // 显示的日期
    calendarType: 'solar', // 历法类型 solar=国历 lunar=农历
    repeat: false, // 是否每年重复
    remark: '', // 备注
    remarkLength: 0, // 备注长度
    canSubmit: false, // 是否可以提交
    showDatePicker: false, // 是否显示日期选择器
    showEmojiPicker: false, // 是否显示emoji选择器
    emojiCategories: [
      {
        name: '爱情',
        icon: '💝',
        emojis: ['💝', '❤️', '💕', '💖', '💗', '💓', '💞', '💘', '💌', '💋', '💍', '💐', '🌹']
      },
      {
        name: '庆祝',
        icon: '🎉',
        emojis: ['🎂', '🎉', '🎊', '🎁', '🎈', '🎀', '🎆', '🎇', '✨', '🎄', '🎃', '🎋']
      },
      {
        name: '人物',
        icon: '👶',
        emojis: ['👶', '👧', '👦', '👨', '👩', '👴', '👵', '👪', '👫', '👬', '👭', '🤰', '🤱']
      },
      {
        name: '学习',
        icon: '🎓',
        emojis: ['🎓', '📚', '✏️', '📝', '💼', '👔', '🏆', '🥇', '🥈', '🥉', '📜', '🎖️']
      },
      {
        name: '运动',
        icon: '⚽',
        emojis: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏓', '🏸', '🏊', '🏃', '🚴', '💪', '🧘']
      },
      {
        name: '娱乐',
        icon: '🎮',
        emojis: ['🎮', '🎯', '🎲', '🎸', '🎹', '🎤', '🎧', '🎬', '🎭', '🎨', '📷', '📸', '🎪']
      },
      {
        name: '交通',
        icon: '✈️',
        emojis: ['✈️', '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛵', '🚲', '🚂', '🚆', '🚇', '🚊', '🚝', '🚄', '🚅', '🚈', '🚞', '🚋', '🚃', '🚟', '🚠', '🚡', '🚁', '🛩️', '🛫', '🛬', '🚀', '🛸', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢']
      },
      {
        name: '建筑',
        icon: '🏠',
        emojis: ['🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏯', '🏰', '💒', '🗼', '🗽', '⛪', '🕌', '🛕', '🕍', '⛩️', '🕋']
      },
      {
        name: '自然',
        icon: '🌸',
        emojis: ['🌸', '🌺', '🌻', '🌼', '🌷', '🌹', '🥀', '🏵️', '💐', '🌾', '🌿', '🍀', '🍁', '🍂', '🍃', '🌱', '🌲', '🌳', '🌴', '🌵', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '🌪️', '🌫️', '🌈', '☔', '⚡', '⭐', '🌟', '✨', '💫', '🌙', '🌛', '🌜', '🌚', '🌝']
      },
      {
        name: '美食',
        icon: '🍰',
        emojis: ['☕', '🍵', '🧃', '🥤', '🧋', '🍼', '🥛', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🍴', '🍽️', '🥄', '🔪', '🍰', '🎂', '🧁', '🥧', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯']
      },
      {
        name: '动物',
        icon: '🐶',
        emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜']
      },
      {
        name: '符号',
        icon: '⭐',
        emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💟', '♥️', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💬', '👁️', '🗨️', '🗯️', '💭', '💤', '⭐', '🌟', '✨', '⚡', '🔥', '💥', '☀️', '🌙', '💫', '🌈']
      }
    ] // emoji分类列表
  },

  onLoad(options) {
    // 获取系统信息
    const systemInfo = wx.getWindowInfo();
    const statusBarHeight = systemInfo.statusBarHeight || 0;
    const navBarHeight = statusBarHeight + 44;
    
    // 检查是否为编辑模式
    const isEdit = !!options.id;
    const editId = options.id || '';
    
    // 设置默认日期为今天
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const dateDisplay = `${year}年${month}月${day}日`;
    
    this.setData({
      statusBarHeight,
      navBarHeight,
      isEdit,
      editId,
      date: dateStr,
      dateDisplay: dateDisplay
    });
    
    // 如果是编辑模式，加载数据
    if (isEdit) {
      this.loadAnniversaryData(editId);
    }
  },

  // 加载纪念日数据（编辑模式）
  loadAnniversaryData(id) {
    try {
      const list = wx.getStorageSync('anniversary_list') || [];
      const anniversary = list.find(item => item.id === id);
      
      if (anniversary) {
        // 从名称中提取emoji和文字
        const nameStr = anniversary.name;
        let emoji = '💝';
        let name = nameStr;
        
        // 检查第一个字符是否为emoji
        const firstChar = nameStr.charAt(0);
        const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
        if (emojiRegex.test(firstChar)) {
          emoji = firstChar;
          name = nameStr.substring(1).trim();
        }
        
        this.setData({
          emoji: emoji,
          name: name,
          nameLength: name.length,
          date: anniversary.dateValue,
          dateDisplay: anniversary.date,
          calendarType: anniversary.calendarType || 'solar',
          repeat: anniversary.repeat || false,
          remark: anniversary.remark || '',
          remarkLength: (anniversary.remark || '').length
        }, () => {
          this.checkCanSubmit();
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
      console.error('加载纪念日数据失败:', error);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    }
  },

  // 打开emoji选择器
  openEmojiPicker() {
    this.setData({ showEmojiPicker: true });
  },

  // 选择emoji
  selectEmoji(e) {
    const emoji = e.currentTarget.dataset.emoji;
    this.setData({ 
      emoji: emoji,
      showEmojiPicker: false 
    });
  },

  // 关闭emoji选择器
  closeEmojiPicker() {
    this.setData({ showEmojiPicker: false });
  },

  // 切换历法类型
  switchCalendarType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ calendarType: type });
  },

  // 切换重复开关
  onRepeatChange(e) {
    this.setData({ repeat: e.detail.value });
  },

  // 输入名称
  onNameInput(e) {
    let value = e.detail.value;
    
    // 过滤特殊符号和emoji
    const filtered = value.replace(/[@#$%^&*()_+=\[\]{};':"\\|,.<>\/?`~]|[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
    
    if (filtered !== value) {
      wx.showToast({
        title: '不允许输入特殊符号和emoji',
        icon: 'none',
        duration: 1500
      });
      value = filtered;
    }
    
    // 限制20个字符
    if (value.length > 20) {
      value = value.substring(0, 20);
      wx.showToast({
        title: '最多输入20个字符',
        icon: 'none',
        duration: 1500
      });
    }
    
    this.setData({
      name: value,
      nameLength: value.length
    }, () => {
      this.checkCanSubmit();
    });
  },

  // 输入备注
  onRemarkInput(e) {
    let value = e.detail.value;
    
    // 限制100个字符
    if (value.length > 100) {
      value = value.substring(0, 100);
      wx.showToast({
        title: '最多输入100个字符',
        icon: 'none',
        duration: 1500
      });
    }
    
    this.setData({
      remark: value,
      remarkLength: value.length
    });
  },

  // 打开日期选择器
  openDatePicker() {
    this.setData({ showDatePicker: true });
  },

  // 日期选择确认
  onDateConfirm(e) {
    const dateStr = e.detail.value; // YYYY-MM-DD
    const [year, month, day] = dateStr.split('-');
    
    let dateDisplay = '';
    if (this.data.calendarType === 'solar') {
      dateDisplay = `${year}年${month}月${day}日`;
    } else {
      // 农历显示（简化版）
      dateDisplay = `${year}年${month}月${day}日`;
    }
    
    this.setData({
      date: dateStr,
      dateDisplay: dateDisplay,
      showDatePicker: false
    }, () => {
      this.checkCanSubmit();
    });
  },

  // 日期选择取消
  onDateCancel() {
    this.setData({ showDatePicker: false });
  },

  // 检查是否可以提交
  checkCanSubmit() {
    const canSubmit = this.data.name.trim().length > 0 && this.data.date.length > 0;
    this.setData({ canSubmit });
  },

  // 保存纪念日
  async saveAnniversary() {
    if (!this.data.canSubmit) {
      return;
    }
    
    const textOk = await checkText(this.data.name + this.data.remark);
    if (!textOk.pass) { wx.showToast({ title: textOk.errMsg, icon: 'none' }); return; }
    
    try {
      const now = Date.now();
      let list = wx.getStorageSync('anniversary_list') || [];
      
      // 组合emoji和名称
      const fullName = `${this.data.emoji} ${this.data.name.trim()}`;
      
      if (this.data.isEdit) {
        // 编辑模式：更新现有纪念日
        list = list.map(item => {
          if (item.id === this.data.editId) {
            return {
              ...item,
              name: fullName,
              date: this.data.dateDisplay,
              dateValue: this.data.date,
              calendarType: this.data.calendarType,
              repeat: this.data.repeat,
              remark: this.data.remark.trim(),
              updateTime: now
            };
          }
          return item;
        });
        
        wx.setStorageSync('anniversary_list', list);
        
        wx.showToast({
          title: '修改成功',
          icon: 'success',
          duration: 1500
        });
      } else {
        // 新建模式：创建新纪念日
        const id = `anniversary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const anniversary = {
          id: id,
          name: fullName,
          date: this.data.dateDisplay,
          dateValue: this.data.date,
          calendarType: this.data.calendarType,
          repeat: this.data.repeat,
          category: 'life',
          remark: this.data.remark.trim(),
          createTime: now,
          updateTime: now
        };
        
        list.push(anniversary);
        wx.setStorageSync('anniversary_list', list);
        
        wx.showToast({
          title: '保存成功',
          icon: 'success',
          duration: 1500
        });
      }
      
      // 延迟返回
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      
    } catch (error) {
      console.error('保存纪念日失败:', error);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 返回
  goBack() {
    // 检查是否有未保存的内容
    if (this.data.name.trim().length > 0 && !this.data.isEdit) {
      wx.showModal({
        title: '提示',
        content: '当前内容未保存，确定要离开吗？',
        confirmText: '离开',
        confirmColor: '#FF6B6B',
        cancelText: '继续编辑',
        success: (res) => {
          if (res.confirm) {
            wx.navigateBack();
          }
        }
      });
    } else {
      wx.navigateBack();
    }
  }
});
