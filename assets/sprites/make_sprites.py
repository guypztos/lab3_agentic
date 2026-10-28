import math, os, sys
OUT = sys.argv[1]

def svg(size, body, defs=''):
    d = f'<defs>{defs}</defs>' if defs else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" '
            f'viewBox="0 0 {size} {size}">{d}{body}</svg>\n')

# ---------- Player: round orange critter ----------
P = dict(main='#f28c28', shade='#d46a14', belly='#ffe3bd', ear='#ffb37a',
         foot='#b85410', arm='#e27a1c', cheek='#ff8a78', ink='#3a2a36')

def player(state):
    p = P
    if state == 'idle':
        body_t, feet, arms, mouth = '', [(50, 110), (78, 110)], [(27, 82, 20), (101, 82, -20)], 'smile'
    elif state == 'walk':
        body_t = 'rotate(6 64 96) translate(0 -2)'
        feet = [(44, 109), (84, 104)]
        arms = [(29, 72, 50), (99, 90, -10)]
        mouth = 'open'
    else:  # jump
        body_t = 'translate(0 -6) scale(0.96 1.04) translate(2.7 -2)'
        feet = [(44, 114), (84, 114)]
        arms = [(26, 48, -30), (102, 48, 30)]
        mouth = 'big'
    out = []
    for fx, fy in feet:
        out.append(f'<ellipse cx="{fx}" cy="{fy}" rx="11" ry="7" fill="{p["foot"]}"/>')
    g = []
    # ears (shade then light inner)
    g.append(f'<path d="M34 54 Q26 18 54 38 Z" fill="{p["shade"]}"/>')
    g.append(f'<path d="M94 54 Q102 18 74 38 Z" fill="{p["shade"]}"/>')
    g.append(f'<path d="M38 48 Q34 28 50 39 Z" fill="{p["ear"]}"/>')
    g.append(f'<path d="M90 48 Q94 28 78 39 Z" fill="{p["ear"]}"/>')
    # body: darker base + lighter offset = soft shade crescent bottom-right
    g.append(f'<ellipse cx="64" cy="72" rx="36" ry="38" fill="{p["shade"]}"/>')
    g.append(f'<ellipse cx="61" cy="69" rx="33" ry="35" fill="{p["main"]}"/>')
    g.append(f'<ellipse cx="63" cy="88" rx="20" ry="16" fill="{p["belly"]}"/>')
    # face
    for ex in (50, 76):
        g.append(f'<ellipse cx="{ex}" cy="62" rx="6" ry="8" fill="{p["ink"]}"/>')
        g.append(f'<circle cx="{ex+2}" cy="59" r="2.4" fill="#fff"/>')
    for cx in (40, 86):
        g.append(f'<ellipse cx="{cx}" cy="74" rx="6" ry="4" fill="{p["cheek"]}" opacity=".85"/>')
    if mouth == 'smile':
        g.append(f'<path d="M57 73 Q63 79 69 73" stroke="{p["ink"]}" stroke-width="3" fill="none" stroke-linecap="round"/>')
    elif mouth == 'open':
        g.append(f'<path d="M57 72 Q63 81 69 72 Z" fill="{p["ink"]}" stroke="{p["ink"]}" stroke-width="2" stroke-linejoin="round"/>')
    else:
        g.append(f'<path d="M55 71 Q63 86 71 71 Z" fill="{p["ink"]}" stroke="{p["ink"]}" stroke-width="2" stroke-linejoin="round"/>')
        g.append(f'<ellipse cx="63" cy="78" rx="4" ry="2.5" fill="#ff7a8a"/>')
    for ax, ay, rot in arms:
        g.append(f'<ellipse cx="{ax}" cy="{ay}" rx="7" ry="11" fill="{p["arm"]}" transform="rotate({rot} {ax} {ay})"/>')
    out.append(f'<g transform="{body_t}">' + ''.join(g) + '</g>')
    return svg(128, ''.join(out))

# ---------- Enemy: horned purple grump ----------
def enemy(state):
    hit = state == 'hit'
    main, shade = ('#c27ee0', '#9b52c0') if hit else ('#8e44ad', '#6a2f86')
    foot, ink, horn, horn_s = '#4f2266', '#3a1748', '#f6e7c8', '#d9c29a'
    out = []
    if hit:
        feet, t = [(46, 112), (82, 112)], 'rotate(-8 64 100) translate(64 110) scale(1.08 0.9) translate(-64 -110)'
    else:
        feet, t = [(42, 111), (84, 106)], 'rotate(5 64 100) translate(0 -1)'
    for fx, fy in feet:
        out.append(f'<ellipse cx="{fx}" cy="{fy}" rx="12" ry="7" fill="{foot}"/>')
    g = []
    # back spikes
    for x in (40, 64, 88):
        y = 44 if x == 64 else 50
        g.append(f'<path d="M{x-8} {y+8} L{x} {y-10} L{x+8} {y+8} Z" fill="{shade}" stroke="{shade}" stroke-width="4" stroke-linejoin="round"/>')
    # horns
    g.append(f'<path d="M36 56 Q22 34 32 18 Q38 38 52 46 Z" fill="{horn_s}"/>')
    g.append(f'<path d="M37 52 Q26 34 32 20 Q37 37 49 45 Z" fill="{horn}"/>')
    g.append(f'<path d="M92 56 Q106 34 96 18 Q90 38 76 46 Z" fill="{horn_s}"/>')
    g.append(f'<path d="M91 52 Q102 34 96 20 Q91 37 79 45 Z" fill="{horn}"/>')
    # body
    g.append(f'<ellipse cx="64" cy="77" rx="40" ry="34" fill="{shade}"/>')
    g.append(f'<ellipse cx="61" cy="74" rx="37" ry="31" fill="{main}"/>')
    if not hit:
        for ex, px in ((50, 53), (78, 75)):
            g.append(f'<ellipse cx="{ex}" cy="70" rx="9" ry="8" fill="#fff4c2"/>')
            g.append(f'<circle cx="{px}" cy="72" r="4.5" fill="{ink}"/>')
        g.append(f'<path d="M39 57 L58 64" stroke="{ink}" stroke-width="5.5" stroke-linecap="round"/>')
        g.append(f'<path d="M89 57 L70 64" stroke="{ink}" stroke-width="5.5" stroke-linecap="round"/>')
        g.append(f'<path d="M46 86 Q64 100 82 86 Z" fill="{ink}" stroke="{ink}" stroke-width="2" stroke-linejoin="round"/>')
        g.append('<path d="M52 86.5 L58 86.5 L55 93 Z" fill="#fff"/><path d="M70 86.5 L76 86.5 L73 93 Z" fill="#fff"/>')
    else:
        g.append(f'<path d="M42 64 L54 70 L42 76 M86 64 L74 70 L86 76" stroke="{ink}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')
        g.append(f'<path d="M48 92 Q53 86 58 92 Q63 98 68 92 Q73 86 78 92" stroke="{ink}" stroke-width="4.5" fill="none" stroke-linecap="round"/>')
    out.append(f'<g transform="{t}">' + ''.join(g) + '</g>')
    if hit:  # impact stars
        for (x, y, r, c) in ((18, 30, 9, '#fff4c2'), (110, 26, 8, '#ffffff'), (106, 58, 6, '#fff4c2')):
            out.append(sparkle(x, y, r, c))
    return svg(128, ''.join(out))

def sparkle(x, y, r, color, opacity=1):
    k = r * 0.28
    return (f'<path d="M{x} {y-r} Q{x+k} {y-k} {x+r} {y} Q{x+k} {y+k} {x} {y+r} '
            f'Q{x-k} {y+k} {x-r} {y} Q{x-k} {y-k} {x} {y-r} Z" fill="{color}" opacity="{opacity}"/>')

def star_path(cx, cy, ro, ri):
    pts = []
    for i in range(10):
        r = ro if i % 2 == 0 else ri
        a = -math.pi / 2 + i * math.pi / 5
        pts.append(f'{cx + r*math.cos(a):.1f} {cy + r*math.sin(a):.1f}')
    return 'M' + ' L'.join(pts) + ' Z'

# ---------- Food ----------
def apple():
    shape = 'M32 21 C22 12 7 20 9 37 C11 53 24 59 32 55 C40 59 53 53 55 37 C57 20 42 12 32 21 Z'
    return svg(64, ''.join([
        f'<path d="{shape}" fill="#c0392b"/>',
        f'<path d="{shape}" fill="#e8483a" transform="translate(30 30) scale(.9) translate(-32 -32)"/>',
        '<ellipse cx="21" cy="31" rx="3.5" ry="7" fill="#ff8f80" transform="rotate(20 21 31)"/>',
        '<path d="M32 22 Q31 15 34 9" stroke="#7a4a28" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
        '<path d="M35 15 Q45 5 53 11 Q45 20 35 15 Z" fill="#4e9a32"/>',
        '<path d="M35 15 Q45 8 51 11 Q44 15 35 15 Z" fill="#6cc04a"/>',
    ]))

def banana():
    base = 'M11 14 C5 44 30 62 57 47 C54 40 50 37 45 37 C30 39 23 30 23 15 Z'
    top = 'M14 15 C10 39 31 54 51 42 C49 39 47 37 45 37 C30 39 23 30 23 15 Z'
    return svg(64, ''.join([
        f'<path d="{base}" fill="#e3ad1c" stroke="#e3ad1c" stroke-width="3" stroke-linejoin="round"/>',
        f'<path d="{top}" fill="#ffd84a"/>',
        '<path d="M16 24 C17 36 25 44 36 46" stroke="#fff0a0" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".9"/>',
        '<path d="M12 16 L11 7 Q16 5 21 7 L22 16 Z" fill="#8a6a2e" stroke="#8a6a2e" stroke-width="2" stroke-linejoin="round"/>',
        '<circle cx="57" cy="46" r="3" fill="#5d4426"/>',
    ]))

def cake():
    frost = ('M11 34 Q11 22 32 22 Q53 22 53 34 L53 37 Q50 43 47 37 Q44 33 41 39 Q38 45 35 38 '
             'Q32 33 29 38 Q25 44 22 37 Q19 33 16 39 Q13 43 11 37 Z')
    return svg(64, ''.join([
        '<ellipse cx="32" cy="55" rx="26" ry="5" fill="#c3cfdc"/>',
        '<ellipse cx="32" cy="54" rx="24" ry="4" fill="#e6edf5"/>',
        '<rect x="13" y="30" width="38" height="24" rx="5" fill="#d9995a"/>',
        '<rect x="13" y="30" width="32" height="24" rx="5" fill="#f2bd7e"/>',
        '<rect x="13" y="42" width="38" height="4" fill="#fff4e4"/>',
        f'<path d="{frost}" fill="#e2648f" stroke="#e2648f" stroke-width="2" stroke-linejoin="round"/>',
        f'<path d="{frost}" fill="#ff8fb4" transform="translate(30 30) scale(.94) translate(-31 -32)"/>',
        '<path d="M32 16 Q34 8 40 6" stroke="#5c8f2e" stroke-width="2" fill="none" stroke-linecap="round"/>',
        '<circle cx="32" cy="18" r="6" fill="#c42a3a"/>',
        '<circle cx="31" cy="17" r="5" fill="#ef3e4f"/>',
        '<circle cx="29.5" cy="15.5" r="1.6" fill="#ffb3ba"/>',
        sparkle(53, 13, 6, '#fff6c2'), sparkle(9, 19, 4.5, '#ffffff'), sparkle(57, 28, 3, '#ffffff'),
    ]))

def golden_star():
    glow = ('<radialGradient id="glow"><stop offset="0" stop-color="#fff6b8" stop-opacity=".95"/>'
            '<stop offset=".55" stop-color="#ffe066" stop-opacity=".45"/>'
            '<stop offset="1" stop-color="#ffd23f" stop-opacity="0"/></radialGradient>')
    s = star_path(32, 34, 21, 9.5)
    return svg(64, ''.join([
        '<circle cx="32" cy="32" r="31" fill="url(#glow)"/>',
        f'<path d="{s}" fill="#e89a00" stroke="#e89a00" stroke-width="5" stroke-linejoin="round"/>',
        f'<path d="{star_path(31, 32.5, 19.5, 8.8)}" fill="#ffc928" stroke="#ffc928" stroke-width="4" stroke-linejoin="round"/>',
        f'<path d="M31 14 L28 27 L18 28 Z" fill="#fff0a0" stroke="#fff0a0" stroke-width="2" stroke-linejoin="round" opacity=".9"/>',
        '<ellipse cx="27" cy="34" rx="2" ry="2.8" fill="#7a4a10"/><ellipse cx="36" cy="34" rx="2" ry="2.8" fill="#7a4a10"/>',
        '<path d="M28.5 39 Q31.5 42 34.5 39" stroke="#7a4a10" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
        sparkle(54, 10, 6, '#ffffff'), sparkle(9, 50, 5, '#fff6c2'), sparkle(56, 50, 3.5, '#ffffff'), sparkle(8, 14, 3, '#fff6c2'),
    ]), defs=glow)

files = {
    'player_idle': player('idle'), 'player_walk': player('walk'), 'player_jump': player('jump'),
    'enemy_walk': enemy('walk'), 'enemy_hit': enemy('hit'),
    'food_apple': apple(), 'food_banana': banana(), 'food_cake': cake(), 'food_golden_star': golden_star(),
}
for name, content in files.items():
    open(os.path.join(OUT, name + '.svg'), 'w').write(content)
print(' '.join(files))
