import { useState } from 'react';
import { DURATION_OPTIONS, FACT_COUNT_OPTIONS } from '../lib/script.js';

export default function GeneratorForm({ initial, onGenerate }) {
  const [topic, setTopic] = useState(initial?.topic ?? '');
  const [factCount, setFactCount] = useState(initial?.factCount ?? 5);
  const [duration, setDuration] = useState(initial?.targetDuration ?? 30);
  const [error, setError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    if (!topic.trim()) {
      setError('Escribe el tema del video para continuar.');
      return;
    }
    setError('');
    onGenerate({ topic, factCount, duration });
  }

  const secondsPerFact = Math.floor((duration * 0.8) / factCount);

  return (
    <section className="card" aria-labelledby="form-title">
      <div className="card-head">
        <span className="step">1</span>
        <h2 id="form-title">Configura tu video</h2>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="topic">Tema del video</label>
          <input
            id="topic"
            type="text"
            placeholder="Ej.: el océano, los gatos, el antiguo Egipto…"
            value={topic}
            maxLength={80}
            onChange={(e) => setTopic(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'topic-error' : undefined}
          />
          {error && (
            <p id="topic-error" className="field-error" role="alert">
              {error}
            </p>
          )}
        </div>

        <fieldset className="field">
          <legend>Cantidad de datos curiosos</legend>
          <div className="chips">
            {FACT_COUNT_OPTIONS.map((n) => (
              <label key={n} className={`chip ${factCount === n ? 'is-active' : ''}`}>
                <input
                  type="radio"
                  name="factCount"
                  value={n}
                  checked={factCount === n}
                  onChange={() => setFactCount(n)}
                />
                {n}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>Duración del video</legend>
          <div className="chips">
            {DURATION_OPTIONS.map((s) => (
              <label key={s} className={`chip ${duration === s ? 'is-active' : ''}`}>
                <input
                  type="radio"
                  name="duration"
                  value={s}
                  checked={duration === s}
                  onChange={() => setDuration(s)}
                />
                {s} s
              </label>
            ))}
          </div>
          <p className={`hint ${secondsPerFact < 3 ? 'hint-warn' : ''}`}>
            Unos {secondsPerFact} s por dato.
            {secondsPerFact < 3 && ' Es poco tiempo: considera menos datos o un video más largo.'}
          </p>
        </fieldset>

        <button type="submit" className="btn btn-primary btn-block">
          Generar guion
        </button>
        <p className="hint">
          Esta versión crea una plantilla de guion con los tiempos repartidos. Tú escribes cada
          dato curioso en el siguiente paso y luego creas el video.
        </p>
      </form>
    </section>
  );
}
