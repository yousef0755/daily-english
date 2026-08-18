# -*- coding: utf-8 -*-
"""博远英语·春如金卷单元库（老板 2026-08-19 拍的书页逐字转录）。

单一数据源：boyuan-en.html 里的 UNITS 由 build_units_js() 生成后贴入，
音频由 gen_boyuan_audio.py 按同一份数据生成——两头永远一致。

转录规矩：
 · 单词/音标/词性/中文逐字照书（带 * 的是「只认读」，star=True）
 · 词组·短语也进 words，pos 写「词组」，不带音标
 · 例句（eg）是我配的，不在书上：一句话、只用孩子见过的词
 · 一年级上 Unit 12 只拍到半页，没进库——等老板补拍 013-014 页

声线照 8-15 定编：卡片 Ava+Jenny 按卡轮流（例句跟词同声），整课 Ava。
"""

AVA = "en-US-AvaMultilingualNeural"
JENNY = "en-US-JennyNeural"

def W(w, ipa, pos, zh, eg_en, eg_zh, star=False):
    d = {"w": w, "ipa": ipa, "pos": pos, "zh": zh,
         "eg": {"en": eg_en, "zh": eg_zh}}
    if star:
        d["star"] = True
    return d

UNITS = [
 {"key": "1u11", "volume": "一年级上", "unit": 11, "title": "In the zoo", "page": "013",
  "example": "比如：It's a panda. / Is that a tiger?",
  "words": [
    W("monkey", "[ˈmʌŋkɪ]", "n.", "猴子", "The monkey is in the tree.", "猴子在树上。"),
    W("bear", "[beə(r)]", "n.", "熊", "The bear is big.", "熊很大。"),
    W("panda", "[ˈpændə]", "n.", "熊猫", "The panda is black and white.", "熊猫是黑白色的。"),
    W("tiger", "[ˈtaɪgə(r)]", "n.", "老虎", "The tiger can run.", "老虎会跑。"),
  ],
  "sents": [("Is this/that a monkey?", "这／那是猴子吗？", "Is this a monkey? Is that a monkey?"),
            ("No. It's a panda.", "不是。它是一只熊猫。", None)]},

 {"key": "2u1", "volume": "一年级下", "unit": 1, "title": "Look and see", "page": "016",
  "example": "比如：I see a bird. / I see a frog.",
  "words": [
    W("see", "[siː]", "v.", "看见", "I see a bird.", "我看见一只鸟。"),
    W("frog", "[frɒg]", "n.", "青蛙", "The frog is green.", "青蛙是绿色的。"),
    W("rabbit", "[ˈræbɪt]", "n.", "兔子", "The rabbit can jump.", "兔子会跳。"),
    W("bee", "[biː]", "n.", "蜜蜂", "The bee is small.", "蜜蜂小小的。"),
    W("bird", "[bɜːd]", "n.", "鸟", "The bird is in the tree.", "鸟在树上。"),
  ],
  "sents": [("What do you see?", "你（们）看见什么？", None),
            ("I see a panda.", "我看见一只熊猫。", None)]},

 {"key": "2u2", "volume": "一年级下", "unit": 2, "title": "Listen and hear", "page": "016",
  "example": "比如：I hear a dog. / I hear a cat.",
  "words": [
    W("listen", "[ˈlɪsn]", "v.", "听", "Listen! What is it?", "听！это是什么？".replace("это","这"), star=True),
    W("hear", "[hɪə(r)]", "v.", "听见", "I hear a dog.", "我听见一只狗。"),
    W("sheep", "[ʃiːp]", "n.", "绵羊（复数 sheep）", "The sheep is white.", "绵羊是白色的。"),
    W("hen", "[hen]", "n.", "母鸡", "The hen is fat.", "母鸡胖胖的。"),
    W("dog", "[dɒg]", "n.", "狗", "The dog can run.", "狗会跑。"),
    W("cat", "[kæt]", "n.", "猫", "The cat is on the bed.", "猫在床上。"),
    W("home", "[həʊm]", "n.", "家", "The cat is at home.", "猫在家里。", star=True),
  ],
  "sents": [("What do you hear?", "你（们）听见什么？", None),
            ("I hear a pig.", "我听见一只猪（的叫声）。", None)]},

 {"key": "2u3", "volume": "一年级下", "unit": 3, "title": "Taste and smell", "page": "017",
  "example": "比如：Smell the rice. / Taste the egg.",
  "words": [
    W("smell", "[smel]", "v.", "闻（……的气味）", "Smell the flower.", "闻闻这朵花。"),
    W("taste", "[teɪst]", "v.", "尝（……的味道）", "Taste the rice.", "尝尝这米饭。"),
    W("rice", "[raɪs]", "n.", "米饭", "I like rice.", "我喜欢米饭。"),
    W("soup", "[suːp]", "n.", "汤", "The soup is hot.", "汤是热的。"),
    W("egg", "[eg]", "n.", "蛋", "I see an egg.", "我看见一个蛋。"),
    W("noodles", "[ˈnuːdlz]", "n.", "面条", "The noodles are yummy.", "面条很好吃。"),
    W("yummy", "[ˈjʌmɪ]", "adj.", "美味的", "The soup is yummy.", "汤很美味。", star=True),
    W("restaurant", "[ˈrestrɒnt]", "n.", "餐馆", "We eat in a restaurant.", "我们在餐馆吃饭。", star=True),
    W("help", "[help]", "v.", "帮助", "Can you help me?", "你能帮帮我吗？", star=True),
    W("flower", "[ˈflaʊə(r)]", "n.", "花", "The flower is red.", "花是红色的。", star=True),
    W("stand up", "", "词组", "站起来", "Stand up, please.", "请站起来。", star=True),
  ],
  "sents": [("Smell the noodles.", "闻闻这面。", None),
            ("Taste the soup.", "尝尝这汤。", None),
            ("Yummy.", "美味极了。", None)]},

 {"key": "2u4", "volume": "一年级下", "unit": 4, "title": "Toys I like", "page": "019",
  "example": "比如：I like my kite. / It's super.",
  "words": [
    W("toy", "[tɔɪ]", "n.", "玩具", "I like my toy.", "我喜欢我的玩具。", star=True),
    W("like", "[laɪk]", "v.", "喜欢", "I like pandas.", "我喜欢熊猫。"),
    W("ball", "[bɔːl]", "n.", "球", "The ball is big.", "球很大。"),
    W("doll", "[dɒl]", "n.", "玩具娃娃", "The doll is nice.", "娃娃很好看。"),
    W("kite", "[kaɪt]", "n.", "风筝", "My kite is in the sky.", "我的风筝在天上。"),
    W("bicycle", "[ˈbaɪsɪkl]", "n.", "自行车", "I ride my bicycle.", "我骑我的自行车。"),
    W("super", "[ˈsjuːpə(r)]", "adj.", "超级的；顶好的", "My toy is super.", "我的玩具顶好。", star=True),
    W("toy shop", "", "词组", "玩具店", "Let's go to the toy shop.", "我们去玩具店吧。", star=True),
  ],
  "sents": [("I like balls.", "我喜欢球。", None),
            ("It's nice.", "它很好。", None)]},

 {"key": "2u5", "volume": "一年级下", "unit": 5, "title": "Food I like", "page": "020",
  "example": "比如：I like jelly. / One for you.",
  "words": [
    W("food", "[fuːd]", "n.", "食物", "I like this food.", "我喜欢这个食物。", star=True),
    W("sweet", "[swiːt]", "n.", "糖果；adj. 甜的", "The sweet is yummy.", "糖果很好吃。"),
    W("jelly", "[ˈdʒelɪ]", "n.", "果冻", "I like jelly.", "我喜欢果冻。"),
    W("biscuit", "[ˈbɪskɪt]", "n.", "饼干", "One biscuit for you.", "一块饼干给你。"),
    W("teatime", "[ˈtiːtaɪm]", "n.", "茶点时间", "It's teatime!", "茶点时间到了！", star=True),
    W("for", "[fɔː(r)]", "prep.", "给", "This is for you.", "这是给你的。", star=True),
    W("and", "[ænd]", "conj.", "和", "You and me.", "你和我。", star=True),
    W("sorry", "[ˈsɒrɪ]", "int.", "对不起；抱歉", "Sorry, Miss Fang.", "对不起，方老师。", star=True),
    W("very much", "", "词组", "非常", "I like milk very much.", "我非常喜欢牛奶。", star=True),
    W("ice cream", "", "词组", "冰淇淋", "I like ice cream.", "我喜欢冰淇淋。"),
  ],
  "sents": [("Do you like sweets.", "你（们）喜欢糖果吗？", "Do you like sweets?"),
            ("One for you and one for me.", "一个给你一个给我。", None),
            ("I like biscuits very much.", "我非常喜欢饼干。", None)]},

 {"key": "2u6", "volume": "一年级下", "unit": 6, "title": "Drinks I like", "page": "021",
  "example": "比如：I like juice. / Happy birthday!",
  "words": [
    W("drink", "[drɪŋk]", "n.", "饮料", "This drink is sweet.", "这个饮料是甜的。", star=True),
    W("water", "[ˈwɔːtə(r)]", "n.", "水", "I drink water.", "我喝水。"),
    W("cola", "[ˈkəʊlə]", "n.", "可乐", "Cola is sweet.", "可乐是甜的。"),
    W("juice", "[dʒuːs]", "n.", "果汁", "I like juice.", "我喜欢果汁。"),
    W("milk", "[mɪlk]", "n.", "牛奶", "Milk is white.", "牛奶是白色的。"),
    W("birthday", "[ˈbɜːθdeɪ]", "n.", "生日", "Today is my birthday.", "今天是我的生日。", star=True),
    W("party", "[ˈpɑːtɪ]", "n.", "聚会；派对", "Come to my party.", "来我的派对吧。", star=True),
    W("happy", "[ˈhæpɪ]", "adj.", "快乐的", "I am happy today.", "我今天很快乐。", star=True),
    W("song", "[sɒŋ]", "n.", "歌曲", "I like this song.", "我喜欢这首歌。", star=True),
  ],
  "sents": [("What do you like?", "你（们）喜欢什么？", None),
            ("Happy birthday (to you)!", "（祝你）生日快乐！", "Happy birthday to you!")]},

 {"key": "2u7", "volume": "一年级下", "unit": 7, "title": "Seasons", "page": "022",
  "example": "比如：Spring is green. / I like summer.",
  "words": [
    W("season", "[ˈsiːzn]", "n.", "季节", "Which season do you like?", "你喜欢哪个季节？", star=True),
    W("spring", "[sprɪŋ]", "n.", "春天", "Spring is green.", "春天是绿色的。"),
    W("summer", "[ˈsʌmə(r)]", "n.", "夏天", "Summer is hot.", "夏天很热。"),
    W("autumn", "[ˈɔːtəm]", "n.", "秋天", "Autumn is yellow.", "秋天是黄色的。"),
    W("winter", "[ˈwɪntə(r)]", "n.", "冬天", "Winter is white.", "冬天是白色的。"),
    W("white", "[waɪt]", "adj.", "白色的", "The sheep is white.", "绵羊是白色的。"),
    W("grass", "[grɑːs]", "n.", "草", "The grass is green.", "草是绿色的。"),
    W("watermelon", "[ˈwɔːtəmelən]", "n.", "西瓜", "I like watermelon.", "我喜欢西瓜。"),
  ],
  "sents": [("Spring is green.", "春天是绿色的。", None),
            ("Summer is red.", "夏天是红色的。", None),
            ("Autumn is yellow.", "秋天是黄色的。", None),
            ("Winter is white.", "冬天是白色的。", None)]},

 {"key": "2u8", "volume": "一年级下", "unit": 8, "title": "Weather", "page": "023",
  "example": "比如：It's sunny. / Let's go!",
  "words": [
    W("how", "[haʊ]", "adv.", "怎样；如何", "How are you?", "你好吗？"),
    W("weather", "[ˈweðə(r)]", "n.", "天气", "The weather is nice.", "天气很好。"),
    W("cloudy", "[ˈklaʊdɪ]", "adj.", "多云的", "It's cloudy today.", "今天多云。"),
    W("sunny", "[ˈsʌnɪ]", "adj.", "阳光明媚的", "It's sunny today.", "今天阳光明媚。"),
    W("rainy", "[ˈreɪnɪ]", "adj.", "有雨的；多雨的", "It's rainy. I stay at home.", "下雨了，我待在家里。"),
    W("windy", "[ˈwɪndɪ]", "adj.", "有风的；多风的", "It's windy. My kite can fly.", "有风，我的风筝能飞。"),
    W("hot", "[hɒt]", "adj.", "炎热的", "It's hot in Dubai.", "迪拜很热。"),
    W("go", "[gəʊ]", "v.", "去", "Let's go!", "我们走吧！", star=True),
    W("to", "[tuː]", "prep.", "到；向", "I go to school.", "我去上学。", star=True),
    W("beach", "[biːtʃ]", "n.", "沙滩；海滩", "The beach is big.", "沙滩很大。", star=True),
  ],
  "sents": [("How's the weather?", "天气怎么样？", None),
            ("It's cloudy.", "天气多云。", None),
            ("Let's go to the beach.", "我们去沙滩吧。", None)]},

 {"key": "2u9", "volume": "一年级下", "unit": 9, "title": "Clothes", "page": "024",
  "example": "比如：I need a T-shirt. / It's new.",
  "words": [
    W("clothes", "[kləʊðz]", "n.", "衣服", "I like my clothes.", "我喜欢我的衣服。", star=True),
    W("need", "[niːd]", "v.", "需要", "I need water.", "我需要水。"),
    W("new", "[njuː]", "adj.", "新的", "My T-shirt is new.", "我的T恤衫是新的。"),
    W("T-shirt", "[ˈtiːʃɜːt]", "n.", "T 恤衫", "This T-shirt is white.", "这件T恤衫是白色的。"),
    W("dress", "[dres]", "n.", "连衣裙", "The dress is nice.", "这条连衣裙很好看。"),
    W("shorts", "[ʃɔːts]", "n.", "短裤", "I need my shorts.", "我需要我的短裤。"),
    W("blouse", "[blaʊz]", "n.", "女式衬衫", "The blouse is new.", "这件衬衫是新的。"),
    W("don't", "[dəʊnt]", "", "（do 的否定形式）", "I don't like hot weather.", "我不喜欢热天。"),
  ],
  "sents": [("What do you need?", "你（们）需要什么？", None),
            ("I need a new dress.", "我需要一条新连衣裙。", None)]},

 {"key": "2u10", "volume": "一年级下", "unit": 10, "title": "Activities", "page": "025",
  "example": "比如：I can skip. / I play football.",
  "words": [
    W("activity", "[ækˈtɪvətɪ]", "n.", "活动", "I like this activity.", "我喜欢这个活动。", star=True),
    W("ride", "[raɪd]", "v.", "骑（车）", "I can ride a bicycle.", "我会骑自行车。"),
    W("skip", "[skɪp]", "v.", "跳绳", "I can skip.", "我会跳绳。"),
    W("play", "[pleɪ]", "v.", "踢（球）；玩", "I play football.", "我踢足球。"),
    W("fly", "[flaɪ]", "v.", "放（风筝）", "I fly my kite.", "我放我的风筝。"),
    W("playtime", "[ˈpleɪtaɪm]", "n.", "游戏时间", "It's playtime!", "游戏时间到了！", star=True),
    W("football", "[ˈfʊtbɔːl]", "n.", "足球", "The football is new.", "这个足球是新的。", star=True),
    W("rope", "[rəʊp]", "n.", "绳子", "The rope is long.", "绳子很长。", star=True),
  ],
  "sents": [("What can you do?", "你（们）能做什么？", None),
            ("What can she do?", "她会做什么？", None)]},

 {"key": "2u11", "volume": "一年级下", "unit": 11, "title": "New Year's Day", "page": "026",
  "example": "比如：A gift for you. / Happy New Year!",
  "words": [
    W("gift", "[gɪft]", "n.", "礼物", "This gift is for you.", "这个礼物是给你的。"),
    W("card", "[kɑːd]", "n.", "卡片", "I make a card.", "我做一张卡片。"),
    W("firecracker", "[ˈfaɪəkrækə(r)]", "n.", "鞭炮；爆竹", "I hear the firecrackers.", "我听见鞭炮声。"),
    W("firework", "[ˈfaɪəwɜːk]", "n.", "烟花；烟火", "The fireworks are super.", "烟花顶好看。"),
    W("make", "[meɪk]", "v.", "制作", "I make a kite.", "我做一个风筝。", star=True),
    W("write", "[raɪt]", "v.", "写", "I write a card.", "我写一张卡片。", star=True),
    W("fold", "[fəʊld]", "v.", "折", "I fold the paper.", "我把纸折起来。", star=True),
    W("Miss", "[mɪs]", "n.", "小姐", "Good morning, Miss Fang.", "早上好，方小姐。", star=True),
    W("shopping", "[ˈʃɒpɪŋ]", "n.", "购物", "We go shopping.", "我们去购物。", star=True),
    W("new year", "", "词组", "新年", "The new year is coming.", "新年就要到了。", star=True),
  ],
  "sents": [("Happy New Year (to you)!", "（祝你）新年快乐！", "Happy New Year to you!")]},

 {"key": "2u12", "volume": "一年级下", "unit": 12, "title": "A boy and a wolf", "page": "027",
  "example": "比如：Help! / Where's the wolf?",
  "words": [
    W("boy", "[bɔɪ]", "n.", "男孩", "The boy can run.", "男孩会跑。"),
    W("wolf", "[wʊlf]", "n.", "狼（复数 wolves）", "The wolf is bad.", "狼是坏的。"),
    W("farmer", "[ˈfɑːmə(r)]", "n.", "农夫", "The farmer has a dog.", "农夫有一只狗。"),
    W("narrator", "[nəˈreɪtə(r)]", "n.", "旁白；叙述者", "The narrator tells the story.", "旁白讲这个故事。", star=True),
    W("come", "[kʌm]", "v.", "来", "Come here!", "过来！", star=True),
    W("where", "[weə(r)]", "adv.", "哪里", "Where is my cat?", "我的猫在哪里？", star=True),
    W("bad", "[bæd]", "adj.", "坏的", "The wolf is bad.", "狼是坏的。", star=True),
    W("poor", "[pʊə(r)]", "adj.", "可怜的", "The poor boy is sad.", "可怜的男孩很难过。", star=True),
    W("tell", "[tel]", "v.", "说；告诉", "Tell me, please.", "请告诉我。", star=True),
    W("lie", "[laɪ]", "n.", "谎话；谎言", "Don't tell a lie.", "不要说谎。", star=True),
    W("run away", "", "词组", "逃跑", "The wolf runs away.", "狼逃跑了。", star=True),
  ],
  "sents": [("Help!", "救命！", None),
            ("Here come the farmers.", "农民们来了。", None),
            ("Where's the wolf?", "狼在哪里？", None),
            ("Don't tell a lie!", "不要说谎！", None),
            ("A poor boy.", "一个可怜的男孩。", None)]},
]

import re
def slug(w):
    return re.sub(r"[^a-z0-9]+", "_", w.lower()).strip("_")

def build_units_js():
    """生成贴进 boyuan-en.html 的 UNITS 字面量。"""
    import json
    out = {}
    for u in UNITS:
        words = []
        for i, w in enumerate(u["words"]):
            d = {"n": i + 1, "w": w["w"], "ipa": w["ipa"], "pos": w["pos"],
                 "zh": w["zh"], "eg": w["eg"], "f": slug(w["w"])}
            if w.get("star"):
                d["star"] = True
            words.append(d)
        out[u["key"]] = {
            "volume": u["volume"], "unit": u["unit"], "title": u["title"],
            "page": u["page"], "example": u["example"], "words": words,
            "sentences": [{"n": i + 1, "en": s[0], "zh": s[1]}
                          for i, s in enumerate(u["sents"])]}
    return json.dumps(out, ensure_ascii=False, indent=1)

if __name__ == "__main__":
    print(build_units_js()[:500])
    print("units:", len(UNITS), "words:", sum(len(u["words"]) for u in UNITS))
