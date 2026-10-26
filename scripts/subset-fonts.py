#!/usr/bin/env python3
"""重新生成 src/assets/fonts/ 下的字体子集。

界面文案改过之后（尤其是新增了汉字），跑一次这个脚本，让标题字体继续覆盖新字，
否则新字会悄悄回退成系统字体，标题风格就不统一了。

    python3 scripts/subset-fonts.py

只用到 Python 标准库，需要联网访问 Google Fonts（仅生成时，运行时完全不依赖）。
正文用的是系统字体，不需要在这里处理。
"""

from __future__ import annotations

import pathlib
import re
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "assets" / "fonts"
UA = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    )
}

# 界面上出现过、但不一定写在源码里的字符（数字、单位、符号）
SAFETY = "0123456789ABCDEFabcdef·×→←↑↓≈⌘⇧％℃、。「」（）"


def collect_chars() -> str:
    """把源码里所有可能显示出来的字符收集起来。"""
    sources = (
        list((ROOT / "src").rglob("*.tsx"))
        + list((ROOT / "src").rglob("*.ts"))
        + [ROOT / "index.html"]
        + [ROOT / "src" / "index.css"]  # CSS 里的 content: "..." 也算文案
    )
    seen: set[str] = set(SAFETY)
    for path in sources:
        for ch in path.read_text(encoding="utf-8"):
            code = ord(ch)
            if 0x20 <= code <= 0x7E or 0x3000 <= code <= 0x303F:
                seen.add(ch)
            elif 0x4E00 <= code <= 0x9FFF or 0xFF00 <= code <= 0xFFEF:
                seen.add(ch)
    # 空格类字符不用塞进子集
    return "".join(sorted(ch for ch in seen if not ch.isspace()))


def fetch_css(family_query: str, chars: str) -> str:
    url = (
        f"https://fonts.googleapis.com/css2?family={family_query}"
        f"&text={urllib.parse.quote(chars)}&display=swap"
    )
    request = urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(request, timeout=60).read().decode("utf-8")


def faces(css: str) -> list[tuple[str, str]]:
    """从 CSS 里取出 (字重, woff2 地址)。"""
    found: list[tuple[str, str]] = []
    for block in re.findall(r"@font-face\s*\{(.*?)\}", css, re.S):
        src = re.search(r"src:\s*url\((https://[^)]+)\)\s*format\('woff2'\)", block)
        if not src:
            continue
        weight = re.search(r"font-weight:\s*(\d+)", block)
        found.append((weight.group(1) if weight else "400", src.group(1)))
    return found


def main() -> None:
    cjk = collect_chars()
    ascii_only = "".join(chr(c) for c in range(0x20, 0x7F)) + "·×→←↑↓≈⌘⇧％℃"
    OUT.mkdir(parents=True, exist_ok=True)

    jobs = [
        ("ZCOOL+KuaiLe", cjk, "zcool-kuaile-{weight}.woff2"),
        ("DM+Mono:wght@400;500", ascii_only, "dm-mono-{weight}.woff2"),
    ]

    for family, chars, pattern in jobs:
        downloaded = faces(fetch_css(family, chars))
        if not downloaded:
            raise SystemExit(f"没有从 Google Fonts 拿到 {family} 的 woff2 地址")
        for weight, url in downloaded:
            data = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
            target = OUT / pattern.format(weight=weight)
            target.write_bytes(data)
            print(f"{target.relative_to(ROOT)}  {len(data)} bytes")

    print(f"子集字符数：{len(cjk)}")


if __name__ == "__main__":
    main()
