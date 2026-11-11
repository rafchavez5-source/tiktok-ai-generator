// Descarga una biblioteca de recursos libres para los videos.
// Uso: npm run biblioteca                 (todo)
//      npm run biblioteca -- musica nasa  (solo algunas partes)
// Cada parte guarda un catalogo.json con título, archivo, licencia y fuente.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'biblioteca';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = 'FactVideoBot/0.1 (generic client; low volume)';

async function bajar(url, destino, { pausa = 400 } = {}) {
  if (existsSync(destino)) return true;
  for (let intento = 1; intento <= 4; intento += 1) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.ok) {
        writeFileSync(destino, Buffer.from(await res.arrayBuffer()));
        await sleep(pausa);
        return true;
      }
      if (res.status !== 429 && res.status < 500) return false;
    } catch {
      // error de red: se reintenta
    }
    await sleep(3000 * intento);
  }
  return false;
}

async function json(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
  return res.json();
}

const nombreSeguro = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

// ---------- Emojis animados de Google Noto (Lottie, CC BY 4.0) ----------
async function emojis() {
  const dir = join(BASE, 'animaciones', 'noto-emoji');
  mkdirSync(dir, { recursive: true });
  const api = await json('https://googlefonts.github.io/noto-emoji-animation/data/api.json');
  const catalogo = [];
  let ok = 0;
  for (const icono of api.icons) {
    const archivo = join(dir, `${icono.codepoint}.json`);
    const url = `https://fonts.gstatic.com/s/e/notoemoji/latest/${icono.codepoint}/lottie.json`;
    if (await bajar(url, archivo, { pausa: 80 })) {
      ok += 1;
      catalogo.push({
        codepoint: icono.codepoint,
        emoji: String.fromCodePoint(...icono.codepoint.split('_').map((c) => parseInt(c, 16))),
        etiquetas: icono.tags,
        categorias: icono.categories,
        archivo,
      });
    }
  }
  writeFileSync(join(dir, 'catalogo.json'), JSON.stringify({
    licencia: 'CC BY 4.0 — Noto Emoji Animation, Google',
    fuente: 'https://googlefonts.github.io/noto-emoji-animation/',
    elementos: catalogo,
  }, null, 2));
  console.log(`✓ Emojis animados: ${ok} de ${api.icons.length}`);
}

// ---------- Música de Kevin MacLeod (Incompetech, CC BY 4.0) ----------
const SENSACIONES = ['Grooving', 'Bright', 'Bouncy', 'Uplifting', 'Calming', 'Relaxed', 'Mysterious', 'Epic', 'Driving', 'Suspenseful', 'Humorous', 'Action'];
const POR_SENSACION = 8;

const segundos = (len) => len.split(':').reduce((a, b) => a * 60 + Number(b), 0);

async function musica() {
  const dir = join(BASE, 'musica', 'incompetech');
  mkdirSync(dir, { recursive: true });
  const piezas = await json('https://incompetech.com/music/royalty-free/pieces.json');
  writeFileSync(join(dir, 'catalogo-completo.json'), JSON.stringify(piezas));
  const elegidas = new Map();
  for (const feel of SENSACIONES) {
    const candidatas = piezas
      .filter((p) => (p.feel ?? '').split(',').map((f) => f.trim()).includes(feel))
      .filter((p) => p.length && segundos(p.length) >= 60 && segundos(p.length) <= 240)
      .sort((a, b) => (b.uploaded ?? '').localeCompare(a.uploaded ?? ''))
      .slice(0, POR_SENSACION);
    candidatas.forEach((p) => elegidas.set(p.filename, p));
  }
  const catalogo = [];
  for (const p of elegidas.values()) {
    const archivo = join(dir, `${nombreSeguro(p.title)}.mp3`);
    const url = `https://incompetech.com/music/royalty-free/mp3-royaltyfree/${encodeURIComponent(p.filename)}`;
    if (await bajar(url, archivo, { pausa: 1000 })) {
      catalogo.push({
        titulo: p.title,
        duracion: p.length,
        bpm: Number(p.bpm) || null,
        sensaciones: (p.feel ?? '').split(',').map((f) => f.trim()).filter(Boolean),
        instrumentos: p.instruments,
        descripcion: p.description,
        archivo,
        atribucion: `"${p.title}" Kevin MacLeod (incompetech.com) — Licensed under Creative Commons: By Attribution 4.0 License http://creativecommons.org/licenses/by/4.0/`,
      });
    }
  }
  writeFileSync(join(dir, 'catalogo.json'), JSON.stringify({
    licencia: 'CC BY 4.0 — hay que poner la atribución en la descripción del video',
    fuente: 'https://incompetech.com/music/royalty-free/',
    elementos: catalogo,
  }, null, 2));
  console.log(`✓ Música: ${catalogo.length} temas (${elegidas.size} elegidos de ${piezas.length})`);
}

// ---------- Imágenes y videos de la NASA (dominio público) ----------
const NASA_IMAGENES = ['jupiter', 'saturn rings', 'mars surface', 'earth from space', 'nebula', 'galaxy', 'moon surface',
  'rocket launch', 'astronaut spacewalk', 'solar flare', 'neptune', 'venus', 'mercury planet', 'international space station', 'aurora from space'];
const NASA_VIDEOS = ['rocket launch', 'earth from space station', 'solar flare', 'spacewalk'];

async function nasa() {
  const dirImg = join(BASE, 'nasa', 'imagenes');
  const dirVid = join(BASE, 'nasa', 'videos');
  mkdirSync(dirImg, { recursive: true });
  mkdirSync(dirVid, { recursive: true });
  const catalogo = [];

  async function buscar(q, tipo, cuantos, dir, preferidos) {
    const res = await json(`https://images-api.nasa.gov/search?q=${encodeURIComponent(q)}&media_type=${tipo}`);
    let n = 0;
    for (const item of res.collection.items) {
      if (n >= cuantos) break;
      const meta = item.data[0];
      try {
        const archivos = await json(item.href);
        const elegido = preferidos.map((suf) => archivos.find((u) => u.endsWith(suf))).find(Boolean);
        if (!elegido) continue;
        const ext = elegido.split('.').pop();
        const archivo = join(dir, `${meta.nasa_id.replace(/[^a-zA-Z0-9_-]/g, '_')}.${ext}`);
        if (await bajar(elegido.replace('http://', 'https://'), archivo, { pausa: 300 })) {
          n += 1;
          catalogo.push({
            tipo,
            busqueda: q,
            titulo: meta.title,
            descripcion: (meta.description ?? '').slice(0, 300),
            centro: meta.center,
            fecha: meta.date_created?.slice(0, 10),
            archivo,
            fuente: `https://images.nasa.gov/details/${meta.nasa_id}`,
          });
        }
      } catch {
        // se salta el elemento que falle
      }
    }
  }

  for (const q of NASA_IMAGENES) await buscar(q, 'image', 8, dirImg, ['~large.jpg', '~medium.jpg', '~orig.jpg']);
  for (const q of NASA_VIDEOS) await buscar(q, 'video', 4, dirVid, ['~mobile.mp4', '~small.mp4', '~preview.mp4', '~medium.mp4']);
  writeFileSync(join(BASE, 'nasa', 'catalogo.json'), JSON.stringify({
    licencia: 'Material de la NASA: en general sin derechos de autor; no usar logos de la NASA ni sugerir que la NASA respalda el video',
    fuente: 'https://images.nasa.gov/',
    elementos: catalogo,
  }, null, 2));
  console.log(`✓ NASA: ${catalogo.filter((c) => c.tipo === 'image').length} imágenes y ${catalogo.filter((c) => c.tipo === 'video').length} videos`);
}

// ---------- Todas las voces en español de Piper ----------
async function voces() {
  const dir = 'voces';
  mkdirSync(dir, { recursive: true });
  const lista = await json('https://huggingface.co/rhasspy/piper-voices/resolve/main/voices.json');
  const catalogo = [];
  for (const [clave, v] of Object.entries(lista)) {
    if (!clave.startsWith('es_')) continue;
    for (const ruta of Object.keys(v.files)) {
      if (!ruta.endsWith('.onnx') && !ruta.endsWith('.onnx.json')) continue;
      await bajar(`https://huggingface.co/rhasspy/piper-voices/resolve/main/${ruta}`, join(dir, ruta.split('/').pop()), { pausa: 200 });
    }
    catalogo.push({ voz: clave, calidad: v.quality, hablantes: v.num_speakers, idioma: v.language?.name_native, pais: v.language?.country_english });
  }
  writeFileSync(join(dir, 'catalogo.json'), JSON.stringify({
    nota: 'Voces de Piper. Cada voz tiene su propia licencia en su MODEL_CARD en huggingface.co/rhasspy/piper-voices.',
    edge: ['es-AR-ElenaNeural', 'es-AR-TomasNeural', 'es-MX-DaliaNeural', 'es-MX-JorgeNeural', 'es-CO-SalomeNeural', 'es-CO-GonzaloNeural', 'es-ES-ElviraNeural', 'es-ES-AlvaroNeural', 'es-ES-XimenaNeural', 'es-US-PalomaNeural', 'es-US-AlonsoNeural'],
    piper: catalogo,
  }, null, 2));
  console.log(`✓ Voces de Piper en español: ${catalogo.length}`);
}

const PARTES = { emojis, musica, nasa, voces };
const pedidas = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(PARTES);
for (const parte of pedidas) {
  if (!PARTES[parte]) {
    console.warn(`Parte desconocida: ${parte}. Opciones: ${Object.keys(PARTES).join(', ')}`);
    continue;
  }
  console.log(`▶ ${parte}…`);
  await PARTES[parte]().catch((err) => console.error(`✗ ${parte}: ${err.message}`));
}
