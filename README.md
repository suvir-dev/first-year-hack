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
| `npm test`          | Runs the checks in `tests/` (scoring, 2-player logic) |
| `npm run typecheck` | Checks the TypeScript for errors without building     |
| `npm run build`     | Type-checks, then builds the final site into `dist/`  |
| `npm run preview`   | Serves the built `dist/` folder locally               |

## What works so far

- [x] Museum-style gallery of 10 public-domain paintings with full-body poses
- [x] Two modes: **Single Painting**, and **Gallery Tour** (5 random one-person
      paintings, 15 seconds each, then a summary with every photo and the totals)
- [x] **2-player mode** on one camera: left person = Player 1, each with their own
      colour, name and live score; the winner is announced (a draw if within 2 points)
- [x] **Museum atmosphere**: animated intro, dark gallery wall, spotlight sweep
      when a round starts, a placard with a fun fact beside each painting
- [x] **Background music** (🎵 to mute): `public/audio/gallery.mp3` if you add one
      (see `public/audio/README.md` for the licensing rules), otherwise soft
      music generated in the browser. A chime plays when someone reaches 90+.
- [x] **History narration** (🔊 to turn off): a museum-guide voice tells each
      painting's story while you pose, with subtitles; the music dips meanwhile
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
  audio.ts            Background music (file or generated), fades, ducking, chime
  narrator.ts         Reads each painting's history aloud (Web Speech API)
  players.ts          2-player mode: who is Player 1/2, who won

  pose.ts             loadPoseModel(), detect(videoFrame), poseFromKeyJoints()
  scoring.ts          The scoring maths: features, weights, prepareTarget(), scorePose()
  smoothing.ts        Steady scores over time: landmark smoothing, live score, best 1-second hold
  hints.ts            One plain-words tip for the worst limb
  landmarks.ts        Pose data helpers (no MediaPipe): KEY_JOINTS, poseFromKeyJoints(), mirrorPose()
  paintings.ts        The 6 paintings: { id, title, artist, year, imageUrl, targetPose }
  composite.ts        Background removal + gold frame + plaque → canvas
  config.ts           All MediaPipe WASM/model URLs in one place
  style.css           Styling
public/
  paintings/          Painting images (served as /paintings/...)
tests/
  scoring.test.ts     Scoring checks (npm test)
  players.test.ts     2-player checks (npm test)
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

We describe a pose by **angles**, which don't change when you stand further
away or to one side. All maths is done in real **pixels** (x × width,
y × height) of the webcam and of the painting image, so a wide 16:9 webcam
doesn't squash the angles.

1. **18 features** are measured on you and on the painting:
   - 10 **limb directions** (which way a limb points, via `atan2`): both upper
     arms, forearms, thighs and shins, the torso and the head tilt.
   - 8 **joint angles** (how bent a joint is): both elbows, shoulders, hips and knees.
   Directions are needed because an arm pointing up and an arm pointing down
   both have a straight (180°) elbow.
2. Each feature compares your angle with the painting's, the short way round
   (350° vs 10° = 20°), and turns the difference into points with a bell curve:
   `100 × e^-(difference / tolerance)²`. With tolerance 25°: 5° off → 96,
   15° off → 70, 25° off → 37, 40° off → 8.
3. **Weighted average**: arms and torso count 1.5, legs 1, head 0.5. Each
   painting's **signature limbs** (e.g. Napoleon's pointing arm) count double.
4. **No free points**: a limb the painting shows but the camera can't see
   clearly scores 0. If less than 70% of the pose is visible you're asked to
   step back. Paintings marked `upperBodyOnly` ignore the legs.
5. **Mirror images count**: we also score your pose flipped left-to-right and
   keep the better result, because people copy paintings like a mirror.
6. **Steady over time**: body points are smoothed before scoring, the live
   number is the average of the last 0.5 s, and your **final score is your best
   1-second hold** (a lucky single frame isn't enough).

Each limb on the skeleton is green (≥ 80), amber (50–79) or red (< 50), and one
plain-words tip ("Raise your right arm higher") points at your worst limb.
Press **S** during a round for a debug overlay with every feature's numbers.

### Too strict or too easy? Constants to tweak

| What | Where | Effect |
| ---- | ----- | ------ |
| `TOLERANCE_DEGREES` (easy 30, medium 25, hard 20) | `src/scoring.ts` | Bigger = more forgiving per limb. The main knob. |
| `MIN_VISIBILITY` (0.6) | `src/scoring.ts` | Lower = limbs count as "seen" more easily. |
| `IN_FRAME_FRACTION` (0.7) | `src/scoring.ts` | Lower = "step back" appears less often. |
| `ARM`, `TORSO`, `LEG`, `HEAD`, `SIGNATURE_WEIGHT` | `src/scoring.ts` | How much each body part counts. |
| `upperBodyOnly`, `signatureJoints` | `src/paintings.ts` | Per painting: ignore legs, or make key limbs count double. |
| `LANDMARK_SMOOTHING` (0.5) | `src/smoothing.ts` | Lower = steadier but slower to follow you. |
| `LIVE_WINDOW_MS` (500), `HOLD_WINDOW_MS` (1000) | `src/smoothing.ts` | Live-score averaging, and how long you must hold the pose. |

## Who works on what

To avoid merge conflicts, each person only edits their own files:

- **Person A: camera, pose, scoring, players** (`camera.ts`, `pose.ts`, `landmarks.ts`, `scoring.ts`, `smoothing.ts`, `hints.ts`, `players.ts`)
- **Person B: paintings, composite, rounds, sound, UI screens** (`paintings.ts`, `composite.ts`, `rounds.ts`, `audio.ts`, `narrator.ts`, `main.ts`, `index.html`, `style.css`, `public/`)

The modules only talk to each other through these functions and types, so if
you keep the signatures the same, the other person's code keeps working:

| Function / type                                        | File          | Used by                  |
| ------------------------------------------------------ | ------------- | ------------------------ |
| `startCamera(video)`, `stopCamera(video)`              | camera.ts     | main.ts                  |
| `loadPoseModel()`, `detect(video)`, `DetectedPose`, `poseFromKeyJoints()` | pose.ts | main.ts, scoring.ts, paintings.ts, pose picker |
| `prepareTarget()`, `scorePose(player, target): PoseScore` | scoring.ts | main.ts, hints.ts |
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
