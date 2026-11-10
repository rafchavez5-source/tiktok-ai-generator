// Animaciones hechas con código para la versión «animada» de los videos:
// comparación de alturas (montañas y edificios) y planetas que giran.
import { interpolate, random, spring, useCurrentFrame, useVideoConfig } from 'remotion';

const AMARILLO = '#ffe14d';
const FUENTE = 'Inter, "Inter Display", system-ui, sans-serif';

export function Animacion({ animacion, color }) {
  if (!animacion) return null;
  if (animacion.tipo === 'alturas') return <ComparacionAlturas {...animacion} color={color} />;
  if (animacion.tipo === 'planeta') return <PlanetaAnimado {...animacion} />;
  if (animacion.tipo === 'superficies') return <ComparacionSuperficies {...animacion} color={color} />;
  return null;
}

// ---------- Alturas: montañas o rascacielos que crecen ----------

function ComparacionAlturas({ serie, actual, forma, color }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const max = Math.max(...serie.map((s) => s.valor));
  const minimo = forma === 'montaña' ? Math.min(...serie.map((s) => s.valor)) * 0.85 : 0;
  const alto = 440;
  const ancho = 940;
  const hueco = 18;
  const anchoBarra = (ancho - hueco * (serie.length - 1)) / serie.length;

  return (
    <div style={{ position: 'absolute', left: 70, top: 900, width: ancho, height: alto + 60, fontFamily: FUENTE }}>
      {/* Línea del suelo */}
      <div style={{ position: 'absolute', left: -20, right: -20, top: alto, height: 4, background: 'rgba(255,255,255,0.5)', borderRadius: 2 }} />
      {serie.map((s, i) => {
        const crecer = spring({ frame: frame - 4 - i * 4, fps, config: { damping: 14, mass: 0.8 } });
        const h = ((s.valor - minimo) / (max - minimo)) * alto * crecer;
        const esActual = i === actual;
        const fondo = esActual ? color : 'rgba(255,255,255,0.28)';
        const x = i * (anchoBarra + hueco);
        return (
          <div key={s.nombre}>
            {forma === 'montaña' ? (
              <Montana x={x} ancho={anchoBarra} alto={h} base={alto} fondo={fondo} resaltada={esActual} />
            ) : (
              <Edificio x={x} ancho={anchoBarra} alto={h} base={alto} fondo={fondo} resaltada={esActual} semilla={i} />
            )}
            <div
              style={{
                position: 'absolute',
                left: x - 20,
                width: anchoBarra + 40,
                top: alto + 14,
                textAlign: 'center',
                fontSize: 26,
                fontWeight: esActual ? 900 : 600,
                color: esActual ? 'white' : 'rgba(255,255,255,0.6)',
                lineHeight: 1.1,
              }}
            >
              {s.corto}
            </div>
            {esActual && (
              <div
                style={{
                  position: 'absolute',
                  left: x - 30,
                  width: anchoBarra + 60,
                  top: alto - h - 70,
                  textAlign: 'center',
                  fontSize: 40,
                  fontWeight: 900,
                  color: AMARILLO,
                  opacity: crecer,
                  textShadow: '0 4px 12px rgba(0,0,0,0.8)',
                }}
              >
                ▼
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Montana({ x, ancho, alto, base, fondo, resaltada }) {
  const extra = ancho * 0.35;
  return (
    <div style={{ position: 'absolute', left: x - extra / 2, top: base - alto, width: ancho + extra, height: alto }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: resaltada ? `linear-gradient(180deg, ${fondo}, ${fondo}99)` : fondo,
          clipPath: 'polygon(50% 0%, 62% 18%, 70% 14%, 100% 100%, 0% 100%, 30% 22%, 40% 10%)',
          filter: resaltada ? `drop-shadow(0 0 30px ${fondo})` : 'none',
        }}
      />
      {/* Nieve en la cima */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'white',
          clipPath: 'polygon(50% 0%, 58% 12%, 54% 16%, 50% 13%, 45% 17%, 42% 12%)',
          opacity: resaltada ? 1 : 0.7,
        }}
      />
    </div>
  );
}

function Edificio({ x, ancho, alto, base, fondo, resaltada, semilla }) {
  const frame = useCurrentFrame();
  const cuerpo = ancho * 0.7;
  const filas = Math.max(1, Math.floor(alto / 28));
  return (
    <div style={{ position: 'absolute', left: x + (ancho - cuerpo) / 2, top: base - alto, width: cuerpo, height: alto }}>
      {/* Aguja */}
      <div style={{ position: 'absolute', left: cuerpo / 2 - 3, top: -alto * 0.08, width: 6, height: alto * 0.1, background: fondo }} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: resaltada ? `linear-gradient(180deg, ${fondo}, ${fondo}aa)` : fondo,
          clipPath: 'polygon(30% 0%, 70% 0%, 85% 25%, 100% 100%, 0% 100%, 15% 25%)',
          boxShadow: resaltada ? `0 0 40px ${fondo}` : 'none',
          overflow: 'hidden',
        }}
      >
        {/* Ventanas que se encienden */}
        {Array.from({ length: filas }, (_, f) =>
          [0, 1, 2].map((c) => {
            const encendida = random(`w${semilla}-${f}-${c}-${Math.floor(frame / 12)}`) > 0.45;
            return (
              <div
                key={`${f}-${c}`}
                style={{
                  position: 'absolute',
                  left: `${22 + c * 22}%`,
                  bottom: 10 + f * 28,
                  width: '12%',
                  height: 12,
                  background: encendida ? '#fff3b0' : 'rgba(0,0,0,0.25)',
                  boxShadow: encendida ? '0 0 8px #fff3b0' : 'none',
                }}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}

// ---------- Superficies: cuadrados que se comparan ----------

function ComparacionSuperficies({ serie, actual, color }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const max = Math.max(...serie.map((s) => s.valor));
  const lado = (v) => Math.sqrt(v / max) * 420;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 820, height: 520, fontFamily: FUENTE }}>
      {serie.map((s, i) => {
        const aparecer = spring({ frame: frame - 4 - i * 5, fps, config: { damping: 12 } });
        const l = Math.max(lado(s.valor), 10) * aparecer;
        const esActual = i === actual;
        return (
          <div
            key={s.nombre}
            style={{
              position: 'absolute',
              left: 540 - l / 2,
              top: 470 - l,
              width: l,
              height: l,
              border: `4px solid ${esActual ? color : 'rgba(255,255,255,0.35)'}`,
              background: esActual ? `${color}55` : 'transparent',
              borderRadius: 8,
              boxShadow: esActual ? `0 0 40px ${color}` : 'none',
              zIndex: esActual ? 2 : 1,
            }}
          />
        );
      })}
      <div style={{ position: 'absolute', top: 486, left: 0, right: 0, textAlign: 'center', fontSize: 28, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
        Tamaño comparado con {serie.reduce((a, b) => (b.valor > a.valor ? b : a)).corto}
      </div>
    </div>
  );
}

// ---------- Planetas que giran, comparados con la Tierra ----------

const PLANETAS = {
  Q308: { bandas: ['#8c8580', '#a59e98', '#6f6965', '#9a938d'], brillo: '#c9c2bb' },
  Q313: { bandas: ['#e8cf8f', '#d9b56c', '#f1dca8', '#cfa75e'], brillo: '#fff1c4' },
  Q319: { bandas: ['#d8b98f', '#a8754d', '#efe0c4', '#b9875d', '#e6cfa6', '#8f5c3a'], brillo: '#ffe8c4', mancha: true },
  Q193: { bandas: ['#e6d29b', '#cdb276', '#f1e3b8', '#d9c084'], brillo: '#fff3cf', anillos: true },
  Q332: { bandas: ['#3f6fd8', '#2f56b8', '#5b88ea', '#2a4ea6'], brillo: '#a8c6ff' },
  tierra: { bandas: ['#2f7de1', '#2e9e5b', '#2f7de1', '#e7f2ff', '#2f7de1'], brillo: '#cfe6ff' },
};

function Esfera({ id, tam, giro }) {
  const p = PLANETAS[id] ?? PLANETAS.tierra;
  const franjas = p.bandas.map((c, i) => `${c} ${(i / (p.bandas.length - 1)) * 100}%`).join(', ');
  const esTierra = !PLANETAS[id] || id === 'tierra';
  return (
    <div style={{ position: 'relative', width: tam, height: tam }}>
      {p.anillos && <Anillo tam={tam} detras />}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          overflow: 'hidden',
          background: esTierra
            ? `radial-gradient(circle at ${30 + ((giro * 40) % 60)}% 38%, #2e9e5b 0 16%, transparent 17%), radial-gradient(circle at ${55 + ((giro * 40) % 50)}% 65%, #3aa860 0 13%, transparent 14%), radial-gradient(ellipse at 50% 6%, #f2f8ff 0 14%, transparent 15%), #2f7de1`
            : `linear-gradient(180deg, ${franjas})`,
          boxShadow: `0 0 ${tam * 0.25}px ${p.brillo}66`,
        }}
      >
        {/* Las franjas se desplazan para simular el giro */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `repeating-linear-gradient(90deg, rgba(255,255,255,0.05), rgba(0,0,0,0.05) ${tam * 0.12}px, rgba(255,255,255,0.05) ${tam * 0.24}px)`,
            backgroundPositionX: `${-giro * tam * 0.6}px`,
          }}
        />
        {p.mancha && (
          <div
            style={{
              position: 'absolute',
              width: tam * 0.2,
              height: tam * 0.12,
              borderRadius: '50%',
              background: '#c0563a',
              top: tam * 0.6,
              left: `${((0.9 - giro * 0.35) % 1.3) * 100}%`,
            }}
          />
        )}
        {/* Sombra para dar volumen */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at 32% 30%, rgba(255,255,255,0.35), transparent 40%, rgba(0,0,0,0.65) 85%)' }} />
      </div>
      {p.anillos && <Anillo tam={tam} />}
    </div>
  );
}

function Anillo({ tam, detras }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: -tam * 0.45,
        top: tam * 0.36,
        width: tam * 1.9,
        height: tam * 0.32,
        borderRadius: '50%',
        border: `${Math.max(4, tam * 0.06)}px solid rgba(230,210,160,0.85)`,
        transform: 'rotate(-12deg)',
        clipPath: detras ? 'inset(0 0 50% 0)' : 'inset(50% 0 0 0)',
      }}
    />
  );
}

function PlanetaAnimado({ id, nombre, ratio }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const crecer = spring({ frame: frame - 6, fps, config: { damping: 12, mass: 0.9 } });
  // Tamaños a escala: el mayor de los dos mide 440 px.
  const tierra = ratio > 1 ? 440 / ratio : 300;
  const tam = (ratio > 1 ? 440 : 300 * ratio) * crecer;
  const giro = frame / fps / 4;
  const flota = Math.sin(frame / 20) * 10;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 800, height: 600, fontFamily: FUENTE }}>
      <div style={{ position: 'absolute', left: ratio > 1 ? 600 - tam / 2 : 760 - tam / 2, top: 290 - tam / 2 + flota }}>
        <Esfera id={id} tam={tam} giro={giro} />
      </div>
      <div style={{ position: 'absolute', left: ratio > 1 ? 150 - tierra / 2 : 330 - tierra / 2, top: 290 - tierra / 2, textAlign: 'center' }}>
        <Esfera id="tierra" tam={tierra} giro={giro} />
        <div style={{ textAlign: 'center', color: 'white', fontWeight: 700, fontSize: 28, marginTop: 10 }}>Tierra</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 560, textAlign: 'center', color: 'rgba(255,255,255,0.75)', fontSize: 28, fontWeight: 600, opacity: interpolate(frame, [20, 35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
        {nombre} y la Tierra, a escala
      </div>
    </div>
  );
}
