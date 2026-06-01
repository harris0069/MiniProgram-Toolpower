/**
 * API客户端 - 简化版，适配实际数据库结构
 */

const API_BASE_URL = 'https://xcx.huangyiling.top';

class ApiClient {
  
  /**
   * 调用人像分割API
   * @param {string} imageBase64 图片Base64数据
   * @param {string} openid 用户openid
   * @returns {Promise} API响应
   */
  static async removeBackground(imageBase64, openid) {
    try {
      console.log('[ApiClient] 开始调用人像分割API...');
      
      const response = await this.request('/api/remove_bg.php', {
        method: 'POST',
        data: {
          original_image: imageBase64,
          openid: openid
        },
        timeout: 60000 // 60秒超时
      });
      
      console.log('[ApiClient] API调用成功:', response);
      return response;
      
    } catch (error) {
      console.error('[ApiClient] removeBackground failed:', error);
      throw error;
    }
  }
  
  /**
   * 将本地图片转换为Base64
   * @param {string} filePath 本地文件路径
   * @returns {Promise<string>} Base64数据
   */
  static async imageToBase64(filePath) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath: filePath,
        encoding: 'base64',
        success: (res) => {
          // 添加数据URL前缀
          const base64Data = 'data:image/jpeg;base64,' + res.data;
          resolve(base64Data);
        },
        fail: (error) => {
          reject(new Error('读取文件失败: ' + error.errMsg));
        }
      });
    });
  }
  
  /**
   * 将Base64保存为本地文件
   * @param {string} base64Data Base64数据
   * @returns {Promise<string>} 本地文件路径
   */
  static async base64ToFile(base64Data) {
    return new Promise((resolve, reject) => {
      // 移除数据URL前缀
      const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
      
      const fs = wx.getFileSystemManager();
      const fileName = `processed_${Date.now()}.png`;
      const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
      
      fs.writeFile({
        filePath: filePath,
        data: base64,
        encoding: 'base64',
        success: () => {
          resolve(filePath);
        },
        fail: (error) => {
          reject(new Error('保存文件失败: ' + error.errMsg));
        }
      });
    });
  }
  
  /**
   * 通用请求方法
   * @param {string} url 请求路径
   * @param {Object} options 请求选项
   * @returns {Promise} 响应数据
   */
  static async request(url, options = {}) {
    const { method = 'GET', data = {}, timeout = 30000 } = options;
    
    return new Promise((resolve, reject) => {
      const requestOptions = {
        url: `${API_BASE_URL}${url}`,
        method: method,
        timeout: timeout,
        header: {
          'Content-Type': 'application/json'
        },
        success: (res) => {
          console.log('[ApiClient] 响应状态:', res.statusCode);
          console.log('[ApiClient] 响应数据:', res.data);
          
          try {
            if (res.statusCode === 200) {
              if (res.data.success) {
                resolve(res.data);
              } else {
                reject(new Error(res.data.error || '请求失败'));
              }
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${res.data.error || '服务器错误'}`));
            }
          } catch (e) {
            reject(new Error('响应解析失败: ' + e.message));
          }
        },
        fail: (error) => {
          console.error('[ApiClient] 请求失败:', error);
          reject(new Error('网络请求失败: ' + error.errMsg));
        }
      };
      
      // 根据请求方法设置数据
      if (method === 'GET') {
        // GET请求将数据拼接到URL
        const params = new URLSearchParams(data).toString();
        if (params) {
          requestOptions.url += (requestOptions.url.includes('?') ? '&' : '?') + params;
        }
      } else {
        // POST请求将数据放在body中
        requestOptions.data = data;
      }
      
      console.log('[ApiClient] 发起请求:', requestOptions.url);
      wx.request(requestOptions);
    });
  }
  
  /**
   * 获取用户OpenID
   * @returns {Promise<string>} OpenID
   */
  static async getOpenId() {
    try {
      // 先尝试从缓存获取
      const cachedOpenId = wx.getStorageSync('user_openid');
      if (cachedOpenId) {
        return cachedOpenId;
      }
      
      // 如果没有缓存，则调用登录获取
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject
        });
      });
      
      if (!loginRes.code) {
        throw new Error('获取登录凭证失败');
      }
      
      // 这里暂时返回一个模拟的openid
      // 实际项目中需要调用后端接口通过code换取openid
      const openid = 'wx_' + Date.now() + '_' + Math.random().toString(36).substr(2);
      
      // 缓存openid
      wx.setStorageSync('user_openid', openid);
      
      return openid;
      
    } catch (error) {
      console.error('[ApiClient] getOpenId failed:', error);
      // 如果获取失败，返回一个临时ID
      return 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2);
    }
  }
  
  /**
   * 查询当日剩余使用次数
   */
  static async checkUsage(openid) {
    return await this.request('/api/check_usage.php', {
      method: 'POST',
      data: { openid },
    });
  }

  /**
   * 兑换码兑换
   */
  static async redeemCode(openid, code) {
    return await this.request('/api/redeem.php', {
      method: 'POST',
      data: { openid, code },
    });
  }

  /**
   * 查询链接解析当日剩余使用次数
   */
  static async checkLinkUsage(openid) {
    return await this.request('/api/check_usage.php', {
      method: 'POST',
      data: { openid, tool: 'link_parse' },
    });
  }

  /**
   * 链接解析兑换码
   */
  static async redeemLinkCode(openid, code) {
    return await this.request('/api/redeem.php', {
      method: 'POST',
      data: { openid, code, tool: 'link_parse' },
    });
  }

  /**
   * 重试机制
   * @param {Function} fn 要重试的函数
   * @param {number} maxRetries 最大重试次数
   * @param {number} delay 重试延迟(毫秒)
   * @returns {Promise} 函数执行结果
   */
  static async retry(fn, maxRetries = 2, delay = 2000) {
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (i < maxRetries) {
          console.log(`[ApiClient] 重试 ${i + 1}/${maxRetries}:`, error.message);
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }
    
    throw lastError;
  }
}

module.exports = ApiClient;