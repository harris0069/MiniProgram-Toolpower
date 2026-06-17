/**
 * 统一使用控制 - 前端封装
 * 
 * 提供以下方法：
 *   UsageControl.check(tool)           查询剩余次数
 *   UsageControl.redeem(tool, code)    兑换码兑换
 *   UsageControl.increment(tool)       记录使用
 *   UsageControl.featureFlag(tool)     功能开关
 *   UsageControl.checkUnlock(tool, tpl) 模板解锁检查
 *   UsageControl.login(nickname)       上报用户昵称
 *   UsageControl.isPrivilege()         检查是否特权用户（本地缓存）
 */

const API_BASE = 'https://xcx.huangyiling.top';

class UsageControl {

  /**
   * 通用请求
   */
  static async _request(action, data = {}) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: API_BASE + '/api/usage_control.php?action=' + action,
        method: 'POST',
        header: { 'Content-Type': 'application/json' },
        data,
        timeout: 10000,
        success: (res) => {
          if (res.statusCode === 200 && res.data && res.data.success) {
            resolve(res.data);
          } else {
            reject(new Error(res.data?.error || '请求失败'));
          }
        },
        fail: (err) => {
          reject(new Error(err.errMsg || '网络请求失败'));
        },
      });
    });
  }

  /**
   * 获取 openid（从缓存）
   */
  static _getOpenId() {
    return wx.getStorageSync('user_openid') || '';
  }

  /**
   * 查询剩余使用次数
   * @param {string} tool - 工具标识: id-photo, link_parse, poster, watermark, ...
   * @returns {Promise<{remaining, used, limit, bonus, total_limit, is_privilege, mode}>}
   */
  static async check(tool) {
    const openid = this._getOpenId();
    if (!openid) return { remaining: 0, used: 0, limit: 0, bonus: 0, total_limit: 0, is_privilege: false, mode: 'daily' };
    try {
      return await this._request('check', { openid, tool });
    } catch (e) {
      console.warn('[UsageControl] check failed:', e.message);
      return { remaining: 0, used: 0, limit: 0, bonus: 0, total_limit: 0, is_privilege: false, mode: 'daily' };
    }
  }

  /**
   * 兑换码兑换
   * @param {string} tool - 工具标识
   * @param {string} code - 兑换码
   * @returns {Promise<{message, added}>}
   */
  static async redeem(tool, code) {
    const openid = this._getOpenId();
    if (!openid) throw new Error('未登录');
    return await this._request('redeem', { openid, tool, code });
  }

  /**
   * 增加使用次数（保存成功后调用）
   * @param {string} tool - 工具标识
   */
  static async increment(tool) {
    const openid = this._getOpenId();
    if (!openid) return;
    try {
      await this._request('increment', { openid, tool });
    } catch (e) {
      console.warn('[UsageControl] increment failed:', e.message);
    }
  }

  /**
   * 查询功能开关
   * @param {string} tool - 工具标识
   * @returns {Promise<{enabled, message}>}
   */
  static async featureFlag(tool) {
    try {
      return await this._request('flag', { tool });
    } catch (e) {
      console.warn('[UsageControl] featureFlag failed:', e.message);
      return { enabled: true, message: '' };
    }
  }

  /**
   * 检查模板解锁（海报用）
   * @param {string} tool - 工具标识
   * @param {string} templateId - 模板ID
   * @returns {Promise<{unlocked}>}
   */
  static async checkUnlock(tool, templateId) {
    const openid = this._getOpenId();
    if (!openid) return { unlocked: false };
    try {
      return await this._request('unlock', { openid, tool, template: templateId });
    } catch (e) {
      console.warn('[UsageControl] checkUnlock failed:', e.message);
      return { unlocked: false };
    }
  }

  /**
   * 上报用户昵称
   * @param {string} nickname - 微信昵称
   */
  static async login(nickname) {
    const openid = this._getOpenId();
    if (!openid) return;
    try {
      await this._request('user_info', { openid, nickname: nickname || '' });
    } catch (e) {
      console.warn('[UsageControl] login failed:', e.message);
    }
  }

  /**
   * 检查是否特权用户（优先用本地缓存）
   * @returns {boolean}
   */
  static isPrivilege() {
    return wx.getStorageSync('user_privilege') === true;
  }

  /**
   * 更新本地特权缓存
   * @param {boolean} value
   */
  static _setPrivilege(value) {
    wx.setStorageSync('user_privilege', value);
  }

  /**
   * 首次进入时刷新特权状态
   */
  static async refreshPrivilege() {
    const openid = this._getOpenId();
    if (!openid) return;
    try {
      const res = await this._request('vip_check', { openid });
      this._setPrivilege(!!res.is_privilege);
    } catch (e) {
      // 静默失败
    }
  }
}

module.exports = UsageControl;
