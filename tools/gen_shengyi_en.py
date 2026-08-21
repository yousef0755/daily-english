# -*- coding: utf-8 -*-
# 「做生意」站·日常英语口语：按生活场景分周，每场景做成简短「一问一答」，能直接开口练。
# 老少都能用的简单日常口语。真人女声 en-US-Ava 慢速；发音给中文谐音帮张口，跟录音念才准。
# 单一出处：产出 audio/e<id>.mp3（问、答各一条）+ en.js（window.EN_PACKS）
import asyncio, json, pathlib
import edge_tts

VOICE = "en-US-AvaNeural"
ROOT = pathlib.Path(__file__).resolve().parent.parent / "shengyi"
OUT = ROOT / "audio"
OUT.mkdir(parents=True, exist_ok=True)

# 每场景一周；pairs 是一问一答对。q/a: [英文, 中文谐音, 中文意思]
SCENES = [
 {"scene":"吃饭", "intro":"一日三餐最常说的几句，问一句答一句。", "pairs":[
   [["Are you hungry?","阿 优 航鬼","你饿吗？"], ["Yes, I'm hungry.","耶斯，阿姆 航鬼","嗯，我饿了。"]],
   [["What do you want to eat?","沃特 度 优 万特 图 一特","你想吃什么？"], ["I want some rice.","阿 万特 桑姆 赖斯","我想吃点米饭。"]],
   [["Is it good?","意斯 意特 古德","好吃吗？"], ["Yes, it's yummy!","耶斯，意次 呀米","嗯，很好吃！"]],
   [["Do you want more?","度 优 万特 摩","还要吗？"], ["No, I'm full.","诺，阿姆 弗欧","不了，我饱了。"]],
   [["Can I have some water?","坎 阿 哈夫 桑姆 沃特","能给我点水吗？"], ["Here you are.","嗨尔 优 阿","给你。"]],
 ]},
 {"scene":"起床", "intro":"早上起来的对话，暖暖地开口。", "pairs":[
   [["Good morning!","古德 摸宁","早上好！"], ["Good morning, Mom.","古德 摸宁，妈姆","早上好，妈妈。"]],
   [["Did you sleep well?","迪的 优 斯利普 唯欧","睡得好吗？"], ["Yes, I slept well.","耶斯，阿 斯莱普特 唯欧","嗯，睡得挺好。"]],
   [["Time to get up!","太姆 图 盖特 阿普","该起床啦！"], ["Okay, I'm coming.","欧凯，阿姆 卡明","好，来了。"]],
   [["Are you awake?","阿 优 饿威克","你醒了吗？"], ["Yes, I'm awake.","耶斯，阿姆 饿威克","醒了。"]],
   [["Let's brush our teeth.","莱茨 布拉什 阿我 提斯","我们去刷牙吧。"], ["Okay!","欧凯","好的！"]],
 ]},
 {"scene":"出门", "intro":"准备出门时的一问一答。", "pairs":[
   [["Are you ready?","阿 优 瑞迪","准备好了吗？"], ["Yes, I'm ready.","耶斯，阿姆 瑞迪","好了。"]],
   [["Where are we going?","威尔 阿 维 购因","我们去哪儿？"], ["We're going to the mall.","威尔 购因 图 泽 摩欧","我们去商场。"]],
   [["Put on your shoes.","扑特 昂 尤尔 束斯","穿上鞋。"], ["Okay, done.","欧凯，等","好了，穿好了。"]],
   [["Don't forget your bag.","东特 佛给特 尤尔 拜格","别忘了你的包。"], ["I got it.","阿 加特 意特","知道了。"]],
   [["Let's go!","莱茨 购","走吧！"], ["Let's go!","莱茨 购","走！"]],
 ]},
 {"scene":"购物", "intro":"买东西常用的一问一答，够用就行。", "pairs":[
   [["What do you need?","沃特 度 优 尼德","你要买什么？"], ["I need some milk.","阿 尼德 桑姆 谬克","我要买点牛奶。"]],
   [["How much is it?","好 马奇 意斯 意特","多少钱？"], ["It's ten dirhams.","意次 疼 迪拉姆斯","十迪拉姆。"]],
   [["Do you like this?","度 优 赖克 迪斯","你喜欢这个吗？"], ["Yes, I like it.","耶斯，阿 赖克 意特","嗯，我喜欢。"]],
   [["Cash or card?","卡什 奥 卡德","现金还是刷卡？"], ["Card, please.","卡德，普利斯","刷卡，谢谢。"]],
   [["Anything else?","埃尼辛 埃欧斯","还要别的吗？"], ["No, that's all.","诺，戴茨 奥","不了，就这些。"]],
 ]},
 {"scene":"玩耍", "intro":"一起玩的时候，你一句我一句。", "pairs":[
   [["Do you want to play?","度 优 万特 图 普雷","想玩吗？"], ["Yes, let's play!","耶斯，莱茨 普雷","好，一起玩！"]],
   [["What's this?","沃茨 迪斯","这是什么？"], ["It's a ball.","意兹 饿 波欧","是个球。"]],
   [["Can I have a turn?","坎 阿 哈夫 饿 疼","能轮到我吗？"], ["Sure, here you go.","秀，嗨尔 优 购","当然，给你。"]],
   [["Be careful!","比 凯尔佛","小心！"], ["I'm okay.","阿姆 欧凯","我没事。"]],
   [["That's fun!","戴茨 放","真好玩！"], ["Yeah, so fun!","耶，搜 放","是啊，太好玩了！"]],
 ]},
 {"scene":"睡觉", "intro":"睡前的对话，轻轻地道晚安。", "pairs":[
   [["Are you sleepy?","阿 优 斯利屁","困了吗？"], ["Yes, I'm sleepy.","耶斯，阿姆 斯利屁","嗯，困了。"]],
   [["Time for bed.","太姆 佛 拜德","该睡觉了。"], ["Okay, good night.","欧凯，古德 耐特","好，晚安。"]],
   [["Did you brush your teeth?","迪的 优 布拉什 尤尔 提斯","刷牙了吗？"], ["Yes, I did.","耶斯，阿 迪的","刷了。"]],
   [["Good night, sleep well.","古德 耐特，斯利普 唯欧","晚安，睡个好觉。"], ["Good night!","古德 耐特","晚安！"]],
   [["Turn off the light?","疼 奥夫 泽 赖特","关灯好吗？"], ["Yes, please.","耶斯，普利斯","好的。"]],
 ]},
]

def mk(line, gid):
    return {"en": line[0], "tr": line[1], "zh": line[2], "id": gid}

async def gen(text, path):
    if path.exists() and path.stat().st_size > 1200:
        return
    tts = edge_tts.Communicate(text, VOICE, rate="-12%")
    await tts.save(str(path))

async def main():
    jobs, gid = [], 0
    packs = []
    for sc in SCENES:
        pairs = []
        for q, a in sc["pairs"]:
            qd = mk(q, gid); jobs.append(gen(q[0], OUT / f"e{gid}.mp3")); gid += 1
            ad = mk(a, gid); jobs.append(gen(a[0], OUT / f"e{gid}.mp3")); gid += 1
            pairs.append({"q": qd, "a": ad})
        packs.append({"scene": sc["scene"], "intro": sc["intro"], "pairs": pairs})
    for k in range(0, len(jobs), 6):
        await asyncio.gather(*jobs[k:k+6])
        print(f"{min(k+6,len(jobs))}/{len(jobs)}")
    return packs, gid

packs, total = asyncio.run(main())
js = "/* 自动生成 gen_shengyi_en.py —— 改内容改这里。音频 audio/e<id>.mp3 与 id 对应。\n"
js += "   日常英语口语，按生活场景分周，每场景一问一答。 */\n"
js += "window.EN_PACKS = " + json.dumps(packs, ensure_ascii=False, indent=1) + ";\n"
(ROOT / "en.js").write_text(js, encoding="utf-8")
n = len(list(OUT.glob("e*.mp3")))
print(f"done: {total} en lines, {n} e-mp3, en.js written")
