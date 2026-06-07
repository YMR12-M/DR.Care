#!/usr/bin/env python3
"""Generate DR.Care PWA icons (192×192, 512×512) using pure Python stdlib."""
import math, struct, zlib, os

# ── PNG writer (RGBA colour type 6) ──────────────────────────────────────────
def _chunk(tag, data):
    c = tag + data
    return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xFFFFFFFF)

def save_png(path, w, h, buf):
    raw = b''.join(b'\x00' + bytes(v for px in buf[r*w:(r+1)*w] for v in px) for r in range(h))
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n'
                + _chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
                + _chunk(b'IDAT', zlib.compress(raw, 6))
                + _chunk(b'IEND', b''))

# ── Colours ───────────────────────────────────────────────────────────────────
TRANSPARENT = (0,   0,   0,   0)
BG          = (8,   8,   10,  255)
YEL         = (255, 210, 31,  255)

def clamp(v): return max(0, min(255, int(round(v))))
def blend(fg, bg, a):
    fa = a * fg[3] / 255.0
    return (clamp(fg[0]*fa + bg[0]*(1-fa)),
            clamp(fg[1]*fa + bg[1]*(1-fa)),
            clamp(fg[2]*fa + bg[2]*(1-fa)),
            clamp(bg[3] + fa*(255 - bg[3])))

# ── Primitives ────────────────────────────────────────────────────────────────
def fill_rrect(buf, w, h, x0, y0, x1, y1, r, color, aa=1.5):
    r = min(r, max(0, (x1-x0)/2), max(0, (y1-y0)/2))
    for y in range(max(0, int(y0-aa)), min(h, int(y1+aa)+1)):
        for x in range(max(0, int(x0-aa)), min(w, int(x1+aa)+1)):
            qx = max(x0+r, min(x+.5, x1-r))
            qy = max(y0+r, min(y+.5, y1-r))
            d  = math.hypot(x+.5-qx, y+.5-qy) - r
            if d < aa:
                buf[y*w+x] = blend(color, buf[y*w+x], max(0., min(1., (aa-d)/aa)))

def fill_circle(buf, w, h, cx, cy, r, color, aa=1.5):
    for y in range(max(0, int(cy-r-aa)), min(h, int(cy+r+aa)+1)):
        for x in range(max(0, int(cx-r-aa)), min(w, int(cx+r+aa)+1)):
            d = math.hypot(x+.5-cx, y+.5-cy) - r
            if d < aa:
                buf[y*w+x] = blend(color, buf[y*w+x], max(0., min(1., (aa-d)/aa)))

# ── Bitmap glyphs 5×7 ─────────────────────────────────────────────────────────
_D = [[1,1,1,0,0],
      [1,0,0,1,0],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,1,0],
      [1,1,1,0,0]]

_R = [[1,1,1,0,0],
      [1,0,0,1,0],
      [1,0,0,1,0],
      [1,1,1,0,0],
      [1,0,1,0,0],
      [1,0,0,1,0],
      [1,0,0,0,1]]

def draw_glyph(buf, w, h, glyph, ox, oy, cw, ch, color):
    pad = max(0.5, cw * 0.10)
    for row, bits in enumerate(glyph):
        for col, bit in enumerate(bits):
            if bit:
                fill_rrect(buf, w, h,
                           ox+col*cw+pad,   oy+row*ch+pad,
                           ox+(col+1)*cw-pad, oy+(row+1)*ch-pad,
                           pad*0.7, color)

# ── Icon builder ──────────────────────────────────────────────────────────────
def make_icon(size):
    buf = [TRANSPARENT] * (size * size)
    s   = size

    # Background — dark rounded square
    fill_rrect(buf, s, s, s*.05, s*.05, s*.95, s*.95, s*.20, BG)

    # ── "DR" letters — upper zone ──
    text_h = s * 0.33
    ch     = text_h / 7
    cw     = ch * 0.78
    gap    = s * 0.045
    total_w = 5*cw + gap + 5*cw
    ox     = (s - total_w) / 2.0
    oy     = s * 0.09

    draw_glyph(buf, s, s, _D, ox,          oy, cw, ch, YEL)
    draw_glyph(buf, s, s, _R, ox+5*cw+gap, oy, cw, ch, YEL)

    # ── Water drop — lower zone ──
    dcx   = s * 0.50
    dr    = s * 0.185
    dcy   = s * 0.725
    tip_y = s * 0.525

    # Bottom circle of the drop
    fill_circle(buf, s, s, dcx, dcy, dr, YEL)

    # Tapered teardrop tip pointing upwards
    N = 38
    for i in range(N+1):
        t  = i / N
        cy = dcy - dr*0.55 + (tip_y - (dcy - dr*0.55)) * (t**1.3)
        r  = dr * (1.0 - 0.97*t)
        if r > 0.3:
            fill_circle(buf, s, s, dcx, cy, r, YEL)

    # Shine highlight on drop (small white circle, top-left of drop)
    hl_r = dr * 0.22
    fill_circle(buf, s, s,
                dcx - dr*0.28, dcy - dr*0.30,
                hl_r, (255, 255, 255, 80))

    return buf

# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == '__main__':
    base      = os.path.dirname(os.path.abspath(__file__))
    icons_dir = os.path.join(base, 'icons')
    os.makedirs(icons_dir, exist_ok=True)

    for size, name in [(192, 'icon-192.png'), (512, 'icon-512.png')]:
        print(f'Generating {name} ({size}×{size}) …', flush=True)
        save_png(os.path.join(icons_dir, name), size, size, make_icon(size))
        print(f'  ✓ saved to icons/{name}')

    print('Done.')
