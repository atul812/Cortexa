// content_script.js - Cortexa (with Groq summarizer support)
// Minimal UI changes; summarizer now calls background 'summarize' action which uses Groq.

(function() {
  if (window.__cortexa_injected) return;
  window.__cortexa_injected = true;

  function createPanel() {
    if (document.getElementById('cortexa-panel')) return;
    const container = document.createElement('div');
    container.id = 'cortexa-panel';
    container.style.cssText = 'position:fixed;right:16px;bottom:16px;width:420px;z-index:2147483647;font-family:system-ui;';

    container.innerHTML = `
      <div style="background:#fff;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.18);overflow:hidden;">
        <div style="padding:10px 12px;display:flex;align-items:center;background:linear-gradient(90deg,#3b82f6,#7c3aed);color:white;">
          <div style="font-weight:700;">🎙️ Cortexa</div>
          <div id="cortexa-status" style="margin-left:auto;font-size:12px;opacity:0.95">idle</div>
        </div>

        <div id="cortexa-transcript" style="padding:10px;height:170px;overflow:auto;background:#fafafa;font-size:13px;"></div>

        <div style="padding:10px;display:flex;gap:6px;">
          <button id="cortexa-start">Start</button>
          <button id="cortexa-stop" disabled>Stop</button>
          <button id="cortexa-clear">Clear</button>
          <button id="cortexa-download">Download</button>
        </div>

        <div style="padding:8px;border-top:1px solid #eee;background:#fff;display:flex;gap:8px;align-items:center;">
          <select id="cortexa-mode"><option value="mic">Mic Only</option><option value="dual">Dual (Tab + Mic)</option></select>
          <select id="cortexa-lang"><option value="en">English</option><option value="en-IN">English (India)</option><option value="hi">Hindi</option></select>
          <div style="margin-left:auto;display:flex;gap:8px;align-items:center;">
            <button id="cortexa-summarize" title="Summarize current transcript">Summarize</button>
            <label style="font-size:12px;display:flex;align-items:center;gap:6px;">
              <input id="cortexa-auto-toggle" type="checkbox"> Auto
            </label>
            <input id="cortexa-auto-interval" style="width:60px;font-size:12px;padding:4px;" value="30" title="Auto summarize interval (seconds)">
          </div>
        </div>

        <div id="cortexa-summary" style="padding:10px;border-top:1px solid #eee;background:#fff;font-size:13px;display:none;max-height:200px;overflow:auto;"></div>
      </div>
    `;
    document.body.appendChild(container);
    attachHandlers();
    showInfo('Click Start. For Dual mode: choose "Share audio" in the share dialog.', 'info');
  }

  function showInfo(msg, type = 'info') {
    const div = document.getElementById('cortexa-transcript');
    if (!div) return;
    const box = document.createElement('div');
    box.style.padding = '8px';
    box.style.borderRadius = '8px';
    box.style.marginBottom = '8px';
    box.style.fontSize = '13px';
    if (type === 'error') { box.style.background = '#fee2e2'; box.style.color = '#991b1b'; }
    else if (type === 'warning') { box.style.background = '#fef3c7'; box.style.color = '#92400e'; }
    else { box.style.background = '#dbeafe'; box.style.color = '#064e3b'; }
    box.textContent = msg;
    div.insertBefore(box, div.firstChild);
    if (type !== 'error') setTimeout(()=> { if (box.parentNode) box.remove(); }, 9000);
  }

  function sendMessageToBg(msg, tries = 0) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(msg, (resp) => {
          const err = chrome.runtime.lastError;
          if (err) {
            if (tries < 1) {
              setTimeout(() => sendMessageToBg(msg, tries + 1).then(resolve).catch(reject), 300);
              return;
            }
            reject(err);
            return;
          }
          resolve(resp);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  function attachHandlers() {
    const start = document.getElementById('cortexa-start');
    const stop = document.getElementById('cortexa-stop');
    const clear = document.getElementById('cortexa-clear');
    const download = document.getElementById('cortexa-download');
    const summarizeBtn = document.getElementById('cortexa-summarize');
    const autoToggle = document.getElementById('cortexa-auto-toggle');
    const autoInterval = document.getElementById('cortexa-auto-interval');
    const modeSel = document.getElementById('cortexa-mode');
    const langSel = document.getElementById('cortexa-lang');

    let recognizer = null;
    let mediaRecorder = null;
    let tabStream = null;
    let mediaChunks = [];
    let running = false;
    let processingQueue = [];
    let isProcessing = false;
    let autoTimer = null;

    function updateButtons() {
      document.getElementById('cortexa-start').disabled = running;
      document.getElementById('cortexa-stop').disabled = !running;
      modeSel.disabled = running;
      langSel.disabled = running;
      summarizeBtn.disabled = false;
    }

    function appendEntry(speaker, text, type='remote') {
      const div = document.getElementById('cortexa-transcript');
      const entry = document.createElement('div');
      entry.style.marginBottom = '8px';
      entry.style.padding = '8px';
      entry.style.borderRadius = '8px';
      entry.style.background = (type === 'me') ? '#dbeafe' : '#fff8dc';
      entry.innerHTML = `<div style="font-weight:700;font-size:12px;margin-bottom:4px">${speaker}</div><div style="font-size:14px;white-space:pre-wrap">${escapeHtml(text)}</div><div style="font-size:11px;color:#666;margin-top:6px">${new Date().toLocaleTimeString()}</div>`;
      div.appendChild(entry);
      div.scrollTop = div.scrollHeight;
    }

    function escapeHtml(s) {
      return s.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    }

    function showSummaryBlock(content) {
      const s = document.getElementById('cortexa-summary');
      s.style.display = 'block';
      s.innerHTML = `<div style="font-weight:700;margin-bottom:8px">Summary</div><div style="white-space:pre-wrap">${escapeHtml(content)}</div>`;
      s.scrollTop = s.scrollHeight;
    }

    async function summarizeNow() {
      const transcriptDiv = document.getElementById('cortexa-transcript');
      if (!transcriptDiv) return;
      const fullText = transcriptDiv.innerText.trim();
      if (!fullText) {
        showInfo('Nothing to summarize yet.', 'warning');
        return;
      }

      // Avoid sending extremely large text; send the most recent segment
      const MAX_CHARS = 3200;
      let textToSend = fullText;
      let truncatedNotice = '';
      if (fullText.length > MAX_CHARS) {
        textToSend = fullText.slice(-MAX_CHARS);
        truncatedNotice = '(...transcript truncated; sending the most recent part...)\n\n';
      }

      // Check Groq key presence (background will check thoroughly)
      const check = await sendMessageToBg({ action: 'checkApiKey' }).catch(() => null);
      if (!check || !check.configured || !check.configured.groq) {
        showInfo('Groq API key not configured — open the Cortexa popup and set your Groq key to enable summarization (free).', 'warning');
        return;
      }

      document.getElementById('cortexa-status').textContent = 'Summarizing…';
      summarizeBtn.disabled = true;

      try {
        const resp = await sendMessageToBg({ action: 'summarize', text: truncatedNotice + textToSend, max_points: 6 });
        if (resp && resp.success && resp.summary) {
          showSummaryBlock(resp.summary);
        } else {
          const err = resp && resp.error ? resp.error : 'Unknown error';
          if (typeof err === 'string') {
            if (err.toLowerCase().includes('quota') || err.toLowerCase().includes('rate limit')) {
              showInfo('Summarization failed — API quota / rate limit: ' + err, 'error');
            } else if (err.toLowerCase().includes('invalid') && err.toLowerCase().includes('key')) {
              showInfo('Summarization failed — Invalid Groq API key. Set a valid key in the popup.', 'error');
            } else {
              showInfo('Summarization failed: ' + err, 'warning');
            }
          } else {
            showInfo('Summarization failed: ' + String(err), 'warning');
          }
        }
      } catch (err) {
        console.error('summarizeNow error', err);
        showInfo('Summarization request failed: ' + (err && err.message ? err.message : String(err)), 'error');
      } finally {
        document.getElementById('cortexa-status').textContent = running ? 'listening' : 'idle';
        summarizeBtn.disabled = false;
      }
    }

    function startAutoSummarize() {
      const secs = Math.max(10, parseInt(autoInterval.value || '30', 10));
      summarizeNow();
      autoTimer = setInterval(summarizeNow, secs * 1000);
      showInfo('Auto-summarize ON — every ' + secs + 's', 'info');
    }

    function stopAutoSummarize() {
      if (autoTimer) { clearInterval(autoTimer); autoTimer = null; showInfo('Auto-summarize OFF', 'info'); }
    }

    async function createRecognition(lang) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        showInfo('SpeechRecognition not supported in this browser. Use Chrome/Edge desktop.', 'error');
        return null;
      }
      const r = new SpeechRecognition();
      r.continuous = true;
      r.interimResults = true;
      r.lang = (lang === 'en-IN') ? 'en-IN' : (lang === 'hi' ? 'hi-IN' : 'en-US');
      return r;
    }

    async function startMicOnly() {
      const lang = langSel.value || 'en';
      recognizer = await createRecognition(lang);
      if (!recognizer) return;
      recognizer.onresult = (evt) => {
        let final = '', interim = '';
        for (let i = evt.resultIndex; i < evt.results.length; i++) {
          const res = evt.results[i];
          if (res.isFinal) final += res[0].transcript;
          else interim += res[0].transcript;
        }
        if (final) appendEntry('You', final, 'me');
        showInterim(interim);
      };
      recognizer.onerror = (e) => {
        console.warn('recognition error', e);
        if (e.error !== 'no-speech') showInfo('SpeechRecognition error: ' + (e.error || e.message), 'warning');
      };
      recognizer.onend = () => {
        if (running && modeSel.value === 'mic') {
          try { recognizer.start(); } catch(_) {}
        }
      };
      running = true;
      try { recognizer.start(); } catch (e) { console.warn(e); }
      updateButtons();
      document.getElementById('cortexa-status').textContent = 'listening';
      showInfo('Mic only: listening to your microphone', 'info');
    }

    function showInterim(text) {
      let el = document.getElementById('cortexa-interim');
      if (!el) {
        el = document.createElement('div');
        el.id = 'cortexa-interim';
        el.style.opacity = '0.7';
        el.style.fontStyle = 'italic';
        el.style.padding = '6px';
        el.style.marginTop = '6px';
        document.getElementById('cortexa-transcript').appendChild(el);
      }
      if (text) el.textContent = `"${text}..."`;
      else el.remove();
    }

    async function startDual() {
      // check OpenAI key presence for dual transcription (Whisper)
      const check = await sendMessageToBg({ action: 'checkApiKey' }).catch(() => null);
      const openaiOk = check && check.configured && check.configured.openai;
      if (!openaiOk) {
        showInfo('OpenAI API key not configured — Dual mode requires it for Whisper transcription. Switching to mic-only.', 'warning');
        modeSel.value = 'mic';
        return startMicOnly();
      }

      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { mediaSource: 'tab' },
          audio: true
        });

        const audioTracks = stream.getAudioTracks();
        if (!audioTracks || audioTracks.length === 0) throw new Error('No audio track — check "Share audio" in the share dialog.');

        // start mic listening as well
        await startMicOnly();

        tabStream = stream;
        mediaChunks = [];
        let options = { mimeType: 'audio/webm;codecs=opus' };
        try { mediaRecorder = new MediaRecorder(tabStream, options); } catch { mediaRecorder = new MediaRecorder(tabStream); }

        mediaRecorder.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) mediaChunks.push(ev.data); };
        mediaRecorder.onstop = () => {
          if (mediaChunks.length > 0) {
            processingQueue.push([...mediaChunks]);
            mediaChunks = [];
            processQueue();
          }
        };

        mediaRecorder.start();
        const chunkMs = 2000;
        const interval = setInterval(() => {
          if (!running || !mediaRecorder) { clearInterval(interval); return; }
          try {
            if (mediaRecorder.state === 'recording') mediaRecorder.stop();
            setTimeout(() => {
              if (mediaRecorder && mediaRecorder.state === 'inactive') {
                try { mediaRecorder.start(); } catch (e) {}
              }
            }, 60);
          } catch (e) { console.warn('recorder restart error', e); }
        }, chunkMs);

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            showInfo('Tab sharing stopped. Switching to Mic only.', 'warning');
            stopAll();
            modeSel.value = 'mic';
            startMicOnly();
          };
        }

        updateButtons();
        document.getElementById('cortexa-status').textContent = 'listening (dual)';
        showInfo('Dual mode active — processing tab audio every 2s.', 'info');

      } catch (err) {
        console.error('Tab capture failed:', err);
        showInfo('Tab capture failed: ' + (err.message || String(err)), 'error');
        modeSel.value = 'mic';
        startMicOnly();
      }
    }

    async function processQueue() {
      if (isProcessing || processingQueue.length === 0) return;
      isProcessing = true;
      const chunks = processingQueue.shift();
      try {
        const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
        if (blob.size < 8000) { isProcessing = false; return; }

        let resp;
        try {
          resp = await sendMessageToBg({ action: 'transcribeAudio', audioBlob: blob, language: langSel.value });
        } catch (err) {
          console.warn('Send to background failed, retrying once', err);
          try {
            await new Promise(r => setTimeout(r, 300));
            resp = await sendMessageToBg({ action: 'transcribeAudio', audioBlob: blob, language: langSel.value });
          } catch (err2) {
            console.error('Send retry failed', err2);
            showInfo('Failed to send audio to background: ' + (err2.message || err2), 'error');
            isProcessing = false;
            return;
          }
        }

        if (resp && resp.success && resp.transcript) {
          const text = resp.transcript.trim();
          if (text && text.length > 2) appendEntry('Participant', text, 'remote');
        } else {
          const e = resp && resp.error ? resp.error : 'Unknown transcription error';
          if (typeof e === 'string' && e.startsWith('quota_exceeded')) {
            showInfo('Transcription failed — OpenAI quota exceeded. Check your OpenAI plan/billing.', 'error');
          } else if (typeof e === 'string' && e.startsWith('invalid_key')) {
            showInfo('Transcription failed — Invalid OpenAI API key. Set a valid key in extension popup.', 'error');
          } else {
            showInfo('Transcription failed: ' + e, 'warning');
          }
        }
      } catch (err) {
        console.error('processQueue error', err);
      } finally {
        isProcessing = false;
        if (processingQueue.length > 0) setTimeout(() => processQueue(), 50);
      }
    }

    function stopAll() {
      running = false;
      try { recognizer && recognizer.stop(); } catch(e){}
      try { if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop(); } catch(e){}
      try { if (tabStream) tabStream.getTracks().forEach(t => t.stop()); } catch(e){}
      mediaRecorder = null;
      tabStream = null;
      mediaChunks = [];
      processingQueue = [];
      stopAutoSummarize();
      updateButtons();
      document.getElementById('cortexa-status').textContent = 'idle';
    }

    start.addEventListener('click', async () => {
      if (running) return;
      const mode = modeSel.value;
      if (mode === 'mic') {
        await startMicOnly();
      } else {
        await startDual();
      }
    });

    stop.addEventListener('click', () => {
      stopAll();
      showInfo('Stopped', 'info');
    });

    clear.addEventListener('click', () => {
      const div = document.getElementById('cortexa-transcript');
      div.innerHTML = '';
      document.getElementById('cortexa-summary').style.display = 'none';
    });

    download.addEventListener('click', () => {
      const content = document.getElementById('cortexa-transcript').innerText;
      if (!content.trim()) return alert('No transcript to download');
      const blob = new Blob([content], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cortexa-${(new Date()).toISOString().slice(0,19).replace(/:/g,'-')}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });

    summarizeBtn.addEventListener('click', summarizeNow);
    autoToggle.addEventListener('change', () => {
      if (autoToggle.checked) startAutoSummarize(); else stopAutoSummarize();
    });

    // when user focuses input, pause auto summarization (helpful UX)
    document.addEventListener('focusin', (e) => {
      if (autoTimer && (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'))) {
        stopAutoSummarize();
        autoToggle.checked = false;
        showInfo('Auto summarize paused while typing.', 'info');
      }
    });
  }

  // inject and re-inject for dynamic pages
  createPanel();
  const obs = new MutationObserver(() => {
    if (!document.getElementById('cortexa-panel')) createPanel();
  });
  obs.observe(document.body, { childList: true, subtree: true });

})();
