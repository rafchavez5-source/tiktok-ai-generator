import { useState } from 'react';
import { SCENE_TYPES, createEmptyScene, moveItem, totalDuration } from '../lib/script.js';
import ScenePreview from './ScenePreview.jsx';

export default function SceneBoard({ project, onScenesChange }) {
  const { scenes, targetDuration } = project;
  const [selectedId, setSelectedId] = useState(scenes[0]?.id ?? null);

  const selected = scenes.find((s) => s.id === selectedId) ?? scenes[0];
  const selectedIndex = scenes.indexOf(selected);
  const total = totalDuration(scenes);
  const diff = total - targetDuration;

  function update(id, changes) {
    onScenesChange((list) => list.map((s) => (s.id === id ? { ...s, ...changes } : s)));
  }

  function move(index, direction) {
    onScenesChange((list) => moveItem(list, index, index + direction));
  }

  function remove(id) {
    if (scenes.length <= 1) return;
    onScenesChange((list) => list.filter((s) => s.id !== id));
    if (id === selectedId) setSelectedId(null);
  }

  function add() {
    const scene = createEmptyScene();
    onScenesChange((list) => [...list, scene]);
    setSelectedId(scene.id);
  }

  return (
    <section className="card" aria-labelledby="scenes-title">
      <div className="card-head">
        <span className="step">3</span>
        <h2 id="scenes-title">Escenas</h2>
      </div>

      <div className="duration-summary">
        <div className="duration-numbers">
          <strong>{total} s</strong> de {targetDuration} s
          <span className={`pill ${diff === 0 ? 'pill-ok' : 'pill-warn'}`}>
            {diff === 0 ? 'Duración exacta' : diff > 0 ? `Sobran ${diff} s` : `Faltan ${-diff} s`}
          </span>
        </div>
        <div className="timeline" aria-hidden="true">
          {scenes.map((scene) => (
            <button
              type="button"
              tabIndex={-1}
              key={scene.id}
              className={`timeline-seg type-${scene.type} ${scene.id === selected?.id ? 'is-selected' : ''}`}
              style={{ flexGrow: Math.max(Number(scene.duration) || 0, 0.5) }}
              onClick={() => setSelectedId(scene.id)}
            />
          ))}
        </div>
      </div>

      <div className="scenes-layout">
        <ol className="scene-list">
          {scenes.map((scene, i) => (
            <li
              key={scene.id}
              className={`scene-card type-${scene.type} ${scene.id === selected?.id ? 'is-selected' : ''}`}
            >
              <div className="scene-card-head">
                <button
                  type="button"
                  className="scene-select"
                  onClick={() => setSelectedId(scene.id)}
                  aria-pressed={scene.id === selected?.id}
                >
                  <span className="scene-num">{i + 1}</span>
                  Ver escena
                </button>
                <div className="icon-group">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label={`Subir escena ${i + 1}`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => move(i, 1)}
                    disabled={i === scenes.length - 1}
                    aria-label={`Bajar escena ${i + 1}`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-danger"
                    onClick={() => remove(scene.id)}
                    disabled={scenes.length <= 1}
                    aria-label={`Eliminar escena ${i + 1}`}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="scene-fields">
                <label className="mini-field">
                  <span>Tipo</span>
                  <select
                    value={scene.type}
                    onChange={(e) => update(scene.id, { type: e.target.value })}
                  >
                    {Object.entries(SCENE_TYPES).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mini-field mini-duration">
                  <span>Segundos</span>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    inputMode="numeric"
                    value={scene.duration}
                    onChange={(e) =>
                      update(scene.id, {
                        duration: e.target.value === '' ? '' : Math.max(1, Math.min(90, Number(e.target.value))),
                      })
                    }
                    onBlur={() => {
                      if (scene.duration === '') update(scene.id, { duration: 1 });
                    }}
                  />
                </label>
                <label className="mini-field mini-wide">
                  <span>Texto en pantalla</span>
                  <input
                    type="text"
                    maxLength={90}
                    value={scene.onScreenText}
                    onChange={(e) => update(scene.id, { onScreenText: e.target.value })}
                    onFocus={() => setSelectedId(scene.id)}
                  />
                </label>
              </div>
            </li>
          ))}
        </ol>

        <ScenePreview scene={selected} index={selectedIndex} total={scenes.length} />
      </div>

      <button type="button" className="btn btn-secondary btn-block" onClick={add}>
        + Añadir escena
      </button>
    </section>
  );
}
