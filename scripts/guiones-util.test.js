import { describe, expect, it } from 'vitest';
import { duracionEscena, validarGuion } from './guiones-util.mjs';

const escena = (t = 'Texto') => ({ texto_pantalla: t, narracion: 'Una frase corta de prueba.', prompt_visual: 'vertical 9:16 photo' });
const guion = () => ({ titulo: 'Prueba', gancho: escena(), datos: [escena(), escena(), escena(), escena()], cierre: escena() });

describe('guiones', () => {
  it('acepta un guion completo', () => {
    expect(validarGuion(guion())).toEqual([]);
  });

  it('exige exactamente 4 datos y campos llenos', () => {
    const g = guion();
    g.datos.pop();
    g.cierre.prompt_visual = '';
    const errores = validarGuion(g);
    expect(errores).toContain('debe tener 4 datos (tiene 3)');
    expect(errores.some((e) => e.includes('sin prompt visual'))).toBe(true);
  });

  it('estima la duración', () => {
    expect(duracionEscena('')).toBe(3);
    expect(duracionEscena('uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece')).toBe(6);
  });
});
