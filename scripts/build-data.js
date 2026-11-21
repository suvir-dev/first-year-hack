import { createHash } from 'node:crypto';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { cleanData } from './clean-data.js';

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));

async function buildData(path) {
  const bytes = await readFile(path);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const sources = await readJson('../data/sources.json');
  const source = sources[sha256];
  const { tracks, inputRows, eligibleRows, dropped } = cleanData(
    new TextDecoder('utf-8', { fatal: true }).decode(bytes), await readJson('../data/covers.json'),
  );
  const playable = source?.approved === true ? tracks : [];
  const destination = new URL('../src/deck.json', import.meta.url);
  const temp = new URL(`../src/deck.json.${process.pid}.tmp`, import.meta.url);
  await writeFile(temp, `${JSON.stringify(playable)}\n`);
  await rename(temp, destination);
  console.log(JSON.stringify({
    sha256, inputRows, eligibleRows, validatedCandidates: tracks.length,
    playableTracks: playable.length, verifiedCovers: playable.filter(({ cover }) => cover).length,
    sourceDecision: source?.reason ?? 'Unknown checksum. Review the source before approving it in data/sources.json.',
    dropped,
  }, null, 2));
}

const [path, ...extra] = process.argv.slice(2);
if (!path || extra.length) {
  console.error('Usage: npm run data:build -- <path-to-csv>');
  process.exitCode = 1;
} else {
  try {
    await buildData(path);
  } catch (error) {
    console.error(`Data build failed. ${error.message}`);
    process.exitCode = 1;
  }
}
