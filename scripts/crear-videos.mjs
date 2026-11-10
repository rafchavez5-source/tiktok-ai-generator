// Crea un video MP4 vertical con voz por cada paquete descargado en datos/.
// Pasos: escenas a partir de los datos → voz con Piper → render con Remotion.
// Uso: npm run videos                (todos)
//      npm run videos -- sistema-solar
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { PAQUETES } from './paquetes.mjs';
import { sintetizar, textoParaVoz } from './voz.mjs';

const SALIDA = 'videos';
const PUBLICO = resolve('remotion/public');
const VOZ = process.env.VOZ ?? 'voces/es_MX-claude-high.onnx';
const CHROMIUM = ['/opt/pw-browsers/chromium', process.env.CHROME_PATH].find((p) => p && existsSync(p));

// Nombres más cortos para que quepan bien en pantalla.
const NOMBRES_CORTOS = {
  'República Popular China': 'China',
  'Torres Abraj Al Bait': 'Abraj Al Bait',
  'Torre central de Shanghái': 'Torre de Shanghái',
};
const corto = (n) => NOMBRES_CORTOS[n] ?? n;

function creditoFoto(img) {
  if (!img) return 'Datos: Wikidata';
  return `${img.autor ? `Foto: ${img.autor}` : 'Foto'} · ${img.licencia} · Wikimedia Commons`;
}

/**
 * Reparte el tiempo del audio entre las palabras según lo que tarda en decirse cada una.
 * Piper no da tiempos por palabra, así que es una estimación.
 */
export function tiemposPalabras(texto, duracion) {
  const palabras = texto.split(/\s+/).filter(Boolean);
  const pesos = palabras.map((w) => textoParaVoz(w).replace(/[^\p{L}]/gu, '').length + 1 + (/[.,:;?!]$/.test(w) ? 4 : 0));
  const total = pesos.reduce((a, b) => a + b, 0);
  const util = Math.max(duracion - 0.15, 0.1);
  let t = 0.05;
  return palabras.map((w, i) => {
    const d = (pesos[i] / total) * util;
    const item = { w, start: t, end: t + d };
    t += d;
    return item;
  });
}

function prepararEscenas(paquete, datos, carpeta) {
  const elementos = datos.elementos.map((e) => ({
    ...e,
    nombre: corto(e.nombre),
    paises: e.paises?.map(corto),
    pais: e.pais && corto(e.pais),
  }));
  if (paquete.ordenar) elementos.sort(paquete.ordenar);
  const ranking = Boolean(paquete.ordenar);

  const base = [
    {
      id: 'gancho',
      type: 'hook',
      title: paquete.titulo,
      text: paquete.gancho,
      voz: `${paquete.titulo}. ${paquete.gancho}`,
      img: elementos[0]?.imagen,
    },
    ...elementos.map((e, i) => {
      const d = paquete.dato(e, i, datos.referencia);
      return {
        id: e.id,
        type: 'fact',
        rank: ranking ? i + 1 : null,
        title: e.nombre,
        text: d.narration,
        cifra: d.cifra,
        voz: `${ranking ? `Número ${i + 1}: ` : ''}${e.nombre}. ${d.narration}`,
        subtitulos: d.narration,
        img: e.imagen,
        fuente: e.fuente,
      };
    }),
    {
      id: 'cierre',
      type: 'outro',
      title: 'Sígueme para más datos curiosos',
      text: '¿Cuál te sorprendió más? Cuéntamelo en los comentarios.',
      voz: '¿Cuál te sorprendió más? Cuéntamelo en los comentarios, y sígueme para más datos curiosos.',
      img: null,
    },
  ];

  return base.map((s) => {
    const audio = `${paquete.id}/${s.id}.wav`;
    const segundos = sintetizar(s.voz, VOZ, join(PUBLICO, audio));
    let image = null;
    if (s.img?.archivo && existsSync(s.img.archivo)) {
      image = `${paquete.id}/${s.id}.jpg`;
      copyFileSync(s.img.archivo, join(PUBLICO, image));
    }
    // Los subtítulos solo muestran la parte del dato; se ajustan al final del audio.
    const textoSub = s.subtitulos ?? s.voz;
    const proporcion = s.subtitulos ? textoParaVoz(s.subtitulos).length / textoParaVoz(s.voz).length : 1;
    const desfase = segundos * (1 - proporcion);
    const words = tiemposPalabras(textoSub, segundos * proporcion).map((w) => ({
      ...w,
      start: w.start + desfase,
      end: w.end + desfase,
    }));
    return {
      id: s.id,
      type: s.type,
      rank: s.rank ?? null,
      title: s.title,
      text: s.text,
      cifra: s.cifra ?? null,
      words,
      audio,
      image,
      credit: s.type === 'outro' ? 'Datos: Wikidata · Fotos: Wikimedia Commons' : creditoFoto(s.img),
      duration: Math.max(s.type === 'hook' ? 3.2 : 2.5, segundos + 0.7),
      fuente: s.fuente,
      licencia: s.img,
      nombre: s.title,
    };
  });
}

function descripcion(paquete, escenas, datos) {
  const lineas = [paquete.titulo, '', paquete.hashtags, '', 'Fuentes:', `Datos: Wikidata (CC0), descargados el ${datos.descargado.slice(0, 10)}`];
  for (const s of escenas.filter((x) => x.type === 'fact')) {
    lineas.push(`- ${s.nombre}: ${s.fuente}`);
    if (s.licencia) {
      lineas.push(`  Foto: ${s.licencia.autor ?? 'autor en la página'} · ${s.licencia.licencia} · ${s.licencia.pagina}`);
    }
  }
  lineas.push('', 'Voz sintética: Piper (es_MX). Video hecho con Remotion.');
  return `${lineas.join('\n')}\n`;
}

function crearWhoosh() {
  const archivo = join(PUBLICO, 'whoosh.wav');
  if (!existsSync(archivo)) {
    // Barrido de ruido filtrado: efecto de transición creado localmente.
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'anoisesrc=d=0.5:c=pink:a=0.6',
      '-af', 'highpass=f=400,lowpass=f=5000,afade=t=in:d=0.18,afade=t=out:st=0.22:d=0.28,volume=0.8', archivo]);
  }
  return 'whoosh.wav';
}

const filtro = process.argv.slice(2);
const paquetes = PAQUETES.filter((p) => !filtro.length || filtro.includes(p.id));
mkdirSync(SALIDA, { recursive: true });

for (const paquete of paquetes) {
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
  const inicio = Date.now();
  mkdirSync(join(PUBLICO, paquete.id), { recursive: true });
  console.log(`▶ ${paquete.titulo}: generando voz…`);
  const escenas = prepararEscenas(paquete, datos, join(PUBLICO, paquete.id));
  const whoosh = crearWhoosh();

  // El bundle copia public/ al crearse: se vuelve a crear para incluir los audios nuevos.
  const url = await bundle({ entryPoint: resolve('remotion/index.jsx'), publicDir: PUBLICO });
  const inputProps = { scenes: escenas, whoosh };
  const composition = await selectComposition({ serveUrl: url, id: 'DatoCurioso', inputProps, browserExecutable: CHROMIUM });
  const destino = join(SALIDA, `${paquete.id}.mp4`);
  console.log(`  renderizando ${(composition.durationInFrames / 30).toFixed(1)} s de video…`);
  await renderMedia({
    composition,
    serveUrl: url,
    codec: 'h264',
    crf: 20,
    audioCodec: 'aac',
    outputLocation: destino,
    inputProps,
    browserExecutable: CHROMIUM,
    chromiumOptions: { gl: 'swangle' },
  });
  writeFileSync(join(SALIDA, `${paquete.id}.txt`), descripcion(paquete, escenas, datos));
  console.log(`✓ ${destino} (${((Date.now() - inicio) / 1000).toFixed(0)} s de proceso)`);
}
