import { describe, expect, it } from 'vitest';
import { duracionTotal, guionAProyecto, guionATexto, promptsATexto } from './guiones.js';

const guion = {
  titulo: 'Datos del océano',
  datos: [{}, {}, {}, {}],
  hashtags: ['#oceano', '#datos'],
  descripcion_tiktok: 'Descubre el océano.',
  escenas: [
    { tipo: 'gancho', texto_pantalla: '¿Sabías esto?', narracion: 'Hola', prompt_visual: 'ocean', duracion: 3 },
    { tipo: 'dato', numero: 1, texto_pantalla: 'Dato 1', narracion: 'Uno', prompt_visual: 'whale', duracion: 5, como_verificar: 'NOAA' },
    { tipo: 'cierre', texto_pantalla: 'Sígueme', narracion: 'Adiós', prompt_visual: 'waves', duracion: 4 },
  ],
};

describe('guiones de IA', () => {
  it('se convierten al formato del editor', () => {
    const p = guionAProyecto(guion);
    expect(p.title).toBe('Datos del océano');
    expect(p.targetDuration).toBe(12);
    expect(duracionTotal(guion)).toBe(12);
    expect(p.scenes.map((s) => s.type)).toEqual(['hook', 'fact', 'outro']);
    expect(p.scenes[1]).toMatchObject({ onScreenText: 'Dato 1', narration: 'Uno', duration: 5 });
  });

  it('se copian como texto', () => {
    const t = guionATexto(guion);
    expect(t).toContain('DATO 1 (5 s) — Dato 1');
    expect(t).toContain('Verificar en: NOAA');
    expect(t).toContain('#oceano #datos');
    expect(promptsATexto(guion)).toBe('1. ocean\n\n2. whale\n\n3. waves');
  });
});
