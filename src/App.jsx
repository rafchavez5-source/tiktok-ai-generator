import { useEffect, useState } from 'react';
import GeneratorForm from './components/GeneratorForm.jsx';
import ScriptEditor from './components/ScriptEditor.jsx';
import SceneBoard from './components/SceneBoard.jsx';
import VideoMaker from './components/VideoMaker.jsx';
import GuionesView from './components/GuionesView.jsx';
import { generateScript } from './lib/script.js';
import { loadProject, saveProject } from './lib/storage.js';

export default function App() {
  const [project, setProject] = useState(() => loadProject());
  const [vista, setVista] = useState('editor'); // editor | guiones

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

  function handleUsarGuion(nuevo) {
    if (project && !window.confirm('Esto reemplaza el proyecto que tienes en el editor. ¿Continuar?')) return;
    setProject(nuevo);
    setVista('editor');
    window.scrollTo({ top: 0 });
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
        {project && vista === 'editor' && (
          <button type="button" className="btn btn-ghost" onClick={handleReset}>
            Nuevo proyecto
          </button>
        )}
      </header>

      <nav className="tabs" aria-label="Secciones">
        <button type="button" className={`tab ${vista === 'editor' ? 'is-active' : ''}`} aria-pressed={vista === 'editor'} onClick={() => setVista('editor')}>
          Editor
        </button>
        <button type="button" className={`tab ${vista === 'guiones' ? 'is-active' : ''}`} aria-pressed={vista === 'guiones'} onClick={() => setVista('guiones')}>
          Guiones con IA
        </button>
      </nav>

      <main className="content">
        {vista === 'guiones' ? (
          <GuionesView onUsar={handleUsarGuion} />
        ) : (
        <>
        <GeneratorForm key={project?.title ?? 'nuevo'} initial={project} onGenerate={handleGenerate} />

        {project ? (
          <>
            <ScriptEditor
              project={project}
              onTitleChange={(title) => setProject((prev) => ({ ...prev, title }))}
              onScenesChange={updateScenes}
            />
            <SceneBoard project={project} onScenesChange={updateScenes} />
            <VideoMaker project={project} />
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
        </>
        )}
      </main>

      <footer className="footer">
        Tu proyecto se guarda automáticamente en este navegador.
      </footer>
    </div>
  );
}
