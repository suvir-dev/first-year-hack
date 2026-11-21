import { sleeveTitle } from '../../src/games/higher-lower/track-display.js';

export const MONTHS = Array.from({ length: 120 }, (_, index) =>
  `${2016 + Math.floor(index / 12)}${String(index % 12 + 1).padStart(2, '0')}0100`);

export function readMonthlyViews(response) {
  if (response.noData) return MONTHS.map(() => 0);
  if (!Array.isArray(response.items)) throw new Error('Unexpected Wikimedia pageviews response.');
  const counts = new Map();
  for (const item of response.items) {
    if (!MONTHS.includes(item.timestamp) || counts.has(item.timestamp) ||
        item.agent !== 'user' || item.access !== 'all-access' || item.granularity !== 'monthly' ||
        !Number.isSafeInteger(item.views) || item.views < 0) throw new Error('Invalid Wikimedia monthly view record.');
    counts.set(item.timestamp, item.views);
  }
  return MONTHS.map((month) => counts.get(month) ?? 0);
}
export const MINIMUM_VIEWS = 10000;
export const ITEMS_PER_KIND = 100;

export function sumLanguages(languages) {
  if (!languages.length) throw new Error('An item must have at least one Wikipedia language article.');
  const sites = new Set();
  let total = 0;
  for (const { site, title, monthly, noData } of languages) {
    if (!site || !title || sites.has(site)) throw new Error('Duplicate or invalid language article.');
    sites.add(site);
    if (monthly.length !== 120 || monthly.some((value) => !Number.isSafeInteger(value) || value < 0)) {
      throw new Error('Expected 120 monthly nonnegative safe-integer counts.');
    }
    if (noData && monthly.some((value) => value !== 0)) throw new Error('No-data article has nonzero views.');
    total += monthly.reduce((sum, value) => sum + value, 0);
  }
  if (!Number.isSafeInteger(total)) throw new Error('View total exceeds safe integer range.');
  return total;
}

// Sampling evenly through the sorted range preserves both the headliners and quieter works.
export function selectSpread(records, limit = ITEMS_PER_KIND) {
  const sorted = [...records].sort((a, b) => b.views - a.views || a.id.localeCompare(b.id, 'en'));
  if (sorted.length <= limit) return sorted;
  return Array.from({ length: limit }, (_, index) => sorted[Math.round(index * (sorted.length - 1) / (limit - 1))]);
}

export function buildWikiDeck(snapshot, images, overrides = { art: {}, music: {} }) {
  if (snapshot.period?.[0] !== '2016-01-01' || snapshot.period?.[1] !== '2025-12-31' ||
      snapshot.access !== 'all-access' || snapshot.agent !== 'user') throw new Error('Wrong Wikimedia period or filters.');
  const seen = new Set();
  const excluded = [];
  const eligible = [];
  for (const record of snapshot.records) {
    if (!['art', 'music'].includes(record.kind) || seen.has(record.id)) throw new Error('Invalid category or duplicate Wikidata ID.');
    seen.add(record.id);
    const total = sumLanguages(record.languages);
    if (record.views !== total) throw new Error('View total differs from its monthly source records: ' + record.id);
    const image = images.find(({ id }) => id === record.id);
    const display = { ...record, ...overrides[record.kind]?.[record.article] };
    if (display.exclude) {
      excluded.push({ id: record.id, title: record.title, reason: display.reason });
      continue;
    }
    if (total < MINIMUM_VIEWS || (record.kind === 'art' && !image) || !display.year) {
      excluded.push({ id: record.id, title: record.title, reason: total < MINIMUM_VIEWS ? 'Below minimum views' : !display.year ? 'No reviewed date' : 'No approved image' });
      continue;
    }
    const item = {
      id: record.id, kind: record.kind, title: record.kind === 'music' ? sleeveTitle(display.title) : display.title, artist: display.artist, year: display.year,
      dateLabel: display.dateLabel ?? (record.kind === 'art' ? 'Created' : 'Released'),
      views: total, languages: record.languages.length,
      articleUrl: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(record.article.replaceAll(' ', '_')),
    };
    if (record.kind === 'art') Object.assign(item, {
      image: image.path, credit: image.credit ?? ('Image · ' + image.license),
      creditUrl: image.source,
      ...(image.licenseUrl ? { licenseUrl: image.licenseUrl } : {}),
    });
    eligible.push(item);
  }
  const art = selectSpread(eligible.filter(({ kind }) => kind === 'art'));
  const music = selectSpread(eligible.filter(({ kind }) => kind === 'music'));
  if (art.length < ITEMS_PER_KIND || music.length < ITEMS_PER_KIND) {
    throw new Error(`Need ${ITEMS_PER_KIND} verified items per category. Found ${art.length} artworks and ${music.length} songs.`);
  }
  const deck = [...art, ...music];
  if (!art.some((a) => music.some((m) => m.views !== a.views))) throw new Error('Deck cannot produce a non-tied art/music comparison.');
  const selectedSources = snapshot.records.filter((record) => deck.some((item) => item.id === record.id));
  const selectedLanguages = selectedSources.flatMap(({ languages }) => languages);
  return {
    deck,
    report: {
      candidates: snapshot.records.length, eligibleArt: eligible.filter(({ kind }) => kind === 'art').length,
      eligibleMusic: eligible.filter(({ kind }) => kind === 'music').length, artworks: art.length, songs: music.length,
      languageArticles: selectedLanguages.length,
      wikipediaEditions: new Set(selectedLanguages.map(({ site }) => site)).size,
      noDataLanguageArticles: selectedLanguages.filter(({ noData }) => noData).length,
      artRange: [art.at(-1).views, art[0].views], musicRange: [music.at(-1).views, music[0].views],
      excluded, selected: deck.map(({ id }) => id),
    },
  };
}
