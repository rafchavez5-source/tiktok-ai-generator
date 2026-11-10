import { useEffect, useState } from 'react';
import GeneratorForm from './components/GeneratorForm.jsx';
import ScriptEditor from './components/ScriptEditor.jsx';
import SceneBoard from './components/SceneBoard.jsx';
import { generateScript } from './lib/script.js';
import { loadProject, saveProject } from './lib/storage.js';

export default function App() {
  const [project, setProject] = useState(() => loadProject());

  useEffect(() => {
    saveProject(project);
  }, [project]);

  function handleGenerate(settings) {
    if (project && !window.confirm('Ya tienes un guion. ¿Quieres reemplazarlo por uno nuevo?')) {
      return;
    }
    setProject(generateScript(settings));
    requestAnimationFrame(() => {
      document.getElementById('guion')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function handleReset() {
    if (window.confirm('¿Borrar el proyecto actual y empezar de cero?')) {
      setProject(null);
    }
  }

  function updateScenes(updater) {
    setProject((prev) => ({ ...prev, scenes: updater(prev.scenes) }));
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-logo" aria-hidden="true">▶</span>
          <div>
            <h1>TikTok AI Generator</h1>
            <p>Guiones de datos curiosos para videos verticales</p>
          </div>
        </div>
        {project && (
          <button type="button" className="btn btn-ghost" onClick={handleReset}>
            Nuevo proyecto
          </button>
        )}
      </header>

      <main className="content">
        <GeneratorForm initial={project} onGenerate={handleGenerate} />

        {project ? (
          <>
            <ScriptEditor
              project={project}
              onTitleChange={(title) => setProject((prev) => ({ ...prev, title }))}
              onScenesChange={updateScenes}
            />
            <SceneBoard project={project} onScenesChange={updateScenes} />
          </>
        ) : (
          <section className="card empty-state">
            <h2>Aún no hay guion</h2>
            <p>
              Escribe un tema, elige cuántos datos quieres y la duración del video. Después pulsa
              <strong> Generar guion</strong> para crear la estructura con sus escenas.
            </p>
          </section>
        )}
      </main>

      <footer className="footer">
        Tu proyecto se guarda automáticamente en este navegador.
      </footer>
    </div>
  );
}
