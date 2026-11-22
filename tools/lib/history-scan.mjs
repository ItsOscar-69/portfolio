// Scans everything a push publishes: every text file in every commit, every commit message and identity, and every
// image in full. Returns only commit:path locations and counts, never the words it found.
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const git = (cwd, args, opts = {}) => execFileSync('git', args, { cwd, maxBuffer: 256 << 20, ...opts });

export async function scanHistory(cwd, words) {
  const lower = words.map((w) => String(w).toLowerCase()).filter(Boolean);
  const revs = git(cwd, ['rev-list', '--all'], { encoding: 'utf8' }).split('\n').filter(Boolean);

  const textHits = new Set();
  for (let i = 0; lower.length && i < revs.length; i += 200) { // batches keep the command line short on Windows
    try {
      const out = git(cwd, ['grep', '-I', '-i', '-l', '-F', ...lower.flatMap((w) => ['-e', w]), ...revs.slice(i, i + 200)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      out.split('\n').filter(Boolean).forEach((line) => textHits.add(line)); // "<commit>:<path>"
    } catch (err) {
      if (err.status !== 1) throw err; // git grep exits 1 when nothing matches
    }
  }

  const log = git(cwd, ['log', '--all', '--format=%an%n%ae%n%cn%n%ce%n%B'], { encoding: 'utf8' }).toLowerCase();
  const messageHits = lower.filter((w) => log.includes(w)).length;

  const imageHits = [];
  const seen = new Set();
  for (const line of git(cwd, ['rev-list', '--objects', '--all'], { encoding: 'utf8' }).split('\n')) {
    const space = line.indexOf(' ');
    if (space < 0) continue;
    const sha = line.slice(0, space);
    const file = line.slice(space + 1);
    if (seen.has(sha) || !/\.(webp|png|jpe?g)$/i.test(file)) continue;
    seen.add(sha);
    const meta = await sharp(git(cwd, ['cat-file', 'blob', sha])).metadata();
    if (meta.exif || meta.xmp || meta.iptc) imageHits.push(`${sha.slice(0, 7)}:${file}`);
  }

  return { commits: revs.length, textHits: [...textHits], messageHits, imageHits };
}
