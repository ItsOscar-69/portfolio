// Scans everything a push publishes: every blob (text and binary) in every commit, every commit message and identity,
// every ref name and tag, every path name, and every image in full. Returns only commit:path locations and counts,
// never the words it found. The words never go into a command line, so no git error message can quote them, and every
// failure here throws a fixed message.
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const git = (cwd, args, opts = {}) => execFileSync('git', args, { cwd, maxBuffer: 1 << 30, stdio: ['pipe', 'pipe', 'ignore'], ...opts });
const IMAGE = /\.(webp|png|jpe?g)$/i;

export async function scanHistory(cwd, words) {
  if (!Array.isArray(words)) throw new Error('The word list must be an array.');
  const lower = [...new Set(words.filter((w) => typeof w === 'string').map((w) => w.trim().toLowerCase()).filter(Boolean))];
  if (!lower.length) throw new Error('The word list has no usable words.');
  // Byte forms to look for in a blob: UTF-8 (covers ASCII) and UTF-16, both viewed as latin1 so any blob can be searched.
  const forms = lower.flatMap((w) => [Buffer.from(w, 'utf8'), Buffer.from(w, 'utf16le')].map((b) => b.toString('latin1').toLowerCase()));
  const hasWord = (text) => { const t = text.toLowerCase(); return lower.some((w) => t.includes(w)); };
  const redact = (p) => p.split('/').map((seg) => (hasWord(seg) ? '[redacted]' : seg)).join('/');

  try {
    if (git(cwd, ['rev-parse', '--is-shallow-repository'], { encoding: 'utf8' }).trim() === 'true') throw new Error('shallow');
    const revs = git(cwd, ['rev-list', '--all'], { encoding: 'utf8' }).split('\n').filter(Boolean);
    if (!revs.length) throw new Error('empty');

    // Commit messages and identities, plus ref names and tag contents.
    const log = git(cwd, ['log', '--all', '--format=%an%n%ae%n%cn%n%ce%n%B'], { encoding: 'utf8' });
    const refs = git(cwd, ['for-each-ref', '--format=%(refname)%0a%(taggername)%0a%(taggeremail)%0a%(authorname)%0a%(authoremail)%0a%(committername)%0a%(committeremail)%0a%(contents)'], { encoding: 'utf8' });
    const text = `${log}\n${refs}`.toLowerCase();
    const messageHits = lower.filter((w) => text.includes(w)).length;

    const hits = new Set();

    // Path names in every commit.
    const seenPaths = new Set();
    for (const rev of revs) {
      for (const p of git(cwd, ['ls-tree', '-r', '-z', '--name-only', rev], { encoding: 'utf8' }).split('\0')) {
        if (!p || seenPaths.has(p)) continue;
        seenPaths.add(p);
        if (hasWord(p)) hits.add(`${rev}:${redact(p)}`);
      }
    }

    // Every unique object, text or binary, read in batches.
    const blobs = new Map(); // sha -> path
    for (const line of git(cwd, ['rev-list', '--objects', '--all'], { encoding: 'utf8' }).split('\n')) {
      const space = line.indexOf(' ');
      if (space > 0 && !blobs.has(line.slice(0, space))) blobs.set(line.slice(0, space), line.slice(space + 1));
    }
    const imageHits = [];
    const shas = [...blobs.keys()];
    for (let i = 0; i < shas.length; i += 300) {
      const chunk = shas.slice(i, i + 300);
      const out = git(cwd, ['cat-file', '--batch'], { input: `${chunk.join('\n')}\n` });
      let pos = 0;
      while (pos < out.length) {
        const eol = out.indexOf(0x0a, pos);
        const [sha, type, size] = out.toString('latin1', pos, eol).split(' ');
        if (type === 'missing') throw new Error('missing');
        const start = eol + 1;
        const end = start + Number(size);
        pos = end + 1;
        if (type !== 'blob') continue;
        const body = out.subarray(start, end);
        const file = blobs.get(sha);
        const content = body.toString('latin1').toLowerCase();
        if (forms.some((f) => content.includes(f))) hits.add(`${commitFor(cwd, sha)}:${redact(file)}`);
        if (IMAGE.test(file)) {
          const meta = await sharp(Buffer.from(body)).metadata();
          if (meta.exif || meta.xmp || meta.iptc) imageHits.push(`${sha.slice(0, 7)}:${redact(file)}`);
        }
      }
    }

    return { commits: revs.length, textHits: [...hits], messageHits, imageHits };
  } catch {
    throw new Error('The history scan failed; nothing from the word list was printed.');
  }
}

// The commit that introduced a blob, so a hit reads "<commit>:<path>".
function commitFor(cwd, sha) {
  const out = git(cwd, ['log', '--all', '--format=%H', `--find-object=${sha}`], { encoding: 'utf8' }).split('\n').filter(Boolean);
  return out.length ? out[out.length - 1] : sha;
}
