# TikTok AI Generator

Herramientas para crear videos verticales (9:16) de datos curiosos para TikTok, en español.

El proyecto tiene tres partes:

1. **App web** (React + Vite): editor de guiones y escenas, y la pantalla **«Guiones con IA»**.
2. **Generador de guiones con IA** (`scripts/generar-guiones.mjs`): crea ideas y guiones completos con la API de Claude.
3. **Generador de videos** (`scripts/crear-videos.mjs`): datos reales de Wikidata, voz, música y animación con Remotion → MP4.

---

## Usarlo desde el iPhone (sin computadora)

### Una sola vez

1. **Publicar la app**: en GitHub abre el repositorio → **Settings → Pages** → en *Source* elige **GitHub Actions**.
2. **Guardar la clave de Claude**: **Settings → Secrets and variables → Actions → New repository secret**.
   - Nombre: `ANTHROPIC_API_KEY`
   - Valor: tu clave de [console.anthropic.com](https://console.anthropic.com) (sección *API Keys*).

### Cada vez que quieras guiones nuevos

1. En GitHub: **Actions → «Generar guiones» → Run workflow** (puedes cambiar la cantidad; por defecto 20).
2. Espera unos minutos a que termine (círculo verde). Los guiones se guardan en `public/guiones.json`
   y la app se vuelve a publicar sola.
3. Abre la app en `https://<tu-usuario>.github.io/tiktok-ai-generator/` → pestaña **Guiones con IA**.

Costo aproximado: unos centavos de dólar por guion (el flujo muestra el costo estimado al final).

---

## Qué hace la app

**Pestaña «Editor»**
- Tema, cantidad de datos (3–10) y duración (15–90 s) → plantilla de guion con los tiempos repartidos.
- Editar título, narración, texto en pantalla, orden y duración de cada escena.
- Copiar o descargar el guion en `.txt`.
- Crear un video simple en el navegador (texto animado, sin voz) y descargarlo.
- Se guarda solo en el navegador.

**Pestaña «Guiones con IA»**
- Lista de los guiones generados: gancho, 4 datos curiosos y cierre.
- Cada escena trae su **prompt visual** (en inglés, para generadores de imágenes o video) y su descripción en español.
- Filtrar por categoría, copiar el guion completo o solo los prompts, y **abrir el guion en el editor**.
- Aviso: los datos los escribe una IA; verifícalos antes de publicar.

---

## Generador de videos (se ejecuta en un servidor o computadora)

```bash
npm run datos            # descarga datos y fotos de Wikidata / Wikimedia Commons
npm run clips            # descarga clips de video libres (opcional)
npm run videos           # crea los MP4 en videos/ (voz, música, efectos, subtítulos)
npm run videos -- --animado sistema-solar   # versión totalmente animada
npm run biblioteca       # biblioteca de recursos libres (música, emojis animados, NASA, voces)
```

- Voz: voces gratuitas de Microsoft Edge (`VOZ_PROVEEDOR=edge`, por defecto `EDGE_VOZ=es-MX-DaliaNeural`),
  Piper sin conexión (`VOZ_PROVEEDOR=piper`) o ElevenLabs con clave (`VOZ_PROVEEDOR=elevenlabs`).
- Cada video genera un `.txt` con la descripción para TikTok y los créditos de fotos, clips y música.
- Requisitos: Node.js 22, Python 3 con `numpy`, `ffmpeg`, Chromium, y `pip install edge-tts piper-tts`.

---

## Desarrollo

```bash
npm install
npm run dev      # app en http://localhost:5173
npm test         # pruebas
npm run build    # versión de producción en dist/
npm run guiones  # genera guiones (necesita ANTHROPIC_API_KEY)
```

### Estructura

```
src/                      App web
  components/GuionesView.jsx   Pestaña «Guiones con IA»
  lib/guiones.js               Conversión de guiones de IA al editor
scripts/
  generar-guiones.mjs     Guiones con la API de Claude → public/guiones.json
  guiones-util.mjs        Validación de guiones
  paquetes.mjs            Temas de los videos con datos de Wikidata
  crear-videos.mjs        Voz + Remotion → MP4
remotion/                 Composición del video (efectos, animaciones)
.github/workflows/
  generar-guiones.yml     Botón «Generar guiones» en GitHub Actions
  publicar-app.yml        Publica la app en GitHub Pages
```
