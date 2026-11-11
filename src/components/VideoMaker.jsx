import { useEffect, useRef, useState } from 'react';
import {
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
  canRecord,
  drawFrame,
  recordVideo,
  videoLength,
} from '../lib/video.js';
import { fileSafeName } from '../lib/script.js';

export default function VideoMaker({ project }) {
  const canvasRef = useRef(null);
  const abortRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | recording | done | error
  const [progress, setProgress] = useState(0);
  const [previewTime, setPreviewTime] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [supported, setSupported] = useState(true);

  const length = videoLength(project.scenes);
  const emptyFacts = project.scenes.filter((s) => s.type === 'fact' && !s.narration.trim()).length;
  const time = Math.min(previewTime, Math.max(length - 0.01, 0));

  useEffect(() => {
    setSupported(canRecord(canvasRef.current));
  }, []);

  // Vista previa del fotograma elegido (cuando no se está grabando).
  useEffect(() => {
    if (status === 'recording' || !canvasRef.current) return;
    drawFrame(canvasRef.current.getContext('2d'), project, time);
  }, [project, time, status]);

  // Libera el video anterior de la memoria.
  useEffect(() => () => result && URL.revokeObjectURL(result.url), [result]);

  // Si el proyecto cambia, el video creado deja de estar al día.
  useEffect(() => {
    setResult(null);
    if (status === 'done') setStatus('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function handleCreate() {
    setError('');
    setResult(null);
    setProgress(0);
    setStatus('recording');
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const { blob, mimeType } = await recordVideo({
        canvas: canvasRef.current,
        project,
        onProgress: setProgress,
        signal: controller.signal,
      });
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const safeName = fileSafeName(project.topic, 'tema');
      setResult({ url: URL.createObjectURL(blob), name: `video-${safeName}.${ext}`, ext });
      setStatus('done');
    } catch (err) {
      if (err.name === 'AbortError') {
        setStatus('idle');
      } else {
        setError(err.message);
        setStatus('error');
      }
    }
  }

  const recording = status === 'recording';

  return (
    <section className="card" id="video" aria-labelledby="video-title">
      <div className="card-head">
        <span className="step">4</span>
        <h2 id="video-title">Video</h2>
      </div>

      <div className="video-layout">
        <div className="video-stage">
          {result ? (
            <video className="video-frame" src={result.url} controls playsInline />
          ) : (
            <canvas
              ref={canvasRef}
              className="video-frame"
              width={VIDEO_WIDTH}
              height={VIDEO_HEIGHT}
              aria-label="Vista previa del video"
            />
          )}
          {/* El canvas debe seguir existiendo para volver a grabar. */}
          {result && (
            <canvas ref={canvasRef} width={VIDEO_WIDTH} height={VIDEO_HEIGHT} hidden />
          )}
        </div>

        <div className="video-panel">
          <p className="video-meta">
            <strong>{length} s</strong> · 1080 × 1920 · vertical 9:16
          </p>

          {!result && !recording && length > 0 && (
            <div className="field">
              <label htmlFor="scrub">Vista previa: segundo {Math.floor(time)}</label>
              <input
                id="scrub"
                type="range"
                min={0}
                max={Math.max(length - 0.01, 0)}
                step={0.1}
                value={time}
                onChange={(e) => setPreviewTime(Number(e.target.value))}
              />
            </div>
          )}

          {emptyFacts > 0 && (
            <p className="hint hint-warn">
              {emptyFacts === 1
                ? 'Hay 1 dato sin texto en el guion.'
                : `Hay ${emptyFacts} datos sin texto en el guion.`}{' '}
              Escríbelos antes de crear el video.
            </p>
          )}

          {!supported && (
            <p className="hint hint-warn">
              Este navegador no puede crear videos. Usa Chrome, Edge o Safari actualizados.
            </p>
          )}

          {recording ? (
            <>
              <div className="progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso del video">
                <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
              </div>
              <p className="hint">
                Creando video… {Math.round(progress * 100)} %. Tarda lo mismo que dura el video.
                Mantén esta pestaña abierta y visible.
              </p>
              <button type="button" className="btn btn-ghost btn-block" onClick={() => abortRef.current?.abort()}>
                Cancelar
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={handleCreate}
              disabled={!supported || length === 0}
            >
              {result ? 'Volver a crear video' : 'Crear video'}
            </button>
          )}

          {result && (
            <>
              <a className="btn btn-secondary btn-block" href={result.url} download={result.name}>
                Descargar video (.{result.ext})
              </a>
              <button type="button" className="btn btn-ghost btn-block" onClick={() => setResult(null)}>
                Volver a la vista previa
              </button>
            </>
          )}

          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}

          <p className="hint">
            El video muestra el texto de cada escena animado, sin voz ni música. Puedes añadir
            música o tu voz desde TikTok al publicarlo.
          </p>
        </div>
      </div>
    </section>
  );
}
