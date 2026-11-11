// Efectos animados: partículas según el tema, stickers de emoji y confeti.
import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from 'remotion';

const W = 1080;
const H = 1920;

/** Partículas de fondo según el tema: nieve, estrellas, luces o destellos. */
export function Particulas({ tema }) {
  const frame = useCurrentFrame();
  if (!tema) return null;

  if (tema === 'estrellas') {
    const estrellas = Array.from({ length: 70 }, (_, i) => {
      const brillo = 0.35 + 0.65 * Math.abs(Math.sin(frame * (0.03 + random(`v${i}`) * 0.08) + i));
      return (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: random(`x${i}`) * W,
            top: random(`y${i}`) * H,
            width: 3 + random(`s${i}`) * 5,
            height: 3 + random(`s${i}`) * 5,
            borderRadius: '50%',
            background: 'white',
            opacity: brillo,
            boxShadow: '0 0 8px white',
          }}
        />
      );
    });
    // Una estrella fugaz cada 2,5 s.
    const ciclo = 75;
    const p = (frame % ciclo) / 22;
    const n = Math.floor(frame / ciclo);
    const fugaz =
      p <= 1 ? (
        <div
          style={{
            position: 'absolute',
            left: random(`fx${n}`) * W * 0.6 + p * 420,
            top: random(`fy${n}`) * H * 0.35 + p * 260,
            width: 220,
            height: 4,
            borderRadius: 4,
            background: 'linear-gradient(90deg, transparent, white)',
            transform: 'rotate(32deg)',
            opacity: Math.sin(p * Math.PI),
          }}
        />
      ) : null;
    return (
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        {estrellas}
        {fugaz}
      </AbsoluteFill>
    );
  }

  const config = {
    nieve: { n: 60, color: 'white', vy: 3.2, vx: 0.8, size: [6, 16], glow: 6 },
    luces: { n: 28, color: '#ffd27a', vy: -1.6, vx: 0, size: [18, 46], glow: 30 },
    destellos: { n: 36, color: '#9ff7ff', vy: -1.2, vx: 0.4, size: [5, 12], glow: 14 },
  }[tema];
  if (!config) return null;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {Array.from({ length: config.n }, (_, i) => {
        const size = config.size[0] + random(`t${i}`) * (config.size[1] - config.size[0]);
        const vel = 0.6 + random(`v${i}`);
        const y0 = random(`y${i}`) * H;
        const y = ((((y0 + frame * config.vy * vel) % (H + 100)) + H + 100) % (H + 100)) - 50;
        const x = random(`x${i}`) * W + Math.sin(frame * 0.04 + i) * 30 * config.vx;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: '50%',
              background: config.color,
              opacity: tema === 'luces' ? 0.35 : 0.75,
              boxShadow: `0 0 ${config.glow}px ${config.color}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

/** Stickers de emoji que aparecen con rebote y se balancean. */
export function Stickers({ emojis, semilla }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!emojis?.length) return null;
  const posiciones = [
    { left: 60, top: 300, rot: -14 },
    { left: 860, top: 360, rot: 12 },
  ];
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {posiciones.map((pos, i) => {
        const emoji = emojis[Math.floor(random(`${semilla}-${i}`) * emojis.length)];
        const entrada = spring({ frame: frame - 10 - i * 6, fps, config: { damping: 8, mass: 0.6 } });
        const vaiven = Math.sin((frame + i * 20) * 0.12) * 8;
        const flota = Math.sin((frame + i * 13) * 0.08) * 12;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: pos.left,
              top: pos.top + flota,
              fontSize: 120,
              transform: `scale(${entrada}) rotate(${pos.rot + vaiven}deg)`,
              filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))',
            }}
          >
            {emoji}
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/** Explosión de confeti desde el centro. */
export function Confeti({ desde = 0, piezas = 90 }) {
  const frame = useCurrentFrame() - desde;
  if (frame < 0 || frame > 75) return null;
  const colores = ['#fe2c55', '#25f4ee', '#ffe14d', '#ffffff', '#7c5cff'];
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {Array.from({ length: piezas }, (_, i) => {
        const ang = random(`a${i}`) * Math.PI * 2;
        const vel = 18 + random(`v${i}`) * 26;
        const x = W / 2 + Math.cos(ang) * vel * frame;
        const y = H * 0.4 + Math.sin(ang) * vel * frame + 0.9 * frame * frame;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: 14 + random(`w${i}`) * 12,
              height: 8 + random(`h${i}`) * 8,
              background: colores[i % colores.length],
              transform: `rotate(${frame * (8 + random(`r${i}`) * 20)}deg)`,
              opacity: interpolate(frame, [50, 75], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              borderRadius: 2,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

/** Pulso suave al ritmo de la música (104 pulsaciones por minuto). */
export function usePulso(bpm = 104) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const porPulso = (fps * 60) / bpm;
  const fase = (frame % porPulso) / porPulso;
  return 1 + 0.018 * Math.exp(-fase * 6);
}
