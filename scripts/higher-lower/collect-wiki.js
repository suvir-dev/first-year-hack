import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readMonthlyViews } from './wiki-data.js';
import { readSourceSongs } from './clean-data.js';
import { apiUrl, getJson, mapLimit, saveJson, USER_AGENT } from './wiki-client.js';
import { trackKey } from '../../src/games/higher-lower/game.js';
import { displayTrack } from '../../src/games/higher-lower/track-display.js';

const root = new URL('../../', import.meta.url);
process.chdir(fileURLToPath(root));
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const claim = (entity, property) => (entity.claims[property] ?? [])
  .filter(({ rank, mainsnak }) => rank !== 'deprecated' && mainsnak.snaktype === 'value')
  .map(({ mainsnak }) => mainsnak.datavalue.value);
const plainText = (html) => html.replace(/<[^>]*>/gu, '').replace(/&#(\d+);/gu, (_, n) => String.fromCodePoint(Number(n)))
  .replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&nbsp;', ' ').replace(/\s+/gu, ' ').trim();
const SKIP_MUSIC = new Set([
  'Higher Love', 'Trampoline (with ZAYN)', 'Good as Hell (feat. Ariana Grande) - Remix',
  'Perfect Duet (Ed Sheeran & Beyoncé)', 'Finesse - Remix; feat. Cardi B',
  'All Around The World (La La La)',
]);
const excluded = [];
const candidates = [];
const [csvPath = 'Spotify Dataset.csv', phase = 'metadata'] = process.argv.slice(2);
const csvBytes = await readFile(csvPath);
const { songs } = readSourceSongs(csvBytes);
const membership = new Set(songs.map(trackKey));
const music = await readJson('data/wiki/music-candidates.json');
for (const item of music) {
  if (!membership.has(trackKey(item))) throw new Error('Song is outside the supplied CSV: ' + item.title);
  if (SKIP_MUSIC.has(item.title)) {
    excluded.push({ title: item.title, reason: 'Edition has no separately verified dedicated Wikipedia article' });
    continue;
  }
  candidates.push({ ...item, kind: 'music' });
}
const skipArt = new Set([
  'The Persistence of Memory', 'Guernica (Picasso)', 'The Son of Man', 'Nighthawks (painting)',
  "Christina's World", 'The Little Mermaid (statue)', 'Nataraja', 'Great Buddha of Kamakura',
  'A Thousand Li of Rivers and Mountains', 'The Course of Empire (paintings)',
  'The Lady of Shalott (painting)', 'Almond Blossoms', 'The Great Wave off Kanagawa',
  'Vitruvian Man', 'Young Hare', 'Terracotta Army',
]);
for (const article of await readJson('data/wiki/art-candidates.json')) {
  if (skipArt.has(article)) excluded.push({ title: article, reason: 'Series, broader topic, print/drawing, or artwork rights/edition not cleared for this deck' });
  else candidates.push({ article, kind: 'art' });
}

if (phase === 'metadata') {
  const titles = candidates.map(({ article }) => article);
  const pages = [];
  for (let offset = 0; offset < titles.length; offset += 40) {
    const result = await getJson(apiUrl('en.wikipedia.org', {
      action: 'query', titles: titles.slice(offset, offset + 40).join('|'), redirects: '1', prop: 'pageprops',
    }));
    const normalized = new Map([...(result.query.normalized ?? []), ...(result.query.redirects ?? [])].map(({ from, to }) => [from, to]));
    for (const original of titles.slice(offset, offset + 40)) {
      let title = original;
      const visited = new Set();
      while (normalized.has(title) && !visited.has(title)) { visited.add(title); title = normalized.get(title); }
      const page = Object.values(result.query.pages).find((page) => page.title === title);
      if (!page?.pageprops?.wikibase_item || Object.hasOwn(page.pageprops, 'disambiguation')) {
        excluded.push({ title: original, reason: 'Missing dedicated article or disambiguation' });
      } else pages.push({ ...candidates.find(({ article }) => article === original), article: title, id: page.pageprops.wikibase_item });
    }
  }
  const entities = {};
  const ids = [...new Set(pages.map(({ id }) => id))];
  for (let offset = 0; offset < ids.length; offset += 30) {
    const result = await getJson(apiUrl('www.wikidata.org', {
      action: 'wbgetentities', ids: ids.slice(offset, offset + 30).join('|'),
      props: 'claims|labels|descriptions|sitelinks/urls', languages: 'en',
    }));
    Object.assign(entities, result.entities);
  }
  const relatedIds = [...new Set(Object.values(entities).flatMap((entity) =>
    [...claim(entity, 'P170'), ...claim(entity, 'P175')].map(({ id }) => id)))];
  const names = {};
  for (let offset = 0; offset < relatedIds.length; offset += 50) {
    const result = await getJson(apiUrl('www.wikidata.org', {
      action: 'wbgetentities', ids: relatedIds.slice(offset, offset + 50).join('|'), props: 'labels', languages: 'en',
    }));
    for (const entity of Object.values(result.entities)) names[entity.id] = entity.labels?.en?.value;
  }
  const records = [];
  for (const item of pages) {
    if (records.some(({ id }) => id === item.id)) {
      excluded.push({ title: item.article, id: item.id, reason: 'Duplicate Wikidata work' });
      continue;
    }
    const entity = entities[item.id];
    const dates = claim(entity, item.kind === 'music' ? 'P577' : 'P571')
      .map(({ time }) => time).filter(Boolean).sort();
    const year = dates[0]?.match(/^[+](-?\d+)-/)?.[1]?.replace(/^0+(?=\d)/, '');
    const title = item.kind === 'music' ? displayTrack(item).title : item.article.replace(/ \([^()]+\)$/u, '');
    const artist = item.kind === 'music' ? displayTrack(item).artist :
      claim(entity, 'P170').map(({ id }) => names[id]).filter(Boolean).join(', ');
    const languages = Object.entries(entity.sitelinks)
      .filter(([site]) => site.endsWith('wiki') && !['commonswiki', 'specieswiki', 'wikidatawiki', 'metawiki', 'mediawikiwiki', 'incubatorwiki', 'foundationwiki'].includes(site))
      .map(([site, link]) => ({ site, title: link.title, url: link.url }));
    records.push({
      ...item, ...(item.kind === 'music' ? { sourceTitle: item.title, sourceArtist: item.artist } : {}),
      title, artist: artist || 'Unknown artist', year: year ?? '', description: entity.descriptions?.en?.value,
      imageFile: claim(entity, 'P18')[0], dates, wikidataRevision: entity.lastrevid, languages,
    });
  }
  await saveJson('data/wiki/metadata.json', { csvSha256: createHash('sha256').update(csvBytes).digest('hex'), retrieved: new Date().toISOString(), excluded, records });
  console.log(`Resolved ${records.filter(({ kind }) => kind === 'music').length} songs and ${records.filter(({ kind }) => kind === 'art').length} artworks. Metadata saved.`);
} else if (phase === 'views') {
  const metadata = await readJson('data/wiki/metadata.json');
  const matrix = await getJson(apiUrl('en.wikipedia.org', { action: 'sitematrix' }));
  const projects = new Set(Object.values(matrix.sitematrix).filter((value) => value && typeof value === 'object' && !Array.isArray(value))
    .flatMap(({ site = [] }) => site.filter(({ code }) => code === 'wiki').map(({ dbname }) => dbname)));
  let completed = 0;
  let articles = 0;
  const records = await mapLimit(metadata.records, 20, async (item) => {
    const languages = await mapLimit(item.languages.filter(({ site }) => projects.has(site)), 3, async ({ site, title, url }) => {
      const project = new URL(url).hostname.replace('.org', '');
      const endpoint = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${project}/all-access/user/${encodeURIComponent(title.replaceAll(' ', '_'))}/monthly/2016010100/2025123100`;
      const response = await getJson(endpoint);
      const monthly = readMonthlyViews(response);
      articles++;
      return { site, title, monthly, noData: Boolean(response.noData) };
    });
    const views = languages.reduce((total, { monthly }) => total + monthly.reduce((sum, n) => sum + n, 0), 0);
    completed++;
    console.log(`[${completed}/${metadata.records.length}] ${item.id} ${item.title}: ${views.toLocaleString('en-US')} views across ${languages.length} languages (${articles} articles fetched)`);
    return { ...item, languages, views };
  });
  const recordFiles = [];
  for (let offset = 0; offset < records.length; offset += 50) {
    const file = `views-${offset / 50 + 1}.json`;
    await saveJson('data/wiki/' + file, records.slice(offset, offset + 50));
    recordFiles.push(file);
  }
  const snapshotMetadata = { ...metadata };
  delete snapshotMetadata.records;
  await saveJson('data/wiki/views.json', { ...snapshotMetadata, viewRetrieved: new Date().toISOString(), period: ['2016-01-01', '2025-12-31'], access: 'all-access', agent: 'user', recordFiles });
} else if (phase === 'images') {
  const metadata = await readJson('data/wiki/metadata.json');
  await mkdir('.cache/art', { recursive: true });
  const approved = [];
  let prior = [];
  try { prior = await readJson('data/wiki/images.json'); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  for (const item of metadata.records.filter(({ kind }) => kind === 'art')) {
    if (!item.imageFile) { console.log('No image: ' + item.title); continue; }
    const response = await getJson(apiUrl('commons.wikimedia.org', {
      action: 'query', titles: 'File:' + item.imageFile, prop: 'imageinfo',
      iiprop: 'url|extmetadata', iiurlwidth: '640',
    }));
    const info = Object.values(response.query.pages)[0].imageinfo?.[0];
    const license = info?.extmetadata?.LicenseShortName?.value ?? '';
    if (!/^(?:public domain|cc0|cc-by(?:-sa)?(?:-[\d.]+)?|CC BY(?:-SA)?[\s\d.]*)$/i.test(license.trim())) {
      console.log('Uncleared image: ' + item.title + ' ' + license);
      continue;
    }
    const imageUrl = info.thumburl ?? info.url;
    const cached = prior.find((record) => record.id === item.id && record.imageUrl === imageUrl);
    if (cached) {
      let bytes;
      try { bytes = await readFile('.cache/art/' + cached.path.split('/').at(-1)); } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        try { bytes = await readFile('public' + cached.path); } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }
      }
      if (bytes) {
        if (createHash('sha256').update(bytes).digest('hex') !== cached.sha256) throw new Error('Artwork checksum mismatch: ' + cached.path);
        approved.push({ ...cached, credit: plainText(info.extmetadata.Artist?.value ?? '') + ' · ' + license });
        continue;
      }
    }
    const image = await fetch(imageUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(60000) });
    if (!image.ok) throw new Error('Artwork download failed ' + image.status + ' ' + imageUrl);
    const ext = image.headers.get('content-type')?.includes('png') ? 'png' : 'jpg';
    const bytes = Buffer.from(await image.arrayBuffer());
    const path = `/art/${item.id}.${ext}`;
    if (!['image/jpeg', 'image/png'].some((type) => image.headers.get('content-type')?.includes(type))) {
      console.log('Unsupported image type: ' + item.title);
      continue;
    }
    await writeFile('.cache/art/' + path.split('/').at(-1), bytes);
    approved.push({
      id: item.id, path, source: info.descriptionurl, imageUrl, license,
      licenseUrl: info.extmetadata.LicenseUrl?.value,
      credit: plainText(info.extmetadata.Artist?.value ?? '') + ' · ' + license,
      artistHtml: info.extmetadata.Artist?.value ?? '',
      creditHtml: info.extmetadata.Credit?.value ?? '',
      attributionRequired: info.extmetadata.AttributionRequired?.value,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
    console.log('Downloaded ' + item.title + ' — ' + license);
  }
  await saveJson('data/wiki/images.json', approved);
} else throw new Error('Expected phase metadata, views, or images');
