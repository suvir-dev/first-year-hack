// rounds.ts  (owner: Person B)
// ---------------------------------------------------------------------------
// "Gallery Tour" mode: 5 random paintings in a row.
//
// This file only knows the ORDER of things (pick paintings, play each round,
// short break between rounds, add up the scores). The actual playing of a
// round (camera, scoring, snapshot) lives in main.ts and is passed in as a
// function, so the two files don't get tangled.
// ---------------------------------------------------------------------------

import { duetPaintings, soloPaintings } from "./paintings";
import type { Painting } from "./paintings";
import type { Difficulty } from "./scoring";
import type { DetectedPose } from "./landmarks";

export const TOUR_LENGTH = 5;
export const ROUND_SECONDS = 15;
export const BREAK_SECONDS = 3;

/** What one round produced. */
export interface RoundResult {
  painting: Painting;
  /** The webcam snapshot taken at the end of the round. */
  photo: HTMLCanvasElement;
  /** Each player's final score: always a whole number 0..100. */
  scores: number[];
  /** Which figure of the painting each player copied (index into painting.figures). */
  figureOfPlayer: number[];
  /** Each player's pose at the moment of the photo (for cropping the result). */
  poses: (DetectedPose | null)[];
}

/** The things main.ts must provide so a tour can run. */
export interface TourHooks {
  /** Play one round. Resolve null if the player quits. */
  playRound(painting: Painting, roundNumber: number, totalRounds: number): Promise<RoundResult | null>;
  /** Show the short "Next painting…" break after a round. */
  showBreak(result: RoundResult, roundNumber: number, totalRounds: number): Promise<void>;
}

/** Shuffle a list (Fisher–Yates): walk backwards, swapping each item with a
 * random one at or before it. Every order is equally likely. */
function shuffle<T>(items: T[]): T[] {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/** The paintings of the previous tour, so the next one can avoid them. */
let previousTour = new Set<string>();

/** Shuffle a pool, putting paintings NOT in the previous tour first. */
function freshFirst(pool: Painting[]): Painting[] {
  return [
    ...shuffle(pool.filter((painting) => !previousTour.has(painting.id))),
    ...shuffle(pool.filter((painting) => previousTour.has(painting.id))),
  ];
}

/**
 * Choose the paintings for a tour: random order, no repeats.
 * - 1 player: ONLY solo paintings (one figure). Never a duet.
 * - 2 players: a mix: 2 duet paintings (each player copies their own figure)
 *   if there are enough, the rest solo (both copy the same figure).
 * - If at least `count` solo paintings match the chosen difficulty, the solo
 *   paintings come from those.
 * - Paintings from the previous tour are used only if there aren't enough new ones.
 */
export function pickTourPaintings(difficulty?: Difficulty, count = TOUR_LENGTH, playerCount: 1 | 2 = 1): Painting[] {
  let solos = soloPaintings;
  const matching = solos.filter((painting) => painting.difficulty === difficulty);
  if (matching.length >= count) solos = matching;

  const duetCount = playerCount === 2 ? Math.min(2, duetPaintings.length) : 0;
  const chosen = shuffle([
    ...freshFirst(duetPaintings).slice(0, duetCount),
    ...freshFirst(solos).slice(0, count - duetCount),
  ]);
  previousTour = new Set(chosen.map((painting) => painting.id));
  return chosen;
}

/**
 * Play a whole Gallery Tour.
 * @returns every round's result, or null if the player quit part-way
 */
export async function runGalleryTour(
  hooks: TourHooks,
  difficulty: Difficulty | undefined,
  playerCount: 1 | 2,
): Promise<RoundResult[] | null> {
  const chosen = pickTourPaintings(difficulty, TOUR_LENGTH, playerCount);
  const results: RoundResult[] = [];

  for (let i = 0; i < chosen.length; i++) {
    const result = await hooks.playRound(chosen[i], i + 1, chosen.length);
    if (!result) return null; // quit
    results.push(result);

    // A short break between rounds (not after the last one).
    if (i < chosen.length - 1) await hooks.showBreak(result, i + 1, chosen.length);
  }
  return results;
}

/**
 * Add up each player's scores over the tour. A round where a player was
 * never seen counts as 0.
 */
export function tourTotals(results: RoundResult[], playerCount: number): { total: number; average: number }[] {
  const totals = [];
  for (let player = 0; player < playerCount; player++) {
    const total = results.reduce((sum, round) => sum + (round.scores[player] ?? 0), 0);
    // (?? not ||, so a real score of 0 stays 0)
    totals.push({ total, average: Math.round(total / Math.max(1, results.length)) });
  }
  return totals;
}
