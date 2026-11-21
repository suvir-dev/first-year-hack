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
  /** Year it was made (negative = BCE, e.g. -350 = 350 BCE). */
  year: number;
  /** One interesting line for the museum placard next to the painting. */
  funFact: string;
  /**
   * 2–3 short sentences in a calm audio-guide tone ("Before you stands…"),
   * read while you pose. Keep it under ~25 words so it finishes well inside
   * a 15-second round at the narrator's slow pace.
   */
  history: string;
  /** Path to the image. "/paintings/x.jpg" means the file public/paintings/x.jpg. */
  imageUrl: string;
  /**
   * true if the painting shows exactly one person with a clear pose.
   * Only these are used in Gallery Tour mode (crowd scenes are confusing).
   */
  onePerson: boolean;
  /**
   * How hard the pose is to copy. Gallery Tour picks paintings matching the
   * chosen difficulty (or any, if fewer than 5 match).
   */
  difficulty: "easy" | "medium" | "hard";
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
      "Before you rides Napoleon, painted by David in 1801. Notice his calm face on a wild, rearing horse. In truth, he crossed on a mule.",
    imageUrl: "/paintings/napoleon-crossing-the-alps.jpg",
    onePerson: true,
    difficulty: "medium",
    // He is riding a horse: nobody can copy that standing up, so only the
    // upper body counts. The pointing arm is what makes the painting famous.
    upperBodyOnly: true,
    signatureJoints: ["rightUpperArm", "rightForearm"],
    // Placed by hand. The left leg is hidden behind the horse.
    targetPose: poseFromKeyJoints(985, 1200, {
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
      "Before you, Liberty leads the people of Paris, painted by Delacroix in 1830. Notice the flag held high above the smoke of revolution.",
    imageUrl: "/paintings/liberty-leading-the-people.jpg",
    onePerson: false,
    difficulty: "hard",
    signatureJoints: ["rightUpperArm", "rightForearm"], // the arm raising the flag
    // Placed by hand. The left leg is hidden under her dress.
    targetPose: poseFromKeyJoints(1200, 963, {
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
      "High on the Sistine Chapel ceiling, Michelangelo painted God giving life to Adam. Notice how their fingers almost, but not quite, touch.",
    imageUrl: "/paintings/the-creation-of-adam.jpg",
    onePerson: false,
    difficulty: "hard",
    signatureJoints: ["leftUpperArm", "leftForearm"], // the arm reaching for God
    // Placed by hand (automatic detection mixed up Adam's legs).
    targetPose: poseFromKeyJoints(1200, 544, {
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
      "Before you, George Washington crosses the icy Delaware on Christmas night, 1776. Leutze painted the scene in Germany, in 1851.",
    imageUrl: "/paintings/washington-crossing-the-delaware.jpg",
    onePerson: false,
    difficulty: "hard",
    // His raised knee (foot up on the boat) is what makes the pose: without
    // it, just standing still would already score very high.
    signatureJoints: ["rightThigh"],
    // Placed by hand. His left arm and leg are hidden by the cloak and sword.
    targetPose: poseFromKeyJoints(1200, 768, {
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
      "Before you, three Roman brothers swear to fight for their city, painted by David in 1784. Notice their father, raising the swords.",
    imageUrl: "/paintings/oath-of-the-horatii.jpg",
    onePerson: false,
    difficulty: "hard",
    signatureJoints: ["leftForearm", "rightForearm"], // both arms raising the swords
    // Placed by hand: the father raising the swords, on the right.
    targetPose: poseFromKeyJoints(1200, 924, {
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
      "Before you stands a lone traveller above a sea of fog, painted by Friedrich around 1818. Notice how we share his view.",
    imageUrl: "/paintings/wanderer-above-the-sea-of-fog.jpg",
    onePerson: true,
    difficulty: "easy",
    signatureJoints: ["torso"], // standing upright, facing the view
    // Found automatically. Seen from behind, so his left side is on the left.
    // His arms are mostly hidden under the coat.
    targetPose: poseFromKeyJoints(937, 1200, {
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
      "Before you stands a young army musician, painted by Manet in 1866. Notice the plain grey background: so daring, the Paris Salon rejected it.",
    imageUrl: "/paintings/the-fifer.jpg",
    onePerson: true,
    difficulty: "medium",
    signatureJoints: ["leftForearm", "rightForearm"], // both hands up at the fife
    // Found automatically by the pose picker.
    targetPose: poseFromKeyJoints(703, 1200, {
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
      "Before you stands Gainsborough's Blue Boy, painted around 1770. Notice the shimmering blue silk, a costume already old-fashioned in his day.",
    imageUrl: "/paintings/the-blue-boy.jpg",
    onePerson: true,
    difficulty: "easy",
    signatureJoints: ["leftUpperArm", "leftForearm"], // hand on the hip
    // Found automatically by the pose picker.
    targetPose: poseFromKeyJoints(825, 1200, {
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
      "Before you stands King Louis the Fourteenth, painted by Rigaud in 1701. It was meant as a gift for Spain, but the king kept it.",
    imageUrl: "/paintings/louis-xiv.jpg",
    onePerson: true,
    difficulty: "easy",
    signatureJoints: ["rightUpperArm", "rightForearm"], // arm out on the cane
    // Found automatically by the pose picker.
    targetPose: poseFromKeyJoints(826, 1200, {
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
      "Before you, Napoleon stands in his study, painted by David in 1812. Notice the clock: past four in the morning. He has worked all night.",
    imageUrl: "/paintings/napoleon-in-his-study.jpg",
    onePerson: true,
    difficulty: "easy",
    signatureJoints: ["rightForearm"], // the famous hand in the waistcoat
    // Found automatically by the pose picker.
    targetPose: poseFromKeyJoints(719, 1200, {
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
  {
    id: "the-thinker",
    title: "The Thinker",
    artist: "Auguste Rodin",
    year: 1880,
    // TODO: fact-check
    funFact: "This cast was damaged by a bomb in 1970, and the museum chose to leave it unrepaired.",
    // TODO: fact-check
    history:
      "Before you sits Rodin's Thinker, first made around 1880. Notice his chin resting on his hand, lost deep in thought.",
    imageUrl: "/paintings/the-thinker.jpg",
    onePerson: true,
    upperBodyOnly: true,
    difficulty: "medium",
    signatureJoints: ["rightForearm"],
    // Placed by hand (the legs are damaged). Image: Cleveland Museum of Art, CC0.
    targetPose: poseFromKeyJoints(1013, 1200, {
      nose: [0.774, 0.3],
      leftShoulder: [0.441, 0.29],
      rightShoulder: [0.58, 0.31],
      leftElbow: [0.56, 0.52],
      rightElbow: [0.744, 0.505],
      leftWrist: [0.714, 0.6],
      rightWrist: [0.714, 0.38],
      leftHip: [0.3, 0.55],
      rightHip: [0.34, 0.56],
    }),
  },
  {
    id: "colonel-heathcote",
    title: "Colonel Charles Heathcote",
    artist: "Joseph Wright of Derby",
    year: 1771,
    // TODO: fact-check
    funFact: "Wright of Derby is most famous for dramatic candlelit scenes of science experiments.",
    // TODO: fact-check
    history:
      "Before you stands Colonel Charles Heathcote, painted by Joseph Wright of Derby around 1771. Notice how he points out across the landscape.",
    imageUrl: "/paintings/colonel-heathcote.jpg",
    onePerson: true,
    difficulty: "medium",
    signatureJoints: ["rightUpperArm", "rightForearm"],
    // Found automatically by the pose picker. Image: Cleveland Museum of Art, CC0.
    targetPose: poseFromKeyJoints(958, 1200, {
      nose: [0.465, 0.375],
      leftShoulder: [0.57, 0.433],
      rightShoulder: [0.45, 0.435],
      leftElbow: [0.671, 0.494],
      rightElbow: [0.359, 0.482],
      leftWrist: [0.596, 0.551],
      rightWrist: [0.262, 0.487],
      leftHip: [0.537, 0.61],
      rightHip: [0.467, 0.614],
      leftKnee: [0.534, 0.751],
      rightKnee: [0.458, 0.749],
      leftAnkle: [0.546, 0.86],
      rightAnkle: [0.536, 0.852],
    }),
  },
  {
    id: "saint-jerome",
    title: "Saint Jerome",
    artist: "Jusepe de Ribera",
    year: 1640,
    // TODO: fact-check
    funFact: "Saint Jerome translated the Bible into Latin. Ribera, a Spaniard, painted him in Naples.",
    // TODO: fact-check
    history:
      "Before you sits Saint Jerome, painted by Jusepe de Ribera around 1640. Notice the skull, a quiet reminder that life is short.",
    imageUrl: "/paintings/saint-jerome.jpg",
    onePerson: true,
    upperBodyOnly: true,
    difficulty: "medium",
    signatureJoints: ["leftForearm", "rightForearm"],
    // Found automatically by the pose picker. Image: Cleveland Museum of Art, CC0.
    targetPose: poseFromKeyJoints(931, 1200, {
      nose: [0.517, 0.288],
      leftShoulder: [0.672, 0.428],
      rightShoulder: [0.331, 0.442],
      leftElbow: [0.705, 0.641],
      rightElbow: [0.252, 0.632],
      leftWrist: [0.566, 0.719],
      rightWrist: [0.27, 0.613],
      leftHip: [0.578, 0.766],
      rightHip: [0.401, 0.744],
      leftKnee: [0.465, 0.892],
      rightKnee: [0.276, 0.856],
    }),
  },
  {
    id: "degas-dancer",
    title: "Dancer Looking at the Sole of Her Right Foot",
    artist: "Edgar Degas",
    year: 1896,
    // TODO: fact-check
    funFact: "Degas modelled his dancers in wax; they were cast in bronze only after his death.",
    // TODO: fact-check
    history:
      "Before you, a dancer balances on one leg to look at her foot, modelled by Edgar Degas around 1896. Notice how hard it is to stay still!",
    imageUrl: "/paintings/degas-dancer.jpg",
    onePerson: true,
    difficulty: "hard",
    signatureJoints: ["rightThigh", "rightShin"],
    // Found automatically by the pose picker. Image: Cleveland Museum of Art, CC0.
    targetPose: poseFromKeyJoints(736, 1200, {
      nose: [0.329, 0.216],
      leftShoulder: [0.55, 0.184],
      rightShoulder: [0.365, 0.279],
      leftElbow: [0.699, 0.179],
      rightElbow: [0.396, 0.393],
      leftWrist: [0.746, 0.211],
      leftHip: [0.619, 0.438],
      rightHip: [0.501, 0.44],
      leftKnee: [0.604, 0.646],
      rightKnee: [0.41, 0.565],
      leftAnkle: [0.505, 0.84],
    }),
  },
  {
    id: "cleveland-apollo",
    title: "Apollo the Lizard-Slayer",
    artist: "Praxiteles (attributed)",
    year: -350,
    // TODO: fact-check
    funFact: "Its Greek name, Sauroktonos, means 'lizard-slayer'.",
    // TODO: fact-check
    history:
      "Before you stands the young god Apollo, a bronze linked to the Greek sculptor Praxiteles. Notice his relaxed pose: he is waiting for a lizard.",
    imageUrl: "/paintings/cleveland-apollo.jpg",
    onePerson: true,
    difficulty: "easy",
    signatureJoints: ["torso"],
    // Found automatically by the pose picker. Image: Cleveland Museum of Art, CC0.
    targetPose: poseFromKeyJoints(738, 1200, {
      nose: [0.494, 0.23],
      leftShoulder: [0.592, 0.296],
      rightShoulder: [0.43, 0.306],
      leftElbow: [0.544, 0.389],
      leftHip: [0.531, 0.531],
      rightHip: [0.453, 0.531],
      rightKnee: [0.483, 0.712],
      leftAnkle: [0.511, 0.874],
      rightAnkle: [0.519, 0.88],
    }),
  },
  {
    id: "hercules",
    title: "Hercules",
    artist: "Unknown Roman artist",
    year: -10,
    // TODO: fact-check
    funFact: "The lion skin is from the Nemean lion, which Hercules defeated as his first labour.",
    // TODO: fact-check
    history:
      "Before you stands Hercules, the strongest hero of ancient myth, in Roman bronze about two thousand years old. Notice the lion skin over his arm.",
    imageUrl: "/paintings/hercules.jpg",
    onePerson: true,
    difficulty: "easy",
    signatureJoints: ["torso"],
    // Found automatically by the pose picker. Image: Cleveland Museum of Art, CC0.
    targetPose: poseFromKeyJoints(977, 1200, {
      nose: [0.482, 0.167],
      leftShoulder: [0.609, 0.264],
      rightShoulder: [0.376, 0.249],
      leftElbow: [0.641, 0.398],
      rightElbow: [0.333, 0.383],
      leftWrist: [0.549, 0.403],
      rightWrist: [0.264, 0.484],
      leftHip: [0.504, 0.529],
      rightHip: [0.391, 0.522],
      leftKnee: [0.51, 0.718],
      rightKnee: [0.399, 0.713],
      leftAnkle: [0.561, 0.885],
      rightAnkle: [0.427, 0.885],
    }),
  },
  {
    id: "caillebotte-man",
    title: "Portrait of a Man",
    artist: "Gustave Caillebotte",
    year: 1880,
    // TODO: fact-check
    funFact: "Caillebotte was also a rich collector who bought paintings from his Impressionist friends.",
    // TODO: fact-check
    history:
      "Before you sits a gentleman, painted by Gustave Caillebotte in 1880. Notice how relaxed he is, leaning back by the window.",
    imageUrl: "/paintings/caillebotte-man.jpg",
    onePerson: true,
    upperBodyOnly: true,
    difficulty: "easy",
    signatureJoints: ["torso"],
    // Found automatically by the pose picker. Image: Cleveland Museum of Art, CC0.
    targetPose: poseFromKeyJoints(964, 1200, {
      nose: [0.523, 0.342],
      leftShoulder: [0.769, 0.444],
      rightShoulder: [0.577, 0.484],
      leftElbow: [0.84, 0.67],
      leftWrist: [0.643, 0.825],
      leftHip: [0.685, 0.916],
      rightHip: [0.589, 0.876],
      leftKnee: [0.234, 0.811],
    }),
  },
  {
    id: "lotto-man",
    title: "Portrait of a Man",
    artist: "Lorenzo Lotto",
    year: 1534,
    // TODO: fact-check
    funFact: "Lotto was a restless Venetian painter who moved from city to city in search of work.",
    // TODO: fact-check
    history:
      "Before you, a gentleman stretches out his hand, painted by Lorenzo Lotto around 1534. Notice the dramatic gesture, as if he is speaking to us.",
    imageUrl: "/paintings/lotto-man.jpg",
    onePerson: true,
    upperBodyOnly: true,
    difficulty: "medium",
    signatureJoints: ["leftUpperArm", "leftForearm"],
    // Found automatically by the pose picker. Image: Cleveland Museum of Art, CC0.
    targetPose: poseFromKeyJoints(1107, 1200, {
      nose: [0.38, 0.185],
      leftShoulder: [0.505, 0.254],
      rightShoulder: [0.267, 0.378],
      leftElbow: [0.675, 0.257],
      rightElbow: [0.252, 0.556],
      leftWrist: [0.839, 0.247],
      rightWrist: [0.155, 0.643],
      leftHip: [0.617, 0.586],
      rightHip: [0.463, 0.633],
      leftKnee: [0.763, 0.813],
    }),
  },
  {
    id: "saint-peter-repentant",
    title: "Saint Peter Repentant",
    artist: "Georges de La Tour",
    year: 1645,
    // TODO: fact-check
    funFact: "La Tour was famous for candlelit scenes, then almost forgotten until the 1900s.",
    // TODO: fact-check
    history:
      "Before you sits Saint Peter, painted by Georges de La Tour in 1645. Notice the rooster: it crowed after Peter denied knowing Jesus.",
    imageUrl: "/paintings/saint-peter-repentant.jpg",
    onePerson: true,
    upperBodyOnly: true,
    difficulty: "medium",
    signatureJoints: ["leftForearm", "rightForearm"],
    // Found automatically by the pose picker. Image: Cleveland Museum of Art, CC0.
    targetPose: poseFromKeyJoints(977, 1200, {
      nose: [0.592, 0.119],
      leftShoulder: [0.733, 0.233],
      rightShoulder: [0.617, 0.242],
      leftElbow: [0.653, 0.418],
      leftWrist: [0.472, 0.337],
      leftHip: [0.655, 0.578],
      rightHip: [0.58, 0.568],
      leftKnee: [0.35, 0.602],
      rightKnee: [0.299, 0.583],
      leftAnkle: [0.279, 0.872],
      rightAnkle: [0.221, 0.863],
    }),
  },
  {
    id: "mars-giambologna",
    title: "Mars",
    artist: "Giambologna",
    year: 1585,
    // TODO: fact-check
    funFact: "Giambologna was born in Flanders but became the leading sculptor in Florence.",
    // TODO: fact-check
    history:
      "Before you strides Mars, the Roman god of war, cast in bronze by Giambologna in the 1580s. Notice how he twists, ready for action.",
    imageUrl: "/paintings/mars-giambologna.jpg",
    onePerson: true,
    difficulty: "medium",
    signatureJoints: ["torso", "rightUpperArm"],
    // Found automatically by the pose picker. Image: Cleveland Museum of Art, CC0.
    targetPose: poseFromKeyJoints(817, 1200, {
      nose: [0.466, 0.169],
      leftShoulder: [0.594, 0.239],
      rightShoulder: [0.399, 0.261],
      leftElbow: [0.559, 0.347],
      rightElbow: [0.385, 0.374],
      leftWrist: [0.459, 0.425],
      rightWrist: [0.332, 0.468],
      leftHip: [0.557, 0.468],
      rightHip: [0.451, 0.472],
      leftKnee: [0.638, 0.643],
      rightKnee: [0.418, 0.652],
      leftAnkle: [0.676, 0.794],
      rightAnkle: [0.407, 0.81],
    }),
  },
  {
    id: "the-tired-gleaner",
    title: "The Tired Gleaner",
    artist: "Jules Breton",
    year: 1880,
    // TODO: fact-check
    funFact: "Gleaners were allowed to gather the grain left behind after the harvest.",
    // TODO: fact-check
    history:
      "Before you, a tired gleaner stretches at sunset, painted by Jules Breton in 1880. Notice her arm raised to her head after a long day.",
    imageUrl: "/paintings/the-tired-gleaner.jpg",
    onePerson: true,
    difficulty: "medium",
    signatureJoints: ["rightUpperArm", "rightForearm"],
    // Found automatically by the pose picker. Image: Cleveland Museum of Art, CC0.
    targetPose: poseFromKeyJoints(815, 1200, {
      nose: [0.453, 0.221],
      leftShoulder: [0.516, 0.298],
      rightShoulder: [0.334, 0.279],
      leftElbow: [0.627, 0.332],
      rightElbow: [0.201, 0.234],
      leftWrist: [0.744, 0.355],
      rightWrist: [0.317, 0.217],
      leftHip: [0.465, 0.477],
      rightHip: [0.368, 0.471],
      leftKnee: [0.458, 0.65],
      rightKnee: [0.36, 0.637],
      leftAnkle: [0.437, 0.804],
      rightAnkle: [0.374, 0.784],
    }),
  },
  {
    id: "charles-ii",
    title: "Charles II of England",
    artist: "Philippe de Champaigne",
    year: 1653,
    // TODO: fact-check
    funFact: "He returned to rule England in 1660, an event called the Restoration.",
    // TODO: fact-check
    history:
      "Before you stands the young Charles the Second, painted by Philippe de Champaigne in 1653. At the time, he was a king in exile.",
    imageUrl: "/paintings/charles-ii.jpg",
    onePerson: true,
    upperBodyOnly: true,
    difficulty: "easy",
    signatureJoints: ["rightForearm"],
    // Found automatically by the pose picker. Image: Cleveland Museum of Art, CC0.
    targetPose: poseFromKeyJoints(905, 1200, {
      nose: [0.544, 0.24],
      leftShoulder: [0.757, 0.4],
      rightShoulder: [0.503, 0.403],
      leftElbow: [0.876, 0.605],
      rightElbow: [0.375, 0.583],
      leftWrist: [0.752, 0.767],
      rightWrist: [0.175, 0.684],
      leftHip: [0.712, 0.73],
      rightHip: [0.568, 0.707],
    }),
  },
  {
    id: "statue-of-an-athlete",
    title: "Statue of an Athlete",
    artist: "Unknown Roman sculptor",
    year: 50,
    // TODO: fact-check
    funFact: "Many Roman statues are copies of famous Greek bronzes that are now lost.",
    // TODO: fact-check
    history:
      "Before you stands a Roman marble athlete, nearly two thousand years old. Notice how his weight rests on one leg.",
    imageUrl: "/paintings/statue-of-an-athlete.jpg",
    onePerson: true,
    difficulty: "easy",
    signatureJoints: ["torso"],
    // Found automatically by the pose picker. Image: Cleveland Museum of Art, CC0.
    targetPose: poseFromKeyJoints(635, 1200, {
      nose: [0.375, 0.133],
      leftShoulder: [0.628, 0.208],
      rightShoulder: [0.367, 0.233],
      leftElbow: [0.704, 0.347],
      leftWrist: [0.693, 0.478],
      rightWrist: [0.239, 0.389],
      leftHip: [0.588, 0.474],
      rightHip: [0.453, 0.48],
      leftKnee: [0.587, 0.681],
      rightKnee: [0.467, 0.685],
      leftAnkle: [0.692, 0.879],
      rightAnkle: [0.535, 0.856],
    }),
  },
  {
    id: "athlete-making-an-offering",
    title: "Athlete Making an Offering",
    artist: "Unknown Greek sculptor",
    year: -440,
    // TODO: fact-check
    funFact: "Ancient Greek winners often gave thank-you gifts to the gods.",
    // TODO: fact-check
    history:
      "Before you stands a young Greek athlete in bronze, made about 2,400 years ago. Notice his arm held out, as if making an offering.",
    imageUrl: "/paintings/athlete-making-an-offering.jpg",
    onePerson: true,
    difficulty: "easy",
    signatureJoints: ["rightUpperArm", "rightForearm"],
    // Found automatically by the pose picker. Image: Cleveland Museum of Art, CC0.
    targetPose: poseFromKeyJoints(758, 1200, {
      nose: [0.36, 0.163],
      leftShoulder: [0.557, 0.22],
      rightShoulder: [0.334, 0.23],
      leftElbow: [0.597, 0.331],
      rightElbow: [0.356, 0.337],
      leftWrist: [0.589, 0.437],
      leftHip: [0.504, 0.429],
      rightHip: [0.391, 0.425],
      leftKnee: [0.516, 0.587],
      rightKnee: [0.419, 0.585],
      leftAnkle: [0.538, 0.709],
      rightAnkle: [0.447, 0.715],
    }),
  },
  {
    id: "saint-peter-of-alcantara",
    title: "Saint Peter of Alcántara",
    artist: "Pedro de Mena",
    year: 1665,
    // TODO: fact-check
    funFact: "This saint was said to sleep only an hour and a half each night.",
    // TODO: fact-check
    history:
      "Before you stands Saint Peter of Alcántara, carved and painted in wood by Pedro de Mena. Notice the book held in his hands.",
    imageUrl: "/paintings/saint-peter-of-alcantara.jpg",
    onePerson: true,
    upperBodyOnly: true,
    difficulty: "easy",
    signatureJoints: ["leftForearm", "rightForearm"],
    // Found automatically by the pose picker. Image: Cleveland Museum of Art, CC0.
    targetPose: poseFromKeyJoints(773, 1200, {
      nose: [0.498, 0.208],
      leftShoulder: [0.616, 0.311],
      rightShoulder: [0.378, 0.318],
      leftElbow: [0.673, 0.427],
      rightElbow: [0.314, 0.449],
      leftWrist: [0.648, 0.404],
      rightWrist: [0.269, 0.372],
      leftHip: [0.584, 0.506],
      rightHip: [0.461, 0.507],
    }),
  },
  {
    id: "standing-apostle",
    title: "Standing Apostle",
    artist: "Master of the Saint-Omer Apostles",
    year: 1430,
    // TODO: fact-check
    funFact: "Nobody knows the sculptor's name, so experts call him the Master of the Saint-Omer Apostles.",
    // TODO: fact-check
    history:
      "Before you stands an apostle, perhaps Saint Paul, carved around 1430. Notice the heavy folds of his robe.",
    imageUrl: "/paintings/standing-apostle.jpg",
    onePerson: true,
    upperBodyOnly: true,
    difficulty: "easy",
    signatureJoints: ["torso"],
    // Found automatically by the pose picker. Image: Cleveland Museum of Art, CC0.
    targetPose: poseFromKeyJoints(732, 1200, {
      nose: [0.462, 0.208],
      leftShoulder: [0.612, 0.314],
      rightShoulder: [0.349, 0.321],
      leftElbow: [0.646, 0.459],
      rightElbow: [0.317, 0.462],
      leftWrist: [0.654, 0.589],
      rightWrist: [0.319, 0.585],
      leftHip: [0.563, 0.587],
      rightHip: [0.415, 0.579],
      leftKnee: [0.562, 0.742],
      rightKnee: [0.417, 0.729],
      leftAnkle: [0.548, 0.886],
      rightAnkle: [0.411, 0.857],
    }),
  },
  {
    id: "woman-as-diana",
    title: "Portrait of a Woman as Diana",
    artist: "Jean-Marc Nattier",
    year: 1752,
    // TODO: fact-check
    funFact: "Nattier was famous for painting French court ladies as Greek goddesses.",
    // TODO: fact-check
    history:
      "Before you sits a lady dressed as Diana, goddess of the hunt, painted by Jean-Marc Nattier in 1752. Notice the bow and the leopard skin.",
    imageUrl: "/paintings/woman-as-diana.jpg",
    onePerson: true,
    upperBodyOnly: true,
    difficulty: "easy",
    signatureJoints: ["rightForearm"],
    // Found automatically by the pose picker. Image: Cleveland Museum of Art, CC0.
    targetPose: poseFromKeyJoints(966, 1200, {
      nose: [0.509, 0.324],
      leftShoulder: [0.642, 0.455],
      rightShoulder: [0.367, 0.448],
      leftElbow: [0.688, 0.627],
      rightElbow: [0.223, 0.605],
      leftWrist: [0.475, 0.681],
      rightWrist: [0.247, 0.55],
      leftHip: [0.609, 0.711],
      rightHip: [0.444, 0.711],
      leftKnee: [0.659, 0.662],
      rightKnee: [0.317, 0.659],
      rightAnkle: [0.335, 0.848],
    }),
  },
  {
    id: "mary-magdalen-vouet",
    title: "Saint Mary Magdalen",
    artist: "Simon Vouet",
    year: 1630,
    // TODO: fact-check
    funFact: "Vouet became First Painter to King Louis the Thirteenth of France.",
    // TODO: fact-check
    history:
      "Before you, Mary Magdalen looks up to heaven, painted by Simon Vouet around 1630. Notice her hand pressed to her heart.",
    imageUrl: "/paintings/mary-magdalen-vouet.jpg",
    onePerson: true,
    upperBodyOnly: true,
    difficulty: "easy",
    signatureJoints: ["rightForearm"],
    // Found automatically by the pose picker. Image: Cleveland Museum of Art, CC0.
    targetPose: poseFromKeyJoints(948, 1200, {
      nose: [0.472, 0.395],
      leftShoulder: [0.772, 0.483],
      rightShoulder: [0.453, 0.53],
      leftElbow: [0.839, 0.694],
      rightElbow: [0.306, 0.73],
      leftWrist: [0.65, 0.733],
      rightWrist: [0.42, 0.594],
      leftHip: [0.765, 0.83],
      rightHip: [0.578, 0.836],
      leftKnee: [0.863, 0.925],
      rightKnee: [0.349, 0.863],
    }),
  },
  {
    id: "diana-saint-gaudens",
    title: "Diana",
    artist: "Augustus Saint-Gaudens",
    year: 1899,
    // TODO: fact-check
    funFact: "A giant version once turned as a weathervane on top of Madison Square Garden in New York.",
    // TODO: fact-check
    history:
      "Before you, Diana draws her bow, modelled by Augustus Saint-Gaudens. Notice how she balances on one foot.",
    imageUrl: "/paintings/diana-saint-gaudens.jpg",
    onePerson: true,
    difficulty: "hard",
    signatureJoints: ["leftUpperArm", "leftForearm"],
    // Placed by hand (detection found the pedestal). Image: Cleveland Museum of Art, CC0.
    targetPose: poseFromKeyJoints(781, 1200, {
      nose: [0.495, 0.195],
      leftShoulder: [0.53, 0.254],
      rightShoulder: [0.57, 0.257],
      leftElbow: [0.42, 0.244],
      rightElbow: [0.604, 0.24],
      leftWrist: [0.32, 0.224],
      rightWrist: [0.555, 0.25],
      leftHip: [0.53, 0.39],
      rightHip: [0.57, 0.397],
      leftKnee: [0.54, 0.494],
      rightKnee: [0.66, 0.468],
      leftAnkle: [0.575, 0.611],
      rightAnkle: [0.715, 0.553],
    }),
  },
];
