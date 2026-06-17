const API_BASE = 'https://xcx.huangyiling.top/api';

let cachedOpenId = null;
let openIdPromise = null;

function ensureOpenid() {
  if (cachedOpenId) return Promise.resolve(cachedOpenId);
  if (openIdPromise) return openIdPromise;
  openIdPromise = new Promise((resolve) => {
    wx.login({
      success(res) {
        if (res.code) {
          wx.request({
            url: API_BASE + '/sec_check.php',
            method: 'POST',
            data: JSON.stringify({ type: 'login', code: res.code }),
            header: { 'content-type': 'application/json' },
            success(resp) {
              if (resp.data && resp.data.openid) {
                cachedOpenId = resp.data.openid;
              }
              openIdPromise = null;
              resolve(cachedOpenId || '');
            },
            fail() { openIdPromise = null; resolve(''); }
          });
        } else {
          openIdPromise = null;
          resolve('');
        }
      },
      fail() { openIdPromise = null; resolve(''); }
    });
  });
  return openIdPromise;
}

function checkText(text) {
  return new Promise((resolve) => {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      resolve({ pass: true });
      return;
    }
    ensureOpenid().then(openid => {
      wx.request({
        url: API_BASE + '/sec_check.php',
        method: 'POST',
        data: JSON.stringify({ type: 'text', content: text, openid: openid }),
        header: { 'content-type': 'application/json' },
        success(res) {
          if (res.data && res.data._v) console.log('[security] PHP v' + res.data._v);
          resolve(res.data && res.data.pass ? { pass: true } : { pass: false, errMsg: '内容包含违规信息' });
        },
        fail() {
          resolve({ pass: true });
        }
      });
    });
  });
}

function checkImage(filePath) {
  return new Promise((resolve) => {
    if (!filePath) {
      resolve({ pass: true });
      return;
    }
    const fs = wx.getFileSystemManager();
    try {
      const stat = fs.statSync(filePath);
      if (stat.size > 10 * 1024 * 1024) {
        console.warn('[security] Image too large for check, skipping', stat.size, filePath);
        resolve({ pass: true });
        return;
      }
      wx.uploadFile({
        url: API_BASE + '/sec_check.php',
        filePath: filePath,
        name: 'image',
        formData: { type: 'image_upload' },
        success(res) {
          try {
            const data = JSON.parse(res.data || '{}');
            resolve(data.pass !== false ? { pass: true } : { pass: false, errMsg: '内容包含违规信息' });
          } catch (e) {
            resolve({ pass: true });
          }
        },
        fail() {
          resolve({ pass: true });
        }
      });
    } catch (e) {
      resolve({ pass: true });
    }
  });
}

module.exports = { checkText, checkImage };
