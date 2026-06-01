# 45 Days French

Mobile-first static French speaking course. No backend, no build step.

## Quick start

```bash
# 1. Install Python deps
python3 -m venv .venv
source .venv/bin/activate
pip install -r scripts/requirements.txt

# 2. Copy env config
cp .env.example .env

# 3. (Optional) check available French voices
say -v '?'
# Edit .env → set MACOS_TTS_VOICE to a fr_FR voice you have, e.g. Thomas, Jacques

# 4. Install high-quality voices (optional)
# System Settings → Accessibility → Spoken Content → System Voice → Manage Voices
# Download a French (France) voice

# 5. Generate audio
python scripts/generate_audio.py --all
# or a single lesson:
python scripts/generate_audio.py --lesson day01

# 6. Start local server (required — fetch won't work over file://)
python3 -m http.server 8000
# Open: http://localhost:8000
```

## Audio script usage

```bash
python scripts/generate_audio.py --lesson day01          # generate day01
python scripts/generate_audio.py --lesson day01 --force  # overwrite existing
python scripts/generate_audio.py --all                   # all lessons
python scripts/generate_audio.py --all --force           # regenerate everything
```

## Deploy to GitHub Pages

1. Push all files (including `assets/audio/`) to a GitHub repo.
2. Enable GitHub Pages from the `main` branch root.
3. Open the Pages URL on your iPhone.

The audio files are preloaded on page load — load once on WiFi, use offline.
