# -*- coding: utf-8 -*-
"""Generate neural Modern Standard Arabic audio for every Arabic lesson card."""

import asyncio
import hashlib
import json
import pathlib
import re

import edge_tts


ROOT = pathlib.Path(__file__).parent
OUT = ROOT / "kidaudio"
INDEX_PATH = OUT / "msa-index.json"
VOICE = "ar-SA-ZariyahNeural"
ARABIC = re.compile(r"[\u0600-\u06ff]")
ITEM = re.compile(r'\["([^"]*[\u0600-\u06ff][^"]*)","')


def lesson_phrases() -> list[str]:
    phrases: set[str] = set()
    for name in ("index.html", "arabic.html"):
        source = (ROOT / name).read_text(encoding="utf-8")
        block = source.split("const AR_PACKS={", 1)[1].split("const KEY=", 1)[0]
        phrases.update(text for text in ITEM.findall(block) if ARABIC.search(text))
    return sorted(phrases)


async def generate(text: str, path: pathlib.Path) -> None:
    if path.exists() and path.stat().st_size > 1_000:
        return
    for attempt in range(3):
        try:
            await edge_tts.Communicate(text, VOICE, rate="-8%").save(str(path))
            return
        except Exception:
            if attempt == 2:
                raise
            await asyncio.sleep(1.5 * (attempt + 1))


async def main() -> None:
    OUT.mkdir(exist_ok=True)
    # Keep a dedicated index containing only the current MSA lesson phrases.
    # The legacy roster also contains old Gulf/Egyptian clips; using it here
    # made it possible for stale dialect recordings to leak back into lessons.
    index: dict[str, str] = {}
    phrases = lesson_phrases()
    for start in range(0, len(phrases), 8):
        batch = phrases[start : start + 8]
        paths = [OUT / f"{hashlib.md5(text.encode()).hexdigest()[:12]}.mp3" for text in batch]
        await asyncio.gather(*(generate(text, path) for text, path in zip(batch, paths)))
        for text, path in zip(batch, paths):
            index[text] = path.name
        print(f"{min(start + len(batch), len(phrases))}/{len(phrases)}")
    INDEX_PATH.write_text(json.dumps(index, ensure_ascii=False), encoding="utf-8")
    print(f"generated {len(phrases)} MSA clips with {VOICE}")


if __name__ == "__main__":
    asyncio.run(main())
