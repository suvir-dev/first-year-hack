// audio.ts  (owner: Person B)
// ---------------------------------------------------------------------------
// Background music and sound effects.
//
// LICENSING: only music that is legally free for a public demo! The file
// public/audio/gallery.mp3 must be a public-domain (CC0) or CC BY recording
// (see public/audio/README.md and CREDITS.md). If the file is missing, we
// GENERATE soft classical-style music right here in the browser with the
// Web Audio API instead, so there is never any licensing risk.
//
// Everything goes through one volume knob (a Web Audio "GainNode"), which
// lets us fade smoothly, mute, and "duck" (turn the music down while the
// narrator speaks).
// ---------------------------------------------------------------------------

const MUSIC_URL = "/audio/gallery.mp3";
/** Normal music volume (0..1). Quiet: it's background music. */
const MUSIC_VOLUME = 0.3;
/** While the narrator speaks, the music plays at this fraction of normal. */
const DUCKED_FRACTION = 0.25;
/** Seconds to fade in/out. */
const FADE_SECONDS = 1;
const STORAGE_KEY = "strike-a-pose.music-muted";

let ctx: AudioContext | null = null;
/** The music's volume knob. Both the mp3 and the generated music go through it. */
let musicVolume: GainNode | null = null;
let muted = readMuted();
let ducked = false;
let generatedMusicStarted = false;

// --- Remember mute (localStorage can throw, e.g. in private windows) ---------

function readMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function saveMuted(): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(muted));
  } catch {
    // ignore: remembering is just a convenience
  }
}

export function isMuted(): boolean {
  return muted;
}

// --- Starting the music ----------------------------------------------------------

/**
 * Start the background music. Browsers only allow sound after the user has
 * clicked something, so call this from a click (the intro button).
 */
export function startMusic(): void {
  if (ctx) return; // already started
  ctx = new AudioContext();
  musicVolume = ctx.createGain();
  musicVolume.gain.value = 0; // start silent, then fade in
  musicVolume.connect(ctx.destination);

  // Try the mp3 file first.
  const audio = new Audio(MUSIC_URL);
  audio.loop = true;
  audio.addEventListener("error", startGeneratedMusic, { once: true }); // missing / broken file
  ctx.createMediaElementSource(audio).connect(musicVolume);
  audio.play().catch(startGeneratedMusic);

  fadeTo(targetVolume());
}

/** The volume the music should have right now. */
function targetVolume(): number {
  if (muted) return 0;
  return MUSIC_VOLUME * (ducked ? DUCKED_FRACTION : 1);
}

/** Smoothly change the music volume over FADE_SECONDS (no abrupt cuts). */
function fadeTo(volume: number, seconds = FADE_SECONDS): void {
  if (!ctx || !musicVolume) return;
  const now = ctx.currentTime;
  const knob = musicVolume.gain;
  knob.cancelScheduledValues(now);
  knob.setValueAtTime(knob.value, now);
  knob.linearRampToValueAtTime(volume, now + seconds);
}

/** Mute or unmute (remembered for next time). */
export function setMuted(value: boolean): void {
  muted = value;
  saveMuted();
  fadeTo(targetVolume());
}

/** Turn the music down while the narrator talks, and back up afterwards. */
export function duckMusic(on: boolean): void {
  ducked = on;
  fadeTo(targetVolume(), 0.8);
}

// --- The generated fallback music --------------------------------------------------
// Slow arpeggios over four chords (C major, A minor, F major, G major), played
// with a soft triangle tone through an echo, which sounds a bit like a
// gentle piano in a big hall. 100% made by our own code: no licence needed.

// Notes as MIDI numbers (60 = middle C). Each chord: 4 notes.
const CHORDS = [
  [60, 64, 67, 72], // C major
  [57, 60, 64, 69], // A minor
  [53, 57, 60, 65], // F major
  [55, 59, 62, 67], // G major
];
/** Which chord note to play on each of the 8 steps of a chord. */
const PATTERN = [0, 1, 2, 3, 2, 1, 2, 1];
const STEP_SECONDS = 0.55;

function startGeneratedMusic(): void {
  if (!ctx || !musicVolume || generatedMusicStarted) return;
  generatedMusicStarted = true;
  console.info(
    "No public/audio/gallery.mp3 found: playing generated music instead (see public/audio/README.md).",
  );

  // A soft filter (takes the edge off) and an echo (a "reverb-like" delay).
  const music = ctx.createBiquadFilter();
  music.type = "lowpass";
  music.frequency.value = 1800;
  const echo = ctx.createDelay();
  echo.delayTime.value = 0.42;
  const echoFeedback = ctx.createGain();
  echoFeedback.gain.value = 0.35; // each echo is 35% as loud as the one before
  music.connect(musicVolume);
  music.connect(echo);
  echo.connect(echoFeedback);
  echoFeedback.connect(echo);
  echo.connect(musicVolume);

  // A tiny scheduler: every 100 ms, book the notes for the next 0.4 s.
  let step = 0;
  let nextNoteTime = ctx.currentTime + 0.1;
  window.setInterval(() => {
    if (!ctx) return;
    while (nextNoteTime < ctx.currentTime + 0.4) {
      const chord = CHORDS[Math.floor(step / PATTERN.length) % CHORDS.length];
      const note = chord[PATTERN[step % PATTERN.length]];
      playNote(music, note, nextNoteTime, 1.8, 0.16);
      // A low bass note at the start of each chord.
      if (step % PATTERN.length === 0) playNote(music, chord[0] - 12, nextNoteTime, 4.4, 0.12);
      nextNoteTime += STEP_SECONDS;
      step++;
    }
  }, 100);
}

/** Frequency in Hz of a MIDI note number (A4 = 69 = 440 Hz). */
function midiToHz(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

/** One soft note: quick fade in, slow fade out. */
function playNote(output: AudioNode, note: number, start: number, seconds: number, loudness: number): void {
  if (!ctx) return;
  const tone = ctx.createOscillator();
  tone.type = "triangle";
  tone.frequency.value = midiToHz(note);
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(loudness, start + 0.06);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  tone.connect(envelope);
  envelope.connect(output);
  tone.start(start);
  tone.stop(start + seconds + 0.05);
}

// --- Celebration chime ------------------------------------------------------------

/** A short, elegant three-note chime (for scores of 90+). */
export function playChime(): void {
  if (!ctx || muted) return;
  const notes = [88, 91, 96]; // E6, G6, C7
  notes.forEach((note, i) => {
    if (!ctx) return;
    const start = ctx.currentTime + i * 0.09;
    const tone = ctx.createOscillator();
    tone.type = "sine";
    tone.frequency.value = midiToHz(note);
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(0.12, start + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + 1.4);
    tone.connect(envelope);
    envelope.connect(ctx.destination); // not through the music knob: not ducked
    tone.start(start);
    tone.stop(start + 1.5);
  });
}

/** A very soft "ding", like a museum audio guide, before the narrator speaks. */
export function playGuideChime(): void {
  if (!ctx || muted) return;
  const start = ctx.currentTime;
  // A bell-like sound: a note plus a quieter note one octave higher.
  for (const [note, loudness] of [[84, 0.07], [96, 0.025]]) {
    const tone = ctx.createOscillator();
    tone.type = "sine";
    tone.frequency.value = midiToHz(note);
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(loudness, start + 0.015);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + 1.6);
    tone.connect(envelope);
    envelope.connect(ctx.destination);
    tone.start(start);
    tone.stop(start + 1.7);
  }
}
