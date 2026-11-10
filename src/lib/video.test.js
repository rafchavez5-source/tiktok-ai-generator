import { describe, expect, it } from 'vitest';
import { sceneAt, videoLength, wrapText } from './video.js';

const scenes = [
  { id: 'a', type: 'hook', duration: 3 },
  { id: 'b', type: 'fact', duration: 0 },
  { id: 'c', type: 'fact', duration: 5 },
  { id: 'd', type: 'outro', duration: '' },
];

describe('video', () => {
  it('ignora escenas sin duración', () => {
    expect(videoLength(scenes)).toBe(8);
  });

  it('encuentra la escena de cada momento', () => {
    expect(sceneAt(scenes, 0).scene.id).toBe('a');
    expect(sceneAt(scenes, 2.9).scene.id).toBe('a');
    expect(sceneAt(scenes, 3).scene.id).toBe('c');
    expect(sceneAt(scenes, 3.5)).toMatchObject({ index: 1, count: 2, local: 0.5 });
    expect(sceneAt([], 1)).toBeNull();
  });

  it('parte el texto en líneas', () => {
    const measure = (s) => s.length;
    expect(wrapText('uno dos tres cuatro', 7, measure)).toEqual(['uno dos', 'tres', 'cuatro']);
    expect(wrapText('palabramuylarga x', 5, measure)).toEqual(['palabramuylarga', 'x']);
    expect(wrapText('   ', 5, measure)).toEqual([]);
  });
});
