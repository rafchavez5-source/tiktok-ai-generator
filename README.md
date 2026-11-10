# TikTok AI Generator

Aplicación web para preparar videos verticales (9:16) de datos curiosos para TikTok.

## Qué hace esta primera versión

- Escribes el **tema** del video.
- Eliges la **cantidad de datos curiosos** (3 a 10) y la **duración** (15, 30, 45, 60 o 90 s).
- **Generar guion** crea una plantilla con gancho, un bloque por cada dato y cierre, con los segundos repartidos automáticamente.
- Editas el **guion**: título y narración de cada escena. Se avisa si el texto tarda más en leerse que la duración de la escena (≈ 2,5 palabras por segundo).
- Organizas las **escenas**: cambiar orden, tipo, segundos y texto en pantalla; añadir o eliminar escenas. Una barra muestra si la suma coincide con la duración elegida.
- **Vista previa vertical** del texto en pantalla de la escena seleccionada (boceto, no es el video final).
- **Copiar** el guion o **descargarlo** en `.txt`.
- **Crear video**: convierte las escenas en un video vertical 1080×1920 con el texto animado y una barra de progreso, y lo descarga (MP4 en Chrome, Edge y Safari recientes; WebM en otros). Se crea en el propio navegador y tarda lo mismo que dura el video.
- El proyecto se **guarda solo** en el navegador.

### Lo que todavía no hace

- No escribe los datos curiosos con IA: tú escribes cada dato. No usa servicios de pago ni claves API.
- El video no lleva voz, música ni imágenes. Puedes añadir música o tu voz desde TikTok al publicarlo.

## Cómo probarla

Necesitas [Node.js](https://nodejs.org) 20.19 o más reciente.

```bash
npm install      # instala dependencias (solo la primera vez)
npm run dev      # abre la app en modo desarrollo
```

Abre la dirección que aparece en la terminal (normalmente http://localhost:5173).
Para verla en tu teléfono, conéctalo a la misma red Wi‑Fi y abre la dirección marcada como `Network`.

Otros comandos:

```bash
npm test         # pruebas automáticas de la lógica del guion
npm run build    # versión optimizada en la carpeta dist/
npm run preview  # sirve la versión de dist/
```

## Estructura

```
index.html                    Página base
src/main.jsx                  Punto de entrada
src/App.jsx                   Pantalla principal y estado del proyecto
src/components/
  GeneratorForm.jsx           Paso 1: tema, cantidad de datos y duración
  ScriptEditor.jsx            Paso 2: edición del guion, copiar y descargar
  SceneBoard.jsx              Paso 3: organización de escenas y línea de tiempo
  ScenePreview.jsx            Boceto vertical 9:16 de la escena
  VideoMaker.jsx              Paso 4: vista previa, creación y descarga del video
src/lib/
  script.js                   Generación de la plantilla, tiempos y exportación
  script.test.js              Pruebas
  storage.js                  Guardado automático en el navegador
  video.js                    Dibujo de fotogramas y grabación del video
  video.test.js               Pruebas del video
src/styles.css                Estilos (adaptables a móvil)
```
