// paintings.ts  (owner: Person B)
// ---------------------------------------------------------------------------
// The list of paintings the player can choose from.
// Image files go in public/paintings/ (see the README in that folder).
// ---------------------------------------------------------------------------

import type { PoseLandmarks } from "./pose";

export interface Painting {
  /** Short unique name, also used as the image file name. */
  id: string;
  title: string;
  artist: string;
  /** Path to the image. "/paintings/x.jpg" means the file public/paintings/x.jpg. */
  imageUrl: string;
  /**
   * The pose of the person in the painting (33 landmarks, same format as
   * pose.ts). null means "not recorded yet": the game can show the painting
   * but cannot score it.
   */
  targetPose: PoseLandmarks | null;
}

// TODO (Person B): download these images into public/paintings/ (see the
// README there), check the titles and artists, and add or remove paintings.
// Pick paintings where the person's arms and head are clearly visible: those
// are the easiest to copy and to score.
//
// TODO (Person A + B together): fill in targetPose for each painting (see the
// TODO at the bottom of pose.ts).
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
