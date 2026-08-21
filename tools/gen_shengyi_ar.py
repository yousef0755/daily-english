# -*- coding: utf-8 -*-
# 「做生意」站的做生意场景·海湾口语阿拉伯语：真人神经女声(ar-AE-Fatima·阿联酋)预生成 MP3
# 单一出处：这份数据同时产出 audio/a<id>.mp3 和 phrases.js（页面直接引用）。
# 内容以广泛通用、我有把握的海湾商务阿语为主；口语标记见 reg 字段；建议上线后请本地人复核一遍。
import asyncio, json, pathlib
import edge_tts

VOICE = "ar-AE-FatimaNeural"
ROOT = pathlib.Path(__file__).resolve().parent.parent / "shengyi"
OUT = ROOT / "audio"
OUT.mkdir(parents=True, exist_ok=True)

# 每个 pack = 一天一个做生意场景。item: ar 阿语 / tr 罗马音(海湾口语读法) / zh 中文释义
PACKS = [
 {"scene":"见面寒暄", "intro":"第一次见客户，先把气氛聊热，别急着谈货。", "items":[
   {"ar":"السلام عليكم","tr":"as-salaamu 'alaykum","zh":"你好（愿平安降临你）—— 见谁都能说的万能问候"},
   {"ar":"وعليكم السلام ورحمة الله","tr":"wa 'alaykum as-salaam wa rahmatullah","zh":"你也平安（对方问候你时的回应）"},
   {"ar":"مرحبا، حياك الله","tr":"marhaba, hayyaak allah","zh":"欢迎你，很高兴见到你（热情招呼）"},
   {"ar":"شخبارك؟","tr":"shakhbaarak?","zh":"你最近怎么样？（海湾口语；对女士说 shakhbaarich）"},
   {"ar":"الحمد لله، بخير","tr":"al-hamdu lillah, bi-khair","zh":"挺好的，感谢真主"},
   {"ar":"تفضل","tr":"tfaddal","zh":"请（请坐 / 请进 / 给你）—— 对女士说 tfaddali"},
 ]},
 {"scene":"介绍开场", "intro":"介绍你是谁、卖什么，一两句说清就好。", "items":[
   {"ar":"أنا من شركة سو للجوالات","tr":"ana min sharikat Su lil-jawwaalaat","zh":"我是苏氏手机公司的（换成你的公司名）"},
   {"ar":"نبيع جوالات وإكسسوارات","tr":"nibee' jawwaalaat wa iksiswaaraat","zh":"我们卖手机和配件"},
   {"ar":"بضاعتنا زينة والسعر مناسب","tr":"bidaa'atna zaina was-si'r munaasib","zh":"我们的货好，价格也合适"},
   {"ar":"تحب أوريك العينات؟","tr":"thibb awarreek al-'ayyinaat?","zh":"想让我给你看看样品吗？"},
   {"ar":"هذا الكتالوج، على راحتك","tr":"haadha al-kataloj, 'ala raahtak","zh":"这是目录，你慢慢看"},
   {"ar":"إن شاء الله نتعامل","tr":"in shaa' allah nit'aamal","zh":"希望我们能合作（托靠真主）"},
 ]},
 {"scene":"问价", "intro":"问价是生意的开始。海湾口语里问多少钱有好几种说法。", "items":[
   {"ar":"بكم هذا؟","tr":"bikam haadha?","zh":"这个多少钱？（通用）"},
   {"ar":"بيش هذا؟","tr":"beesh haadha?","zh":"这个多少钱？（很海湾的口语说法）"},
   {"ar":"كم السعر؟","tr":"kam as-si'r?","zh":"价格是多少？"},
   {"ar":"كم حق الحبة؟","tr":"kam hagg al-habba?","zh":"一件多少钱？（حق = 的；حبة = 一个/一件）"},
   {"ar":"بكم لو أخذت كمية؟","tr":"bikam law akhadht kammiya?","zh":"要一批的话多少钱？"},
   {"ar":"هذا شامل الضريبة؟","tr":"haadha shaamil ad-dareeba?","zh":"这个含税吗？"},
 ]},
 {"scene":"砍价还价", "intro":"砍价是这里做生意的日常，语气要熟不要冲。", "items":[
   {"ar":"غالي واجد","tr":"ghaali waajid","zh":"太贵了（واجد = 很，海湾口语；也说 waayid）"},
   {"ar":"آخر سعر كم؟","tr":"aakhir si'r kam?","zh":"最低多少钱？（最后的价）"},
   {"ar":"نزّل شوي","tr":"nazzil shwayy","zh":"便宜点儿吧（降一点）"},
   {"ar":"عطني خصم زين","tr":"'atni khasm zain","zh":"给我个好折扣"},
   {"ar":"والله ما ينفع","tr":"wallah ma yinfa'","zh":"这价真做不了（诚恳地拒绝）"},
   {"ar":"طيب، نص نص","tr":"tayyib, nuss nuss","zh":"好吧，各让一半（折中）"},
 ]},
 {"scene":"报价与让步", "intro":"报价要稳，让步要有交换，不白让。", "items":[
   {"ar":"سعري ثابت وعدل","tr":"si'ri thaabit wa 'adl","zh":"我的价实在、公道"},
   {"ar":"ما أقدر أنزّل أكثر","tr":"ma agdar anazzil akthar","zh":"我不能再降了"},
   {"ar":"إذا زدت الكمية أنزّل لك","tr":"idha zidt al-kammiya anazzil lak","zh":"你加量，我就给你降"},
   {"ar":"هذا أفضل شي أقدر أسويه","tr":"haadha afdal shay agdar asawweeh","zh":"这是我能做到的最好价了"},
   {"ar":"بسعر كذا، بس عشانك","tr":"bi-si'r kidha, bass 'ashaanak","zh":"就这个价，看在你面子上"},
   {"ar":"خلها بيني وبينك","tr":"khalliha baini w bainak","zh":"这价你我之间就好（别外传，给你特惠）"},
 ]},
 {"scene":"成交", "intro":"谈到位就收口，别让它一直飘着。", "items":[
   {"ar":"خلاص، اتفقنا","tr":"khalaas, ittafaqna","zh":"好，成交/说定了"},
   {"ar":"تمام، نمشي فيه","tr":"tamaam, nimshi feeh","zh":"行，就这么办"},
   {"ar":"أبي أطلب كمية","tr":"abi atlub kammiya","zh":"我要订一批（أبي = 我想要，海湾口语）"},
   {"ar":"نكتب العقد؟","tr":"niktib al-'aqd?","zh":"我们把合同签了？"},
   {"ar":"تبي المبلغ كامل ولا عربون؟","tr":"tibi al-mablagh kaamil walla 'arboon?","zh":"你要付全款还是先付定金？"},
   {"ar":"الله يبارك","tr":"allah ybaarik","zh":"愿真主赐福（成交时说，既客气又真诚）"},
 ]},
 {"scene":"交货与物流", "intro":"成交后把交货说清楚，客户最怕的就是拖。", "items":[
   {"ar":"متى تجهز البضاعة؟","tr":"mata tijhaz al-bidaa'a?","zh":"货什么时候能好？"},
   {"ar":"توصلونها للمحل؟","tr":"tiwassiloonha lil-mahall?","zh":"你们能送到店里吗？"},
   {"ar":"باكر يكون جاهز","tr":"baakir yikoon jaahiz","zh":"明天就能好（باكر = 明天，海湾口语）"},
   {"ar":"بخبرك أول ما توصل","tr":"bakhabbrak awwal ma toosal","zh":"一到货我就通知你"},
   {"ar":"في ضمان؟","tr":"fi damaan?","zh":"有保修/保证吗？"},
   {"ar":"لا تشيل هم، كلها علي","tr":"la tsheel hamm, kullha 'alayy","zh":"你别担心，都交给我（让客户放心）"},
 ]},
 {"scene":"维护关系与告别", "intro":"把人留住，比这一单赚多少更重要。", "items":[
   {"ar":"إنت زبون غالي علينا","tr":"inta zaboon ghaali 'alaina","zh":"你是我们看重的老客户"},
   {"ar":"أي خدمة، أنا موجود","tr":"ay khidma, ana mawjood","zh":"有事随时找我"},
   {"ar":"نتواصل، لا تنسانا","tr":"nitwaasal, la tinsaana","zh":"保持联系，别忘了我们"},
   {"ar":"الله يبارك لك في تجارتك","tr":"allah ybaarik lak fi tijaaratak","zh":"愿真主赐福你的生意"},
   {"ar":"تسلم، شكراً واجد","tr":"tislam, shukran waajid","zh":"太谢谢你了"},
   {"ar":"في أمان الله","tr":"fi amaan illah","zh":"再见（愿真主护佑你）"},
 ]},
]

# 分配全局 id + 生成音频；同时写 phrases.js
async def gen(text, path):
    if path.exists() and path.stat().st_size > 1200:
        return
    tts = edge_tts.Communicate(text, VOICE)
    await tts.save(str(path))

async def main():
    jobs, gid = [], 0
    for p in PACKS:
        for it in p["items"]:
            it["id"] = gid
            jobs.append(gen(it["ar"], OUT / f"a{gid}.mp3"))
            gid += 1
    for k in range(0, len(jobs), 5):
        await asyncio.gather(*jobs[k:k+5])
        print(f"{min(k+5,len(jobs))}/{len(jobs)}")
    return gid

total = asyncio.run(main())

js = "/* 自动生成 gen_shengyi_ar.py —— 改内容改这里，别手改。音频 audio/a<id>.mp3 与 id 对应。\n"
js += "   海湾口语商务阿语，建议本地人复核。 */\n"
js += "window.SY_PACKS = " + json.dumps(PACKS, ensure_ascii=False, indent=1) + ";\n"
(ROOT / "phrases.js").write_text(js, encoding="utf-8")

n = len(list(OUT.glob("*.mp3")))
sz = sum(f.stat().st_size for f in OUT.glob("*.mp3")) // 1024
print(f"done: {total} phrases, {n} mp3, {sz} KB, phrases.js written")
