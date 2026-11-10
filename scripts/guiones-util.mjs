// Utilidades para los guiones generados con IA (sin llamadas a la API, se pueden probar).

const palabras = (t) => String(t ?? '').trim().split(/\s+/).filter(Boolean).length;

/** Segundos estimados de una escena según su narración (unas 2,6 palabras por segundo, más margen). */
export function duracionEscena(narracion) {
  return Math.max(3, Math.ceil(palabras(narracion) / 2.6) + 1);
}

/** Revisa que un guion tenga la forma esperada. Devuelve la lista de problemas (vacía si está bien). */
export function validarGuion(g) {
  const errores = [];
  if (!g?.titulo?.trim()) errores.push('falta el título');
  if (!Array.isArray(g?.datos) || g.datos.length !== 4) errores.push(`debe tener 4 datos (tiene ${g?.datos?.length ?? 0})`);
  const escenas = [g?.gancho, ...(g?.datos ?? []), g?.cierre];
  escenas.forEach((e, i) => {
    if (!e?.narracion?.trim()) errores.push(`escena ${i + 1} sin narración`);
    else if (palabras(e.narracion) > 45) errores.push(`escena ${i + 1} con narración demasiado larga`);
    if (!e?.prompt_visual?.trim()) errores.push(`escena ${i + 1} sin prompt visual`);
    if (!e?.texto_pantalla?.trim()) errores.push(`escena ${i + 1} sin texto en pantalla`);
  });
  return errores;
}

