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

/** The default fallback voice — Chrome-only, needs internet. */
const DEFAULT_VOICE = "Google UK English Female";

/** Calm voices we like, best first (names differ between Mac, Windows, Chrome). */
const NICE_VOICES = [
  "Google UK English Female",
  "Google UK English Male",
  "Serena",
  "Daniel",
  "Kate",
  "Martha",
];

/** Safari-specific British female voices that sound similar to "Google UK English Female". */
const SAFARI_SIMILAR_VOICES = [
  "Kate",          // macOS Safari: calm British female
  "Moira",         // macOS Safari: Scottish female, clear & calm
  "Victoria",      // macOS Safari: British female
];

/** Detect if the current browser is Safari (not Chrome, which also contains "Safari" in its UA). */
function isSafari(): boolean {
  return /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
}

/** Match a voice by name: trimmed, case-insensitive substring match. */
function voiceMatches(voice: SpeechSynthesisVoice, name: string): boolean {
  return voice.name.trim().toLowerCase().includes(name.trim().toLowerCase());
}

/**
 * A ranking number for a voice: lower is better.
 *   0     "Google UK English Female" (the default)
 *   1–2   "Premium" / "Enhanced" / "Natural" voices (they sound most human)
 *   5–9   Safari-specific similar voices (British female, when in Safari)
 *   10+   our list of calm British voices, in order
 *   50    any British English voice
 *   60    any other English voice
 */
function rank(voice: SpeechSynthesisVoice): number {
  if (voiceMatches(voice, DEFAULT_VOICE)) return 0;
  const british = voice.lang.replace("_", "-").startsWith("en-GB");
  if (/Premium|Enhanced|Natural/i.test(voice.name)) return british ? 1 : 2;
  // In Safari, prioritize voices that sound similar to "Google UK English Female".
  if (isSafari()) {
    const safariSimilar = SAFARI_SIMILAR_VOICES.findIndex((name) => voiceMatches(voice, name));
    if (safariSimilar !== -1) return 5 + safariSimilar;
  }
  const nice = NICE_VOICES.findIndex((name) => voiceMatches(voice, name));
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

/** Find the next-best fallback voice after a specific one. */
function fallbackVoice(voices: SpeechSynthesisVoice[], current: SpeechSynthesisVoice | null): SpeechSynthesisVoice | null {
  if (!current) return voices[0] ?? null;
  const index = voices.findIndex((v) => v.name === current.name);
  if (index < 0 || index >= voices.length - 1) return voices[0] ?? null;
  return voices[index + 1] ?? null;
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

/** Maximum time to wait for speech to start before retrying with a fallback (ms). */
const STALL_TIMEOUT_MS = 2000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Speak one sentence; resolves when it has finished (or failed).
 * If the voice stalls (no "start" event within ~2 seconds) or errors, retries once with the next fallback voice. */
async function sayOne(text: string, voice: SpeechSynthesisVoice | null, voices: SpeechSynthesisVoice[]): Promise<void> {
  const engine = speech;
  if (!engine) return;

  // Track whether speech actually started.
  let started = false;
  const startTimer = !voice ? 0 : setTimeout(() => {
    if (!started) {
      console.warn(`Voice "${voice.name}" stalled — retrying with fallback.`);
      engine.cancel();
    }
  }, STALL_TIMEOUT_MS);

  await new Promise<void>((resolve) => {
    const currentVoice = voice;
    const utterance = new SpeechSynthesisUtterance(text);
    if (currentVoice) utterance.voice = currentVoice;
    utterance.lang = currentVoice?.lang ?? "en-GB";
    utterance.rate = RATE;
    utterance.pitch = PITCH;
    utterance.volume = VOLUME;
    utterance.onstart = () => {
      started = true;
      clearTimeout(startTimer);
    };
    utterance.onend = () => resolve();
    utterance.onerror = (e) => {
      clearTimeout(startTimer);
      if (!started && voices.length > 1) {
        // Retry once with the next fallback voice.
        const fb = fallbackVoice(voices, currentVoice);
        console.warn(`Voice "${currentVoice?.name}" error: ${e.error} — retrying with "${fb?.name}".`);
        const retry = new SpeechSynthesisUtterance(text);
        if (fb) retry.voice = fb;
        retry.lang = fb?.lang ?? "en-GB";
        retry.rate = RATE;
        retry.pitch = PITCH;
        retry.volume = VOLUME;
        retry.onstart = () => { started = true; };
        retry.onend = () => resolve();
        retry.onerror = () => resolve(); // give up after retry
        engine.speak(retry);
        return;
      }
      resolve();
    };
    engine.speak(utterance);
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

  const voices = await listEnglishVoices();
  if (!stillMine()) return false;
  const voice = voices[0] ?? null;

  events.onStart();
  await wait(DING_MS);

  const sentences = splitSentences(text);
  for (const [index, sentence] of sentences.entries()) {
    if (!stillMine()) return true;
    events.onSentence(index);
    await sayOne(sentence, voice, voices);
    if (index < sentences.length - 1) await wait(PAUSE_MS);
  }
  if (stillMine()) events.onDone();
  return true;
}

/** Say a short sample sentence (when a voice is picked in Settings). */
export async function speakSample(voiceName?: string): Promise<void> {
  if (!speech) return;
  stopNarration();
  const voices = await listEnglishVoices();
  // If a specific voice name is provided, use it; otherwise use the best-ranked.
  let voice: SpeechSynthesisVoice | null = null;
  if (voiceName) {
    voice = voices.find((v) => voiceMatches(v, voiceName)) ?? null;
  }
  if (!voice) voice = voices[0] ?? null;
  await sayOne("Welcome to the gallery. Please, step into the painting.", voice, voices);
}

/** Stop talking immediately (e.g. the round ended first). */
export function stopNarration(): void {
  narrationId++;
  speech?.cancel();
}
