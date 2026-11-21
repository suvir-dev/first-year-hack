import { readFile, writeFile, mkdir, readdir, unlink, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readSourceSongs } from './clean-data.js';
import { trackKey } from '../../src/games/higher-lower/game.js';
import { buildWikiDeck } from './wiki-data.js';

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const [csvPath = 'Spotify Dataset.csv'] = process.argv.slice(2);
const snapshot = await readJson('data/wiki/views.json');
snapshot.records = (await Promise.all(snapshot.recordFiles.map((file) => readJson('data/wiki/' + file)))).flat();
const metadata = await readJson('data/wiki/metadata.json');
const images = await readJson('data/wiki/images.json');
const overrides = await readJson('data/wiki/display-overrides.json');
const candidates = await readJson('data/wiki/music-candidates.json');
const bytes = await readFile(csvPath);
const checksum = createHash('sha256').update(bytes).digest('hex');
if (checksum !== snapshot.csvSha256) throw new Error('CSV checksum differs from the collected source. Recollect metadata.');
const csv = readSourceSongs(bytes);
const membership = new Set(csv.songs.map(trackKey));
for (const candidate of candidates) {
  if (!membership.has(trackKey(candidate))) throw new Error('Song not in the source CSV: ' + candidate.title);
}
for (const record of snapshot.records.filter(({ kind }) => kind === 'music')) {
  const source = metadata.records.find(({ id }) => id === record.id);
  if (!source || !membership.has(trackKey({ title: source.sourceTitle, artist: source.sourceArtist }))) {
    throw new Error('Snapshot song is not linked to a verified CSV row: ' + record.id);
  }
}
const { deck, report } = buildWikiDeck(snapshot, images, overrides);
await mkdir('public/art', { recursive: true });
for (const item of deck.filter(({ kind }) => kind === 'art')) {
  const image = images.find(({ id }) => id === item.id);
  let bytes;
  try { bytes = await readFile('.cache/art/' + item.image.split('/').at(-1)); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    bytes = await readFile('public' + item.image);
  }
  if (createHash('sha256').update(bytes).digest('hex') !== image.sha256) throw new Error('Image checksum mismatch: ' + item.id);
  await writeFile('public' + item.image, bytes);
}
await writeFile('src/games/higher-lower/deck.json.tmp', JSON.stringify(deck) + '\n');
await rename('src/games/higher-lower/deck.json.tmp', 'src/games/higher-lower/deck.json');
const selectedAssets = new Set(deck.filter(({ kind }) => kind === 'art').map(({ image }) => image.split('/').at(-1)));
const knownAssets = new Set(images.map(({ path }) => path.split('/').at(-1)));
for (const file of await readdir('public/art')) {
  if (knownAssets.has(file) && !selectedAssets.has(file)) await unlink('public/art/' + file);
}
await writeFile('data/wiki/report.json', JSON.stringify({
  ...report, sourceCsvRows: csv.inputRows, csvSha256: checksum, metadataRetrieved: metadata.retrieved,
  viewsRetrieved: snapshot.viewRetrieved, metric: 'Wikipedia article views', dates: snapshot.period,
  source: 'Wikimedia Analytics API', access: snapshot.access, agent: snapshot.agent,
  metadataExcluded: metadata.excluded,
}, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
