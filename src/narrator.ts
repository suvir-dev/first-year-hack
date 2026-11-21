// narrator.ts  (owner: Person B)
// ---------------------------------------------------------------------------
// A calm museum audio guide that tells the painting's story while you pose.
//
// Uses the browser's built-in speech (the Web Speech API,
// window.speechSynthesis): no API key, nothing to install, no licensing.
// If a browser doesn't have it, narration is simply skipped.
// ---------------------------------------------------------------------------

const ENABLED_KEY = "strike-a-pose.narration-off";
const VOICE_KEY = "strike-a-pose.voice";

// Delivery: slow, slightly low and soft, like a gallery audio guide.
const RATE = 0.85;
const PITCH = 0.95;
const VOLUME = 0.9;
/** Quiet pause between sentences (milliseconds). */
const PAUSE_MS = 400;
/** Time for the "ding" before the first sentence (milliseconds). */
const DING_MS = 700;

/** The browser's speech engine, or null if this browser has none. */
const speech: SpeechSynthesis | null = "speechSynthesis" in window ? window.speechSynthesis : null;

let enabled = readSetting(ENABLED_KEY) !== "true";
/** The voice the user picked in Settings ("" = choose automatically). */
let preferredVoiceName = readSetting(VOICE_KEY) ?? "";
/** Goes up every time narration starts or stops, so old callbacks are ignored. */
let narrationId = 0;

// --- Settings (localStorage can throw, e.g. in private windows) ------------------

function readSetting(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function saveSetting(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore: remembering is just a convenience
  }
}

export function isNarrationOn(): boolean {
  return enabled;
}

export function setNarrationOn(on: boolean): void {
  enabled = on;
  saveSetting(ENABLED_KEY, String(!on));
  if (!on) stopNarration();
}

/** Remember the voice chosen in Settings ("" = automatic). */
export function setPreferredVoice(name: string): void {
  preferredVoiceName = name;
  saveSetting(VOICE_KEY, name);
}

export function preferredVoice(): string {
  return preferredVoiceName;
}

// --- Choosing a voice -------------------------------------------------------------

/** Calm voices we like, best first (names differ between Mac, Windows, Chrome). */
const NICE_VOICES = [
  "Serena",
  "Daniel",
  "Kate",
  "Martha",
  "Google UK English Female",
  "Google UK English Male",
];

/**
 * A ranking number for a voice: lower is better.
 *   0–1   "Premium" / "Enhanced" / "Natural" voices (they sound most human)
 *   10+   our list of calm British voices, in order
 *   50    any British English voice
 *   60    any other English voice
 */
function rank(voice: SpeechSynthesisVoice): number {
  const british = voice.lang.replace("_", "-").startsWith("en-GB");
  if (/Premium|Enhanced|Natural/i.test(voice.name)) return british ? 0 : 1;
  const nice = NICE_VOICES.findIndex((name) => voice.name.includes(name));
  if (nice !== -1) return 10 + nice;
  return british ? 50 : 60;
}

/**
 * The browser loads its voices in the background, so the list can be empty
 * at first. Wait for the "voiceschanged" event (at most 1.5 s).
 */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const engine = speech;
    if (!engine) return resolve([]);
    if (engine.getVoices().length > 0) return resolve(engine.getVoices());
    const done = () => resolve(engine.getVoices());
    engine.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 1500);
  });
}

/** All English voices, best first (for the Settings dropdown). */
export async function listEnglishVoices(): Promise<SpeechSynthesisVoice[]> {
  const english = (await loadVoices()).filter((voice) => voice.lang.startsWith("en"));
  return english.sort((a, b) => rank(a) - rank(b));
}

/** The voice to use: the one picked in Settings, else the best-ranked one. */
async function chooseVoice(): Promise<SpeechSynthesisVoice | null> {
  const voices = await listEnglishVoices();
  return voices.find((voice) => voice.name === preferredVoiceName) ?? voices[0] ?? null;
}

// --- Speaking ------------------------------------------------------------------------

/** Split a text into sentences: "A. B! C?" -> ["A.", "B!", "C?"] */
export function splitSentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? [text];
}

export interface NarrationEvents {
  /** Narration is about to begin (play the "ding", turn the music down). */
  onStart: () => void;
  /** A sentence starts being spoken (for the subtitles). */
  onSentence: (index: number) => void;
  /** The narration finished (or failed). */
  onDone: () => void;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Speak one sentence; resolves when it has finished (or failed). */
function sayOne(text: string, voice: SpeechSynthesisVoice | null): Promise<void> {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? "en-GB";
    utterance.rate = RATE;
    utterance.pitch = PITCH;
    utterance.volume = VOLUME;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    speech?.speak(utterance);
  });
}

/**
 * Read a text aloud, one sentence at a time with a short pause between them
 * (also avoids Chrome cutting off long texts).
 * @returns false if narration is off or not available (nothing happens)
 */
export async function narrate(text: string, events: NarrationEvents): Promise<boolean> {
  if (!speech || !enabled) return false;
  stopNarration();
  const myId = narrationId;
  const stillMine = () => myId === narrationId; // false once stopped

  const voice = await chooseVoice();
  if (!stillMine()) return false;

  events.onStart();
  await wait(DING_MS);

  const sentences = splitSentences(text);
  for (const [index, sentence] of sentences.entries()) {
    if (!stillMine()) return true;
    events.onSentence(index);
    await sayOne(sentence, voice);
    if (index < sentences.length - 1) await wait(PAUSE_MS);
  }
  if (stillMine()) events.onDone();
  return true;
}

/** Say a short sample sentence (when a voice is picked in Settings). */
export async function speakSample(): Promise<void> {
  if (!speech) return;
  stopNarration();
  await sayOne("Welcome to the gallery. Please, step into the painting.", await chooseVoice());
}

/** Stop talking immediately (e.g. the round ended first). */
export function stopNarration(): void {
  narrationId++;
  speech?.cancel();
}
