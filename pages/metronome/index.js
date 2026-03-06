const app = getApp();

Page({
  data: {
    // 核心状态
    bpm: 80,
    isPlaying: false,
    beatTypes: [
      { name: '2/4', desc: '进行曲', value: [2, 4] },
      { name: '3/4', desc: '华尔兹', value: [3, 4] },
      { name: '4/4', desc: '常用', value: [4, 4] }, 
      { name: '6/8', desc: '慢摇', value: [6, 8] },
      { name: '5/4', desc: '爵士', value: [5, 4] },
      { name: '7/8', desc: '复杂', value: [7, 8] }
    ],
    beatTypeIndex: 2, // 默认 4/4
    timeSignature: [4, 4],
    
    // 视觉状态
    currentBeatIndex: -1,
    visualMode: 'dot', // dot, line, number, none
    
    // 倒计时
    isCountingDown: false,
    countdownVal: 0,
    countdownSet: 0,
    
    // 自动停止定时器
    timerDuration: 0, // 分钟
    remainingSeconds: 0,
    formattedRemainingTime: '00:00:00', // 显示用
    customTimerLabel: '自定义', // 自定义按钮显示的格式化时间
    isTimerRunning: false,
    showTimerInput: false,
    tempTimer: '',

    // 设置
    showSettingsPanel: false,
    soundTypes: [
      { id: 'standard', name: '标准' },
      { id: 'electronic', name: '电子' },
      { id: 'wood', name: '木鱼' },
      { id: 'piano', name: '钢琴' },
      { id: 'drum', name: '鼓声' }
    ],
    soundType: 'standard',
    vibrateEnabled: false,
    screenOn: false,
    
    // 进阶
    gradientMode: false,
    gradientTargetBpm: 120,
    gradientDuration: 5, // 分钟
    presets: [{}, {}, {}], // 3个预设位
    
    // Modal
    showBpmInput: false,
    tempBpm: ''
  },

  // 音频上下文
  audioCtx: null,
  timerId: null,
  visualTimerIds: [], // 追踪所有视觉更新定时器
  nextNoteTime: 0,
  lookahead: 15.0, // 调度提前量 ms (更频繁的检查)
  scheduleAheadTime: 0.05, // 调度窗口 s (更短的预读，减少延迟积累)
  
  // 倒计时引用
  countdownTimer: null,
  stopTimer: null, // 自动停止的定时器引用

  onLoad() {
    this.initAudio();
    this.loadSettings();
    if (this.data.screenOn) {
      wx.setKeepScreenOn({ keepScreenOn: true });
    }
  },

  onUnload() {
    this.stop();
    if (this.data.audioCtx) {
      this.audioCtx.close();
    }
    this.saveSettings();
  },
  
  onHide() {
    if (this.data.isPlaying) {
      this.stop();
    }
  },

  initAudio() {
    if (wx.createWebAudioContext) {
      this.audioCtx = wx.createWebAudioContext();
    }
  },

  scheduler() {
    // 调试日志：检查调度循环是否正常运行
    // console.log('Scheduler running. Current time:', this.audioCtx.currentTime, 'Next note:', this.nextNoteTime);
    
    while (this.nextNoteTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
      // 核心修正：直接使用 audioBeatIndex 作为真理来源
      if (this.audioBeatIndex === undefined) {
        this.audioBeatIndex = 0;
      }

      this.scheduleNote(this.audioBeatIndex, this.nextNoteTime);
      this.nextNote();
    }
    this.timerId = setTimeout(() => this.scheduler(), this.lookahead);
  },

  nextNote() {
    const secondsPerBeat = 60.0 / this.data.bpm;
    this.nextNoteTime += secondsPerBeat;
    
    // 增加音频计数器
    this.audioBeatIndex++;
    
    // 获取当前拍号分子
    const numerator = (this.data.timeSignature && this.data.timeSignature[0]) ? this.data.timeSignature[0] : 4;
    
    if (this.audioBeatIndex >= numerator) {
      this.audioBeatIndex = 0;
    }
    
    // ... 渐变模式逻辑 ...
    if (this.data.gradientMode && this.gradientStartTime) {
      const elapsed = (Date.now() - this.gradientStartTime) / 1000 / 60;
      if (elapsed < this.data.gradientDuration) {
        const progress = elapsed / this.data.gradientDuration;
        const startBpm = this.gradientStartBpm;
        const targetBpm = parseInt(this.data.gradientTargetBpm);
        const newBpm = Math.floor(startBpm + (targetBpm - startBpm) * progress);
        if (newBpm !== this.data.bpm) {
           this.setData({ bpm: newBpm });
        }
      }
    }
  },

  getBeatStress(beatIndex, numerator) {
    // 0: 弱拍 (Weak)
    // 1: 次强拍 (Medium)
    // 2: 强拍 (Strong)
    
    // 确保 beatIndex 是数字类型，防止意外的类型转换问题
    beatIndex = Number(beatIndex);
    numerator = Number(numerator);

    if (beatIndex === 0) return 2; // 第一拍永远是强拍
    
    // 2/4拍: 强 弱
    if (numerator === 2) {
      return 0; // 剩下的都是弱拍
    }
    
    // 3/4拍: 强 弱 弱
    if (numerator === 3) {
      return 0; // 剩下的都是弱拍
    }
    
    // 4/4拍: 强 弱 次强 弱
    if (numerator === 4) {
      if (beatIndex === 2) return 1;
    } 
    
    // 5/4拍: 强 弱 弱 次强 弱 (3+2 模式)
    if (numerator === 5) {
      if (beatIndex === 3) return 1;
    }
    
    // 6/8拍: 强 弱 弱 次强 弱 弱 (2个附点四分音符)
    else if (numerator === 6) {
      if (beatIndex === 3) return 1;
    }
    
    // 7/8拍: 强 弱 弱 次强 弱 次强 弱 (3+2+2 模式)
    else if (numerator === 7) {
      if (beatIndex === 3 || beatIndex === 5) return 1;
    }
    
    return 0;
  },

  scheduleNote(beatNumber, time) {
    if (this.audioCtx) {
      // 必须从 this.data.timeSignature 获取分子，因为 numerator 可能未传递或为旧值
      const numerator = this.data.timeSignature[0] || 4;
      
      // 安全保护：确保 beatNumber 在 0 ~ numerator-1 之间
      // 即使 nextNote 逻辑出错，这里也能保证 rhythm pattern 正确
      const safeBeatNumber = beatNumber % numerator;

      const stressLevel = this.getBeatStress(safeBeatNumber, numerator);
      // stressLevel: 2=Strong, 1=Medium, 0=Weak

      // 调试日志：验证节奏逻辑 (开发者工具 Console 可见)
      // console.log(`[Metronome] Beat: ${safeBeatNumber}/${numerator}, Stress: ${stressLevel}, Time: ${time.toFixed(3)}`);

      const osc = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);
      
      let frequency = 800;
      let type = 'sine';
      let length = 0.05;
      let volume = 1.0;

      const currentSoundType = this.data.soundType || 'standard';

      // 差异化音色配置
      // 核心原则：第1拍 (stressLevel === 2) 必须使用与其他拍子完全不同的波形(type)，以实现音色区分
      switch (currentSoundType) {
        case 'electronic':
          // 电子: 使用标准音高，强拍锯齿波，次强拍和弱拍正弦波
          if (stressLevel === 2) {
          // 强拍: 高频尖锐
             type = 'sawtooth'; 
             frequency = 1500; 
             volume = 0.8; 
             length = 0.12;
          } else {
           // 次强拍和弱拍: 低频圆润
              type = 'sine'; 
              frequency = stressLevel === 1 ? 880 : 660; 
              volume = stressLevel === 1 ? 0.5 : 0.3; 
              length = 0.08; 
          }
          break;
          
        case 'wood':
          // 木鱼: 强拍方波(脆)，弱拍正弦(闷)
          if (stressLevel === 2) {
            type = 'square'; 
            frequency = 1200; 
            volume = 1.0; 
            length = 0.1;
          } else {
            type = 'sine'; 
            frequency = stressLevel === 1 ? 800 : 600; 
            volume = stressLevel === 1 ? 0.6 : 0.4;
            length = 0.05;
          }
          break;
          
        case 'piano':
          // 钢琴(模拟)
          if (stressLevel === 2) {
            type = 'sawtooth'; frequency = 1046.50; volume = 0.8; length = 0.2; // C6
          } else {
            type = 'triangle'; 
            frequency = stressLevel === 1 ? 523.25 : 261.63; // C5 / C4
            volume = stressLevel === 1 ? 0.5 : 0.3;
            length = 0.1;
          }
          break;
          
        case 'drum':
          // 鼓声
          if (stressLevel === 2) {
            type = 'triangle'; frequency = 100; length = 0.15; volume = 1.0; // 重底鼓
          } else {
            type = 'square'; 
            frequency = stressLevel === 1 ? 2000 : 4000; // 高频镲
            length = 0.03; 
            volume = stressLevel === 1 ? 0.2 : 0.05;
          }
          break;
          
        case 'standard':
        default:
          // 标准: 强拍极大差异化
          if (stressLevel === 2) {
            // 强拍: 极高频方波 "嘀!"
            type = 'square'; 
            frequency = 2000; 
            volume = 0.9; 
            length = 0.08;
          } else {
            // 弱拍: 中频正弦波 "嘟"
            type = 'sine'; 
            frequency = stressLevel === 1 ? 1000 : 800; 
            volume = stressLevel === 1 ? 0.5 : 0.3; 
            length = 0.05;
          }
          break;
      }
      
      osc.type = type;
      osc.frequency.value = frequency;
      
      // 音量包络
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(volume, time + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + length);
      
      osc.start(time);
      osc.stop(time + length + 0.1);
    }
    
    // 视觉同步的核心修正：
    // 我们不再依赖 setTimeout 来猜测时间，而是计算准确的剩余时间
    // 并且如果 delay 已经变成负数（说明声音已经响了或者马上要响），我们立刻更新 UI，不再等待
    // 此外，我们稍微 "提前" 一点点更新 UI (例如 30ms)，因为人眼对 "光先亮，声音后响" 的容忍度
    // 远高于 "声音先响，光后亮"（后者会感觉严重拖沓）
    
    let delay = (time - this.audioCtx.currentTime) * 1000;
    
    // 修正：恢复较为保守的提前量，避免过度提前导致看起来像上一拍
    // CSS transition 已移除，视觉响应变快了，所以不需要提前太多
    // -10ms 是为了抵消 setTimeout 本身的执行开销
    delay = delay - 10; 
    
    // 如果是第一拍(重拍)，为了抵消设备音频启动的延迟（往往比持续播放时要慢），
    // 我们可以给第一拍额外的视觉延迟补偿，或者不进行提前
    const numerator = this.data.timeSignature[0] || 4;
    if (beatNumber % numerator === 0) {
       // 这是一个 trick：强拍的视觉如果不提前，反而显得更“重”，
       // 配合音频的 Attack（起音），会感觉更准
       delay += 15; 
    }

    const visualTimerId = setTimeout(() => {
      // 清除已执行的 timerId
      this.visualTimerIds = this.visualTimerIds.filter(id => id !== visualTimerId);

      // 二次检查：由于调度有提前量，执行到这里时，用户可能已经切换了拍号
      // 必须确保 visualIndex 在当前 UI (timeSignature) 的范围内，否则会导致显示错乱或不显示
      const currentNumerator = this.data.timeSignature[0] || 4;
      const visualIndex = beatNumber % currentNumerator;

      this.setData({ currentBeatIndex: visualIndex });
      
      // 触觉反馈
      if (this.data.vibrateEnabled) {
        const stressLevel = this.getBeatStress(visualIndex, currentNumerator);
        
        if (stressLevel === 2) {
          wx.vibrateShort({ type: 'heavy' });
        } else if (stressLevel === 1) {
          wx.vibrateShort({ type: 'light' });
        }
      }
    }, Math.max(0, delay));

    this.visualTimerIds.push(visualTimerId);
  },

  togglePlay() {
    // 触觉反馈
    if (this.data.vibrateEnabled) {
       wx.vibrateShort({ type: 'light' });
    }

    if (this.data.isPlaying) {
      this.stop();
    } else {
      if (this.data.countdownSet > 0) {
        this.startCountdown();
      } else {
        this.start();
      }
    }
  },
  
  startCountdown() {
    this.setData({ isCountingDown: true, countdownVal: this.data.countdownSet });
    let count = this.data.countdownSet;
    const timer = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(timer);
        this.setData({ isCountingDown: false });
        this.start();
      } else {
        this.setData({ countdownVal: count });
      }
    }, 1000);
    this.countdownTimer = timer;
  },

  start() {
    if (!this.audioCtx) this.initAudio();
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    
    this.setData({ isPlaying: true });

    // 启动自动停止定时器
    if (this.data.timerDuration > 0) {
      this.startAutoStopTimer();
    }
    
    // 初始化音频计数器
    this.audioBeatIndex = 0;
    this.data.currentBeatIndex = 0; 
    
    this.nextNoteTime = this.audioCtx.currentTime + 0.1;
    
    if (this.data.gradientMode) {
      this.gradientStartTime = Date.now();
      this.gradientStartBpm = this.data.bpm;
    }
    
    this.scheduler();
  },

  stop() {
    this.setData({ isPlaying: false, currentBeatIndex: -1 });
    clearTimeout(this.timerId);
    
    // 清除所有未执行的视觉更新
    if (this.visualTimerIds) {
      this.visualTimerIds.forEach(id => clearTimeout(id));
      this.visualTimerIds = [];
    }

    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.setData({ isCountingDown: false });

    // 暂停/清除自动停止定时器
    if (this.stopTimer) {
      clearInterval(this.stopTimer);
      this.stopTimer = null;
    }
  },
  
  resetSettings() {
    if (this.data.vibrateEnabled) wx.vibrateShort({ type: 'light' });
    this.stop();
    this.setData({
      bpm: 80,
      beatTypeIndex: 2,
      timeSignature: [4, 4],
      soundType: 'standard',
      gradientMode: false
    });
  },

  showSettings() { this.setData({ showSettingsPanel: true }); },
  hideSettings() { this.setData({ showSettingsPanel: false }); },
  
  // BPM Adjustment Logic
  adjustBpm(delta) {
    let newBpm = this.data.bpm + delta;
    if (newBpm < 30) newBpm = 30;
    if (newBpm > 250) newBpm = 250;
    this.setData({ bpm: newBpm });
  },

  increaseBpm() {
    this.adjustBpm(1);
    if (this.data.vibrateEnabled) wx.vibrateShort({ type: 'light' });
  },

  decreaseBpm() {
    this.adjustBpm(-1);
    if (this.data.vibrateEnabled) wx.vibrateShort({ type: 'light' });
  },

  startIncrease() {
    this.stopAdjust();
    this.adjustTimer = setInterval(() => {
      this.adjustBpm(1);
      if (this.data.vibrateEnabled) wx.vibrateShort({ type: 'light' });
    }, 100);
  },

  startDecrease() {
    this.stopAdjust();
    this.adjustTimer = setInterval(() => {
      this.adjustBpm(-1);
      if (this.data.vibrateEnabled) wx.vibrateShort({ type: 'light' });
    }, 100);
  },

  stopAdjust() {
    if (this.adjustTimer) {
      clearInterval(this.adjustTimer);
      this.adjustTimer = null;
    }
  },

  // Auto Stop Timer Logic
  setTimer(e) {
    const val = e.currentTarget.dataset.val;
    const remainingSeconds = val * 60;
    this.setData({ 
      timerDuration: val,
      remainingSeconds: remainingSeconds,
      formattedRemainingTime: this.formatTime(remainingSeconds)
    });
    if (this.data.vibrateEnabled) wx.vibrateShort({ type: 'light' });
  },

  showCustomTimerInput() {
    this.setData({ showTimerInput: true, tempTimer: '' });
  },

  onTempTimerInput(e) {
    this.setData({ tempTimer: e.detail.value });
  },

  cancelTimerInput() {
    this.setData({ showTimerInput: false });
  },

  confirmTimerInput() {
    let val = parseInt(this.data.tempTimer);
    if (isNaN(val) || val <= 0 || val > 180) { // Limit to 180 mins
      wx.showToast({ title: '请输入1-180之间的分钟数', icon: 'none' });
      return;
    }
    const remainingSeconds = val * 60;
    this.setData({ 
      timerDuration: val, 
      remainingSeconds: remainingSeconds,
      formattedRemainingTime: this.formatTime(remainingSeconds),
      customTimerLabel: val + '分',
      showTimerInput: false 
    });
    if (this.data.vibrateEnabled) wx.vibrateShort({ type: 'light' });
  },

  startAutoStopTimer() {
    // If remainingSeconds is 0 (finished), reset it
    if (this.data.remainingSeconds <= 0) {
      const resetSeconds = this.data.timerDuration * 60;
      this.setData({ 
        remainingSeconds: resetSeconds,
        formattedRemainingTime: this.formatTime(resetSeconds)
      });
    }

    this.stopTimer = setInterval(() => {
      if (this.data.remainingSeconds > 0) {
        const newRemaining = this.data.remainingSeconds - 1;
        this.setData({ 
          remainingSeconds: newRemaining,
          formattedRemainingTime: this.formatTime(newRemaining)
        });
      } else {
        // Time's up
        this.stop();
        // Reset timer for next use
        const resetSeconds = this.data.timerDuration * 60;
        this.setData({ 
          remainingSeconds: resetSeconds,
          formattedRemainingTime: this.formatTime(resetSeconds)
        });
        if (this.data.vibrateEnabled) wx.vibrateLong(); // Notify user
      }
    }, 1000);
  },

  formatTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    // 强制显示 HH:MM:SS，例如 5分钟 -> 00:05:00
    const hStr = h.toString().padStart(2, '0');
    const mStr = m.toString().padStart(2, '0');
    const sStr = s.toString().padStart(2, '0');
    
    return `${hStr}:${mStr}:${sStr}`;
  },

  onBpmChange(e) { this.setData({ bpm: e.detail.value }); },
  onBpmChanging(e) { this.setData({ bpm: e.detail.value }); },
  
  toggleBpmInput() { this.setData({ showBpmInput: true, tempBpm: this.data.bpm }); },
  onTempBpmInput(e) { this.setData({ tempBpm: e.detail.value }); },
  cancelBpmInput() { this.setData({ showBpmInput: false }); },
  confirmBpmInput() {
    let val = parseInt(this.data.tempBpm);
    if (isNaN(val) || val < 30 || val > 250) {
      wx.showToast({ title: '请输入30-250之间的整数', icon: 'none' });
      return;
    }
    this.setData({ bpm: val, showBpmInput: false });
  },

  setBeatType(e) {
    if (this.data.vibrateEnabled) wx.vibrateShort({ type: 'light' });
    const index = e.currentTarget.dataset.index;
    const item = this.data.beatTypes[index];
    
    // 切换节拍时，如果正在播放，先停止，切换后再启动
    // 这样可以彻底清除旧的调度队列，保证新节拍从头开始且同步
    const wasPlaying = this.data.isPlaying;
    
    if (wasPlaying) {
      this.stop();
    }

    this.setData({ 
      beatTypeIndex: index,
      timeSignature: item.value,
      currentBeatIndex: 0 // 立即重置视觉
    });
    
    if (wasPlaying) {
      // 稍微延迟启动，给 UI 渲染和状态更新一点缓冲时间
      setTimeout(() => {
        this.start();
      }, 50);
    }
  },

  setSoundType(e) { this.setData({ soundType: e.currentTarget.dataset.id }); },
  setVisualMode(e) { this.setData({ visualMode: e.currentTarget.dataset.mode }); },
  setCountdown(e) { this.setData({ countdownSet: e.currentTarget.dataset.val }); },
  
  toggleVibrate(e) { 
    this.setData({ vibrateEnabled: e.detail.value }); 
    if (e.detail.value) wx.vibrateShort({ type: 'light' });
  },
  toggleScreenOn(e) { 
    const val = e.detail.value;
    this.setData({ screenOn: val });
    wx.setKeepScreenOn({ keepScreenOn: val });
  },
  
  toggleGradientMode(e) { this.setData({ gradientMode: e.detail.value }); },

  loadPreset(e) {
    const index = e.currentTarget.dataset.index;
    const preset = this.data.presets[index];
    if (preset && preset.bpm) {
      if (this.data.vibrateEnabled) wx.vibrateShort({ type: 'light' });
      this.stop();
      this.setData({
        bpm: preset.bpm,
        beatTypeIndex: preset.beatTypeIndex,
        timeSignature: preset.timeSignature,
        soundType: preset.soundType || 'standard'
      });
      wx.showToast({ title: '已加载' });
    } else {
      wx.showToast({ title: '长按保存', icon: 'none' });
    }
  },
  
  savePreset(e) {
    const index = e.currentTarget.dataset.index;
    const newPreset = {
      name: `预设${index+1}`,
      bpm: this.data.bpm,
      beatTypeIndex: this.data.beatTypeIndex,
      beatName: this.data.beatTypes[this.data.beatTypeIndex].name,
      timeSignature: this.data.timeSignature,
      soundType: this.data.soundType
    };
    
    const presets = this.data.presets;
    presets[index] = newPreset;
    this.setData({ presets });
    
    wx.setStorageSync('metronome_presets', presets);
    if (this.data.vibrateEnabled) wx.vibrateShort({ type: 'heavy' });
    wx.showToast({ title: '保存成功' });
  },

  saveSettings() {
    wx.setStorageSync('metronome_settings', {
      bpm: this.data.bpm,
      beatTypeIndex: this.data.beatTypeIndex,
      soundType: this.data.soundType,
      visualMode: this.data.visualMode,
      countdownSet: this.data.countdownSet,
      timerDuration: this.data.timerDuration, // Save timer setting
      vibrateEnabled: this.data.vibrateEnabled,
      screenOn: this.data.screenOn
    });
  },
  
  loadSettings() {
    const settings = wx.getStorageSync('metronome_settings');
    const presets = wx.getStorageSync('metronome_presets');
    if (settings) {
      const duration = settings.timerDuration !== undefined ? settings.timerDuration : 0;
      const remaining = duration * 60;
      
      this.setData({
        bpm: settings.bpm || 80,
        beatTypeIndex: settings.beatTypeIndex !== undefined ? settings.beatTypeIndex : 2,
        timeSignature: this.data.beatTypes[settings.beatTypeIndex !== undefined ? settings.beatTypeIndex : 2].value,
        soundType: settings.soundType || 'standard',
        visualMode: settings.visualMode || 'dot',
        countdownSet: settings.countdownSet !== undefined ? settings.countdownSet : 0,
        timerDuration: duration,
        remainingSeconds: remaining,
        formattedRemainingTime: this.formatTime(remaining),
        customTimerLabel: duration + '分',
        vibrateEnabled: settings.vibrateEnabled || false,
        screenOn: settings.screenOn || false
      });
    }
    if (presets) {
      this.setData({ presets });
    }
  },
  
  onTapBlank(e) {
    // 
  },
  
  onLongPress() {
    // 
  }
});