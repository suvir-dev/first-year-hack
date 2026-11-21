// Each bar pairs a melody with lower notes for a soft, looping piano-style arrangement.
const BARS = [
  [[76, 79, 84, 79], [48, 55, 60, 55]],
  [[77, 81, 84, 81], [53, 60, 65, 60]],
  [[76, 79, 83, 79], [52, 55, 59, 55]],
  [[76, 81, 84, 81], [45, 52, 57, 52]],
  [[74, 77, 81, 77], [50, 57, 62, 57]],
  [[74, 79, 83, 86], [43, 50, 55, 59]],
  [[84, 79, 76, 72], [48, 55, 60, 55]],
  [[74, 71, 72, null], [43, 50, 48, null]],
];
const BEAT = 0.44;
const frequency = (note) => 440 * 2 ** ((note - 69) / 12);

function renderMusic(context) {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * BARS.length * 4 * BEAT), context.sampleRate);
  const samples = buffer.getChannelData(0);
  BARS.forEach(([melody, bass], bar) => {
    [melody, bass].forEach((notes, voice) => {
      notes.forEach((note, beat) => {
        if (note === null) return;
        const start = Math.round((bar * 4 + beat) * BEAT * context.sampleRate);
        const angle = 2 * Math.PI * frequency(note) / context.sampleRate;
        const duration = Math.min(Math.round(BEAT * 1.6 * context.sampleRate), samples.length - start);
        const volume = voice === 0 ? 0.07 : 0.045;
        for (let frame = 0; frame < duration; frame++) {
          const seconds = frame / context.sampleRate;
          const envelope = Math.min(1, seconds / 0.012) * Math.exp(-5 * seconds) * (1 - frame / duration);
          samples[start + frame] += volume * envelope *
            (Math.sin(frame * angle) + 0.23 * Math.sin(frame * angle * 2) + 0.07 * Math.sin(frame * angle * 3));
        }
      });
    });
  });
  return buffer;
}

export function createGameAudio() {
  const Audio = window.AudioContext ?? window.webkitAudioContext;
  if (!Audio) return null;
  const context = new Audio();
  let music;
  let musicBuffer;

  return {
    unlock() {
      if (context.state === 'suspended') void context.resume().catch(() => {});
    },
    chime() {
      [76, 79, 84].forEach((note, index) => {
        const start = context.currentTime + index * 0.06;
        const tone = context.createOscillator();
        const volume = context.createGain();
        tone.type = 'sine';
        tone.frequency.value = frequency(note);
        volume.gain.setValueAtTime(0.001, start);
        volume.gain.exponentialRampToValueAtTime(0.10, start + 0.012);
        volume.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
        tone.connect(volume).connect(context.destination);
        tone.start(start);
        tone.stop(start + 0.25);
      });
    },
    setMusic(enabled) {
      if (enabled && !music) {
        musicBuffer ??= renderMusic(context);
        music = context.createBufferSource();
        music.buffer = musicBuffer;
        music.loop = true;
        music.connect(context.destination);
        music.start();
      } else if (!enabled && music) {
        music.stop();
        music.disconnect();
        music = undefined;
      }
    },
    close() {
      void context.close().catch(() => {});
    },
  };
}
