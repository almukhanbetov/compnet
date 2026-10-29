"""Temporary hero illustrations (UI mockups, no text, no logos) for COMPNET pages.

Usage: python3 scripts/hero-svgs.py [out_dir]   (default: public/images/hero)
See docs/HERO_VISUALS.md.
"""
import sys, os
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "images", "hero")
W, H = 640, 520

DEFS = """<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8B5CF6"/><stop offset=".5" stop-color="#3B82F6"/><stop offset="1" stop-color="#22D3EE"/></linearGradient>
<linearGradient id="gh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8B5CF6"/><stop offset="1" stop-color="#22D3EE"/></linearGradient>
<linearGradient id="panel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A2440"/><stop offset="1" stop-color="#0E1528"/></linearGradient>
<linearGradient id="shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".10"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="img1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6D28D9" stop-opacity=".75"/><stop offset="1" stop-color="#0891B2" stop-opacity=".55"/></linearGradient>
<linearGradient id="img2" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#1D4ED8" stop-opacity=".7"/><stop offset="1" stop-color="#A855F7" stop-opacity=".5"/></linearGradient>
<filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="42"/></filter>
<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10"/></filter>
<filter id="shadow" x="-60%" y="-60%" width="220%" height="240%" filterUnits="objectBoundingBox"><feDropShadow dx="0" dy="16" stdDeviation="16" flood-color="#020617" flood-opacity=".45"/></filter>
</defs>"""

def glows(*spots):
    # One soft glow in the middle, fading out well inside the canvas (a
    # blurred shape cut by the canvas edge shows a hard border); the page
    # adds the wide glows around the image in CSS.
    x, y, _, c, o = spots[0]
    colors = {"v": "#7C3AED", "b": "#2563EB", "c": "#06B6D4", "p": "#EC4899"}
    return f'<ellipse cx="320" cy="250" rx="150" ry="120" fill="{colors[c]}" opacity="{min(o, .38)}" filter="url(#blur)"/>'

def panel(x, y, w, h, rx=18, accent=False, shadow=True):
    s = ' filter="url(#shadow)"' if shadow else ""
    stroke = 'url(#g)' if accent else '#FFFFFF'
    so = '.9' if accent else '.10'
    return (f'<g{s}><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="url(#panel)" fill-opacity=".94" stroke="{stroke}" stroke-opacity="{so}" stroke-width="{1.5 if accent else 1}"/>'
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="url(#shine)"/></g>')

def bar(x, y, w, h=7, o=.22, fill="#CBD5E1", rx=None):
    rx = h / 2 if rx is None else rx
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" fill-opacity="{o}"/>'

def gbar(x, y, w, h=8, rx=None, grad="gh", o=1):
    rx = h / 2 if rx is None else rx
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="url(#{grad})" fill-opacity="{o}"/>'

def dots(x, y):
    return "".join(f'<circle cx="{x + i * 12}" cy="{y}" r="3.5" fill="#E2E8F0" fill-opacity="{.35 - i * .08}"/>' for i in range(3))

def browser(x, y, w, h, accent=False):
    return panel(x, y, w, h, 16, accent) + dots(x + 18, y + 18) + bar(x + 64, y + 13, w * .45, 10, .12) + f'<line x1="{x}" y1="{y + 34}" x2="{x + w}" y2="{y + 34}" stroke="#fff" stroke-opacity=".08"/>'

def phone(x, y, w=118, h=230, accent=False):
    return (panel(x, y, w, h, 24, accent) + f'<rect x="{x + w / 2 - 18}" y="{y + 10}" width="36" height="6" rx="3" fill="#fff" fill-opacity=".14"/>')

def circle_icon(cx, cy, r, inner):
    return (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#panel)" stroke="url(#g)" stroke-opacity=".8" filter="url(#shadow)"/>' + inner)

def check(x, y, on=True):
    if on:
        return f'<rect x="{x}" y="{y}" width="14" height="14" rx="4" fill="url(#g)"/><path d="M{x + 3.5} {y + 7.5}l2.6 2.6 4.6-5" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
    return f'<rect x="{x + .5}" y="{y + .5}" width="13" height="13" rx="4" fill="none" stroke="#CBD5E1" stroke-opacity=".35"/>'

def svg(body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" fill="none">{DEFS}{body}</svg>'

pages = {}

# Home: a digital ecosystem around one core.
core = (320, 210)
sats = [(118, 92), (522, 96), (548, 268), (96, 300), (330, 392)]
lines = "".join(f'<path d="M{core[0]} {core[1]} Q{(core[0] + x) / 2} {(core[1] + y) / 2 - 30} {x} {y}" stroke="url(#gh)" stroke-opacity=".55" stroke-width="1.5" stroke-dasharray="4 6"/>' for x, y in sats)
pages["home"] = svg(
    glows((320, 210, 150, "v", .45), (520, 120, 110, "c", .3), (110, 340, 120, "b", .3))
    + '<ellipse cx="320" cy="215" rx="250" ry="150" stroke="#fff" stroke-opacity=".07"/><ellipse cx="320" cy="215" rx="170" ry="100" stroke="#fff" stroke-opacity=".06"/>'
    + lines
    + browser(30, 40, 176, 118) + gbar(48, 92, 80, 10) + bar(48, 112, 120) + bar(48, 126, 96)
    + panel(446, 44, 160, 108) + "".join(f'<rect x="{466 + i * 24}" y="{122 - hgt}" width="14" height="{hgt}" rx="4" fill="url(#g)" fill-opacity="{.5 + i * .1}"/>' for i, hgt in enumerate([22, 38, 30, 52, 44])) + bar(466, 62, 70, 8, .25)
    + phone(504, 196, 92, 160) + gbar(520, 236, 60, 26, 8, o=.85) + bar(520, 274, 56) + bar(520, 290, 44) + bar(520, 306, 60)
    + panel(28, 250, 150, 112) + "".join(bar(48, 272 + i * 26, 110, 14, .14, rx=5) + f'<circle cx="146" cy="{279 + i * 26}" r="3.5" fill="#22D3EE" fill-opacity=".9"/>' for i in range(3))
    + panel(250, 350, 160, 84) + f'<path d="M270 404c10-6 18 2 26-4s14-12 24-6 16 10 26 2 16-12 26-8 10 4 14 2" stroke="url(#gh)" stroke-width="2.5" stroke-linecap="round"/>' + bar(270, 368, 60, 8, .25)
    + f'<circle cx="{core[0]}" cy="{core[1]}" r="74" fill="#7C3AED" fill-opacity=".18" filter="url(#soft)"/>'
    + circle_icon(core[0], core[1], 54, '<circle cx="320" cy="210" r="38" stroke="url(#g)" stroke-width="2" stroke-opacity=".6"/><path d="M306 196l-14 14 14 14M334 196l14 14-14 14M324 190l-8 40" stroke="url(#gh)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>')
)

# Services: laptop with a web interface, phone with an app.
pages["services"] = svg(
    glows((300, 230, 170, "v", .4), (520, 300, 120, "c", .3))
    + '<g filter="url(#shadow)"><rect x="40" y="70" width="420" height="270" rx="18" fill="#0B1222" stroke="#fff" stroke-opacity=".12"/><path d="M8 352h484l-26 26H34z" fill="#1A2440" stroke="#fff" stroke-opacity=".12"/><rect x="214" y="352" width="72" height="8" rx="4" fill="#fff" fill-opacity=".08"/></g>'
    + '<rect x="56" y="86" width="388" height="238" rx="10" fill="url(#panel)"/>' + dots(72, 102)
    + bar(140, 98, 140, 9, .12) + gbar(72, 130, 160, 14) + bar(72, 156, 220, 9) + bar(72, 172, 180, 9)
    + gbar(72, 196, 92, 26, 8, o=.9) + bar(176, 196, 80, 26, .1, rx=8)
    + "".join(f'<rect x="{72 + i * 124}" y="240" width="112" height="70" rx="10" fill="url(#img{1 + i % 2})" fill-opacity=".55"/>' + bar(84 + i * 124, 290, 60, 7, .35) for i in range(3))
    + phone(468, 150, 140, 270, True) + gbar(484, 186, 108, 52, 12, o=.9) + "".join(bar(484, 252 + i * 34, 108, 26, .1, rx=8) + f'<circle cx="500" cy="{265 + i * 34}" r="7" fill="url(#g)"/>' + bar(514, 260 + i * 34, 56, 6, .3) for i in range(3))
    + bar(484, 392, 108, 16, .08, rx=8) + "".join(f'<circle cx="{500 + i * 26}" cy="400" r="3.5" fill="#E2E8F0" fill-opacity="{.6 if i == 0 else .25}"/>' for i in range(4))
    + panel(380, 30, 116, 64, 14) + '<path d="M408 52l-10 10 10 10M440 52l10 10-10 10M428 48l-8 28" stroke="url(#gh)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="476" cy="62" r="6" fill="#22D3EE" fill-opacity=".8"/>'
)

# Solutions: CRM, automation, integrations and analytics.
pages["solutions"] = svg(
    glows((360, 220, 170, "b", .35), (150, 360, 120, "v", .35), (560, 120, 90, "c", .3))
    + panel(170, 50, 430, 320, 20, True)
    + '<rect x="170" y="50" width="86" height="320" rx="20" fill="#0B1222" fill-opacity=".7"/>' + "".join(bar(188, 92 + i * 30, 50, 10, .18 if i else .0) + (gbar(188, 92, 50, 10) if i == 0 else "") for i in range(6))
    + "".join(bar(276 + c * 106, 76, 60, 8, .3) + "".join(f'<rect x="{276 + c * 106}" y="{96 + r * 52}" width="94" height="42" rx="9" fill="#fff" fill-opacity=".05" stroke="#fff" stroke-opacity=".07"/>' + (gbar(286 + c * 106, 106 + r * 52, 40, 6) if (c + r) % 2 == 0 else bar(286 + c * 106, 106 + r * 52, 40, 6, .35)) + bar(286 + c * 106, 120 + r * 52, 64, 5, .16) for r in range(3 - (c == 2))) for c in range(3))
    + panel(276, 268, 300, 86, 14, shadow=False) + '<path d="M296 334l36-22 30 12 36-30 34 16 36-24 40 10" stroke="url(#gh)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' + "".join(f'<circle cx="{x}" cy="{y}" r="4" fill="#0E1528" stroke="#22D3EE" stroke-width="2"/>' for x, y in [(332, 312), (398, 294), (468, 286), (548, 296)])
    + '<path d="M118 120C150 120 150 150 170 150M118 260C150 260 150 230 170 230M118 400C160 400 160 320 196 320" stroke="url(#gh)" stroke-opacity=".7" stroke-width="2" stroke-dasharray="5 6"/>'
    + circle_icon(86, 120, 32, '<rect x="72" y="108" width="28" height="24" rx="5" stroke="#22D3EE" stroke-width="2.2"/><path d="M78 116h16M78 123h10" stroke="#A78BFA" stroke-width="2.2" stroke-linecap="round"/>')
    + circle_icon(86, 260, 32, '<circle cx="86" cy="260" r="9" stroke="#22D3EE" stroke-width="2.2"/><path d="M86 244v5M86 271v5M70 260h5M97 260h5M75 249l3.5 3.5M93.5 267.5L97 271M75 271l3.5-3.5M93.5 252.5L97 249" stroke="#A78BFA" stroke-width="2.2" stroke-linecap="round"/>')
    + circle_icon(86, 400, 32, '<path d="M72 400h10l4-10 6 20 4-10h8" stroke="#22D3EE" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>')
    + panel(470, 392, 140, 72, 14) + gbar(488, 412, 70, 9) + bar(488, 432, 100, 7) + check(574, 410)
)

# Pricing: three plans, the middle one highlighted; transparent breakdown.
def plan(x, y, w, h, hi):
    tenge = f'<path d="M{x + 24} {y + 34}h22M{x + 24} {y + 41}h22M{x + 35} {y + 41}v18" stroke="{"#fff" if hi else "#A78BFA"}" stroke-width="3" stroke-linecap="round"/>'
    rows = "".join(check(x + 24, y + 96 + i * 26, hi or i < 2) + bar(x + 46, y + 100 + i * 26, w - 74 - (i % 2) * 18, 7, .26) for i in range(4))
    return panel(x, y, w, h, 18, hi) + (f'<rect x="{x}" y="{y}" width="{w}" height="58" rx="18" fill="url(#g)" fill-opacity=".9"/><rect x="{x}" y="{y + 40}" width="{w}" height="18" fill="url(#g)" fill-opacity=".9"/>' if hi else "") + tenge + bar(x + 58, y + 32, w - 84, 10, .45 if hi else .25, "#fff" if hi else "#CBD5E1") + bar(x + 58, y + 49, w - 110, 7, .3 if hi else .15, "#fff" if hi else "#CBD5E1") + rows + (gbar(x + 24, y + h - 48, w - 48, 28, 10) if hi else bar(x + 24, y + h - 48, w - 48, 28, .09, rx=10))
pages["pricing"] = svg(
    glows((320, 240, 170, "v", .42), (540, 120, 100, "c", .3), (100, 380, 110, "b", .3))
    + plan(28, 110, 182, 300, False) + plan(458, 110, 182 - 28, 300, False) + plan(212, 70, 216, 360, True)
    + panel(236, 446, 168, 52, 14) + bar(256, 462, 60, 7, .3) + gbar(256, 478, 128, 7) + '<circle cx="356" cy="481.5" r="8" fill="#fff" stroke="#22D3EE" stroke-width="3"/>'
)

# Calculator: an interactive project builder.
pages["calculator"] = svg(
    glows((260, 230, 160, "v", .42), (520, 300, 120, "c", .32))
    + panel(30, 60, 330, 380, 20)
    + bar(54, 86, 110, 10, .35) + "".join(f'<rect x="{54 + i * 96}" y="110" width="86" height="34" rx="10" fill="{"url(#g)" if i == 1 else "#fff"}" fill-opacity="{.95 if i == 1 else .05}" stroke="#fff" stroke-opacity=".08"/>' + bar(70 + i * 96, 123, 54, 7, .5 if i == 1 else .25, "#fff" if i == 1 else "#CBD5E1") for i in range(3))
    + bar(54, 168, 90, 8, .3) + "".join(check(54, 190 + i * 30, i in (0, 2, 3)) + bar(78, 193 + i * 30, 150 - (i % 3) * 22, 7, .25) + bar(292, 193 + i * 30, 44, 7, .16) for i in range(5))
    + bar(54, 352, 80, 8, .3) + '<rect x="54" y="374" width="282" height="8" rx="4" fill="#fff" fill-opacity=".08"/>' + gbar(54, 374, 176, 8) + '<circle cx="230" cy="378" r="10" fill="#fff" stroke="#8B5CF6" stroke-width="3"/>'
    + panel(390, 120, 220, 206, 20, True) + bar(414, 146, 90, 8, .3) + gbar(414, 172, 150, 22, 8) + bar(414, 206, 120, 9, .2)
    + '<rect x="414" y="238" width="172" height="10" rx="5" fill="#fff" fill-opacity=".07"/><rect x="452" y="238" width="96" height="10" rx="5" fill="url(#gh)"/>' + bar(414, 262, 60, 7, .22) + bar(526, 262, 60, 7, .22) + gbar(414, 286, 172, 22, 10, o=.9)
    + "".join(f'<g filter="url(#shadow)"><rect x="{x}" y="{y}" width="{s}" height="{s}" rx="12" fill="url(#{g})" fill-opacity=".85"/><rect x="{x}" y="{y}" width="{s}" height="{s}" rx="12" fill="url(#shine)"/></g>' for x, y, s, g in [(420, 360, 52, "img1"), (482, 380, 40, "img2"), (534, 352, 58, "g")])
    + '<path d="M472 352l10-14 10 14" stroke="#22D3EE" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>'
)

# Portfolio: projects on several devices.
pages["portfolio"] = svg(
    glows((300, 220, 170, "v", .4), (540, 320, 110, "c", .3), (110, 120, 100, "b", .3))
    + '<g filter="url(#shadow)"><rect x="30" y="40" width="440" height="290" rx="18" fill="#0B1222" stroke="#fff" stroke-opacity=".12"/><path d="M220 330h60l10 46h-80z" fill="#1A2440"/><rect x="170" y="374" width="160" height="10" rx="5" fill="#1A2440"/></g>'
    + '<rect x="46" y="56" width="408" height="258" rx="10" fill="url(#panel)"/>' + bar(62, 70, 60, 9, .3) + "".join(bar(300 + i * 40, 71, 28, 7, .18) for i in range(4))
    + '<rect x="62" y="94" width="376" height="120" rx="10" fill="url(#img1)"/>' + '<path d="M62 190l70-48 52 34 64-52 84 62 52-30 54 38v20H62z" fill="#0B1222" fill-opacity=".35"/>' + bar(84, 120, 150, 14, .55, "#fff") + bar(84, 144, 110, 8, .45, "#fff") + bar(84, 166, 70, 22, .9, "#fff", 8)
    + "".join(f'<rect x="{62 + i * 128}" y="228" width="116" height="70" rx="10" fill="url(#img{2 - i % 2})" fill-opacity=".6"/>' for i in range(3))
    + panel(372, 180, 170, 236, 18) + '<rect x="386" y="196" width="142" height="90" rx="10" fill="url(#img2)"/>' + bar(386, 300, 100, 9, .35) + bar(386, 318, 120, 7, .18) + "".join(f'<rect x="{386 + i * 74}" y="340" width="68" height="60" rx="9" fill="url(#img1)" fill-opacity=".5"/>' for i in range(2))
    + phone(500, 250, 116, 228, True) + '<rect x="512" y="276" width="92" height="76" rx="12" fill="url(#img1)"/>' + bar(512, 364, 70, 8, .35) + bar(512, 380, 86, 6, .18) + bar(512, 394, 60, 6, .18) + gbar(512, 418, 92, 22, 9)
)

# About: technologies, the development process and teamwork.
steps = [(80, 410), (230, 410), (380, 410), (530, 410)]
pages["about"] = svg(
    glows((330, 200, 160, "v", .4), (110, 380, 110, "b", .32), (560, 380, 100, "c", .3))
    + panel(170, 40, 300, 220, 18, True) + dots(190, 60) + "".join(bar(190 + ind * 18, 92 + i * 22, w, 8, .2 if i % 3 else .0) + (gbar(190 + ind * 18, 92 + i * 22, w, 8, o=.85) if i % 3 == 0 else "") for i, (ind, w) in enumerate([(0, 120), (1, 160), (2, 110), (1, 140), (0, 90), (1, 180), (2, 130)]))
    + panel(30, 90, 120, 140, 18) + "".join(f'<circle cx="{62 + (i % 2) * 54}" cy="{126 + (i // 2) * 54}" r="18" fill="url(#img{1 + i % 2})" stroke="#fff" stroke-opacity=".15"/><circle cx="{62 + (i % 2) * 54}" cy="{120 + (i // 2) * 54}" r="6" fill="#fff" fill-opacity=".55"/><path d="M{50 + (i % 2) * 54} {138 + (i // 2) * 54}a12 9 0 0 1 24 0" fill="#fff" fill-opacity=".45"/>' for i in range(4))
    + panel(492, 70, 120, 150, 18) + "".join(f'<rect x="{512 + (i % 2) * 44}" y="{92 + (i // 2) * 42}" width="36" height="34" rx="9" fill="#fff" fill-opacity=".05" stroke="url(#g)" stroke-opacity="{.8 if i == 1 else .25}"/>' for i in range(6))
    + '<path d="M80 410H530" stroke="url(#gh)" stroke-width="2" stroke-opacity=".6"/>' + "".join(circle_icon(x, y, 30, f'<circle cx="{x}" cy="{y}" r="{8 + i * 2}" stroke="#22D3EE" stroke-width="2.2" stroke-opacity="{.6 + i * .1}"/>') + bar(x - 34, y + 46, 68, 7, .25) for i, (x, y) in enumerate(steps))
    + '<path d="M320 260v48M150 230l80 120M492 220l-60 130" stroke="url(#gh)" stroke-opacity=".35" stroke-width="1.5" stroke-dasharray="4 6"/>'
)

# Contact: communication and a consultation.
pages["contact"] = svg(
    glows((300, 230, 160, "v", .42), (520, 140, 110, "c", .3), (120, 380, 110, "b", .3))
    + panel(120, 50, 330, 360, 22, True) + '<circle cx="154" cy="84" r="16" fill="url(#g)"/>' + bar(180, 76, 90, 8, .4) + bar(180, 90, 60, 6, .2) + '<circle cx="420" cy="84" r="5" fill="#22C55E"/>' + f'<line x1="120" y1="116" x2="450" y2="116" stroke="#fff" stroke-opacity=".08"/>'
    + "".join((f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="{"url(#g)" if me else "#fff"}" fill-opacity="{.9 if me else .06}"/>' + bar(x + 14, y + 14, w - 40, 7, .55 if me else .3, "#fff" if me else "#CBD5E1") + (bar(x + 14, y + 28, w - 70, 7, .4 if me else .2, "#fff" if me else "#CBD5E1") if h > 36 else "")) for x, y, w, h, me in [(140, 136, 200, 48, False), (230, 198, 200, 48, True), (140, 260, 170, 36, False), (250, 310, 180, 48, True)])
    + '<rect x="140" y="372" width="250" height="24" rx="12" fill="#fff" fill-opacity=".05"/><circle cx="418" cy="384" r="14" fill="url(#g)"/><path d="M412 384h12m-4-4l4 4-4 4" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    + circle_icon(70, 150, 34, '<path d="M58 140c0 14 10 24 24 24l5-6-7-5-4 3c-4-2-8-6-10-10l3-4-5-7z" fill="#22D3EE" fill-opacity=".9"/>')
    + circle_icon(70, 300, 34, '<rect x="55" y="289" width="30" height="22" rx="4" stroke="#A78BFA" stroke-width="2.2"/><path d="M56 291l14 10 14-10" stroke="#22D3EE" stroke-width="2.2" stroke-linecap="round"/>')
    + panel(470, 210, 150, 160, 18) + gbar(488, 230, 114, 22, 8, o=.85) + "".join(f'<rect x="{488 + (i % 4) * 30}" y="{266 + (i // 4) * 28}" width="22" height="20" rx="6" fill="{"url(#g)" if i == 6 else "#fff"}" fill-opacity="{1 if i == 6 else .06}"/>' for i in range(12)) + bar(488, 352, 80, 7, .25)
    + panel(470, 60, 150, 120, 18) + '<circle cx="545" cy="112" r="30" stroke="url(#g)" stroke-width="3"/><path d="M545 96v16l11 8" stroke="#22D3EE" stroke-width="3" stroke-linecap="round"/>' + bar(510, 154, 70, 7, .25)
)

# Website development: a catalog site with responsive layout, speed and search visibility.
pages["website-development"] = svg(
    glows((300, 220, 170, "v", .42), (540, 150, 110, "c", .32), (120, 400, 110, "b", .3))
    + browser(30, 40, 440, 330, True) + bar(50, 88, 50, 10, .45) + "".join(bar(260 + i * 46, 90, 34, 7, .2) for i in range(4))
    + '<rect x="50" y="116" width="400" height="96" rx="12" fill="url(#img2)"/>' + bar(72, 138, 170, 14, .6, "#fff") + bar(72, 162, 120, 8, .45, "#fff") + bar(72, 182, 76, 18, .95, "#fff", 7)
    + "".join(f'<rect x="{50 + (i % 4) * 102}" y="{226 + (i // 4) * 70}" width="92" height="60" rx="10" fill="#fff" fill-opacity=".04" stroke="#fff" stroke-opacity=".07"/><rect x="{58 + (i % 4) * 102}" y="{234 + (i // 4) * 70}" width="76" height="28" rx="6" fill="url(#img{1 + i % 2})" fill-opacity=".6"/>' + bar(58 + (i % 4) * 102, 270 + (i // 4) * 70, 50, 6, .3) for i in range(8))
    + '<path d="M300 300l26 62 10-24 24-10z" fill="#fff" stroke="#0B1222" stroke-width="2" stroke-linejoin="round"/>'
    + phone(470, 190, 120, 236, True) + '<rect x="482" y="216" width="96" height="58" rx="10" fill="url(#img2)"/>' + "".join(f'<rect x="{482 + (i % 2) * 50}" y="{284 + (i // 2) * 52}" width="46" height="44" rx="8" fill="url(#img{1 + i % 2})" fill-opacity=".5"/>' for i in range(4))
    + panel(500, 40, 120, 116, 18) + '<path d="M522 128a38 38 0 0 1 76 0" stroke="#fff" stroke-opacity=".12" stroke-width="8" stroke-linecap="round"/><path d="M522 128a38 38 0 0 1 64-28" stroke="url(#gh)" stroke-width="8" stroke-linecap="round"/><path d="M560 128l18-22" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="560" cy="128" r="5" fill="#fff"/>'
    + circle_icon(70, 430, 32, '<circle cx="66" cy="426" r="11" stroke="#22D3EE" stroke-width="2.6"/><path d="M74 434l9 9" stroke="#A78BFA" stroke-width="3" stroke-linecap="round"/>')
)

# Training: an assignment's code with a mistake and its fix, the mentor's
# review comment, the steps of the practice and the demonstrated result.
code_lines = [(0, 130), (1, 170), (2, 120), (2, 150), (2, 150), (1, 90), (0, 60), (0, 140)]
pages["training"] = svg(
    glows((300, 230, 160, "v", .42), (540, 140, 110, "c", .3), (120, 400, 110, "b", .3))
    + browser(40, 50, 370, 290, True)
    + '<rect x="52" y="160" width="346" height="22" rx="6" fill="#F43F5E" fill-opacity=".14"/><rect x="52" y="184" width="346" height="22" rx="6" fill="#22C55E" fill-opacity=".14"/>'
    + '<rect x="52" y="160" width="3" height="22" rx="1.5" fill="#F43F5E"/><rect x="52" y="184" width="3" height="22" rx="1.5" fill="#22C55E"/>'
    + "".join(bar(66, 98 + i * 24, 14, 7, .18) + (gbar(90 + ind * 18, 98 + i * 24, w, 7, o=.85) if i in (0, 5) else bar(90 + ind * 18, 98 + i * 24, w, 7, .45 if i in (3, 4) else .22)) for i, (ind, w) in enumerate(code_lines))
    + panel(300, 250, 240, 104, 18)
    + '<circle cx="330" cy="280" r="14" fill="url(#g)"/>' + bar(354, 274, 80, 8, .45) + bar(320, 304, 196, 7, .22) + bar(320, 322, 150, 7, .22)
    + '<path d="M300 300h-46" stroke="url(#gh)" stroke-opacity=".5" stroke-width="1.5" stroke-dasharray="4 5"/>'
    + panel(446, 40, 164, 194, 18, True)
    + "".join(check(466, 66 + i * 26, on=i < 4) + bar(490, 70 + i * 26, 96 - (i % 3) * 14, 7, .3 if i < 4 else .16) for i in range(6))
    + panel(70, 382, 210, 92, 18)
    + circle_icon(114, 428, 24, '<path d="M108 418l18 10-18 10z" fill="#22D3EE"/>')
    + bar(152, 412, 100, 8, .4) + bar(152, 430, 80, 6, .2) + gbar(152, 448, 104, 6)
    + '<path d="M175 340v38M528 234v12" stroke="url(#gh)" stroke-opacity=".35" stroke-width="1.5" stroke-dasharray="4 6"/>'
)

# DevOps and CI/CD: a branch in the repository, the workflow's steps, the
# image being built and the server it is deployed to, left to right.
def arrow(x1, y1, x2, y2):
    return (f'<path d="M{x1} {y1}H{x2 - 8}" stroke="url(#gh)" stroke-opacity=".7" stroke-width="2" stroke-dasharray="5 5"/>'
            f'<path d="M{x2 - 10} {y2 - 6}l8 6-8 6" stroke="#22D3EE" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')

pages["devops"] = svg(
    glows((320, 240, 160, "v", .42), (540, 160, 110, "c", .3), (110, 380, 110, "b", .3))
    # repository: a main line and a branch merging back
    + panel(30, 150, 130, 170, 18)
    + '<path d="M62 290V180" stroke="#CBD5E1" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/>'
    + '<path d="M62 270c0-22 44-22 44-44v-10c0-16-44-16-44-30" stroke="url(#gh)" stroke-width="3" fill="none" stroke-linecap="round"/>'
    + "".join(f'<circle cx="{x}" cy="{y}" r="7" fill="{c}" stroke="#0B1222" stroke-width="2"/>' for x, y, c in [(62, 290, "#94A3B8"), (106, 238, "#A78BFA"), (106, 214, "#A78BFA"), (62, 186, "#22D3EE")])
    + bar(120, 186, 26, 6, .3) + bar(120, 290, 20, 6, .2)
    + arrow(160, 235, 196, 235)
    # workflow: steps with checks, the last one running
    + panel(196, 110, 170, 250, 18, True)
    + bar(216, 132, 90, 9, .45)
    + "".join(check(216, 166 + i * 38, on=i < 3) + bar(240, 170 + i * 38, 100 - (i % 2) * 22, 7, .3 if i < 3 else .18) for i in range(4))
    + '<circle cx="223" cy="320" r="7" stroke="#22D3EE" stroke-width="2.4" stroke-dasharray="22 12"/>' + bar(240, 316, 70, 7, .18)
    + arrow(366, 235, 400, 235)
    # image: stacked container layers
    + "".join(f'<g filter="url(#shadow)"><path d="M{400} {214 + i * 26}l52-24 52 24-52 24z" fill="{["#1A2440", "#1E2A4A", "#232F55"][i]}" stroke="url(#g)" stroke-opacity="{.4 + i * .25}"/></g>' for i in (2, 1, 0))
    + '<path d="M400 214v52l52 24 52-24v-52" stroke="url(#g)" stroke-opacity=".35" fill="none"/>'
    + arrow(504, 235, 532, 235)
    # server: a rack with status lights
    + panel(532, 140, 84, 190, 16)
    + "".join(f'<rect x="546" y="{160 + i * 40}" width="56" height="28" rx="7" fill="#fff" fill-opacity=".05" stroke="#fff" stroke-opacity=".1"/><circle cx="560" cy="{174 + i * 40}" r="4" fill="{"#22C55E" if i < 3 else "#22D3EE"}"/>' + bar(570, 171 + i * 40, 24, 6, .25) for i in range(4))
    # below: the release, done
    + panel(196, 400, 248, 70, 18)
    + circle_icon(232, 435, 20, '<path d="M224 435l6 6 11-12" stroke="#22D3EE" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')
    + bar(264, 424, 120, 8, .4) + gbar(264, 442, 150, 6)
    + '<path d="M574 330v70H444" stroke="url(#gh)" stroke-opacity=".35" stroke-width="1.5" stroke-dasharray="4 6" fill="none"/>'
)

for name, body in pages.items():
    with open(os.path.join(OUT, f"{name}.svg"), "w") as f:
        f.write(body)
    print(f"{name}.svg {len(body.encode()) // 1024 + 1} KB")
