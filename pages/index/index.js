Page({
  data: {
    tools: [
      {
        name: '图片压缩',
        page: 'image-compress',
        icon: '/images/icon/image.png'
      },
      {
        name: '节拍器',
        page: 'metronome',
        icon: '/images/icon/metronome.png'
      },
      {
        name: '证件照',
        page: 'id-photo',
        icon: '/images/icon/id-photo.png'
      },
      {
        name: 'BMI计算器',
        page: 'bmi',
        icon: '/images/icon/bmi.png'
      },
      {
        name: '电子印章',
        page: 'electronic-seal',
        icon: '/images/icon/seal.png'
      },
      {
        name: '万年历',
        page: 'calendar',
        icon: '/images/icon/calendar.png'
      }
    ]
  },

  navigateToTool(e) {
    const page = e.currentTarget.dataset.page;
    wx.navigateTo({
      url: `/pages/${page}/index`
    });
  }
});