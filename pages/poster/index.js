Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    mode: '',
  },

  onLoad() {
    const systemInfo = wx.getWindowInfo();
    const statusBarHeight = systemInfo.statusBarHeight || 0;
    const navBarHeight = statusBarHeight + 44;
    this.setData({ statusBarHeight, navBarHeight });
  },
})
