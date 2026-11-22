// npm run check:history: run before every push. A push publishes every past commit, not just today's files. This
// reads privacy.local.json itself and prints only where a private word turned up, never the word.
import fs from 'node:fs';
import { scanHistory } from './lib/history-scan.mjs';

if (!fs.existsSync('privacy.local.json')) {
  console.error('privacy.local.json is missing; the history check needs its word list.');
  process.exit(1);
}
const { forbidden = [] } = JSON.parse(fs.readFileSync('privacy.local.json', 'utf8'));
if (!forbidden.length) {
  console.error('privacy.local.json lists no words.');
  process.exit(1);
}
const r = await scanHistory('.', forbidden);
console.log(`${r.commits} commits checked against ${forbidden.length} private words.`);
if (r.textHits.length) console.error(`A private word appears in ${r.textHits.length} file versions:\n  ${r.textHits.slice(0, 20).join('\n  ')}`);
if (r.messageHits) console.error(`${r.messageHits} private word(s) appear in commit messages or identities.`);
if (r.imageHits.length) console.error(`Images in history carry metadata:\n  ${r.imageHits.join('\n  ')}`);
if (r.textHits.length || r.messageHits || r.imageHits.length) process.exit(1);
console.log('History clean: no private words and no image metadata in any commit.');
