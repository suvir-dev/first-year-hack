// paintings.ts  (owner: Person B)
// ---------------------------------------------------------------------------
// The paintings the player can choose from.
//
// - Images live in public/paintings/ (sources are in the README there).
// - targetPose says where the person's joints are in the painting. Make or
//   fix one with the pose picker: run `npm run dev` and open
//   http://localhost:5173/tools/pose-picker.html
// ---------------------------------------------------------------------------

import { poseFromKeyJoints } from "./pose";
import type { DetectedPose } from "./pose";

export interface Painting {
  /** Short unique name, also used as the image file name. */
  id: string;
  title: string;
  artist: string;
  /** Year it was painted (shown on the gallery cards and the plaque). */
  year: number;
  /** Path to the image. "/paintings/x.jpg" means the file public/paintings/x.jpg. */
  imageUrl: string;
  /**
   * The pose to copy: positions of the key joints (0..1 across and down the
   * image) plus the image's width ÷ height. null = not recorded yet, so the
   * painting can't be scored.
   */
  targetPose: DetectedPose | null;
}

export const paintings: Painting[] = [
  {
    id: "napoleon-crossing-the-alps",
    title: "Napoleon Crossing the Alps",
    artist: "Jacques-Louis David",
    year: 1801,
    imageUrl: "/paintings/napoleon-crossing-the-alps.jpg",
    // Placed by hand. The left leg is hidden behind the horse.
    targetPose: poseFromKeyJoints(0.821, {
      leftShoulder: [0.726, 0.24],
      rightShoulder: [0.61, 0.235],
      leftElbow: [0.698, 0.353],
      rightElbow: [0.57, 0.184],
      leftWrist: [0.593, 0.36],
      rightWrist: [0.52, 0.139],
      leftHip: [0.634, 0.443],
      rightHip: [0.524, 0.45],
      rightKnee: [0.419, 0.518],
      rightAnkle: [0.502, 0.66],
    }),
  },
  {
    id: "liberty-leading-the-people",
    title: "Liberty Leading the People",
    artist: "Eugène Delacroix",
    year: 1830,
    imageUrl: "/paintings/liberty-leading-the-people.jpg",
    // Placed by hand. The left leg is hidden under her dress.
    targetPose: poseFromKeyJoints(1.246, {
      leftShoulder: [0.651, 0.223],
      rightShoulder: [0.59, 0.204],
      leftElbow: [0.666, 0.313],
      rightElbow: [0.544, 0.143],
      leftWrist: [0.662, 0.38],
      rightWrist: [0.51, 0.067],
      leftHip: [0.609, 0.409],
      rightHip: [0.548, 0.409],
      rightKnee: [0.563, 0.546],
      rightAnkle: [0.597, 0.655],
    }),
  },
  {
    id: "the-creation-of-adam",
    title: "The Creation of Adam",
    artist: "Michelangelo",
    year: 1512,
    imageUrl: "/paintings/the-creation-of-adam.jpg",
    // Placed by hand (automatic detection mixed up Adam's legs).
    targetPose: poseFromKeyJoints(2.203, {
      leftShoulder: [0.158, 0.488],
      rightShoulder: [0.027, 0.488],
      leftElbow: [0.252, 0.473],
      rightElbow: [0.0135, 0.677],
      leftWrist: [0.324, 0.419],
      rightWrist: [0.04, 0.7],
      leftHip: [0.171, 0.726],
      rightHip: [0.0945, 0.766],
      leftKnee: [0.27, 0.548],
      rightKnee: [0.252, 0.855],
      leftAnkle: [0.23, 0.806],
      rightAnkle: [0.378, 0.934],
    }),
  },
  {
    id: "washington-crossing-the-delaware",
    title: "Washington Crossing the Delaware",
    artist: "Emanuel Leutze",
    year: 1851,
    imageUrl: "/paintings/washington-crossing-the-delaware.jpg",
    // Placed by hand. His left arm and leg are hidden by the cloak and sword.
    targetPose: poseFromKeyJoints(1.561, {
      leftShoulder: [0.358, 0.382],
      rightShoulder: [0.315, 0.385],
      rightElbow: [0.296, 0.486],
      rightWrist: [0.294, 0.535],
      leftHip: [0.345, 0.53],
      rightHip: [0.315, 0.53],
      rightKnee: [0.271, 0.564],
      rightAnkle: [0.277, 0.688],
    }),
  },
  {
    id: "oath-of-the-horatii",
    title: "Oath of the Horatii",
    artist: "Jacques-Louis David",
    year: 1784,
    imageUrl: "/paintings/oath-of-the-horatii.jpg",
    // Placed by hand: the father raising the swords, on the right.
    targetPose: poseFromKeyJoints(1.298, {
      leftShoulder: [0.548, 0.494],
      rightShoulder: [0.53, 0.502],
      leftElbow: [0.512, 0.486],
      rightElbow: [0.487, 0.438],
      leftWrist: [0.469, 0.41],
      rightWrist: [0.44, 0.37],
      leftHip: [0.524, 0.662],
      rightHip: [0.506, 0.662],
      leftKnee: [0.536, 0.774],
      rightKnee: [0.462, 0.758],
      leftAnkle: [0.573, 0.894],
      rightAnkle: [0.45, 0.886],
    }),
  },
  {
    id: "wanderer-above-the-sea-of-fog",
    title: "Wanderer above the Sea of Fog",
    artist: "Caspar David Friedrich",
    year: 1818,
    imageUrl: "/paintings/wanderer-above-the-sea-of-fog.jpg",
    // Found automatically. Seen from behind, so his left side is on the left.
    // His arms are mostly hidden under the coat.
    targetPose: poseFromKeyJoints(0.781, {
      leftShoulder: [0.452, 0.416],
      rightShoulder: [0.555, 0.415],
      leftElbow: [0.448, 0.486],
      leftHip: [0.466, 0.562],
      rightHip: [0.522, 0.564],
      leftKnee: [0.449, 0.645],
      rightKnee: [0.517, 0.653],
      leftAnkle: [0.445, 0.714],
      rightAnkle: [0.511, 0.738],
    }),
  },
];
