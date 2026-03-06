const app = getApp();

Page({
  data: {
    height: '',
    weight: '',
    
    heightFocus: false,
    weightFocus: false,
    
    bmiResult: null,
    healthStatus: '',
    statusClass: '',
    healthAdvice: '',
    targetDiff: '',
    
    targetBMI: '', // 用户设定的目标
    
    showHistoryPanel: false,
    historyList: [],
    
    showTipsModal: false,
    showLimitModal: false
  },

  onLoad() {
    this.loadHistory();
  },

  // 输入处理
  onHeightInput(e) { this.setData({ height: e.detail.value }); },
  onHeightFocus() { this.setData({ heightFocus: true }); },
  onHeightBlur() { 
    let val = parseFloat(this.data.height);
    if (!isNaN(val)) {
      this.setData({ height: val.toFixed(1), heightFocus: false });
    } else {
      this.setData({ heightFocus: false });
    }
  },
  clearHeight() { this.setData({ height: '' }); },
  
  onWeightInput(e) { this.setData({ weight: e.detail.value }); },
  onWeightFocus() { this.setData({ weightFocus: true }); },
  onWeightBlur() { 
    let val = parseFloat(this.data.weight);
    if (!isNaN(val)) {
      this.setData({ weight: val.toFixed(1), weightFocus: false });
    } else {
      this.setData({ weightFocus: false });
    }
  },
  clearWeight() { this.setData({ weight: '' }); },

  // 滑块处理
  onHeightSlider(e) { this.setData({ height: e.detail.value.toFixed(1) }); },
  onWeightSlider(e) { this.setData({ weight: e.detail.value.toFixed(1) }); },

  // 重置
  reset() {
    this.setData({
      height: '',
      weight: '',
      bmiResult: null,
      targetBMI: ''
    });
  },

  // 核心计算
  calculate() {
    const h = parseFloat(this.data.height);
    const w = parseFloat(this.data.weight);
    
    if (!h || !w || h <= 0 || w <= 0) {
      wx.showToast({ title: '请输入有效数值', icon: 'none' });
      return;
    }
    
    let bmi;
    // kg / m^2
    bmi = w / ((h / 100) * (h / 100));
    
    bmi = bmi.toFixed(1);
    
    // 健康状态判断 (中国标准)
    let status = '';
    let statusClass = '';
    let advice = '';
    
    if (bmi < 18.5) {
      status = '偏瘦';
      statusClass = 'status-thin';
      advice = '建议合理膳食，增加优质蛋白摄入，配合力量训练增加肌肉量。';
    } else if (bmi < 24) {
      status = '正常';
      statusClass = 'status-normal';
      advice = '身体状态很棒！请继续保持均衡饮食和规律运动。';
    } else if (bmi < 28) {
      status = '超重';
      statusClass = 'status-overweight';
      advice = '需注意控制饮食热量，减少高糖高油食物，增加有氧运动。';
    } else {
      status = '肥胖';
      statusClass = 'status-obese';
      advice = '建议制定减重计划，必要时咨询专业医生或营养师，关注心血管健康。';
    }
    
    this.setData({
      bmiResult: bmi,
      healthStatus: status,
      statusClass: statusClass,
      healthAdvice: advice
    });
    
    this.calculateTargetDiff(bmi);
    this.addToHistory(bmi, status, statusClass);
  },
  
  // 目标差异计算
  onTargetInput(e) {
    this.setData({ targetBMI: e.detail.value });
    if (this.data.bmiResult) {
      this.calculateTargetDiff(this.data.bmiResult);
    }
  },
  
  calculateTargetDiff(currentBMI) {
    const target = parseFloat(this.data.targetBMI || 22.0);
    const current = parseFloat(currentBMI);
    
    const diff = (current - target).toFixed(1);
    let diffText = '';
    
    if (Math.abs(diff) < 0.2) {
      diffText = '已达成目标';
    } else if (diff > 0) {
      // 需要减重
      // 倒推体重： target = w / h^2  => w = target * h^2
      let h = parseFloat(this.data.height);
      h = h / 100; // m
      
      // 估算需要减去的重量 (仅公制简单估算)
      const targetWeight = target * h * h;
      const lose = (parseFloat(this.data.weight) - targetWeight).toFixed(1);
      diffText = `高于目标 ${diff}，需减重约 ${lose}kg`;
    } else {
      diffText = `低于目标 ${Math.abs(diff)}`;
    }
    
    this.setData({ targetDiff: diffText });
  },

  // 历史记录
  loadHistory() {
    const list = wx.getStorageSync('bmi_history') || [];
    this.setData({ historyList: list });
  },
  
  addToHistory(bmi, status, statusClass) {
    const item = {
      bmi,
      status,
      statusClass,
      height: this.data.height,
      weight: this.data.weight,
      timestamp: Date.now(),
      date: new Date().toLocaleDateString()
    };
    
    let list = [item, ...this.data.historyList];
    if (list.length > 5) list = list.slice(0, 5);
    
    this.setData({ historyList: list });
    wx.setStorageSync('bmi_history', list);
  },
  
  showHistory() { this.setData({ showHistoryPanel: true }); },
  hideHistory() { this.setData({ showHistoryPanel: false }); },
  
  clearHistory() {
    this.setData({ historyList: [] });
    wx.removeStorageSync('bmi_history');
  },
  
  deleteHistoryItem(e) {
    const index = e.currentTarget.dataset.index;
    const list = this.data.historyList;
    list.splice(index, 1);
    this.setData({ historyList: list });
    wx.setStorageSync('bmi_history', list);
  },
  
  // 保存记录 (Toast提示)
  saveRecord() {
    wx.showToast({ title: '已自动保存', icon: 'success' });
  },
  
  // 小贴士
  showTips() { this.setData({ showTipsModal: true }); },
  hideTips() { this.setData({ showTipsModal: false }); },

  // 局限性提醒
  showLimit() { 
    wx.vibrateShort(); // 添加震动反馈
    this.setData({ showLimitModal: true }); 
  },
  hideLimit() { this.setData({ showLimitModal: false }); },
  
  onShareAppMessage() {
    return {
      title: `我的BMI是${this.data.bmiResult}，你的呢？`,
      path: '/pages/bmi/index'
    };
  }
})