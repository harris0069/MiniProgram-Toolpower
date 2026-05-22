Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    
    // 转盘选项
    options: [
      '选项1',
      '选项2',
      '选项3',
      '选项4'
    ],
    
    // 转盘状态
    isSpinning: false,
    currentRotation: 0,
    finalRotation: 0,
    result: '',
    showResult: false,
    
    // 编辑状态
    isEditing: false,
    editingIndex: -1,
    editingText: '',
    
    // 预设模板
    templates: [
      {
        name: '今天吃什么',
        options: ['中餐', '西餐', '日料', '韩料', '火锅', '烧烤']
      },
      {
        name: '周末去哪玩',
        options: ['看电影', '逛商场', '公园散步', '在家休息', '约朋友', '运动健身']
      },
      {
        name: '学什么技能',
        options: ['编程', '绘画', '音乐', '运动', '语言', '摄影']
      },
      {
        name: '选择困难症',
        options: ['选择A', '选择B', '选择C', '选择D', '再想想', '随缘吧']
      }
    ],
    showTemplates: false,
    
    // 转盘样式
    wheelColors: [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
    ]
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
    
    // 加载保存的选项
    this.loadSavedOptions();
  },

  onReady() {
    // 初始化Canvas
    this.initCanvas();
  },

  // 初始化Canvas
  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#wheelCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res && res[0]) {
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          
          // 设置Canvas尺寸
          const dpr = wx.getWindowInfo().pixelRatio;
          canvas.width = res[0].width * dpr;
          canvas.height = res[0].height * dpr;
          ctx.scale(dpr, dpr);
          
          this.canvas = canvas;
          this.ctx = ctx;
          
          // 绘制转盘
          this.drawWheel();
        }
      });
  },

  // 绘制转盘
  drawWheel() {
    if (!this.ctx) return;
    
    const ctx = this.ctx;
    const canvas = this.canvas;
    const options = this.data.options;
    const colors = this.data.wheelColors;
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const centerX = canvas.width / (2 * wx.getWindowInfo().pixelRatio);
    const centerY = canvas.height / (2 * wx.getWindowInfo().pixelRatio);
    const radius = Math.min(centerX, centerY) - 20;
    
    const anglePerOption = (2 * Math.PI) / options.length;
    
    // 绘制扇形
    options.forEach((option, index) => {
      const startAngle = index * anglePerOption + (this.data.currentRotation * Math.PI / 180);
      const endAngle = (index + 1) * anglePerOption + (this.data.currentRotation * Math.PI / 180);
      
      // 绘制扇形背景
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = colors[index % colors.length];
      ctx.fill();
      
      // 绘制边框
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // 绘制文字
      const textAngle = startAngle + anglePerOption / 2;
      const textX = centerX + Math.cos(textAngle) * (radius * 0.7);
      const textY = centerY + Math.sin(textAngle) * (radius * 0.7);
      
      ctx.save();
      ctx.translate(textX, textY);
      ctx.rotate(textAngle + Math.PI / 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // 文字描边
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText(option, 0, 0);
      ctx.fillText(option, 0, 0);
      
      ctx.restore();
    });
    
    // 绘制中心圆
    ctx.beginPath();
    ctx.arc(centerX, centerY, 15, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 绘制指针
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius - 10);
    ctx.lineTo(centerX - 10, centerY - radius + 10);
    ctx.lineTo(centerX + 10, centerY - radius + 10);
    ctx.closePath();
    ctx.fillStyle = '#FF4444';
    ctx.fill();
    ctx.strokeStyle = '#CC0000';
    ctx.lineWidth = 2;
    ctx.stroke();
  },

  // 开始转动
  startSpin() {
    if (this.data.isSpinning) return;
    
    if (this.data.options.length < 2) {
      wx.showToast({
        title: '至少需要2个选项',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      isSpinning: true,
      showResult: false,
      result: ''
    });
    
    // 随机转动角度 (3-6圈 + 随机角度)
    const randomSpins = 3 + Math.random() * 3;
    const randomAngle = Math.random() * 360;
    const totalRotation = randomSpins * 360 + randomAngle;
    
    const finalRotation = this.data.currentRotation + totalRotation;
    
    this.setData({
      finalRotation: finalRotation
    });
    
    // 播放转动音效
    this.playSpinSound();
    
    // 开始动画
    this.animateWheel(totalRotation);
  },

  // 转盘动画
  animateWheel(totalRotation) {
    const duration = 3000; // 3秒
    const startTime = Date.now();
    const startRotation = this.data.currentRotation;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 使用缓动函数
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentRotation = startRotation + totalRotation * easeOut;
      
      this.setData({
        currentRotation: currentRotation
      });
      
      this.drawWheel();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // 动画结束
        this.onSpinComplete();
      }
    };
    
    animate();
  },

  // 转动完成
  onSpinComplete() {
    const options = this.data.options;
    const anglePerOption = 360 / options.length;
    
    // 计算指针指向的选项 (指针在顶部，所以需要调整角度)
    let normalizedAngle = (360 - (this.data.currentRotation % 360)) % 360;
    const selectedIndex = Math.floor(normalizedAngle / anglePerOption);
    const result = options[selectedIndex];
    
    this.setData({
      isSpinning: false,
      result: result,
      showResult: true
    });
    
    // 播放结果音效
    this.playResultSound();
    
    // 震动反馈
    try {
      wx.vibrateShort({ type: 'heavy' });
    } catch (e) {}
    
    // 保存历史记录
    this.saveToHistory(result);
  },

  // 播放转动音效
  playSpinSound() {
    try {
      const audioContext = wx.createInnerAudioContext();
      audioContext.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
      audioContext.play();
    } catch (e) {
      console.log('音效播放失败');
    }
  },

  // 播放结果音效
  playResultSound() {
    try {
      const audioContext = wx.createInnerAudioContext();
      audioContext.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
      audioContext.play();
    } catch (e) {
      console.log('音效播放失败');
    }
  },

  // 添加选项
  addOption() {
    const options = this.data.options;
    if (options.length >= 8) {
      wx.showToast({
        title: '最多支持8个选项',
        icon: 'none'
      });
      return;
    }
    
    const newOptions = [...options, `选项${options.length + 1}`];
    this.setData({
      options: newOptions
    });
    
    this.drawWheel();
    this.saveOptions();
  },

  // 删除选项
  deleteOption(e) {
    const index = e.currentTarget.dataset.index;
    const options = this.data.options;
    
    if (options.length <= 2) {
      wx.showToast({
        title: '至少需要2个选项',
        icon: 'none'
      });
      return;
    }
    
    const newOptions = options.filter((_, i) => i !== index);
    this.setData({
      options: newOptions
    });
    
    this.drawWheel();
    this.saveOptions();
  },

  // 编辑选项
  editOption(e) {
    const index = e.currentTarget.dataset.index;
    const option = this.data.options[index];
    
    this.setData({
      isEditing: true,
      editingIndex: index,
      editingText: option
    });
  },

  // 输入文字
  onTextInput(e) {
    this.setData({
      editingText: e.detail.value
    });
  },

  // 确认编辑
  confirmEdit() {
    const { editingIndex, editingText, options } = this.data;
    
    if (!editingText.trim()) {
      wx.showToast({
        title: '选项不能为空',
        icon: 'none'
      });
      return;
    }
    
    const newOptions = [...options];
    newOptions[editingIndex] = editingText.trim();
    
    this.setData({
      options: newOptions,
      isEditing: false,
      editingIndex: -1,
      editingText: ''
    });
    
    this.drawWheel();
    this.saveOptions();
  },

  // 取消编辑
  cancelEdit() {
    this.setData({
      isEditing: false,
      editingIndex: -1,
      editingText: ''
    });
  },

  // 显示模板
  showTemplates() {
    this.setData({
      showTemplates: true
    });
  },

  // 隐藏模板
  hideTemplates() {
    this.setData({
      showTemplates: false
    });
  },

  // 使用模板
  useTemplate(e) {
    const index = e.currentTarget.dataset.index;
    const template = this.data.templates[index];
    
    this.setData({
      options: [...template.options],
      showTemplates: false
    });
    
    this.drawWheel();
    this.saveOptions();
    
    wx.showToast({
      title: `已应用"${template.name}"模板`,
      icon: 'success'
    });
  },

  // 重置转盘
  resetWheel() {
    wx.showModal({
      title: '重置转盘',
      content: '确定要重置所有选项吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            options: ['选项1', '选项2', '选项3', '选项4'],
            currentRotation: 0,
            showResult: false,
            result: ''
          });
          
          this.drawWheel();
          this.saveOptions();
          
          wx.showToast({
            title: '已重置',
            icon: 'success'
          });
        }
      }
    });
  },

  // 保存选项到本地
  saveOptions() {
    try {
      wx.setStorageSync('wheel_options', this.data.options);
    } catch (e) {
      console.error('保存选项失败:', e);
    }
  },

  // 加载保存的选项
  loadSavedOptions() {
    try {
      const savedOptions = wx.getStorageSync('wheel_options');
      if (savedOptions && savedOptions.length >= 2) {
        this.setData({
          options: savedOptions
        });
      }
    } catch (e) {
      console.error('加载选项失败:', e);
    }
  },

  // 保存到历史记录
  saveToHistory(result) {
    try {
      let history = wx.getStorageSync('wheel_history') || [];
      const record = {
        result: result,
        options: [...this.data.options],
        timestamp: Date.now(),
        date: new Date().toLocaleString()
      };
      
      history.unshift(record);
      
      // 只保留最近20条记录
      if (history.length > 20) {
        history = history.slice(0, 20);
      }
      
      wx.setStorageSync('wheel_history', history);
    } catch (e) {
      console.error('保存历史记录失败:', e);
    }
  },

  // 分享配置
  onShareAppMessage() {
    return {
      title: '转盘决策 - 选择困难症的救星',
      path: '/pages/wheel-decision/index',
      imageUrl: ''
    };
  },

  onShareTimeline() {
    return {
      title: '转盘决策 - 选择困难症的救星'
    };
  }
});