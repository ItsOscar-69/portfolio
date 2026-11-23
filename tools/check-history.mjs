// npm run check:history: run before every push. A push publishes every past commit, not just today's files. This
// reads privacy.local.json itself and prints only where a private word turned up, never the word. Any failure prints
// one fixed message, because an error message could quote the word list.
import fs from 'node:fs';
import { scanHistory } from './lib/history-scan.mjs';

const fail = (message) => { console.error(message); process.exit(1); };

let forbidden;
let r;
try {
  if (!fs.existsSync('privacy.local.json')) fail('privacy.local.json is missing; the history check needs its word list.');
  forbidden = JSON.parse(fs.readFileSync('privacy.local.json', 'utf8')).forbidden;
  if (!Array.isArray(forbidden) || !forbidden.some((w) => typeof w === 'string' && w.trim())) {
    fail('privacy.local.json needs a "forbidden" list with at least one word.');
  }
  r = await scanHistory('.', forbidden);
} catch {
  fail('The history check failed; nothing was printed from the word list.');
}
const count = new Set(forbidden.filter((w) => typeof w === 'string' && w.trim()).map((w) => w.trim().toLowerCase())).size;
console.log(`${r.commits} commits checked against ${count} private words.`);
if (r.textHits.length) console.error(`A private word appears in ${r.textHits.length} file versions or path names:\n  ${r.textHits.slice(0, 20).join('\n  ')}`);
if (r.messageHits) console.error(`${r.messageHits} private word(s) appear in commit messages, identities, branch or tag names, or tag notes.`);
if (r.imageHits.length) console.error(`Images in history carry metadata:\n  ${r.imageHits.join('\n  ')}`);
if (r.textHits.length || r.messageHits || r.imageHits.length) process.exit(1);
console.log('History clean: no private words and no image metadata in any commit.');
