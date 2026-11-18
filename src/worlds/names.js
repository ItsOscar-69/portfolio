// Every world a project (or the hero / next slot) may use. Each name has a file in src/worlds/<name>.js.
export const WORLD_NAMES = ['index', 'picture', 'dormant', 'halcyon', 'layers', 'pico', 'ascii'];

// Files each world needs in worldOptions, relative to public/projects/<id>/.
// 'one' = a single file name, 'list' = a non-empty list of file names.
export const WORLD_ASSETS = {
  picture: { cover: 'one' },
  halcyon: { svg: 'one', panels: 'list' },
  layers: { manifest: 'one' },
  ascii: { model: 'one' },
};
