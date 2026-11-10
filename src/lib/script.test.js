import { describe, expect, it } from 'vitest';
import {
  DURATION_OPTIONS,
  FACT_COUNT_OPTIONS,
  distributeDurations,
  estimateReadingSeconds,
  fileSafeName,
  generateScript,
  moveItem,
  scriptToText,
  totalDuration,
} from './script.js';

describe('distributeDurations', () => {
  it('suma exactamente la duración elegida en todas las combinaciones', () => {
    for (const total of DURATION_OPTIONS) {
      for (const count of FACT_COUNT_OPTIONS) {
        const { hook, facts, outro } = distributeDurations(total, count);
        expect(facts).toHaveLength(count);
        expect(hook + outro + facts.reduce((a, b) => a + b, 0)).toBe(total);
        facts.forEach((s) => expect(s).toBeGreaterThanOrEqual(1));
      }
    }
  });
});

describe('generateScript', () => {
  it('crea gancho, un bloque por dato y cierre', () => {
    const project = generateScript({ topic: '  el espacio ', factCount: 5, duration: 30 });
    expect(project.topic).toBe('el espacio');
    expect(project.scenes).toHaveLength(7);
    expect(project.scenes[0].type).toBe('hook');
    expect(project.scenes.at(-1).type).toBe('outro');
    expect(totalDuration(project.scenes)).toBe(30);
    expect(new Set(project.scenes.map((s) => s.id)).size).toBe(7);
  });

  it('el gancho y el cierre caben en su duración con un tema corto', () => {
    for (const duration of DURATION_OPTIONS) {
      for (const factCount of FACT_COUNT_OPTIONS) {
        const { scenes } = generateScript({ topic: 'el océano', factCount, duration });
        for (const scene of [scenes[0], scenes.at(-1)]) {
          expect(estimateReadingSeconds(scene.narration)).toBeLessThanOrEqual(scene.duration);
        }
      }
    }
  });
});

describe('utilidades', () => {
  it('estima el tiempo de lectura', () => {
    expect(estimateReadingSeconds('')).toBe(0);
    expect(estimateReadingSeconds('uno dos tres cuatro cinco')).toBe(2);
  });

  it('crea nombres de archivo sin tildes', () => {
    expect(fileSafeName('El Océano: ¡Niños!', 'x')).toBe('el-oceano-ninos');
    expect(fileSafeName('¿¿??', 'x')).toBe('x');
  });

  it('mueve elementos dentro de la lista', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
  });

  it('exporta el guion como texto con tiempos', () => {
    const text = scriptToText(generateScript({ topic: 'gatos', factCount: 3, duration: 15 }));
    expect(text).toContain('ESCENA 1 · Gancho · 0s');
    expect(text).toContain('Duración total de escenas: 15 s');
  });
});
