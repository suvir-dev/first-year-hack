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

- [x] Museum-style gallery of public-domain artworks: **solo** paintings (one
      figure) and **duet** paintings (two figures)
- [x] Two modes: **Single Painting**, and **Gallery Tour** (5 random one-person
      paintings, 15 seconds each, then a summary with every photo and the totals)
- [x] **2-player mode** on one camera: left person = Player 1, each with their own
      colour, name and live score; the winner is announced (a draw if within 2 points)
- [x] **Duets**: on 2-figure paintings each player copies their own figure (left
      player = left figure, "Swap figures" to change), with name tags on the
      painting and per-figure results. 1 player never gets a duet.
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

## Narration audio (Piper)

Each painting's history is read by a pre-made voice: one `.m4a` file per
sentence in `public/narration/`, made offline with [Piper](https://github.com/rhasspy/piper)
(listed in `public/narration/manifest.json`). If the files are missing, the
browser's own voice is used instead.

One-time setup (already done on Sachin's Mac):

```bash
python3 -m venv tools/.venv
tools/.venv/bin/pip install piper-tts
tools/.venv/bin/python -m piper.download_voices --download-dir tools/piper-voices \
  en_GB-cori-high en_GB-jenny_dioco-medium en_GB-southern_english_female-low
```

After editing a painting's `history` (only changed sentences are re-made):

```bash
npm run narration
```

With another voice (re-makes everything):

```bash
node tools/export-narration.mjs
tools/.venv/bin/python tools/generate_narration.py --voice en_GB-jenny_dioco-medium
```

Voice licences are in `CREDITS.md` ("Narration voice").

## Camera tips

- Pick the camera from the dropdown on the start screen, or press ⚙️ on any
  screen. Your choice is remembered next time (if that camera is plugged in).
- **iPhone + Mac:** with Continuity Camera, the iPhone simply appears in the
  list. **Other phones:** install a webcam app such as Camo or DroidCam.
- Stand back so your whole body is in the picture. In 2-player mode, Player 1
  stands on the left.

## Making figures (the pose picker)

Each painting in `src/paintings.ts` has a `figures` list: one figure (solo)
or two (duet; the first is the LEFT person). Each figure has a `label`
("The Husband"), an `anchor` (where its name tag goes, just above the head)
and a `targetPose`: where its shoulders, elbows, wrists, hips, knees and
ankles are, from 0 to 1 across and down the image. Paintings with 3 or more
people aren't allowed. To add a painting or fix a pose:

1. Put the image in `public/paintings/` and add an entry to `src/paintings.ts`
   (`targetPose: null` for now).
2. With `npm run dev` running, open http://localhost:5173/tools/pose-picker.html
   and choose the painting.
3. Choose "1 (solo)" or "2 (duet)". It tries to find the pose(s) automatically. On paintings this often fails or
   gets some joints wrong (it worked on 2 of our 6). Fix a joint by clicking
   its name on the right, then clicking where it belongs. If a joint is hidden
   in the painting, select it and press "Selected joint isn't visible".
   "Left" and "right" mean the person's own left and right.
4. Type each figure's label and press "Set name-tag position", then click just
   above its head.
5. Press **Copy** and paste over the `figures: [...]` block in `src/paintings.ts`.

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

## Higher or Lower: Art vs Music (by Swarit)

The second game on the site (open `#/higher-lower`). Its code is in
`src/games/higher-lower/` (React), its data in `data/wiki/` and its artwork
images in `public/art/`.

A React and Vite Higher or Lower game comparing paintings and sculptures with songs from the supplied Spotify CSV. The score metric is **Wikipedia article views from January 1, 2016 through December 31, 2025**, summed across linked Wikipedia language editions and desktop/mobile access.

### Install and play

Use Node.js 22.12 or newer and npm. The app opens at Vite’s root URL.

```sh
npm ci
npm run dev
npm run test:higher-lower
npm run build
npm run preview
```

The repository includes the generated deck, the source snapshot, and local artwork assets. Players need no credentials or metadata API calls. Browser-local scores are stored under `art-vs-music.wikipedia-2016-2025.scores`, separate from the earlier song-stream game.

Run browser verification with an installed Google Chrome.

```sh
PLAYWRIGHT_CHANNEL=chrome npm run test:browser -- --timeout=60000
```

Alternatively, run `npx playwright install chromium` and then `npm run test:browser -- --timeout=60000`.

### Rules

- Every run opens with art on the left and music on the right. The left count is known and the right count is hidden.
- Guess whether the right item has higher or lower Wikipedia views. Correct guesses earn one point. Mistakes break one of three hearts.
- After each reveal, **Next round** promotes the right item to the left after both correct and incorrect guesses. The new challenger comes from the opposite category, so art and music alternate sides.
- The 🔥 counter tracks consecutive correct answers. Every fourth correct answer repairs one broken heart as ❤️‍🩹, up to three lives. Mistakes reset the streak.
- The final mistake reveals the last count. **Show results** opens the leaderboard and username entry. Sample scores are marked. Saved scores remain in the current browser.
- **Play again** resets score, hearts, difficulty, streak, and history. It avoids repeating the previous opening pair when alternatives exist.
- The rules popup closes with ×, Escape, or a click outside it. The speaker icon toggles the original instrumental loop, which starts on the first click or keypress. Correct guesses play a short original chime.
- Reduced motion shows final counts immediately and disables the slide/reveal animations.

Difficulty uses `abs(log(challenger.views / anchor.views))`. The four ratio bands are at least 1.8, 1.4–under 1.8, 1.15–under 1.4, and greater than 1–under 1.15. Start at the widest band, move one band closer after success, and ease one band after a miss. Exclude same-category and equal-count items, prefer unseen eligible items, and randomly choose in the requested band. If it is empty, use the eligible items nearest its boundaries. Previously seen items cycle back once the unseen pool is exhausted.

### Data and provenance

The bundled snapshot was collected on November 21, 2026. It contains 100 artworks and 100 songs, with 100 local art images and 5,444 linked language-article series across 192 Wikipedia editions. Of those series, 115 had no recorded views for the requested window. Art totals range from 76,569 to 81,509,164, and song totals range from 125,600 to 8,639,524. The generated [audit report](data/wiki/report.json) lists the selection and exclusions.

The music candidate list in `data/wiki/music-candidates.json` comes from the original 120-track deck, with title and artist membership checked against the supplied 599-row CSV. That CSV’s SHA-256 is `982928c9d71a66f5e66ae378132df24cb0107107693f3f131f65c5185d34f131`. The parser handles the BOM, CRLF, quoted commas, blank lines, and duplicate titles/artists. It uses the source’s 2010–2019 year field for membership. Displayed release dates come from reviewed Wikipedia/Wikidata metadata and can differ from that field. [Original CSV](https://raw.githubusercontent.com/Demibolt007/Spotify-Streaming-Insights-2010-2019/main/Spotify%20Dataset.csv)

Songs must resolve to dedicated Wikipedia articles. Ambiguous pages, unrelated recordings, and remixes without separately verified coverage are excluded in the collector or display overrides. Radio-edit rows identify their underlying song article, and the game shows the base song title. Views measure the whole article. The original CSV’s stream, chart, playlist, and popularity columns do not contribute to the new game metric.

Art candidates in `data/wiki/art-candidates.json` cover historic paintings and sculptures, with individual article and image matching. Broader topics, artist pages, series without a single verified work, and uncleared artwork images are excluded. Art dates are labeled **Created**, with **Unveiled** for the documented public unveilings in the reviewed overrides. Approximate dates and ranges retain their uncertainty.

The collector resolves each candidate to a Wikidata ID and retrieves every Wikipedia language sitelink recognized by Wikimedia’s site matrix, including Simple English. It requests each linked article with `all-access`, `user`, and monthly granularity for the full 2016–2025 range. These are page views including repeat visits. The API’s human-classified traffic filter excludes recognized automated traffic. [Wikimedia metric definition](https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/concepts/page-views.html)

The snapshot uses the **currently linked language article titles at collection time**. Historical views left under earlier titles after page moves, deleted/unlinked articles, and separate articles for the same work outside those sitelinks are not reconstructed. A language article created after 2016 contributes only its available history. Missing monthly buckets and explicit API no-data responses contribute zero recorded views and are retained in the audit snapshot. HTTP errors and unexpected response schemas stop collection. [Wikimedia API reference](https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/reference/page-views.html)

Each candidate needs at least 10,000 views over the period. For each category, the builder sorts by descending total views and Wikidata ID, then selects 100 evenly spaced positions through that ordering. This includes major headliners and quieter works. It verifies every total against all 120 monthly buckets for every linked language, checks CSV membership and image checksums, and rejects a deck unable to supply a non-tied cross-category matchup.

The authoritative collection dates, row counts, view ranges, exclusions, and selected IDs are generated into `data/wiki/report.json`. The metadata and monthly data are in `metadata.json`, the `views.json` manifest, and its smaller `views-*.json` record files. Only the compact `src/games/higher-lower/deck.json` enters the JavaScript bundle. Wikimedia statistics are CC0. [Wikimedia access policy](https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/documentation/access-policy.html)

### Regenerate or update the snapshot

The source CSV is already in the original project folder. On a fresh checkout, download it first.

```sh
curl -fL 'https://raw.githubusercontent.com/Demibolt007/Spotify-Streaming-Insights-2010-2019/main/Spotify%20Dataset.csv' -o 'Spotify Dataset.csv'
```

From the project root, rebuild the same deck offline from the committed source snapshot.

```sh
npm run data:build -- 'Spotify Dataset.csv'
```

To collect a fresh snapshot, run these stages in order. They require internet access and can take time across thousands of language articles. Successful JSON responses are cached under ignored `.cache/wiki/`; rerunning a failed stage resumes from those cached responses.

```sh
npm run data:collect -- 'Spotify Dataset.csv' metadata
npm run data:collect -- 'Spotify Dataset.csv' images
npm run data:collect -- 'Spotify Dataset.csv' views
npm run data:build -- 'Spotify Dataset.csv'
npm run test:higher-lower
npm run build
```

To refresh data that is already cached, move `.cache/wiki/` aside before recollecting. Review the updated metadata, view ranges, and image licenses before committing. Edit candidate article mappings to resolve identity problems. Use `data/wiki/display-overrides.json` for reviewed names, date ranges, or exclusions, with the canonical English article as the key. Its source reference is the corresponding article URL recorded in the deck.

### Artwork

Music cards use original vinyl sleeves with stable per-song colors and patterns. Art cards load local files from `public/art/`, preserving the full painting or sculpture image with `object-fit: contain`.

Commons records in `data/wiki/images.json` preserve the file source URL, creator/photographer attribution, license and license URL when provided, and SHA-256. Expand **Image credit** under an art card for attribution and its Commons source link. Images are unmodified downloaded thumbnails. The snapshot accepts public-domain, CC0, CC BY, and CC BY-SA images. An unavailable image displays a designed fallback with the work’s metadata.

### Review and push

The app lives in the original IntelliJ project folder on `high_low_game`, tracking `origin/high_low_game`. Existing edits to `ideas.txt` or `tasks.txt` can be staged independently. Review the feature files in IntelliJ or scope the Git commands to them.

```sh
git branch --show-current
git status --short
feature_files=(.gitignore README.md index.html package.json package-lock.json playwright.config.js data scripts src test public/art)
git add -A -- "${feature_files[@]}"
git diff --cached --check -- "${feature_files[@]}"
git diff --cached --stat -- "${feature_files[@]}"
git commit --only -m "Build Art vs Music Wikipedia views game" -- "${feature_files[@]}"
git push origin high_low_game
```

Created by Swarit Kapoor.
