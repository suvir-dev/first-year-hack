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

/** One person in a painting, and the pose a player has to copy. */
export interface Figure {
  /** "main" for solo paintings, "left" / "right" for duets. */
  id: string;
  /** Who this is, e.g. "The Husband". Shown on the name tag and results. */
  label: string;
  /** Leave the legs out of the score (e.g. riding a horse, sitting down). */
  upperBodyOnly?: boolean;
  /** The point just above the figure's head (0..1 of the image): where the name tag goes. */
  anchor: { x: number; y: number };
  /** The pose to copy: key joints (0..1 of the image) + the image's size in pixels. */
  targetPose: DetectedPose;
}

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
   * How hard the pose is to copy. Gallery Tour picks paintings matching the
   * chosen difficulty (or any, if fewer than 5 match).
   */
  difficulty: "easy" | "medium" | "hard";
  /** The limbs that make this pose famous: they count double in the score. */
  signatureJoints?: FeatureName[];
  /**
   * The people in the painting: 1 figure ("solo") or 2 figures ("duet").
   * Paintings with 3 or more people are not allowed in the game.
   * For duets, figures[0] is the LEFT figure and figures[1] the RIGHT one.
   */
  figures: Figure[];
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
    difficulty: "medium",
    // He is riding a horse: nobody can copy that standing up, so only the
    // upper body counts. The pointing arm is what makes the painting famous.
    signatureJoints: ["rightUpperArm", "rightForearm"],
    figures: [
      {
        id: "main",
        label: "Napoleon",
        upperBodyOnly: true,
        anchor: { x: 0.63, y: 0.17 },
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
    ],
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
    difficulty: "easy",
    signatureJoints: ["torso"], // standing upright, facing the view
    // Found automatically. Seen from behind, so his left side is on the left.
    figures: [
      {
        id: "main",
        label: "The Wanderer",
        anchor: { x: 0.494, y: 0.32 },
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
    ],
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
    difficulty: "medium",
    signatureJoints: ["leftForearm", "rightForearm"], // both hands up at the fife
    figures: [
      {
        id: "main",
        label: "The Fifer",
        anchor: { x: 0.511, y: 0.151 },
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
    ],
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
    difficulty: "easy",
    signatureJoints: ["leftUpperArm", "leftForearm"], // hand on the hip
    figures: [
      {
        id: "main",
        label: "The Blue Boy",
        anchor: { x: 0.448, y: 0.087 },
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
    ],
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
    difficulty: "easy",
    signatureJoints: ["rightUpperArm", "rightForearm"], // arm out on the cane
    figures: [
      {
        id: "main",
        label: "King Louis XIV",
        anchor: { x: 0.421, y: 0.12 },
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
    ],
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
    difficulty: "easy",
    signatureJoints: ["rightForearm"], // the famous hand in the waistcoat
    figures: [
      {
        id: "main",
        label: "Napoleon",
        anchor: { x: 0.482, y: 0.082 },
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
    ],
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
    difficulty: "medium",
    signatureJoints: ["rightUpperArm", "rightForearm"],
    figures: [
      {
        id: "main",
        label: "Colonel Heathcote",
        anchor: { x: 0.465, y: 0.31 },
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
    ],
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
    difficulty: "medium",
    signatureJoints: ["leftForearm", "rightForearm"],
    figures: [
      {
        id: "main",
        label: "Saint Jerome",
        upperBodyOnly: true,
        anchor: { x: 0.517, y: 0.126 },
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
    ],
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
    difficulty: "easy",
    signatureJoints: ["torso"],
    figures: [
      {
        id: "main",
        label: "The Gentleman",
        upperBodyOnly: true,
        anchor: { x: 0.523, y: 0.208 },
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
    ],
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
    difficulty: "medium",
    signatureJoints: ["leftUpperArm", "leftForearm"],
    figures: [
      {
        id: "main",
        label: "The Gentleman",
        upperBodyOnly: true,
        anchor: { x: 0.38, y: 0.041 },
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
    ],
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
    difficulty: "medium",
    signatureJoints: ["leftForearm", "rightForearm"],
    figures: [
      {
        id: "main",
        label: "Saint Peter",
        upperBodyOnly: true,
        anchor: { x: 0.592, y: 0.02 },
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
    ],
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
    difficulty: "medium",
    signatureJoints: ["rightUpperArm", "rightForearm"],
    figures: [
      {
        id: "main",
        label: "The Gleaner",
        anchor: { x: 0.453, y: 0.147 },
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
    ],
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
    difficulty: "easy",
    signatureJoints: ["rightForearm"],
    figures: [
      {
        id: "main",
        label: "King Charles II",
        upperBodyOnly: true,
        anchor: { x: 0.544, y: 0.062 },
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
    ],
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
    difficulty: "easy",
    signatureJoints: ["leftForearm", "rightForearm"],
    figures: [
      {
        id: "main",
        label: "Saint Peter",
        upperBodyOnly: true,
        anchor: { x: 0.498, y: 0.091 },
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
    ],
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
    difficulty: "easy",
    signatureJoints: ["torso"],
    figures: [
      {
        id: "main",
        label: "The Apostle",
        upperBodyOnly: true,
        anchor: { x: 0.462, y: 0.088 },
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
    ],
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
    difficulty: "easy",
    signatureJoints: ["rightForearm"],
    figures: [
      {
        id: "main",
        label: "The Lady",
        upperBodyOnly: true,
        anchor: { x: 0.509, y: 0.184 },
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
    ],
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
    difficulty: "easy",
    signatureJoints: ["rightForearm"],
    figures: [
      {
        id: "main",
        label: "Mary Magdalen",
        upperBodyOnly: true,
        anchor: { x: 0.472, y: 0.272 },
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
    ],
  },
  {
    id: "arnolfini-portrait",
    title: "The Arnolfini Portrait",
    artist: "Jan van Eyck",
    year: 1434,
    // TODO: fact-check
    funFact: "In the round mirror on the wall you can see two more tiny figures; one may be van Eyck himself.",
    // TODO: fact-check
    history:
      "Before you stand a merchant and his wife, painted by Jan van Eyck in 1434. Notice how their hands meet between them.",
    imageUrl: "/paintings/arnolfini-portrait.jpg",
    difficulty: "medium",
    signatureJoints: ["leftForearm", "rightForearm"],
    // Both figures found automatically by the pose picker.
    figures: [
      {
        id: "left",
        label: "The Husband",
        anchor: { x: 0.295, y: 0.123 },
        targetPose: poseFromKeyJoints(877, 1200, {
          nose: [0.295, 0.21],
          leftShoulder: [0.337, 0.293],
          rightShoulder: [0.202, 0.285],
          leftElbow: [0.422, 0.388],
          rightElbow: [0.176, 0.405],
          leftWrist: [0.533, 0.415],
          rightWrist: [0.245, 0.349],
          leftHip: [0.381, 0.516],
          rightHip: [0.281, 0.512],
        }),
      },
      {
        id: "right",
        label: "The Wife",
        anchor: { x: 0.742, y: 0.188 },
        targetPose: poseFromKeyJoints(877, 1200, {
          nose: [0.742, 0.248],
          leftShoulder: [0.836, 0.298],
          rightShoulder: [0.728, 0.308],
          leftElbow: [0.809, 0.407],
          rightElbow: [0.659, 0.411],
          leftWrist: [0.689, 0.403],
          rightWrist: [0.629, 0.405],
          leftHip: [0.784, 0.5],
          rightHip: [0.703, 0.484],
        }),
      },
    ],
  },
  {
    id: "the-ambassadors",
    title: "The Ambassadors",
    artist: "Hans Holbein the Younger",
    year: 1533,
    // TODO: fact-check
    funFact: "The strange shape at the bottom is a hidden skull: look at it from the side to see it.",
    // TODO: fact-check
    history:
      "Before you stand two French ambassadors, painted by Hans Holbein in 1533. Notice the globes and instruments between them.",
    imageUrl: "/paintings/the-ambassadors.jpg",
    difficulty: "easy",
    signatureJoints: ["torso"],
    // Both figures found automatically by the pose picker.
    figures: [
      {
        id: "left",
        label: "Jean de Dinteville",
        anchor: { x: 0.251, y: 0.075 },
        targetPose: poseFromKeyJoints(1200, 1182, {
          nose: [0.251, 0.169],
          leftShoulder: [0.329, 0.248],
          rightShoulder: [0.164, 0.261],
          leftElbow: [0.383, 0.338],
          rightElbow: [0.118, 0.38],
          leftWrist: [0.447, 0.336],
          rightWrist: [0.17, 0.479],
          leftHip: [0.31, 0.484],
          rightHip: [0.222, 0.491],
          leftKnee: [0.329, 0.667],
          rightKnee: [0.225, 0.675],
          leftAnkle: [0.338, 0.822],
          rightAnkle: [0.185, 0.835],
        }),
      },
      {
        id: "right",
        label: "Georges de Selve",
        anchor: { x: 0.838, y: 0.092 },
        targetPose: poseFromKeyJoints(1200, 1182, {
          nose: [0.838, 0.186],
          leftShoulder: [0.932, 0.282],
          rightShoulder: [0.804, 0.26],
          leftElbow: [0.945, 0.391],
          rightElbow: [0.709, 0.306],
          leftWrist: [0.903, 0.478],
          rightWrist: [0.665, 0.233],
          leftHip: [0.883, 0.509],
          rightHip: [0.817, 0.504],
        }),
      },
    ],
  },
  {
    id: "romeo-and-juliet",
    title: "Romeo and Juliet",
    artist: "Ford Madox Brown",
    year: 1870,
    // TODO: fact-check
    funFact: "It shows the morning after their secret wedding, as Romeo leaves before he is caught.",
    // TODO: fact-check
    history:
      "Before you, Romeo and Juliet say goodbye at dawn, painted by Ford Madox Brown. Notice how tightly they hold each other.",
    imageUrl: "/paintings/romeo-and-juliet.jpg",
    difficulty: "hard",
    signatureJoints: ["torso"],
    // Both figures found automatically by the pose picker.
    figures: [
      {
        id: "left",
        label: "Juliet",
        upperBodyOnly: true,
        anchor: { x: 0.275, y: 0.165 },
        targetPose: poseFromKeyJoints(821, 1200, {
          nose: [0.275, 0.244],
          leftShoulder: [0.381, 0.289],
          rightShoulder: [0.201, 0.342],
          leftElbow: [0.515, 0.341],
          rightElbow: [0.362, 0.454],
          leftWrist: [0.43, 0.282],
          rightWrist: [0.513, 0.415],
          leftHip: [0.535, 0.466],
          rightHip: [0.459, 0.51],
          leftKnee: [0.727, 0.527],
          rightKnee: [0.649, 0.542],
          leftAnkle: [0.819, 0.712],
          rightAnkle: [0.763, 0.695],
        }),
      },
      {
        id: "right",
        label: "Romeo",
        anchor: { x: 0.291, y: 0.168 },
        targetPose: poseFromKeyJoints(821, 1200, {
          nose: [0.291, 0.24],
          leftShoulder: [0.417, 0.265],
          rightShoulder: [0.27, 0.345],
          leftElbow: [0.565, 0.313],
          rightElbow: [0.398, 0.453],
          leftWrist: [0.513, 0.265],
          rightWrist: [0.523, 0.415],
          leftHip: [0.597, 0.451],
          rightHip: [0.516, 0.506],
          leftKnee: [0.777, 0.49],
          rightKnee: [0.69, 0.584],
          leftAnkle: [0.853, 0.681],
          rightAnkle: [0.823, 0.73],
        }),
      },
    ],
  },
  {
    id: "mr-and-mrs-andrews",
    title: "Mr and Mrs Andrews",
    artist: "Thomas Gainsborough",
    year: 1750,
    // TODO: fact-check
    funFact: "Part of Mrs Andrews's lap was never finished; nobody knows what Gainsborough meant to paint there.",
    // TODO: fact-check
    history:
      "Before you are Mr and Mrs Andrews on their estate, painted by Thomas Gainsborough around 1750. Notice how relaxed he looks beside her bench.",
    imageUrl: "/paintings/mr-and-mrs-andrews.jpg",
    difficulty: "medium",
    signatureJoints: ["torso"],
    // Mr Andrews found automatically; Mrs Andrews found on a cropped copy of the image.
    figures: [
      {
        id: "left",
        label: "Mr Andrews",
        anchor: { x: 0.184, y: 0.111 },
        targetPose: poseFromKeyJoints(1200, 695, {
          nose: [0.184, 0.222],
          leftShoulder: [0.21, 0.326],
          rightShoulder: [0.131, 0.319],
          leftElbow: [0.211, 0.448],
          rightElbow: [0.097, 0.432],
          leftWrist: [0.192, 0.496],
          rightWrist: [0.111, 0.531],
          leftHip: [0.191, 0.56],
          rightHip: [0.15, 0.553],
          leftKnee: [0.175, 0.716],
          rightKnee: [0.142, 0.728],
          leftAnkle: [0.13, 0.861],
          rightAnkle: [0.128, 0.864],
        }),
      },
      {
        id: "right",
        label: "Mrs Andrews",
        upperBodyOnly: true,
        anchor: { x: 0.325, y: 0.251 },
        targetPose: poseFromKeyJoints(1200, 695, {
          nose: [0.325, 0.321],
          leftShoulder: [0.331, 0.385],
          rightShoulder: [0.295, 0.384],
          rightElbow: [0.29, 0.485],
          rightWrist: [0.317, 0.544],
          leftHip: [0.344, 0.558],
          rightHip: [0.318, 0.567],
          rightKnee: [0.369, 0.659],
          rightAnkle: [0.394, 0.819],
        }),
      },
    ],
  },
  {
    id: "the-jewish-bride",
    title: "The Jewish Bride",
    artist: "Rembrandt van Rijn",
    year: 1667,
    // TODO: fact-check
    funFact: "Van Gogh said he would give ten years of his life to sit in front of it for two weeks.",
    // TODO: fact-check
    history:
      "Before you is Rembrandt's Jewish Bride, painted in the late 1660s. Notice the groom's gentle hand resting near the bride's heart.",
    imageUrl: "/paintings/the-jewish-bride.jpg",
    difficulty: "medium",
    signatureJoints: ["leftForearm", "rightForearm"],
    // The Bride found automatically; the Groom found on a cropped copy of the image.
    figures: [
      {
        id: "left",
        label: "The Groom",
        upperBodyOnly: true,
        anchor: { x: 0.17, y: 0.054 },
        targetPose: poseFromKeyJoints(1200, 874, {
          nose: [0.17, 0.199],
          leftShoulder: [0.197, 0.331],
          rightShoulder: [0.052, 0.331],
          rightElbow: [0.099, 0.567],
          rightWrist: [0.259, 0.543],
          leftHip: [0.134, 0.661],
          rightHip: [0.062, 0.672],
          rightKnee: [0.096, 0.865],
        }),
      },
      {
        id: "right",
        label: "The Bride",
        upperBodyOnly: true,
        anchor: { x: 0.533, y: 0.154 },
        targetPose: poseFromKeyJoints(1200, 874, {
          nose: [0.533, 0.28],
          leftShoulder: [0.639, 0.379],
          rightShoulder: [0.485, 0.411],
          leftElbow: [0.674, 0.544],
          rightElbow: [0.468, 0.56],
          leftWrist: [0.601, 0.597],
          rightWrist: [0.493, 0.615],
          leftHip: [0.644, 0.616],
          rightHip: [0.541, 0.637],
          leftKnee: [0.709, 0.645],
          rightKnee: [0.503, 0.625],
          leftAnkle: [0.749, 0.817],
          rightAnkle: [0.571, 0.722],
        }),
      },
    ],
  },
  {
    id: "henry-viii",
    title: "Portrait of Henry VIII",
    artist: "After Hans Holbein the Younger",
    year: 1540,
    // TODO: fact-check
    funFact: "Holbein's original was destroyed when Whitehall Palace burned in 1698; this is a copy.",
    // TODO: fact-check
    history:
      "Before you stands King Henry the Eighth, after a portrait by Hans Holbein. Notice his wide stance and broad shoulders: pure royal power.",
    imageUrl: "/paintings/henry-viii.jpg",
    difficulty: "easy",
    signatureJoints: ["torso"],
    // Found automatically by the pose picker. Image: Wikimedia Commons.
    figures: [
      {
        id: "main",
        label: "King Henry VIII",
        anchor: { x: 0.53, y: 0.075 },
        targetPose: poseFromKeyJoints(682, 1200, {
          nose: [0.53, 0.163],
          leftShoulder: [0.677, 0.245],
          rightShoulder: [0.4, 0.241],
          leftElbow: [0.752, 0.323],
          rightElbow: [0.22, 0.29],
          leftWrist: [0.732, 0.368],
          rightWrist: [0.251, 0.378],
          leftHip: [0.621, 0.484],
          rightHip: [0.468, 0.482],
          leftKnee: [0.655, 0.675],
          rightKnee: [0.405, 0.678],
          leftAnkle: [0.717, 0.83],
          rightAnkle: [0.321, 0.837],
        }),
      },
    ],
  },
  {
    id: "lansdowne-washington",
    title: "George Washington",
    artist: "Gilbert Stuart",
    year: 1796,
    // TODO: fact-check
    funFact: "Gilbert Stuart also painted the Washington portrait used on the US one-dollar bill.",
    // TODO: fact-check
    history:
      "Before you stands George Washington, painted by Gilbert Stuart in 1796. Notice his outstretched arm, as if he is giving a speech.",
    imageUrl: "/paintings/lansdowne-washington.jpg",
    difficulty: "easy",
    signatureJoints: ["rightUpperArm", "rightForearm"],
    // Found automatically by the pose picker. Image: Wikimedia Commons.
    figures: [
      {
        id: "main",
        label: "George Washington",
        anchor: { x: 0.574, y: 0.128 },
        targetPose: poseFromKeyJoints(749, 1200, {
          nose: [0.574, 0.236],
          leftShoulder: [0.718, 0.336],
          rightShoulder: [0.485, 0.332],
          leftElbow: [0.773, 0.452],
          rightElbow: [0.353, 0.396],
          leftWrist: [0.78, 0.549],
          rightWrist: [0.204, 0.422],
          leftHip: [0.678, 0.58],
          rightHip: [0.539, 0.575],
          leftKnee: [0.712, 0.746],
          rightKnee: [0.549, 0.74],
          leftAnkle: [0.74, 0.905],
          rightAnkle: [0.575, 0.883],
        }),
      },
    ],
  },
  {
    id: "laughing-cavalier",
    title: "The Laughing Cavalier",
    artist: "Frans Hals",
    year: 1624,
    // TODO: fact-check
    funFact: "He isn't actually laughing: the title was made up in the 1800s.",
    // TODO: fact-check
    history:
      "Before you is Frans Hals's Laughing Cavalier, painted in 1624. Notice his hand on his hip and his proud, confident smile.",
    imageUrl: "/paintings/laughing-cavalier.jpg",
    difficulty: "easy",
    signatureJoints: ["rightUpperArm", "rightForearm"],
    // Found automatically by the pose picker. Image: Wikimedia Commons.
    figures: [
      {
        id: "main",
        label: "The Cavalier",
        upperBodyOnly: true,
        anchor: { x: 0.404, y: 0.11 },
        targetPose: poseFromKeyJoints(982, 1200, {
          nose: [0.404, 0.304],
          leftShoulder: [0.704, 0.436],
          rightShoulder: [0.299, 0.525],
          leftElbow: [0.864, 0.638],
          rightElbow: [0.253, 0.785],
          leftWrist: [0.789, 0.698],
          leftHip: [0.658, 0.997],
          rightHip: [0.374, 1.011],
        }),
      },
    ],
  },
  {
    id: "madame-x",
    title: "Madame X",
    artist: "John Singer Sargent",
    year: 1884,
    // TODO: fact-check
    funFact: "The portrait caused a scandal in Paris, and Sargent soon moved to London.",
    // TODO: fact-check
    history:
      "Before you stands Madame X, painted by John Singer Sargent in 1884. Notice how she turns her head proudly to the side.",
    imageUrl: "/paintings/madame-x.jpg",
    difficulty: "medium",
    signatureJoints: ["head", "torso"],
    // Found automatically by the pose picker. Image: Wikimedia Commons.
    figures: [
      {
        id: "main",
        label: "Madame X",
        anchor: { x: 0.558, y: 0.085 },
        targetPose: poseFromKeyJoints(634, 1200, {
          nose: [0.558, 0.197],
          leftShoulder: [0.347, 0.299],
          rightShoulder: [0.591, 0.298],
          leftElbow: [0.299, 0.424],
          rightElbow: [0.638, 0.422],
          leftWrist: [0.271, 0.52],
          rightWrist: [0.655, 0.519],
          leftHip: [0.466, 0.528],
          rightHip: [0.535, 0.523],
          rightKnee: [0.562, 0.695],
          leftAnkle: [0.547, 0.846],
          rightAnkle: [0.534, 0.835],
        }),
      },
    ],
  },
  {
    id: "little-dancer",
    title: "Little Dancer Aged Fourteen",
    artist: "Edgar Degas",
    year: 1880,
    // TODO: fact-check
    funFact: "Degas's original wax figure wore a real fabric tutu and a silk ribbon in her hair.",
    // TODO: fact-check
    history:
      "Before you stands Degas's Little Dancer, modelled around 1880. Notice her hands held behind her back and her chin held high.",
    imageUrl: "/paintings/little-dancer.jpg",
    difficulty: "medium",
    signatureJoints: ["leftUpperArm", "rightUpperArm"],
    // Found automatically by the pose picker. Image: Wikimedia Commons.
    figures: [
      {
        id: "main",
        label: "The Little Dancer",
        anchor: { x: 0.557, y: 0.101 },
        targetPose: poseFromKeyJoints(846, 1200, {
          nose: [0.557, 0.191],
          leftShoulder: [0.655, 0.275],
          rightShoulder: [0.504, 0.271],
          leftElbow: [0.651, 0.375],
          leftWrist: [0.652, 0.469],
          leftHip: [0.599, 0.46],
          rightHip: [0.51, 0.462],
          leftKnee: [0.593, 0.641],
          rightKnee: [0.453, 0.633],
          leftAnkle: [0.567, 0.801],
          rightAnkle: [0.354, 0.8],
        }),
      },
    ],
  },
  {
    id: "mona-lisa",
    title: "Mona Lisa",
    artist: "Leonardo da Vinci",
    year: 1503,
    // TODO: fact-check
    funFact: "In 1911 it was stolen from the Louvre and stayed missing for more than two years.",
    // TODO: fact-check
    history:
      "Before you sits the Mona Lisa, painted by Leonardo da Vinci. Notice her folded hands and that famous, mysterious smile.",
    imageUrl: "/paintings/mona-lisa.jpg",
    difficulty: "easy",
    signatureJoints: ["leftForearm", "rightForearm"],
    // Found automatically by the pose picker. Image: Wikimedia Commons.
    figures: [
      {
        id: "main",
        label: "Mona Lisa",
        upperBodyOnly: true,
        anchor: { x: 0.458, y: 0.02 },
        targetPose: poseFromKeyJoints(805, 1200, {
          nose: [0.458, 0.269],
          leftShoulder: [0.777, 0.507],
          rightShoulder: [0.307, 0.488],
          leftElbow: [0.821, 0.824],
          rightElbow: [0.092, 0.741],
          leftWrist: [0.398, 0.799],
          rightWrist: [0.278, 0.778],
          leftHip: [0.677, 0.998],
          rightHip: [0.377, 0.965],
        }),
      },
    ],
  },
  {
    id: "innocent-x",
    title: "Portrait of Innocent X",
    artist: "Diego Velázquez",
    year: 1650,
    // TODO: fact-check
    funFact: "The Pope is said to have called the portrait 'too true'.",
    // TODO: fact-check
    history:
      "Before you sits Pope Innocent the Tenth, painted by Velázquez in 1650. Notice his sharp, watchful eyes and the paper in his hand.",
    imageUrl: "/paintings/innocent-x.jpg",
    difficulty: "easy",
    signatureJoints: ["torso"],
    // Found automatically by the pose picker. Image: Wikimedia Commons.
    figures: [
      {
        id: "main",
        label: "Pope Innocent X",
        upperBodyOnly: true,
        anchor: { x: 0.445, y: 0.167 },
        targetPose: poseFromKeyJoints(1011, 1200, {
          nose: [0.445, 0.278],
          leftShoulder: [0.499, 0.362],
          rightShoulder: [0.276, 0.395],
          leftElbow: [0.627, 0.482],
          rightElbow: [0.189, 0.555],
          leftWrist: [0.789, 0.577],
          rightWrist: [0.358, 0.621],
          leftHip: [0.509, 0.601],
          rightHip: [0.412, 0.65],
          leftKnee: [0.698, 0.547],
          rightKnee: [0.54, 0.612],
        }),
      },
    ],
  },
];

/** How many people (figures) a painting has: 1 = solo, 2 = duet. */
export function figureCount(painting: Painting): number {
  return painting.figures.length;
}

/** Paintings with exactly one figure (the only ones 1 player may get). */
export const soloPaintings = paintings.filter((painting) => figureCount(painting) === 1);

/** Paintings with exactly two figures (for 2-player duets). */
export const duetPaintings = paintings.filter((painting) => figureCount(painting) === 2);
