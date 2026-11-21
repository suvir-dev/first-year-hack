// narrator.ts  (owner: Person B)
// ---------------------------------------------------------------------------
// A museum guide's voice that tells the painting's story while you pose.
//
// Uses the browser's built-in speech (the Web Speech API,
// window.speechSynthesis): no API key, nothing to install, no licensing.
// If a browser doesn't have it, narration is simply skipped.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "strike-a-pose.narration-off";
const RATE = 0.95; // a little slower than normal, like a museum guide
const PITCH = 1;

/** The browser's speech engine, or null if this browser has none. */
const speech: SpeechSynthesis | null = "speechSynthesis" in window ? window.speechSynthesis : null;

let enabled = readEnabled();
let voice: SpeechSynthesisVoice | null = null;
/** Goes up every time narration starts or stops, so old callbacks are ignored. */
let narrationId = 0;

// --- On/off switch (remembered) ------------------------------------------------

function readEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "true";
  } catch {
    return true;
  }
}

export function isNarrationOn(): boolean {
  return enabled;
}

export function setNarrationOn(on: boolean): void {
  enabled = on;
  try {
    localStorage.setItem(STORAGE_KEY, String(!on));
  } catch {
    // ignore
  }
  if (!on) stopNarration();
}

// --- Choosing a voice -------------------------------------------------------------

/** Best voice: British English ("Daniel" on a Mac), else any English voice. */
function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const british = voices.filter((v) => v.lang.replace("_", "-").startsWith("en-GB"));
  return (
    british.find((v) => v.name.includes("Daniel")) ??
    british[0] ??
    voices.find((v) => v.lang.startsWith("en")) ??
    null
  );
}

/**
 * The browser loads its voices in the background, so the list can be empty
 * at first. Wait for the "voiceschanged" event (at most 1.5 s).
 */
function loadVoice(): Promise<SpeechSynthesisVoice | null> {
  return new Promise((resolve) => {
    if (!speech) return resolve(null);
    if (speech.getVoices().length > 0) return resolve(pickVoice(speech.getVoices()));
    const done = () => resolve(pickVoice(speech.getVoices()));
    speech.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 1500);
  });
}

// --- Speaking ------------------------------------------------------------------------

/** Split a text into sentences: "A. B! C?" -> ["A.", "B!", "C?"] */
export function splitSentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? [text];
}

export interface NarrationEvents {
  /** A sentence starts being spoken (for subtitles and music ducking). */
  onSentence: (index: number) => void;
  /** The narration finished (or failed). */
  onDone: () => void;
}

/**
 * Read a text aloud. Chrome can cut off long texts, so we queue one
 * utterance per sentence instead of one big one.
 * @returns false if narration is off or not available (nothing happens)
 */
export async function narrate(text: string, events: NarrationEvents): Promise<boolean> {
  if (!speech || !enabled) return false;
  stopNarration();
  const myId = narrationId;

  voice ??= await loadVoice();
  if (myId !== narrationId) return false; // stopped while we were waiting

  const sentences = splitSentences(text);
  sentences.forEach((sentence, index) => {
    const utterance = new SpeechSynthesisUtterance(sentence);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? "en-GB";
    utterance.rate = RATE;
    utterance.pitch = PITCH;
    utterance.onstart = () => {
      if (myId === narrationId) events.onSentence(index);
    };
    if (index === sentences.length - 1) {
      utterance.onend = utterance.onerror = () => {
        if (myId === narrationId) events.onDone();
      };
    }
    speech.speak(utterance); // the browser queues them and speaks one by one
  });
  return true;
}

/** Stop talking immediately (e.g. the round ended first). */
export function stopNarration(): void {
  narrationId++;
  speech?.cancel();
}
