// paintings.ts  (owner: Person B)
// ---------------------------------------------------------------------------
// The paintings the player can choose from.
//
// - Images live in public/paintings/ (sources are in the README there).
// - targetPose says where the person's joints are in the painting. Make or
//   fix one with the pose picker: run `npm run dev` and open
//   http://localhost:5173/tools/pose-picker.html
// ---------------------------------------------------------------------------

import { poseFromKeyJoints } from "./landmarks";
import type { DetectedPose } from "./landmarks";
import type { FeatureName } from "./scoring";

export interface Painting {
  /** Short unique name, also used as the image file name. */
  id: string;
  title: string;
  artist: string;
  /** Year it was painted (shown on the gallery cards and the plaque). */
  year: number;
  /** One interesting line for the museum placard next to the painting. */
  funFact: string;
  /**
   * 2–3 short sentences the narrator reads while you pose (about 10–12
   * seconds spoken, so it finishes inside a 15-second round).
   */
  history: string;
  /** Path to the image. "/paintings/x.jpg" means the file public/paintings/x.jpg. */
  imageUrl: string;
  /**
   * true if the painting shows exactly one person with a clear pose.
   * Only these are used in Gallery Tour mode (crowd scenes are confusing).
   */
  onePerson: boolean;
  /** Leave the legs out of the score (e.g. riding a horse, sitting in a boat). */
  upperBodyOnly?: boolean;
  /** The limbs that make this pose famous: they count double in the score. */
  signatureJoints?: FeatureName[];
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
    // TODO: fact-check
    funFact: "The rocks are carved with the names of Hannibal and Charlemagne, who crossed the Alps before him.",
    // TODO: fact-check
    history:
      "Jacques-Louis David painted this in 1801. Napoleon refused to pose, and asked to look calm on a fiery horse. In real life, he crossed the Alps on a mule.",
    imageUrl: "/paintings/napoleon-crossing-the-alps.jpg",
    onePerson: true,
    // He is riding a horse: nobody can copy that standing up, so only the
    // upper body counts. The pointing arm is what makes the painting famous.
    upperBodyOnly: true,
    signatureJoints: ["rightUpperArm", "rightForearm"],
    // Placed by hand. The left leg is hidden behind the horse.
    targetPose: poseFromKeyJoints(1280, 1559, {
      nose: [0.63, 0.21],
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
    // TODO: fact-check
    funFact: "The boy with two pistols is said to have inspired Gavroche in Victor Hugo's Les Misérables.",
    // TODO: fact-check
    history:
      "Eugène Delacroix painted this after the July Revolution of 1830 in Paris. Liberty leads the people over the barricade, holding the French flag high. It now hangs in the Louvre.",
    imageUrl: "/paintings/liberty-leading-the-people.jpg",
    onePerson: false,
    signatureJoints: ["rightUpperArm", "rightForearm"], // the arm raising the flag
    // Placed by hand. The left leg is hidden under her dress.
    targetPose: poseFromKeyJoints(1280, 1027, {
      nose: [0.58, 0.16],
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
    // TODO: fact-check
    funFact: "Some doctors think the red cloak around God is shaped like a human brain.",
    // TODO: fact-check
    history:
      "Michelangelo painted this on the Sistine Chapel ceiling in the Vatican, around 1512. God reaches out to give life to Adam. Their almost-touching fingers are copied all over the world.",
    imageUrl: "/paintings/the-creation-of-adam.jpg",
    onePerson: false,
    signatureJoints: ["leftUpperArm", "leftForearm"], // the arm reaching for God
    // Placed by hand (automatic detection mixed up Adam's legs).
    targetPose: poseFromKeyJoints(1280, 581, {
      nose: [0.118, 0.411],
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
    // TODO: fact-check
    funFact: "The flag is a mistake: the Stars and Stripes wasn't adopted until 1777.",
    // TODO: fact-check
    history:
      "Emanuel Leutze painted this in Germany in 1851. It shows George Washington crossing the icy Delaware River on Christmas night, 1776, before a surprise attack at Trenton.",
    imageUrl: "/paintings/washington-crossing-the-delaware.jpg",
    onePerson: false,
    // His raised knee (foot up on the boat) is what makes the pose: without
    // it, just standing still would already score very high.
    signatureJoints: ["rightThigh"],
    // Placed by hand. His left arm and leg are hidden by the cloak and sword.
    targetPose: poseFromKeyJoints(1280, 820, {
      nose: [0.325, 0.348],
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
    // TODO: fact-check
    funFact: "The oath scene isn't in the old Roman story: David invented it.",
    // TODO: fact-check
    history:
      "Jacques-Louis David painted this in 1784. Three Roman brothers swear to fight for their city, while their father holds up their swords. It was a sensation in Paris.",
    imageUrl: "/paintings/oath-of-the-horatii.jpg",
    onePerson: false,
    signatureJoints: ["leftForearm", "rightForearm"], // both arms raising the swords
    // Placed by hand: the father raising the swords, on the right.
    targetPose: poseFromKeyJoints(1280, 986, {
      nose: [0.552, 0.442],
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
    // TODO: fact-check
    funFact: "We never see his face: Friedrich often painted people from behind, so we share their view.",
    // TODO: fact-check
    history:
      "Caspar David Friedrich painted this around 1818. A lone traveller stands on a rocky peak, gazing over a sea of fog. It has become a symbol of German Romanticism.",
    imageUrl: "/paintings/wanderer-above-the-sea-of-fog.jpg",
    onePerson: true,
    signatureJoints: ["torso"], // standing upright, facing the view
    // Found automatically. Seen from behind, so his left side is on the left.
    // His arms are mostly hidden under the coat.
    targetPose: poseFromKeyJoints(1280, 1639, {
      nose: [0.494, 0.37],
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
  {
    id: "the-fifer",
    title: "The Fifer",
    artist: "Édouard Manet",
    year: 1866,
    // TODO: fact-check
    funFact: "Manet admired the Spanish painter Velázquez, who also painted figures against plain backgrounds.",
    // TODO: fact-check
    history:
      "Édouard Manet painted this young military musician in 1866. The flat grey background was so daring that the Paris Salon rejected it. Today it hangs in the Musée d'Orsay.",
    imageUrl: "/paintings/the-fifer.jpg",
    onePerson: true,
    signatureJoints: ["leftForearm", "rightForearm"], // both hands up at the fife
    // Found automatically by the pose picker.
    targetPose: poseFromKeyJoints(1280, 2184, {
      nose: [0.511, 0.227],
      leftShoulder: [0.6, 0.301],
      rightShoulder: [0.342, 0.291],
      leftElbow: [0.558, 0.4],
      rightElbow: [0.183, 0.371],
      leftWrist: [0.428, 0.309],
      rightWrist: [0.261, 0.3],
      leftHip: [0.518, 0.533],
      rightHip: [0.367, 0.532],
      leftKnee: [0.59, 0.708],
      rightKnee: [0.394, 0.707],
      leftAnkle: [0.667, 0.866],
      rightAnkle: [0.438, 0.855],
    }),
  },
  {
    id: "the-blue-boy",
    title: "The Blue Boy",
    artist: "Thomas Gainsborough",
    year: 1770,
    // TODO: fact-check
    funFact: "Before it left for America in 1922, huge crowds came to say goodbye to it in London.",
    // TODO: fact-check
    history:
      "Thomas Gainsborough painted this around 1770, dressing the boy in an old-fashioned blue silk costume. In the 1920s it was sold to an American collector, and it now hangs in California.",
    imageUrl: "/paintings/the-blue-boy.jpg",
    onePerson: true,
    signatureJoints: ["leftUpperArm", "leftForearm"], // hand on the hip
    // Found automatically by the pose picker.
    targetPose: poseFromKeyJoints(1280, 1862, {
      nose: [0.448, 0.179],
      leftShoulder: [0.573, 0.255],
      rightShoulder: [0.364, 0.271],
      leftElbow: [0.684, 0.347],
      rightElbow: [0.325, 0.4],
      leftWrist: [0.601, 0.41],
      rightWrist: [0.324, 0.507],
      leftHip: [0.524, 0.51],
      rightHip: [0.406, 0.511],
      leftKnee: [0.527, 0.709],
      rightKnee: [0.423, 0.704],
      leftAnkle: [0.534, 0.863],
      rightAnkle: [0.485, 0.87],
    }),
  },
  {
    id: "louis-xiv",
    title: "Louis XIV",
    artist: "Hyacinthe Rigaud",
    year: 1701,
    // TODO: fact-check
    funFact: "Louis loved ballet, and he shows off his legs like a dancer, even at 63.",
    // TODO: fact-check
    history:
      "Hyacinthe Rigaud painted King Louis the Fourteenth in 1701. It was meant as a gift for Spain, but the king loved it so much that he kept it.",
    imageUrl: "/paintings/louis-xiv.jpg",
    onePerson: true,
    signatureJoints: ["rightUpperArm", "rightForearm"], // arm out on the cane
    // Found automatically by the pose picker.
    targetPose: poseFromKeyJoints(1280, 1860, {
      nose: [0.421, 0.222],
      leftShoulder: [0.561, 0.311],
      rightShoulder: [0.376, 0.319],
      leftElbow: [0.675, 0.394],
      rightElbow: [0.248, 0.385],
      leftWrist: [0.661, 0.514],
      rightWrist: [0.147, 0.377],
      leftHip: [0.545, 0.539],
      rightHip: [0.431, 0.541],
      leftKnee: [0.47, 0.696],
      rightKnee: [0.38, 0.679],
      leftAnkle: [0.515, 0.868],
      rightAnkle: [0.456, 0.854],
    }),
  },
  {
    id: "napoleon-in-his-study",
    title: "Napoleon in His Study",
    artist: "Jacques-Louis David",
    year: 1812,
    // TODO: fact-check
    funFact: "The hand tucked into the waistcoat was a classic pose for gentlemen at the time.",
    // TODO: fact-check
    history:
      "Jacques-Louis David painted this in 1812. The clock shows thirteen minutes past four in the morning, and the candles have burned low: Napoleon has worked all night.",
    imageUrl: "/paintings/napoleon-in-his-study.jpg",
    onePerson: true,
    signatureJoints: ["rightForearm"], // the famous hand in the waistcoat
    // Found automatically by the pose picker.
    targetPose: poseFromKeyJoints(1280, 2135, {
      nose: [0.482, 0.172],
      leftShoulder: [0.64, 0.255],
      rightShoulder: [0.443, 0.253],
      leftElbow: [0.662, 0.394],
      rightElbow: [0.417, 0.382],
      leftWrist: [0.615, 0.507],
      rightWrist: [0.362, 0.375],
      leftHip: [0.561, 0.498],
      rightHip: [0.457, 0.489],
      leftKnee: [0.484, 0.685],
      rightKnee: [0.482, 0.68],
      leftAnkle: [0.511, 0.862],
      rightAnkle: [0.528, 0.849],
    }),
  },
];
