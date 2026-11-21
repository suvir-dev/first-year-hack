"""generate_narration.py: turns every painting's history into spoken audio.

For each painting and each sentence in tools/narration.json:
  1. Piper (offline neural text-to-speech) makes a WAV file.
  2. macOS's built-in `afconvert` turns it into a small AAC .m4a file:
        public/narration/<painting-id>/<sentence-index>.m4a
  3. The WAV is deleted.
Then public/narration/manifest.json lists every file with its text and
duration, so the app can play them in order and show matching subtitles.

Usage:
  tools/.venv/bin/python tools/generate_narration.py [--voice en_GB-cori-high] [--force]
Existing .m4a files are skipped unless --force is given (fast re-runs).
"""

import argparse
import json
import subprocess
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VOICES = ROOT / "tools" / "piper-voices"
OUT = ROOT / "public" / "narration"

# Calm museum tone: a little slower than normal (Piper's "length scale":
# bigger = slower), and a short silence at the end of each sentence.
LENGTH_SCALE = "1.15"
SENTENCE_SILENCE = "0.2"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--voice", default="en_GB-cori-high", help="Piper voice name (in tools/piper-voices)")
    parser.add_argument("--force", action="store_true", help="re-make files that already exist")
    args = parser.parse_args()

    model = VOICES / f"{args.voice}.onnx"
    if not model.exists():
        sys.exit(f"Voice not found: {model}\nDownload it with: tools/.venv/bin/python -m piper.download_voices "
                 f"--download-dir tools/piper-voices {args.voice}")

    paintings = json.loads((ROOT / "tools" / "narration.json").read_text())
    manifest_path = OUT / "manifest.json"
    old_manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    # A different voice than last time: everything must be re-made.
    force = args.force or old_manifest.get("voice") not in (None, args.voice)

    manifest = {"voice": args.voice, "paintings": {}}
    made = skipped = 0
    for painting in paintings:
        folder = OUT / painting["id"]
        folder.mkdir(parents=True, exist_ok=True)
        old_files = {f["file"]: f for f in old_manifest.get("paintings", {}).get(painting["id"], [])}
        entries = []
        for index, sentence in enumerate(painting["sentences"]):
            m4a = folder / f"{index}.m4a"
            url = f"/narration/{painting['id']}/{index}.m4a"
            old = old_files.get(url)
            # Skip if the file exists and was made from the same text.
            if m4a.exists() and not force and old and old["text"] == sentence:
                entries.append(old)
                skipped += 1
                continue

            wav = folder / f"{index}.wav"
            subprocess.run(
                [sys.executable, "-m", "piper", "-m", str(model), "-f", str(wav),
                 "--length-scale", LENGTH_SCALE, "--sentence-silence", SENTENCE_SILENCE],
                input=sentence.encode("utf-8"), check=True, capture_output=True,
            )
            # Duration in seconds, read from the WAV before converting.
            with wave.open(str(wav)) as w:
                duration = round(w.getnframes() / w.getframerate(), 2)
            subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", str(wav), str(m4a)], check=True)
            wav.unlink()
            entries.append({"file": url, "text": sentence, "duration": duration})
            made += 1
            print(f"  {painting['id']}/{index}.m4a  {duration:5.2f}s  {sentence[:60]}")
        manifest["paintings"][painting["id"]] = entries

    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False))
    print(f"Made {made} files, skipped {skipped} (already there). Voice: {args.voice}")


if __name__ == "__main__":
    main()
