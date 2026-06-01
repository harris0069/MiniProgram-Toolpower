// base64 WAV 音效数据（由 Node.js 生成，50ms tick + 400ms win）
const TICK_BASE64 = 'UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAAAc5OTj4x0eHh4e4uHh4eHgICAhId/f397e3iMjIyMk3Nzc3CUlJSYm2tra2dnZKCgoKCnX19fXKioqKysr1dXU1CwtLS0t09LS0tIvLy8wMNDQ0M/PzzIyMjIzzc3NzTQ0NDU1NcvLyso2Nzc3N8nIyMjIxzk5Ojo6xsbFxTs8PDw8xMPDw8PCPj4/P8HBwcDAQEFBQUG/vr6+vr1DQ0REvLy8u7u7RkZGRke5ubm5SEhISUlJt7e2trZLS0tLtbS0tLRNTU1OTk6ysrGxsVBQUFCwr6+vr1JSUlNTra2trKysVVVVVVaqqqqqV1dXWFhYqKinp6daWlpapqWlpaVcXFxdXaOjo6Kiol9fX19goKCgoGFhYWJinp6enZ1jZGRkZJybm5ubmmZmZ2eZmZmYmJhpaWlpapaWlpZra2tsbJSUlJOTbW5ubm5vkZGRkZBwcHFxcY+Pjo5yc3Nzc42MjIyMdXV1dnZ2ioqJiXd4eHh4eYeHh4eHenp7e4WFhYSEfH19fX2DgoKCgn9/f4CA';
const WIN_BASE64 = 'UklGRqQMAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YYAMAACAgICAgIGBgYCAgH9/f35/f3+AgYGCgoOCgoGAf359fXx9fX6AgYOEhIWEg4KAfn17e3p7fH6AgoSFhoaGhIKAfnt6eXl5e32Ag4aHiIiHhYJ/fHp4d3d4e36BhYiKioqIhYJ+end1dXV4e3+Dh4qMjIuJhYB8eHVzc3V4fIGGio2OjoyIg355dXJxcnV5foSJjZCQjouGgHp1cW9vcnZ8goiNkZKRjoiCe3Vwbm1vdHqBh42SlJOQi4R9dnBsa21xeH+HjpOVlZKNhX12b2tpa292foeOlJeXlI6HfnVuaWhpbnV+h4+VmZmVj4d9dGxoZmhtdX6IkZebmpaPhnxyamVkZ212gIqTmp2cl46EeW9oY2NmbniDjZacnpyWjYF2bGRhYmdwe4eSmp+gnJSJfXFnYV9iaXN/jJeeoqCakYR3bGNeXmNseIaSnKKjn5eLfnBlXlxfZnKAjZmipaOckYN1aF9aW2JseomWoKamoZaJemtgWlleaHWEk5+nqKSajX1uYVlXW2RxgZGep6qnnpCAcGJZVVhhbn+PnaesqaCTgnFjWFRWX2x9jp6orauilINyYldSVF1rfY+fqq+so5WDcWFVUVNdbH6QoaywraOUgW5eU09TXW2Ak6Susq6ikX5rW1BOU19whJinsbOtoI55ZlZOTVRidYqdrLS0q5yIc2BSS01XZ3yRpLG2s6eVgGtZTUlOW2+Fmqu2t7ChjXZhUUlJUmN4j6SyubarmIJrV0pGS1lthZutuLqyoox1Xk5FR1Fke5Ootry4qpZ9ZlJGREtccouitL28sZ6FbFdIQkdVa4SdsLy+tqSMcltJQUNQZX6YrrzAuamSd15LQEFMYHqUrLzCvK2Ve2BMQD9JXXaSqrzDvq+YfWJMPz1HW3WRqrzEwLGZfWFLPjxGWnWSrL7FwbGYfF9JPDtGW3eUrsDHwbCWeVxGOjpHXnqYssPIwK2SdFdCODpJYoCet8bJv6mMbVE+NjxNaIimvcnJu6OEZUo5NT5UcZGuw8zHtZp6WkI1NUNcfJy4yc3DrY5tTzoyOEtoianBzcy8oYBfRDQyP1d3mbbJz8awknBROzI3SmeIqMHNzLyhgF9ENDNAWXmbt8nOxK2ObE45MjlObI6txM7Jtpp4WD8zNUZhgqO9zMy+o4NhRjUzQFh5mrfJzcOrjGpMOTM8UnGTscbNxrGTcVI8MzlNaoysw83ItZh2Vj8zN0lmh6jAzMm4nHpaQTQ2R2OEpb7MyrqefVxCNTZGYYOkvsvKup99XEM1NkZhg6S+y8q6nnxcQjU3R2OFpb/LybicellBNThJZoiowMzHtZh2Vj40Ok1rjazDzMWxknBRPDQ8UnGTscbMwquLaUw5NUBZeZu3yMq9o4JhRjc3RmGDpL3KyLeaeFhANTpOa46tw8vDro9sTjo1QFh4mrbIyryigWBFNzhIZIanv8rGs5VyUz01PVRzlbPGyr6lhWNHODhHYoSlvsrGs5VzUz02PlR0lrTGyb2jgmBGNzlKZoipwMrEr5BtTzs3Qlp7nbnIyLicellBNzxRb5KwxMm+poVjRzg5SWaIqMDJw66ObE47N0Rdf6C7yMa0lnRUPjdAV3eZtsbHuJ17WkI3PVJxk7HEyLyigF9FODtObI+uw8i+pYVjRzk6TGmLq8HIv6iHZUk6OkpnianAyMCpiWdKOjpKZoipwMjAqYlnSjo6SmaJqcDIv6iIZko6O0toi6rByL6mhWNIOjxNa46twse8o4JgRjk9UW+SsMPHuZ99XEM5P1V1l7TFxbWZd1ZAOUNbfJ65xsOwkm9RPTpHYoSlvcfAqYlnSjs8TWuNrcHGuqF/XkU6QFV1l7TExLOWdFQ/OkZfgaK7xsCqimhLPDxOa46twca5nn1cQzpCWXmbt8XCr5BuUD08SmaJqb/Gu6KBX0Y7QVZ3mbXEwrCSb1E+PEpmiKm/xbuhgF5FO0JYeJu2xMGuj2xPPT1Nao2swMS3nHpaQztFXn+husW+qIdlSjxAU3OVssPCsZNxUj89S2iKqr/EuJ17WkM8RV6AobrEvaaFY0g8QVd3mbXDwK2Na04+P1Fvka/BwrKVclNAPUxoi6q/w7abeFhCPUhjhaa8xLmffl1FPEZfgKG6w7ujgmBHPURbfJ64w7ymhWNJPUNZepy3w72oh2VKPUJYeJq2wr6oiGZLPkJYeJq1wr6oiGZLPkNYeJq1wr2oh2VKPkNZepy2wrymhWNJPkRbfJ64wrujgmFHPkZegKG5wrmgfl1GPklihKW7wrabeVlDP0xniqm+wbKWc1RBQFBukK6/v62PbE9AQlZ1l7PBvKeHZUo/Rl1+n7jBuJ9+XUY/SmWHp7zAspZ0VUJBUW+Rr7++q4xpTUBEWnqctsG5oYBfRz9KZIanvMCylnNUQkJTcZOwv7yoiGZLQEdef6C4wLacellEQU9sjqy+vquNak5BRVt7nbbAt558XEZBTmqMq72+rI5rT0FFW3udtsC2nXtbRUFPbI6svr2qi2lNQUdef6C4v7SZd1dEQlNxk7C+uqWEY0pBS2SGpru+rpFvUkJFWnqctb+2nHtaRkJRb5GuvrqmhmRLQUtlhqa7va2QblFCR1x9nra+s5l3V0VEVXSWsb64oH9eSEJQbI6svbunh2VMQktlh6e6vKyOa1BDSF+Aobi9sJRxVERGW3uctb6zmHZXRUVXdpizvbWce1tGRFRylLC9t59+XkhEUm+Rrry4ooFgSUNRbY+tvLijg2JKQ1Brjqu8uaSEY0tDT2uNq7u5pIRjS0RQa42ru7mkhGNLRFBsjqu7uKODYkpEUW2PrLu3oYFgSUVTcJKuvLaffl5IRVVzlbC8tJx6W0dGWHeYsryymHZYRkhbe5y0u6+TcVRFSmCBobe6q41sUEVNZYemubmmh2VNRVFsjqu6tqCAX0pGVnOVsLuymXhZR0hcfJ20uq2Rb1NGTGSFpLi5p4hmTUZRbY6rurWefV1JR1h3mLK6r5RzVUZLYYKit7moiWhORlFsjqu5tJ59XUlIWnmasrqtknBURk1lhqW3t6SEY0xHVXKUr7qxl3ZYSEtggaG2uKeJZ09HU26QrLmymnlaSUpefp+0uKiLaVBHUm2Pq7mym3lbSUpefp+0uKiKaE9HU2+QrLmxmXdZSUxhgaG1t6WGZU5IVnOUr7iulHNWSE5mh6W3taCAYEtJW3masriqjWtRSFJtj6u4sZh3WUlNY4OitbWig2JNSVp4mbG3qo5sUkhTbY+rt7CXdllJTmSFpLa0oIBgTEtdfJyytqeJaFBJV3OUrreskXBUSVJrjam3sJh3WkpOZYWktbOefl9MTF9+nrO1o4VkTkpaeJmwtqiLalFKV3OUrrarkG9USlRuj6u2rpRzV0pRaouotrCYd1pLUGeHpbWxm3tcS05khKO0sp19X0xNYoGhs7OfgGBNTWB/n7OzoIFiTk1ffp6ys6GCY05NXn2dsrOig2NOTV59nbKzooNjTk1ffZ2ys6GCY05NX36esrOggWJOTmGAn7Kyn39gTk5igqCzsZ19X01PZYSis7CaelxNUWeHpbSul3daTFNri6e0rJNzWExVb4+qtKqPb1VMWHOUrLSnimpSTVt4mK+zo4VlUE5gfp2xsZ5/YE5QZYWisq6YeFtNU2uLp7OrkXFXTVdyk6uzpopqU05depqvsqCCY1BQY4Khsq+ZeVxOU2uLp7OqkHBWTVl0lKyypIdnUk9gfp2wsJx9X09SaYmlsquSclhOWHOTq7Kkh2hST2B+nbCvm3xeT1NqiqayqZBwVk5bdpatsaGDZFFRZIOhsa2WdltOV3CQqbGliWlTUGB+na+umnteT1VsjKexp41tVU9ee5qur5x+YFBUaoqlsaiOblZPXXqZra+dfmFQVGqKpbGojm5WUF56ma2unH1gUFVsi6awpoxtVVBgfZuurZl6XlBXb46osKSIaVRRY4Gfr6uVdltQWnSTqq+ggmRSVGiHo7Coj29XUV97mq2tmXtfUVdwj6ivooZoVFNmhKGvqZFyWVFdeZisrZp8YFFXb46nr6KGaFRTZoWhr6iQcVhRX3uZrayYel5RWXKRqa6fgmVTVWqJpK+li2xWU2SBnq6pknNaUl56mKysmXpfUlpykaiunoFkU1Zsi6Wuo4hqVVRnhaCupo5vWFNif5ytqZN1W1JeeZerq5h6X1JbdJOprJx/YlNYcI6mrZ+DZlRXbIqkraKHaVZVaIahraSLbFdUZoOfraaOb1lUYw==';

const SCENES = [
  {
    id: 'eat',
    name: '今天吃什么',
    icon: '🍔',
    desc: '吃饭选择困难症',
    ui: {
      bgGradient: ['#FFF5F5', '#FFFFFF'],
      accentColor: '#FF6B6B',
      wheelColors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'],
      pointerColor: '#FF4444',
    },
    options: [
      '黄焖鸡米饭', '麻辣烫', '酸菜鱼', '宫保鸡丁盖饭',
      '牛肉拉面', '炸鸡', '鱼香肉丝盖饭', '麻辣香锅',
      '照烧鸡腿饭', '炒河粉', '卤肉饭', '番茄炒蛋盖饭',
      '重庆小面', '黑椒牛柳盖饭', '水煮肉片', '咖喱鸡肉饭',
      '肉夹馍', '煲仔饭', '可乐鸡翅', '酸辣土豆丝',
      '毛血旺', '葱油拌面', '地三鲜', '寿司',
      '糖醋里脊', '老鸭粉丝汤', '回锅肉盖饭', '披萨',
      '干煸四季豆', '羊肉串', '汉堡', '剁椒鱼头',
      '手撕包菜', '韭菜鸡蛋饺子', '孜然羊肉盖饭', '番茄肥牛汤饭',
      '青椒肉丝盖饭', '炸酱面', '小笼包', '土豆炖牛肉',
      '韩式炸鸡', '麻婆豆腐盖饭', '花甲粉', '扬州炒饭',
      '白切鸡', '烤鸭', '酸豆角肉末拌面', '日式猪排饭',
      '蛋炒饭', '牛肉板面', '酸辣粉', '鸡公煲',
      '肉末茄子盖饭', '过桥米线', '番茄鸡蛋面', '红烧牛肉面',
      '葱爆羊肉盖饭', '梅菜扣肉盖饭', '虾仁滑蛋饭', '铁板鱿鱼',
      '炒刀削面', '大盘鸡', '牛肉粉丝汤', '麻辣拌',
      '石锅拌饭', '韩式冷面', '奥尔良鸡腿饭', '芝士焗饭',
      '牛肉炒乌冬', '蒜苔肉丝盖饭', '辣子鸡丁盖饭', '东坡肉',
      '隆江猪脚饭', '三鲜豆皮', '热干面', '担担面',
      '豌杂面', '肠粉', '烧鹅饭', '叉烧饭',
      '脆皮五花肉饭', '鱿鱼炒饭', '菠萝炒饭', '海鲜炒面',
      '酸汤肥牛', '黑椒意面', '肉酱意面', '煎饼果子',
      '烤冷面', '牛肉锅贴', '生煎包', '鲜肉馄饨',
      '韭菜盒子', '砂锅豆腐丸子', '冒菜', '烤鱼',
      '香辣蟹', '小龙虾盖饭', '蟹黄拌面', '佛跳墙',
    ],
  },
  {
    id: 'weekend',
    name: '周末去哪玩',
    icon: '🎮',
    desc: '周末不再无聊',
    ui: {
      bgGradient: ['#F0F4FF', '#FFFFFF'],
      accentColor: '#4ECDC4',
      wheelColors: ['#4ECDC4', '#45B7D1', '#96CEB4', '#6C5CE7', '#A29BFE', '#FD79A8'],
      pointerColor: '#00B894',
    },
    options: [
      '爬山', '逛植物园', '去动物园看动物', '古镇一日游',
      '博物馆', '美术馆看画展', '打卡网红书店', '逛公园野餐',
      '沿江/湖骑行', '游乐园', '看电影', '沉浸式戏剧/剧本杀',
      '真人CS', '室内攀岩', '保龄球', '台球厅',
      '逛宜家', '花鸟市场', '逛购物中心', '泡温泉/汗蒸',
      '茶馆/咖啡店发呆', '手工DIY', '逛大学校园', '老街散步',
      '话剧或脱口秀', 'KTV', '电玩城', '密室逃脱',
      '湖泊划船', '采摘园', '河边钓鱼', '宠物咖啡馆',
      '逛大型书城', '寺庙祈福赏景', '观景台看日落', '逛早市/菜市场',
      '听相声或评书', '卡丁车', '羽毛球/网球', '游泳馆游泳',
      '屋顶酒吧吹风', '科技馆互动展项', '名人故居旧址', '郊外放风筝',
      '弓箭对战', '桌游吧', '家居生活馆', '教堂/清真寺参观',
      '农场喂小动物', '自驾水库或风车公路',
    ],
  },
  {
    id: 'truth',
    name: '真心话大冒险（温情版）',
    icon: '💝',
    desc: '温暖走心的真心话大冒险',
    ui: {
      bgGradient: ['#FFF0F5', '#FFFFFF'],
      accentColor: '#FF69B4',
      wheelColors: ['#FFB6C1', '#FFD700', '#98FB98', '#87CEEB', '#DDA0DD', '#FFDAB9', '#AFEEEE', '#FFC0CB'],
      pointerColor: '#FF69B4',
    },
    options: [
      '最近一次感到被爱是什么时候？',
      '给在场最年长的人一个拥抱。',
      '心中最温暖的家庭记忆是什么？',
      '真心夸赞左边的人三个优点。',
      '从小到大，谁对你影响最大？',
      '给不在场的亲人发一句"我想你了"。',
      '最近偷偷做过的暖心小事是什么？',
      '为大家倒一杯温水，并说一句祝福。',
      '理想中的"完美一天"是怎样的？',
      '对右边的人说一句一直想感谢的话。',
      '小时候最舍不得扔掉的东西是什么？',
      '唱一首妈妈最喜欢的歌的前两句。',
      '最像家里哪位长辈的性格？',
      '给每人一个虚拟的"礼物"，说出来。',
      '上次开怀大笑是因为什么？',
      '模仿一个小动物逗大家笑。',
      '心中友谊最美好的样子是什么？',
      '主动整理一下大家的杯子或桌面。',
      '有什么小事能让你心情变好？',
      '称赞对面的人今天的穿着或笑容。',
      '人生中收到印象最深的礼物？',
      '扶着某人走一小段路。',
      '最近哪本书或电影让你热泪盈眶？',
      '讲一个小时候听过的睡前故事片段。',
      '最喜欢的季节和理由是什么？',
      '帮身边的人捏捏肩膀。',
      '做过最童心未泯的一件事是什么？',
      '对窗外说"今天天气真好"。',
      '觉得被理解是什么样的感觉？',
      '和左边的人击掌说"合作愉快"。',
      '心中最温暖的晚安仪式是什么？',
      '站起来伸懒腰，对大家说"辛苦了"。',
      '曾因别人的幸福而幸福吗？举例。',
      '把自己的椅子让给站着的人。',
      '最喜欢的童年味道是什么食物？',
      '用手指比一个爱心对着大家。',
      '上一次对家人说"我爱你"是什么时候？',
      '拍拍离你最远的人的肩。',
      '觉得"陪伴"最好的形式是怎样的？',
      '描述记忆中最美的天空。',
      '害怕失去什么？（温暖方向回答）',
      '对所有人说："有你们在，真好。"',
      '心里最柔软的一处地方是什么？',
      '分享一块手边的小零食给大家。',
      '最喜欢别人如何安慰你？',
      '口头上赞美一个人的头发或眼睛。',
      '最近学到的一个让自己变好的小习惯。',
      '帮一个人把水杯加满水。',
      '心中"家"最重要的元素是什么？',
      '闭眼十秒，回想一个安心的画面。',
      '做过最勇敢的一件温柔的事？',
      '给一位朋友发语音说"你今天很棒"。',
      '希望五年后的自己和现在有何不同？',
      '模仿一种花的姿态。',
      '身上最可爱的一点是什么？',
      '收拾一下大家脚下的杂物。',
      '生命中第一次感到"被保护"是何时？',
      '对右边的人微笑保持三秒。',
      '更喜欢给予还是接受？为什么？',
      '夸一夸某人的鞋子或配饰。',
      '觉得最浪漫的一件事是什么？',
      '把凳子挪近某人说"我想离你近一点"。',
      '心中最理想的"和解"方式是什么？',
      '倒一杯水双手递给需要的人。',
      '做过最无私的事情是什么？',
      '说出每个人让你感到舒服的一个特点。',
      '保留最久的朋友是怎么认识的？',
      '分享相册里最温馨的一张照片。',
      '觉得"被倾听"重要吗？最近一次是？',
      '用方言说一句"大家都要好好的"。',
      '最想感谢自己的哪一点？',
      '合掌默念一个对大家的祝福。',
      '心中最能代表"治愈"的颜色和物品？',
      '给左边的人比一个大拇指。',
      '曾经原谅过谁？感觉如何？',
      '站起来转一圈，说"我在这里"。',
      '更喜欢日出还是日落？为什么？',
      '假装帮别人擦汗。',
      '最重要的朋友特质前三名是什么？',
      '给大家看手机屏保并解释意义。',
      '最近一次因为感动而鼻酸是何时？',
      '拥抱一下自己，说"你辛苦了"。',
      '什么样的人会让你觉得温暖？',
      '替右边的人说一个优点，看着他说。',
      '小时候最信任的人是谁？现在呢？',
      '倒着走三步，转身对大家笑。',
      '有没有一直想道歉但没开口的人？',
      '对离你最远的人抛一个飞吻。',
      '心中最宝贵的"无用之物"是什么？',
      '摸一下另一个人的头发或手背。',
      '觉得自己在朋友眼中是怎样的存在？',
      '给大家倒一轮饮料。',
      '最喜欢的一个拥抱是什么样子的？',
      '靠在旁边的人肩上五秒钟。',
      '希望别人因为什么而记住你？',
      '说一个希望所有人今天开心的理由。',
      '做过最纯真的小举动是什么？',
      '用手比"OK"指指眼睛，表示"我看到你"。',
      '觉得"温柔"最重要的一种表现是什么？',
      '对所有人说："下次还一起玩，好不好？"',
    ],
  },
  {
    id: 'lolita',
    name: 'Lolita',
    icon: '🎀',
    desc: '今天穿哪一套小裙子',
    ui: {
      bgGradient: ['#FFF0F5', '#FFFFFF'],
      accentColor: '#FF69B4',
      wheelColors: ['#FF69B4', '#DDA0DD', '#FFB6C1', '#DB7093', '#FFC0CB', '#EE82EE', '#F0A0D0', '#FF85A2'],
      pointerColor: '#C71585',
    },
    options: [
      '甜系Lolita', '古典系Lolita', '哥特系Lolita', '中华风Lolita',
      '花嫁Lolita', '海军风Lolita', '蒸汽朋克Lolita', '和风Lolita',
      '棋盘格Lolita', '刺绣款Lolita', '贝壳边OP', '高腰JSK',
      '背带JSK', '法式袖衬衫', '蕾丝开衫', '南瓜裤',
      '衬裙', '裙撑', '素鸡后背', '拖尾纱',
      '腰封', '背后大蝴蝶结', '手套（短款）', '手套（长款）',
      '蕾丝扇', '洋伞', '提篮包', '贝壳包',
      '颈链（choker）', '大腿袜', '玛丽珍鞋', '方头中跟鞋',
      '松糕厚底鞋', '波奈特', '大蝴蝶结发箍', '小礼帽',
      '贝雷帽', '边夹（KC）', '发带', '绢花头饰',
      '丝绒大花', '水晶发梳', '烧蓝发夹', '水果主题边夹',
      '动物耳朵发箍', '天使翅膀背包', '玫瑰念珠', '羽毛扇',
      '丝绒长手套', '编织草帽', '心形锁包', '天使之翼项链',
      '滴胶甜点挂饰', '马卡龙色系搭配', '莫兰迪色系搭配', '黑甜系',
      '搞死系', '蕾丝眼罩', '睡裙风内搭', '手袖',
      '发网', '玳瑁眼镜框（装饰）', '单片眼镜（蒸汽朋克）', '面具（半脸）',
      '锁骨链', '臂钏', '手腕铃铛', '斗篷（毛绒）',
      '羽织（和风Lolita）',
    ],
  },
];

Page({
  data: {
    mode: 'list',
    scenes: SCENES,

    currentScene: SCENES[0],
    currentOptions: [],
    currentColors: [],
    bgGradient: '',
    pointerColor: '',

    isSpinning: false,
    showResult: false,
    resultDisplay: '请转动转盘',
    optionsExpanded: true,
    winningIndex: -1,
  },

  canvas: null,
  ctx: null,
  dpr: 1,
  canvasSize: 0,
  rotation: 0,
  animFrameId: null,
  lastTickSector: -1,
  particles: [],
  particleAnimId: null,

  onLoad() {
  },

  onReady() {
    if (this.data.mode !== 'list') {
      this.initCanvas();
    }
  },

  onBack() {
    if (this.data.mode === 'list') {
      wx.navigateBack();
    } else {
      this.backToList();
    }
  },

  toggleOptions() {
    this.setData({ optionsExpanded: !this.data.optionsExpanded });
  },

  backToList() {
    this.cancelAnim();
    this.stopParticles();
    this.setData({ mode: 'list' });
    this.canvas = null;
    this.ctx = null;
  },

  enterScene(e) {
    const id = e.currentTarget.dataset.id;
    const scene = SCENES.find(s => s.id === id);
    if (!scene) return;

    const options = [...scene.options];
    if (options.length > 200) options.length = 200;

    this.cancelAnim();
    this.stopParticles();
    this.lastTickSector = -1;
    this.rotation = 0;

    this.setData({
      mode: 'wheel',
      currentScene: scene,
      currentOptions: options,
      currentColors: [...scene.ui.wheelColors],
      bgGradient: `linear-gradient(180deg, ${scene.ui.bgGradient[0]}, ${scene.ui.bgGradient[1]})`,
      pointerColor: scene.ui.pointerColor,
      showResult: false,
      resultDisplay: '请转动转盘',
      isSpinning: false,
      winningIndex: -1,
    }, () => {
      this.initCanvas();
    });
  },

  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#wheelCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0]) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getWindowInfo().pixelRatio;
        const w = res[0].width;
        const h = res[0].height;
        const size = Math.min(w, h);
        if (size <= 0) return;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.scale(dpr, dpr);
        this.canvas = canvas;
        this.ctx = ctx;
        this.dpr = dpr;
        this.canvasSize = size;
        this.drawRotatedWheel(0);
      });
  },

  drawRotatedWheel(rotationDeg) {
    const ctx = this.ctx;
    if (!ctx) return;
    const size = this.canvasSize;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 12;
    const options = this.data.currentOptions || [];
    const colors = this.data.currentColors || [];
    const n = options.length;
    if (n < 2) return;

    ctx.save();
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // --- 旋转的扇形区域 ---
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotationDeg * Math.PI / 180);
    ctx.translate(-cx, -cy);

    const slice = (2 * Math.PI) / n;

    for (let i = 0; i < n; i++) {
      const start = -Math.PI / 2 + i * slice;
      const end = start + slice;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();

      const mid = start + slice / 2;
      const tx = cx + Math.cos(mid) * radius * 0.72;
      const ty = cy + Math.sin(mid) * radius * 0.72;

      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(mid + Math.PI / 2);

      const maxLen = Math.min(6, Math.max(3, Math.floor(36 / n * 8)));
      const text = options[i].length > maxLen ? options[i].slice(0, maxLen) + '..' : options[i];
      const fontSize = n > 10 ? Math.max(9, Math.floor(220 / n)) : (n > 6 ? 18 : 22);
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 4;
      ctx.fillStyle = '#fff';
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }

    // 径向高光渐变（中心亮边缘暗的立体感）
    const hl = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    hl.addColorStop(0, 'rgba(255,255,255,0.25)');
    hl.addColorStop(0.5, 'rgba(255,255,255,0.05)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.fill();

    ctx.restore(); // restore rotation

    // --- 外圈装饰环（不旋转） ---
    const dotCount = Math.max(36, n * 2);
    for (let i = 0; i < dotCount; i++) {
      const a = (i / dotCount) * 2 * Math.PI;
      const dotR = radius > 100 ? 4 : 3;
      const dotDist = radius + 4;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * dotDist, cy + Math.sin(a) * dotDist, dotR, 0, 2 * Math.PI);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)';
      ctx.fill();
    }

    // --- 中心轮毂（金属质感圆点） ---
    const hubR = Math.max(8, radius * 0.10);
    const hubGrad = ctx.createRadialGradient(cx, cy - hubR * 0.3, 0, cx, cy, hubR);
    hubGrad.addColorStop(0, '#ffffff');
    hubGrad.addColorStop(0.6, '#eeeeee');
    hubGrad.addColorStop(1, '#aaaaaa');
    ctx.beginPath();
    ctx.arc(cx, cy, hubR, 0, 2 * Math.PI);
    ctx.fillStyle = hubGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // --- 画布指针（顶部向下，不随转盘旋转） ---
    this.drawPointer(ctx, cx, cy, radius);

    // --- 粒子层（仅绘制，更新由 drawParticles 驱动） ---
    if (this.data.showResult && this.particles.length > 0) {
      for (const p of this.particles) {
        this.drawParticle(ctx, p);
      }
    }

    ctx.restore(); // restore main save
  },

  drawPointer(ctx, cx, cy, radius) {
    const ptrLen = radius * 0.18;
    const ptrW = ptrLen * 0.45;
    const ptrTip = cy - radius - 4;
    const baseY = ptrTip + ptrLen;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 6;

    const ptrColor = this.data.pointerColor || '#FF4444';
    const grad = ctx.createLinearGradient(cx, ptrTip, cx, baseY);
    grad.addColorStop(0, this.lightenColor(ptrColor, 30));
    grad.addColorStop(1, ptrColor);

    ctx.beginPath();
    ctx.moveTo(cx, baseY + ptrW * 0.5);
    ctx.lineTo(cx - ptrW, ptrTip + ptrLen * 0.3);
    ctx.lineTo(cx - ptrW * 0.4, ptrTip);
    ctx.lineTo(cx + ptrW * 0.4, ptrTip);
    ctx.lineTo(cx + ptrW, ptrTip + ptrLen * 0.3);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  },

  drawParticle(ctx, p) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation * Math.PI / 180);
    const s = p.size;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.6, -s * 0.35);
    ctx.lineTo(s, 0);
    ctx.lineTo(s * 0.6, s * 0.35);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.6, s * 0.35);
    ctx.lineTo(-s, 0);
    ctx.lineTo(-s * 0.6, -s * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  lightenColor(hex, percent) {
    if (!hex || hex === 'transparent') return '#ffffff';
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return `rgb(${R},${G},${B})`;
  },

  playTick() {
    const ctx = wx.createInnerAudioContext();
    ctx.src = 'data:audio/wav;base64,' + TICK_BASE64;
    ctx.play();
  },

  playWin() {
    const ctx = wx.createInnerAudioContext();
    ctx.src = 'data:audio/wav;base64,' + WIN_BASE64;
    ctx.play();
  },

  createParticles() {
    const colors = this.data.currentColors || [];
    const size = this.canvasSize;
    const cx = size / 2;
    const cy = size / 2;
    const count = 60;
    this.particles = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const speed = 2 + Math.random() * 7;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        gravity: 0.06 + Math.random() * 0.04,
        life: 1,
        decay: 0.008 + Math.random() * 0.015,
        size: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
      });
    }
  },

  drawParticles() {
    if (!this.ctx || !this.canvas) return;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.vy += p.gravity;
      p.y += p.vy;
      p.life -= p.decay;
      p.rotation += p.rotationSpeed;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    this.drawRotatedWheel(this.rotation);

    if (this.particles.length > 0) {
      this.particleAnimId = setTimeout(() => this.drawParticles(), 16);
    }
  },

  stopParticles() {
    if (this.particleAnimId) {
      clearTimeout(this.particleAnimId);
      this.particleAnimId = null;
    }
    this.particles = [];
  },

  startSpin() {
    if (this.data.isSpinning) return;
    const n = this.data.currentOptions.length;
    if (n < 2) {
      wx.showToast({ title: '至少需要2个选项', icon: 'none' });
      return;
    }

    this.cancelAnim();
    this.stopParticles();

    this.setData({
      isSpinning: true,
      showResult: false,
      resultDisplay: '转动中...',
      winningIndex: -1,
    });

    this.lastTickSector = -1;

    const totalSpin = 2000 + Math.random() * 1500;
    const startRotation = this.rotation;
    const endRotation = startRotation + totalSpin;
    const duration = 5000;
    const startTime = Date.now();
    const canvas = this.canvas;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      this.rotation = startRotation + totalSpin * ease;
      this.drawRotatedWheel(this.rotation);
      this.tickEffect(this.rotation, n);

      if (t < 1) {
        if (canvas && canvas.requestAnimationFrame) {
          this.animFrameId = canvas.requestAnimationFrame(animate);
        } else {
          this.animFrameId = setTimeout(animate, 16);
        }
      } else {
        this.rotation = endRotation;
        this.drawRotatedWheel(this.rotation);
        this.onSpinEnd(n);
      }
    };

    if (canvas && canvas.requestAnimationFrame) {
      this.animFrameId = canvas.requestAnimationFrame(animate);
    } else {
      this.animFrameId = setTimeout(animate, 16);
    }
  },

  tickEffect(rotation, n) {
    const anglePerSector = 360 / n;
    const normalized = ((360 - (rotation % 360)) % 360 + 360) % 360;
    const sector = Math.floor(normalized / anglePerSector);

    if (sector !== this.lastTickSector) {
      this.lastTickSector = sector;
      try { wx.vibrateShort({ type: 'light' }); } catch (e) {}
      this.playTick();
      const result = this.data.currentOptions[sector];
      this.setData({
        resultDisplay: result,
      });
    }
  },

  onSpinEnd(n) {
    const anglePerSector = 360 / n;
    const normalized = ((360 - (this.rotation % 360)) % 360 + 360) % 360;
    const idx = Math.floor(normalized / anglePerSector);
    const result = this.data.currentOptions[idx];

    this.setData({
      isSpinning: false,
      showResult: true,
      resultDisplay: result,
      winningIndex: idx,
    });

    this.createParticles();
    this.drawParticles();
    this.playWin();

    try { wx.vibrateShort({ type: 'medium' }); } catch (e) {}
  },

  cancelAnim() {
    if (this.animFrameId) {
      if (this.canvas && this.canvas.cancelAnimationFrame) {
        this.canvas.cancelAnimationFrame(this.animFrameId);
      } else {
        clearTimeout(this.animFrameId);
      }
      this.animFrameId = null;
    }
  },

  onUnload() {
    this.cancelAnim();
    this.stopParticles();
  },

  onShareAppMessage() {
    return {
      title: '转盘决策 - 选择困难症的救星',
      path: '/pages/wheel-decision/index',
    };
  },

  onShareTimeline() {
    return { title: '转盘决策 - 选择困难症的救星' };
  },
});
