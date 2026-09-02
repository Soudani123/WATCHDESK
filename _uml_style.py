# -*- coding: utf-8 -*-
"""Charte graphique commune aux diagrammes UML du rapport WatchDesk.

Un seul endroit definit la palette claire, les polices, le cadre de diagramme
et les primitives de notation (acteur, cas d'utilisation, classe, ligne de vie,
message, fragment). Tous les scripts _draw_*.py s'appuient dessus : le rapport
reste homogene d'un chapitre a l'autre.
"""
from contextlib import contextmanager
import math
from PIL import Image, ImageDraw, ImageFont

SCALE = 3


def hx(s):
    s = s.lstrip("#")
    return tuple(int(s[i : i + 2], 16) for i in (0, 2, 4))


WHITE = (255, 255, 255)
INK = hx("1F2933")
MUTED = hx("7B8794")
LINE = hx("52616B")
FRAME_LINE = hx("34495E")
FRAME_FILL = hx("FBFDFF")
TITLE_INK = hx("1B3A57")
SHADOW = hx("DDE3E8")

# Palette claire : chaque teinte = (remplissage pastel, contour sature)
TONES = {
    "blue": (hx("E3F2FD"), hx("1565C0")),
    "green": (hx("E8F5E9"), hx("2E7D32")),
    "purple": (hx("EDE7F6"), hx("6A3FB5")),
    "amber": (hx("FFF3E0"), hx("EF6C00")),
    "pink": (hx("FCE4EC"), hx("AD1457")),
    "cyan": (hx("E0F7FA"), hx("00838F")),
    "teal": (hx("E0F2F1"), hx("00695C")),
    "red": (hx("FFEBEE"), hx("C62828")),
    "indigo": (hx("E8EAF6"), hx("283593")),
    "olive": (hx("F7F9E9"), hx("827717")),
    "violet": (hx("F3E5F5"), hx("7B1FA2")),
    "lightgreen": (hx("F1F8E9"), hx("558B2F")),
    "grey": (hx("ECEFF1"), hx("546E7A")),
}

# Une meme fonctionnalite garde sa couleur d'un chapitre a l'autre.
UC_TONE = {
    "S\u2019authentifier": "blue",
    "Se connecter\navec Google": "amber",
    "V\u00e9rifier e-mail\net mot de passe": "green",
    "Valider le code\n2FA (TOTP)": "cyan",
    "Activer la 2FA\n(scanner le QR)": "purple",
    "Consulter le\ndashboard": "lightgreen",
    "Consulter l\u2019aper\u00e7u": "blue",
    "Voir les KPIs": "cyan",
    "Voir l\u2019\u00e9tat\ndes machines": "teal",
    "Voir les\nincidents r\u00e9cents": "indigo",
    "Superviser les\nordinateurs": "green",
    "Ex\u00e9cuter une action\n\u00e0 distance": "amber",
    "Collecter les\nm\u00e9triques": "teal",
    "D\u00e9ployer l\u2019agent\nWindows": "purple",
    "G\u00e9n\u00e9rer des rapports\nPDF / Excel": "pink",
    "G\u00e9n\u00e9rer des\nrapports": "pink",
    "G\u00e9rer les\nincidents": "red",
    "Envoyer une\nnotification e-mail": "olive",
    "Interroger\nl\u2019assistant IA": "violet",
    "Suivre les\nvuln\u00e9rabilit\u00e9s": "lightgreen",
    "Consulter le\njournal d\u2019audit": "cyan",
    "G\u00e9rer les\nadministrateurs": "indigo",
    "Configurer\nle syst\u00e8me": "violet",
    "G\u00e9rer les r\u00e8gles\nd\u2019alertes": "amber",
}

_FONT_FILES = {
    True: [r"C:\Windows\Fonts\calibrib.ttf", r"C:\Windows\Fonts\arialbd.ttf"],
    False: [r"C:\Windows\Fonts\calibri.ttf", r"C:\Windows\Fonts\arial.ttf"],
}


class Canvas:
    """Surface de dessin en unites logiques, rendue en suréchantillonnage."""

    def __init__(self, w, h, scale=SCALE, mute=False):
        self.fw, self.fh, self.s, self.mute = w, h, scale, mute
        self.img = Image.new("RGB", (int(w * scale), int(h * scale)), WHITE)
        self.d = ImageDraw.Draw(self.img)
        self.f_title = self.font(24, True)
        self.f_kind = self.font(16, True)
        self.f_actor = self.font(16, True)
        self.f_uc = self.font(17, True)
        self.f_stereo = self.font(14, True)
        self.f_small = self.font(14)
        self.f_smallb = self.font(15, True)
        self.f_class = self.font(19, True)
        self.f_attr = self.font(15)
        self.f_mult = self.font(15, True)
        self.f_msg = self.font(15)

    def font(self, sz, bold=False):
        for name in _FONT_FILES[bold]:
            try:
                return ImageFont.truetype(name, int(sz * self.s))
            except OSError:
                pass
        return ImageFont.load_default()

    # --- mesures ---
    def tw(self, text, f):
        return self.d.textlength(text, font=f) / self.s

    def lh(self, f):
        a, b = f.getmetrics()
        return (a + b) / self.s

    def block_size(self, text, f, spacing=5):
        lines = text.split("\n")
        w = max(self.tw(l, f) for l in lines)
        h = len(lines) * self.lh(f) + (len(lines) - 1) * spacing
        return w, h

    # --- primitives ---
    def P(self, *xy):
        return tuple(v * self.s for v in xy)

    def line(self, p1, p2, width=2.0, fill=LINE):
        if self.mute:
            return
        self.d.line([self.P(*p1), self.P(*p2)], fill=fill, width=max(1, int(width * self.s)))

    def dashed(self, p1, p2, width=1.8, dash=9, gap=6, fill=LINE):
        x1, y1 = p1
        x2, y2 = p2
        length = math.hypot(x2 - x1, y2 - y1) or 1
        ux, uy = (x2 - x1) / length, (y2 - y1) / length
        pos, on = 0.0, True
        while pos < length:
            end = min(pos + (dash if on else gap), length)
            if on:
                self.line((x1 + ux * pos, y1 + uy * pos), (x1 + ux * end, y1 + uy * end), width, fill)
            pos, on = end, not on

    def rect(self, x0, y0, x1, y1, fill=None, outline=None, width=2.0, radius=0):
        if self.mute:
            return
        box = [self.P(x0, y0), self.P(x1, y1)]
        w = max(1, int(width * self.s))
        if radius:
            self.d.rounded_rectangle(box, radius=radius * self.s, fill=fill, outline=outline, width=w)
        else:
            self.d.rectangle(box, fill=fill, outline=outline, width=w)

    def ellipse(self, cx, cy, rx, ry, fill=None, outline=None, width=2.6):
        if self.mute:
            return
        self.d.ellipse(
            [self.P(cx - rx, cy - ry), self.P(cx + rx, cy + ry)],
            fill=fill,
            outline=outline,
            width=max(1, int(width * self.s)),
        )

    def arc(self, cx, cy, rx, ry, start, end, fill=LINE, width=2.0):
        if self.mute:
            return
        self.d.arc(
            [self.P(cx - rx, cy - ry), self.P(cx + rx, cy + ry)],
            start, end, fill=fill, width=max(1, int(width * self.s)),
        )

    def polygon(self, pts, fill=None, outline=None, width=2.0):
        if self.mute:
            return
        sp = [self.P(*p) for p in pts]
        if fill:
            self.d.polygon(sp, fill=fill)
        if outline:
            self.d.line(sp + [sp[0]], fill=outline, width=max(1, int(width * self.s)), joint="curve")

    def text_at(self, x, y, text, f, fill=INK, anchor="lm"):
        if self.mute:
            return
        self.d.text(self.P(x, y), text, font=f, fill=fill, anchor=anchor)

    def text_center(self, cx, cy, text, f, fill=INK, spacing=5):
        if self.mute:
            return
        lines = text.split("\n")
        step = self.lh(f) + spacing
        y = cy - (len(lines) - 1) * step / 2
        for l in lines:
            self.text_at(cx, y, l, f, fill, anchor="mm")
            y += step

    def save(self, paths, dpi=220):
        out = self.img.resize((int(self.fw), int(self.fh)), Image.Resampling.LANCZOS)
        for p in paths:
            p.parent.mkdir(parents=True, exist_ok=True)
            out.save(p, "PNG", dpi=(dpi, dpi))
        return out


# --------------------------------------------------------------------------
# Cadre de diagramme UML 2 : rectangle + pentagone de nom en haut a gauche
# --------------------------------------------------------------------------
TAG_H = 54


def frame(c, x, y, w, h, title):
    c.rect(x, y, x + w, y + h, fill=FRAME_FILL, outline=FRAME_LINE, width=3.0)
    tag_w, cut = c.tw(title, c.f_title) + 36, 16
    pts = [
        (x, y),
        (x + tag_w, y),
        (x + tag_w, y + TAG_H - cut),
        (x + tag_w - cut, y + TAG_H),
        (x, y + TAG_H),
    ]
    c.polygon(pts, fill=WHITE, outline=FRAME_LINE, width=3.0)
    c.text_at(x + 18, y + TAG_H / 2 + 1, title, c.f_title, fill=TITLE_INK)


# --------------------------------------------------------------------------
# Pointes de fleche
# --------------------------------------------------------------------------
def open_arrow(c, p1, p2, size=14, width=1.8, fill=LINE):
    """Pointe ouverte : dependance (include / extend) ou reponse."""
    ang = math.atan2(p2[1] - p1[1], p2[0] - p1[0])
    for a in (ang + math.radians(24), ang - math.radians(24)):
        c.line(p2, (p2[0] - size * math.cos(a), p2[1] - size * math.sin(a)), width, fill)


def solid_arrow(c, p1, p2, size=13, fill=LINE):
    """Pointe pleine : message synchrone."""
    ang = math.atan2(p2[1] - p1[1], p2[0] - p1[0])
    bx, by = p2[0] - size * math.cos(ang), p2[1] - size * math.sin(ang)
    left = (bx + size * 0.42 * math.sin(ang), by - size * 0.42 * math.cos(ang))
    right = (bx - size * 0.42 * math.sin(ang), by + size * 0.42 * math.cos(ang))
    if not c.mute:
        c.d.polygon([c.P(*p2), c.P(*left), c.P(*right)], fill=fill)


def hollow_arrow(c, p1, p2, size=17, fill=LINE):
    """Triangle creux : generalisation. La pointe designe l'element general."""
    ang = math.atan2(p2[1] - p1[1], p2[0] - p1[0])
    bx, by = p2[0] - size * math.cos(ang), p2[1] - size * math.sin(ang)
    left = (bx + size * 0.55 * math.sin(ang), by - size * 0.55 * math.cos(ang))
    right = (bx - size * 0.55 * math.sin(ang), by + size * 0.55 * math.cos(ang))
    c.line(p1, (bx, by), 2.0, fill)
    c.polygon([p2, left, right], fill=WHITE, outline=fill, width=1.8)


# --------------------------------------------------------------------------
# Diagramme de cas d'utilisation
# --------------------------------------------------------------------------
def actor(c, cx, cy, name, tone="blue", facing="right"):
    """Acteur en bonhomme ; renvoie le point d'attache des associations."""
    fill, edge = TONES[tone]
    r, head = 14, cy - 42
    c.ellipse(cx, head, r, r, fill=fill, outline=edge, width=2.2)
    c.line((cx, head + r), (cx, cy - 6), 2.2, edge)
    c.line((cx - 19, cy - 25), (cx + 19, cy - 25), 2.2, edge)
    c.line((cx, cy - 6), (cx - 16, cy + 17), 2.2, edge)
    c.line((cx, cy - 6), (cx + 16, cy + 17), 2.2, edge)
    c.text_center(cx, cy + 40, name, c.f_actor, fill=INK)
    return (cx + 19 if facing == "right" else cx - 19, cy - 25)


def usecase(c, cx, cy, text, tone=None):
    fill, edge = TONES[tone or UC_TONE.get(text, "blue")]
    w, h = c.block_size(text, c.f_uc)
    rx, ry = max(142, w / 2 + 34), max(54, h / 2 + 22)
    c.ellipse(cx, cy, rx, ry, fill=fill, outline=edge, width=2.6)
    c.text_center(cx, cy, text, c.f_uc, fill=INK)
    return (cx, cy, rx, ry)


def _edge(uc, tx, ty):
    cx, cy, rx, ry = uc
    dx, dy = tx - cx, ty - cy
    if abs(dx) < 1e-6 and abs(dy) < 1e-6:
        return cx + rx, cy
    m = math.sqrt((dx / rx) ** 2 + (dy / ry) ** 2)
    return cx + dx / m, cy + dy / m


def assoc(c, point, uc):
    """Association acteur - cas d'utilisation : trait plein, sans pointe."""
    c.line(point, _edge(uc, *point), 2.2)


def generalization(c, p1, p2):
    hollow_arrow(c, p1, p2)


def dependency(c, src, dst, stereotype, offset=22):
    """Dependance orientee : pointille + pointe ouverte + stereotype."""
    p1 = _edge(src, dst[0], dst[1])
    p2 = _edge(dst, src[0], src[1])
    c.dashed(p1, p2)
    open_arrow(c, p1, p2)
    ang = math.atan2(p2[1] - p1[1], p2[0] - p1[0])
    nx, ny = math.sin(ang), -math.cos(ang)
    if ny > 0:  # etiquette toujours au-dessus du trait
        nx, ny = -nx, -ny
    mx, my = (p1[0] + p2[0]) / 2 + nx * offset, (p1[1] + p2[1]) / 2 + ny * offset
    c.text_center(mx, my, f"\u00ab{stereotype}\u00bb", c.f_stereo, fill=INK)


UC_LEGEND = [
    ("assoc", "Association"),
    ("dep", "\u00abinclude\u00bb / \u00abextend\u00bb"),
    ("gen", "G\u00e9n\u00e9ralisation (h\u00e9ritage)"),
]


def legend(c, x, y, rows=UC_LEGEND, w=372):
    h = 40 + len(rows) * 30
    c.rect(x, y, x + w, y + h, fill=WHITE, outline=hx("B8C4CE"), width=1.6)
    c.text_at(x + 18, y + 26, "L\u00e9gende", c.f_smallb, fill=TITLE_INK)
    yy = y + 62
    for kind, text in rows:
        a, b = (x + 18, yy), (x + 68, yy)
        if kind == "assoc":
            c.line(a, b, 2.2)
        elif kind == "dep":
            c.dashed(a, (b[0] - 6, b[1]))
            open_arrow(c, a, b, size=12)
        elif kind == "gen":
            hollow_arrow(c, a, b, size=14)
        else:
            fill, edge = TONES[kind]
            c.rect(x + 20, yy - 11, x + 66, yy + 11, fill=fill, outline=edge, width=1.8)
        c.text_at(x + 82, yy, text, c.f_small)
        yy += 30
    return h


# --------------------------------------------------------------------------
# Diagramme de classes
# --------------------------------------------------------------------------
CLASS_HEAD = 52
CLASS_ROW = 27


def blend(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def class_box(c, x, y, w, name, attrs, tone="blue", stereo=None):
    """Classe UML : compartiment de nom puis compartiment des attributs."""
    fill, edge = TONES[tone]
    head_fill = blend(fill, edge, 0.20)
    head_h = CLASS_HEAD + (16 if stereo else 0)
    h = head_h + 10 + len(attrs) * CLASS_ROW + 12
    c.rect(x + 5, y + 5, x + w + 5, y + h + 5, fill=SHADOW)
    c.rect(x, y, x + w, y + h, fill=fill, outline=edge, width=2.6)
    c.rect(x + 1, y + 1, x + w - 1, y + head_h, fill=head_fill)
    c.rect(x, y, x + w, y + h, outline=edge, width=2.6)
    c.line((x, y + head_h), (x + w, y + head_h), 2.2, edge)
    if stereo:
        c.text_center(x + w / 2, y + 20, f"\u00ab{stereo}\u00bb", c.f_small, fill=edge)
        c.text_center(x + w / 2, y + head_h / 2 + 12, name, c.f_class, fill=edge)
    else:
        c.text_center(x + w / 2, y + head_h / 2 + 1, name, c.f_class, fill=edge)
    ay = y + head_h + 10 + CLASS_ROW / 2
    for a in attrs:
        c.text_at(x + 14, ay, a, c.f_attr, fill=INK)
        ay += CLASS_ROW
    return {"l": x, "r": x + w, "t": y, "b": y + h, "cx": x + w / 2, "cy": y + h / 2, "w": w, "h": h}


def _tag(c, cx, cy, text, f, fill=INK):
    w = c.tw(text, f)
    h = c.lh(f)
    c.rect(cx - w / 2 - 5, cy - h / 2 - 2, cx + w / 2 + 5, cy + h / 2 + 2, fill=FRAME_FILL)
    c.text_at(cx, cy, text, f, fill=fill, anchor="mm")


# --------------------------------------------------------------------------
# Architecture : paquetages, composants, noeuds de deploiement
# --------------------------------------------------------------------------
def package(c, x, y, w, h, label, tone="grey"):
    """Paquetage UML : onglet portant le nom, puis corps contenant les elements."""
    fill, edge = TONES[tone]
    tab_w, tab_h = c.tw(label, c.f_class) + 40, 38
    c.rect(x + 5, y + tab_h + 5, x + w + 5, y + h + 5, fill=SHADOW)
    c.rect(x, y, x + tab_w, y + tab_h, fill=blend(fill, edge, 0.18), outline=edge, width=2.4)
    c.rect(x, y + tab_h, x + w, y + h, fill=fill, outline=edge, width=2.4)
    c.text_at(x + 18, y + tab_h / 2 + 1, label, c.f_class, fill=edge)
    return {"l": x, "r": x + w, "t": y, "b": y + h, "cx": x + w / 2, "cy": y + h / 2}


def _inner_text(c, x, y, w, h, name, lines, stereo, edge, icon_h=0):
    top = y + 20 + icon_h
    if stereo:
        c.text_center(x + w / 2, top, f"\u00ab{stereo}\u00bb", c.f_small, fill=edge)
        top += 24
    nh = c.block_size(name, c.f_class)[1]
    c.text_center(x + w / 2, top + nh / 2 - 4, name, c.f_class, fill=edge)
    top += nh + 12
    for l in lines:
        c.text_center(x + w / 2, top, l, c.f_small, fill=INK)
        top += 24


def component(c, x, y, w, h, name, lines=(), tone="blue", stereo="component"):
    """Composant UML : rectangle + icone composant en haut a droite."""
    fill, edge = TONES[tone]
    c.rect(x + 5, y + 5, x + w + 5, y + h + 5, fill=SHADOW, radius=6)
    c.rect(x, y, x + w, y + h, fill=fill, outline=edge, width=2.4, radius=6)
    ix, iy = x + w - 40, y + 14
    c.rect(ix, iy, ix + 26, iy + 20, fill=WHITE, outline=edge, width=1.6)
    for k in (0, 1):
        c.rect(ix - 8, iy + 3 + k * 9, ix + 6, iy + 9 + k * 9, fill=WHITE, outline=edge, width=1.6)
    _inner_text(c, x, y, w, h, name, lines, stereo, edge)
    return {"l": x, "r": x + w, "t": y, "b": y + h, "cx": x + w / 2, "cy": y + h / 2}


def node(c, x, y, w, h, name, lines=(), tone="indigo", stereo="device", depth=20):
    """Noeud de deploiement : boite en perspective."""
    fill, edge = TONES[tone]
    side = blend(fill, edge, 0.16)
    c.polygon([(x, y + depth), (x + depth, y), (x + w + depth, y), (x + w, y + depth)],
              fill=side, outline=edge, width=2.4)
    c.polygon([(x + w, y + depth), (x + w + depth, y), (x + w + depth, y + h - depth), (x + w, y + h)],
              fill=side, outline=edge, width=2.4)
    c.rect(x, y + depth, x + w, y + h, fill=fill, outline=edge, width=2.4)
    _inner_text(c, x, y + depth, w, h - depth, name, lines, stereo, edge)
    return {"l": x, "r": x + w, "t": y + depth, "b": y + h, "cx": x + w / 2, "cy": (y + depth + h) / 2}


def env(c, x, y, w, h, name, lines=(), tone="cyan", stereo="execution environment"):
    """Environnement d'execution imbrique dans un noeud."""
    fill, edge = TONES[tone]
    c.rect(x, y, x + w, y + h, fill=fill, outline=edge, width=2.2, radius=6)
    _inner_text(c, x, y, w, h, name, lines, stereo, edge)
    return {"l": x, "r": x + w, "t": y, "b": y + h, "cx": x + w / 2, "cy": y + h / 2}


def database(c, x, y, w, h, name, lines=(), tone="teal", stereo="database"):
    """Base de donnees : cylindre."""
    fill, edge = TONES[tone]
    ry, cx = 24, x + w / 2
    c.ellipse(cx, y + h - ry, w / 2, ry, fill=fill)
    c.rect(x, y + ry, x + w, y + h - ry, fill=fill)
    c.arc(cx, y + h - ry, w / 2, ry, 0, 180, edge, 2.4)
    c.line((x, y + ry), (x, y + h - ry), 2.4, edge)
    c.line((x + w, y + ry), (x + w, y + h - ry), 2.4, edge)
    c.ellipse(cx, y + ry, w / 2, ry, fill=blend(fill, edge, 0.16), outline=edge, width=2.4)
    _inner_text(c, x, y, w, h, name, lines, stereo, edge, icon_h=22)
    return {"l": x, "r": x + w, "t": y, "b": y + h, "cx": cx, "cy": y + h / 2}


def path_link(c, pts, label=None, seg=0, stereo=None):
    """Chemin de communication : trait plein etiquete."""
    for a, b in zip(pts, pts[1:]):
        c.line(a, b, 2.4)
    if label:
        a, b = pts[seg], pts[seg + 1]
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        if stereo:
            _tag(c, mx, my - 13, f"\u00ab{stereo}\u00bb", c.f_small, fill=MUTED)
            _tag(c, mx, my + 12, label, c.f_smallb)
        else:
            _tag(c, mx, my - 14, label, c.f_smallb)


def dep_link(c, pts, label=None, seg=0):
    """Dependance entre paquetages ou composants : pointille + pointe ouverte."""
    for a, b in zip(pts, pts[1:]):
        c.dashed(a, b, width=2.0)
    open_arrow(c, pts[-2], pts[-1], size=15, width=2.0)
    if label:
        a, b = pts[seg], pts[seg + 1]
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        _tag(c, mx, my, label, c.f_smallb)


def note(c, x, y, text, w=None):
    """Note UML : coin superieur droit replie."""
    tw, th = c.block_size(text, c.f_small)
    bw, bh, cut = (w or tw + 46), th + 30, 18
    edge = hx("C9B98A")
    c.polygon([(x, y), (x + bw - cut, y), (x + bw, y + cut), (x + bw, y + bh), (x, y + bh)],
              fill=hx("FFFDF2"), outline=edge, width=1.8)
    c.line((x + bw - cut, y), (x + bw - cut, y + cut), 1.8, edge)
    c.line((x + bw - cut, y + cut), (x + bw, y + cut), 1.8, edge)
    c.text_center(x + bw / 2, y + bh / 2, text, c.f_small, fill=INK)
    return {"l": x, "r": x + bw, "t": y, "b": y + bh}


def _normal(ux, uy):
    """Perpendiculaire orientee vers le haut (ou vers la gauche si verticale)."""
    nx, ny = -uy, ux
    if ny > 0:
        nx, ny = -nx, -ny
    return nx, ny


def link(c, pts, label=None, m1=None, m2=None, seg=0):
    """Association de classes : polyligne, multiplicites et nom de role."""
    for a, b in zip(pts, pts[1:]):
        c.line(a, b, 2.4)
    if m1:
        _off(c, pts[0], pts[1], m1)
    if m2:
        _off(c, pts[-1], pts[-2], m2)
    if label:
        a, b = pts[seg], pts[seg + 1]
        n = math.hypot(b[0] - a[0], b[1] - a[1]) or 1
        nx, ny = _normal((b[0] - a[0]) / n, (b[1] - a[1]) / n)
        _tag(c, (a[0] + b[0]) / 2 - nx * 20, (a[1] + b[1]) / 2 - ny * 20, label, c.f_smallb)


def _off(c, end, nxt, text):
    dx, dy = nxt[0] - end[0], nxt[1] - end[1]
    n = math.hypot(dx, dy) or 1
    ux, uy = dx / n, dy / n
    nx, ny = _normal(ux, uy)
    c.text_at(end[0] + ux * 26 + nx * 15, end[1] + uy * 26 + ny * 15, text, c.f_mult, fill=INK, anchor="mm")


# --------------------------------------------------------------------------
# Diagramme de sequence
# --------------------------------------------------------------------------
HEAD_W, HEAD_H = 218, 66
STEP = 54
SELF_STEP = 76
BAR_W = 14


class Sequence:
    """Construit un diagramme de sequence : lignes de vie, messages, fragments."""

    def __init__(self, c, participants, left, right, top, bottom):
        self.c = c
        self.left, self.right = left, right
        self.parts = {}
        self.order = [p["key"] for p in participants]
        n = len(participants)
        span = right - left - HEAD_W - 80
        dx = span / (n - 1) if n > 1 else 0
        x0 = left + 40 + HEAD_W / 2
        self.y = top + HEAD_H + 56
        self.active = {}
        self._frag_depth = 0
        self._n = 0
        # Le rendu est empile en couches : barres d'execution, puis messages,
        # puis fragments. Sans cela une barre tracee tard effacerait un libelle.
        self._layers = {"bar": [], "msg": [], "frag": []}
        for i, p in enumerate(participants):
            x = x0 + i * dx
            self.parts[p["key"]] = x
            self._head(x, top, p)
            c.dashed((x, top + HEAD_H), (x, bottom), width=1.6, dash=8, gap=7, fill=hx("A7B3BD"))
            self.active[p["key"]] = []

    def _head(self, x, top, p):
        c = self.c
        fill, edge = TONES[p.get("tone", "blue")]
        c.rect(x - HEAD_W / 2 + 5, top + 5, x + HEAD_W / 2 + 5, top + HEAD_H + 5, fill=SHADOW, radius=8)
        c.rect(x - HEAD_W / 2, top, x + HEAD_W / 2, top + HEAD_H, fill=fill, outline=edge, width=2.4, radius=8)
        stereo = p.get("stereo")
        label = p["label"]
        if stereo:
            c.text_center(x, top + 20, f"\u00ab{stereo}\u00bb", c.f_small, fill=edge)
            c.text_center(x, top + HEAD_H / 2 + 12, label, c.f_smallb, fill=INK)
        else:
            c.text_center(x, top + HEAD_H / 2, label, c.f_smallb, fill=INK)

    # --- barres d'execution ---
    def activate(self, key):
        self.active[key].append(self.y - 14)

    def deactivate(self, key):
        if not self.active[key]:
            return
        y0 = self.active[key].pop()
        x = self.parts[key] + len(self.active[key]) * 6
        y1 = self.y - 24
        self._layers["bar"].append(
            lambda: self.c.rect(x - BAR_W / 2, y0, x + BAR_W / 2, y1, fill=WHITE, outline=LINE, width=1.6)
        )

    def _x(self, key, toward):
        x = self.parts[key]
        if self.active[key]:
            x += (BAR_W / 2) * (1 if toward > x else -1)
        return x

    # --- messages ---
    def _number(self, text, numbered):
        if numbered:
            self._n += 1
            return f"{self._n}. {text}"
        return text

    def _draw_msg(self, xa, xb, y, text, kind):
        c = self.c
        if kind == "reply":
            c.dashed((xa, y), (xb, y), width=1.8)
            open_arrow(c, (xa, y), (xb, y), size=12)
        else:
            c.line((xa, y), (xb, y), 2.0)
            if kind == "async":
                open_arrow(c, (xa, y), (xb, y), size=12)
            else:
                solid_arrow(c, (xa, y), (xb, y))
        cx, cy = (xa + xb) / 2, y - 16
        w, h = c.tw(text, c.f_msg), c.lh(c.f_msg)
        c.rect(cx - w / 2 - 6, cy - h / 2 - 1, cx + w / 2 + 6, cy + h / 2 + 1, fill=FRAME_FILL)
        c.text_center(cx, cy, text, c.f_msg, fill=INK)

    def msg(self, a, b, text, kind="sync", numbered=True):
        xa, xb = self._x(a, self.parts[b]), self._x(b, self.parts[a])
        y, label = self.y, self._number(text, numbered)
        self._layers["msg"].append(lambda: self._draw_msg(xa, xb, y, label, kind))
        self.y += STEP

    def reply(self, a, b, text, numbered=True):
        self.msg(a, b, text, kind="reply", numbered=numbered)

    def _draw_self(self, x, y, text, to_left):
        c = self.c
        w, h = 46, 30
        k = -1 if to_left else 1
        c.line((x, y), (x + k * w, y), 2.0)
        c.line((x + k * w, y), (x + k * w, y + h), 2.0)
        c.line((x + k * w, y + h), (x + k * 4, y + h), 2.0)
        solid_arrow(c, (x + k * w, y + h), (x, y + h))
        tw, th = c.tw(text, c.f_msg), c.lh(c.f_msg)
        ty = y + h / 2
        if to_left:
            x1 = x - w - 10
            c.rect(x1 - tw - 12, ty - th / 2 - 1, x1, ty + th / 2 + 1, fill=FRAME_FILL)
            c.text_at(x1 - 6, ty, text, c.f_msg, fill=INK, anchor="rm")
        else:
            c.rect(x + w + 10, ty - th / 2 - 1, x + w + 22 + tw, ty + th / 2 + 1, fill=FRAME_FILL)
            c.text_at(x + w + 16, ty, text, c.f_msg, fill=INK, anchor="lm")

    def self_msg(self, a, text, numbered=True):
        y, label = self.y, self._number(text, numbered)
        to_left = self.parts[a] + 68 + self.c.tw(label, self.c.f_msg) > self.right - 26
        x = self._x(a, self.parts[a] + (-1 if to_left else 1))
        self._layers["msg"].append(lambda: self._draw_self(x, y, label, to_left))
        self.y += SELF_STEP

    # --- fragments combines ---
    def _guard_text(self, x, y, text):
        c = self.c
        label = f"[{text}]"
        w, h = c.tw(label, c.f_small), c.lh(c.f_small)
        c.rect(x - 4, y - h / 2 - 2, x + w + 6, y + h / 2 + 2, fill=FRAME_FILL)
        c.text_at(x, y, label, c.f_small, fill=INK)

    @contextmanager
    def fragment(self, kind, guard):
        x0 = self.left + 18 + self._frag_depth * 16
        x1 = self.right - 18 - self._frag_depth * 16
        y0 = self.y - 32
        self.y += 30
        self._frag_depth += 1
        marks = []
        stack = getattr(self, "_marks_stack", [])
        stack.append(marks)
        self._marks_stack = stack
        try:
            yield self
        finally:
            stack.pop()
            self._frag_depth -= 1
            y1 = self.y - 18
            self._layers["frag"].append(lambda: self._draw_fragment(x0, y0, x1, y1, kind, guard, marks))
            self.y += 18

    def _draw_fragment(self, x0, y0, x1, y1, kind, guard, marks):
        c = self.c
        edge = hx("8898A6")
        c.rect(x0, y0, x1, y1, outline=edge, width=2.0)
        for my, mg in marks:
            c.dashed((x0, my), (x1, my), width=1.6, dash=8, gap=6, fill=edge)
            self._guard_text(x0 + 16, my + 18, mg)
        kw, kh, cut = c.tw(kind, c.f_smallb) + 26, 28, 10
        c.polygon(
            [(x0, y0), (x0 + kw, y0), (x0 + kw, y0 + kh - cut), (x0 + kw - cut, y0 + kh), (x0, y0 + kh)],
            fill=hx("EEF2F6"),
            outline=edge,
            width=2.0,
        )
        c.text_at(x0 + 13, y0 + kh / 2, kind, c.f_smallb, fill=TITLE_INK)
        self._guard_text(x0 + kw + 12, y0 + kh / 2, guard)

    def alt_else(self, guard):
        self.y += 14
        self._marks_stack[-1].append((self.y - 32, guard))
        self.y += 26

    def finish(self):
        for name in ("bar", "msg", "frag"):
            for fn in self._layers[name]:
                fn()
            self._layers[name] = []

    # --- note ---
    def note(self, key, text, dx=0, width=None):
        c = self.c
        x = self.parts[key] + dx
        w, h = c.block_size(text, c.f_small)
        bw, bh = (width or w + 46), h + 28
        y = self.y - 20
        self._layers["msg"].append(lambda: self._draw_note(x, y, bw, bh, text))
        self.y += bh + 24

    def _draw_note(self, x, y, bw, bh, text):
        c = self.c
        edge, cut = hx("C9B98A"), 16
        c.polygon(
            [(x, y), (x + bw - cut, y), (x + bw, y + cut), (x + bw, y + bh), (x, y + bh)],
            fill=hx("FFFDF2"),
            outline=edge,
            width=1.8,
        )
        c.line((x + bw - cut, y), (x + bw - cut, y + cut), 1.8, edge)
        c.line((x + bw - cut, y + cut), (x + bw, y + cut), 1.8, edge)
        c.text_center(x + bw / 2, y + bh / 2, text, c.f_small, fill=INK)


def render_sequence(title, participants, body, outputs, width=None, dpi=220):
    """Deux passes : la premiere mesure la hauteur, la seconde dessine."""
    n = len(participants)
    w = width or (200 + HEAD_W * n + 60 * (n - 1))
    probe = Canvas(10, 10, scale=1, mute=True)
    s = Sequence(probe, participants, 30, w - 30, 110, 10 ** 6)
    body(s)
    s.finish()
    h = s.y + 70
    c = Canvas(w, h)
    frame(c, 30, 30, w - 60, h - 60, title)
    s = Sequence(c, participants, 30, w - 30, 110, h - 70)
    body(s)
    s.finish()
    c.save(outputs, dpi=dpi)
    return w, h
