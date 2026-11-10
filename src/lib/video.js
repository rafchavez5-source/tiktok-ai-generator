// Crea el video vertical en el propio navegador: dibuja cada escena en un <canvas>
// de 1080×1920 y lo graba con MediaRecorder. No usa servicios externos.

import { SCENE_TYPES } from './script.js';

export const VIDEO_WIDTH = 1080;
export const VIDEO_HEIGHT = 1920;
export const FPS = 30;

const COLORS = { hook: '#fe2c55', fact: '#25f4ee', outro: '#ffc94d' };
const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const ENTER = 0.45; // segundos de animación de entrada
const EXIT = 0.25; // segundos de salida

/** Escenas con duración válida (las de 0 s no aparecen en el video). */
export function playableScenes(scenes) {
  return scenes.filter((s) => (Number(s.duration) || 0) > 0);
}

export function videoLength(scenes) {
  return playableScenes(scenes).reduce((sum, s) => sum + Number(s.duration), 0);
}

/** Qué escena se ve en el segundo `t` y cuánto lleva en pantalla. */
export function sceneAt(scenes, t) {
  const list = playableScenes(scenes);
  let start = 0;
  for (let i = 0; i < list.length; i += 1) {
    const d = Number(list[i].duration);
    if (t < start + d || i === list.length - 1) {
      return { scene: list[i], index: i, count: list.length, local: Math.min(t - start, d), duration: d };
    }
    start += d;
  }
  return null;
}

/** Divide un texto en líneas que caben en `maxWidth`. `measure` devuelve el ancho de un texto. */
export function wrapText(text, maxWidth, measure) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate) <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const easeOut = (x) => 1 - (1 - x) ** 3;

function fitLines(ctx, text, maxWidth, maxLines, startSize, minSize, weight) {
  let size = startSize;
  let lines;
  do {
    ctx.font = `${weight} ${size}px ${FONT}`;
    lines = wrapText(text, maxWidth, (s) => ctx.measureText(s).width);
    if (lines.length <= maxLines) break;
    size -= 4;
  } while (size > minSize);
  return { size, lines };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Dibuja una imagen cubriendo todo el lienzo, con un zoom lento según `progress` (0–1). */
function drawCover(ctx, img, progress) {
  const W = VIDEO_WIDTH;
  const H = VIDEO_HEIGHT;
  const scale = Math.max(W / img.width, H / img.height) * (1.04 + 0.08 * progress);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  // Oscurece la foto para que el texto se lea bien.
  const shade = ctx.createLinearGradient(0, 0, 0, H);
  shade.addColorStop(0, 'rgba(7,7,11,0.70)');
  shade.addColorStop(0.45, 'rgba(7,7,11,0.55)');
  shade.addColorStop(1, 'rgba(7,7,11,0.85)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);
}

/**
 * Dibuja el fotograma del segundo `t` del proyecto.
 * `images` (opcional) es un Map de `scene.image` → imagen ya cargada.
 */
export function drawFrame(ctx, project, t, images = null) {
  const W = VIDEO_WIDTH;
  const H = VIDEO_HEIGHT;
  const info = sceneAt(project.scenes, t);

  // Fondo
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#101018');
  bg.addColorStop(1, '#07070b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  if (!info) {
    ctx.fillStyle = '#9a9aae';
    ctx.font = `600 48px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('Añade escenas con duración', W / 2, H / 2);
    return;
  }

  const { scene, index, count, local, duration } = info;
  const color = COLORS[scene.type] ?? COLORS.fact;

  const img = scene.image && images?.get(scene.image);
  if (img) drawCover(ctx, img, local / duration);

  // Brillo de color que se mueve despacio
  const gx = W * (0.75 - 0.15 * Math.sin(t * 0.6));
  const gy = H * (0.78 - 0.08 * Math.cos(t * 0.5));
  const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, 900);
  glow.addColorStop(0, `${color}55`);
  glow.addColorStop(1, `${color}00`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Barra de progreso por escenas (arriba)
  const gap = 10;
  const barW = (W - 120 - gap * (count - 1)) / count;
  for (let i = 0; i < count; i += 1) {
    const x = 60 + i * (barW + gap);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    roundRect(ctx, x, 70, barW, 10, 5);
    ctx.fill();
    const fill = i < index ? 1 : i === index ? local / duration : 0;
    if (fill > 0) {
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, x, 70, Math.max(barW * fill, 10), 10, 5);
      ctx.fill();
    }
  }

  // Animación de entrada y salida
  const enter = easeOut(Math.min(local / ENTER, 1));
  const exit = duration > ENTER + EXIT ? Math.min((duration - local) / EXIT, 1) : 1;
  const alpha = Math.max(0, Math.min(enter, exit));
  const shift = (1 - enter) * 60;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Etiqueta del tipo de escena
  const factNumber =
    scene.type === 'fact'
      ? playableScenes(project.scenes).slice(0, index + 1).filter((s) => s.type === 'fact').length
      : 0;
  const tag = scene.type === 'fact' ? `DATO ${factNumber}` : (SCENE_TYPES[scene.type] ?? '').toUpperCase();

  // Bloque de texto: título y narración
  const maxW = W - 160;
  const heading = fitLines(ctx, scene.onScreenText || '', maxW, 4, 104, 64, 800);
  const body = fitLines(ctx, scene.narration || '', maxW, 9, 60, 40, 500);
  const headLH = heading.size * 1.15;
  const bodyLH = body.size * 1.35;
  const tagH = 64;
  const blockH =
    tagH + 48 + heading.lines.length * headLH + (body.lines.length ? 56 + body.lines.length * bodyLH : 0);
  let y = Math.max(220, H * 0.45 - blockH / 2) + shift;

  ctx.font = `800 34px ${FONT}`;
  const tagW = ctx.measureText(tag).width + 56;
  ctx.fillStyle = color;
  roundRect(ctx, (W - tagW) / 2, y, tagW, tagH, tagH / 2);
  ctx.fill();
  ctx.fillStyle = '#0b0b10';
  ctx.fillText(tag, W / 2, y + 44);
  y += tagH + 48;

  ctx.font = `800 ${heading.size}px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 20;
  for (const line of heading.lines) {
    y += headLH;
    ctx.fillText(line, W / 2, y - heading.size * 0.2);
  }

  if (body.lines.length) {
    y += 56;
    ctx.font = `500 ${body.size}px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    for (const line of body.lines) {
      y += bodyLH;
      ctx.fillText(line, W / 2, y - body.size * 0.3);
    }
  }

  // Crédito de la imagen o de la fuente (abajo, por encima de los botones de TikTok).
  if (scene.credit) {
    ctx.shadowBlur = 0;
    ctx.font = `500 26px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const lines = wrapText(scene.credit, W - 200, (str) => ctx.measureText(str).width).slice(0, 2);
    lines.forEach((line, i) => ctx.fillText(line, W / 2, H - 340 + i * 34));
  }
  ctx.restore();
}

/** Mejor formato de video que admite este navegador (MP4 si es posible). */
export function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

export function canRecord(canvas) {
  return Boolean(pickMimeType()) && typeof canvas?.captureStream === 'function';
}

/**
 * Graba el video en tiempo real. Devuelve { blob, mimeType }.
 * `onProgress` recibe un número de 0 a 1. `signal` permite cancelar.
 */
export function recordVideo({ canvas, project, onProgress, signal }) {
  return new Promise((resolve, reject) => {
    const mimeType = pickMimeType();
    if (!mimeType || !canvas.captureStream) {
      reject(new Error('Este navegador no puede grabar video. Prueba con Chrome, Edge o Safari actualizados.'));
      return;
    }
    const total = videoLength(project.scenes);
    if (total <= 0) {
      reject(new Error('Añade al menos una escena con duración.'));
      return;
    }

    const ctx = canvas.getContext('2d');
    const stream = canvas.captureStream(FPS);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
    const chunks = [];
    let cancelled = false;
    let frame;

    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onerror = () => reject(new Error('Hubo un error al grabar el video.'));
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      if (cancelled) reject(new DOMException('Cancelado', 'AbortError'));
      else resolve({ blob: new Blob(chunks, { type: mimeType.split(';')[0] }), mimeType });
    };

    signal?.addEventListener('abort', () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      if (recorder.state !== 'inactive') recorder.stop();
    });

    drawFrame(ctx, project, 0);
    recorder.start(250);
    const startedAt = performance.now();

    const tick = () => {
      const t = (performance.now() - startedAt) / 1000;
      drawFrame(ctx, project, Math.min(t, total - 0.001));
      onProgress?.(Math.min(t / total, 1));
      if (t < total) {
        frame = requestAnimationFrame(tick);
      } else {
        recorder.stop();
      }
    };
    frame = requestAnimationFrame(tick);
  });
}
