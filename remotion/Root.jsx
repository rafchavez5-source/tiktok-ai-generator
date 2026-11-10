import { Composition } from 'remotion';
import { DatoCurioso, duracionTotal, FPS } from './DatoCurioso.jsx';

const ejemplo = {
  titulo: 'Ejemplo',
  scenes: [
    { id: 'a', type: 'hook', title: 'Ejemplo de video', text: '¿Sabías esto?', words: [], duration: 3, audio: null, image: null, credit: '' },
  ],
};

export const Root = () => (
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
);
