"""Genera texturas para el Venus en 3D: capa de nubes y fondo de nebulosa.

Uso: python3 scripts/texturas.py remotion/public/venus
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

rng = np.random.default_rng(3)


def ruido(alto, ancho, octavas=6, estirar=1.0):
    """Ruido fractal suave. `estirar` > 1 alarga las formas en horizontal."""
    total = np.zeros((alto, ancho))
    amp = 1.0
    for o in range(octavas):
        gh = 3 * 2**o
        gw = max(2, int(gh * (ancho / alto) / estirar))
        base = rng.random((gh, gw))
        img = Image.fromarray((base * 255).astype(np.uint8)).resize((ancho, alto), Image.BICUBIC)
        total += np.asarray(img, dtype=float) / 255 * amp
        amp *= 0.55
    total -= total.min()
    return total / total.max()


def suave(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def nubes(destino, ancho=2048, alto=1024):
    n = ruido(alto, ancho, octavas=7, estirar=4.0)  # bandas alargadas, como las nubes de Venus
    lat = np.linspace(-1, 1, alto)[:, None]
    bandas = 0.5 + 0.5 * np.sin(lat * np.pi * 4 + n * 3.0)
    alfa = suave(n * 0.75 + bandas * 0.35, 0.35, 0.95) * 0.8
    color = np.zeros((alto, ancho, 4), dtype=np.uint8)
    color[..., 0] = 250
    color[..., 1] = (205 + n * 40).astype(np.uint8)
    color[..., 2] = (130 + n * 60).astype(np.uint8)
    color[..., 3] = (alfa * 255).astype(np.uint8)
    img = Image.fromarray(color, 'RGBA').filter(ImageFilter.GaussianBlur(2))
    img.save(destino / 'nubes.png')


def nebulosa(destino, ancho=1080, alto=1920):
    """Nubes cósmicas doradas y violetas con estrellas, para el fondo."""
    h, w = alto // 4, ancho // 4
    n1 = ruido(h, w, octavas=6)
    n2 = ruido(h, w, octavas=6)
    img = np.zeros((h, w, 3))
    img += (suave(n1, 0.45, 1.0) ** 1.5)[..., None] * np.array([1.0, 0.6, 0.22]) * 0.9
    img += (suave(n2, 0.5, 1.0) ** 1.5)[..., None] * np.array([0.42, 0.18, 0.62]) * 0.8
    im = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).resize((ancho, alto), Image.BICUBIC)
    im = im.filter(ImageFilter.GaussianBlur(6))
    arr = np.asarray(im).copy()
    for _ in range(1400):
        x, y = rng.integers(1, ancho - 1), rng.integers(1, alto - 1)
        b = int(rng.uniform(90, 255))
        arr[y, x] = np.maximum(arr[y, x], b)
        if rng.random() < 0.08:
            arr[y - 1 : y + 2, x - 1 : x + 2] = np.maximum(arr[y - 1 : y + 2, x - 1 : x + 2], b // 2)
    Image.fromarray(arr).save(destino / 'nebulosa.jpg', quality=90)


if __name__ == '__main__':
    d = Path(sys.argv[1] if len(sys.argv) > 1 else 'remotion/public/venus')
    d.mkdir(parents=True, exist_ok=True)
    nubes(d)
    nebulosa(d)
    print('Texturas creadas en', d)
