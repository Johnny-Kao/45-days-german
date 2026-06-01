#!/usr/bin/env python3
"""Generate French audio files using macOS `say` command."""

import argparse
import json
import os
import subprocess
import tempfile
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ── ffmpeg concat helper ──────────────────────────────────────────────────────

def _ffmpeg(*args):
    subprocess.run(
        ["ffmpeg", *args],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

# ── Config from env ───────────────────────────────────────────────────────────

VOICE = os.getenv("MACOS_TTS_VOICE", "Anna")
RATE_NORMAL = int(os.getenv("MACOS_TTS_RATE_NORMAL", "170"))
RATE_SLOW = int(os.getenv("MACOS_TTS_RATE_SLOW", "120"))
RATE_SHADOWING = int(os.getenv("MACOS_TTS_RATE_SHADOWING", "140"))
PAUSE_MS = int(os.getenv("MACOS_TTS_SHADOWING_PAUSE_MS", "3000"))
OUTPUT_SAMPLE_RATE = os.getenv("MACOS_TTS_OUTPUT_SAMPLE_RATE", "44100")
OUTPUT_BITRATE = os.getenv("MACOS_TTS_OUTPUT_BITRATE", "128k")

ROOT = Path(__file__).parent.parent
LESSONS_JSON = ROOT / "data" / "lessons.json"
AUDIO_DIR = ROOT / "assets" / "audio"

# ── Core TTS helper ───────────────────────────────────────────────────────────

def generate_tts_mac(text, output_mp3: Path, voice=VOICE, rate=RATE_NORMAL, force=False):
    if output_mp3.exists() and not force:
        print(f"  skip  {output_mp3.relative_to(ROOT)}")
        return
    output_mp3.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".aiff", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        subprocess.run(
            ["say", "-v", voice, "-r", str(rate), "-o", str(tmp_path), text],
            check=True,
        )
        subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", str(tmp_path),
                "-ar", OUTPUT_SAMPLE_RATE,
                "-ac", "2",
                "-codec:a", "libmp3lame",
                "-b:a", OUTPUT_BITRATE,
                "-id3v2_version", "3",
                str(output_mp3),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        print(f"  gen   {output_mp3.relative_to(ROOT)}")
    finally:
        tmp_path.unlink(missing_ok=True)


# ── Shadowing builder (ffmpeg only, no pydub) ─────────────────────────────────

def build_shadowing(sentence_files: list[Path], output_mp3: Path, force=False):
    if output_mp3.exists() and not force:
        print(f"  skip  {output_mp3.relative_to(ROOT)}")
        return

    existing = [f for f in sentence_files if f.exists()]
    if not existing:
        print("  WARN  no sentence files found for shadowing")
        return

    output_mp3.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)

        # Generate silence file
        pause_sec = PAUSE_MS / 1000
        silence_mp3 = tmp / "silence.mp3"
        _ffmpeg(
            "-y", "-f", "lavfi",
            "-i", f"anullsrc=r=44100:cl=stereo",
            "-t", str(pause_sec),
            "-ar", OUTPUT_SAMPLE_RATE,
            "-c:a", "libmp3lame", "-b:a", "48k",
            "-id3v2_version", "3",
            str(silence_mp3),
        )

        # Build concat list: sentence + silence + sentence + ...
        concat_list = tmp / "list.txt"
        with open(concat_list, "w") as f:
            for i, sf in enumerate(existing):
                f.write(f"file '{sf.resolve()}'\n")
                if i < len(existing) - 1:
                    f.write(f"file '{silence_mp3.resolve()}'\n")

        _ffmpeg(
            "-y", "-f", "concat", "-safe", "0",
            "-i", str(concat_list),
            "-ar", OUTPUT_SAMPLE_RATE,
            "-ac", "2",
            "-c:a", "libmp3lame", "-b:a", OUTPUT_BITRATE,
            "-id3v2_version", "3",
            str(output_mp3),
        )

    print(f"  gen   {output_mp3.relative_to(ROOT)}")


# ── Per-lesson generation ─────────────────────────────────────────────────────

def generate_lesson(lesson: dict, force=False):
    lesson_id = lesson["id"]
    out_dir = AUDIO_DIR / lesson_id
    print(f"\n[{lesson_id}]")

    sentence_files = []
    for i, sentence in enumerate(lesson["dialogue"], start=1):
        mp3 = out_dir / f"sentence_{i:02d}.mp3"
        generate_tts_mac(sentence["de"], mp3, rate=RATE_NORMAL, force=force)
        sentence_files.append(mp3)

    dialogue_text = "\n".join(s["de"] for s in lesson["dialogue"])
    generate_tts_mac(dialogue_text, out_dir / "dialogue_normal.mp3", rate=RATE_NORMAL, force=force)
    generate_tts_mac(dialogue_text, out_dir / "dialogue_slow.mp3", rate=RATE_SLOW, force=force)

    build_shadowing(sentence_files, out_dir / "shadowing.mp3", force=force)


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Generate French TTS audio files")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--lesson", metavar="DAY_ID", help="e.g. day01")
    group.add_argument("--all", action="store_true", help="generate all lessons")
    parser.add_argument("--force", action="store_true", help="overwrite existing files")
    args = parser.parse_args()

    with open(LESSONS_JSON) as f:
        lessons = json.load(f)

    if args.all:
        for lesson in lessons:
            generate_lesson(lesson, force=args.force)
    else:
        lesson = next((l for l in lessons if l["id"] == args.lesson), None)
        if lesson is None:
            print(f"Lesson '{args.lesson}' not found in lessons.json")
            return
        generate_lesson(lesson, force=args.force)

    print("\nDone.")


if __name__ == "__main__":
    main()
