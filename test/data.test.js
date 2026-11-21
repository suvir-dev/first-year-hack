import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanData } from '../scripts/clean-data.js';
import { trackKey } from '../src/game.js';

const headers = 'Song,Artist,Genre,Year,Streams,In Spotify Playlists,On Spotify Charts,Billboard Rankings,In Apple Playlists,On Apple Charts,In Deezer Playlists,In Deezer Charts,In YouTube Playlists,On Shazam Charts,Bpm,Decibel,Mode,Energy,Danceability,Liveness,Valence,Duration,Acousticness,Speechiness,Popularity';
const row = (title, artist, year, streams) =>
  `${title},${artist},Pop,${year},${streams},${Array(19).fill('99').join(',')},100`;
const csv = (...rows) => ['\uFEFF' + headers, '', ...rows].join('\r\n');

test('real header shape, BOM, CRLF, quoting, blank rows and exact stream values', () => {
  const source = csv(
    row('"  Stop, Go  "', '  Béa  ', 2019, '"9,007,199,254,740,991"'),
    row('22', 'Taylor Swift', 2010, '001200'),
    row('22 - Remix', 'Taylor Swift', 2010, '999'),
  );
  const coverKey = trackKey({ title: 'Stop, Go', artist: 'Béa' });
  const options = { [coverKey]: { path: '/covers/test.webp', credit: 'Test credit' } };
  const { tracks, inputRows, dropped } = cleanData(source, options);
  assert.equal(inputRows, 3);
  assert.deepEqual(dropped, []);
  assert.deepEqual(tracks, [
    { title: 'Stop, Go', artist: 'Béa', year: 2019, streams: Number.MAX_SAFE_INTEGER, cover: '/covers/test.webp', credit: 'Test credit' },
    { title: '22', artist: 'Taylor Swift', year: 2010, streams: 1200 },
    { title: '22 - Remix', artist: 'Taylor Swift', year: 2010, streams: 999 },
  ]);
  assert.deepEqual(cleanData(source, options).tracks, tracks);
});

test('malformed values, grouping, out-of-range years and ambiguous rows have reasons', () => {
  const { tracks, dropped } = cleanData(csv(
    row('First', 'Artist', 2012, 100),
    row(' first ', ' ARTIST ', 2012, 100),
    row('Second', 'Artist', 2019, 200),
    row('Conflict count', 'Artist', 2012, 300),
    row('Conflict count', 'Artist', 2012, 400),
    row('Conflict year', 'Artist', 2010, 500),
    row('Conflict year', 'Artist', 2020, 500),
    row('', 'Artist', 2012, 500),
    row('Title', '', 2012, 500),
    row('Old', 'Artist', 2009, 500),
    row('New', 'Artist', 2020, 500),
    row('Invalid year', 'Artist', '20xx', 500),
    ...['"12,34"', '0', '-1', '1.2', '9007199254740992', '3e3'].map((value, i) =>
      row(`Invalid ${i}`, 'Artist', 2012, value)),
    row('43776', 'Beyoncé', 2015, 500),
    'short,row',
  ));
  assert.deepEqual(tracks.map(({ title }) => title), ['Second', 'First']);
  assert.deepEqual(dropped.map(({ reason }) => reason), [
    'duplicate', ...Array(4).fill('conflicting duplicate'), 'missing title or artist',
    'missing title or artist', 'outside 2010–2019', 'outside 2010–2019', 'invalid year',
    ...Array(6).fill('invalid stream count'), 'unresolved date-like title', 'column count mismatch',
  ]);
});

test('sort and cut deterministically and reject unusable input', () => {
  const source = csv(row('A', 'A', 2017, 400), row('B', 'A', 2018, 500), row('C', 'A', 2019, 400));
  assert.deepEqual(cleanData(source, {}, 2).tracks.map(({ title }) => title), ['B', 'A']);
  assert.throws(() => cleanData('Song,Artist,Year,Popularity\na,b,2011,92'), /Streams/u);
  assert.throws(() => cleanData(csv(row('A', 'B', 2012, 100), row('B', 'B', 2012, 100))), /distinct stream counts/u);
});
