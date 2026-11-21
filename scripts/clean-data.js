import { parse } from 'csv-parse/sync';
import { trackKey } from '../src/game.js';

const REQUIRED = ['Song', 'Artist', 'Year', 'Streams'];
export const DECK_LIMIT = 120;
const SUSPICIOUS = new Map([
  [trackKey({ title: '43776', artist: 'Beyoncé' }), 'unresolved date-like title'],
  [trackKey({ title: '3', artist: 'Britney Spears' }), 'documented 2009 release'],
]);
const COUNT_FORMAT = /^(?:\d+|[1-9]\d{0,2}(?:,\d{3})+)$/u;

export function cleanData(csv, covers = {}, limit = DECK_LIMIT) {
  const records = parse(csv, {
    bom: true, skip_empty_lines: true, trim: true, relax_column_count: true,
  });
  const headers = records.shift() ?? [];
  const invalid = REQUIRED.filter((field) => headers.filter((name) => name === field).length !== 1);
  if (invalid.length) throw new Error(`Expected exactly one of each required header. Check: ${invalid.join(', ')}.`);

  const groups = new Map();
  const dropped = [];
  for (const [index, row] of records.entries()) {
    const record = index + 2;
    const reject = (reason) => dropped.push({ record, reason });
    if (row.length !== headers.length) {
      reject('column count mismatch');
      continue;
    }
    const fields = (name) => row[headers.indexOf(name)].trim();
    const title = fields('Song');
    const artist = fields('Artist');
    const yearText = fields('Year');
    const countText = fields('Streams');
    const year = Number(yearText);
    const streams = Number(countText.replaceAll(',', ''));
    const track = { title, artist, year, streams };
    const key = trackKey(track);
    if (!title || !artist) reject('missing title or artist');
    else if (!/^\d{4}$/u.test(yearText)) reject('invalid year');
    else if (!COUNT_FORMAT.test(countText) || !Number.isSafeInteger(streams) || streams <= 0) {
      reject('invalid stream count');
    } else if (SUSPICIOUS.has(key)) reject(SUSPICIOUS.get(key));
    else {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ track, record });
    }
  }

  const eligible = [];
  for (const [key, rows] of groups) {
    const { track, record } = rows[0];
    if (rows.some(({ track: other }) => other.year !== track.year || other.streams !== track.streams)) {
      for (const row of rows) dropped.push({ record: row.record, reason: 'conflicting duplicate' });
      continue;
    }
    if (track.year < 2010 || track.year > 2019) {
      for (const row of rows) dropped.push({ record: row.record, reason: 'outside 2010–2019' });
      continue;
    }
    for (const row of rows.slice(1)) {
      dropped.push({ record: row.record, reason: 'duplicate' });
    }
    const cover = Object.hasOwn(covers, key) ? covers[key] : undefined;
    if (cover) {
      track.cover = cover.path;
      if (cover.credit) track.credit = cover.credit;
      if (cover.creditUrl) track.creditUrl = cover.creditUrl;
    }
    eligible.push({ key, record, track });
  }

  eligible.sort((a, b) => b.track.streams - a.track.streams || (a.key < b.key ? -1 : 1));
  for (const { record } of eligible.slice(limit)) dropped.push({ record, reason: 'outside deck cutoff' });
  const selected = eligible.slice(0, limit);
  if (new Set(selected.map(({ track }) => track.streams)).size < 2) {
    throw new Error('The cleaned deck needs at least two distinct stream counts. Check the input and rejected rows.');
  }

  for (const { record, track } of selected) {
    const original = records[record - 2][headers.indexOf('Streams')].trim();
    if (BigInt(original.replaceAll(',', '')) !== BigInt(track.streams)) {
      throw new Error(`Stream count mismatch at CSV record ${record}.`);
    }
  }

  return {
    tracks: selected.map(({ track }) => track),
    inputRows: records.length,
    eligibleRows: eligible.length,
    dropped: dropped.sort((a, b) => a.record - b.record),
  };
}
