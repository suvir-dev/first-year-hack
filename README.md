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

- [x] Museum-style gallery of 10 public-domain paintings with full-body poses
- [x] Two modes: **Single Painting**, and **Gallery Tour** (5 random one-person
      paintings, 15 seconds each, then a summary with every photo and the totals)
- [x] **2-player mode** on one camera: left person = Player 1, each with their own
      colour, name and live score; the winner is announced (a draw if within 2 points)
- [x] **Camera picker** on the start screen and behind the ⚙️ button: built-in,
      USB, iPhone (Continuity Camera), Camo/DroidCam; remembered between visits
- [x] Webcam starts, PoseLandmarker runs on every frame, skeleton drawn on the video
- [x] Pose scoring by joint angles: big live score, limbs coloured green / amber / red
- [x] A target pose for every painting (made with the pose picker, see below)
- [x] 3-2-1 countdown, then a webcam snapshot
- [x] Background removal, ornate gold frame, brass plaque with the score
- [x] Download the framed portrait as a PNG, then "Try another"

## Project structure

```
index.html            The game page: one <section> per screen
src/
  main.ts             App shell: screens, playRound(), camera loop, drawing
  camera.ts           Start/stop/switch/list cameras, friendly camera errors
  rounds.ts           Gallery Tour: pick 5 paintings, play rounds, add up scores
  players.ts          2-player mode: who is Player 1/2, who won
  players.test.ts     Sanity checks for players.ts (npm test)
  pose.ts             loadPoseModel(), detect(videoFrame), poseFromKeyJoints()
  scoring.ts          scorePose(player, target) → overall + per-joint scores
  scoring.test.ts     Sanity checks for scoring (npm test)
  paintings.ts        The 6 paintings: { id, title, artist, year, imageUrl, targetPose }
  composite.ts        Background removal + gold frame + plaque → canvas
  config.ts           All MediaPipe WASM/model URLs in one place
  style.css           Styling
public/
  paintings/          Painting images (served as /paintings/...)
tools/
  pose-picker.html    Developer tool for making target poses (not part of the game)
  pose-picker.ts
```

## Camera tips

- Pick the camera from the dropdown on the start screen, or press ⚙️ on any
  screen. Your choice is remembered next time (if that camera is plugged in).
- **iPhone + Mac:** with Continuity Camera, the iPhone simply appears in the
  list. **Other phones:** install a webcam app such as Camo or DroidCam.
- Stand back so your whole body is in the picture. In 2-player mode, Player 1
  stands on the left.

## Making a target pose (the pose picker)

Each painting in `src/paintings.ts` has a `targetPose`: where its person's
shoulders, elbows, wrists, hips, knees and ankles are, from 0 to 1 across and
down the image. To add a painting or fix a pose:

1. Put the image in `public/paintings/` and add an entry to `src/paintings.ts`
   (`targetPose: null` for now).
2. With `npm run dev` running, open http://localhost:5173/tools/pose-picker.html
   and choose the painting.
3. It tries to find the pose automatically. On paintings this often fails or
   gets some joints wrong (it worked on 2 of our 6). Fix a joint by clicking
   its name on the right, then clicking where it belongs. If a joint is hidden
   in the painting, select it and press "Selected joint isn't visible".
   "Left" and "right" mean the person's own left and right.
4. Press **Copy** and paste over the `targetPose` line in `src/paintings.ts`.

Joints you leave out are simply skipped when scoring.

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

- **Person A: camera, pose, scoring, players** (`camera.ts`, `pose.ts`, `scoring.ts`, `players.ts`)
- **Person B: paintings, composite, rounds, UI screens** (`paintings.ts`, `composite.ts`, `rounds.ts`, `main.ts`, `index.html`, `style.css`, `public/paintings/`)

The modules only talk to each other through these functions and types, so if
you keep the signatures the same, the other person's code keeps working:

| Function / type                                        | File          | Used by                  |
| ------------------------------------------------------ | ------------- | ------------------------ |
| `startCamera(video)`, `stopCamera(video)`              | camera.ts     | main.ts                  |
| `loadPoseModel()`, `detect(video)`, `DetectedPose`, `poseFromKeyJoints()` | pose.ts | main.ts, scoring.ts, paintings.ts, pose picker |
| `scorePose(player, target): PoseScore`, `ScoreSmoother`, `JOINTS` | scoring.ts | main.ts         |
| `paintings`, `Painting`                                | paintings.ts  | main.ts, composite.ts    |
| `loadSegmenter()`, `createFramedResult(photo, painting, score)` | composite.ts | main.ts         |

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
