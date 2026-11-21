import assert from 'node:assert/strict';
import test from 'node:test';
import { selectSpread, sumLanguages, buildWikiDeck, MONTHS, readMonthlyViews } from '../scripts/wiki-data.js';

const language = (site, views) => ({ site, title: 'Article', monthly: [views, ...Array(119).fill(0)], noData: false });

test('totals every linked language, validates monthly rows and rejects duplicate languages', () => {
  assert.equal(sumLanguages([language('enwiki', 41), language('jawiki', 59)]), 100);
  assert.throws(() => sumLanguages([language('enwiki', 1), language('enwiki', 2)]), /Duplicate/u);
  assert.throws(() => sumLanguages([{ ...language('enwiki', 2), monthly: [2] }]), /120/u);
  assert.throws(() => sumLanguages([{ ...language('enwiki', 2), noData: true }]), /nonzero/u);
});

test('deterministic spread selection keeps both extremes and works for a small candidate set', () => {
  const rows = Array.from({ length: 200 }, (_, id) => ({ id: String(id), views: id }));
  const picked = selectSpread(rows);
  assert.equal(picked.length, 100);
  assert.equal(picked[0].views, 199);
  assert.equal(picked.at(-1).views, 0);
  assert.equal(new Set(picked.map(({ id }) => id)).size, 100);
  assert.deepEqual(picked, selectSpread([...rows].reverse()));
  assert.deepEqual(selectSpread(rows.slice(0, 2)), [rows[1], rows[0]]);
});

test('rejects wrong dates and source totals instead of exporting an inaccurate deck', () => {
  assert.throws(() => buildWikiDeck({ period: ['2015-01-01', '2025-12-31'] }, []), /period/u);
  assert.throws(() => buildWikiDeck({
    period: ['2016-01-01', '2025-12-31'], access: 'all-access', agent: 'user',
    records: [{ id: 'Q1', kind: 'music', views: 99, languages: [language('enwiki', 100)] }],
  }, []), /differs/u);
});


test('monthly extraction includes both boundary months and rejects outside dates and bot totals', () => {
  const item = { timestamp: '2016010100', views: 12, agent: 'user', access: 'all-access', granularity: 'monthly' };
  const counts = readMonthlyViews({ items: [item, { ...item, timestamp: '2025120100', views: 34 }] });
  assert.equal(MONTHS.length, 120);
  assert.equal(counts[0], 12);
  assert.equal(counts.at(-1), 34);
  assert.equal(counts[1], 0);
  assert.throws(() => readMonthlyViews({ items: [{ ...item, timestamp: '2026010100' }] }), /Invalid/u);
  assert.throws(() => readMonthlyViews({ items: [{ ...item, agent: 'all-agents' }] }), /Invalid/u);
  assert.throws(() => readMonthlyViews({ items: [item, item] }), /Invalid/u);
});

test('committed production deck reproduces from the multilingual snapshot and has both easy and close matchups', async () => {
  const { readFile } = await import('node:fs/promises');
  const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
  const [snapshot, images, overrides, deck] = await Promise.all([
    readJson('../data/wiki/views.json'), readJson('../data/wiki/images.json'),
    readJson('../data/wiki/display-overrides.json'), readJson('../src/deck.json'),
  ]);
  snapshot.records = (await Promise.all(snapshot.recordFiles.map((file) => readJson('../data/wiki/' + file)))).flat();
  assert.deepEqual(buildWikiDeck(snapshot, images, overrides).deck, deck);
  const art = deck.filter(({ kind }) => kind === 'art');
  const music = deck.filter(({ kind }) => kind === 'music');
  assert.equal(art.length, 100);
  assert.equal(music.length, 100);
  assert.equal(new Set(deck.map(({ id }) => id)).size, 200);
  assert.ok(deck.every((item) => !Object.hasOwn(item, 'streams')));
  assert.ok(art.some((a) => music.some((m) => Math.abs(Math.log(m.views / a.views)) < Math.log(1.15))));
  assert.ok(art.some((a) => music.some((m) => Math.abs(Math.log(m.views / a.views)) > Math.log(1.8))));
});
