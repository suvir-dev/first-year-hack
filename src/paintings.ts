// paintings.ts  (owner: Person B)
// ---------------------------------------------------------------------------
// The list of paintings the player can choose from.
// Image files go in public/paintings/ (see the README in that folder).
// ---------------------------------------------------------------------------

import type { DetectedPose } from "./pose";

export interface Painting {
  /** Short unique name, also used as the image file name. */
  id: string;
  title: string;
  artist: string;
  /** Path to the image. "/paintings/x.jpg" means the file public/paintings/x.jpg. */
  imageUrl: string;
  /**
   * The pose of the person in the painting: 33 landmarks plus the aspect
   * ratio of the image they were measured in (same format as detect() in
   * pose.ts). null means "not recorded yet": the game can show the painting
   * but cannot score it.
   */
  targetPose: DetectedPose | null;
}

// TODO (Person B): download these images into public/paintings/ (see the
// README there), check the titles and artists, and add or remove paintings.
// Pick paintings where the person's arms and head are clearly visible: those
// are the easiest to copy and to score.
//
// TODO (Person A + B together): fill in targetPose for each painting (see the
// TODO at the bottom of pose.ts). Quick way: on the challenge screen, strike
// the pose and press T. The pose is printed in the browser console (F12) as
// JSON. Paste it here in place of null.
export const paintings: Painting[] = [
  {
    id: "mona-lisa",
    title: "Mona Lisa",
    artist: "Leonardo da Vinci",
    imageUrl: "/paintings/mona-lisa.jpg",
    targetPose: null,
  },
  {
    id: "the-scream",
    title: "The Scream",
    artist: "Edvard Munch",
    imageUrl: "/paintings/the-scream.jpg",
    targetPose: null,
  },
  {
    id: "napoleon-crossing-the-alps",
    title: "Napoleon Crossing the Alps",
    artist: "Jacques-Louis David",
    imageUrl: "/paintings/napoleon-crossing-the-alps.jpg",
    targetPose: null,
  },
  {
    id: "girl-with-a-pearl-earring",
    title: "Girl with a Pearl Earring",
    artist: "Johannes Vermeer",
    imageUrl: "/paintings/girl-with-a-pearl-earring.jpg",
    targetPose: null,
  },
];
