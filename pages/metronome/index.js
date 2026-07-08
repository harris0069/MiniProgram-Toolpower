const app = getApp();

Page({
  data: {
    // Core state
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
    
    // Visual state
    currentBeatIndex: -1,
    visualMode: 'dot', // dot, line, number, none
    
    // Countdown state
    isCountingDown: false,
    countdownVal: 0,
    countdownSet: 0,
    
    // Auto-stop timer
    timerDuration: 0, // 分钟
    remainingSeconds: 0,
    formattedRemainingTime: '00:00:00', // Display string
    customTimerLabel: '\u81ea\u5b9a\u4e49', // Custom timer chip label
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
    tempBpm: '',
    
    // 音频模式
    useFallbackAudio: false
  },

  // Audio scheduling state
  audioCtx: null,
  timerId: null,
  visualTimerIds: [], // 追踪所有视觉更新定时器
  nextNoteTime: 0,
  lookahead: 15.0, // Scheduler polling interval in ms
  scheduleAheadTime: 0.05, // Audio scheduling window in seconds
  
  // Timer handles
  countdownTimer: null,
  stopTimer: null, // 自动停止的定时器引用

  onLoad() {
    console.log('[Metronome] Page loading, wx version:', wx.getSystemInfoSync().version);
    
    this.loadSettings();
    
    // 标记用户未交互和音频未初始化
    this.userInteracted = false;
    this.audioInitialized = false;
    this.audioTestCount = 0; // 记录测试次数
    
    // 检查音频权限
    this.checkAudioPermission();
    
    // 检查微信版本兼容性
    this.checkWechatCompatibility();
    
    console.log('[Metronome] Page loaded, audio will be initialized on first user interaction');
  },
  
  // 检查音频权限
  checkAudioPermission() {
    wx.getSetting({
      success: (res) => {
        console.log('[Metronome] Current permissions:', res.authSetting);
        
        // 检查是否有录音权限（音频播放通常需要）
        if (res.authSetting['scope.record'] === false) {
          console.warn('[Metronome] Audio permission denied');
          wx.showModal({
            title: '需要音频权限',
            content: '节拍器需要音频权限才能正常工作，请在设置中开启',
            confirmText: '去设置',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.openSetting();
              }
            }
          });
        }
      }
    });
  },

  // 测试音频功能
  testAudio() {
    this.audioTestCount++;
    console.log('[Metronome] Testing audio, attempt:', this.audioTestCount);
    
    // 如果音频还没有初始化，先初始化
    if (!this.audioCtx && !this.useFallbackAudio) {
      console.log('[Metronome] First interaction via test, initializing audio...');
      
      wx.showLoading({
        title: '初始化音频...',
        mask: true
      });
      
      this.initAudioOnFirstInteraction().then((success) => {
        wx.hideLoading();
        
        // 初始化完成后执行测试
        this.doTestAudio();
      });
      
      return;
    }
    
    // 音频已初始化，直接测试
    this.doTestAudio();
  },
  
  doTestAudio() {
    if (!this.audioCtx && !this.useFallbackAudio) {
      console.error('[Metronome] No audio context for test');
      wx.showModal({
        title: '音频未初始化',
        content: '音频上下文未创建，正在重新初始化...',
        showCancel: false,
        success: () => {
          this.initAudioOnFirstInteraction().then(() => {
            if (this.audioTestCount < 3) { // 避免无限递归
              this.testAudio();
            }
          });
        }
      });
      return;
    }
    
    console.log('[Metronome] Audio context state before test:', this.audioCtx ? this.audioCtx.state : 'fallback mode');
    
    // 如果使用备用方案，直接测试震动
    if (this.useFallbackAudio) {
      this.playTestBeep();
      return;
    }
    
    // 恢复音频上下文
    if (this.audioCtx.state === 'suspended') {
      console.log('[Metronome] Resuming suspended audio context...');
      this.audioCtx.resume().then(() => {
        console.log('[Metronome] Audio context resumed for test, new state:', this.audioCtx.state);
        this.playTestBeep();
      }).catch(err => {
        console.error('[Metronome] Failed to resume audio for test:', err);
        this.showAudioError('恢复音频上下文失败', err);
      });
    } else if (this.audioCtx.state === 'running') {
      console.log('[Metronome] Audio context already running, playing test beep');
      this.playTestBeep();
    } else {
      console.warn('[Metronome] Unexpected audio context state:', this.audioCtx.state);
      this.showAudioError('音频上下文状态异常', { state: this.audioCtx.state });
    }
  },
  
  // 强制尝试修复音频
  forceFixAudio() {
    console.log('[Metronome] User requested force audio fix...');
    
    wx.showLoading({
      title: '正在修复音频...',
      mask: true
    });
    
    // 重置所有状态
    this.audioInitialized = false;
    this.useFallbackAudio = false;
    
    // 如果已有音频上下文，先关闭
    if (this.audioCtx) {
      try {
        if (this.audioCtx.close) {
          this.audioCtx.close();
        }
      } catch (e) {
        console.log('[Metronome] Error closing existing context:', e);
      }
      this.audioCtx = null;
    }
    
    // 强制重新初始化
    setTimeout(() => {
      try {
        console.log('[Metronome] Force recreating audio context...');
        this.audioCtx = wx.createWebAudioContext();
        
        if (!this.audioCtx) {
          throw new Error('Failed to create new audio context');
        }
        
        console.log('[Metronome] New audio context created, state:', this.audioCtx.state);
        
        // 如果是 default 状态，立即开始修复
        if (this.audioCtx.state === 'default') {
          this.forceFixDefaultState().then((success) => {
            wx.hideLoading();
            this.handleFixResult(success);
          });
        } else if (this.audioCtx.state === 'suspended') {
          // 尝试恢复
          this.audioCtx.resume().then(() => {
            wx.hideLoading();
            this.handleFixResult(true);
          }).catch(() => {
            wx.hideLoading();
            this.handleFixResult(false);
          });
        } else if (this.audioCtx.state === 'running') {
          wx.hideLoading();
          this.handleFixResult(true);
        } else {
          wx.hideLoading();
          this.handleFixResult(false);
        }
        
      } catch (error) {
        console.error('[Metronome] Force fix failed:', error);
        wx.hideLoading();
        this.handleFixResult(false);
      }
    }, 100);
  },
  
  // 处理修复结果
  handleFixResult(success) {
    if (success && this.audioCtx && this.audioCtx.state === 'running') {
      this.audioInitialized = true;
      wx.showModal({
        title: '修复成功！',
        content: `音频已成功修复！\n\n当前状态：${this.audioCtx.state}\n采样率：${this.audioCtx.sampleRate}Hz\n\n现在可以正常使用音频节拍了！`,
        confirmText: '测试音频',
        cancelText: '开始使用',
        success: (res) => {
          if (res.confirm) {
            this.testAudio();
          }
        }
      });
    } else {
      wx.showModal({
        title: '修复失败',
        content: `无法修复音频问题。\n\n当前状态：${this.audioCtx ? this.audioCtx.state : '无'}\n\n这可能是微信小程序的系统级限制。建议：\n1. 重启微信应用\n2. 重启设备\n3. 更新微信版本`,
        confirmText: '重试',
        cancelText: '放弃',
        success: (res) => {
          if (res.confirm) {
            // 再次尝试修复
            setTimeout(() => {
              this.forceFixAudio();
            }, 500);
          }
        }
      });
    }
  },

  // 诊断音频支持情况
  diagnoseAudioSupport() {
    console.log('[Metronome] Starting audio support diagnosis...');
    
    const diagnosis = {
      timestamp: new Date().toISOString(),
      systemInfo: {},
      webAudioSupport: {},
      recommendations: []
    };
    
    try {
      // 1. 系统信息
      const systemInfo = wx.getSystemInfoSync();
      diagnosis.systemInfo = {
        platform: systemInfo.platform,
        system: systemInfo.system,
        version: systemInfo.version,
        SDKVersion: systemInfo.SDKVersion,
        model: systemInfo.model,
        brand: systemInfo.brand
      };
      
      // 2. WebAudio API 检查
      diagnosis.webAudioSupport.apiExists = !!wx.createWebAudioContext;
      
      if (wx.createWebAudioContext) {
        try {
          const testCtx = wx.createWebAudioContext();
          diagnosis.webAudioSupport.contextCreated = !!testCtx;
          
          if (testCtx) {
            diagnosis.webAudioSupport.contextState = testCtx.state;
            diagnosis.webAudioSupport.sampleRate = testCtx.sampleRate;
            
            // 测试节点创建
            try {
              const osc = testCtx.createOscillator();
              const gain = testCtx.createGain();
              diagnosis.webAudioSupport.nodeCreation = true;
              osc.disconnect();
              gain.disconnect();
            } catch (nodeError) {
              diagnosis.webAudioSupport.nodeCreation = false;
              diagnosis.webAudioSupport.nodeError = nodeError.message;
            }
          }
        } catch (ctxError) {
          diagnosis.webAudioSupport.contextCreated = false;
          diagnosis.webAudioSupport.contextError = ctxError.message;
        }
      }
      
      // 3. 生成建议
      if (!diagnosis.webAudioSupport.apiExists) {
        diagnosis.recommendations.push('微信版本过低');
      } else if (!diagnosis.webAudioSupport.contextCreated) {
        diagnosis.recommendations.push('音频上下文创建失败');
      } else if (diagnosis.webAudioSupport.contextState === 'default') {
        diagnosis.recommendations.push('音频状态异常');
      } else {
        diagnosis.recommendations.push('应该支持，可能是临时问题');
      }
      
    } catch (error) {
      diagnosis.error = error.message;
    }
    
    console.log('[Metronome] Diagnosis:', diagnosis);
    
    // 显示结果
    const resultText = `设备：${diagnosis.systemInfo.model}
系统：${diagnosis.systemInfo.system}
微信：${diagnosis.systemInfo.version}
基础库：${diagnosis.systemInfo.SDKVersion}

WebAudio API：${diagnosis.webAudioSupport.apiExists ? '✅' : '❌'}
上下文创建：${diagnosis.webAudioSupport.contextCreated ? '✅' : '❌'}
状态：${diagnosis.webAudioSupport.contextState || '未知'}

建议：${diagnosis.recommendations.join('；')}`;
    
    wx.showModal({
      title: '音频诊断结果',
      content: resultText,
      showCancel: false
    });
  },

  // 显示音频错误信息
  showAudioError(title, error) {
    const errorMsg = error ? (error.message || JSON.stringify(error)) : '未知错误';
    console.error('[Metronome] Audio error:', title, errorMsg);
    
    // 检查是否是状态异常错误
    if (errorMsg.includes('default') || errorMsg.includes('状态异常')) {
      wx.showModal({
        title: '音频上下文异常',
        content: '检测到音频系统异常，已自动切换到震动模式。\n\n震动模式同样可以提供准确的节拍反馈。',
        confirmText: '继续使用',
        showCancel: false,
        success: () => {
          // 强制切换到备用方案
          this.initFallbackAudio();
        }
      });
    } else {
      wx.showModal({
        title: title,
        content: `错误详情：${errorMsg}\n\n建议解决方案：\n1. 点击"测试音频"按钮\n2. 检查设备音量\n3. 重启小程序\n4. 更新微信版本`,
        confirmText: '测试音频',
        cancelText: '使用震动',
        success: (res) => {
          if (res.confirm) {
            this.testAudio();
          } else {
            this.initFallbackAudio();
          }
        }
      });
    }
  },
  
  playTestBeep() {
    try {
      // 如果使用备用音频方案
      if (this.useFallbackAudio) {
        console.log('[Metronome] Testing fallback audio (vibration)');
        
        // 播放一个明显的测试震动序列
        wx.showToast({
          title: '震动测试中...',
          icon: 'loading',
          duration: 2000
        });
        
        // 测试序列：长-短-长，让用户清楚感受到震动
        wx.vibrateLong();
        setTimeout(() => {
          wx.vibrateShort({ type: 'heavy' });
        }, 300);
        setTimeout(() => {
          wx.vibrateLong();
        }, 600);
        
        setTimeout(() => {
          wx.showToast({
            title: '震动测试成功！',
            icon: 'success'
          });
        }, 1000);
        
        this.audioInitialized = true;
        return;
      }
      
      if (!this.audioCtx) {
        throw new Error('音频上下文未创建');
      }
      
      console.log('[Metronome] Playing test beep, audio state:', this.audioCtx.state);
      console.log('[Metronome] Audio context sample rate:', this.audioCtx.sampleRate);
      console.log('[Metronome] Audio context current time:', this.audioCtx.currentTime);
      
      // 检查状态是否有效
      const validStates = ['suspended', 'running'];
      if (!validStates.includes(this.audioCtx.state)) {
        throw new Error(`音频上下文状态异常: ${this.audioCtx.state}`);
      }
      
      if (this.audioCtx.state !== 'running') {
        throw new Error(`音频上下文未运行: ${this.audioCtx.state}`);
      }
      
      const osc = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();
      
      if (!osc || !gainNode) {
        throw new Error('无法创建音频节点');
      }
      
      osc.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);
      
      osc.type = 'square';
      osc.frequency.value = 1000;
      
      const now = this.audioCtx.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.5, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      
      console.log('[Metronome] Starting test beep at time:', now);
      osc.start(now);
      osc.stop(now + 0.3);
      
      // 监听音频节点事件
      osc.onended = () => {
        console.log('[Metronome] Test beep ended successfully');
      };
      
      wx.showToast({
        title: '音频测试成功',
        icon: 'success'
      });
      
      // 标记音频已初始化
      this.audioInitialized = true;
      console.log('[Metronome] Test beep scheduled successfully');
      
    } catch (error) {
      console.error('[Metronome] Test beep failed:', error);
      
      // 如果是状态异常，自动切换到备用方案
      if (error.message && error.message.includes('状态异常')) {
        console.log('[Metronome] Switching to fallback audio due to state error');
        this.initFallbackAudio();
        // 重新测试备用方案
        setTimeout(() => {
          this.playTestBeep();
        }, 500);
      } else {
        this.showAudioError('播放测试音频失败', error);
      }
    }
  },
  // 设置用户交互监听（已移除，改为按需初始化）

  // 检查微信版本兼容性
  checkWechatCompatibility() {
    try {
      const systemInfo = wx.getSystemInfoSync();
      console.log('[Metronome] System info:', {
        platform: systemInfo.platform,
        version: systemInfo.version,
        SDKVersion: systemInfo.SDKVersion
      });
      
      // 检查基础库版本
      const sdkVersion = systemInfo.SDKVersion;
      const minVersion = '2.19.0';
      
      if (this.compareVersion(sdkVersion, minVersion) < 0) {
        console.warn('[Metronome] SDK version too low:', sdkVersion, 'required:', minVersion);
        wx.showModal({
          title: '版本过低',
          content: `当前微信版本过低，可能影响音频功能。\n\n当前版本：${sdkVersion}\n建议版本：${minVersion}以上`,
          showCancel: false
        });
      }
    } catch (error) {
      console.error('[Metronome] Failed to check compatibility:', error);
    }
  },
  
  // 版本比较工具
  compareVersion(v1, v2) {
    const arr1 = v1.split('.');
    const arr2 = v2.split('.');
    const len = Math.max(arr1.length, arr2.length);
    
    for (let i = 0; i < len; i++) {
      const num1 = parseInt(arr1[i] || '0');
      const num2 = parseInt(arr2[i] || '0');
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  },

  // 检查音频状态并尝试修复
  checkAndFixAudio() {
    if (!this.audioCtx) {
      console.log('[Metronome] Audio context missing, reinitializing...');
      this.initAudio();
      return false;
    }
    
    console.log('[Metronome] Audio context state:', this.audioCtx.state);
    
    // 检查状态是否有效
    const validStates = ['suspended', 'running', 'closed'];
    if (!validStates.includes(this.audioCtx.state)) {
      console.warn('[Metronome] Invalid audio context state detected:', this.audioCtx.state);
      this.initFallbackAudio();
      return false;
    }
    
    if (this.audioCtx.state === 'suspended') {
      console.log('[Metronome] Audio context suspended, attempting resume...');
      this.audioCtx.resume().catch(err => {
        console.error('[Metronome] Failed to resume audio:', err);
        this.initFallbackAudio();
      });
      return false;
    }
    
    if (this.audioCtx.state === 'running') {
      this.audioInitialized = true;
      return true;
    }
    
    return false;
  },

  onShow() {
    if (this.data.screenOn) {
      wx.setKeepScreenOn({ keepScreenOn: true });
    }
    
    // 页面显示时不自动初始化音频，等待用户交互
    console.log('[Metronome] Page shown, audio context will be created on user interaction');
  },

  onUnload() {
    this.stop();
    if (this.data.screenOn) {
      wx.setKeepScreenOn({ keepScreenOn: false });
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
    this.saveSettings();
  },
  
  onHide() {
    this.stop();
    if (this.data.screenOn) {
      wx.setKeepScreenOn({ keepScreenOn: false });
    }
    this.saveSettings();
  },

  // 在用户第一次交互时初始化音频
  initAudioOnFirstInteraction() {
    if (this.audioCtx) {
      // 音频上下文已存在，检查状态
      if (this.audioCtx.state === 'running') {
        return Promise.resolve(true);
      } else if (this.audioCtx.state === 'default') {
        // 尝试修复 default 状态
        return this.forceFixDefaultState();
      } else if (this.audioCtx.state === 'suspended') {
        // 尝试恢复 suspended 状态
        return this.audioCtx.resume().then(() => true).catch(() => false);
      }
    }
    
    console.log('[Metronome] Initializing audio on first user interaction...');
    this.userInteracted = true;
    
    return new Promise((resolve) => {
      try {
        this.initAudio();
        
        // 给音频上下文时间来初始化
        setTimeout(() => {
          if (this.audioCtx.state === 'running') {
            console.log('[Metronome] Audio initialized successfully');
            resolve(true);
          } else if (this.audioCtx.state === 'suspended') {
            // 尝试恢复
            this.audioCtx.resume().then(() => {
              console.log('[Metronome] Audio context resumed');
              resolve(true);
            }).catch(() => {
              console.log('[Metronome] Failed to resume');
              resolve(false);
            });
          } else if (this.audioCtx.state === 'default') {
            // 尝试修复 default 状态
            this.forceFixDefaultState().then(resolve);
          } else {
            console.log('[Metronome] Unexpected state:', this.audioCtx.state);
            resolve(false);
          }
        }, 100);
        
      } catch (error) {
        console.error('[Metronome] Audio init failed:', error);
        resolve(false);
      }
    });
  },
  
  // 强力修复 default 状态
  forceFixDefaultState() {
    console.log('[Metronome] Force fixing default state...');
    
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 5;
      
      const tryFix = () => {
        attempts++;
        console.log(`[Metronome] Fix attempt ${attempts}/${maxAttempts}`);
        
        if (this.audioCtx.state === 'running') {
          console.log('[Metronome] State fixed! Now running');
          resolve(true);
          return;
        }
        
        if (attempts >= maxAttempts) {
          console.log('[Metronome] Max attempts reached, giving up');
          resolve(false);
          return;
        }
        
        // 尝试不同的修复方法
        switch (attempts) {
          case 1:
            // 方法1: 直接 resume
            if (this.audioCtx.resume) {
              this.audioCtx.resume().then(() => {
                setTimeout(tryFix, 100);
              }).catch(() => {
                setTimeout(tryFix, 100);
              });
            } else {
              setTimeout(tryFix, 100);
            }
            break;
            
          case 2:
            // 方法2: 创建并播放静音音频
            try {
              const osc = this.audioCtx.createOscillator();
              const gain = this.audioCtx.createGain();
              
              osc.connect(gain);
              gain.connect(this.audioCtx.destination);
              
              gain.gain.setValueAtTime(0.001, this.audioCtx.currentTime);
              osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
              
              const now = this.audioCtx.currentTime;
              osc.start(now);
              osc.stop(now + 0.1);
              
              setTimeout(tryFix, 200);
            } catch (e) {
              setTimeout(tryFix, 100);
            }
            break;
            
          case 3:
            // 方法3: suspend 然后 resume
            try {
              if (this.audioCtx.suspend) {
                this.audioCtx.suspend().then(() => {
                  return this.audioCtx.resume();
                }).then(() => {
                  setTimeout(tryFix, 100);
                }).catch(() => {
                  setTimeout(tryFix, 100);
                });
              } else {
                setTimeout(tryFix, 100);
              }
            } catch (e) {
              setTimeout(tryFix, 100);
            }
            break;
            
          case 4:
            // 方法4: 重新创建音频上下文
            try {
              if (this.audioCtx.close) {
                this.audioCtx.close();
              }
              this.audioCtx = wx.createWebAudioContext();
              console.log('[Metronome] Recreated audio context, new state:', this.audioCtx.state);
              setTimeout(tryFix, 100);
            } catch (e) {
              setTimeout(tryFix, 100);
            }
            break;
            
          default:
            // 方法5: 最后尝试
            setTimeout(tryFix, 100);
        }
      };
      
      tryFix();
    });
  },

  initAudio() {
    try {
      console.log('[Metronome] Initializing audio context...');
      
      // 获取系统信息进行详细诊断
      const systemInfo = wx.getSystemInfoSync();
      console.log('[Metronome] System Info:', {
        platform: systemInfo.platform,
        system: systemInfo.system,
        version: systemInfo.version,
        SDKVersion: systemInfo.SDKVersion,
        model: systemInfo.model,
        brand: systemInfo.brand
      });
      
      // 检查是否支持 WebAudioContext
      if (!wx.createWebAudioContext) {
        console.error('[Metronome] wx.createWebAudioContext not available');
        throw new Error('WebAudioContext API not available');
      }
      
      console.log('[Metronome] wx.createWebAudioContext is available');
      
      // 尝试创建音频上下文
      console.log('[Metronome] Attempting to create WebAudioContext...');
      this.audioCtx = wx.createWebAudioContext();
      
      if (!this.audioCtx) {
        console.error('[Metronome] wx.createWebAudioContext returned null/undefined');
        throw new Error('Failed to create WebAudioContext');
      }
      
      console.log('[Metronome] Audio context created successfully');
      console.log('[Metronome] Initial state:', this.audioCtx.state);
      
      // 如果状态是 "default"，立即尝试修复
      if (this.audioCtx.state === 'default') {
        console.log('[Metronome] Detected default state, attempting immediate fix...');
        this.fixDefaultState();
      }
      
      // 监听音频上下文状态变化
      this.audioCtx.onstatechange = () => {
        console.log('[Metronome] Audio context state changed to:', this.audioCtx.state);
        
        if (this.audioCtx.state === 'running') {
          this.audioInitialized = true;
          console.log('[Metronome] Audio fully initialized and running');
        }
      };
      
      console.log('[Metronome] Audio initialization completed');
      
    } catch (error) {
      console.error('[Metronome] Failed to create audio context:', error);
      throw error; // 重新抛出错误，不自动降级
    }
  },
  
  // 修复 "default" 状态
  fixDefaultState() {
    console.log('[Metronome] Attempting to fix default state...');
    
    // 方法1: 强制设置状态（如果可能）
    try {
      if (this.audioCtx.resume) {
        console.log('[Metronome] Trying resume()...');
        this.audioCtx.resume().then(() => {
          console.log('[Metronome] Resume completed, new state:', this.audioCtx.state);
        }).catch(err => {
          console.log('[Metronome] Resume failed:', err);
        });
      }
    } catch (e) {
      console.log('[Metronome] Resume method failed:', e);
    }
    
    // 方法2: 创建并连接音频节点来激活上下文
    try {
      console.log('[Metronome] Creating activation nodes...');
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      // 连接节点
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      
      // 设置为静音但仍然激活
      gain.gain.setValueAtTime(0.001, this.audioCtx.currentTime);
      osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
      
      // 播放极短时间来激活上下文
      const now = this.audioCtx.currentTime;
      osc.start(now);
      osc.stop(now + 0.01);
      
      console.log('[Metronome] Activation nodes created and started');
      
      // 检查状态变化
      setTimeout(() => {
        console.log('[Metronome] State after activation attempt:', this.audioCtx.state);
      }, 100);
      
    } catch (e) {
      console.error('[Metronome] Node activation failed:', e);
    }
    
    // 方法3: 如果有 suspend/resume 循环
    setTimeout(() => {
      if (this.audioCtx.state === 'default') {
        try {
          console.log('[Metronome] Trying suspend/resume cycle...');
          if (this.audioCtx.suspend && this.audioCtx.resume) {
            this.audioCtx.suspend().then(() => {
              console.log('[Metronome] Suspended, now resuming...');
              return this.audioCtx.resume();
            }).then(() => {
              console.log('[Metronome] Resume cycle completed, state:', this.audioCtx.state);
            }).catch(err => {
              console.log('[Metronome] Suspend/resume cycle failed:', err);
            });
          }
        } catch (e) {
          console.log('[Metronome] Suspend/resume cycle error:', e);
        }
      }
    }, 200);
  },
  
  // 备用音频方案（使用预录制的音频文件）
  initFallbackAudio() {
    console.log('[Metronome] Initializing fallback audio...');
    
    try {
      // 标记使用备用方案
      this.useFallbackAudio = true;
      this.audioInitialized = true;
      
      // 更新界面状态
      this.setData({
        useFallbackAudio: true
      });
      
      console.log('[Metronome] Fallback audio initialized');
      
      wx.showModal({
        title: '节拍器模式',
        content: '已切换到震动节拍模式！\n\n✅ 所有功能正常可用\n✅ 通过震动提供节拍反馈\n✅ 强拍、弱拍有不同震动\n\n震动模式同样准确可靠！',
        confirmText: '开始使用',
        showCancel: false
      });
      
    } catch (error) {
      console.error('[Metronome] Fallback audio init failed:', error);
      wx.showModal({
        title: '节拍器可用',
        content: '将使用视觉节拍指示模式。\n\n✅ 节拍器功能完全可用\n✅ 通过屏幕闪烁提供节拍反馈\n✅ 建议开启震动反馈增强体验',
        confirmText: '继续使用',
        showCancel: false
      });
    }
  },

  scheduler() {
    // Debug only:
    // console.log('Scheduler running. Current time:', this.audioCtx.currentTime, 'Next note:', this.nextNoteTime);
    
    while (this.nextNoteTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
      // Keep audioBeatIndex as the source of truth for scheduling.
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
    
    // Advance the beat cursor.
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
    // 1: medium beat
    // 2: 强拍 (Strong)
    
    // Normalize inputs to avoid accidental type coercion.
    beatIndex = Number(beatIndex);
    numerator = Number(numerator);

    // 边界检查：确保 beatIndex 在有效范围内
    if (beatIndex < 0 || beatIndex >= numerator) {
      beatIndex = beatIndex % numerator;
      if (beatIndex < 0) beatIndex += numerator;
    }

    if (beatIndex === 0) return 2; // 第一拍永远是强拍
    
    // 2/4: strong, weak
    if (numerator === 2) {
      return 0; // Remaining beats are weak.
    }
    
    // 3/4: strong, weak, weak
    if (numerator === 3) {
      return 0; // Remaining beats are weak.
    }
    
    // 4/4: strong, weak, medium, weak
    if (numerator === 4) {
      if (beatIndex === 2) return 1;
    } 
    
    // 5/4 grouped as 3+2.
    if (numerator === 5) {
      if (beatIndex === 3) return 1;
    }

    // 6/8 grouped as two dotted-quarter pulses.
    if (numerator === 6) {
      if (beatIndex === 3) return 1;
    }
    
    // 7/8 grouped as 3+2+2.
    if (numerator === 7) {
      if (beatIndex === 3 || beatIndex === 5) return 1;
    }
    
    return 0;
  },

  scheduleNote(beatNumber, time) {
    // 如果使用备用音频方案
    if (this.useFallbackAudio) {
      this.playFallbackBeep(beatNumber);
      return;
    }
    
    if (!this.audioCtx) {
      console.error('[Metronome] Audio context not available in scheduleNote');
      return;
    }
    
    // 检查音频上下文状态
    const validStates = ['running'];
    if (!validStates.includes(this.audioCtx.state)) {
      console.warn('[Metronome] Audio context not in valid state for playback:', this.audioCtx.state);
      
      // 如果状态异常，切换到备用方案
      if (this.audioCtx.state === 'default' || !['suspended', 'running', 'closed'].includes(this.audioCtx.state)) {
        console.log('[Metronome] Invalid audio state detected, switching to fallback');
        this.initFallbackAudio();
        this.playFallbackBeep(beatNumber);
      }
      return;
    }
    
    try {
      // Read numerator from current UI state to avoid stale values.
      const numerator = this.data.timeSignature[0] || 4;
      
      // Clamp beatNumber into the visible range as a safety guard.
      const safeBeatNumber = beatNumber % numerator;

      const stressLevel = this.getBeatStress(safeBeatNumber, numerator);
      // stressLevel: 2=Strong, 1=Medium, 0=Weak

      // Debug: 记录第一拍
      if (safeBeatNumber === 0) {
        console.log('[Metronome] Scheduling beat 0 (downbeat) at time:', time.toFixed(3));
      }

      const osc = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);
      
      let frequency = 800;
      let type = 'sine';
      let length = 0.05;
      let volume = 1.0;

      // 根据音色类型设置音频参数
      const currentSoundType = this.data.soundType || 'standard';
      console.log('[Metronome] Using sound type:', currentSoundType, 'for stress level:', stressLevel);

      // 每种音色都有明显不同的特征
      switch (currentSoundType) {
        case 'electronic':
          // 电子音色：使用锯齿波和方波，频率较高
          if (stressLevel === 2) {
            // 强拍: 高频锯齿波，很尖锐
            type = 'sawtooth'; 
            frequency = 2000; 
            volume = 0.7; 
            length = 0.15;
          } else if (stressLevel === 1) {
            // 次强拍: 中频方波
            type = 'square'; 
            frequency = 1200; 
            volume = 0.5; 
            length = 0.1;
          } else {
            // 弱拍: 低频正弦波
            type = 'sine'; 
            frequency = 800; 
            volume = 0.3; 
            length = 0.08;
          }
          break;
          
        case 'wood':
          // 木鱼音色：使用方波模拟木质敲击声
          if (stressLevel === 2) {
            // 强拍: 低频方波，模拟大木鱼
            type = 'square'; 
            frequency = 400; 
            volume = 0.8; 
            length = 0.2;
          } else if (stressLevel === 1) {
            // 次强拍: 中频方波
            type = 'square'; 
            frequency = 600; 
            volume = 0.6; 
            length = 0.15;
          } else {
            // 弱拍: 高频方波，模拟小木鱼
            type = 'square'; 
            frequency = 800; 
            volume = 0.4; 
            length = 0.1;
          }
          break;
          
        case 'piano':
          // 钢琴音色：使用三角波模拟钢琴音色，使用真实音符频率
          if (stressLevel === 2) {
            // 强拍: C5 (523.25Hz)
            type = 'triangle'; 
            frequency = 523.25; 
            volume = 0.8; 
            length = 0.3;
          } else if (stressLevel === 1) {
            // 次强拍: G4 (392Hz)
            type = 'triangle'; 
            frequency = 392.00; 
            volume = 0.6; 
            length = 0.25;
          } else {
            // 弱拍: E4 (329.63Hz)
            type = 'triangle'; 
            frequency = 329.63; 
            volume = 0.4; 
            length = 0.2;
          }
          break;
          
        case 'drum':
          // 鼓声音色：低频模拟鼓，高频模拟镲
          if (stressLevel === 2) {
            // 强拍: 超低频三角波模拟大鼓
            type = 'triangle'; 
            frequency = 60; 
            volume = 1.0; 
            length = 0.25;
          } else if (stressLevel === 1) {
            // 次强拍: 中频方波模拟小鼓
            type = 'square'; 
            frequency = 200; 
            volume = 0.7; 
            length = 0.15;
          } else {
            // 弱拍: 高频噪音模拟镲片
            type = 'square'; 
            frequency = 8000; 
            volume = 0.1; 
            length = 0.05;
          }
          break;
          
        case 'standard':
        default:
          // 标准音色：经典节拍器声音
          if (stressLevel === 2) {
            // 强拍: 高频方波，清脆响亮
            type = 'square'; 
            frequency = 1760; // A6
            volume = 0.8; 
            length = 0.1;
          } else if (stressLevel === 1) {
            // 次强拍: 中频正弦波
            type = 'sine'; 
            frequency = 1320; // E6
            volume = 0.6; 
            length = 0.08;
          } else {
            // 弱拍: 低频正弦波
            type = 'sine'; 
            frequency = 880; // A5
            volume = 0.4; 
            length = 0.06;
          }
          break;
      }
      
      console.log('[Metronome] Audio parameters set:', {
        soundType: currentSoundType,
        stressLevel: stressLevel,
        type: type,
        frequency: frequency,
        volume: volume,
        length: length
      });
      
      osc.type = type;
      osc.frequency.value = frequency;
      
      // 音量包络
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(volume, time + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + length);
      
      osc.start(time);
      osc.stop(time + length + 0.1);
    } catch (error) {
      console.error('[Metronome] Error in scheduleNote:', error);
      // 如果音频播放出错，切换到备用方案
      this.initFallbackAudio();
      this.playFallbackBeep(beatNumber);
      return;
    }
    
    // Visual sync is intentionally slightly early to feel tighter than audio-late UI.
    
    let delay = (time - this.audioCtx.currentTime) * 1000;
    
    // Use a conservative lead time to avoid showing the previous beat too early.
    delay = delay - 10; 
    
    // The downbeat gets a small extra offset to compensate for startup latency.
    const numerator = this.data.timeSignature[0] || 4;
    if (beatNumber % numerator === 0) {
       // This keeps the first beat feeling heavier and more aligned.
       delay += 15; 
    }

    const visualTimerId = setTimeout(() => {
      // 清除已执行的 timerId
      this.visualTimerIds = this.visualTimerIds.filter(id => id !== visualTimerId);

      // Re-check against current UI state in case the time signature changed.
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
  
  // 备用音频播放（使用震动代替）
  playFallbackBeep(beatNumber) {
    const numerator = this.data.timeSignature[0] || 4;
    const safeBeatNumber = beatNumber % numerator;
    const stressLevel = this.getBeatStress(safeBeatNumber, numerator);
    
    console.log('[Metronome] Playing fallback beep, beat:', safeBeatNumber, 'stress:', stressLevel);
    
    // 使用震动模拟音频节拍
    try {
      if (stressLevel === 2) {
        // 强拍：长震动 + 短暂停 + 短震动（双重震动）
        wx.vibrateLong();
        setTimeout(() => {
          wx.vibrateShort({ type: 'heavy' });
        }, 200);
      } else if (stressLevel === 1) {
        // 次强拍：中等震动
        wx.vibrateShort({ type: 'heavy' });
      } else {
        // 弱拍：轻震动
        wx.vibrateShort({ type: 'light' });
      }
    } catch (error) {
      console.warn('[Metronome] Vibration failed:', error);
      // 如果震动也失败了，至少保证视觉反馈
    }
    
    // 视觉反馈
    this.setData({ currentBeatIndex: safeBeatNumber });
  },

  togglePlay() {
    console.log('[Metronome] Toggle play clicked');
    
    // 如果音频还没有初始化，先初始化
    if (!this.audioCtx && !this.useFallbackAudio) {
      console.log('[Metronome] First interaction detected, initializing audio...');
      
      wx.showLoading({
        title: '初始化音频...',
        mask: true
      });
      
      this.initAudioOnFirstInteraction().then((success) => {
        wx.hideLoading();
        
        if (success) {
          console.log('[Metronome] Audio initialized, proceeding with play');
          this.setData({ useFallbackAudio: false });
        } else {
          console.log('[Metronome] Using fallback audio mode');
          this.setData({ useFallbackAudio: true });
        }
        
        // 初始化完成后执行播放
        this.doTogglePlay();
      });
      
      return;
    }
    
    // 音频已初始化，直接执行播放逻辑
    this.doTogglePlay();
  },
  
  doTogglePlay() {
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
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
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
    console.log('[Metronome] Starting metronome...');
    
    // 如果音频还没有初始化，先初始化
    if (!this.audioCtx && !this.useFallbackAudio) {
      console.log('[Metronome] Audio not initialized, initializing now...');
      
      this.initAudioOnFirstInteraction().then(() => {
        // 初始化完成后启动
        this.doStart();
      });
      return;
    }
    
    // 检查音频上下文
    if (this.audioCtx && !this.useFallbackAudio) {
      console.log('[Metronome] Audio context state before start:', this.audioCtx.state);
      
      // 强制恢复音频上下文
      if (this.audioCtx.state === 'suspended') {
        console.log('[Metronome] Audio context suspended, resuming...');
        
        this.audioCtx.resume().then(() => {
          console.log('[Metronome] Audio context resumed successfully, state:', this.audioCtx.state);
          
          // 确保状态已更新后再启动
          setTimeout(() => {
            this.doStart();
          }, 100);
          
        }).catch(err => {
          console.error('[Metronome] Failed to resume audio context:', err);
          wx.showModal({
            title: '音频启动失败',
            content: '无法启动音频。可能的解决方案：\n\n1. 点击"测试音频"按钮\n2. 检查设备音量设置\n3. 重启小程序\n4. 更新微信版本',
            confirmText: '测试音频',
            cancelText: '使用震动',
            success: (res) => {
              if (res.confirm) {
                this.testAudio();
              } else {
                this.initFallbackAudio();
                this.doStart();
              }
            }
          });
        });
      } else {
        // 音频上下文已就绪，直接启动
        this.doStart();
      }
    } else {
      // 使用备用方案或音频已就绪，直接启动
      this.doStart();
    }
  },
  
  doStart() {
    if (this.useFallbackAudio) {
      console.log('[Metronome] Starting with fallback audio (vibration mode)');
      this.setData({ isPlaying: true });
      
      // Start auto-stop timer if enabled.
      if (this.data.timerDuration > 0) {
        this.startAutoStopTimer();
      }
      
      // 初始化节拍计数器
      this.audioBeatIndex = 0;
      
      if (this.data.gradientMode) {
        this.gradientStartTime = Date.now();
        this.gradientStartBpm = this.data.bpm;
      }
      
      // 启动备用调度器（基于定时器）
      this.startFallbackScheduler();
      console.log('[Metronome] Fallback metronome started successfully');
      return;
    }
    
    console.log('[Metronome] Actually starting metronome, audio state:', this.audioCtx.state);
    
    this.setData({ isPlaying: true });

    // Start auto-stop timer if enabled.
    if (this.data.timerDuration > 0) {
      this.startAutoStopTimer();
    }
    
    // 初始化音频计数器
    this.audioBeatIndex = 0;
    
    // 设置第一个音符的时间（稍微延迟，确保音频上下文完全就绪）
    this.nextNoteTime = this.audioCtx.currentTime + 0.2;
    
    if (this.data.gradientMode) {
      this.gradientStartTime = Date.now();
      this.gradientStartBpm = this.data.bpm;
    }
    
    // 启动调度器
    this.scheduler();
    
    console.log('[Metronome] Metronome started successfully');
  },
  
  // 备用调度器（使用定时器代替音频调度）
  startFallbackScheduler() {
    const interval = 60000 / this.data.bpm; // 毫秒
    
    this.fallbackTimer = setInterval(() => {
      if (!this.data.isPlaying) {
        clearInterval(this.fallbackTimer);
        return;
      }
      
      if (this.audioBeatIndex === undefined) {
        this.audioBeatIndex = 0;
      }
      
      // 播放备用音频
      this.playFallbackBeep(this.audioBeatIndex);
      
      // 推进节拍
      this.audioBeatIndex++;
      const numerator = (this.data.timeSignature && this.data.timeSignature[0]) ? this.data.timeSignature[0] : 4;
      
      if (this.audioBeatIndex >= numerator) {
        this.audioBeatIndex = 0;
      }
      
      // 渐变模式逻辑
      if (this.data.gradientMode && this.gradientStartTime) {
        const elapsed = (Date.now() - this.gradientStartTime) / 1000 / 60;
        if (elapsed < this.data.gradientDuration) {
          const progress = elapsed / this.data.gradientDuration;
          const startBpm = this.gradientStartBpm;
          const targetBpm = parseInt(this.data.gradientTargetBpm);
          const newBpm = Math.floor(startBpm + (targetBpm - startBpm) * progress);
          if (newBpm !== this.data.bpm) {
            this.setData({ bpm: newBpm });
            // 重新设置定时器间隔
            clearInterval(this.fallbackTimer);
            this.startFallbackScheduler();
          }
        }
      }
    }, interval);
  },

  stop() {
    this.setData({ isPlaying: false, currentBeatIndex: -1 });
    clearTimeout(this.timerId);
    this.timerId = null;
    this.stopAdjust();

    // 停止备用定时器
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }

    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    
    // Clear pending visual updates.
    if (this.visualTimerIds) {
      this.visualTimerIds.forEach(id => clearTimeout(id));
      this.visualTimerIds = [];
    }

    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.setData({ isCountingDown: false });

    // Stop and clear the auto-stop timer.
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
    if (isNaN(val) || val <= 0 || val > 180) {
      wx.showToast({ title: '\u8bf7\u8f93\u5165 1-180 \u4e4b\u95f4\u7684\u5206\u949f\u6570', icon: 'none' });
      return;
    }
    const remainingSeconds = val * 60;
    this.setData({ 
      timerDuration: val, 
      remainingSeconds: remainingSeconds,
      formattedRemainingTime: this.formatTime(remainingSeconds),
      customTimerLabel: `${val}\u5206\u949f`,
      showTimerInput: false 
    });
    if (this.data.vibrateEnabled) wx.vibrateShort({ type: 'light' });
  },

  startAutoStopTimer() {
    if (this.stopTimer) {
      clearInterval(this.stopTimer);
      this.stopTimer = null;
    }
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
    // 确保 totalSeconds 是非负整数
    totalSeconds = Math.max(0, Math.floor(totalSeconds));
    
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    // Always format as HH:MM:SS, for example 5 minutes => 00:05:00.
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
      wx.showToast({ title: '\u8bf7\u8f93\u5165 30-250 \u4e4b\u95f4\u7684\u6574\u6570', icon: 'none' });
      return;
    }
    this.setData({ bpm: val, showBpmInput: false });
  },

  setBeatType(e) {
    if (this.data.vibrateEnabled) wx.vibrateShort({ type: 'light' });
    const index = e.currentTarget.dataset.index;
    const item = this.data.beatTypes[index];
    
    // Restart cleanly so the new signature starts from beat one.
    const wasPlaying = this.data.isPlaying;
    
    if (wasPlaying) {
      this.stop();
    }

    this.setData({ 
      beatTypeIndex: index,
      timeSignature: item.value,
      currentBeatIndex: -1 // 重置为-1表示未开始
    });
    
    if (wasPlaying) {
      // Give state updates a short moment before restarting playback.
      if (this.restartTimer) {
        clearTimeout(this.restartTimer);
      }
      this.restartTimer = setTimeout(() => {
        this.restartTimer = null;
        // 重置音频节拍索引
        this.audioBeatIndex = 0;
        this.start();
      }, 50);
    }
  },

  setSoundType(e) { 
    const soundType = e.currentTarget.dataset.id;
    console.log('[Metronome] Setting sound type to:', soundType);
    
    // 立即更新数据
    this.setData({ soundType: soundType });
    
    // 保存到本地存储
    const settings = wx.getStorageSync('metronome_settings') || {};
    settings.soundType = soundType;
    wx.setStorageSync('metronome_settings', settings);
    
    // 触觉反馈
    if (this.data.vibrateEnabled) {
      wx.vibrateShort({ type: 'light' });
    }
    
    // 如果正在播放，重启以应用新音色
    if (this.data.isPlaying) {
      console.log('[Metronome] Restarting to apply new sound type:', soundType);
      
      // 停止当前播放
      this.stop();
      
      // 短暂延迟后重新开始，确保新音色生效
      setTimeout(() => {
        console.log('[Metronome] Restarting with sound type:', this.data.soundType);
        this.start();
      }, 150);
    }
    
    console.log('[Metronome] Sound type changed to:', this.data.soundType);
  },
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
      const safeBeatTypeIndex = Number.isInteger(preset.beatTypeIndex) &&
        preset.beatTypeIndex >= 0 &&
        preset.beatTypeIndex < this.data.beatTypes.length
        ? preset.beatTypeIndex
        : 2;
      const safeTimeSignature = Array.isArray(preset.timeSignature) && preset.timeSignature.length === 2
        ? preset.timeSignature
        : this.data.beatTypes[safeBeatTypeIndex].value;

      if (this.data.vibrateEnabled) wx.vibrateShort({ type: 'light' });
      this.stop();
      this.setData({
        bpm: preset.bpm,
        beatTypeIndex: safeBeatTypeIndex,
        timeSignature: safeTimeSignature,
        soundType: preset.soundType || 'standard'
      });
      wx.showToast({ title: '\u5df2\u52a0\u8f7d', icon: 'success' });
    } else {
      wx.showToast({ title: '\u8be5\u9884\u8bbe\u4e3a\u7a7a', icon: 'none' });
    }
  },
  
  savePreset(e) {
    const index = e.currentTarget.dataset.index;
    const newPreset = {
      name: `\u9884\u8bbe${index + 1}`,
      bpm: this.data.bpm,
      beatTypeIndex: this.data.beatTypeIndex,
      beatName: this.data.beatTypes[this.data.beatTypeIndex].name,
      timeSignature: this.data.timeSignature.slice(),
      soundType: this.data.soundType
    };
    
    const presets = this.data.presets.slice();
    presets[index] = newPreset;
    this.setData({ presets });
    
    wx.setStorageSync('metronome_presets', presets);
    if (this.data.vibrateEnabled) wx.vibrateShort({ type: 'heavy' });
    wx.showToast({ title: '\u4fdd\u5b58\u6210\u529f', icon: 'success' });
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
      const safeBeatTypeIndex = Number.isInteger(settings.beatTypeIndex) &&
        settings.beatTypeIndex >= 0 &&
        settings.beatTypeIndex < this.data.beatTypes.length
        ? settings.beatTypeIndex
        : 2;
      
      this.setData({
        bpm: settings.bpm || 80,
        beatTypeIndex: safeBeatTypeIndex,
        timeSignature: this.data.beatTypes[safeBeatTypeIndex].value,
        soundType: settings.soundType || 'standard',
        visualMode: settings.visualMode || 'dot',
        countdownSet: settings.countdownSet !== undefined ? settings.countdownSet : 0,
        timerDuration: duration,
        remainingSeconds: remaining,
        formattedRemainingTime: this.formatTime(remaining),
        customTimerLabel: duration ? `${duration}\u5206\u949f` : '\u81ea\u5b9a\u4e49',
        vibrateEnabled: settings.vibrateEnabled || false,
        screenOn: settings.screenOn || false
      });
    }
    if (Array.isArray(presets)) {
      const normalizedPresets = [{}, {}, {}];
      presets.slice(0, 3).forEach((preset, index) => {
        normalizedPresets[index] = preset || {};
      });
      this.setData({ presets: normalizedPresets });
    }
  },
  
  onTapBlank() {
    //
  },
  
  onLongPress() {
    // 
  },

  onShareAppMessage() {
    return { title: '节拍器 - 精准节奏训练', path: '/pages/metronome/index' };
  },


});