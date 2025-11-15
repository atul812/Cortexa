# Cortexa — Live Call Speech-to-Text (Chrome Extension)

## What changed
- Summarization now uses **Groq** (free) via the OpenAI-compatible Groq chat endpoint.
- Store your Groq API key in the extension popup (Groq key).
- OpenAI key is still used for Whisper transcription (dual/tab audio). If you don't need dual transcription, you can leave OpenAI key blank.

## How to set keys
1. Click the Cortexa icon → Popup.
2. Paste your Groq API key into "Groq API Key" and Save.
3. (Optional) Paste OpenAI API key if you want Dual (tab) transcription via Whisper.

## Notes
- Groq provides free keys — see Groq Console to obtain one.
- Auto-summarize creates periodic API calls; set interval conservatively.
- Mic-only transcription (SpeechRecognition) works without keys.
