const app = getApp();
const DEFAULT_TARGET_BMI = 22.0;

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
      healthStatus: '',
      statusClass: '',
      healthAdvice: '',
      targetDiff: '',
      bmiResult: null,
      targetBMI: ''
    });
  },

  // 核心计算
  calculate() {
    const h = parseFloat(this.data.height);
    const w = parseFloat(this.data.weight);
    
    // 增强输入验证
    if (!h || !w || isNaN(h) || isNaN(w)) {
      wx.showToast({ title: '请输入有效数值', icon: 'none' });
      return;
    }
    
    if (h <= 0 || w <= 0) {
      wx.showToast({ title: '身高和体重必须大于0', icon: 'none' });
      return;
    }
    
    // 合理性检查
    if (h < 50 || h > 300) {
      wx.showToast({ title: '请输入合理的身高(50-300cm)', icon: 'none' });
      return;
    }
    
    if (w < 10 || w > 500) {
      wx.showToast({ title: '请输入合理的体重(10-500kg)', icon: 'none' });
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
      status = '体重过低';
      statusClass = 'status-thin';
      advice = '您的体重低于健康范围，可能存在营养不良、免疫力下降风险。\n\n【饮食建议】增加优质蛋白质摄入（鸡蛋、牛奶、瘦肉、鱼虾、豆制品），主食适量增加，每日加2次健康零食（坚果、酸奶、水果）。\n\n【运动建议】以力量训练为主（每周3-4次），配合少量有氧运动，促进食欲但避免大量消耗。\n\n【生活方式】保证充足睡眠（7-9小时），少食多餐，每3-4小时进食一次。\n\n【医疗提示】若近期体重不明原因快速下降，或伴有疲劳、厌食等症状，建议就医排查。';
    } else if (bmi < 24) {
      status = '正常';
      statusClass = 'status-normal';
      advice = '恭喜！您的体重在健康范围内。请继续保持良好习惯，重点是维持体成分平衡。\n\n【饮食建议】均衡三大营养素，多吃蔬菜（每天500g以上）、水果（200-350g），控制添加糖（每天<25g）和盐（每天<5g）。\n\n【运动建议】每周至少150分钟中等强度有氧运动（快走、慢跑、游泳、骑行）或75分钟高强度有氧，每周2次力量训练保持肌肉量。\n\n【生活方式】定期监测体重（每周1次），每天饮水1.5-2升，管理压力避免情绪性进食。\n\n【医疗提示】即使BMI正常，如果腰围超标（男性≥90cm，女性≥85cm）或家族有慢性病史，仍需定期体检。';
    } else if (bmi < 28) {
      status = '超重';
      statusClass = 'status-overweight';
      advice = '您已进入超重范围，患高血压、糖尿病、高血脂的风险增加。减重5%-10%即可显著改善健康指标。\n\n【饮食建议】制造每日300-500千卡的热量缺口，主食一半换成粗粮（燕麦、糙米、玉米、杂豆），进食顺序：先喝汤→蔬菜→肉→主食，戒掉含糖饮料、油炸食品、糕点。\n\n【运动建议】有氧运动每周至少200-300分钟中等强度（如快走、椭圆机），高强度间歇训练（HIIT）每周2次，力量训练每周3次增加基础代谢。\n\n【生活方式】记录饮食日志提高自控力，睡够7小时（睡眠不足会降低代谢、增加饥饿感），设定阶梯目标：先减5%体重。\n\n【医疗提示】若伴有高血压、糖尿病、脂肪肝或睡眠呼吸暂停，强烈建议咨询医生或营养师，切勿自行极端节食。';
    } else {
      status = '肥胖';
      statusClass = 'status-obese';
      advice = '您的体重已达到肥胖标准，心血管疾病、2型糖尿病、关节损伤、某些癌症的风险显著升高。科学减重刻不容缓。\n\n【饮食建议】建议在专业指导下采用限能量平衡饮食（每日减少500-750千卡），严格限制高升糖指数食物（白面包、白米饭、糖），增加膳食纤维至每天30g以上（绿叶菜、魔芋、奇亚籽）。\n\n【运动建议】从低冲击运动开始（游泳、水中行走、固定单车、椭圆机）保护关节，初始每天20-30分钟，逐步增至60分钟，每周至少3-4次力量训练防止减重时肌肉丢失。\n\n【生活方式】联合行为疗法：记录体重、饮食、运动、情绪触发点，寻求家庭或社群支持，保证每晚7.5-8小时睡眠。\n\n【医疗提示】强烈建议前往医院营养科或内分泌科全面评估。若BMI≥32且伴有并发症，或BMI≥37.5，可咨询减重代谢手术可能性。切勿自行服用减肥药。';
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
    const rawTarget = String(this.data.targetBMI || '').trim();
    const target = rawTarget ? parseFloat(rawTarget) : DEFAULT_TARGET_BMI;
    const current = parseFloat(currentBMI);
    const heightCm = parseFloat(this.data.height);
    const weightKg = parseFloat(this.data.weight);

    // 增强验证：检查所有输入的有效性
    if (Number.isNaN(current) || Number.isNaN(heightCm) || Number.isNaN(weightKg)) {
      this.setData({ targetDiff: '' });
      return;
    }

    if (heightCm <= 0 || weightKg <= 0 || heightCm < 50 || heightCm > 300 || weightKg < 10 || weightKg > 500) {
      this.setData({ targetDiff: '' });
      return;
    }

    if (rawTarget && (Number.isNaN(target) || target <= 0 || target > 100)) {
      this.setData({ targetDiff: '请输入有效目标 BMI (10-50)' });
      return;
    }
    
    // 目标BMI合理性检查
    if (target < 10 || target > 50) {
      this.setData({ targetDiff: '目标 BMI 应在 10-50 之间' });
      return;
    }

    const diff = (current - target).toFixed(1);
    let diffText = '';
    const heightM = heightCm / 100;
    const targetWeight = target * heightM * heightM;
    
    if (Math.abs(diff) < 0.2) {
      diffText = '已达成目标';
    } else if (diff > 0) {
      const lose = Math.max(0, weightKg - targetWeight).toFixed(1);
      diffText = `高于目标 ${diff}，需减重约 ${lose}kg`;
    } else {
      const gain = Math.max(0, targetWeight - weightKg).toFixed(1);
      diffText = `低于目标 ${Math.abs(diff)}，可增重约 ${gain}kg`;
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
    const list = this.data.historyList.slice();
    list.splice(index, 1);
    this.setData({ historyList: list });
    wx.setStorageSync('bmi_history', list);
  },
  
  // 保存记录 (计算时已自动写入历史，此处仅提示)
  saveRecord() {
    if (!this.data.bmiResult) return;
    wx.showToast({ title: '已保存到历史记录', icon: 'success' });
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
    const title = this.data.bmiResult
      ? `我的BMI是${this.data.bmiResult}，你的呢？`
      : 'BMI健康计算器，来测测你的身体状态';
    return {
      title,
      path: '/pages/bmi/index'
    };
  }
})
