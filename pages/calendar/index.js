// pages/calendar/index.js
const calendar = require('../../utils/dateUtils.js').calendar;

const MIN_SUPPORTED_YEAR = 1900;
const MAX_SUPPORTED_YEAR = MIN_SUPPORTED_YEAR + calendar.lunarInfo.length - 1;
const WEEKDAYS = ['\u65e5', '\u4e00', '\u4e8c', '\u4e09', '\u56db', '\u4e94', '\u516d'];
const DAY_RANGE = Array.from({ length: 30 }, (_, index) => calendar.formatDay(index + 1));

function clampDay(year, month, day) {
  const maxDay = new Date(year, month, 0).getDate();
  return Math.max(1, Math.min(day, maxDay));
}

Page({
  data: {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate(),
    weekdays: WEEKDAYS,
    calendar_list: [],
    current_swiper: 1,
    selectedDate: {},
    todayDetail: {},
    selectedDateDetail: {},
    isLoading: true,
    isTodayButtonVisible: false,
    statusBarHeight: 0,
    isDetailPopupVisible: false,
    calendarMode: 'solar',
    lunarPickerValue: [0, 0, 0],
    lunarPickerRange: [[], [], DAY_RANGE],
    selectedLunar: { year: MIN_SUPPORTED_YEAR, month: 1, day: 1, isLeap: false },
    isYearMonthPickerVisible: false,
    yearMonthPickerValue: [0, 0],
    yearMonthPickerRange: [[], []],
    tempYearMonth: { year: MIN_SUPPORTED_YEAR, month: 1 },
    theme: 'light',
    showTermCard: false,
    termCardInfo: null,
    isLunarPickerVisible: false,
    tempLunarPickerValue: [0, 0, 0],
  },

  switchTheme() {
    const newTheme = this.data.theme === 'light' ? 'dark' : 'light';
    this.setData({ theme: newTheme });
    wx.setStorageSync('theme', newTheme);
  },

  getSupportedToday() {
    const today = new Date();
    const currentYear = today.getFullYear();

    if (currentYear < MIN_SUPPORTED_YEAR) {
      return { year: MIN_SUPPORTED_YEAR, month: 1, day: 1 };
    }

    if (currentYear > MAX_SUPPORTED_YEAR) {
      return { year: MAX_SUPPORTED_YEAR, month: 12, day: 31 };
    }

    return {
      year: currentYear,
      month: today.getMonth() + 1,
      day: today.getDate(),
    };
  },

  getSupportedAdjacentMonth(year, month, offset) {
    const date = new Date(year, month - 1 + offset, 1);
    const nextYear = date.getFullYear();
    const nextMonth = date.getMonth() + 1;

    if (nextYear < MIN_SUPPORTED_YEAR) {
      return { year: MIN_SUPPORTED_YEAR, month: 1 };
    }

    if (nextYear > MAX_SUPPORTED_YEAR) {
      return { year: MAX_SUPPORTED_YEAR, month: 12 };
    }

    return { year: nextYear, month: nextMonth };
  },

  buildYearRange() {
    const years = [];
    for (let i = MIN_SUPPORTED_YEAR; i <= MAX_SUPPORTED_YEAR; i++) {
      years.push(`${i}\u5e74`);
    }
    return years;
  },

  buildMonthRange() {
    const months = [];
    for (let i = 1; i <= 12; i++) {
      months.push(`${i}\u6708`);
    }
    return months;
  },

  buildLunarMonthRange(year) {
    const leapMonth = calendar.leapMonth(year);
    const months = [];

    for (let i = 1; i <= 12; i++) {
      const monthLabel = calendar.formatMonth(i);
      months.push(monthLabel);
      if (i === leapMonth) {
        months.push(`\u95f0${monthLabel}`);
      }
    }

    return months;
  },

  buildLunarDayRange(year, month, isLeap) {
    const maxDay = isLeap ? calendar.leapDays(year) : calendar.monthDays(year, month);
    if (!maxDay) {
      return DAY_RANGE;
    }
    return Array.from({ length: maxDay }, (_, index) => calendar.formatDay(index + 1));
  },

  parseLunarPickerValue(value, ranges) {
    const pickerRanges = ranges || this.data.lunarPickerRange;
    
    // 验证 ranges 是否有效
    if (!pickerRanges || !Array.isArray(pickerRanges) || pickerRanges.length < 3) {
      console.error('Invalid picker ranges');
      return null;
    }
    
    // 验证 value 索引是否在范围内
    if (!value || value.length < 3) {
      return null;
    }
    
    if (value[0] < 0 || value[0] >= pickerRanges[0].length ||
        value[1] < 0 || value[1] >= pickerRanges[1].length ||
        value[2] < 0 || value[2] >= pickerRanges[2].length) {
      return null;
    }
    
    const yearLabel = pickerRanges[0][value[0]];
    const monthLabel = pickerRanges[1][value[1]];
    const dayLabel = pickerRanges[2][value[2]];

    if (!yearLabel || !monthLabel || !dayLabel) {
      return null;
    }

    const year = parseInt(yearLabel, 10);
    const isLeap = monthLabel.includes('\u95f0');
    const month = calendar.nStr2.indexOf(monthLabel.replace('\u95f0', '').replace('\u6708', '')) + 1;

    if (!year || month < 1) {
      return null;
    }

    return {
      year,
      month,
      day: value[2] + 1,
      isLeap,
    };
  },

  syncLunarPickerWithSolarDate(year, month, day) {
    const lunarDate = calendar.solarToLunar(year, month, day);
    if (!lunarDate) {
      return;
    }

    const yearRange = this.data.lunarPickerRange[0].length ? this.data.lunarPickerRange[0] : this.buildYearRange();
    const monthRange = this.buildLunarMonthRange(lunarDate.lYear);
    const dayRange = this.buildLunarDayRange(lunarDate.lYear, lunarDate.lMonth, lunarDate.isLeap);
    const monthLabel = lunarDate.isLeap
      ? `\u95f0${calendar.formatMonth(lunarDate.lMonth)}`
      : calendar.formatMonth(lunarDate.lMonth);
    const monthIndex = Math.max(monthRange.findIndex((item) => item === monthLabel), 0);
    const pickerValue = [lunarDate.lYear - MIN_SUPPORTED_YEAR, monthIndex, lunarDate.lDay - 1];

    this.setData({
      'lunarPickerRange[0]': yearRange,
      'lunarPickerRange[1]': monthRange,
      'lunarPickerRange[2]': dayRange,
      lunarPickerValue: pickerValue,
      tempLunarPickerValue: pickerValue.slice(),
      selectedLunar: {
        year: lunarDate.lYear,
        month: lunarDate.lMonth,
        day: lunarDate.lDay,
        isLeap: lunarDate.isLeap,
      },
    });
  },

  onLoad() {
    const savedTheme = wx.getStorageSync('theme');
    if (savedTheme) {
      this.setData({ theme: savedTheme });
    }

    let systemInfo = {};
    try {
      const windowInfo = wx.getWindowInfo();
      systemInfo.statusBarHeight = windowInfo.statusBarHeight;
      systemInfo.windowWidth = windowInfo.windowWidth;
    } catch (error) {
      const sysInfo = wx.getWindowInfo();
      systemInfo.statusBarHeight = sysInfo.statusBarHeight;
      systemInfo.windowWidth = sysInfo.windowWidth;
    }

    const menuButton = wx.getMenuButtonBoundingClientRect();
    const navBarHeight = (menuButton.top - systemInfo.statusBarHeight) * 2 + menuButton.height;
    const menuRightPadding = systemInfo.windowWidth - menuButton.left;

    this.setData({
      statusBarHeight: systemInfo.statusBarHeight,
      navBarHeight,
      menuRightPadding,
    });

    wx.nextTick(() => {
      this.initializeCalendar();
    });
  },

  initializeCalendar() {
    const { year, month, day } = this.getSupportedToday();
    this.initYearMonthPicker();
    this.navigateToDate(year, month, day);
    this.onDateTap({ currentTarget: { dataset: { date: { year, month, day, isCurrentMonth: true } } } });
    this.setData({ isLoading: false, isTodayButtonVisible: false });
    this.checkAndShowTermCard(year, month, day);
  },

  checkAndShowTermCard(year, month, day) {
    const lunarDate = calendar.solarToLunar(year, month, day);
    if (!lunarDate || !lunarDate.eventInfo) {
      this.setData({ showTermCard: false, termCardInfo: null });
      return;
    }

    const termEvent = (lunarDate.eventInfo.allEvents || []).find((item) => item.type === 'term');
    if (!termEvent) {
      this.setData({ showTermCard: false, termCardInfo: null });
      return;
    }

    const description = termEvent.description || (lunarDate.termInfo ? lunarDate.termInfo.desc : '');
    this.setData({
      showTermCard: Boolean(description || (lunarDate.termInfo && lunarDate.termInfo.poem)),
      termCardInfo: {
        name: termEvent.name,
        description,
        phenology: termEvent.phenology || [],
        poem: lunarDate.termInfo ? lunarDate.termInfo.poem : '',
      },
    });
  },

  hideTermCard() {
    this.setData({ showTermCard: false });
  },

  navigateBack() {
    wx.navigateBack({ delta: 1 });
  },

  initYearMonthPicker() {
    this.setData({
      'yearMonthPickerRange[0]': this.buildYearRange(),
      'yearMonthPickerRange[1]': this.buildMonthRange(),
    });
  },

  showYearMonthPicker() {
    const { year, month } = this.data;
    this.setData({
      isYearMonthPickerVisible: true,
      yearMonthPickerValue: [year - MIN_SUPPORTED_YEAR, month - 1],
      tempYearMonth: { year, month },
    });
  },

  hideYearMonthPicker() {
    this.setData({ isYearMonthPickerVisible: false });
  },

  onYearMonthPickerChange(e) {
    const value = e.detail.value;
    const year = parseInt(this.data.yearMonthPickerRange[0][value[0]], 10);
    const month = parseInt(this.data.yearMonthPickerRange[1][value[1]], 10);
    this.setData({
      yearMonthPickerValue: value,
      tempYearMonth: { year, month },
    });
  },

  navigateToDate(year, month, day) {
    const safeDay = clampDay(year, month, day);
    const selectedDate = { year, month, day: safeDay };
    const previousMonth = this.getSupportedAdjacentMonth(year, month, -1);
    const nextMonth = this.getSupportedAdjacentMonth(year, month, 1);
    const calendar_list = [
      this.generateCalendar(previousMonth.year, previousMonth.month, selectedDate),
      this.generateCalendar(year, month, selectedDate),
      this.generateCalendar(nextMonth.year, nextMonth.month, selectedDate),
    ];
    const supportedToday = this.getSupportedToday();
    const isCurrentMonth = year === supportedToday.year && month === supportedToday.month;
    const selectedDateDetail = this.getDateDetail(year, month, safeDay);

    this.setData({
      year,
      month,
      day: safeDay,
      calendar_list,
      current_swiper: 1,
      selectedDate,
      selectedDateDetail,
      todayDetail: this.getDateDetail(supportedToday.year, supportedToday.month, supportedToday.day),
      isTodayButtonVisible: !isCurrentMonth,
      showTermCard: false,
      termCardInfo: null,
    });

    this.syncLunarPickerWithSolarDate(year, month, safeDay);
  },

  confirmYearMonthChange() {
    const { year, month } = this.data.tempYearMonth;
    const targetDay = clampDay(year, month, this.data.selectedDate.day || this.data.day || 1);
    this.hideYearMonthPicker();
    this.navigateToDate(year, month, targetDay);
    this.onDateTap({ currentTarget: { dataset: { date: { year, month, day: targetDay, isCurrentMonth: true } } } });
  },

  initLunarPicker() {
    const target = this.data.selectedDate.year ? this.data.selectedDate : this.getSupportedToday();
    this.setData({
      'lunarPickerRange[0]': this.buildYearRange(),
      'lunarPickerRange[2]': DAY_RANGE,
    });
    this.syncLunarPickerWithSolarDate(target.year, target.month, target.day);
  },

  updateLunarPickerMonths(year) {
    this.setData({ 'lunarPickerRange[1]': this.buildLunarMonthRange(year) });
  },

  switchCalendarMode() {
    const newMode = this.data.calendarMode === 'solar' ? 'lunar' : 'solar';
    this.setData({ calendarMode: newMode });
    if (newMode === 'lunar') {
      this.initLunarPicker();
    }
  },

  initCalendar() {
    this.setData({ isLoading: true });
    setTimeout(() => {
      const { year, month, day } = this.getSupportedToday();
      this.navigateToDate(year, month, day);
      this.onDateTap({ currentTarget: { dataset: { date: { year, month, day, isCurrentMonth: true } } } });
      this.setData({
        isLoading: false,
        isTodayButtonVisible: false,
      });
      this.checkAndShowTermCard(year, month, day);
    }, 100);
  },

  getDateDetail(year, month, day) {
    const date = new Date(year, month - 1, day);
    const weekday = this.data.weekdays[date.getDay()];
    const lunarDate = calendar.solarToLunar(year, month, day);

    if (!lunarDate) {
      return {
        lunarDate: '',
        ganzhi: '',
        weekday: `\u661f\u671f${weekday}`,
        suit: [],
        avoid: [],
        allEvents: [],
        highestPriorityEvent: null,
        eventDetail: null,
        termInfo: null,
      };
    }

    const allEvents = lunarDate.eventInfo ? lunarDate.eventInfo.allEvents : [];
    const highestPriorityEvent = lunarDate.eventInfo ? lunarDate.eventInfo.highestPriorityEvent : null;
    const eventDetail = highestPriorityEvent
      ? {
          name: highestPriorityEvent.name,
          type: highestPriorityEvent.type,
          description: highestPriorityEvent.description || null,
          phenology: highestPriorityEvent.phenology || [],
        }
      : null;

    return {
      lunarDate: `${lunarDate.IMonthCn}${lunarDate.IDayCn}`,
      ganzhi: `${lunarDate.gzYear}\u5e74 ${lunarDate.gzMonth}\u6708 ${lunarDate.gzDay}\u65e5`,
      weekday: `\u661f\u671f${weekday}`,
      suit: typeof lunarDate.suit === 'string' ? lunarDate.suit.split(',') : [],
      avoid: typeof lunarDate.avoid === 'string' ? lunarDate.avoid.split(',') : [],
      allEvents,
      highestPriorityEvent,
      eventDetail,
      termInfo: lunarDate.termInfo || null,
    };
  },

  generateCalendar(year, month, selectedDate) {
    if (month === 0) {
      year -= 1;
      month = 12;
    }
    if (month === 13) {
      year += 1;
      month = 1;
    }

    const supportedToday = this.getSupportedToday();
    const firstDay = new Date(year, month - 1, 1);
    const firstDayWeekday = firstDay.getDay();
    const monthDays = new Date(year, month, 0).getDate();
    const days = [];

    const prevMonthDate = new Date(year, month - 1, 0);
    const prevMonthYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth() + 1;
    const prevMonthDays = prevMonthDate.getDate();
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const currentDay = prevMonthDays - i;
      const prevLunar = calendar.solarToLunar(prevMonthYear, prevMonth, currentDay);
      days.push({
        year: prevMonthYear,
        month: prevMonth,
        day: currentDay,
        key: `${prevMonthYear}-${prevMonth}-${currentDay}`,
        isCurrentMonth: false,
        lunar: prevLunar ? prevLunar.IDayCn : '',
        lunarDay: prevLunar ? prevLunar.IDayCn : '',
        gridDisplayType: 'lunar',
        isMajorHoliday: false,
      });
    }

    for (let i = 1; i <= monthDays; i++) {
      days.push(this.createDayObject(year, month, i, supportedToday.year, supportedToday.month, supportedToday.day, selectedDate));
    }

    const nextMonthDate = new Date(year, month, 1);
    const nextMonthYear = nextMonthDate.getFullYear();
    const nextMonth = nextMonthDate.getMonth() + 1;
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextLunar = calendar.solarToLunar(nextMonthYear, nextMonth, i);
      days.push({
        year: nextMonthYear,
        month: nextMonth,
        day: i,
        key: `${nextMonthYear}-${nextMonth}-${i}`,
        isCurrentMonth: false,
        lunar: nextLunar ? nextLunar.IDayCn : '',
        lunarDay: nextLunar ? nextLunar.IDayCn : '',
        gridDisplayType: 'lunar',
        isMajorHoliday: false,
      });
    }

    return { year, month, days };
  },

  createDayObject(year, month, day, todayYear, todayMonth, todayDay, selectedDate) {
    const lunarDate = calendar.solarToLunar(year, month, day) || {
      gridDisplay: '',
      IDayCn: '',
      isMajorHoliday: false,
      gridDisplayType: 'lunar',
      termInfo: null,
    };

    return {
      day,
      month,
      year,
      key: `${year}-${month}-${day}`,
      isCurrentMonth: true,
      isToday: year === todayYear && month === todayMonth && day === todayDay,
      isSelected: Boolean(selectedDate && selectedDate.year === year && selectedDate.month === month && selectedDate.day === day),
      lunar: lunarDate.gridDisplay,
      lunarDay: lunarDate.IDayCn,
      isMajorHoliday: Boolean(lunarDate.isMajorHoliday),
      gridDisplayType: lunarDate.gridDisplayType || 'lunar',
      termInfo: lunarDate.termInfo || null,
    };
  },

  _calculateNextMonth(year, month, diff) {
    if (diff === 1 || diff === -2) {
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    } else {
      month -= 1;
      if (month < 1) {
        month = 12;
        year -= 1;
      }
    }

    if (year < MIN_SUPPORTED_YEAR || (year === MIN_SUPPORTED_YEAR && month < 1)) {
      return null;
    }
    if (year > MAX_SUPPORTED_YEAR || (year === MAX_SUPPORTED_YEAR && month > 12)) {
      return null;
    }

    return { newYear: year, newMonth: month };
  },

  onSwiperChange(e) {
    const { current, source } = e.detail;
    if (source !== 'touch') {
      return;
    }

    const previous = this.data.current_swiper;
    const diff = current - previous;
    const nextMonthData = this._calculateNextMonth(this.data.year, this.data.month, diff);
    if (!nextMonthData) {
      this.setData({ current_swiper: previous });
      return;
    }

    const { newYear, newMonth } = nextMonthData;
    const targetDay = clampDay(newYear, newMonth, this.data.selectedDate.day || 1);
    const selectedDate = { year: newYear, month: newMonth, day: targetDay };
    const previousMonth = this.getSupportedAdjacentMonth(newYear, newMonth, -1);
    const nextMonth = this.getSupportedAdjacentMonth(newYear, newMonth, 1);
    const calendar_list = this.data.calendar_list.slice();
    calendar_list[current] = this.generateCalendar(newYear, newMonth, selectedDate);
    calendar_list[(current + 2) % 3] = this.generateCalendar(previousMonth.year, previousMonth.month, selectedDate);
    calendar_list[(current + 1) % 3] = this.generateCalendar(nextMonth.year, nextMonth.month, selectedDate);

    const supportedToday = this.getSupportedToday();
    const isCurrentMonth = newYear === supportedToday.year && newMonth === supportedToday.month;

    this.setData({
      year: newYear,
      month: newMonth,
      day: targetDay,
      current_swiper: current,
      calendar_list,
      selectedDate,
      selectedDateDetail: this.getDateDetail(newYear, newMonth, targetDay),
      isTodayButtonVisible: !isCurrentMonth,
      showTermCard: false,
      termCardInfo: null,
    });

    this.syncLunarPickerWithSolarDate(newYear, newMonth, targetDay);
  },

  onDateTap(e) {
    const date = e.currentTarget.dataset.date;
    if (!date) {
      return;
    }

    const { year, month, day, isCurrentMonth } = date;
    
    // 如果点击的不是当前月份的日期，自动切换到对应月份
    if (!isCurrentMonth) {
      // 切换到点击日期所在的月份
      this.navigateToDate(year, month, day);
      // 延迟一下再选中日期，确保月份切换完成
      setTimeout(() => {
        this.onDateTap({ currentTarget: { dataset: { date: { year, month, day, isCurrentMonth: true } } } });
      }, 100);
      return;
    }

    const currentCal = this.data.calendar_list[this.data.current_swiper];
    const nextCurrentCal = currentCal && Array.isArray(currentCal.days)
      ? {
          ...currentCal,
          days: currentCal.days.map((item) => (
            item.isCurrentMonth
              ? { ...item, isSelected: item.year === year && item.month === month && item.day === day }
              : item
          )),
        }
      : currentCal;

    this.setData({
      day,
      selectedDate: { year, month, day },
      [`calendar_list[${this.data.current_swiper}]`]: nextCurrentCal,
      selectedDateDetail: this.getDateDetail(year, month, day),
      showTermCard: false,
      termCardInfo: null,
    });

    this.syncLunarPickerWithSolarDate(year, month, day);
  },

  doNothing() {},

  backToToday() {
    this.initCalendar();
  },

  findDateInCalendar(calendarData, year, month, day) {
    return calendarData.days.find((item) => item.isCurrentMonth && item.year === year && item.month === month && item.day === day);
  },

  showLunarPicker() {
    if (!this.data.lunarPickerRange[0].length) {
      this.initLunarPicker();
    }
    this.setData({
      isLunarPickerVisible: true,
      tempLunarPickerValue: this.data.lunarPickerValue.slice(),
    });
  },

  hideLunarPicker() {
    this.setData({ isLunarPickerVisible: false });
  },

  onLunarPickerChange(e) {
    const value = e.detail.value.slice();
    const yearLabel = this.data.lunarPickerRange[0][value[0]];
    const year = parseInt(yearLabel, 10);

    if (!yearLabel || !year) {
      return;
    }

    const monthRange = this.buildLunarMonthRange(year);
    value[1] = Math.min(value[1], monthRange.length - 1);

    const parsed = this.parseLunarPickerValue(value, [
      this.data.lunarPickerRange[0],
      monthRange,
      this.data.lunarPickerRange[2],
    ]);

    if (!parsed) {
      return;
    }

    const dayRange = this.buildLunarDayRange(parsed.year, parsed.month, parsed.isLeap);
    value[2] = Math.min(value[2], dayRange.length - 1);

    this.setData({
      'lunarPickerRange[1]': monthRange,
      'lunarPickerRange[2]': dayRange,
      tempLunarPickerValue: value,
    });
  },

  confirmLunarPicker() {
    const value = this.data.tempLunarPickerValue.slice();
    const parsed = this.parseLunarPickerValue(value);
    if (!parsed) {
      wx.showToast({ title: '\u65e0\u6548\u7684\u519c\u5386\u65e5\u671f', icon: 'none' });
      return;
    }
    const { year, month, day, isLeap } = parsed;
    
    // 增强验证：检查农历日期的有效性
    if (year < MIN_SUPPORTED_YEAR || year > MAX_SUPPORTED_YEAR) {
      wx.showToast({ title: '\u5e74\u4efd\u8d85\u51fa\u652f\u6301\u8303\u56f4', icon: 'none' });
      return;
    }
    
    // 验证闰月
    const leapMonth = calendar.leapMonth(year);
    if (isLeap && leapMonth !== month) {
      wx.showToast({ title: '\u8be5\u5e74\u65e0\u6b64\u95f0\u6708', icon: 'none' });
      return;
    }
    
    // 验证日期范围
    const maxDay = isLeap ? calendar.leapDays(year) : calendar.monthDays(year, month);
    if (day < 1 || day > maxDay) {
      wx.showToast({ title: '\u65e5\u671f\u8d85\u51fa\u8303\u56f4', icon: 'none' });
      return;
    }
    
    const solarDate = calendar.lunarToSolar(year, month, day, isLeap);
    if (!solarDate) {
      wx.showToast({ title: '\u8be5\u519c\u5386\u65e5\u671f\u4e0d\u5b58\u5728', icon: 'none' });
      return;
    }

    this.setData({
      lunarPickerValue: value,
      selectedLunar: { year, month, day, isLeap },
      isLunarPickerVisible: false,
    });

    const solarYear = solarDate.getFullYear();
    const solarMonth = solarDate.getMonth() + 1;
    const solarDay = solarDate.getDate();
    this.navigateToDate(solarYear, solarMonth, solarDay);
    this.onDateTap({ currentTarget: { dataset: { date: { year: solarYear, month: solarMonth, day: solarDay, isCurrentMonth: true } } } });
  },

  onLunarDateChange() {},

  confirmLunarSelection() {
    this.setData({ tempLunarPickerValue: this.data.lunarPickerValue.slice() });
    this.confirmLunarPicker();
    this.setData({ calendarMode: 'solar' });
  },

  // 分享配置
  onShareAppMessage() {
    const { year, month, day } = this.data.selectedDate;
    return {
      title: `万年历 - ${year}年${month}月${day}日`,
      path: '/pages/calendar/index',
      imageUrl: ''
    };
  },

  onShareTimeline() {
    const { year, month, day } = this.data.selectedDate;
    return {
      title: `万年历 - ${year}年${month}月${day}日`
    };
  }
});
