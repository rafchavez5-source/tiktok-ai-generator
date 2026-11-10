// Prepara el texto para la voz (números en palabras, símbolos) y genera el audio con Piper.
import { execFileSync } from 'node:child_process';

const UNIDADES = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
  'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte',
  'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos',
  'setecientos', 'ochocientos', 'novecientos'];

function menorQueMil(n) {
  if (n === 100) return 'cien';
  const c = Math.floor(n / 100);
  const r = n % 100;
  let txt = c ? CENTENAS[c] : '';
  if (r) {
    const dec = r < 30 ? UNIDADES[r] : `${DECENAS[Math.floor(r / 10)]}${r % 10 ? ` y ${UNIDADES[r % 10]}` : ''}`;
    txt = txt ? `${txt} ${dec}` : dec;
  }
  return txt;
}

// "uno" se apocopa delante de "mil" y "millones": veintiún mil, un millón.
const apocope = (t) => t.replace(/veintiuno$/, 'veintiún').replace(/(^|\s)uno$/, '$1un');

/** Número entero en palabras (hasta billones). */
export function enteroEnPalabras(n) {
  n = Math.floor(Math.abs(n));
  if (n === 0) return 'cero';
  const partes = [];
  const millones = Math.floor(n / 1e6);
  const miles = Math.floor((n % 1e6) / 1000);
  const resto = n % 1000;
  if (millones) {
    partes.push(millones === 1 ? 'un millón' : `${apocope(enteroEnPalabras(millones))} millones`);
  }
  if (miles) partes.push(miles === 1 ? 'mil' : `${apocope(menorQueMil(miles))} mil`);
  if (resto) partes.push(menorQueMil(resto));
  return partes.join(' ');
}

/** Número escrito en formato español ("8848,86", "1.326", "0,44") a palabras. */
export function numeroEnPalabras(texto) {
  const [entero, decimal] = texto.replace(/\./g, '').split(',');
  let txt = enteroEnPalabras(Number(entero));
  if (decimal) {
    const d = decimal.replace(/^0+/, '');
    const ceros = decimal.length - d.length;
    txt += ` coma ${'cero '.repeat(ceros)}${d ? enteroEnPalabras(Number(d)) : ''}`.trimEnd();
  }
  return txt;
}

/** Convierte un texto escrito en texto para leer en voz alta. */
export function textoParaVoz(texto) {
  return texto
    .replace(/#(\d+)/g, 'número $1')
    .replace(/km²/g, 'kilómetros cuadrados')
    .replace(/\s?%/g, ' por ciento')
    .replace(/(\d)\s?m\b/g, '$1 metros')
    .replace(/\d[\d.]*(,\d+)?/g, (m) => numeroEnPalabras(m))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Genera un .wav con Piper y devuelve su duración en segundos. */
export function sintetizar(texto, modelo, destino, { velocidad = 0.9, hablante = null } = {}) {
  const extra = hablante != null ? ['-s', String(hablante)] : [];
  execFileSync('python3', ['-m', 'piper', '-m', modelo, ...extra, '--length-scale', String(velocidad), '--sentence-silence', '0.15', '-f', destino], {
    input: textoParaVoz(texto),
    stdio: ['pipe', 'ignore', 'pipe'],
  });
  return duracionAudio(destino);
}

export function duracionAudio(archivo) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', archivo]);
  return Number(String(out).trim());
}
