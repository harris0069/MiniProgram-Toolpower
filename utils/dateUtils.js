
/**
 * @fileoverview lunar calendar
 * @author meizz, modified by Trae
 * @version 2024.05.20
 * @description
 * 1. 农历相关
 * 2. 公历/农历互转
 * 3. 节日、节气、优先级处理
 */

const solarTermsData = {
  '立春': { poem: '春日春盘细生菜，忽忆两京梅发时。', desc: '东风解冻，蛰虫始振，鱼陟负冰。' },
  '雨水': { poem: '好雨知时节，当春乃发生。', desc: '獭祭鱼，鸿雁来，草木萌动。' },
  '惊蛰': { poem: '微雨众卉新，一雷惊蛰始。', desc: '桃始华，仓庚鸣，鹰化为鸠。' },
  '春分': { poem: '仲春初四日，春色正中分。', desc: '玄鸟至，雷乃发声，始电。' },
  '清明': { poem: '清明时节雨纷纷，路上行人欲断魂。', desc: '桐始华，田鼠化为鴽，虹始见。' },
  '谷雨': { poem: '谷雨春光晓，山川黛色青。', desc: '萍始生，鸣鸠拂其羽，戴胜降于桑。' },
  '立夏': { poem: '夏早日初长，南风草木香。', desc: '蝼蝈鸣，蚯蚓出，王瓜生。' },
  '小满': { poem: '夜莺啼绿柳，皓月醒长空。', desc: '苦菜秀，靡草死，麦秋至。' },
  '芒种': { poem: '时雨及芒种，四野皆插秧。', desc: '螳螂生，鹏始鸣，反舌无声。' },
  '夏至': { poem: '绿筠尚含粉，圆荷始散芳。', desc: '鹿角解，蝉始鸣，半夏生。' },
  '小暑': { poem: '倏忽温风至，因循小暑来。', desc: '温风至，蟋蟀居宇，鹰始鸷。' },
  '大暑': { poem: '赤日几时过，清风无处寻。', desc: '腐草为萤，土润溽暑，大雨时行。' },
  '立秋': { poem: '一叶梧桐一报秋，稻花田里话丰收。', desc: '凉风至，白露生，寒蝉鸣。' },
  '处暑': { poem: '离离暑云散，袅袅凉风起。', desc: '鹰乃祭鸟，天地始肃，禾乃登。' },
  '白露': { poem: '露从今夜白，月是故乡明。', desc: '鸿雁来，玄鸟归，群鸟养羞。' },
  '秋分': { poem: '平分秋色一轮满，长伴云衢千里明。', desc: '雷始收声，蛰虫坯户，水始涸。' },
  '寒露': { poem: '袅袅凉风动，凄凄寒露零。', desc: '鸿雁来宾，雀入大水为蛤，菊有黄华。' },
  '霜降': { poem: '霜降水返壑，风落木归山。', desc: '豺乃祭兽，草木黄落，蛰虫咸俯。' },
  '立冬': { poem: '细雨生寒未有霜，庭前木叶半青黄。', desc: '水始冰，地始冻，雉入大水为蜃。' },
  '小雪': { poem: '小雪才过大雪前，萧萧风雨纸窗穿。', desc: '虹藏不见，天气上升地气下降，闭塞而成冬。' },
  '大雪': { poem: '忽如一夜春风来，千树万树梨花开。', desc: '鹖鴠不鸣，虎始交，荔挺出。' },
  '冬至': { poem: '天时人事日相催，冬至阳生春又来。', desc: '蚯蚓结，麋角解，水泉动。' },
  '小寒': { poem: '小寒连大吕，欢鹊垒新巢。', desc: '雁北乡，鹊始巢，雉始雊。' },
  '大寒': { poem: '大寒雪未消，闭户不能出。', desc: '鸡始乳，征鸟厉疾，水泽腹坚。' }
};

var calendar = {
  lunarInfo: [
    0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2, // 1900-1909
    0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977, // 1910-1919
    0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970, // 1920-1929
    0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950, // 1930-1939
    0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557, // 1940-1949
    0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5d0, 0x14573, 0x052d0, 0x0a9a8, 0x0e950, 0x06aa0, // 1950-1959
    0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0, // 1960-1969
    0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b5a0, 0x195a6, // 1970-1979
    0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570, // 1980-1989
    0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0, // 1990-1999
    0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, // 2000-2009
    0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930, // 2010-2019
    0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530, // 2020-2029
    0x05aa0, 0x076a3, 0x096d0, 0x04bd7, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, // 2030-2039
    0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, // 2040-2049
  ],
  solarMonth: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
  Gan: ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"],
  Zhi: ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"],
  Animals: ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"],
  nStr1: ['日', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'],
  nStr2: ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'],
  nStr3: ['日', '一', '二', '三', '四', '五', '六'],

  // 节气数据
  // 20世纪(1901-2000)的节气数据, 用于计算
  sTermInfo: [
    [20.84, 5.40, 20.12, 4.81, 19.46, 4.09, 19.81, 4.38, 20.25, 5.02, 20.53, 5.52, 20.88, 6.32, 21.23, 6.93, 21.53, 7.34, 21.74, 7.38, 21.74, 7.18, 21.62, 6.85],
    [19.84, 4.41, 19.12, 3.83, 18.48, 3.11, 18.83, 3.40, 19.28, 4.04, 19.55, 4.54, 19.90, 5.34, 20.25, 5.95, 20.55, 6.36, 20.76, 6.40, 20.76, 6.20, 20.64, 5.88]
  ],
  solarTermNames: ["小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨", "立夏", "小满", "芒种", "夏至", "小暑", "大暑", "立秋", "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至"],
  solarTerms: {
    "立春": {
      description: "立春，为二十四节气之首，标志着春季的开始。此时天气回暖，万物复苏。",
      phenology: ["一候东风解冻", "二候蛰虫始振", "三候鱼陟负冰"]
    },
    "春分": {
      description: "春分，是春季九十天的中分点，昼夜等长。此后北半球白昼渐长，黑夜渐短。",
      phenology: ["一候玄鸟至", "二候雷乃发声", "三候始电"]
    },
    "立夏": {
      description: "立夏，是夏季的第一个节气，表示盛夏时节的正式开始。此时气温显著升高，雷雨增多。",
      phenology: ["一候蝼蝈鸣", "二候蚯蚓出", "三候王瓜生"]
    },
    "夏至": {
      description: "夏至，是北半球一年中白昼最长的一天。标志着炎热夏日的到来。",
      phenology: ["一候鹿角解", "二候蝉始鸣", "三候半夏生"]
    },
    "立秋": {
      description: "立秋，预示着炎热的夏天即将过去，秋天即将来临。所谓“早立秋凉飕飕，晚立秋热死牛”。",
      phenology: ["一候凉风至", "二候白露生", "三候寒蝉鸣"]
    },
    "秋分": {
      description: "秋分，同春分一样，昼夜等长。此后北半球昼短夜长。",
      phenology: ["一候雷始收声", "二候蛰虫坯户", "三候水始涸"]
    },
    "立冬": {
      description: "立冬，表示冬季自此开始。万物收藏，规避寒冷。",
      phenology: ["一候水始冰", "二候地始冻", "三候雉入大水为蜃"]
    },
    "冬至": {
      description: "冬至，是北半球一年中白昼最短的一天，古代民间有“冬至大如年”的说法。",
      phenology: ["一候蚯蚓结", "二候麋角解", "三候水泉动"]
    }
    // 其他节气信息可按需补充
  },

  // 节日数据
  // 优先级: 农历节日(1) > 节气(2) > 公历节日(3)
  lunarFestivals: {
    "1-1": { name: "春节", priority: 1, major: true, description: "农历正月初一，是中国最重要、最盛大的传统节日，象征着新的一年的开始。" },
    "1-15": { name: "元宵节", priority: 1, description: "农历正月十五，是春节后的第一个重要节日，有赏花灯、吃汤圆、猜灯谜等习俗。" },
    "2-2": { name: "龙抬头", priority: 1 },
    "5-5": { name: "端午节", priority: 1, major: true, description: "农历五月初五，为纪念爱国诗人屈原而设，有赛龙舟、吃粽子等习俗。" },
    "7-7": { name: "七夕节", priority: 1, description: "农历七月初七，又称“乞巧节”，是中国的情人节，源于牛郎织女的传说。" },
    "7-15": { name: "中元节", priority: 1 },
    "8-15": { name: "中秋节", priority: 1, major: true, description: "农历八月十五，是家人团聚的节日，有赏月、吃月饼的习俗。" },
    "9-9": { name: "重阳节", priority: 1 },
    "12-8": { name: "腊八节", priority: 1 },
    "12-23": { name: "小年", priority: 1 },
    // 除夕需要动态计算
  },
  solarFestivals: {
    "1-1": { name: "元旦", priority: 3, description: "公历1月1日，世界上多数国家通称的“新年”。" },
    "2-14": { name: "情人节", priority: 3 },
    "3-8": { name: "妇女节", priority: 3 },
    "3-12": { name: "植树节", priority: 3 },
    "4-1": { name: "愚人节", priority: 3 },
    "5-1": { name: "劳动节", priority: 3 },
    "5-4": { name: "青年节", priority: 3 },
    "6-1": { name: "儿童节", priority: 3 },
    "7-1": { name: "建党节", priority: 3 },
    "8-1": { name: "建军节", priority: 3 },
    "9-10": { name: "教师节", priority: 3 },
    "10-1": { name: "国庆节", priority: 3, major: true, description: "中华人民共和国的法定假日，为庆祝国家成立而设立。" },
    "12-24": { name: "平安夜", priority: 3 },
    "12-25": { name: "圣诞节", priority: 3 },
  },

  // 十二建星
  jianchuOrder: ["建", "除", "满", "平", "定", "执", "破", "危", "成", "收", "开", "闭"],
  jianchu: {
    "建": { yi: "出行,上任,会友,上书,见工", ji: "动土,开仓,嫁娶,掘井" },
    "除": { yi: "除服,疗病,出行,拆卸,入宅", ji: "求官,上任,开张,搬家,探病" },
    "满": { yi: "祈福,祭祀,结亲,开市,交易", ji: "服药,栽种,下葬,赴任,祈祷" },
    "平": { yi: "祭祀,修填,涂泥,余事勿取", ji: "移徙,入宅,嫁娶,开市,安葬" },
    "定": { yi: "交易,立券,会友,签约,纳畜", ji: "种植,置业,卖田,掘井,造船" },
    "执": { yi: "祈福,祭祀,求子,结婚,立约", ji: "开市,交易,搬家,远行" },
    "破": { yi: "求医,赴考,祭祀,余事勿取", ji: "出行,嫁娶,开市,会友" },
    "危": { yi: "经营,交易,求官,纳畜,动土", ji: "登高,行船,安床,入宅,博彩" },
    "成": { yi: "祈福,入学,开市,求医,成亲", ji: "诉讼,安葬,搬家,出行" },
    "收": { yi: "祭祀,求财,签约,嫁娶,订盟", ji: "开市,安床,安葬,入宅" },
    "开": { yi: "疗病,结婚,交易,入学,求职", ji: "安葬,动土,针灸" },
    "闭": { yi: "祭祀,祈福,静养,安葬", ji: "开市,交易,出行,搬家" }
  },

  // ================= 核心转换函数 =================

  solarToLunar: function(year, month, date) {
    if (year < 1900 || year > this.getSupportedEndYear()) { return null; }
    var i, leap = 0, temp = 0;
    var offset = (Date.UTC(year, month - 1, date) - Date.UTC(1900, 0, 31)) / 86400000;
    for (i = 1900; i < this.getSupportedEndYear() + 1 && offset > 0; i++) {
      temp = this.yearDays(i);
      offset -= temp;
    }
    if (offset < 0) {
      offset += temp;
      i--;
    }

    var lunarYear = i;
    leap = this.leapMonth(i);
    var isLeap = false;

    for (i = 1; i < 13 && offset > 0; i++) {
      if (leap > 0 && i == (leap + 1) && isLeap == false) {
        --i;
        isLeap = true;
        temp = this.leapDays(lunarYear);
      } else {
        temp = this.monthDays(lunarYear, i);
      }
      if (isLeap == true && i == (leap + 1)) isLeap = false;
      offset -= temp;
    }

    if (offset == 0 && leap > 0 && i == leap + 1) {
      if (isLeap) {
        isLeap = false;
      } else {
        isLeap = true;
        --i;
      }
    }
    if (offset < 0) {
      offset += temp;
      --i;
    }

    var lunarMonth = i;
    var lunarDate = offset + 1;

    var sm = month - 1;
    var gzY = this.Gan[(lunarYear - 4) % 10] + this.Zhi[(lunarYear - 4) % 12];
    var gzM = this.Gan[(year * 12 + month + 3) % 10] + this.Zhi[(sm + 5) % 12];
    var gzD = this.Gan[((Date.UTC(year, sm, 1) / 86400000) + 25576 + date - 1) % 10] + this.Zhi[((Date.UTC(year, sm, 1) / 86400000) + 25576 + date + 11) % 12];

    // 获取建除十二神数据
    const dayZhi = gzD.substring(1);
    const jianchuData = this.getJianchu(lunarMonth, dayZhi);
    
    var lunarObj = {
      lYear: lunarYear,
      lMonth: lunarMonth,
      lDay: lunarDate,
      animal: this.Animals[(lunarYear - 4) % 12],
      IMonthCn: (isLeap ? '闰' : '') + this.formatMonth(lunarMonth),
      IDayCn: this.formatDay(lunarDate),
      cYear: year,
      cMonth: month,
      cDay: date,
      gzYear: gzY,
      gzMonth: gzM,
      gzDay: gzD,
      isLeap: isLeap,
      suit: jianchuData.yi, // 宜
      avoid: jianchuData.ji // 忌
    };

    // 获取节日和节气信息
    var eventInfo = this.getEventInfo(lunarObj);
    lunarObj.eventInfo = eventInfo;

    // 为日历网格显示优化
    if (eventInfo.highestPriorityEvent) {
      const event = eventInfo.highestPriorityEvent;
      lunarObj.gridDisplay = event.name;
      lunarObj.gridDisplayType = event.type;
      lunarObj.isMajorHoliday = (event.type === 'lunar' && ['春节', '元宵节', '端午节', '七夕节', '中秋节', '重阳节', '除夕'].includes(event.name)) ||
                                (event.type === 'solar' && ['元旦', '国庆节'].includes(event.name));
    } else {
      lunarObj.gridDisplay = lunarObj.IDayCn;
      lunarObj.gridDisplayType = 'lunar';
      lunarObj.isMajorHoliday = false;
    }

    var termEvent = eventInfo.allEvents.find(function(e) { return e.type === 'term'; });
    lunarObj.termInfo = termEvent ? (solarTermsData[termEvent.name] || null) : null;

    return lunarObj;
  },

  lunarToSolar: function(year, month, date, isLeapMonth) {
    isLeapMonth = isLeapMonth || false;
    var leap = this.leapMonth(year);
    var daysInMonth = isLeapMonth ? this.leapDays(year) : this.monthDays(year, month);

    if (year < 1900 || year > this.getSupportedEndYear()) { return null; }
    if (isLeapMonth && leap === 0) { return null; }
    if (isLeapMonth && month !== leap) { return null; }
    if (date < 1 || date > daysInMonth) { return null; }

    var offset = 0;
    for (var i = 1900; i < year; i++) {
      offset += this.yearDays(i);
    }

    for (var i = 1; i < month; i++) {
      if (leap > 0 && i === leap + 1) {
        offset += this.leapDays(year);
      }
      offset += this.monthDays(year, i);
    }

    if (isLeapMonth) {
      offset += this.monthDays(year, month);
    }
    
    offset += date;
    var solarDate = new Date(1900, 0, 31);
    solarDate.setDate(solarDate.getDate() + offset - 1);
    return solarDate;
  },

  // ================= 节日节气相关 =================

  /**
   * 获取指定日期的节气和节日信息
   * @param {Object} lunarObj `solarToLunar`函数返回的农历对象
   * @return {Object} 包含所有事件和最高优先级事件的对象
   */
  getEventInfo: function(lunarObj) {
    var allEvents = [];
    
    // 1. 计算节气
    var termName = this.getTermName(lunarObj.cYear, lunarObj.cMonth, lunarObj.cDay);
    if (termName) {
      var termDetail = this.solarTerms[termName] || {};
      var termInfo = solarTermsData[termName] || {};
      allEvents.push({
        name: termName,
        priority: 2,
        type: 'term',
        description: termDetail.description || termInfo.desc || null,
        phenology: termDetail.phenology || []
      });
    }

    // 2. 计算农历节日
    var lunarFestivalKey = `${lunarObj.lMonth}-${lunarObj.lDay}`;
    if (!lunarObj.isLeap && this.lunarFestivals[lunarFestivalKey]) {
      allEvents.push({ ...this.lunarFestivals[lunarFestivalKey], type: 'lunar' });
    }
    // 特殊处理：除夕
    if (!lunarObj.isLeap && this.monthDays(lunarObj.lYear, 12) === lunarObj.lDay && lunarObj.lMonth === 12) {
        allEvents.push({ name: '除夕', priority: 1, major: true, type: 'lunar', description: '农历年的最后一天，家家户户准备迎接新年。' });
    }

    // 3. 计算公历节日
    var solarFestivalKey = `${lunarObj.cMonth}-${lunarObj.cDay}`;
    if (this.solarFestivals[solarFestivalKey]) {
      allEvents.push({ ...this.solarFestivals[solarFestivalKey], type: 'solar' });
    }

    if (allEvents.length === 0) {
      return { allEvents: [], highestPriorityEvent: null };
    }

    // 按优先级排序
    allEvents.sort((a, b) => a.priority - b.priority);

    return {
      allEvents: allEvents,
      highestPriorityEvent: allEvents[0]
    };
  },

  /**
   * 获取某公历日期的节气名称
   * @param {Number} year 公历年份
   * @param {Number} month 公历月份
   * @param {Number} day 公历日期
   * @return {String|null} 节气名称或null
   */
  getTermName: function(year, month, day) {
    // 遍历所有24个节气
    for (var i = 0; i < 24; i++) {
      var termDate = this.getTermDate(year, i);
      if (termDate.getMonth() + 1 === month && termDate.getDate() === day) {
        return this.solarTermNames[i];
      }
    }
    return null;
  },

  /**
   * 获取某年的第n个节气的确切日期
   * @param {Number} year 公历年份
   * @param {Number} n 节气索引 (0-23)
   * @return {Date} 节气的日期对象
   */
  getTermDate: function(year, n) {
    var century = year <= 2000 ? 0 : 1;
    var C = this.sTermInfo[century][n];
    var Y = (year % 100);
    var L = Y === 0 ? 0 : Math.floor(Y / 4);
    var date = (Y * 0.2422 + C) - L;
    
    var termDay = Math.floor(date);
    
    // 1月和2月的节气需要特殊处理
    var baseMonth = (n < 2) ? 1 : (Math.floor(n / 2) + 1);
    
    var d = new Date(year, baseMonth - 1, termDay, 0, 0, 0);

    // 简单的偏移修正，实际算法更复杂，这里做近似处理
    var offset = (Date.UTC(year, d.getMonth(), d.getDate()) - Date.UTC(year, 0, 1)) / 86400000;
    var solarTermDayOfYear = [5, 20, 36, 51, 66, 81, 96, 111, 127, 142, 157, 172, 187, 203, 218, 233, 248, 263, 278, 293, 308, 323, 338, 353];
    var diff = offset - solarTermDayOfYear[n];
    
    // 粗略修正，如果计算出的日期和经验日期差距过大，进行调整
    if (Math.abs(diff) > 2) {
        d.setDate(d.getDate() - Math.round(diff/2));
    }

    return d;
  },

  // ================= 辅助函数 =================

  getJianchu: function(lunarMonth, dayZhi) {
    const monthZhiOrder = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"];
    const monthZhi = monthZhiOrder[lunarMonth - 1];
    
    const dayZhiIndex = this.Zhi.indexOf(dayZhi);
    const monthZhiIndex = this.Zhi.indexOf(monthZhi);

    if (dayZhiIndex === -1 || monthZhiIndex === -1) {
        return { yi: "", ji: "" };
    }

    const jianchuIndex = (dayZhiIndex - monthZhiIndex + 12) % 12;
    const jianchuName = this.jianchuOrder[jianchuIndex];
    
    return this.jianchu[jianchuName];
  },

  getSupportedEndYear: function() { return 1900 + this.lunarInfo.length - 1; },
  leapMonth: function(year) { return (this.lunarInfo[year - 1900] & 0xf); },
  yearDays: function(year) {
    var i, sum = 348;
    for (i = 0x8000; i > 0x8; i >>= 1) { sum += (this.lunarInfo[year - 1900] & i) ? 1 : 0; }
    return (sum + this.leapDays(year));
  },
  leapDays: function(year) {
    if (this.leapMonth(year)) { return ((this.lunarInfo[year - 1900] & 0x10000) ? 30 : 29); }
    return (0);
  },
  monthDays: function(year, month) { return ((this.lunarInfo[year - 1900] & (0x10000 >> month)) ? 30 : 29); },
  isLeapYear: function(year) { return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0); },
  formatDay: function(day) {
    const nStr1 = this.nStr1;
    if (day === 1) return '初一';
    if (day === 10) return '初十';
    if (day === 20) return '二十';
    if (day === 30) return '三十';

    if (day > 1 && day < 10) {
      return '初' + nStr1[day];
    } else if (day > 10 && day < 20) {
      return '十' + nStr1[day % 10];
    } else if (day > 20 && day < 30) {
      return '廿' + nStr1[day % 10];
    }
    return '';
  },
  formatMonth: function(month) { return this.nStr2[month - 1] + '月'; },
};

calendar.solarTermMinutes = [
  0, 21208, 42467, 63836, 85337, 107014,
  128867, 150921, 173149, 195551, 218072, 240693,
  263343, 285989, 308563, 331033, 353350, 375494,
  397447, 419210, 440795, 462224, 483532, 504758
];

calendar.getTermDate = function(year, n) {
  var baseUtc = Date.UTC(1900, 0, 6, 2, 5);
  var offset = 31556925974.7 * (year - 1900) + this.solarTermMinutes[n] * 60000;
  var utcDate = new Date(baseUtc + offset);
  var termMonth = Math.floor(n / 2);
  var termDay = utcDate.getUTCDate();

  return new Date(year, termMonth, termDay);
};

module.exports = {
  calendar: calendar
}
