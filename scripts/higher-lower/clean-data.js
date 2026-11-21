import { parse } from 'csv-parse/sync';
import { trackKey } from '../../src/games/higher-lower/game.js';

const REQUIRED_HEADERS = ['Song', 'Artist', 'Year'];

export function readSourceSongs(csv) {
  const rows = parse(csv, { bom: true, trim: true, skip_empty_lines: true });
  const headers = rows.shift() ?? [];
  const invalid = REQUIRED_HEADERS.filter((name) => headers.filter((header) => header === name).length !== 1);
  if (invalid.length) throw new Error('CSV requires exactly one of each header: ' + invalid.join(', '));
  const songs = new Map();
  const dropped = [];
  rows.forEach((row, index) => {
    if (row.length !== headers.length) throw new Error('CSV column count mismatch at record ' + (index + 2));
    const field = (name) => row[headers.indexOf(name)].trim();
    const song = { title: field('Song'), artist: field('Artist'), sourceYear: field('Year') };
    if (!song.title || !song.artist || !/^201[0-9]$/u.test(song.sourceYear)) {
      dropped.push({ record: index + 2, reason: 'Missing title/artist or source year outside 2010–2019' });
    } else if (!songs.has(trackKey(song))) songs.set(trackKey(song), song);
  });
  if (!songs.size) throw new Error('No songs from source years 2010–2019 were found.');
  return { songs: [...songs.values()], inputRows: rows.length, dropped };
}
