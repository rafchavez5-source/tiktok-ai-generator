import { useState } from 'react';
import { SCENE_TYPES, estimateReadingSeconds, fileSafeName, scriptToText } from '../lib/script.js';

export default function ScriptEditor({ project, onTitleChange, onScenesChange }) {
  const [message, setMessage] = useState('');

  function updateNarration(id, narration) {
    onScenesChange((scenes) => scenes.map((s) => (s.id === id ? { ...s, narration } : s)));
  }

  function flash(text) {
    setMessage(text);
    setTimeout(() => setMessage(''), 2500);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(scriptToText(project));
      flash('Guion copiado al portapapeles.');
    } catch {
      flash('No se pudo copiar. Usa la opción de descargar.');
    }
  }

  function handleDownload() {
    const blob = new Blob([scriptToText(project)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = fileSafeName(project.topic, 'guion');
    link.href = url;
    link.download = `guion-${safeName}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="card" id="guion" aria-labelledby="script-title">
      <div className="card-head">
        <span className="step">2</span>
        <h2 id="script-title">Guion</h2>
      </div>

      <div className="field">
        <label htmlFor="video-title">Título del video</label>
        <input
          id="video-title"
          type="text"
          value={project.title}
          onChange={(e) => onTitleChange(e.target.value)}
        />
      </div>

      <ol className="script-list">
        {project.scenes.map((scene, i) => {
          const reading = estimateReadingSeconds(scene.narration);
          const tooLong = reading > scene.duration;
          const fieldId = `narration-${scene.id}`;
          return (
            <li key={scene.id} className={`script-item type-${scene.type}`}>
              <div className="script-item-head">
                <label htmlFor={fieldId}>
                  <span className="badge">{SCENE_TYPES[scene.type]}</span> Escena {i + 1}
                </label>
                <span className={`timing ${tooLong ? 'timing-warn' : ''}`}>
                  Lectura ≈ {reading} s / {scene.duration} s
                </span>
              </div>
              <textarea
                id={fieldId}
                rows={3}
                value={scene.narration}
                placeholder={
                  scene.type === 'fact'
                    ? `Escribe aquí un dato curioso sobre ${project.topic}`
                    : 'Escribe aquí lo que se dirá en esta escena'
                }
                onChange={(e) => updateNarration(scene.id, e.target.value)}
              />
              {tooLong && (
                <p className="hint hint-warn">
                  El texto es más largo que la escena. Acórtalo o aumenta su duración.
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="actions">
        <button type="button" className="btn btn-secondary" onClick={handleCopy}>
          Copiar guion
        </button>
        <button type="button" className="btn btn-secondary" onClick={handleDownload}>
          Descargar .txt
        </button>
      </div>
      <p className="status" role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}
