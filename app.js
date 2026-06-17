// app.js
const UsageControl = require('./utils/usageControl.js');
const ApiClient = require('./utils/apiClient.js');

App({
  onLaunch() {
    // 获取openid并缓存
    this._initOpenid();
    // 刷新特权状态
    UsageControl.refreshPrivilege();
  },

  async _initOpenid() {
    try {
      const openid = await ApiClient.getOpenId();
      if (openid && !openid.startsWith('temp_') && !openid.startsWith('wx_')) {
        wx.setStorageSync('user_openid', openid);
      }
    } catch (e) {
      console.warn('[App] initOpenid failed:', e.message);
    }
  },

  /**
   * 上报用户昵称（在用户授权后调用）
   * @param {string} nickname
   */
  async reportNickname(nickname) {
    try {
      await UsageControl.login(nickname);
    } catch (e) {
      console.warn('[App] reportNickname failed:', e.message);
    }
  }
})
