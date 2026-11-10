// Acceso a Wikidata y Wikimedia Commons (gratuito, sin claves).
import { createHash } from 'node:crypto';

const UA = 'FactVideoBot/0.1 (generic client; low volume)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** fetch con reintentos cuando Wikimedia pide ir más despacio (429) o falla la red. */
export async function fetchWithRetry(url, options = {}, tries = 6) {
  let wait = 3000;
  for (let i = 1; ; i += 1) {
    try {
      const res = await fetch(url, { ...options, headers: { 'User-Agent': UA, ...options.headers } });
      if (res.ok) return res;
      if (res.status !== 429 && res.status < 500) throw new Error(`HTTP ${res.status} en ${url}`);
      if (i >= tries) throw new Error(`HTTP ${res.status} tras ${tries} intentos en ${url}`);
    } catch (err) {
      if (i >= tries || /HTTP 4/.test(err.message)) throw err;
    }
    await sleep(wait);
    wait *= 2;
  }
}

export async function sparql(query) {
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`;
  const res = await fetchWithRetry(url, { headers: { Accept: 'application/sparql-results+json' } });
  const json = await res.json();
  return json.results.bindings.map((row) =>
    Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v.value])),
  );
}

/** Nombre de archivo de Commons a partir de la URL Special:FilePath que da Wikidata. */
export function commonsFileName(filePathUrl) {
  const raw = decodeURIComponent(filePathUrl.split('/Special:FilePath/')[1] ?? '');
  return raw.replace(/ /g, '_');
}

/** URL directa del archivo original en upload.wikimedia.org. */
export function originalUrl(fileName) {
  const h = createHash('md5').update(fileName).digest('hex');
  return `https://upload.wikimedia.org/wikipedia/commons/${h[0]}/${h.slice(0, 2)}/${encodeURIComponent(fileName)}`;
}

const LICENCIAS = [
  [/publicdomain\/zero/, 'CC0'],
  [/licenses\/by-sa\/([\d.]+)/, (m) => `CC BY-SA ${m[1]}`],
  [/licenses\/by\/([\d.]+)/, (m) => `CC BY ${m[1]}`],
];

/** Autor y licencia leídos de la página del archivo en Commons. */
export async function commonsCredit(fileName) {
  const pagina = `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName)}`;
  const html = await (await fetchWithRetry(pagina)).text();
  const strip = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&#?\w+;/g, ' ').replace(/\s+/g, ' ').trim();

  let autor = null;
  const aut = html.match(/id="fileinfotpl&#95;aut"[^>]*>[^<]*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/);
  if (aut) {
    autor =
      strip(aut[1])
        .replace(/\(\s*talk\s*·\s*contribs\s*\)/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80) || null;
  }

  // La licencia del archivo está en la sección de licencias, antes del pie de página.
  const inicio = html.indexOf('licensetpl');
  const fin = html.indexOf('id="footer"');
  const zona = inicio >= 0 ? html.slice(inicio, fin > inicio ? fin : undefined) : '';
  let licencia = null;
  for (const [re, name] of LICENCIAS) {
    const m = zona.match(re);
    if (m) {
      licencia = typeof name === 'function' ? name(m) : name;
      break;
    }
  }
  if (!licencia && /public domain|dominio público|PD-/i.test(zona)) licencia = 'Dominio público';
  return { autor, licencia: licencia ?? 'ver página del archivo', pagina };
}

export { sleep };
