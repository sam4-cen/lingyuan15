#!/usr/bin/env python3
"""列出游戏字符串里出现、但 pixel_cn.ttf 里没有的汉字。

扫描范围：
  - src/core/*.ts                 （config / 数值 / 文案 / 分享标题）
  - cocos/assets/scripts/**/*.ts  （所有代码创建的 UI 文本）

只读取字符串字面量（'...' / "..." / `...`），跳过注释和代码标识符；
因此中文注释不会被误算成游戏文案。

用法：
  python3 tools/font_coverage.py
  python3 tools/font_coverage.py --font /path/to/pixel_cn.ttf --out /workspace/ly15_font_missing.txt
"""

from __future__ import annotations

import argparse
import pathlib
import sys

try:
    from fontTools.ttLib import TTFont
except ImportError:  # pragma: no cover - 只在环境缺 fonttools 时触发
    print('缺少 fonttools：请先 python3 -m pip install fonttools', file=sys.stderr)
    raise SystemExit(2)


HAN_RANGES = (
    (0x3400, 0x4DBF),   # CJK Extension A
    (0x4E00, 0x9FFF),   # CJK Unified Ideographs
    (0xF900, 0xFAFF),   # CJK Compatibility Ideographs
)


def is_han(ch: str) -> bool:
    cp = ord(ch)
    return any(lo <= cp <= hi for lo, hi in HAN_RANGES)


def _decode_escape(src: str, i: int) -> tuple[str, int]:
    """解析一个反斜杠转义；返回 (解码后的字符, 新下标)。"""
    if i + 1 >= len(src):
        return '', i + 1
    nxt = src[i + 1]
    simple = {'n': '\n', 'r': '\r', 't': '\t', '0': '\0', '\\': '\\', "'": "'", '"': '"', '`': '`'}
    if nxt in simple:
        return simple[nxt], i + 2
    if nxt == 'u' and i + 2 < len(src):
        hex_text = src[i + 2:i + 6]
        try:
            return chr(int(hex_text, 16)), i + 6
        except ValueError:
            return '', i + 2
    if nxt == 'x' and i + 2 < len(src):
        hex_text = src[i + 2:i + 4]
        try:
            return chr(int(hex_text, 16)), i + 4
        except ValueError:
            return '', i + 2
    # 其他转义（例如 \/）按原字符保留
    return nxt, i + 2



REGEX_PREV_CHARS = set('=([{,:;!?&|+-*%^~<>')
REGEX_PREV_WORDS = {
    'return', 'case', 'throw', 'typeof', 'instanceof', 'in', 'of', 'delete',
    'void', 'new', 'do', 'else', 'yield', 'await',
}


def _skip_regex(src: str, i: int) -> int:
    """从正则字面量的起始 '/' 跳到结束 '/' 之后（含 flags）。"""
    i += 1  # opening slash
    in_class = False
    while i < len(src):
        c = src[i]
        if c == '\\':
            i += 2
            continue
        if c == '[':
            in_class = True
        elif c == ']':
            in_class = False
        elif c == '/' and not in_class:
            i += 1
            while i < len(src) and (src[i].isalpha() or src[i] == '_'):
                i += 1
            return i
        elif c == '\n':
            # 未闭合的正则（极少见）：当作普通除号，避免吞掉后续代码
            return i + 1
        i += 1
    return i


def _prev_token(src: str, i: int) -> tuple[str, str]:
    """返回 (上一个非空白字符, 上一个单词)。"""
    j = i - 1
    while j >= 0 and src[j].isspace():
        j -= 1
    if j < 0:
        return '', ''
    ch = src[j]
    if ch.isalnum() or ch in '_$':
        k = j
        while k >= 0 and (src[k].isalnum() or src[k] in '_$'):
            k -= 1
        return ch, src[k + 1:j + 1]
    return ch, ''


def _looks_like_regex(src: str, i: int) -> bool:
    prev_ch, prev_word = _prev_token(src, i)
    if prev_word in REGEX_PREV_WORDS:
        return True
    return prev_ch in REGEX_PREV_CHARS


def string_literals(src: str):
    """逐个产出 TS/JS 字符串字面量的内容（不包含引号）。"""
    i = 0
    n = len(src)
    while i < n:
        ch = src[i]
        if ch == '/' and i + 1 < n and src[i + 1] == '/':
            i = src.find('\n', i + 2)
            if i < 0:
                return
            continue
        if ch == '/' and i + 1 < n and src[i + 1] == '*':
            end = src.find('*/', i + 2)
            if end < 0:
                return
            i = end + 2
            continue
        if ch == '/' and i + 1 < n and src[i + 1] not in '/*':
            if _looks_like_regex(src, i):
                i = _skip_regex(src, i)
                continue
            i += 1
            continue
        if ch not in ("'", '"', '`'):
            i += 1
            continue

        quote = ch
        i += 1
        out: list[str] = []
        while i < n:
            c = src[i]
            if c == '\\':
                decoded, i = _decode_escape(src, i)
                out.append(decoded)
                continue
            if c == quote:
                i += 1
                break
            out.append(c)
            i += 1
        yield ''.join(out)


def collect_han(root: pathlib.Path) -> dict[str, set[str]]:
    """返回 {文件相对路径: 该文件字符串里的汉字集合}。"""
    files = sorted((root / 'src' / 'core').glob('*.ts'))
    files += sorted((root / 'cocos' / 'assets' / 'scripts').rglob('*.ts'))
    result: dict[str, set[str]] = {}
    for path in files:
        text = path.read_text(encoding='utf-8')
        chars: set[str] = set()
        for literal in string_literals(text):
            chars.update(ch for ch in literal if is_han(ch))
        if chars:
            result[str(path.relative_to(root))] = chars
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description='检查游戏文案汉字是否被 pixel_cn.ttf 覆盖')
    parser.add_argument('--root', default=str(pathlib.Path(__file__).resolve().parents[1]),
                        help='项目根目录（默认：脚本上一级）')
    parser.add_argument('--font', default=None, help='字体路径（默认：tools/fonts/pixel_cn.ttf；该源字体不打进主包）')
    parser.add_argument('--out', default='/workspace/ly15_font_missing.txt', help='缺失字符输出路径')
    args = parser.parse_args()

    root = pathlib.Path(args.root).resolve()
    font_path = pathlib.Path(args.font) if args.font else root / 'tools/fonts/pixel_cn.ttf'
    if not font_path.exists():
        print(f'字体不存在：{font_path}', file=sys.stderr)
        return 2

    cmap = TTFont(str(font_path)).getBestCmap() or {}
    by_file = collect_han(root)
    used = set().union(*by_file.values()) if by_file else set()
    missing = sorted(ch for ch in used if ord(ch) not in cmap)

    out_path = pathlib.Path(args.out)
    out_text = ''.join(ch + '\n' for ch in missing)
    try:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(out_text, encoding='utf-8')
    except OSError as exc:
        # 某些沙箱把 /workspace 根目录挂成只读，只有项目目录可写。
        # 这时退回到项目根目录，文件名保持不变，方便直接取用。
        fallback = root / out_path.name
        fallback.write_text(out_text, encoding='utf-8')
        print(f'警告：{out_path} 不可写（{exc}），已改写到 {fallback}', file=sys.stderr)
        out_path = fallback

    print(f'字体：{font_path}')
    print(f'扫描：{len(by_file)} 个文件，{len(used)} 个不重复汉字')
    print(f'缺失：{len(missing)} 个' + (f' -> {"".join(missing)}' if missing else ''))
    print(f'输出：{out_path}')
    return 0 if not missing else 1


if __name__ == '__main__':
    raise SystemExit(main())
