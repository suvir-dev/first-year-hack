export const STARTING_LIVES = 3;
export const STREAK_FOR_LIFE = 4;
export const GAP_BANDS = [
  [Math.log(1.8), Infinity],
  [Math.log(1.4), Math.log(1.8)],
  [Math.log(1.15), Math.log(1.4)],
  [0, Math.log(1.15)],
];

export const trackKey = ({ id, title, artist }) => id ?? JSON.stringify(
  [title, artist].map((text) => text.normalize('NFC').trim().replace(/\s+/gu, ' ').toLowerCase()),
);

const sample = (items, random) => items[Math.floor(random() * items.length)];

export function selectChallenger(deck, anchor, difficulty, seen, random = Math.random) {
  const eligible = deck.filter((track) =>
    track.kind !== anchor.kind && trackKey(track) !== trackKey(anchor) && track.views !== anchor.views);
  const unseen = eligible.filter((track) => !seen.has(trackKey(track)));
  const candidates = unseen.length ? unseen : eligible;
  if (!candidates.length) return undefined;

  const [min, max] = GAP_BANDS[difficulty];
  const ranked = candidates.map((track) => {
    const gap = Math.abs(Math.log(track.views / anchor.views));
    return { track, gap, distance: Math.max(min - gap, gap - max, 0) };
  });
  const ideal = ranked.filter(({ gap }) => gap >= min && gap < max);
  const bestDistance = Math.min(...ranked.map(({ distance }) => distance));
  const pool = ideal.length ? ideal : ranked.filter(({ distance }) => distance === bestDistance);
  return sample(pool, random).track;
}

export function startGame(deck, random = Math.random, previousOpening) {
  const anchors = deck.filter((left) => left.kind === 'art' && deck.some((right) =>
    right.kind === 'music' && left.views !== right.views));
  if (!anchors.length) {
    return { phase: 'unavailable', score: 0, lives: STARTING_LIVES, mendedHearts: 0, streak: 0 };
  }

  const challengers = (left) => {
    if (!previousOpening?.includes(trackKey(left))) return deck;
    return deck.filter((right) => !previousOpening.includes(trackKey(right)));
  };
  const freshAnchors = anchors.filter((left) => challengers(left).some((right) =>
    right.kind !== left.kind && trackKey(left) !== trackKey(right) && left.views !== right.views));
  const left = sample(freshAnchors.length ? freshAnchors : anchors, random);
  const right = selectChallenger(
    freshAnchors.length ? challengers(left) : deck, left, 0, new Set(), random,
  );
  return {
    phase: 'guess', score: 0, lives: STARTING_LIVES, mendedHearts: 0, streak: 0, difficulty: 0,
    left, right, opening: [trackKey(left), trackKey(right)],
    seen: new Set([trackKey(left), trackKey(right)]), result: null, round: 1,
  };
}

export function transition(state, action, deck) {
  if (action.type === 'restart' && state.phase === 'results') {
    const draws = action.draws.values();
    return startGame(deck, () => draws.next().value, state.opening);
  }
  if (action.round !== state.round) return state;
  if (action.type === 'show-results' && state.phase === 'over') {
    return { ...state, phase: 'results' };
  }

  if (action.type === 'guess' && state.phase === 'guess') {
    if (action.direction !== 'higher' && action.direction !== 'lower') return state;
    const direction = state.right.views > state.left.views ? 'higher' : 'lower';
    const correct = action.direction === direction;
    const streak = correct ? state.streak + 1 : 0;
    const restored = correct && streak % STREAK_FOR_LIFE === 0 && state.lives < STARTING_LIVES;
    const lives = state.lives - Number(!correct) + Number(restored);
    const mendedHearts = Math.max(0, state.mendedHearts - Number(!correct) + Number(restored));
    return {
      ...state, lives, mendedHearts, streak, score: state.score + Number(correct),
      difficulty: Math.max(0, Math.min(GAP_BANDS.length - 1, state.difficulty + (correct ? 1 : -1))),
      phase: lives === 0 ? 'over' : 'reveal',
      result: { correct, restored },
    };
  }

  if (action.type === 'next' && state.phase === 'reveal') {
    const left = state.right;
    const right = selectChallenger(deck, left, state.difficulty, state.seen, () => action.random);
    if (!right) return { ...state, phase: 'unavailable' };
    return {
      ...state, left, right, phase: 'guess', result: null, round: state.round + 1,
      seen: new Set([...state.seen, trackKey(right)]),
    };
  }

  return state;
}
