// Genera ideas y guiones completos de datos curiosos con la API de Claude.
// Cada guion: gancho, 4 datos curiosos y cierre, con prompts visuales por escena.
// Resultado: public/guiones.json (la app web lo muestra en «Guiones»).
//
// Uso: ANTHROPIC_API_KEY=... npm run guiones            (20 guiones)
//      ANTHROPIC_API_KEY=... npm run guiones -- 5       (otra cantidad)
// En GitHub: Actions → «Generar guiones» → Run workflow (usa el secreto ANTHROPIC_API_KEY).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { duracionEscena, validarGuion } from './guiones-util.mjs';

const MODELO = 'claude-opus-5-5';
const CANTIDAD = Number(process.argv[2]) || 20;
const SALIDA = process.env.GUIONES_SALIDA ?? 'public/guiones.json';
const PARALELO = 4;

const client = new Anthropic();

const SISTEMA = `Eres guionista de videos cortos de TikTok de datos curiosos para público hispanohablante de Latinoamérica.
Escribes en español latino neutro, tuteando, con frases cortas y fáciles de decir en voz alta.
Solo usas datos bien establecidos y verificables (ciencia, historia, geografía, naturaleza, cuerpo humano, tecnología, espacio).
Evitas mitos populares, exageraciones, cifras dudosas, temas médicos que puedan confundir y temas sensibles o polémicos.
Si un dato tiene matices, lo dices con precisión en lugar de exagerarlo.`;

const IdeasSchema = z.object({
  ideas: z.array(
    z.object({
      titulo: z.string().describe('Título atractivo del video, máximo 8 palabras'),
      categoria: z.string().describe('Categoría corta: Espacio, Animales, Cuerpo humano, Historia, Geografía, Tecnología, Océano, Comida…'),
      enfoque: z.string().describe('Qué hace interesante a este video, en una frase'),
    }),
  ),
});

const Escena = {
  narracion: z.string().describe('Lo que dice la voz, máximo 30 palabras'),
  prompt_visual: z.string().describe('Prompt en inglés para un generador de imágenes o video: vertical 9:16, estilo, encuadre, luz; sin texto en la imagen'),
  descripcion_visual: z.string().describe('La misma idea visual explicada en español, en una frase'),
};

const GuionSchema = z.object({
  titulo: z.string(),
  categoria: z.string(),
  gancho: z.object({ texto_pantalla: z.string().describe('Máximo 7 palabras'), ...Escena }),
  datos: z
    .array(
      z.object({
        texto_pantalla: z.string().describe('Título del dato, máximo 6 palabras'),
        ...Escena,
        como_verificar: z.string().describe('Tipo de fuente donde verificar el dato (por ejemplo: NASA, enciclopedia, institución científica)'),
      }),
    )
    .describe('Exactamente 4 datos curiosos'),
  cierre: z.object({ texto_pantalla: z.string().describe('Máximo 7 palabras'), ...Escena }),
  descripcion_tiktok: z.string().describe('Texto para la descripción de TikTok, 1 o 2 frases'),
  hashtags: z.array(z.string()).describe('Entre 4 y 6 hashtags en minúsculas, con #'),
});

async function pedir(schema, prompt, maxTokens = 16000) {
  const stream = client.beta.messages.stream({
    model: MODELO,
    max_tokens: maxTokens,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: betaZodOutputFormat(schema) },
    system: SISTEMA,
    messages: [{ role: 'user', content: prompt }],
  });
  const respuesta = await stream.finalMessage();
  if (respuesta.stop_reason === 'refusal') throw new Error('Claude rechazó la petición');
  if (respuesta.stop_reason === 'max_tokens') throw new Error('La respuesta se cortó por longitud');
  const texto = respuesta.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return { datos: schema.parse(JSON.parse(texto)), uso: respuesta.usage };
}

async function conReintentos(fn, intentos = 3) {
  for (let i = 1; ; i += 1) {
    try {
      return await fn();
    } catch (err) {
      if (i >= intentos || err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.BadRequestError) throw err;
      console.warn(`  reintento ${i}: ${err.message}`);
    }
  }
}

const uso = { input: 0, output: 0 };
const sumar = (u) => {
  uso.input += u.input_tokens ?? 0;
  uso.output += u.output_tokens ?? 0;
};

console.log(`▶ Generando ${CANTIDAD} ideas…`);
const { datos: ideas, uso: usoIdeas } = await conReintentos(() =>
  pedir(
    IdeasSchema,
    `Propón ${CANTIDAD} ideas diferentes de videos de datos curiosos para TikTok. Varía las categorías (no más de 3 por categoría) y evita ideas parecidas entre sí.`,
  ),
);
sumar(usoIdeas);
const lista = ideas.ideas.slice(0, CANTIDAD);
console.log(`  ${lista.length} ideas`);

const guiones = new Array(lista.length);
let siguiente = 0;
async function trabajador() {
  while (siguiente < lista.length) {
    const i = siguiente;
    siguiente += 1;
    const idea = lista[i];
    const guion = await conReintentos(async () => {
      const { datos, uso: u } = await pedir(
        GuionSchema,
        `Escribe el guion completo del video «${idea.titulo}» (categoría: ${idea.categoria}; enfoque: ${idea.enfoque}).
Estructura: un gancho que atrape en los primeros 2 segundos, exactamente 4 datos curiosos distintos y sorprendentes sobre el tema, y un cierre que invite a comentar y seguir la cuenta.
Duración total al narrar: entre 35 y 55 segundos.`,
      );
      sumar(u);
      const errores = validarGuion(datos);
      if (errores.length) throw new Error(`guion inválido: ${errores.join('; ')}`);
      return datos;
    });
    const escenas = [
      { tipo: 'gancho', ...guion.gancho },
      ...guion.datos.map((d, n) => ({ tipo: 'dato', numero: n + 1, ...d })),
      { tipo: 'cierre', ...guion.cierre },
    ].map((e) => ({ ...e, duracion: duracionEscena(e.narracion) }));
    guiones[i] = { id: i + 1, ...guion, escenas };
    console.log(`  ✓ ${i + 1}. ${guion.titulo}`);
  }
}
await Promise.all(Array.from({ length: PARALELO }, trabajador));

const resultado = {
  generado: new Date().toISOString(),
  modelo: MODELO,
  aviso: 'Guiones generados con IA: verifica cada dato antes de publicar.',
  guiones,
};
mkdirSync(dirname(SALIDA), { recursive: true });
writeFileSync(SALIDA, `${JSON.stringify(resultado, null, 2)}\n`);
// Precio de referencia de Claude Opus 5.5: 4 USD por millón de tokens de entrada y 20 USD por millón de salida.
const costo = (uso.input * 4 + uso.output * 20) / 1e6;
console.log(`✓ ${guiones.length} guiones en ${SALIDA} · tokens: ${uso.input} entrada, ${uso.output} salida · costo aprox. ${costo.toFixed(2)} USD`);
