import { describe, expect, it } from 'vitest';
import { enteroEnPalabras, numeroEnPalabras, textoParaVoz } from './voz.mjs';

describe('números en palabras', () => {
  it('enteros', () => {
    expect(enteroEnPalabras(0)).toBe('cero');
    expect(enteroEnPalabras(21)).toBe('veintiuno');
    expect(enteroEnPalabras(100)).toBe('cien');
    expect(enteroEnPalabras(828)).toBe('ochocientos veintiocho');
    expect(enteroEnPalabras(8848)).toBe('ocho mil ochocientos cuarenta y ocho');
    expect(enteroEnPalabras(21000)).toBe('veintiún mil');
    expect(enteroEnPalabras(38857)).toBe('treinta y ocho mil ochocientos cincuenta y siete');
    expect(enteroEnPalabras(1000000)).toBe('un millón');
    expect(enteroEnPalabras(1326093247)).toBe(
      'mil trescientos veintiséis millones noventa y tres mil doscientos cuarenta y siete',
    );
  });

  it('formato español con decimales y miles', () => {
    expect(numeroEnPalabras('8848,86')).toBe('ocho mil ochocientos cuarenta y ocho coma ochenta y seis');
    expect(numeroEnPalabras('0,44')).toBe('cero coma cuarenta y cuatro');
    expect(numeroEnPalabras('0,05')).toBe('cero coma cero cinco');
    expect(numeroEnPalabras('13.650')).toBe('trece mil seiscientos cincuenta');
  });

  it('texto completo', () => {
    expect(textoParaVoz('Mide solo 0,44 km² y viven 466 personas.')).toBe(
      'Mide solo cero coma cuarenta y cuatro kilómetros cuadrados y viven cuatrocientos sesenta y seis personas.',
    );
    expect(textoParaVoz('Su tamaño es 38 % del de la Tierra.')).toBe(
      'Su tamaño es treinta y ocho por ciento del de la Tierra.',
    );
  });
});
