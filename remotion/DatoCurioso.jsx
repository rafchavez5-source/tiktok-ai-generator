// Video vertical de datos curiosos hecho con Remotion.
// Recibe las escenas ya preparadas por scripts/crear-videos.mjs (texto, voz, imagen y tiempos de cada palabra).
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';

export const FPS = 30;
export const TRANSICION = 12; // fotogramas que dura cada transición

const COLORES = { hook: '#fe2c55', fact: '#25f4ee', outro: '#ffc94d' };
const AMARILLO = '#ffe14d';
const FUENTE = 'Inter, "Inter Display", system-ui, sans-serif';

export const framesEscena = (s) => Math.ceil(s.duration * FPS) + TRANSICION;
export const duracionTotal = (scenes) =>
  scenes.reduce((sum, s) => sum + framesEscena(s), 0) - TRANSICION * Math.max(scenes.length - 1, 0);

const formatear = (n, decimales) =>
  n.toLocaleString('es-ES', { minimumFractionDigits: decimales, maximumFractionDigits: decimales, useGrouping: true });

// ---------- Fondo ----------

function Fondo({ image, color, frames }) {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, frames], [1.08, 1.24]);
  const panX = interpolate(frame, [0, frames], [-20, 20]);
  return (
    <AbsoluteFill style={{ backgroundColor: '#07070b', overflow: 'hidden' }}>
      {image ? (
        <Img
          src={staticFile(image)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${zoom}) translateX(${panX}px)`,
          }}
        />
      ) : (
        <Burbujas color={color} />
      )}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(5,5,9,0.78) 0%, rgba(5,5,9,0.35) 38%, rgba(5,5,9,0.45) 60%, rgba(5,5,9,0.92) 100%)',
        }}
      />
      <AbsoluteFill
        style={{ background: `radial-gradient(circle at 80% 85%, ${color}40 0%, transparent 55%)` }}
      />
    </AbsoluteFill>
  );
}

function Burbujas({ color }) {
  const frame = useCurrentFrame();
  const bolas = [
    { x: 20, y: 25, r: 520, c: color, v: 0.02 },
    { x: 80, y: 70, r: 640, c: '#fe2c55', v: 0.015 },
    { x: 40, y: 90, r: 460, c: '#25f4ee', v: 0.025 },
  ];
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(160deg, #15151f, #07070b)' }}>
      {bolas.map((b, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${b.x + Math.sin(frame * b.v + i) * 8}%`,
            top: `${b.y + Math.cos(frame * b.v + i) * 6}%`,
            width: b.r,
            height: b.r,
            marginLeft: -b.r / 2,
            marginTop: -b.r / 2,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${b.c}66 0%, ${b.c}00 70%)`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
}

// ---------- Piezas de texto ----------

function Etiqueta({ texto, color, delay = 0 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 12 } });
  return (
    <div
      style={{
        alignSelf: 'center',
        transform: `scale(${s})`,
        background: color,
        color: '#0b0b10',
        fontWeight: 900,
        fontSize: 38,
        letterSpacing: 3,
        padding: '12px 30px',
        borderRadius: 999,
        textTransform: 'uppercase',
      }}
    >
      {texto}
    </div>
  );
}

function TituloPalabras({ texto, size = 112, delay = 0, resaltar = /^\d/ }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '0 26px',
        fontSize: size,
        fontWeight: 900,
        lineHeight: 1.08,
        textAlign: 'center',
        color: 'white',
        textShadow: '0 8px 30px rgba(0,0,0,0.6)',
      }}
    >
      {texto.split(' ').map((w, i) => {
        const s = spring({ frame: frame - delay - i * 3, fps, config: { damping: 11, mass: 0.6 } });
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              transform: `translateY(${(1 - s) * 80}px) scale(${0.6 + 0.4 * s})`,
              opacity: Math.min(1, s * 1.5),
              color: resaltar.test(w) ? AMARILLO : 'white',
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
}

function Contador({ cifra, delay = 10 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const avance = interpolate(frame - delay, [0, fps * 1.2], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const entrada = spring({ frame: frame - delay, fps, config: { damping: 14 } });
  const final = interpolate(frame - delay, [fps * 1.2, fps * 1.4, fps * 1.6], [1, 1.08, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div style={{ textAlign: 'center', transform: `scale(${entrada * final})`, opacity: entrada }}>
      <div style={{ fontSize: 170, fontWeight: 900, color: AMARILLO, lineHeight: 1, letterSpacing: -4, textShadow: '0 10px 40px rgba(0,0,0,0.6)' }}>
        {formatear(cifra.valor * avance, cifra.decimales)}
        <span style={{ fontSize: 80, marginLeft: 16, color: 'white' }}>{cifra.unidad}</span>
      </div>
      <div style={{ fontSize: 44, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginTop: 10 }}>{cifra.etiqueta}</div>
    </div>
  );
}

/** Subtítulos estilo TikTok: grupos de pocas palabras, la palabra que se dice resaltada. */
function Subtitulos({ words, inicio }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame - inicio) / fps;
  if (!words?.length || t < 0) return null;

  // Agrupa en bloques de hasta 4 palabras o hasta un signo de puntuación.
  const grupos = [];
  let actual = [];
  words.forEach((w) => {
    actual.push(w);
    if (actual.length === 4 || /[.,:;?!]$/.test(w.w)) {
      grupos.push(actual);
      actual = [];
    }
  });
  if (actual.length) grupos.push(actual);

  const grupo = grupos.find((g) => t < g.at(-1).end) ?? grupos.at(-1);
  const inicioGrupo = grupo[0].start;
  const pop = spring({ frame: frame - inicio - Math.round(inicioGrupo * fps), fps, config: { damping: 13, mass: 0.5 } });

  return (
    <div
      style={{
        position: 'absolute',
        left: 60,
        right: 60,
        top: 1180,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '6px 18px',
        transform: `scale(${0.85 + 0.15 * pop})`,
      }}
    >
      {grupo.map((w, i) => {
        const activa = t >= w.start && t < w.end;
        return (
          <span
            key={i}
            style={{
              fontSize: 70,
              fontWeight: 900,
              color: activa ? '#0b0b10' : 'white',
              background: activa ? AMARILLO : 'transparent',
              borderRadius: 14,
              padding: '0 12px',
              textShadow: activa ? 'none' : '0 4px 0 #000, 0 0 18px rgba(0,0,0,0.9)',
              WebkitTextStroke: activa ? '0' : '2px rgba(0,0,0,0.6)',
            }}
          >
            {w.w}
          </span>
        );
      })}
    </div>
  );
}

function Credito({ texto }) {
  if (!texto) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 80,
        right: 80,
        bottom: 300,
        textAlign: 'center',
        fontSize: 24,
        fontWeight: 500,
        color: 'rgba(255,255,255,0.65)',
        textShadow: '0 2px 6px rgba(0,0,0,0.9)',
      }}
    >
      {texto}
    </div>
  );
}

// ---------- Escenas ----------

function Escena({ scene, frames }) {
  const color = COLORES[scene.type] ?? COLORES.fact;
  const inicioVoz = Math.round(TRANSICION / 2);
  return (
    <AbsoluteFill style={{ fontFamily: FUENTE }}>
      <Fondo image={scene.image} color={color} frames={frames} />
      {scene.audio && (
        <Sequence from={inicioVoz}>
          <Audio src={staticFile(scene.audio)} />
        </Sequence>
      )}
      <AbsoluteFill style={{ padding: '230px 70px 0', display: 'flex', flexDirection: 'column', gap: 40 }}>
        {scene.type === 'hook' && <ContenidoGancho scene={scene} color={color} />}
        {scene.type === 'fact' && <ContenidoDato scene={scene} color={color} />}
        {scene.type === 'outro' && <ContenidoCierre scene={scene} color={color} />}
      </AbsoluteFill>
      {scene.type !== 'hook' && <Subtitulos words={scene.words} inicio={inicioVoz} />}
      <Credito texto={scene.credit} />
    </AbsoluteFill>
  );
}

function ContenidoGancho({ scene, color }) {
  const frame = useCurrentFrame();
  const sacudida = Math.sin(frame * 0.9) * interpolate(frame, [0, 12], [10, 0], { extrapolateRight: 'clamp' });
  return (
    <>
      <div style={{ height: 160 }} />
      <Etiqueta texto="¿Sabías que…?" color={color} />
      <div style={{ transform: `rotate(${sacudida * 0.2}deg)` }}>
        <TituloPalabras texto={scene.title} size={118} delay={6} />
      </div>
      <Sequence from={22} layout="none">
        <TextoAparece texto={scene.text} />
      </Sequence>
    </>
  );
}

function TextoAparece({ texto }) {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ fontSize: 54, fontWeight: 700, color: 'rgba(255,255,255,0.92)', textAlign: 'center', opacity: o, transform: `translateY(${(1 - o) * 30}px)` }}>
      {texto}
    </div>
  );
}

function ContenidoDato({ scene, color }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rango = spring({ frame: frame - 2, fps, config: { damping: 9, mass: 0.7 } });
  const nombre = spring({ frame: frame - 8, fps, config: { damping: 14 } });
  return (
    <>
      {scene.rank != null && (
        <div
          style={{
            alignSelf: 'center',
            width: 190,
            height: 190,
            borderRadius: '50%',
            background: color,
            color: '#0b0b10',
            display: 'grid',
            placeItems: 'center',
            fontSize: 100,
            fontWeight: 900,
            transform: `scale(${rango}) rotate(${(1 - rango) * -90}deg)`,
            boxShadow: `0 0 80px ${color}aa`,
          }}
        >
          {scene.rank}
        </div>
      )}
      <div
        style={{
          textAlign: 'center',
          fontSize: 96,
          fontWeight: 900,
          color: 'white',
          lineHeight: 1.05,
          transform: `translateX(${(1 - nombre) * -600}px)`,
          opacity: nombre,
          textShadow: '0 8px 30px rgba(0,0,0,0.7)',
        }}
      >
        {scene.title}
      </div>
      {scene.cifra && <Contador cifra={scene.cifra} delay={14} />}
    </>
  );
}

function ContenidoCierre({ scene, color }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const latido = 1 + 0.06 * Math.sin((frame / fps) * Math.PI * 2);
  const entrada = spring({ frame: frame - 16, fps, config: { damping: 10 } });
  return (
    <>
      <div style={{ height: 120 }} />
      <TituloPalabras texto={scene.title} size={104} delay={4} resaltar={/^más$/i} />
      <div
        style={{
          alignSelf: 'center',
          marginTop: 30,
          transform: `scale(${entrada * latido})`,
          background: color === COLORES.outro ? '#fe2c55' : color,
          color: 'white',
          fontSize: 56,
          fontWeight: 900,
          padding: '26px 70px',
          borderRadius: 24,
          boxShadow: '0 20px 60px rgba(254,44,85,0.5)',
        }}
      >
        + Seguir
      </div>
    </>
  );
}

// ---------- Video completo ----------

function BarraProgreso({ total }) {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: 'absolute', top: 60, left: 60, right: 60, height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.25)' }}>
      <div style={{ width: `${(frame / total) * 100}%`, height: '100%', borderRadius: 5, background: 'white' }} />
    </div>
  );
}

export function DatoCurioso({ scenes, whoosh }) {
  const total = duracionTotal(scenes);
  let inicio = 0;
  const inicios = scenes.map((s) => {
    const i = inicio;
    inicio += framesEscena(s) - TRANSICION;
    return i;
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#07070b' }}>
      <TransitionSeries>
        {scenes.flatMap((scene, i) => {
          const items = [
            <TransitionSeries.Sequence key={scene.id} durationInFrames={framesEscena(scene)}>
              <Escena scene={scene} frames={framesEscena(scene)} />
            </TransitionSeries.Sequence>,
          ];
          if (i < scenes.length - 1) {
            items.push(
              <TransitionSeries.Transition
                key={`${scene.id}-t`}
                presentation={slide({ direction: i % 2 === 0 ? 'from-right' : 'from-bottom' })}
                timing={linearTiming({ durationInFrames: TRANSICION })}
              />,
            );
          }
          return items;
        })}
      </TransitionSeries>
      {whoosh &&
        inicios.slice(1).map((f, i) => (
          <Sequence key={i} from={Math.max(0, f - 4)} durationInFrames={20}>
            <Audio src={staticFile(whoosh)} volume={0.35} />
          </Sequence>
        ))}
      <BarraProgreso total={total} />
    </AbsoluteFill>
  );
}

