// Descarga clips de video cortos para cada elemento de los paquetes:
//  1) el video que Wikidata enlaza (propiedad P10, alojado en Wikimedia Commons);
//  2) si no hay, un video de la NASA (dominio público) para los paquetes del espacio.
// Los clips se recortan a 12 s, sin sonido, en MP4: datos/videos/<id>.mp4
// Uso: npm run clips            (todos los paquetes con datos)
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PAQUETES } from './paquetes.mjs';
import { commonsCredit, commonsFileName, fetchWithRetry, sleep, sparql } from './wikimedia.mjs';

const DIR = join('datos', 'videos');
mkdirSync(DIR, { recursive: true });

/** Convierte un clip a MP4 vertical-friendly, sin audio, de como máximo 12 s. */
function normalizar(origen, destino, inicio = 0) {
  execFileSync('ffmpeg', [
    '-v', 'error', '-y', '-ss', String(inicio), '-i', origen, '-t', '12', '-an',
    '-vf', "scale='if(gt(iw,ih),-2,1080)':'if(gt(iw,ih),1080,-2)',fps=30",
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-pix_fmt', 'yuv420p', destino,
  ]);
}

function duracion(archivo) {
  return Number(String(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', archivo])).trim()) || 0;
}

/** URL de una versión ligera del video de Commons (las transcodificaciones no tienen el límite de los originales). */
function urlsCommons(fileName) {
  const h = createHash('md5').update(fileName).digest('hex');
  const ruta = `${h[0]}/${h.slice(0, 2)}/${encodeURIComponent(fileName)}`;
  if (/\.gif$/i.test(fileName)) {
    return [`https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(fileName)}?width=720`];
  }
  return ['720p', '480p', '360p'].map(
    (q) => `https://upload.wikimedia.org/wikipedia/commons/transcoded/${ruta}/${encodeURIComponent(fileName)}.${q}.vp9.webm`,
  );
}

async function clipCommons(id, url) {
  const fileName = commonsFileName(url);
  const tmp = join(DIR, `${id}.descarga`);
  for (const u of urlsCommons(fileName)) {
    try {
      const res = await fetchWithRetry(u, {}, 3);
      writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
      const destino = join(DIR, `${id}.mp4`);
      normalizar(tmp, destino, 0);
      rmSync(tmp, { force: true });
      if (duracion(destino) < 2) return null;
      const credito = await commonsCredit(fileName);
      await sleep(2000);
      return { archivo: destino, duracion: duracion(destino), nombre: fileName, ...credito };
    } catch {
      // se prueba la siguiente calidad
    }
  }
  rmSync(tmp, { force: true });
  return null;
}

async function clipNasa(id, opciones) {
  const { q, id: nasaId = null, desde = 0 } = typeof opciones === 'string' ? { q: opciones } : opciones;
  const res = await (await fetch(`https://images-api.nasa.gov/search?q=${encodeURIComponent(q)}&media_type=video`)).json();
  for (const item of res.collection.items.slice(0, 10)) {
    const meta = item.data[0];
    if (nasaId && meta.nasa_id !== nasaId) continue;
    // Se descartan programas con presentadores o entrevistas.
    if (/live|interview|briefing|conference|episode|webinar|talk|this week|what's up/i.test(`${meta.title} ${meta.description ?? ''}`.slice(0, 400))) continue;
    try {
      const archivos = await (await fetch(item.href)).json();
      const mp4 = ['~mobile.mp4', '~small.mp4', '~preview.mp4'].map((s) => archivos.find((u) => u.endsWith(s))).find(Boolean);
      if (!mp4) continue;
      const tmp = join(DIR, `${id}.descarga`);
      writeFileSync(tmp, Buffer.from(await (await fetch(mp4.replace('http://', 'https://'))).arrayBuffer()));
      const total = duracion(tmp);
      if (total < 4) continue;
      const destino = join(DIR, `${id}.mp4`);
      // Se salta el principio (suele tener títulos) si el video es largo.
      normalizar(tmp, destino, Math.min(desde, Math.max(0, total - 6)));
      rmSync(tmp, { force: true });
      return {
        archivo: destino,
        duracion: duracion(destino),
        nombre: meta.title,
        autor: `NASA${meta.center ? ` / ${meta.center}` : ''}`,
        licencia: 'Dominio público (NASA)',
        pagina: `https://images.nasa.gov/details/${meta.nasa_id}`,
      };
    } catch {
      // siguiente resultado
    }
  }
  return null;
}

for (const paquete of PAQUETES) {
  const archivo = join('datos', `${paquete.id}.json`);
  if (!existsSync(archivo)) continue;
  const datos = JSON.parse(readFileSync(archivo, 'utf8'));
  console.log(`▶ ${paquete.titulo}`);
  const ids = datos.elementos.map((e) => `wd:${e.id}`).join(' ');
  const filas = await sparql(`SELECT ?item ?video WHERE { VALUES ?item { ${ids} } ?item wdt:P10 ?video . }`);
  const videoWikidata = new Map(filas.map((f) => [f.item.split('/').pop(), f.video]));

  for (const e of datos.elementos) {
    if (e.video?.archivo && existsSync(e.video.archivo)) {
      console.log(`  = ${e.nombre}: ya tenía clip`);
      continue;
    }
    let clip = null;
    if (videoWikidata.has(e.id)) clip = await clipCommons(e.id, videoWikidata.get(e.id));
    if (!clip && paquete.nasa?.[e.id]) clip = await clipNasa(e.id, paquete.nasa[e.id]);
    e.video = clip;
    console.log(`  ${clip ? '✓' : '·'} ${e.nombre}${clip ? `: ${clip.nombre}` : ': sin clip (se usa la foto)'}`);
  }
  writeFileSync(archivo, `${JSON.stringify(datos, null, 2)}\n`);
}
