// Convierte los guiones generados con IA (public/guiones.json) al formato del editor.
import { createId } from './script.js';

const TIPOS = { gancho: 'hook', dato: 'fact', cierre: 'outro' };

export function guionAProyecto(guion) {
  const scenes = guion.escenas.map((e) => ({
    id: createId(),
    type: TIPOS[e.tipo] ?? 'fact',
    onScreenText: e.texto_pantalla,
    narration: e.narracion,
    duration: e.duracion,
  }));
  const total = scenes.reduce((s, e) => s + (Number(e.duration) || 0), 0);
  return {
    topic: guion.titulo,
    factCount: guion.datos?.length ?? 4,
    targetDuration: total,
    title: guion.titulo,
    scenes,
  };
}

/** Texto plano del guion completo, para copiar. */
export function guionATexto(guion) {
  const lineas = [guion.titulo, ''];
  guion.escenas.forEach((e) => {
    const nombre = e.tipo === 'gancho' ? 'GANCHO' : e.tipo === 'cierre' ? 'CIERRE' : `DATO ${e.numero}`;
    lineas.push(`${nombre} (${e.duracion} s) — ${e.texto_pantalla}`);
    lineas.push(`Narración: ${e.narracion}`);
    lineas.push(`Visual: ${e.prompt_visual}`);
    if (e.como_verificar) lineas.push(`Verificar en: ${e.como_verificar}`);
    lineas.push('');
  });
  lineas.push(guion.descripcion_tiktok ?? '', (guion.hashtags ?? []).join(' '));
  return lineas.join('\n').trim();
}

/** Solo los prompts visuales, uno por escena. */
export function promptsATexto(guion) {
  return guion.escenas.map((e, i) => `${i + 1}. ${e.prompt_visual}`).join('\n\n');
}

/** Duración total estimada del guion en segundos. */
export function duracionTotal(guion) {
  return (guion.escenas ?? []).reduce((s, e) => s + (e.duracion ?? 0), 0);
}
