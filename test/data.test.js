import assert from 'node:assert/strict';
import test from 'node:test';
import { readSourceSongs } from '../scripts/clean-data.js';

test('CSV membership handles the real header shape, BOM, quotes, CRLF, numeric titles and duplicates', () => {
  const headers = 'Song,Artist,Genre,Year,Streams,In Spotify Playlists,On Spotify Charts,Billboard Rankings,In Apple Playlists,On Apple Charts,In Deezer Playlists,In Deezer Charts,In YouTube Playlists,On Shazam Charts,Bpm,Decibel,Mode,Energy,Danceability,Liveness,Valence,Duration,Acousticness,Speechiness,Popularity';
  const row = (title, artist, year) => `${title},${artist},Pop,${year},${Array(21).fill('unused').join(',')}`;
  const source = '\uFEFF' + [headers, '', row('"Stop, Go"', 'Béa', 2019), row('3', 'Numeric Artist', 2010),
    row('3', 'Numeric Artist', 2011), row('', 'Artist', 2015), row('Old', 'Artist', 2009)].join('\r\n');
  const result = readSourceSongs(source);
  assert.deepEqual(result.songs, [
    { title: 'Stop, Go', artist: 'Béa', sourceYear: '2019' },
    { title: '3', artist: 'Numeric Artist', sourceYear: '2010' },
  ]);
  assert.equal(result.inputRows, 5);
  assert.equal(result.dropped.length, 2);
  assert.deepEqual(result, readSourceSongs(source));
});

test('missing required CSV columns and unusable input fail with actionable errors', () => {
  assert.throws(() => readSourceSongs('Song,Year\nA,2015'), /Artist/u);
  assert.throws(() => readSourceSongs('Song,Artist,Year\nA,B,2000'), /No songs/u);
});
