import { describe, expect, it } from 'vitest';
import { PAQUETES } from './paquetes.mjs';

const paquete = (id) => PAQUETES.find((p) => p.id === id);

describe('paquetes de datos', () => {
  it('tienen 5 elementos y campos obligatorios', () => {
    for (const p of PAQUETES) {
      expect(p.elementos).toHaveLength(5);
      expect(p.titulo && p.gancho && p.hashtags).toBeTruthy();
      expect(p.consulta('wd:Q1')).toContain('wd:Q1');
    }
  });

  it('redacta los datos con formato español', () => {
    const m = paquete('montanas-mas-altas').dato({ nombre: 'Everest', valor: 8848.86, paises: ['China', 'Nepal'] }, 0);
    expect(m).toMatchObject({ onScreenText: '#1 Everest', narration: 'Mide 8848,86 metros sobre el nivel del mar. Está en China y Nepal.' });

    const v = paquete('paises-mas-pequenos').dato({ nombre: 'Vaticano', valor: 440000, poblacion: 466 }, 0);
    expect(v.narration).toBe('Mide solo 0,44 km² y viven unas 466 personas.');

    const tierra = { valor: 6371000 };
    const j = paquete('sistema-solar').dato({ nombre: 'Júpiter', valor: 69911000, periodo: 374335776 }, 0, tierra);
    expect(j.narration).toBe('Un año allí dura 11,9 años terrestres. Es 11 veces más ancho que la Tierra.');
  });

  it('descarta valores imposibles', () => {
    expect(paquete('paises-mas-pequenos').validar({ valor: 10e9, poblacion: 1 })).toBe(false);
    expect(paquete('montanas-mas-altas').validar({ valor: 14203 })).toBe(false);
  });
});
