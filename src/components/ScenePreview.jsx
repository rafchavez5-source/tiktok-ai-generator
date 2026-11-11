import { SCENE_TYPES } from '../lib/script.js';

export default function ScenePreview({ scene, index, total }) {
  if (!scene) return null;
  return (
    <aside className="preview" aria-label="Vista previa de la escena">
      <div className={`phone type-${scene.type}`}>
        <span className="phone-tag">
          {index + 1}/{total} · {SCENE_TYPES[scene.type]}
        </span>
        <p className="phone-text">{scene.onScreenText || 'Sin texto en pantalla'}</p>
        <span className="phone-time">{scene.duration || 0} s</span>
      </div>
      <p className="hint preview-note">
        Boceto del texto en pantalla. El video se crea en el paso 4.
      </p>
    </aside>
  );
}
