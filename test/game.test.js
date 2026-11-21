import assert from 'node:assert/strict';
import test from 'node:test';
import { selectChallenger, startGame, trackKey, transition } from '../src/game.js';

const track = (title, views, kind = 'music') => ({ id: title, title, artist: 'Test Artist', year: '2015', views, kind });
const deck = [track('A', 100, 'art'), track('B', 200), track('C', 150, 'art'), track('D', 120), track('E', 110, 'art')];
const zero = () => 0;
const guess = (state, direction) =>
  transition(state, { type: 'guess', round: state.round, direction }, deck);
const next = (state) => transition(state, { type: 'next', round: state.round, random: 0 }, deck);
const actual = ({ left, right }) => right.views > left.views ? 'higher' : 'lower';
const wrong = (state) => actual(state) === 'higher' ? 'lower' : 'higher';

test('higher and lower score correctly and promote the challenger after a correct or wrong guess', () => {
  const opening = startGame(deck, zero);
  assert.equal(actual(opening), 'higher');
  const correct = guess(opening, 'higher');
  assert.deepEqual([correct.score, correct.lives, correct.difficulty], [1, 3, 1]);
  const second = next(correct);
  assert.equal(second.left, opening.right);
  assert.equal(actual(second), 'lower');
  assert.equal(guess(second, 'lower').score, 2);
  const miss = guess(second, 'higher');
  assert.deepEqual([miss.score, miss.lives, miss.difficulty], [1, 2, 0]);
  const third = next(miss);
  assert.equal(third.left, second.right);
  assert.equal(third.phase, 'guess');
  assert.equal(third.result, null);
});

test('invalid, duplicate, premature and stale actions leave state intact', () => {
  const opening = startGame(deck, zero);
  assert.equal(next(opening), opening);
  assert.equal(guess(opening, 'invalid'), opening);
  assert.equal(transition(opening, { type: 'restart', draws: [0, 0] }, deck), opening);
  const revealed = guess(opening, actual(opening));
  assert.equal(guess(revealed, wrong(opening)), revealed);
  const advanced = next(revealed);
  assert.equal(transition(advanced, { type: 'guess', round: opening.round, direction: 'higher' }, deck), advanced);
  assert.equal(next(advanced), advanced);
});

test('third miss ends the run and restart resets state and avoids the previous pair', () => {
  const opening = startGame(deck, zero);
  let state = opening;
  for (const lives of [2, 1, 0]) {
    state = guess(state, wrong(state));
    assert.equal(state.lives, lives);
    if (lives) {
      assert.equal(state.phase, 'reveal');
      state = next(state);
    }
  }
  assert.equal(state.phase, 'over');
  assert.equal(state.result.correct, false);
  assert.equal(next(state), state);
  assert.equal(guess(state, wrong(state)), state);
  assert.equal(transition(state, { type: 'restart', draws: [0, 0] }, deck), state);
  const results = transition(state, { type: 'show-results', round: state.round }, deck);
  assert.equal(results.phase, 'results');
  assert.equal(results.score, state.score);
  assert.equal(transition(results, { type: 'show-results', round: state.round }, deck), results);
  const fresh = transition(results, { type: 'restart', draws: [0, 0] }, deck);
  assert.deepEqual([fresh.phase, fresh.score, fresh.lives, fresh.difficulty, fresh.round, fresh.result], ['guess', 0, 3, 0, 1, null]);
  assert.notDeepEqual([...fresh.opening].sort(), [...opening.opening].sort());
  assert.deepEqual([...fresh.seen], fresh.opening);
});

test('relative gaps get smaller by band and misses ease the requested band', () => {
  assert.deepEqual([0, 1, 2, 3].map((level) =>
    selectChallenger([deck[0], track('Wide', 200), track('Medium', 150), track('Close', 120), track('Very close', 110)], deck[0], level, new Set(), zero).views), [200, 150, 120, 110]);
  let state = startGame(deck, zero);
  for (const level of [1, 2, 3, 3]) {
    state = guess(state, actual(state));
    assert.equal(state.difficulty, level);
    state = next(state);
  }
  assert.equal(guess(state, wrong(state)).difficulty, 2);
});

test('selection excludes ties, prefers unseen and falls back with a limited deck', () => {
  const [anchor, wide] = deck;
  const close = track('Close', 150);
  const tie = track('Tie', anchor.views);
  const limited = [anchor, wide, close, tie];
  assert.equal(selectChallenger(limited, anchor, 0, new Set([trackKey(wide)]), zero), close);
  assert.equal(selectChallenger(limited, anchor, 0, new Set([trackKey(wide), trackKey(close)]), zero), wide);
  assert.equal(selectChallenger(limited, anchor, 3, new Set(), zero), close);
  assert.equal(startGame([anchor, tie], zero).phase, 'unavailable');
  assert.equal(startGame([], zero).phase, 'unavailable');
  const opening = startGame([anchor, wide], zero);
  const restart = startGame([anchor, wide], zero, opening.opening);
  assert.deepEqual(restart.opening, opening.opening);
});

test('four consecutive correct guesses mend one heart, capped at three lives', () => {
  let state = startGame(deck, zero);
  for (let index = 0; index < 4; index++) {
    state = guess(state, actual(state));
    assert.equal(state.result.restored, false);
    assert.equal(state.lives, 3);
    state = next(state);
  }

  state = next(guess(state, wrong(state)));
  assert.equal(state.streak, 0);
  for (let index = 0; index < 4; index++) {
    state = guess(state, actual(state));
    assert.equal(state.result.restored, index === 3);
    assert.equal(state.lives, index === 3 ? 3 : 2);
    state = next(state);
  }
  assert.equal(state.streak, 4);
  assert.equal(state.mendedHearts, 1);
  state = guess(state, wrong(state));
  assert.equal(state.lives, 2);
  assert.equal(state.mendedHearts, 0);
  assert.equal(state.streak, 0);
});
