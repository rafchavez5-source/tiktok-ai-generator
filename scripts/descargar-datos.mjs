// Descarga los paquetes de datos desde Wikidata y las imágenes desde Wikimedia Commons.
// Uso: npm run datos            (todos los paquetes)
//      npm run datos -- montanas-mas-altas
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PAQUETES } from './paquetes.mjs';
import { commonsCredit, commonsFileName, fetchWithRetry, sleep, sparql, thumbUrl } from './wikimedia.mjs';

const DATOS = 'datos';
const IMAGENES = join(DATOS, 'imagenes');
mkdirSync(IMAGENES, { recursive: true });

const filtro = process.argv.slice(2);
const paquetes = filtro.length ? PAQUETES.filter((p) => filtro.includes(p.id)) : PAQUETES;

const qid = (url) => url.split('/').pop();

async function descargarImagen(id, imagenUrl) {
  const fileName = commonsFileName(imagenUrl);
  if (!fileName || /\.(svg|tif|tiff|gif|pdf|webm|ogv)$/i.test(fileName)) return null;
  const destino = join(IMAGENES, `${id}.jpg`);
  if (!existsSync(destino)) {
    const res = await fetchWithRetry(thumbUrl(fileName));
    const tmp = join(IMAGENES, `${id}.original`);
    writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
    // Reduce la imagen a un tamaño adecuado para video vertical.
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', tmp, '-vf', "scale='min(1600,iw)':-2", '-q:v', '3', destino]);
    execFileSync('rm', ['-f', tmp]);
    await sleep(3000);
  }
  const credito = await commonsCredit(fileName);
  await sleep(1500);
  return { archivo: destino, nombre: fileName, ...credito };
}

for (const paquete of paquetes) {
  console.log(`\n▶ ${paquete.titulo}`);
  const ids = [...paquete.elementos, ...(paquete.referencia ? [paquete.referencia] : [])];
  const filas = await sparql(paquete.consulta(ids.map((id) => `wd:${id}`).join(' ')));

  const porId = new Map();
  for (const f of filas) {
    const id = qid(f.item);
    if (porId.has(id)) continue; // un valor por elemento
    porId.set(id, {
      id,
      nombre: f.itemLabel,
      valor: Number(f.valor),
      ...(f.poblacion && { poblacion: Number(f.poblacion) }),
      ...(f.periodo && { periodo: Number(f.periodo) }),
      ...(f.paises && { paises: f.paises.split('|').filter(Boolean) }),
      ...(f.ciudadLabel && { ciudad: f.ciudadLabel }),
      ...(f.paisLabel && { pais: f.paisLabel }),
      ...(f.anio && { anio: Number(f.anio) }),
      imagenUrl: f.imagen ?? null,
      fuente: `https://www.wikidata.org/wiki/${id}`,
    });
  }

  const elementos = [];
  for (const id of paquete.elementos) {
    const e = porId.get(id);
    if (!e) {
      console.warn(`  ✗ ${id}: sin datos en Wikidata, se omite`);
      continue;
    }
    if (!paquete.validar(e)) {
      console.warn(`  ✗ ${e.nombre}: valor fuera de rango (${e.valor}), se omite`);
      continue;
    }
    e.imagen = e.imagenUrl ? await descargarImagen(id, e.imagenUrl).catch((err) => {
      console.warn(`  ! ${e.nombre}: no se pudo bajar la imagen (${err.message})`);
      return null;
    }) : null;
    console.log(`  ✓ ${e.nombre}: ${e.valor}${e.imagen ? ' + imagen' : ''}`);
    elementos.push(e);
  }

  const salida = {
    id: paquete.id,
    titulo: paquete.titulo,
    descargado: new Date().toISOString(),
    fuente: 'Wikidata (CC0) e imágenes de Wikimedia Commons',
    referencia: paquete.referencia ? porId.get(paquete.referencia) ?? null : null,
    elementos,
  };
  writeFileSync(join(DATOS, `${paquete.id}.json`), `${JSON.stringify(salida, null, 2)}\n`);
  console.log(`  → ${join(DATOS, `${paquete.id}.json`)}`);
}
