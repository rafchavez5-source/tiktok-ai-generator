import { useEffect, useMemo, useState } from 'react';
import { duracionTotal, guionAProyecto, guionATexto, promptsATexto } from '../lib/guiones.js';

const NOMBRE_ESCENA = { gancho: 'Gancho', dato: 'Dato', cierre: 'Cierre' };

async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

export default function GuionesView({ onUsar }) {
  const [estado, setEstado] = useState('cargando'); // cargando | vacio | error | listo
  const [datos, setDatos] = useState(null);
  const [categoria, setCategoria] = useState('Todas');
  const [abierto, setAbierto] = useState(null);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}guiones.json`, { cache: 'no-store' })
      .then(async (r) => {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error(String(r.status));
        // Algunos servidores devuelven la página principal si el archivo no existe.
        try {
          return JSON.parse(await r.text());
        } catch {
          return null;
        }
      })
      .then((json) => {
        if (!json?.guiones?.length) {
          setEstado('vacio');
          return;
        }
        setDatos(json);
        setEstado('listo');
      })
      .catch(() => setEstado('error'));
  }, []);

  const categorias = useMemo(
    () => ['Todas', ...new Set((datos?.guiones ?? []).map((g) => g.categoria))],
    [datos],
  );
  const lista = (datos?.guiones ?? []).filter((g) => categoria === 'Todas' || g.categoria === categoria);

  async function copiarCon(texto, mensaje) {
    const ok = await copiar(texto);
    setAviso(ok ? mensaje : 'No se pudo copiar en este navegador.');
    setTimeout(() => setAviso(''), 2500);
  }

  if (estado === 'cargando') {
    return <section className="card empty-state"><p>Cargando guiones…</p></section>;
  }

  if (estado === 'vacio' || estado === 'error') {
    return (
      <section className="card empty-state">
        <h2>{estado === 'vacio' ? 'Aún no hay guiones generados' : 'No se pudieron cargar los guiones'}</h2>
        <p>
          Los guiones se crean con la IA de Claude desde GitHub: en tu repositorio abre
          <strong> Actions → «Generar guiones» → Run workflow</strong>. Cuando termine, esta pantalla
          mostrará los 20 guiones.
        </p>
      </section>
    );
  }

  return (
    <section className="card" aria-labelledby="guiones-title">
      <div className="card-head">
        <span className="step">★</span>
        <h2 id="guiones-title">{datos.guiones.length} guiones de datos curiosos</h2>
      </div>
      <p className="hint hint-warn guiones-aviso">
        Generados con IA el {new Date(datos.generado).toLocaleDateString('es')}. Verifica cada dato antes de publicar.
      </p>

      <div className="chips guiones-filtros" role="group" aria-label="Filtrar por categoría">
        {categorias.map((c) => (
          <button
            key={c}
            type="button"
            className={`chip ${categoria === c ? 'is-active' : ''}`}
            onClick={() => setCategoria(c)}
            aria-pressed={categoria === c}
          >
            {c}
          </button>
        ))}
      </div>

      <ol className="guiones-lista">
        {lista.map((g) => {
          const expandido = abierto === g.id;
          return (
            <li key={g.id} className={`guion ${expandido ? 'is-open' : ''}`}>
              <button
                type="button"
                className="guion-cabecera"
                onClick={() => setAbierto(expandido ? null : g.id)}
                aria-expanded={expandido}
              >
                <span className="guion-num">{g.id}</span>
                <span className="guion-titulo">
                  <strong>{g.titulo}</strong>
                  <span className="guion-meta">
                    {g.categoria} · {g.datos.length} datos · ~{duracionTotal(g)} s
                  </span>
                </span>
                <span className="guion-flecha" aria-hidden="true">{expandido ? '−' : '+'}</span>
              </button>

              {expandido && (
                <div className="guion-cuerpo">
                  <ol className="guion-escenas">
                    {g.escenas.map((e, i) => (
                      <li key={i} className={`guion-escena tipo-${e.tipo}`}>
                        <div className="guion-escena-head">
                          <span className="badge">
                            {NOMBRE_ESCENA[e.tipo]}
                            {e.numero ? ` ${e.numero}` : ''}
                          </span>
                          <span className="timing">{e.duracion} s</span>
                        </div>
                        <p className="guion-pantalla">{e.texto_pantalla}</p>
                        <p className="guion-narracion">{e.narracion}</p>
                        <div className="guion-prompt">
                          <p>
                            <span className="guion-etiqueta">Prompt visual</span>
                            {e.prompt_visual}
                          </p>
                          <p className="hint">{e.descripcion_visual}</p>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => copiarCon(e.prompt_visual, 'Prompt copiado.')}
                          >
                            Copiar prompt
                          </button>
                        </div>
                        {e.como_verificar && <p className="hint">Verificar en: {e.como_verificar}</p>}
                      </li>
                    ))}
                  </ol>
                  <p className="guion-hashtags">
                    {g.descripcion_tiktok} {(g.hashtags ?? []).join(' ')}
                  </p>
                  <div className="actions">
                    <button type="button" className="btn btn-primary" onClick={() => onUsar(guionAProyecto(g))}>
                      Abrir en el editor
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => copiarCon(guionATexto(g), 'Guion copiado.')}>
                      Copiar guion
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => copiarCon(promptsATexto(g), 'Prompts copiados.')}>
                      Copiar prompts
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <p className="status" role="status" aria-live="polite">{aviso}</p>
    </section>
  );
}
