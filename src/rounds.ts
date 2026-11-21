// rounds.ts  (owner: Person B)
// ---------------------------------------------------------------------------
// "Gallery Tour" mode: 5 random paintings in a row.
//
// This file only knows the ORDER of things (pick paintings, play each round,
// short break between rounds, add up the scores). The actual playing of a
// round (camera, scoring, snapshot) lives in main.ts and is passed in as a
// function, so the two files don't get tangled.
// ---------------------------------------------------------------------------

import { paintings } from "./paintings";
import type { Painting } from "./paintings";

export const TOUR_LENGTH = 5;
export const ROUND_SECONDS = 15;
export const BREAK_SECONDS = 3;

/** What one round produced. */
export interface RoundResult {
  painting: Painting;
  /** The webcam snapshot taken at the end of the round. */
  photo: HTMLCanvasElement;
  /** Each player's score at the moment of the snapshot (null = never seen). */
  scores: (number | null)[];
}

/** The things main.ts must provide so a tour can run. */
export interface TourHooks {
  /** Play one round. Resolve null if the player quits. */
  playRound(painting: Painting, roundNumber: number, totalRounds: number): Promise<RoundResult | null>;
  /** Show the short "Next painting…" break after a round. */
  showBreak(result: RoundResult, roundNumber: number, totalRounds: number): Promise<void>;
}

/**
 * Choose the paintings for a tour: random order, no repeats, and only
 * paintings with exactly one person and a target pose.
 */
export function pickTourPaintings(count = TOUR_LENGTH): Painting[] {
  const suitable = paintings.filter((painting) => painting.onePerson && painting.targetPose);

  // Shuffle (Fisher–Yates): walk backwards, swapping each painting with a
  // random one at or before it. Every order is equally likely.
  const shuffled = [...suitable];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

/**
 * Play a whole Gallery Tour.
 * @returns every round's result, or null if the player quit part-way
 */
export async function runGalleryTour(hooks: TourHooks): Promise<RoundResult[] | null> {
  const chosen = pickTourPaintings();
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
    totals.push({ total, average: Math.round(total / Math.max(1, results.length)) });
  }
  return totals;
}
