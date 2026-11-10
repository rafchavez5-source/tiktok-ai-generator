// Crea un video MP4 vertical por cada paquete descargado en datos/.
// Uso: npm run videos                (todos)
//      npm run videos -- sistema-solar
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { FPS, VIDEO_HEIGHT, VIDEO_WIDTH, drawFrame, videoLength } from '../src/lib/video.js';
import { PAQUETES } from './paquetes.mjs';

const SALIDA = 'videos';
mkdirSync(SALIDA, { recursive: true });

// Nombres más cortos para que quepan bien en pantalla.
const NOMBRES_CORTOS = { 'República Popular China': 'China', 'Torres Abraj Al Bait': 'Abraj Al Bait' };
const corto = (n) => NOMBRES_CORTOS[n] ?? n;

const palabras = (t) => t.trim().split(/\s+/).length;
// Sin voz, el texto se lee en pantalla: ~2,6 palabras por segundo más margen.
const segundosLectura = (t) => Math.min(7, Math.max(4, Math.ceil(palabras(t) / 2.6) + 2));

function creditoFoto(img) {
  if (!img) return 'Datos: Wikidata';
  const autor = img.autor ? `Foto: ${img.autor}` : 'Foto';
  return `${autor} · ${img.licencia} · Wikimedia Commons`;
}

export function construirProyecto(paquete, datos) {
  const elementos = datos.elementos.map((e) => ({
    ...e,
    nombre: corto(e.nombre),
    paises: e.paises?.map(corto),
    pais: e.pais && corto(e.pais),
  }));
  if (paquete.ordenar) elementos.sort(paquete.ordenar);

  const hecho = elementos.map((e, i) => ({ e, ...paquete.dato(e, i, datos.referencia) }));
  const scenes = [
    {
      id: 'gancho',
      type: 'hook',
      onScreenText: paquete.titulo,
      narration: paquete.gancho,
      duration: 3,
      image: elementos[0]?.imagen?.archivo ?? null,
      credit: creditoFoto(elementos[0]?.imagen),
    },
    ...hecho.map(({ e, onScreenText, narration }) => ({
      id: e.id,
      type: 'fact',
      onScreenText,
      narration,
      duration: segundosLectura(narration),
      image: e.imagen?.archivo ?? null,
      credit: creditoFoto(e.imagen),
    })),
    {
      id: 'cierre',
      type: 'outro',
      onScreenText: 'Sígueme para más datos curiosos',
      narration: '¿Cuál te sorprendió más? Cuéntamelo en los comentarios.',
      duration: 4,
      image: null,
      credit: 'Datos: Wikidata · Fotos: Wikimedia Commons',
    },
  ];
  return { topic: paquete.titulo, title: paquete.titulo, targetDuration: videoLength(scenes), scenes, elementos };
}

function descripcion(paquete, proyecto, datos) {
  const lineas = [paquete.titulo, '', paquete.hashtags, '', 'Fuentes:', `Datos: Wikidata (CC0), descargados el ${datos.descargado.slice(0, 10)}`];
  for (const e of proyecto.elementos) {
    lineas.push(`- ${e.nombre}: ${e.fuente}`);
    if (e.imagen) {
      lineas.push(`  Foto: ${e.imagen.autor ?? 'autor en la página'} · ${e.imagen.licencia} · ${e.imagen.pagina}`);
    }
  }
  return `${lineas.join('\n')}\n`;
}

async function renderizar(proyecto, destino) {
  const canvas = createCanvas(VIDEO_WIDTH, VIDEO_HEIGHT);
  const ctx = canvas.getContext('2d');
  const images = new Map();
  for (const s of proyecto.scenes) {
    if (s.image && !images.has(s.image)) images.set(s.image, await loadImage(readFileSync(s.image)));
  }

  const ffmpeg = spawn('ffmpeg', [
    '-v', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${VIDEO_WIDTH}x${VIDEO_HEIGHT}`, '-r', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    destino,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const terminado = new Promise((ok, mal) => ffmpeg.on('close', (c) => (c === 0 ? ok() : mal(new Error(`ffmpeg salió con ${c}`)))));

  const total = Math.round(videoLength(proyecto.scenes) * FPS);
  for (let f = 0; f < total; f += 1) {
    drawFrame(ctx, proyecto, f / FPS, images);
    const pixels = ctx.getImageData(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT).data;
    if (!ffmpeg.stdin.write(Buffer.from(pixels.buffer, pixels.byteOffset, pixels.byteLength))) {
      await new Promise((r) => ffmpeg.stdin.once('drain', r));
    }
  }
  ffmpeg.stdin.end();
  await terminado;
}

const filtro = process.argv.slice(2);
for (const paquete of PAQUETES.filter((p) => !filtro.length || filtro.includes(p.id))) {
  const archivo = join('datos', `${paquete.id}.json`);
  if (!existsSync(archivo)) {
    console.warn(`✗ ${paquete.id}: faltan datos. Ejecuta primero: npm run datos`);
    continue;
  }
  const datos = JSON.parse(readFileSync(archivo, 'utf8'));
  if (datos.elementos.length < 3) {
    console.warn(`✗ ${paquete.id}: muy pocos datos válidos (${datos.elementos.length})`);
    continue;
  }
  const proyecto = construirProyecto(paquete, datos);
  const destino = join(SALIDA, `${paquete.id}.mp4`);
  const inicio = Date.now();
  await renderizar(proyecto, destino);
  writeFileSync(join(SALIDA, `${paquete.id}.txt`), descripcion(paquete, proyecto, datos));
  console.log(`✓ ${destino} (${videoLength(proyecto.scenes)} s, ${((Date.now() - inicio) / 1000).toFixed(0)} s de proceso)`);
}
