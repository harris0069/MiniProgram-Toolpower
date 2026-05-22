// 自定义日期选择器组件
Component({
  properties: {
    // 当前选中的日期 YYYY-MM-DD
    value: {
      type: String,
      value: ''
    },
    // 最小日期
    minDate: {
      type: String,
      value: '1900-01-01'
    },
    // 最大日期
    maxDate: {
      type: String,
      value: '2100-12-31'
    },
    // 是否显示
    show: {
      type: Boolean,
      value: false
    }
  },

  data: {
    years: [],
    months: [],
    days: [],
    selectedYear: 0,
    selectedMonth: 0,
    selectedDay: 0,
    yearIndex: 0,
    monthIndex: 0,
    dayIndex: 0
  },

  lifetimes: {
    attached() {
      this.initData();
    }
  },

  observers: {
    'value': function(newVal) {
      if (newVal) {
        this.parseDate(newVal);
      }
    },
    'show': function(newVal) {
      if (newVal) {
        this.initData();
      }
    }
  },

  methods: {
    // 初始化数据
    initData() {
      const minDate = new Date(this.data.minDate);
      const maxDate = new Date(this.data.maxDate);
      
      // 生成年份列表
      const years = [];
      for (let year = minDate.getFullYear(); year <= maxDate.getFullYear(); year++) {
        years.push(year);
      }
      
      // 生成月份列表
      const months = [];
      for (let month = 1; month <= 12; month++) {
        months.push(month);
      }
      
      this.setData({ years, months });
      
      // 解析当前日期
      if (this.data.value) {
        this.parseDate(this.data.value);
      } else {
        // 默认今天
        const today = new Date();
        this.setData({
          selectedYear: today.getFullYear(),
          selectedMonth: today.getMonth() + 1,
          selectedDay: today.getDate()
        }, () => {
          this.updateDays();
          this.updateIndexes();
        });
      }
    },

    // 解析日期字符串
    parseDate(dateStr) {
      const [year, month, day] = dateStr.split('-').map(Number);
      this.setData({
        selectedYear: year,
        selectedMonth: month,
        selectedDay: day
      }, () => {
        this.updateDays();
        this.updateIndexes();
      });
    },

    // 更新天数列表
    updateDays() {
      const { selectedYear, selectedMonth } = this.data;
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      
      const days = [];
      for (let day = 1; day <= daysInMonth; day++) {
        days.push(day);
      }
      
      // 如果当前选中的日期超出了该月的天数，调整为最后一天
      let selectedDay = this.data.selectedDay;
      if (selectedDay > daysInMonth) {
        selectedDay = daysInMonth;
      }
      
      this.setData({ days, selectedDay });
    },

    // 更新索引
    updateIndexes() {
      const { years, months, days, selectedYear, selectedMonth, selectedDay } = this.data;
      
      const yearIndex = years.indexOf(selectedYear);
      const monthIndex = months.indexOf(selectedMonth);
      const dayIndex = days.indexOf(selectedDay);
      
      this.setData({
        yearIndex: yearIndex >= 0 ? yearIndex : 0,
        monthIndex: monthIndex >= 0 ? monthIndex : 0,
        dayIndex: dayIndex >= 0 ? dayIndex : 0
      });
    },

    // picker-view 改变事件
    onPickerChange(e) {
      const [yearIndex, monthIndex, dayIndex] = e.detail.value;
      const selectedYear = this.data.years[yearIndex];
      const selectedMonth = this.data.months[monthIndex];
      const selectedDay = this.data.days[dayIndex];
      
      // 检查月份或年份是否改变
      const monthChanged = selectedMonth !== this.data.selectedMonth;
      const yearChanged = selectedYear !== this.data.selectedYear;
      
      this.setData({
        selectedYear,
        selectedMonth,
        selectedDay,
        yearIndex,
        monthIndex,
        dayIndex
      }, () => {
        // 如果年份或月份改变，需要更新天数列表
        if (yearChanged || monthChanged) {
          this.updateDays();
          this.updateIndexes();
        }
      });
    },

    // 确认选择
    onConfirm() {
      const { selectedYear, selectedMonth, selectedDay } = this.data;
      const month = String(selectedMonth).padStart(2, '0');
      const day = String(selectedDay).padStart(2, '0');
      const dateStr = `${selectedYear}-${month}-${day}`;
      
      this.triggerEvent('confirm', { value: dateStr });
      this.onCancel();
    },

    // 取消选择
    onCancel() {
      this.triggerEvent('cancel');
    },

    // 阻止冒泡
    stopPropagation() {}
  }
});
