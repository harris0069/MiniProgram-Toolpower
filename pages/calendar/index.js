// pages/calendar/index.js
const calendar = require('../../utils/dateUtils.js').calendar;

Page({
  data: {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate(),
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    calendar_list: [],
    current_swiper: 1,
    selectedDate: {},
    todayDetail: {},
    selectedDateDetail: {},
    isLoading: true,
    isTodayButtonVisible: false,
    statusBarHeight: 0, // 状态栏高度
    isDetailPopupVisible: false, // 控制详情弹窗的显示

    // 农历选择器相关
    calendarMode: 'solar', // 'solar' 或 'lunar'
    lunarPickerValue: [0, 0, 0],
    lunarPickerRange: [[], [], []],
    selectedLunar: { year: 1900, month: 1, day: 1, isLeap: false },

    // 年月选择器相关
    isYearMonthPickerVisible: false,
    yearMonthPickerValue: [0, 0],
    yearMonthPickerRange: [[], []],
    tempYearMonth: { year: 1900, month: 1 }, // 临时存储picker选择的值
    theme: 'light', // 新增：当前主题，默认为light
  },

  // 新增：切换主题
  switchTheme: function() {
    const newTheme = this.data.theme === 'light' ? 'dark' : 'light';
    this.setData({
      theme: newTheme
    });
    wx.setStorageSync('theme', newTheme);
  },

  onLoad: function() {
    const savedTheme = wx.getStorageSync('theme');
    if (savedTheme) {
      this.setData({
        theme: savedTheme
      });
    }

    let systemInfo = {};
    try {
      const windowInfo = wx.getWindowInfo();
      systemInfo.statusBarHeight = windowInfo.statusBarHeight;
      systemInfo.windowWidth = windowInfo.windowWidth;
    } catch (e) {
      const sysInfo = wx.getSystemInfoSync();
      systemInfo.statusBarHeight = sysInfo.statusBarHeight;
      systemInfo.windowWidth = sysInfo.windowWidth;
    }

    const menuButton = wx.getMenuButtonBoundingClientRect();
    const navBarHeight = (menuButton.top - systemInfo.statusBarHeight) * 2 + menuButton.height;
    const menuRightPadding = systemInfo.windowWidth - menuButton.left;

    this.setData({
      statusBarHeight: systemInfo.statusBarHeight,
      navBarHeight: navBarHeight,
      menuRightPadding: menuRightPadding,
    });

    // Defer heavy lifting to avoid blocking render thread
    wx.nextTick(() => {
        this.initializeCalendar();
    });
  },

  initializeCalendar: function() {
    const targetDate = new Date();

    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;
    const day = targetDate.getDate();

    const today = new Date();
    const isNotToday = year !== today.getFullYear() || month !== (today.getMonth() + 1) || day !== today.getDate();

    this.setData({
      isTodayButtonVisible: isNotToday,
    });

    this.navigateToDate(year, month, day);

    // 确保初始加载时选中当天并显示详情
    this.onDateTap({ currentTarget: { dataset: { date: { year, month, day, isCurrentMonth: true } } } });
    this.initYearMonthPicker();

    this.setData({ isLoading: false });
  },

  navigateBack: function() {
    wx.navigateBack({
      delta: 1
    });
  },

  // 初始化年月选择器
  initYearMonthPicker() {
    const years = [];
    const months = [];
    for (let i = 1900; i <= 2100; i++) { years.push(`${i}年`); }
    for (let i = 1; i <= 12; i++) { months.push(`${i}月`); }
    this.setData({
      'yearMonthPickerRange[0]': years,
      'yearMonthPickerRange[1]': months,
    });
  },

  // 显示年月选择器
  showYearMonthPicker() {
    const { year, month } = this.data;
    this.setData({
      isYearMonthPickerVisible: true,
      yearMonthPickerValue: [year - 1900, month - 1],
      tempYearMonth: { year, month },
    });
  },

  // 隐藏年月选择器
  hideYearMonthPicker() {
    this.setData({ isYearMonthPickerVisible: false });
  },

  // 年月选择器滚动
  onYearMonthPickerChange(e) {
    const val = e.detail.value;
    const year = parseInt(this.data.yearMonthPickerRange[0][val[0]]);
    const month = parseInt(this.data.yearMonthPickerRange[1][val[1]]);
    this.setData({ tempYearMonth: { year, month } });
  },

  // 导航到指定日期
  navigateToDate(year, month, day) {
    const selectedDate = { year, month, day };
    const calendar_list = [
      this.generateCalendar(year, month - 1, selectedDate),
      this.generateCalendar(year, month, selectedDate),
      this.generateCalendar(year, month + 1, selectedDate),
    ];
    
    this.setData({
      year,
      month,
      day,
      calendar_list,
      current_swiper: 1,
      selectedDate,
      selectedDateDetail: this.getDateDetail(year, month, day),
    });
  },

  // 确认年月选择
  confirmYearMonthChange() {
    const { year, month } = this.data.tempYearMonth;
    this.hideYearMonthPicker();
    this.navigateToDate(year, month, 1);
  },

  // 初始化农历选择器数据
  initLunarPicker() {
    const years = [];
    for (let i = 1900; i <= 2100; i++) {
      years.push(`${i}年`);
    }
    const months = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'].map(m => `${m}月`);
    const days = [];
    for (let i = 1; i <= 30; i++) {
      days.push(calendar.formatDay(i));
    }

    const today = new Date();
    const lunarDate = calendar.solarToLunar(today.getFullYear(), today.getMonth() + 1, today.getDate());

    this.setData({
      'lunarPickerRange[0]': years,
      'lunarPickerRange[1]': months,
      'lunarPickerRange[2]': days,
      lunarPickerValue: [
        lunarDate.lYear - 1900,
        lunarDate.lMonth - 1,
        lunarDate.lDay - 1
      ],
      selectedLunar: { year: lunarDate.lYear, month: lunarDate.lMonth, day: lunarDate.lDay, isLeap: lunarDate.isLeap },
    });
    this.updateLunarPickerMonths(lunarDate.lYear);
  },

  // 更新农历月份选择（处理闰月）
  updateLunarPickerMonths(year) {
    const leapMonth = calendar.leapMonth(year);
    const months = [];
    for (let i = 1; i <= 12; i++) {
      months.push(calendar.formatMonth(i));
      if (i === leapMonth) {
        months.push(`闰${calendar.formatMonth(i)}`);
      }
    }
    this.setData({ 'lunarPickerRange[1]': months });
  },

  // 切换日历模式
  switchCalendarMode() {
    const newMode = this.data.calendarMode === 'solar' ? 'lunar' : 'solar';
    this.setData({ calendarMode: newMode });
  },

  initCalendar() {
    this.setData({ isLoading: true });
    setTimeout(() => {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      const day = today.getDate();

      const selectedDate = { year, month, day };
      const calendar_list = [
        this.generateCalendar(year, month - 1, selectedDate),
        this.generateCalendar(year, month, selectedDate),
        this.generateCalendar(year, month + 1, selectedDate),
      ];
      
      const todayDetail = this.getDateDetail(year, month, day);

      this.setData({
        year,
        month,
        day,
        calendar_list,
        current_swiper: 1,
        selectedDate,
        todayDetail,
        selectedDateDetail: todayDetail,
        isLoading: false,
        isTodayButtonVisible: false,
      });
    }, 100);
  },

  getDateDetail(year, month, day) {
    const date = new Date(year, month - 1, day);
    const weekday = this.data.weekdays[date.getDay()];
    const lunarDate = calendar.solarToLunar(year, month, day);

    return {
      lunarDate: `${lunarDate.IMonthCn}${lunarDate.IDayCn}`,
      ganzhi: `${lunarDate.gzYear}年 ${lunarDate.gzMonth}月 ${lunarDate.gzDay}日`,
      weekday: `星期${weekday}`,
      suit: lunarDate.suit.split(","),
      avoid: lunarDate.avoid.split(","),
      allEvents: lunarDate.eventInfo.allEvents,
      highestPriorityEvent: lunarDate.eventInfo.highestPriorityEvent,
    };
  },

  generateCalendar(year, month, selectedDate) {
    if (month === 0) { year -= 1; month = 12; }
    if (month === 13) { year += 1; month = 1; }

    const today = new Date();
    const today_year = today.getFullYear();
    const today_month = today.getMonth() + 1;
    const today_day = today.getDate();

    const firstDay = new Date(year, month - 1, 1);
    const firstDayWeekday = firstDay.getDay();
    const monthDays = new Date(year, month, 0).getDate();

    let days = [];
    
    // Previous month's days
    const prevMonthDate = new Date(year, month - 1, 0);
    const prevMonthYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth() + 1;
    const prevMonthDays = prevMonthDate.getDate();
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      days.push({ year: prevMonthYear, month: prevMonth, day: day, isCurrentMonth: false, lunar: '', gridDisplayType: 'lunar', isMajorHoliday: false });
    }

    // Current month's days
    for (let i = 1; i <= monthDays; i++) {
      days.push(this.createDayObject(year, month, i, today_year, today_month, today_day, selectedDate));
    }

    // Next month's days
    const nextMonthDate = new Date(year, month, 1);
    const nextMonthYear = nextMonthDate.getFullYear();
    const nextMonth = nextMonthDate.getMonth() + 1;
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ year: nextMonthYear, month: nextMonth, day: i, isCurrentMonth: false, lunar: '', gridDisplayType: 'lunar', isMajorHoliday: false });
    }

    console.log('Generated days:', days);
    return { year, month, days };
  },

  createDayObject(year, month, day, today_year, today_month, today_day, selectedDate) {
    const lunarDate = calendar.solarToLunar(year, month, day);
    const dayData = {
      day,
      month,
      year,
      key: `${year}-${month}-${day}`,
      isCurrentMonth: true,
      isToday: year === today_year && month === today_month && day === today_day,
      isSelected: selectedDate && selectedDate.year === year && selectedDate.month === month && selectedDate.day === day,
      lunar: lunarDate.gridDisplay,
      isMajorHoliday: lunarDate.isMajorHoliday,
      gridDisplayType: lunarDate.gridDisplayType,
      termInfo: lunarDate.termInfo || null, // 补充 termInfo
    };
    return dayData;
  },

  // onSwiperChange的辅助函数，计算下一个月
  _calculateNextMonth(year, month, diff) {
    if (diff === 1 || diff === -2) { // 向右滑
      month++;
      if (month > 12) { month = 1; year++; }
    } else { // 向左滑
      month--;
      if (month < 1) { month = 12; year--; }
    }

    // 边界检查
    if (year < 1900 || (year === 1900 && month < 1)) return null;
    if (year > 2100 || (year === 2100 && month > 12)) return null;

    return { newYear: year, newMonth: month };
  },

  onSwiperChange(e) {
    const { current, source } = e.detail;
    if (source === 'touch') {
      const previous = this.data.current_swiper;
      const diff = current - previous;

      const nextMonthData = this._calculateNextMonth(this.data.year, this.data.month, diff);
      if (!nextMonthData) return; // 如果返回null，则说明到达边界，不做任何操作

      const { newYear, newMonth } = nextMonthData;

      const calendar_list = this.data.calendar_list;
      const next_swiper_index = (current + 1) % 3;
      const updateDirection = (diff === 1 || diff === -2) ? 1 : -1;
      calendar_list[next_swiper_index] = this.generateCalendar(newYear, newMonth + updateDirection, this.data.selectedDate);

      const today = new Date();
      const isCurrentMonth = newYear === today.getFullYear() && newMonth === (today.getMonth() + 1);

      this.setData({
        year: newYear,
        month: newMonth,
        current_swiper: current,
        calendar_list,
        isTodayButtonVisible: !isCurrentMonth,
      });
    }
  },

  onDateTap(e) {
    const date = e.currentTarget.dataset.date;
    if (!date.isCurrentMonth) return;

    const { year, month, day } = date;

    // 仅更新当前swiper页的选中态，减少setData的开销
    const currentCal = this.data.calendar_list[this.data.current_swiper];
    currentCal.days.forEach(d => {
      if (d.isCurrentMonth) {
        d.isSelected = d.year === year && d.month === month && d.day === day;
      }
    });

    this.setData({
      selectedDate: { year, month, day },
      [`calendar_list[${this.data.current_swiper}]`]: currentCal,
      selectedDateDetail: this.getDateDetail(year, month, day),
    });
  },



  doNothing() {
    // 阻止事件冒泡
  },

  backToToday() {
    this.initCalendar();
  },

  findDateInCalendar(calendar, year, month, day) {
    return calendar.days.find(d => d.isCurrentMonth && d.year === year && d.month === month && d.day === day);
  },

  // 农历选择器变动
  onLunarDateChange(e) {
    const val = e.detail.value;
    const year = this.data.lunarPickerRange[0][val[0]].replace('年', '');
    const monthStr = this.data.lunarPickerRange[1][val[1]];
    const day = val[2] + 1;

    const isLeap = monthStr.includes('闰');
    const month = calendar.nStr2.indexOf(monthStr.replace('闰', '').replace('月', '')) + 1;

    // 年份变化时，更新月份和日期选择
    if (parseInt(year) !== this.data.selectedLunar.year) {
      this.updateLunarPickerMonths(parseInt(year));
    }

    this.setData({
      lunarPickerValue: val,
      selectedLunar: { year: parseInt(year), month, day, isLeap },
    });
  },

  // 确认农历选择
  confirmLunarSelection() {
    const { year, month, day, isLeap } = this.data.selectedLunar;
    const solarDate = calendar.lunarToSolar(year, month, day, isLeap);

    if (solarDate) {
      const solarYear = solarDate.getFullYear();
      const solarMonth = solarDate.getMonth() + 1;
      const solarDay = solarDate.getDate();

      this.navigateToDate(solarYear, solarMonth, solarDay);
      this.setData({ calendarMode: 'solar' }); // 切换回公历模式

    } else {
      wx.showToast({
        title: '该农历日期不存在',
        icon: 'none',
      });
    }
  },
});
