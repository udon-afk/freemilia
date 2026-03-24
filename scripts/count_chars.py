#!/usr/bin/env python3
import sys
from pathlib import Path

if len(sys.argv) < 2:
    print('usage: count_chars.py <file>')
    sys.exit(1)

p = Path(sys.argv[1])
text = p.read_text(encoding='utf-8')
print(f'file: {p}')
print(f'chars_with_spaces: {len(text)}')
print(f'chars_without_spaces: {len("".join(text.split()))}')
print(f'lines: {text.count(chr(10))+1}')
