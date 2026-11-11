// Crea el video cinematográfico de Venus (storyboard del usuario) con Remotion en 3D.
// Uso: npm run venus                         (video completo en videos/venus.mp4)
//      FOTOGRAMAS=60,400 npm run venus       (solo imágenes sueltas para revisar)
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { sintetizarEdge, tiemposPalabras } from './voz.mjs';

const PUBLICO = resolve('remotion/public');
const SALIDA = 'videos';
const CHROMIUM = ['/opt/pw-browsers/chromium', process.env.CHROME_PATH].find((p) => p && existsSync(p));
// Voz grave masculina (español latino): Jorge, con el tono bajado y un ritmo pausado.
const VOZ = { voz: process.env.EDGE_VOZ ?? 'es-MX-JorgeNeural', velocidad: '-4%', tono: '-12Hz' };

// Datos verificados (NASA): rotación sideral de Venus ≈ 243 días terrestres, retrógrada;
// periodo orbital ≈ 225 días terrestres.
const TRAMOS = [
  { id: 'gancho', minimo: 10, inicioVoz: 1.6, texto: 'En Venus, un día dura más que un año. Y eso no es lo más extraño de este planeta.' },
  { id: 'giro', minimo: 7, inicioVoz: 0.5, texto: 'Venus tarda 243 días terrestres en girar una sola vez sobre sí mismo.' },
  { id: 'orbita', minimo: 8, inicioVoz: 0.8, texto: 'Pero solo necesita 225 días para dar una vuelta completa alrededor del Sol.' },
  { id: 'amanecer', minimo: 7, inicioVoz: 0.6, texto: 'Y como gira al revés que la mayoría de los planetas, allí el Sol sale por el oeste.' },
  { id: 'cierre', minimo: 4.5, inicioVoz: 0.4, texto: 'Sígueme para descubrir más secretos del espacio.' },
];

mkdirSync(join(PUBLICO, 'venus'), { recursive: true });
mkdirSync(SALIDA, { recursive: true });

// Texturas y sonidos (se crean una sola vez)
if (!existsSync(join(PUBLICO, 'venus/nubes.png'))) execFileSync('python3', ['scripts/texturas.py', join(PUBLICO, 'venus')], { stdio: 'inherit' });
if (!existsSync(join(PUBLICO, 'ambiente-espacial.wav'))) execFileSync('python3', ['scripts/musica.py', PUBLICO], { stdio: 'inherit' });
if (!existsSync(join(PUBLICO, 'venus/superficie.jpg'))) {
  throw new Error('Falta remotion/public/venus/superficie.jpg (mapa de Magellan). Ver README, sección Venus.');
}

console.log('▶ Venus: generando voz…');
const tramos = TRAMOS.map((t) => {
  const audio = `venus/${t.id}.wav`;
  const segundos = sintetizarEdge(t.texto, join(PUBLICO, audio), VOZ);
  return {
    id: t.id,
    audio,
    inicioVoz: t.inicioVoz,
    duracion: Math.max(t.minimo, t.inicioVoz + segundos + 0.9),
    words: tiemposPalabras(t.texto, segundos),
  };
});

const serveUrl = await bundle({ entryPoint: resolve('remotion/index.jsx'), publicDir: PUBLICO });
const inputProps = { tramos, musica: 'ambiente-espacial.wav', transicion: 'transicion-orbital.wav' };
const opciones = { browserExecutable: CHROMIUM, chromiumOptions: { gl: 'swangle' } };
const composition = await selectComposition({ serveUrl, id: 'Venus', inputProps, ...opciones });

if (process.env.FOTOGRAMAS) {
  for (const f of process.env.FOTOGRAMAS.split(',').map(Number)) {
    const png = join(SALIDA, `venus-f${f}.png`);
    await renderStill({ composition, serveUrl, frame: Math.min(f, composition.durationInFrames - 1), output: png, inputProps, ...opciones });
    console.log(`  imagen ${png}`);
  }
} else {
  console.log(`  renderizando ${(composition.durationInFrames / 30).toFixed(1)} s…`);
  let ultimo = -1;
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    crf: 18,
    audioCodec: 'aac',
    outputLocation: join(SALIDA, 'venus.mp4'),
    inputProps,
    concurrency: 2,
    ...opciones,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 10) * 10;
      if (pct !== ultimo) {
        ultimo = pct;
        console.log(`  ${pct} %`);
      }
    },
  });
  writeFileSync(
    join(SALIDA, 'venus.txt'),
    `Venus rompe todo lo que sabemos sobre los días y los años. 🌎

#venus #espacio #astronomia #datoscuriosos #ciencia

Fuentes y créditos:
- Datos: NASA (rotación de Venus ≈ 243 días terrestres, retrógrada; año ≈ 225 días terrestres).
- Mapa de la superficie: NASA/JPL, misión Magellan (PIA00255, PIA00256) — dominio público.
- Nubes, nebulosa y música: generadas para este video.
- Voz: es-MX-JorgeNeural (Microsoft Edge). Video hecho con Remotion.
`,
  );
  console.log('✓ videos/venus.mp4');
}
