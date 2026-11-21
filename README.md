# Strike a Pose, Old Masters

Pick a famous public-domain painting, copy the pose in front of your webcam,
and get a live similarity score out of 100. At the end your photo is put in an
ornate gold frame with the caption **"You, after <Artist>"**.

Everything runs in the browser: no backend, no API keys. Pose detection and
background removal use Google's [MediaPipe](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker)
(`@mediapipe/tasks-vision`), and everything is drawn on an HTML `<canvas>`.

## Running it

You need [Node.js](https://nodejs.org) version 20.19 or newer (the "LTS"
download is fine). Check with `node -v`.

```bash
npm install      # once, downloads the libraries into node_modules/
npm run dev      # starts the dev server
```

Open the address it prints (http://localhost:5173) in Chrome, Edge or
Firefox and allow camera access.

> The camera only works on `http://localhost` or `https://`. Opening the page
> through your computer's IP address (e.g. `http://192.168.1.5:5173`) will not
> get camera access.

Other commands:

| Command             | What it does                                         |
| ------------------- | ---------------------------------------------------- |
| `npm test`          | Runs the scoring sanity checks (`src/scoring.test.ts`) |
| `npm run typecheck` | Checks the TypeScript for errors without building     |
| `npm run build`     | Type-checks, then builds the final site into `dist/`  |
| `npm run preview`   | Serves the built `dist/` folder locally               |

## What works so far

- [x] Gallery: pick a painting (plain buttons for now)
- [x] Webcam starts, PoseLandmarker runs on every frame, skeleton drawn on the video
- [x] Pose scoring by joint angles: big live score, limbs coloured green / amber / red
- [x] Flow through all four screens: gallery → challenge → countdown → result
- [x] Painting images (4 public-domain paintings, sources in `public/paintings/README.md`)
- [ ] Target poses for each painting (for now: press **T** on the challenge
      screen to use your current pose as the target)
- [ ] 3-2-1 countdown
- [ ] Background removal + gilt frame (`src/composite.ts` only writes the caption)

## Project structure

```
index.html            The page: one <section> per screen
src/
  main.ts             App shell: switches screens, runs the camera loop, draws the skeleton
  camera.ts           startCamera(video) / stopCamera(video)
  pose.ts             loadPoseModel() and detect(videoFrame) using PoseLandmarker
  scoring.ts          scorePose(player, target) → overall + per-joint scores
  scoring.test.ts     Sanity checks for scoring (npm test)
  paintings.ts        The list of paintings: { id, title, artist, imageUrl, targetPose }
  composite.ts        createFramedResult(photo, painting) → canvas  (stub)
  config.ts           All MediaPipe WASM/model URLs in one place
  style.css           Styling
public/
  paintings/          Painting images (served as /paintings/...)
```

Search the code for `TODO` to find what's left to do. Each TODO says who it
belongs to.

## How the score works

We compare **joint angles**, not positions, so it doesn't matter how far
you stand from the camera or where you are in the picture.

1. For 8 joints (both elbows, shoulders, hips and knees) we measure the angle
   at the joint from three landmarks, e.g. shoulder → elbow → wrist.
2. Each joint scores **100** if your angle equals the painting's, falling in
   a straight line to **0** at 60° or more off.
3. The score is the average of the joints we can see clearly (visibility ≥ 0.5),
   so a portrait without legs is scored on the arms only.
4. We also try the pose mirrored (left ↔ right) and keep the better score.
5. The number on screen is the average of the last 10 frames, so it doesn't
   flicker.

Each limb is drawn green (≥ 70), amber (40–69) or red (< 40) using the
worse of the two joints at its ends. The details are in the comments in
`src/scoring.ts`.

## Who works on what

To avoid merge conflicts, each person only edits their own files:

- **Person A: camera, pose, scoring** (`camera.ts`, `pose.ts`, `scoring.ts`)
- **Person B: paintings, composite, UI screens** (`paintings.ts`, `composite.ts`, `main.ts`, `index.html`, `style.css`, `public/paintings/`)

The modules only talk to each other through these functions and types, so if
you keep the signatures the same, the other person's code keeps working:

| Function / type                                        | File          | Used by                  |
| ------------------------------------------------------ | ------------- | ------------------------ |
| `startCamera(video)`, `stopCamera(video)`              | camera.ts     | main.ts                  |
| `loadPoseModel()`, `detect(video)`, `DetectedPose`     | pose.ts       | main.ts, scoring.ts, paintings.ts |
| `scorePose(player, target): PoseScore`, `ScoreSmoother`, `JOINTS` | scoring.ts | main.ts         |
| `paintings`, `Painting`                                | paintings.ts  | main.ts, composite.ts    |
| `createFramedResult(photo, painting)`                  | composite.ts  | main.ts                  |

`main.ts` already calls `scorePose()` every frame, so Person A never needs to
edit `main.ts` to get the score on screen. If you need to change a shared
signature, tell the other person first.

## If the Wi-Fi fails

By default the MediaPipe files load from the internet (see `src/config.ts`).
To run fully offline, download them **while you still have internet**:

```bash
mkdir -p public/mediapipe
cp -r node_modules/@mediapipe/tasks-vision/wasm public/mediapipe/wasm
curl -L -o public/mediapipe/pose_landmarker_lite.task \
  https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task
curl -L -o public/mediapipe/selfie_segmenter.tflite \
  https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite
```

Then set `USE_LOCAL_FILES = true` in `src/config.ts`. (`public/mediapipe/` is
in `.gitignore` because the files are large; each person downloads their own.)

## Contributors

- Swarit Kapoor
