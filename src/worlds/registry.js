// name -> lazy loader. Every file in this folder (except this one and names.js) is a world named after the file.
// Helpers that are not worlds live in src/worlds/lib/.
const files = import.meta.glob(['./*.js', '!./registry.js', '!./names.js']);

export const worldLoaders = Object.fromEntries(
  Object.entries(files).map(([file, load]) => [file.slice(2, -3), load]),
);
