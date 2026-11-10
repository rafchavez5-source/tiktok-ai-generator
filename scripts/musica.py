"""Genera la música de fondo y los efectos de sonido de los videos.

Todo se sintetiza aquí con numpy (sin muestras ni derechos de autor).
Uso: python3 scripts/musica.py remotion/public
"""
import sys
import wave
from pathlib import Path

import numpy as np

SR = 44100
rng = np.random.default_rng(7)


def guardar(ruta, audio):
    audio = np.clip(audio, -1, 1)
    if audio.ndim == 1:
        audio = np.stack([audio, audio], axis=1)
    datos = (audio * 32767).astype(np.int16)
    with wave.open(str(ruta), "wb") as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes(datos.tobytes())


def t(segundos):
    return np.arange(int(SR * segundos)) / SR


def envolvente(n, ataque=0.005, caida=0.2):
    x = np.arange(n) / SR
    env = np.minimum(1, x / max(ataque, 1e-4)) * np.exp(-x / max(caida, 1e-4))
    return env


def nota(freq):
    return 440.0 * 2 ** ((freq - 69) / 12)


def lowpass(x, corte):
    # Filtro paso bajo simple de un polo.
    a = np.exp(-2 * np.pi * corte / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def bombo():
    x = t(0.35)
    f = 50 + 110 * np.exp(-x * 30)
    fase = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(fase) * np.exp(-x * 9) * 0.9


def palmada():
    x = t(0.2)
    ruido = rng.uniform(-1, 1, x.size)
    return lowpass(ruido, 3500) * np.exp(-x * 22) * 0.5


def charles():
    x = t(0.06)
    ruido = rng.uniform(-1, 1, x.size)
    ruido = ruido - lowpass(ruido, 7000)
    return ruido * np.exp(-x * 70) * 0.25


def musica(duracion=90, bpm=104):
    """Base electrónica suave: acordes, bajo, bombo, palmas y charles."""
    total = int(SR * duracion)
    mezcla = np.zeros((total, 2))
    pulso = 60 / bpm
    compas = pulso * 4
    # Progresión: La menor – Fa – Do – Sol
    acordes = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
    bajos = [45, 41, 36, 43]

    def sumar(señal, inicio, pan=0.0):
        i = int(inicio * SR)
        if i >= total:
            return
        señal = señal[: total - i]
        mezcla[i : i + señal.size, 0] += señal * (1 - pan)
        mezcla[i : i + señal.size, 1] += señal * (1 + pan)

    k, c, h = bombo(), palmada(), charles()
    n_compases = int(duracion / compas) + 1
    for b in range(n_compases):
        base = b * compas
        acorde = acordes[b % 4]
        # Pad: ondas de sierra suavizadas, un acorde por compás.
        x = t(compas)
        pad = np.zeros(x.size)
        for m in acorde:
            for detune in (-0.08, 0.08):
                fr = nota(m + 12) * (1 + detune / 100)
                pad += 2 * ((x * fr) % 1) - 1
        pad = lowpass(pad / 6, 1400) * np.minimum(1, x / 0.3) * np.minimum(1, (compas - x) / 0.3) * 0.16
        sumar(pad, base, pan=-0.2)
        # Arpegio en corcheas.
        for paso in range(8):
            m = acorde[paso % 3] + 24
            xa = t(pulso / 2)
            arp = np.sin(2 * np.pi * nota(m) * xa) * envolvente(xa.size, 0.003, 0.12) * 0.07
            sumar(arp, base + paso * pulso / 2, pan=0.3)
        for paso in range(4):
            momento = base + paso * pulso
            sumar(k, momento)
            xb = t(pulso * 0.9)
            bajo = np.sin(2 * np.pi * nota(bajos[b % 4]) * xb) * envolvente(xb.size, 0.01, 0.35) * 0.32
            sumar(bajo, momento)
            if paso in (1, 3):
                sumar(c, momento, pan=0.05)
            sumar(h, momento + pulso / 2, pan=0.4)
            sumar(h * 0.6, momento + pulso / 4 * 3, pan=-0.4)

    # Entrada y salida suaves y normalización.
    fade = int(SR * 1.5)
    mezcla[:fade] *= np.linspace(0, 1, fade)[:, None]
    mezcla[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return mezcla / np.max(np.abs(mezcla)) * 0.8


def pop():
    x = t(0.15)
    f = 900 * np.exp(-x * 18) + 250
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 25) * 0.8


def ding():
    x = t(0.9)
    s = sum(np.sin(2 * np.pi * 1320 * k * x) / k for k in (1, 2, 3))
    return s * envolvente(x.size, 0.002, 0.25) * 0.45


def golpe():
    x = t(0.5)
    sub = np.sin(2 * np.pi * (40 + 60 * np.exp(-x * 12)) * x) * np.exp(-x * 5)
    ruido = lowpass(rng.uniform(-1, 1, x.size), 1200) * np.exp(-x * 14)
    return (sub * 0.9 + ruido * 0.5) * 0.9


def subida():
    """Riser: ruido y tono que suben durante 1,6 s para crear tensión."""
    x = t(1.6)
    f = 200 * (8 ** (x / 1.6))
    tono = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.35
    ruido = rng.uniform(-1, 1, x.size)
    ruido = ruido - lowpass(ruido, 300 + 6000 * (x[-1] / 1.6))
    env = (x / 1.6) ** 2
    return (tono + ruido * 0.5) * env * 0.9


def tic():
    x = t(0.03)
    return np.sin(2 * np.pi * 2400 * x) * np.exp(-x * 220) * 0.6


def swoosh():
    x = t(0.45)
    ruido = rng.uniform(-1, 1, x.size)
    corte = lowpass(ruido, 2500) - lowpass(ruido, 400)
    env = np.sin(np.pi * np.minimum(x / 0.45, 1)) ** 2
    return corte * env * 1.4


def campanitas():
    """Arpegio brillante para celebrar (número 1 y cierre)."""
    total = np.zeros(int(SR * 1.2))
    for i, m in enumerate([72, 76, 79, 84, 88]):
        x = t(0.7)
        s = (np.sin(2 * np.pi * nota(m) * x) + 0.4 * np.sin(2 * np.pi * nota(m + 12) * x)) * envolvente(x.size, 0.002, 0.18)
        ini = int(SR * 0.07 * i)
        total[ini : ini + s.size] += s[: total.size - ini] * 0.35
    return total


def eco(x, retardo=0.42, ganancia=0.45, repeticiones=5):
    y = x.copy()
    d = int(SR * retardo)
    for k in range(1, repeticiones + 1):
        if d * k >= x.size:
            break
        y[d * k :] += x[: -d * k] * ganancia**k
    return y


def ambiente_espacial(duracion=48):
    """Música espacial misteriosa: zumbido grave, acordes lentos, destellos con eco y viento."""
    n = int(SR * duracion)
    x = np.arange(n) / SR
    mezcla = np.zeros(n)
    # Zumbido grave que respira
    lfo = 0.6 + 0.4 * np.sin(2 * np.pi * x / 9)
    mezcla += (np.sin(2 * np.pi * 55 * x) * 0.5 + np.sin(2 * np.pi * 82.4 * x) * 0.3 + np.sin(2 * np.pi * 110.3 * x) * 0.15) * lfo * 0.35
    # Acordes lentos (La menor add9 – Fa maj7 – Do – Mi menor)
    acordes = [[57, 60, 64, 71], [53, 57, 60, 64], [48, 55, 60, 64], [52, 55, 59, 64]]
    largo = 8.0
    for i in range(int(duracion / largo) + 1):
        xa = t(largo + 2)
        pad = np.zeros(xa.size)
        for m in acordes[i % 4]:
            for det in (-0.15, 0.15):
                fr = nota(m) * (1 + det / 100)
                pad += 2 * ((xa * fr) % 1) - 1
        env = np.minimum(1, xa / 2.5) * np.minimum(1, np.maximum(0, (largo + 2 - xa) / 2.5))
        pad = lowpass(pad / 8, 700) * env * 0.22
        ini = int(SR * i * largo)
        fin = min(n, ini + pad.size)
        if ini < n:
            mezcla[ini:fin] += pad[: fin - ini]
    # Destellos agudos con eco (pentatónica de La menor)
    destellos = np.zeros(n)
    escala = [69, 72, 74, 76, 79, 81, 84]
    momento = 1.5
    while momento < duracion - 2:
        m = escala[int(rng.integers(0, len(escala)))]
        xs = t(1.2)
        nota_s = np.sin(2 * np.pi * nota(m + 12) * xs) * envolvente(xs.size, 0.005, 0.5) * 0.08
        i = int(SR * momento)
        destellos[i : i + nota_s.size] += nota_s[: n - i]
        momento += float(rng.uniform(1.6, 3.2))
    mezcla += eco(destellos)
    # Viento cósmico
    ruido_v = rng.uniform(-1, 1, n)
    viento = lowpass(ruido_v, 500) - lowpass(ruido_v, 120)
    mezcla += viento * (0.5 + 0.5 * np.sin(2 * np.pi * x / 13)) * 0.5
    fade = int(SR * 2)
    mezcla[:fade] *= np.linspace(0, 1, fade)
    mezcla[-fade:] *= np.linspace(1, 0, fade)
    return mezcla / np.max(np.abs(mezcla)) * 0.8


def transicion_orbital():
    """Barrido que sube y termina en un impacto grave: para cambiar de escena."""
    x = t(1.6)
    ruido_b = rng.uniform(-1, 1, x.size)
    sube = (x / 1.6) ** 2
    barrido = (ruido_b - lowpass(ruido_b, 200 + 3000 * (x[-1] / 1.6))) * sube * 0.5
    tono = np.sin(2 * np.pi * np.cumsum(80 + 500 * sube) / SR) * sube * 0.25
    impacto = np.zeros(int(SR * 2.4))
    xi = t(0.8)
    golpe_s = np.sin(2 * np.pi * (35 + 50 * np.exp(-xi * 10)) * xi) * np.exp(-xi * 4) * 0.9
    impacto[: x.size] += barrido + tono
    impacto[x.size : x.size + golpe_s.size] += golpe_s
    return impacto / np.max(np.abs(impacto)) * 0.9


if __name__ == "__main__":
    destino = Path(sys.argv[1] if len(sys.argv) > 1 else "remotion/public")
    destino.mkdir(parents=True, exist_ok=True)
    guardar(destino / "musica.wav", musica())
    guardar(destino / "pop.wav", pop())
    guardar(destino / "ding.wav", ding())
    guardar(destino / "golpe.wav", golpe())
    guardar(destino / "subida.wav", subida())
    guardar(destino / "tic.wav", tic())
    guardar(destino / "swoosh.wav", swoosh())
    guardar(destino / "campanitas.wav", campanitas())
    guardar(destino / "ambiente-espacial.wav", ambiente_espacial())
    guardar(destino / "transicion-orbital.wav", transicion_orbital())
    print("Música y efectos creados en", destino)
