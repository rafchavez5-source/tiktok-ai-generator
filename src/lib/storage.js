// Guarda el proyecto en el navegador (localStorage) para no perder el trabajo al recargar.
const KEY = 'tiktok-ai-generator:proyecto';

export function loadProject() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && Array.isArray(data.scenes) ? data : null;
  } catch {
    return null;
  }
}

export function saveProject(project) {
  try {
    if (project) localStorage.setItem(KEY, JSON.stringify(project));
    else localStorage.removeItem(KEY);
  } catch {
    // Si el navegador bloquea el almacenamiento, la app sigue funcionando sin guardar.
  }
}
