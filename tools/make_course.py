# 15コースの地図を作って courses.js に書き出す（手で書くと列がずれるため）
# 使い方: python tools/make_course.py      → courses.js ができる
# 1-1 は手作り。1-2 から 5-3 は、決まった材料（穴・階段・ブロックなど）をレベルに合わせて組み合わせる。
# ジャンプで届く範囲（高さ 3.5マス・幅 5マス）を超える形は作らない。
import json, os, random

H = 16
BASE = 14          # 地面のいちばん上の行（何もないとき）
VIS_TOP = 7        # これより上の行は画面に入りにくいので、お星さまを置かない

NAMES = [
    ('そうげん', 'grass', ['はじまりの そうげん', 'ぽかぽか おかの みち', 'ちょうちょの はらっぱ']),
    ('もり',     'forest', ['こもれびの もり', 'きのこの こみち', 'ふかい もりの おく']),
    ('うみべ',   'beach', ['すなはまの さんぽ', 'かいがらの いりえ', 'しおかぜの みさき']),
    ('ゆきやま', 'snow', ['こなゆきの ふもと', 'つららの どうくつまえ', 'ゆきやまの てっぺん']),
    ('よぞら',   'night', ['おほしさまの のはら', 'つきあかりの はし', 'くもの せかいへ']),
]


class Course:
    def __init__(self, width):
        self.W = width
        self.g = [['.'] * width for _ in range(H)]

    def put(self, c, r, ch):
        if 0 <= c < self.W and 0 <= r < H:
            self.g[r][c] = ch

    def col(self, c, h, ch='#'):
        for r in range(BASE - h, H):
            self.put(c, r, ch)

    def rows(self):
        return [''.join(r) for r in self.g]


def course_1_1():
    """手作りのレベル1-1（わたあめちゃんに最初に見せたコース）"""
    c = Course(128)
    g = c.g
    put = c.put
    def ground(a, b, ch='#'):
        for x in range(a, b + 1):
            for r in (14, 15): put(x, r, ch)
    def colm(x, top, ch='#'):
        for r in range(top, 14): put(x, r, ch)
    def row(a, b, r, ch):
        for x in range(a, b + 1): put(x, r, ch)
    ground(0, 18); put(2, 13, 'S'); row(5, 7, 12, '*')
    row(10, 12, 11, '='); put(11, 11, 'B'); row(10, 12, 9, '*')
    for x in range(15, 19): colm(x, 13)
    ground(22, 36); put(28, 13, 'e'); row(29, 32, 11, '='); put(30, 11, 'B'); put(31, 11, 'B'); row(29, 32, 9, '*')
    put(24, 13, 'J'); put(24, 11, '*'); put(24, 10, '*'); put(24, 9, '*'); put(24, 7, 'O')
    row(37, 39, 11, '*')
    ground(40, 52); put(41, 13, 'C'); put(46, 13, 'e')
    colm(49, 13); colm(50, 12); colm(51, 11); colm(52, 11)
    row(54, 57, 11, '-'); row(54, 57, 9, '*'); row(59, 62, 9, '-'); row(59, 62, 7, '*'); put(63, 7, 'O')
    ground(64, 80); put(68, 13, 'e'); put(77, 13, 'e'); row(71, 74, 11, '='); put(72, 11, 'B'); put(73, 11, 'B'); row(71, 74, 9, '*')
    row(81, 83, 11, '*')
    ground(84, 100); put(85, 13, 'C'); put(89, 13, 'e')
    colm(93, 13); colm(94, 12); colm(95, 11); colm(96, 11); colm(97, 11); colm(98, 12); colm(99, 13)
    row(95, 97, 9, '*'); put(96, 7, 'O'); put(102, 11, '*')
    ground(104, 127, 'k'); row(107, 111, 12, '*'); g[12][108] = g[12][110] = '.'
    put(106, 13, 'J'); put(106, 10, '*'); put(106, 9, '*'); put(106, 8, '*')
    put(116, 13, 'G')
    for r in range(9, 14): put(127, r, 'k')
    rows = c.rows()
    # ボスの広場：100マス目（ふつうの地面）のうしろに平らな18マスを差しこむ。X はボスの立つ所
    arena = ['#' * 18 if r >= 14 else '.' * 18 for r in range(H)]
    arena[13] = '.' * 13 + 'X' + '.' * 4
    return [r[:101] + a + r[101:] for r, a in zip(rows, arena)]


def generate(level, idx, seed):
    """level 1〜5, idx 0〜2。同じ seed なら毎回同じコースになる"""
    rnd = random.Random(seed)
    d = level + idx * 0.3                         # むずかしさ（1.0〜5.6）
    length = int(110 + level * 12 + idx * 6)
    c = Course(length + 70)
    x, h = 0, 0
    big_left = 3
    enemy_speed_note = None

    def surf(hh):           # 足場の上の行（立つ行は surf-1）
        return BASE - hh

    def stars_row(c0, c1, r, step=1):
        r = max(VIS_TOP, r)
        for cc in range(c0, c1 + 1, step):
            if c.g[r][cc] == '.':
                c.put(cc, r, '*')

    def flat(n, enemies=0, stars=True):
        nonlocal x
        for i in range(n):
            c.col(x + i, h)
        if stars and n >= 4 and rnd.random() < 0.6:
            stars_row(x + 1, x + n - 2, surf(h) - 2, 1 if rnd.random() < 0.5 else 2)
        # 敵は真ん中あたりだけ（崖や穴のすぐ手前に置かない）
        spots = list(range(x + 2, x + n - 2))
        rnd.shuffle(spots)
        placed = []
        for s in spots:
            if len(placed) >= enemies:
                break
            if c.g[surf(h) - 1][s] == '.' and all(abs(s - q) >= 3 for q in placed):   # 敵どうしは3マスあける
                c.put(s, surf(h) - 1, 'e'); placed.append(s)
        x += n

    def seg_step():
        nonlocal h
        nh = max(0, min(3, h + rnd.choice([-1, 1, 1, 2] if d >= 2 else [-1, 1])))
        h = nh
        flat(rnd.randint(4, 6), enemies=1 if d >= 3 and rnd.random() < 0.5 else 0)

    def seg_gap():
        nonlocal x, h
        wmax = 2 if d < 2 else 3 if d < 4 else 4
        w = rnd.randint(2, wmax)
        stars_row(x, x + w - 1, surf(h) - 3)
        x += w
        h = max(0, h - rnd.choice([0, 0, 1]))
        flat(rnd.randint(4, 6), enemies=0)

    def seg_blocks():
        nonlocal big_left
        n = 7
        x0 = x
        flat(n, enemies=1 if d >= 2 else 0, stars=False)
        r = surf(h) - 3
        for cc in range(x0 + 2, x0 + 6):
            c.put(cc, r, '=')
        for cc in rnd.sample(range(x0 + 2, x0 + 6), 2 if d < 3 else 1):
            c.put(cc, r, 'B')
        stars_row(x0 + 2, x0 + 5, r - 2)
        if big_left and rnd.random() < 0.35:
            c.put(x0 + 4, max(VIS_TOP, r - 4), 'O'); big_left -= 1

    def seg_spring():
        nonlocal big_left
        x0 = x
        flat(6, enemies=0, stars=False)
        c.put(x0 + 2, surf(h) - 1, 'J')
        for k in range(3, 6):
            stars_row(x0 + 2, x0 + 2, surf(h) - k)
        if big_left:
            c.put(x0 + 2, max(VIS_TOP, surf(h) - 7), 'O'); big_left -= 1

    def seg_clouds(ch='-'):
        nonlocal x, big_left
        # 穴の上に雲（またはブロック）の足場を2〜3つ。足場の間は2マス
        n = 2 if d < 3 else 3
        r = surf(h) - 2
        x += 1
        for i in range(n):
            w = 4 if d < 4 else 3
            for cc in range(x, x + w):
                c.put(cc, r, ch)
            stars_row(x, x + w - 1, r - 2)
            last = (x + w - 1, r)
            x += w + 2
            r = max(VIS_TOP + 3, r + rnd.choice([-1, 0, 1]))
            r = min(r, surf(h) - 1)
        if big_left and rnd.random() < 0.5:
            c.put(last[0] + 1, max(VIS_TOP, last[1] - 4), 'O'); big_left -= 1
        flat(rnd.randint(4, 6), enemies=0)

    def seg_pyramid():
        nonlocal x, h, big_left
        base = h
        top = min(3, base + 3)
        hs = list(range(base + 1, top + 1)) + [top] + list(range(top, base, -1))
        x0 = x
        for i, hh in enumerate(hs):
            c.col(x + i, hh)
        peak = x0 + len(hs) // 2
        stars_row(peak - 1, peak + 1, surf(top) - 2)
        if big_left and rnd.random() < 0.6:
            c.put(peak, max(VIS_TOP, surf(top) - 4), 'O'); big_left -= 1
        x += len(hs)
        flat(3, stars=False)

    def seg_enemies():
        flat(rnd.randint(7, 10), enemies=1 if d < 2.5 else 2)

    # スタート
    flat(8, stars=False)
    c.put(2, surf(0) - 1, 'S')
    menu = [seg_step, seg_gap, seg_blocks, seg_enemies, seg_gap, seg_step]
    if d >= 2: menu += [seg_clouds, seg_pyramid]
    if d >= 3: menu += [lambda: seg_clouds('='), seg_gap, seg_enemies]
    if d >= 4: menu += [seg_gap, seg_clouds]
    checkpoints = [length // 3, 2 * length // 3]
    did_spring = False
    while x < length:
        if checkpoints and x >= checkpoints[0]:
            checkpoints.pop(0)
            x0 = x
            flat(4, stars=False)
            c.put(x0 + 1, surf(h) - 1, 'C')
            continue
        if not did_spring and x > length * 0.15:
            seg_spring(); did_spring = True; continue
        rnd.choice(menu)()
    # おおきなお星さまが3つにならなかったら、ぽよーん雲を足して置く
    while big_left:
        seg_spring()
    # ボスの広場：平らな18マス。X はボスの立つ所（右から5マス目）
    flat(2, stars=False)
    bx0 = x
    flat(18, stars=False)
    c.put(bx0 + 13, surf(h) - 1, 'X')
    # ゴール：雲の世界でうさぎさん
    h_goal = 0
    flat(2, stars=False)
    x += 2
    gx = x
    for cc in range(gx, gx + 24):
        for r in (14, 15):
            c.put(cc, r, 'k')
    c.put(gx + 2, 13, 'J')
    for k in (10, 9, 8):
        c.put(gx + 2, k, '*')
    c.put(gx + 12, 13, 'G')
    for r in range(9, 14):
        c.put(gx + 23, r, 'k')
    rows = c.rows()
    return [r[:gx + 24] for r in rows]


def main():
    out = []
    for li, (lname, theme, names) in enumerate(NAMES):
        level = li + 1
        for idx in range(3):
            cid = f'{level}-{idx + 1}'
            rows = course_1_1() if cid == '1-1' else generate(level, idx, seed=1000 + level * 10 + idx)
            stars = sum(r.count('*') + r.count('B') for r in rows)
            big = sum(r.count('O') for r in rows)
            assert big == 3, (cid, big)
            out.append({'id': cid, 'level': level, 'theme': theme,
                        'name': f'レベル{cid}　{names[idx]}', 'map': rows})
            print(f'{cid}  幅{len(rows[0]):4}  お星さま{stars:3}  おおきな{big}  {names[idx]}')
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, '..', 'courses.js'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('// tools/make_course.py が作るファイル。手で直さない\n')
        f.write('// # 地面  = ブロック  B 星のブロック  - 雲  k 雲の地面  J ぽよーん雲  * お星さま\n')
        f.write('// O おおきなお星さま  e 敵  C チェックポイント  S スタート  G うさぎさん\n')
        f.write('const COURSES = [\n')
        for co in out:
            f.write('  { id: %s, level: %d, theme: %s, name: %s, map: [\n' % (
                json.dumps(co['id']), co['level'], json.dumps(co['theme']), json.dumps(co['name'], ensure_ascii=False)))
            for r in co['map']:
                f.write("    '%s',\n" % r)
            f.write('  ] },\n')
        f.write('];\n')


if __name__ == '__main__':
    main()
