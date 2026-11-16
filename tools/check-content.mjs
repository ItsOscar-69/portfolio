import path from 'node:path';
import { projects } from '../src/content/projects.js';
import { checkProjects } from '../plugins/chapters.js';

try {
  checkProjects(projects, path.resolve('public'));
  console.log(`Content OK: ${projects.length} projects.`);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
