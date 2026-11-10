// Lógica del guion y de las escenas. No usa servicios externos:
// genera una plantilla editable a partir del tema, la cantidad de datos y la duración.

export const DURATION_OPTIONS = [15, 30, 45, 60, 90];
export const FACT_COUNT_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10];

// Velocidad aproximada de narración en español (palabras por segundo).
export const WORDS_PER_SECOND = 2.5;

export const SCENE_TYPES = {
  hook: 'Gancho',
  fact: 'Dato curioso',
  outro: 'Cierre',
};

let idCounter = 0;
export function createId() {
  idCounter += 1;
  return `escena-${Date.now().toString(36)}-${idCounter}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Reparte la duración total (en segundos enteros) entre gancho, datos y cierre.
 * La suma siempre es igual a la duración total.
 */
export function distributeDurations(totalSeconds, factCount) {
  // Gancho y cierre: 3–5 s, o 2 s si no queda al menos 1 s para cada dato.
  let edge = clamp(Math.round(totalSeconds * 0.1), 3, 5);
  if (totalSeconds - 2 * edge < factCount) edge = 2;
  const hook = edge;
  const outro = edge;
  const remaining = totalSeconds - hook - outro;
  const base = Math.floor(remaining / factCount);
  const extra = remaining - base * factCount;
  const facts = Array.from({ length: factCount }, (_, i) => base + (i < extra ? 1 : 0));
  return { hook, facts, outro };
}

/**
 * Crea la plantilla del guion como una lista de escenas.
 * Los textos de los datos son marcadores para que el usuario los complete.
 */
export function generateScript({ topic, factCount, duration }) {
  const cleanTopic = topic.trim();
  const times = distributeDurations(duration, factCount);

  const scenes = [
    {
      id: createId(),
      type: 'hook',
      onScreenText: `${factCount} datos curiosos sobre ${cleanTopic}`,
      narration: `¿Sabías esto sobre ${cleanTopic}?`,
      duration: times.hook,
    },
    ...times.facts.map((seconds, i) => ({
      id: createId(),
      type: 'fact',
      onScreenText: `Dato ${i + 1}`,
      narration: '',
      duration: seconds,
    })),
    {
      id: createId(),
      type: 'outro',
      onScreenText: 'Sígueme para más datos curiosos',
      narration: 'Sígueme para más datos curiosos.',
      duration: times.outro,
    },
  ];

  return {
    topic: cleanTopic,
    factCount,
    targetDuration: duration,
    title: `${factCount} datos curiosos sobre ${cleanTopic}`,
    scenes,
  };
}

export function createEmptyScene() {
  return {
    id: createId(),
    type: 'fact',
    onScreenText: 'Nueva escena',
    narration: '',
    duration: 3,
  };
}

export function countWords(text) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Segundos estimados para leer el texto en voz alta. */
export function estimateReadingSeconds(text) {
  return Math.ceil(countWords(text) / WORDS_PER_SECOND);
}

export function totalDuration(scenes) {
  return scenes.reduce((sum, scene) => sum + (Number(scene.duration) || 0), 0);
}

/** Devuelve el guion como texto plano para copiar o descargar. */
export function scriptToText(project) {
  const lines = [project.title, `Duración objetivo: ${project.targetDuration} s`, ''];
  let start = 0;
  project.scenes.forEach((scene, i) => {
    const end = start + (Number(scene.duration) || 0);
    lines.push(`ESCENA ${i + 1} · ${SCENE_TYPES[scene.type] ?? 'Escena'} · ${start}s – ${end}s`);
    lines.push(`Texto en pantalla: ${scene.onScreenText}`);
    lines.push(`Narración: ${scene.narration}`);
    lines.push('');
    start = end;
  });
  lines.push(`Duración total de escenas: ${totalDuration(project.scenes)} s`);
  return lines.join('\n');
}

export function moveItem(list, fromIndex, toIndex) {
  if (toIndex < 0 || toIndex >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, item);
  return copy;
}
