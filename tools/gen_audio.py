# -*- coding: utf-8 -*-
# 用 edge-tts 神经语音为全部词与例句预生成 MP3（word 单独 + 整句），供网站静态引用
import asyncio, json, pathlib
import edge_tts

VOICE = "en-US-GuyNeural"
OUT = pathlib.Path(__file__).parent / "audio"
OUT.mkdir(exist_ok=True)

PACKS = {
"business": [
 ("deal","It's a deal."),("stock","Let me check our stock first."),("invoice","I'll send you the invoice today."),
 ("balance","The balance is 500 dollars."),("ship","We can ship tomorrow morning."),("confirm","Please confirm the price."),
 ("discount","Can you give me a better discount?"),("payment","Payment received, thank you."),
 ("urgent","This order is urgent."),("trust","Business is built on trust.")],
"family": [
 ("proud","I'm so proud of you."),("homework","How's your homework going?"),("dinner","Dinner's ready!"),
 ("promise","A promise is a promise."),("bedtime","It's bedtime, sweetheart."),("grow up","They grow up so fast."),
 ("take care","Take care of your sister."),("together","Let's read together tonight."),
 ("listen","Listen to your mom."),("hug","Come here, give me a hug.")],
"daily": [
 ("appointment","I have an appointment at nine."),("bill","The bill is due next week."),("traffic","Traffic was crazy today."),
 ("weather","Beautiful weather today, huh?"),("grab","Let's grab some coffee."),("weekend","Any plans for the weekend?"),
 ("favor","Can you do me a favor?"),("no worries","No worries at all."),
 ("on my way","I'm on my way."),("catch up","Let's catch up soon.")],
"faith": [
 ("pray","I need to pray first."),("faith","My faith comes first."),("grateful","I'm grateful for everything."),
 ("blessing","Kids are a blessing."),("God willing","See you tomorrow, God willing."),
 ("charity","Charity never decreases wealth."),("patience","Patience is beautiful."),
 ("honest","An honest merchant is blessed."),("forgive","Forgive and move on."),("peace","Peace be upon you.")]}

async def gen(text, path):
    if path.exists() and path.stat().st_size > 1000:
        return
    tts = edge_tts.Communicate(text, VOICE, rate="-8%")
    await tts.save(str(path))

async def main():
    jobs = []
    for pack, items in PACKS.items():
        for i, (w, s) in enumerate(items):
            jobs.append(gen(w, OUT / f"{pack}_{i}_w.mp3"))
            jobs.append(gen(f"{w}. {s}", OUT / f"{pack}_{i}_s.mp3"))
    # 分批并发，避免被限流
    for k in range(0, len(jobs), 10):
        await asyncio.gather(*jobs[k:k+10])
        print(f"{min(k+10,len(jobs))}/{len(jobs)}")

asyncio.run(main())
n = len(list(OUT.glob("*.mp3")))
sz = sum(f.stat().st_size for f in OUT.glob("*.mp3")) // 1024
print(f"done: {n} clips, {sz} KB total")
