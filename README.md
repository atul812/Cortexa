# Cortexa — Live Call Speech-to-Text (Chrome Extension)
## What it does
Cortexa injects a floating transcription panel into web pages (including web-based video call pages). It uses the browser's **SpeechRecognition** API to transcribe audio from your **microphone** in real time.

## Important notes & limitations
- The extension uses **your microphone** only. Browser SpeechRecognition does not accept arbitrary tab audio without special capture APIs or a backend service.
- For reliable two-sided transcription (both your voice and remote participants), use headphones and/or a server-side speech-to-text (for example, Google Cloud Speech-to-Text, Whisper API, or an on-premise Vosk server) that can accept a captured tab stream.
- The extension *does not* upload your audio anywhere. All recognition is performed by the browser vendor's speech recognition service (Chrome's built-in engine).
- Works best in Chrome/Edge on desktop.

## Files
- `manifest.json` — extension manifest (MV3).
- `content_script.js` — injected UI + SpeechRecognition logic.
- `popup.html` — extension popup with instructions.
- `background.js` — minimal service worker.
- `README.md` — this file.

## How to install (developer / testing)
1. Open `chrome://extensions/`.
2. Enable "Developer mode".
3. Click "Load unpacked" and select the `Cortexa` folder.
4. Open a web-based video call (Google Meet, Zoom in browser) — a floating Cortexa panel should appear. Click **Start**.
5. Speak into your microphone — transcripts will appear inside the panel.

## How to improve (ideas)
- Add optional server-side STT integration to transcribe captured tab audio (for remote participants).
- Use `chrome.tabCapture` to capture tab audio and send it to a local speech engine (requires a backend).
- Add speaker diarization, timestamps, and punctuation post-processing.

## Security / Privacy
- The extension requests only `storage`, `activeTab`, and `scripting`. It uses the browser's speech recognition — audio is sent to the browser vendor's recognition endpoint (see Chrome docs) by design.
- If you plan to send audio to third-party servers, make that explicit to users and obtain consent.
