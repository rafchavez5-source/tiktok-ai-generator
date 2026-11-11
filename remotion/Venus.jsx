// Video cinematográfico de Venus en 3D (storyboard: aparición entre nubes, giro, órbita y amanecer).
// Venus usa el mapa real de la sonda Magellan (NASA/JPL); las nubes y la nebulosa se generan en scripts/texturas.py.
import { useEffect, useMemo, useState } from 'react';
import {
  AbsoluteFill,
  Audio,
  continueRender,
  delayRender,
  Easing,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export const FPS = 30;
const FUENTE = 'Inter, "Inter Display", system-ui, sans-serif';
const DORADO = '#ffd27a';

// Posición del Sol y órbita de Venus (unidades de la escena; el radio de Venus es 1).
const SOL = new THREE.Vector3(-38, 6, 18);
const RADIO_ORBITA = SOL.length();
const ANGULO_INICIAL = Math.atan2(-SOL.z, -SOL.x);

export const duracionVenus = (tramos) => tramos.reduce((s, t) => s + Math.round(t.duracion * FPS), 0);

function inicios(tramos) {
  let acc = 0;
  return tramos.map((t) => {
    const ini = acc;
    acc += Math.round(t.duracion * FPS);
    return ini;
  });
}

const ease = Easing.inOut(Easing.cubic);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };

/** Dónde está Venus en cada fotograma (se mueve por su órbita durante el tramo «órbita»). */
function posicionVenus(f, b) {
  const p = interpolate(f, [b.orbita, b.amanecer], [0, 1], { ...clamp, easing: ease });
  const ang = ANGULO_INICIAL - p * 0.55;
  return new THREE.Vector3(SOL.x + RADIO_ORBITA * Math.cos(ang), 0, SOL.z + RADIO_ORBITA * Math.sin(ang));
}

const mezclar = (a, b, t) => a.clone().lerp(b, t);

/** Vista lejana: la cámara detrás de Venus y en alto, con el Sol en la parte de arriba del encuadre. */
function vistaOrbita(V) {
  const desdeSol = V.clone().sub(SOL).normalize();
  const lado = new THREE.Vector3().crossVectors(desdeSol, new THREE.Vector3(0, 1, 0)).normalize();
  const mira = V.clone().lerp(SOL, 0.5);
  const pos = mira.clone().add(lado.multiplyScalar(66)).add(new THREE.Vector3(0, 22, 0));
  // El Sol queda arriba del encuadre y Venus abajo
  const arriba = SOL.clone().sub(V).normalize();
  return { pos, mira, arriba };
}

/** Cámara: acercamiento, giro, vista de la órbita y amanecer en el horizonte. */
function camara(f, b) {
  const V = posicionVenus(f, b);
  const arriba = new THREE.Vector3(0, 1, 0);
  // 1) Acercamiento entre nubes
  const t1 = interpolate(f, [0, b.giro], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  let pos = mezclar(new THREE.Vector3(0, 0.3, 46), new THREE.Vector3(0.4, 0.25, 4.6), t1).add(V);
  let mira = V.clone();
  let arribaCam = new THREE.Vector3(0, 1, 0);
  // 2) Giro: la cámara rodea un poco el planeta y se acerca
  const t2 = interpolate(f, [b.giro, b.orbita], [0, 1], clamp);
  if (f >= b.giro) {
    const a = t2 * 0.5;
    const d = 4.6 - t2 * 1.0;
    pos = new THREE.Vector3(Math.sin(a) * d + 0.4 * (1 - t2), 0.25 + t2 * 0.35, Math.cos(a) * d).add(V);
  }
  // 3) Órbita: la cámara se aleja y se ve el Sol
  if (f >= b.orbita) {
    const t3 = interpolate(f, [b.orbita, b.orbita + (b.amanecer - b.orbita) * 0.55], [0, 1], { ...clamp, easing: ease });
    const { pos: lejos, mira: centro, arriba: arribaOrbita } = vistaOrbita(V);
    const cerca = new THREE.Vector3(Math.sin(0.5) * 3.6, 0.6, Math.cos(0.5) * 3.6).add(V);
    pos = mezclar(cerca, lejos, t3);
    mira = mezclar(V, centro, t3);
    arribaCam = mezclar(arribaCam, arribaOrbita, t3).normalize();
  }
  // 4) Amanecer: cámara junto a la superficie; el Sol aparece por el borde del planeta
  if (f >= b.amanecer) {
    const t4 = interpolate(f, [b.amanecer, b.cierre], [0, 1], clamp);
    const llegada = interpolate(f, [b.amanecer, b.amanecer + 40], [0, 1], { ...clamp, easing: ease });
    // Cámara a poca altura sobre la línea del amanecer: el Sol pasa de estar oculto a asomar por el horizonte.
    const haciaSol = SOL.clone().sub(V).normalize();
    const lateral = new THREE.Vector3().crossVectors(haciaSol, arriba).normalize();
    const gamma = 0.62 - t4 * 0.52;
    const normal = lateral.clone().multiplyScalar(Math.cos(gamma)).add(haciaSol.clone().multiplyScalar(-Math.sin(gamma))).normalize();
    const superficie = V.clone().add(normal.clone().multiplyScalar(1.09));
    // Mirando hacia el Sol, un poco hacia abajo para que el horizonte quede en el tercio inferior
    const objetivo = superficie.clone().add(haciaSol.clone().multiplyScalar(10)).add(normal.clone().multiplyScalar(-2.7));
    const { pos: lejos, mira: centro, arriba: arribaOrbita } = vistaOrbita(V);
    pos = mezclar(lejos, superficie, llegada);
    mira = mezclar(centro, objetivo, llegada);
    arribaCam = mezclar(arribaOrbita, normal, llegada).normalize();
  }
  // 5) Cierre: se aleja despacio
  if (f >= b.cierre) {
    const t5 = interpolate(f, [b.cierre, b.fin], [0, 1], { ...clamp, easing: ease });
    pos = mezclar(pos, pos.clone().add(new THREE.Vector3(0, 0.6, 0)), t5);
  }
  return { pos, mira, arriba: arribaCam };
}

// ---------- Texturas ----------

function useTextura(ruta) {
  const [tex, setTex] = useState(null);
  const invalidate = useThree((estado) => estado.invalidate);
  const [handle] = useState(() => delayRender(`textura ${ruta}`));
  useEffect(() => {
    new THREE.TextureLoader().load(
      staticFile(ruta),
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        setTex(t);
        // Se espera a que la escena se vuelva a dibujar con la textura antes de capturar el fotograma.
        invalidate();
        requestAnimationFrame(() => requestAnimationFrame(() => continueRender(handle)));
      },
      undefined,
      (err) => {
        console.error(`No se pudo cargar la textura ${ruta}`, err?.message ?? err);
        continueRender(handle);
      },
    );
  }, [ruta, handle, invalidate]);
  return tex;
}

function texturaBrillo() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,250,225,1)');
  grad.addColorStop(0.15, 'rgba(255,220,140,0.85)');
  grad.addColorStop(0.45, 'rgba(255,170,60,0.25)');
  grad.addColorStop(1, 'rgba(255,140,40,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Brillo de la atmósfera en el borde del planeta (efecto Fresnel)
const atmosferaVertex = `
varying vec3 vNormal; varying vec3 vVista;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vVista = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const atmosferaFragment = `
uniform vec3 color; uniform float intensidad;
varying vec3 vNormal; varying vec3 vVista;
void main() {
  float f = pow(1.0 - max(dot(vNormal, vVista), 0.0), 3.5);
  gl_FragColor = vec4(color, f * intensidad);
}`;

// ---------- Escena 3D ----------

function Escena3D({ b }) {
  const frame = useCurrentFrame();
  const { camera } = useThree();
  const superficie = useTextura('venus/superficie.jpg');
  const nubes = useTextura('venus/nubes.png');
  const brillo = useMemo(() => texturaBrillo(), []);
  const atmosfera = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: atmosferaVertex,
        fragmentShader: atmosferaFragment,
        uniforms: { color: { value: new THREE.Color('#ff9a3c') }, intensidad: { value: 0.7 } },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  const { pos, mira, arriba } = camara(frame, b);
  camera.up.copy(arriba);
  camera.position.copy(pos);
  camera.lookAt(mira);
  camera.updateProjectionMatrix();

  const V = posicionVenus(frame, b);
  const t = frame / FPS;
  // En la vista lejana de la órbita Venus se agranda para que se vea (no está a escala).
  const escala = interpolate(frame, [b.orbita + 25, b.orbita + 75, b.amanecer - 10, b.amanecer + 30], [1, 5, 5, 1], { ...clamp, easing: ease });
  // Venus gira «al revés» (rotación retrógrada); las nubes van más rápido (superrotación).
  const giro = -t * 0.22;
  const giroNubes = -t * 0.45;
  const orbitaVisible = interpolate(frame, [b.orbita + 20, b.orbita + 60, b.amanecer, b.amanecer + 30], [0, 0.5, 0.5, 0], clamp);

  return (
    <>
      <ambientLight intensity={0.08} />
      <pointLight position={SOL.toArray()} intensity={1.9} decay={0} color="#fff1d6" />
      {/* Sol */}
      <mesh position={SOL.toArray()}>
        <sphereGeometry args={[3.2, 48, 48]} />
        <meshBasicMaterial color="#fff6d8" />
      </mesh>
      <sprite position={SOL.toArray()} scale={[34, 34, 1]}>
        <spriteMaterial map={brillo} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      {/* Órbita */}
      <mesh position={SOL.toArray()} rotation={[Math.PI / 2, 0, 0]} visible={orbitaVisible > 0.01}>
        <torusGeometry args={[RADIO_ORBITA, 0.06, 8, 256]} />
        <meshBasicMaterial color={DORADO} transparent opacity={orbitaVisible} />
      </mesh>
      {/* Venus */}
      <group position={V.toArray()} rotation={[0, 0, THREE.MathUtils.degToRad(2.6)]} scale={escala}>
        <mesh rotation={[0, giro, 0]}>
          <sphereGeometry args={[1, 128, 128]} />
          <meshStandardMaterial map={superficie} roughness={1} metalness={0} color="#ffe2b0" />
        </mesh>
        <mesh rotation={[0, giroNubes, 0]}>
          <sphereGeometry args={[1.012, 128, 128]} />
          <meshStandardMaterial map={nubes} transparent opacity={nubes ? 0.45 : 0} depthWrite={false} roughness={1} />
        </mesh>
        <mesh scale={1.07} material={atmosfera}>
          <sphereGeometry args={[1, 96, 96]} />
        </mesh>
      </group>
    </>
  );
}

// ---------- Capas 2D (texto, nubes cósmicas, subtítulos) ----------

function NubesCosmicas({ fin }) {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, fin * 0.4, fin * 0.85], [1, 0.75, 0], clamp);
  const s = interpolate(frame, [0, fin], [1.1, 2.4], clamp);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity: o }}>
      <Img src={staticFile('venus/nebulosa.jpg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${s}) rotate(${frame * 0.03}deg)`, mixBlendMode: 'screen', filter: 'blur(6px) saturate(1.3)' }} />
      <Img src={staticFile('venus/nebulosa.jpg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${s * 1.4}) rotate(${180 - frame * 0.05}deg)`, mixBlendMode: 'screen', opacity: 0.7, filter: 'blur(14px) hue-rotate(-15deg)' }} />
    </AbsoluteFill>
  );
}

function Titular({ texto, desde, hasta, top = 260, size = 92 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < desde || frame > hasta) return null;
  const entrada = spring({ frame: frame - desde, fps, config: { damping: 20, mass: 0.9 } });
  const salida = interpolate(frame, [hasta - 12, hasta], [1, 0], clamp);
  return (
    <div
      style={{
        position: 'absolute', left: 70, right: 70, top, textAlign: 'center', fontFamily: FUENTE,
        fontSize: size, fontWeight: 800, lineHeight: 1.08, color: 'white', letterSpacing: -1,
        opacity: entrada * salida, transform: `translateY(${(1 - entrada) * 40}px)`,
        textShadow: '0 6px 30px rgba(0,0,0,0.85)',
      }}
    >
      {texto}
    </div>
  );
}

function Ficha({ etiqueta, valor, unidad, desde, hasta, top = 250 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < desde || frame > hasta) return null;
  const e = spring({ frame: frame - desde, fps, config: { damping: 16 } });
  const salida = interpolate(frame, [hasta - 12, hasta], [1, 0], clamp);
  const n = Math.round(valor * interpolate(frame - desde, [6, 40], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) }));
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top, display: 'flex', justifyContent: 'center', opacity: e * salida, fontFamily: FUENTE }}>
      <div style={{ textAlign: 'center', padding: '22px 40px', borderRadius: 26, background: 'rgba(10,8,6,0.55)', border: '1px solid rgba(255,210,122,0.45)', transform: `scale(${0.85 + 0.15 * e})` }}>
        <div style={{ fontSize: 34, letterSpacing: 6, color: DORADO, fontWeight: 700 }}>{etiqueta}</div>
        <div style={{ fontSize: 150, fontWeight: 900, color: 'white', lineHeight: 1 }}>
          {n}
          <span style={{ fontSize: 50, fontWeight: 700, marginLeft: 14, color: 'rgba(255,255,255,0.85)' }}>{unidad}</span>
        </div>
      </div>
    </div>
  );
}

function Oeste({ desde, hasta }) {
  const frame = useCurrentFrame();
  if (frame < desde || frame > hasta) return null;
  const o = interpolate(frame, [desde, desde + 20, hasta - 12, hasta], [0, 1, 1, 0], clamp);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 560, textAlign: 'center', opacity: o, fontFamily: FUENTE }}>
      <div style={{ display: 'inline-block', fontSize: 40, fontWeight: 800, letterSpacing: 10, color: DORADO, padding: '10px 26px', border: `2px solid ${DORADO}`, borderRadius: 12, background: 'rgba(0,0,0,0.35)' }}>
        ↑ OESTE
      </div>
    </div>
  );
}

function Subtitulos({ tramos, b0 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const i = b0.findLastIndex((ini) => frame >= ini);
  const tramo = tramos[i];
  if (!tramo?.words?.length) return null;
  const t = (frame - b0[i]) / fps - tramo.inicioVoz;
  if (t < 0) return null;
  const grupos = [];
  let actual = [];
  tramo.words.forEach((w) => {
    actual.push(w);
    if (actual.length === 4 || /[.,:;?!]$/.test(w.w)) {
      grupos.push(actual);
      actual = [];
    }
  });
  if (actual.length) grupos.push(actual);
  const grupo = grupos.find((g) => t < g.at(-1).end) ?? grupos.at(-1);
  if (t > grupo.at(-1).end + 0.6) return null;
  return (
    <div style={{ position: 'absolute', left: 60, right: 60, top: 1430, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px 16px', fontFamily: FUENTE }}>
      {grupo.map((w, k) => {
        const activa = t >= w.start && t < w.end;
        return (
          <span key={k} style={{ fontSize: 64, fontWeight: 800, color: activa ? DORADO : 'white', textShadow: '0 3px 0 rgba(0,0,0,0.9), 0 0 24px rgba(0,0,0,0.9)', transform: `scale(${activa ? 1.08 : 1})` }}>
            {w.w}
          </span>
        );
      })}
    </div>
  );
}

function Cierre({ desde }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < desde) return null;
  const e = spring({ frame: frame - desde - 6, fps, config: { damping: 12 } });
  const latido = 1 + 0.05 * Math.sin(((frame - desde) / fps) * Math.PI * 2);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 760, textAlign: 'center', fontFamily: FUENTE, opacity: e }}>
      <div style={{ fontSize: 80, fontWeight: 800, color: 'white', lineHeight: 1.1, textShadow: '0 6px 30px rgba(0,0,0,0.85)', padding: '0 70px' }}>
        Más secretos del espacio
      </div>
      <div style={{ display: 'inline-block', marginTop: 40, transform: `scale(${e * latido})`, background: '#fe2c55', color: 'white', fontSize: 52, fontWeight: 900, padding: '22px 64px', borderRadius: 22, boxShadow: '0 20px 60px rgba(254,44,85,0.45)' }}>
        + Seguir
      </div>
    </div>
  );
}

function Destello({ en }) {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [en - 4, en, en + 10], [0, 0.45, 0], clamp);
  if (o <= 0) return null;
  return <AbsoluteFill style={{ background: 'radial-gradient(circle, rgba(255,230,180,1), rgba(255,200,120,0.6))', opacity: o, pointerEvents: 'none' }} />;
}

// ---------- Composición ----------

export function Venus({ tramos, musica, transicion }) {
  const { width, height } = useVideoConfig();
  const b0 = inicios(tramos);
  const total = duracionVenus(tramos);
  const b = { gancho: b0[0], giro: b0[1], orbita: b0[2], amanecer: b0[3], cierre: b0[4], fin: total };

  return (
    <AbsoluteFill style={{ backgroundColor: '#030305' }}>
      <Img src={staticFile('venus/nebulosa.jpg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }} />
      <ThreeCanvas width={width} height={height} camera={{ fov: 42, near: 0.01, far: 1000, position: [0, 0, 46] }} gl={{ antialias: true, alpha: true }}>
        <Escena3D b={b} />
      </ThreeCanvas>
      <NubesCosmicas fin={b.giro} />
      {/* Viñeta cinematográfica */}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.6) 100%)', pointerEvents: 'none' }} />

      <Titular texto="En Venus, un día dura más que un año" desde={Math.round(1.2 * FPS)} hasta={b.giro - 4} top={250} />
      <Ficha etiqueta="1 DÍA EN VENUS" valor={243} unidad="días" desde={b.giro + 10} hasta={b.orbita - 4} />
      <Ficha etiqueta="1 AÑO EN VENUS" valor={225} unidad="días" desde={b.orbita + 40} hasta={b.amanecer - 4} top={720} />
      <Titular texto="El Sol sale por el oeste" desde={b.amanecer + 20} hasta={b.cierre - 4} top={700} size={84} />
      <Oeste desde={b.amanecer + 45} hasta={b.cierre - 4} />
      <Cierre desde={b.cierre} />
      <Subtitulos tramos={tramos} b0={b0} />
      {[b.giro, b.orbita, b.amanecer, b.cierre].map((en) => (
        <Destello key={en} en={en} />
      ))}

      {/* Voz */}
      {tramos.map((t, i) => (
        <Sequence key={t.id} from={b0[i] + Math.round(t.inicioVoz * FPS)}>
          <Audio src={staticFile(t.audio)} />
        </Sequence>
      ))}
      {/* Música y transiciones */}
      {musica && <Audio src={staticFile(musica)} volume={(f) => interpolate(f, [0, 30, total - 45, total], [0, 0.32, 0.32, 0], clamp)} />}
      {transicion &&
        [b.orbita, b.amanecer].map((en) => (
          <Sequence key={`t-${en}`} from={Math.max(0, en - 48)} durationInFrames={75}>
            <Audio src={staticFile(transicion)} volume={0.55} />
          </Sequence>
        ))}
    </AbsoluteFill>
  );
}
