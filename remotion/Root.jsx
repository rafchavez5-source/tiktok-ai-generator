import { Composition } from 'remotion';
import { DatoCurioso, duracionTotal, FPS } from './DatoCurioso.jsx';
import { Venus, duracionVenus } from './Venus.jsx';

const ejemplo = {
  titulo: 'Ejemplo',
  scenes: [
    { id: 'a', type: 'hook', title: 'Ejemplo de video', text: '¿Sabías esto?', words: [], duration: 3, audio: null, image: null, credit: '' },
  ],
};

export const Root = () => (
  <>
  <Composition
    id="DatoCurioso"
    component={DatoCurioso}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={90}
    defaultProps={ejemplo}
    calculateMetadata={({ props }) => ({ durationInFrames: duracionTotal(props.scenes) })}
  />
  <Composition
    id="Venus"
    component={Venus}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={300}
    defaultProps={{ tramos: [{ id: 'a', duracion: 10, inicioVoz: 0, audio: null, words: [] }, { id: 'b', duracion: 1, inicioVoz: 0, words: [] }, { id: 'c', duracion: 1, inicioVoz: 0, words: [] }, { id: 'd', duracion: 1, inicioVoz: 0, words: [] }, { id: 'e', duracion: 1, inicioVoz: 0, words: [] }] }}
    calculateMetadata={({ props }) => ({ durationInFrames: duracionVenus(props.tramos) })}
  />
  </>
);
