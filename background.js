// background.js - Cortexa (Groq summarizer + OpenAI Whisper for transcribe)
// Summary: store/retrieve keys (openai_api_key for Whisper, groq_api_key for Groq summarizer),
// handle transcribeAudio and summarize actions. Summarization uses Groq's OpenAI-compatible chat endpoint.

const CONFIG = {
  CHUNK_DURATION: 2000,
  WHISPER_MODEL: 'whisper-1',
  WHISPER_TEMPERATURE: 0.2,
  SUMMARIZER_MODEL: 'llama-3.1-8b-instant', // Groq model to request
  SUMMARIZER_MAX_POINTS: 6
};

// --- Key storage helpers ---
async function getOpenAIKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['openai_api_key'], (items) => {
      resolve(items.openai_api_key || '');
    });
  });
}
async function getGroqKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['groq_api_key'], (items) => {
      resolve(items.groq_api_key || 'groqapikey');
    });
  });
}
async function setOpenAIKey(key) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ openai_api_key: key }, () => resolve());
  });
}
async function setGroqKey(key) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ groq_api_key: key }, () => resolve());
  });
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('Cortexa background installed');
});

// --- Message handler ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      if (request.action === 'checkApiKey') {
        const openaiKey = await getOpenAIKey();
        const groqKey = await getGroqKey();
        sendResponse({
          configured: {
            openai: Boolean(openaiKey && openaiKey.length > 20),
            groq: Boolean(groqKey && groqKey.length > 10)
          }
        });
        return;
      }

      if (request.action === 'setApiKey') {
        // Accept both optional keys
        if (request.openai_key !== undefined) await setOpenAIKey(request.openai_key);
        if (request.groq_key !== undefined) await setGroqKey(request.groq_key);
        sendResponse({ ok: true });
        return;
      }

      if (request.action === 'transcribeAudio') {
        // transcribe with OpenAI Whisper (unchanged)
        if (!request.audioBlob) {
          sendResponse({ success: false, error: 'No audio provided' });
          return;
        }
        const key = await getOpenAIKey();
        if (!key || key.length < 20) {
          sendResponse({ success: false, error: 'Invalid or missing OpenAI API key (required for Whisper transcription)' });
          return;
        }
        try {
          const txt = await transcribeWithWhisper(request.audioBlob, request.language, key);
          sendResponse({ success: true, transcript: txt });
        } catch (err) {
          const msg = (err && err.message) ? err.message : String(err);
          sendResponse({ success: false, error: msg });
        }
        return;
      }

      if (request.action === 'summarize') {
        const text = request.text || '';
        if (!text || text.trim().length < 10) {
          sendResponse({ success: false, error: 'No text to summarize' });
          return;
        }
        const groqKey = await getGroqKey();
        if (!groqKey || groqKey.length < 10) {
          sendResponse({ success: false, error: 'Missing Groq API key. Please set it in the Cortexa popup (Groq key).' });
          return;
        }
        try {
          const summary = await summarizeWithGroq(text, request.max_points || CONFIG.SUMMARIZER_MAX_POINTS, groqKey);
          sendResponse({ success: true, summary });
        } catch (err) {
          const msg = (err && err.message) ? err.message : String(err);
          // pass through helpful text
          sendResponse({ success: false, error: msg });
        }
        return;
      }

      sendResponse({ success: false, error: 'Unknown action' });
    } catch (err) {
      console.error('Background handler error:', err);
      sendResponse({ success: false, error: err.message || String(err) });
    }
  })();
  return true; // keep message channel open for async responses
});

// --- Whisper transcription (unchanged behavior) ---
async function transcribeWithWhisper(audioBlobLike, language = 'en', apiKey) {
  try {
    let fileCandidate = audioBlobLike;
    if (audioBlobLike && audioBlobLike.arrayBuffer && typeof audioBlobLike.arrayBuffer === 'function') {
      // blob already
    } else if (audioBlobLike && audioBlobLike.data && audioBlobLike.type) {
      fileCandidate = new Blob([audioBlobLike.data], { type: audioBlobLike.type || 'audio/webm' });
    }

    const audioFile = new File([fileCandidate], 'audio.webm', { type: 'audio/webm;codecs=opus' });
    if (audioFile.size < 8000) return ''; // skip tiny chunks

    const form = new FormData();
    form.append('file', audioFile);
    form.append('model', 'whisper-1');
    if (language && language !== 'auto') form.append('language', language);
    form.append('temperature', String(CONFIG.WHISPER_TEMPERATURE));
    if (CONFIG.USE_PROMPT) form.append('prompt', CONFIG.PROMPT_TEXT);
    form.append('response_format', 'text');

    const controller = new AbortController();
    const timeoutMs = 15000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      let parsed = null;
      try { parsed = JSON.parse(text); } catch (e) { parsed = null; }
      const serverMsg = (parsed && parsed.error && parsed.error.message) ? parsed.error.message : text || `HTTP ${resp.status}`;
      throw new Error(serverMsg);
    }

    const transcriptText = await resp.text();
    return transcriptText.trim();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('timeout: Request timed out (network slow or large audio chunk)');
    }
    throw error;
  }
}

// --- Summarization using Groq (OpenAI-compatible chat completions) ---
async function summarizeWithGroq(text, maxPoints = 6, groqKey) {
  // We ask the model to return a strict JSON object to ensure consistent parsing.
  const systemPrompt = `You are an assistant that produces short, clear summaries for people with ADHD.
Return EXACTLY a JSON object, and NOTHING else, in this structure:
{
  "title": "<one-line short title>",
  "bullets": ["<bullet 1>", "<bullet 2>", ...]  // at most ${maxPoints} items; each item one short sentence or action
}
Rules:
- Keep sentences short (max 12 words).
- Prioritize action items first.
- Don't include extra commentary outside the JSON.
- Use plain language; no jargon.`;

  const userPrompt = `Transcript to summarize:\n\n${text}`;

  // Groq provides an OpenAI-compatible route. We'll call the OpenAI-compatible chat completions endpoint at Groq.
  const payload = {
    model: CONFIG.SUMMARIZER_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: 400,
    temperature: 0.15
  };

  const controller = new AbortController();
  const timeoutMs = 20000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // NOTE: Groq exposes an OpenAI-compatible path at /openai/v1/chat/completions
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    signal: controller.signal
  });

  clearTimeout(timeoutId);

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    let parsed = null;
    try { parsed = JSON.parse(txt); } catch(e) { parsed = null; }
    const serverMsg = (parsed && parsed.error && parsed.error.message) ? parsed.error.message : txt || `HTTP ${resp.status}`;
    throw new Error(serverMsg);
  }

  const data = await resp.json();
  // Data shape is OpenAI-like; extract assistant message content
  const out = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ? data.choices[0].message.content.trim() : '';

  // Attempt to extract a JSON object from the response
  let jsonText = out;
  const firstBrace = out.indexOf('{');
  const lastBrace = out.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonText = out.slice(firstBrace, lastBrace + 1);
  }

  try {
    const parsed = JSON.parse(jsonText);
    const title = parsed.title ? String(parsed.title).trim() : '';
    const bullets = Array.isArray(parsed.bullets) ? parsed.bullets.map(b => String(b).trim()).filter(Boolean) : [];
    const finalBullets = bullets.slice(0, maxPoints);
    let formatted = (title ? (title + "\n\n") : '');
    finalBullets.forEach(b => { formatted += "• " + b + "\n"; });
    return formatted.trim();
  } catch (err) {
    // fallback: return raw assistant content
    return out;
  }
}
