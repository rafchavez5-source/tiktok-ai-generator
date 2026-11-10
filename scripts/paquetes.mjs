// Paquetes de datos: cada uno se convierte en un video.
// Los temas y los elementos los elegimos nosotros; las cifras y las imágenes
// se descargan de Wikidata y Wikimedia Commons (scripts/descargar-datos.mjs).

const num = (n, decimals = 0) =>
  Number(n).toLocaleString('es-ES', { maximumFractionDigits: decimals, minimumFractionDigits: 0 });

const lista = (arr) =>
  arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} y ${arr.at(-1)}`;

function duracionAnio(dias) {
  if (dias < 730) return `${num(dias)} días terrestres`;
  const anios = dias / 365.25;
  return `${num(anios, anios < 100 ? 1 : 0)} años terrestres`;
}

export const PAQUETES = [
  {
    id: 'montanas-mas-altas',
    titulo: 'Las 5 montañas más altas del mundo',
    gancho: '¿Sabes cuál es la más alta del planeta?',
    hashtags: '#montañas #everest #datoscuriosos #geografia',
    elementos: ['Q513', 'Q43512', 'Q82019', 'Q168702', 'Q169986'],
    // Altura en metros (valor normalizado) y países.
    consulta: (values) => `
      SELECT ?item ?itemLabel ?valor (GROUP_CONCAT(DISTINCT ?paisLabel; separator="|") AS ?paises) (SAMPLE(?img) AS ?imagen) WHERE {
        VALUES ?item { ${values} }
        ?item p:P2044 ?st . ?st a wikibase:BestRank; psn:P2044/wikibase:quantityAmount ?valor .
        OPTIONAL { ?item wdt:P17 ?pais . ?pais rdfs:label ?paisLabel . FILTER(LANG(?paisLabel) = "es") }
        OPTIONAL { ?item wdt:P18 ?img }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "es". }
      } GROUP BY ?item ?itemLabel ?valor`,
    ordenar: (a, b) => b.valor - a.valor,
    validar: (e) => e.valor > 8000 && e.valor < 9000,
    dato: (e, i) => ({
      onScreenText: `#${i + 1} ${e.nombre}`,
      narration: `Mide ${num(e.valor, 2)} metros sobre el nivel del mar. Está en ${lista(e.paises)}.`,
      cifra: { valor: e.valor, decimales: 2, unidad: 'm', etiqueta: 'de altura' },
    }),
  },
  {
    id: 'paises-mas-pequenos',
    titulo: 'Los 5 países más pequeños del mundo',
    gancho: 'Algunos caben dentro de una ciudad.',
    hashtags: '#paises #vaticano #datoscuriosos #geografia',
    elementos: ['Q237', 'Q235', 'Q697', 'Q672', 'Q238'],
    // Superficie en m² (normalizada) y población.
    consulta: (values) => `
      SELECT ?item ?itemLabel ?valor ?poblacion (SAMPLE(?img) AS ?imagen) WHERE {
        VALUES ?item { ${values} }
        ?item p:P2046 ?st . ?st a wikibase:BestRank; psn:P2046/wikibase:quantityAmount ?valor .
        OPTIONAL { ?item wdt:P1082 ?poblacion }
        OPTIONAL { ?item wdt:P18 ?img }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "es". }
      } GROUP BY ?item ?itemLabel ?valor ?poblacion`,
    ordenar: (a, b) => a.valor - b.valor,
    validar: (e) => e.valor > 0 && e.valor < 100e6 && e.poblacion > 0,
    dato: (e, i) => {
      const km2 = e.valor / 1e6;
      return {
        onScreenText: `#${i + 1} ${e.nombre}`,
        narration: `Mide solo ${num(km2, km2 < 10 ? 2 : 0)} km² y viven unas ${num(e.poblacion)} personas.`,
        cifra: { valor: km2, decimales: km2 < 10 ? 2 : 0, unidad: 'km²', etiqueta: 'de superficie' },
      };
    },
  },
  {
    id: 'sistema-solar',
    titulo: '5 datos curiosos del sistema solar',
    gancho: 'La Tierra es más pequeña de lo que crees.',
    hashtags: '#espacio #planetas #sistemasolar #datoscuriosos',
    elementos: ['Q308', 'Q313', 'Q319', 'Q193', 'Q332'],
    referencia: 'Q2', // la Tierra, para comparar
    // Radio en metros y periodo orbital en segundos (normalizados).
    consulta: (values) => `
      SELECT ?item ?itemLabel ?valor ?periodo (SAMPLE(?img) AS ?imagen) WHERE {
        VALUES ?item { ${values} }
        ?item p:P2120 ?st . ?st a wikibase:BestRank; psn:P2120/wikibase:quantityAmount ?valor .
        ?item p:P2146 ?sp . ?sp a wikibase:BestRank; psn:P2146/wikibase:quantityAmount ?periodo .
        OPTIONAL { ?item wdt:P18 ?img }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "es". }
      } GROUP BY ?item ?itemLabel ?valor ?periodo`,
    validar: (e) => e.valor > 1e6 && e.periodo > 1e6,
    dato: (e, i, ref) => {
      const dias = e.periodo / 86400;
      const veces = e.valor / ref.valor;
      const tamano =
        veces >= 1.5
          ? `Es ${num(veces, 1)} veces más ancho que la Tierra.`
          : veces <= 0.67
            ? `Su tamaño es ${num(veces * 100)} % del de la Tierra.`
            : 'Tiene casi el mismo tamaño que la Tierra.';
      const anios = dias / 365.25;
      return {
        onScreenText: e.nombre,
        narration: `Un año allí dura ${duracionAnio(dias)}. ${tamano}`,
        cifra:
          dias < 730
            ? { valor: dias, decimales: 0, unidad: 'días', etiqueta: 'dura un año allí' }
            : { valor: anios, decimales: anios < 100 ? 1 : 0, unidad: 'años', etiqueta: 'dura un año allí' },
      };
    },
  },
  {
    id: 'rascacielos-mas-altos',
    titulo: 'Los 5 rascacielos más altos del mundo',
    gancho: 'El primero supera los 800 metros.',
    hashtags: '#rascacielos #burjkhalifa #arquitectura #datoscuriosos',
    elementos: ['Q12495', 'Q7969454', 'Q18547', 'Q189476', 'Q1077308'],
    // Altura en metros, ciudad, país y año de inauguración.
    consulta: (values) => `
      SELECT ?item ?itemLabel ?valor ?ciudadLabel ?paisLabel (MIN(YEAR(?apertura)) AS ?anio) (SAMPLE(?img) AS ?imagen) WHERE {
        VALUES ?item { ${values} }
        ?item p:P2048 ?st . ?st a wikibase:BestRank; psn:P2048/wikibase:quantityAmount ?valor .
        OPTIONAL { ?item wdt:P131 ?ciudad }
        OPTIONAL { ?item wdt:P17 ?pais }
        OPTIONAL { ?item wdt:P1619 ?apertura }
        OPTIONAL { ?item wdt:P18 ?img }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "es". }
      } GROUP BY ?item ?itemLabel ?valor ?ciudadLabel ?paisLabel`,
    ordenar: (a, b) => b.valor - a.valor,
    validar: (e) => e.valor > 500 && e.valor < 1000,
    dato: (e, i) => ({
      onScreenText: `#${i + 1} ${e.nombre}`,
      narration:
        `Mide ${num(e.valor)} metros. Está en ${[e.ciudad, e.pais].filter(Boolean).join(', ')}.` +
        (e.anio ? ` Se inauguró en ${e.anio}.` : ''),
      cifra: { valor: e.valor, decimales: Number.isInteger(e.valor) ? 0 : 1, unidad: 'm', etiqueta: 'de altura' },
    }),
  },
];
