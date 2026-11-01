# レベル1-1 の地図を作って index.html に書き込む（手で書くと列がずれるため）
import re, sys
W, H = 128, 16
g = [['.'] * W for _ in range(H)]
def put(c, r, ch): g[r][c] = ch
def ground(a, b, ch='#'):
    for c in range(a, b + 1):
        for r in (14, 15): put(c, r, ch)
def col(c, top, ch='#'):
    for r in range(top, 14): put(c, r, ch)
def row(a, b, r, ch):
    for c in range(a, b + 1): put(c, r, ch)

ground(0, 18); put(2, 13, 'S'); row(5, 7, 12, '*')
row(10, 12, 11, '='); put(11, 11, 'B'); row(10, 12, 9, '*')
for c in range(15, 19): col(c, 13)
ground(22, 36); put(28, 13, 'e'); row(29, 32, 11, '='); put(30, 11, 'B'); put(31, 11, 'B'); row(29, 32, 9, '*')
put(24, 13, 'J'); put(24, 11, '*'); put(24, 10, '*'); put(24, 9, '*'); put(24, 7, 'O')   # ぽよーん雲で届く
row(37, 39, 11, '*')
ground(40, 52); put(41, 13, 'C'); put(46, 13, 'e')
col(49, 13); col(50, 12); col(51, 11); col(52, 11)
row(54, 57, 11, '-'); row(54, 57, 9, '*'); row(59, 62, 9, '-'); row(59, 62, 7, '*'); put(63, 7, 'O')   # 雲から思い切り跳ぶと届く
ground(64, 80); put(68, 13, 'e'); put(77, 13, 'e'); row(71, 74, 11, '='); put(72, 11, 'B'); put(73, 11, 'B'); row(71, 74, 9, '*')
row(81, 83, 11, '*')
ground(84, 100); put(85, 13, 'C'); put(89, 13, 'e')
col(93, 13); col(94, 12); col(95, 11); col(96, 11); col(97, 11); col(98, 12); col(99, 13)
row(95, 97, 9, '*'); put(96, 7, 'O'); put(102, 11, '*')   # 山のてっぺんから大ジャンプ
ground(104, 127, 'k'); row(107, 111, 12, '*'); g[12][108] = g[12][110] = '.'
put(106, 13, 'J'); put(106, 10, '*'); put(106, 9, '*'); put(106, 8, '*')
put(116, 13, 'G')
for r in range(9, 14): put(127, r, 'k')

lines = ["    '" + ''.join(r) + "'," for r in g]
p = sys.argv[1]
src = open(p, encoding='utf-8').read()
src = re.sub(r"(  map: \[\n).*?(\n  \],)", lambda m: m.group(1) + '\n'.join(lines) + m.group(2), src, flags=re.S)
open(p, 'w', encoding='utf-8').write(src)
print('\n'.join(''.join(r) for r in g))
print('stars', sum(r.count('*') + r.count('B') for r in g), 'big', sum(r.count('O') for r in g))
