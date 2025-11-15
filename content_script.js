// Cortexa Enhanced Content Script - Optimized for Low Latency
// =============================================================
(function() {
  'use strict';
  
  if (window.__cortexa_injected) return;
  window.__cortexa_injected = true;
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCortexa);
  } else {
    initCortexa();
  }
  
  function initCortexa() {
    if (!document.body) {
      setTimeout(initCortexa, 100);
      return;
    }

    const css = `
    #cortexa-panel {
      position: fixed;
      right: 16px;
      bottom: 16px;
      width: 440px;
      max-height: 70vh;
      background: rgba(255,255,255,0.98);
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      border-radius: 16px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #111;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid rgba(0,0,0,0.1);
    }
    #cortexa-header {
      display:flex;
      align-items:center;
      gap:8px;
      padding:12px 14px;
      border-bottom:1px solid rgba(0,0,0,0.08);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      user-select: none;
      color: white;
    }
    #cortexa-title {
      font-weight:700; 
      font-size:15px; 
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    #cortexa-status {
      font-size: 11px;
      opacity: 0.9;
      font-weight: 500;
    }
    #cortexa-controls {display:flex; gap:6px; align-items:center; flex-wrap: wrap;}
    .cortexa-btn {
      padding:7px 13px;
      border-radius:8px;
      border: none;
      cursor:pointer;
      font-size:12px;
      font-weight: 600;
      transition: all 0.2s;
      background: rgba(255,255,255,0.95);
      color: #667eea;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .cortexa-btn:hover:not(:disabled) {
      background: white;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }
    .cortexa-btn:disabled {
      background: rgba(255,255,255,0.5);
      cursor: not-allowed;
      opacity: 0.5;
      color: #999;
    }
    .cortexa-btn.active {
      background: #10b981;
      color: white;
    }
    .cortexa-btn.small {
      padding: 5px 10px;
      font-size: 11px;
    }
    #cortexa-transcript {
      padding:14px;
      overflow-y:auto;
      overflow-x:hidden;
      font-size:13.5px;
      line-height:1.6;
      max-height: 450px;
      background: white;
      flex: 1;
    }
    .transcript-entry {
      margin-bottom: 14px;
      padding: 10px 12px;
      border-radius: 10px;
      background: #f8f9fa;
      border-left: 4px solid #cbd5e1;
      animation: slideIn 0.3s ease-out;
    }
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .transcript-entry.me {
      background: #dbeafe;
      border-left-color: #3b82f6;
    }
    .transcript-entry.remote {
      background: #fef3c7;
      border-left-color: #f59e0b;
    }
    .transcript-speaker {
      font-weight: 700;
      font-size: 12px;
      margin-bottom: 5px;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .speaker-icon {
      font-size: 14px;
    }
    .transcript-text {
      color: #1f2937;
      word-wrap: break-word;
      line-height: 1.5;
    }
    .transcript-time {
      font-size: 10px;
      color: #9ca3af;
      margin-top: 5px;
      font-weight: 500;
    }
    #cortexa-footer {
      padding:12px;
      border-top:1px solid rgba(0,0,0,0.08);
      display:flex;
      flex-direction: column;
      gap:10px;
      background: #f9fafb;
    }
    #cortexa-mode-selector {
      display: flex;
      gap: 8px;
      margin-bottom: 4px;
    }
    .mode-btn {
      flex: 1;
      padding: 10px;
      border-radius: 10px;
      border: 2px solid #e5e7eb;
      background: white;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      text-align: center;
      transition: all 0.2s;
      color: #6b7280;
    }
    .mode-btn:hover:not(.active) {
      border-color: #667eea;
      color: #667eea;
      background: #f0f4ff;
    }
    .mode-btn.active {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }
    .mode-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    #cortexa-lang {
      font-size:12px;
      padding:8px 10px;
      border-radius:8px;
      border:2px solid #e5e7eb;
      background:white;
      cursor: pointer;
      font-weight: 500;
    }
    #cortexa-minimize {
      width:28px;
      height:28px;
      display:flex;
      align-items:center;
      justify-content:center;
      background: rgba(255,255,255,0.2);
      border: none;
      cursor: pointer;
      font-size: 18px;
      color: white;
      border-radius: 6px;
      font-weight: bold;
    }
    #cortexa-minimize:hover {
      background: rgba(255,255,255,0.3);
    }
    #cortexa-interim {
      opacity: 0.7;
      font-style: italic;
      color: #6b7280;
      margin-top: 8px;
      padding: 8px 10px;
      background: #f3f4f6;
      border-radius: 8px;
      font-size: 12px;
      border-left: 3px solid #9ca3af;
    }
    .status-indicator {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 6px;
      animation: pulse 2s ease-in-out infinite;
    }
    .status-indicator.listening {
      background: #10b981;
    }
    .status-indicator.processing {
      background: #f59e0b;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(0.95); }
    }
    .info-box {
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 12px;
      margin: 8px 0;
      line-height: 1.5;
    }
    .info-box.info {
      background: #dbeafe;
      color: #1e40af;
      border-left: 3px solid #3b82f6;
    }
    .info-box.warning {
      background: #fef3c7;
      color: #92400e;
      border-left: 3px solid #f59e0b;
    }
    .info-box.error {
      background: #fee2e2;
      color: #991b1b;
      border-left: 3px solid #ef4444;
    }
    .info-box.success {
      background: #d1fae5;
      color: #065f46;
      border-left: 3px solid #10b981;
    }
    .latency-badge {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(255,255,255,0.3);
      margin-left: auto;
    }
    `;

    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    const existingPanel = document.getElementById('cortexa-panel');
    if (existingPanel) existingPanel.remove();

    const panel = document.createElement('div');
    panel.id = 'cortexa-panel';
    panel.innerHTML = `
      <div id="cortexa-header">
        <div id="cortexa-title">
          <div>🎙️ Cortexa Enhanced</div>
          <div id="cortexa-status"></div>
        </div>
        <div id="cortexa-controls">
          <button id="cortexa-start" class="cortexa-btn">Start</button>
          <button id="cortexa-stop" class="cortexa-btn" disabled>Stop</button>
          <button id="cortexa-download" class="cortexa-btn small" title="Download transcript">💾</button>
          <button id="cortexa-clear" class="cortexa-btn small" title="Clear transcript">🗑️</button>
          <button id="cortexa-minimize" title="Minimize">−</button>
        </div>
      </div>
      <div id="cortexa-transcript" aria-live="polite"></div>
      <div id="cortexa-footer">
        <div id="cortexa-mode-selector">
          <button class="mode-btn active" data-mode="mic">🎤 Mic Only</button>
          <button class="mode-btn" data-mode="dual">🎧 Dual Audio</button>
        </div>
        <select id="cortexa-lang" title="Recognition language">
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="ja">Japanese</option>
          <option value="zh">Chinese</option>
        </select>
        <div style="font-size:11px;color:#6b7280;line-height:1.5">
          <strong>Mic:</strong> Your voice | <strong>Dual:</strong> You + Remote (2s chunks, optimized)
        </div>
      </div>
    `;
    
    document.body.appendChild(panel);
    setupPanel();

    function setupPanel() {
      // Make draggable
      (function makeDraggable(target) {
        let isDown = false, startX, startY, origX, origY;
        const header = target.querySelector('#cortexa-header');
        header.style.cursor = 'grab';
        
        header.addEventListener('pointerdown', (e) => {
          if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
          isDown = true;
          startX = e.clientX; 
          startY = e.clientY;
          const rect = target.getBoundingClientRect();
          origX = rect.left; 
          origY = rect.top;
          header.style.cursor = 'grabbing';
          e.preventDefault();
        });
        
        window.addEventListener('pointermove', (e) => {
          if (!isDown) return;
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          target.style.right = 'auto';
          target.style.bottom = 'auto';
          target.style.left = Math.max(0, Math.min(window.innerWidth - target.offsetWidth, origX + dx)) + 'px';
          target.style.top = Math.max(0, Math.min(window.innerHeight - target.offsetHeight, origY + dy)) + 'px';
        });
        
        window.addEventListener('pointerup', () => {
          if (isDown) {
            isDown = false;
            header.style.cursor = 'grab';
          }
        });
      })(panel);

      // Transcript Manager - OPTIMIZED
      const TranscriptManager = {
        mode: 'mic',
        micRecognition: null,
        mediaRecorder: null,
        audioChunks: [],
        tabStream: null,
        running: false,
        entries: [],
        processingQueue: [],
        isProcessing: false,
        chunkDuration: 2000, // 2 seconds for lower latency
        keepAlivePort: null,
        lastRemoteText: '', // Track last remote text to avoid duplicates
        
        async checkApiKey() {
          try {
            const response = await chrome.runtime.sendMessage({ action: 'checkApiKey' });
            return response.configured;
          } catch (e) {
            return false;
          }
        },
        
        async loadConfig() {
          try {
            const response = await chrome.runtime.sendMessage({ action: 'getConfig' });
            if (response.config) {
              this.chunkDuration = response.config.CHUNK_DURATION || 2000;
            }
          } catch (e) {
            console.log('Using default config');
          }
        },
        
        init() {
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          if (!SpeechRecognition) {
            this.showMessage("SpeechRecognition not supported. Use Chrome/Edge.", 'error');
            return false;
          }
          return true;
        },
        
        createRecognition(lang) {
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.maxAlternatives = 1;
          // Use just language code for SpeechRecognition
          recognition.lang = lang === 'en' ? 'en-US' : `${lang}-${lang.toUpperCase()}`;
          return recognition;
        },
        
        async startMicOnly() {
          if (!this.init()) return;
          await this.loadConfig();
          
          const lang = panel.querySelector('#cortexa-lang').value;
          this.micRecognition = this.createRecognition(lang);
          
          this.micRecognition.onstart = () => {
            this.updateStatus('Listening to microphone...');
          };
          
          this.micRecognition.onresult = (evt) => {
            let interim = '', final = '';
            for (let i = evt.resultIndex; i < evt.results.length; ++i) {
              const res = evt.results[i];
              if (res.isFinal) final += res[0].transcript;
              else interim += res[0].transcript;
            }
            if (final) this.addEntry('You', final, 'me');
            if (interim) this.showInterim(interim);
          };
          
          this.micRecognition.onerror = (e) => {
            if (e.error !== 'aborted' && e.error !== 'no-speech') {
              console.error('Mic error:', e.error);
            }
          };
          
          this.micRecognition.onend = () => {
            if (this.running && this.mode === 'mic') {
              setTimeout(() => {
                if (this.running && this.micRecognition) {
                  try { this.micRecognition.start(); } catch(e) {}
                }
              }, 100);
            }
          };
          
          this.running = true;
          this.micRecognition.start();
          this.showMessage('🎤 Mic Only: Capturing your voice', 'info');
          updateButtons();
        },
        
        async startDualAudio() {
          if (!this.init()) return;
          await this.loadConfig();
          
          const apiConfigured = await this.checkApiKey();
          if (!apiConfigured) {
            this.showMessage('⚠️ OpenAI API key not configured! Add it to background.js.', 'error');
            console.error('%c❌ API KEY MISSING', 'color:red;font-size:16px;font-weight:bold');
            console.log('Get key: https://platform.openai.com/api-keys');
            console.log('Edit: background.js line 7');
            this.mode = 'mic';
            panel.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === 'mic'));
            return;
          }
          
          try {
            this.showMessage('📺 Select tab & CHECK "Share tab audio" + "Share system audio"', 'info');
            
            const stream = await navigator.mediaDevices.getDisplayMedia({
              video: { mediaSource: 'tab' },
              audio: { 
                echoCancellation: false, // Disable for call audio
                noiseSuppression: false,
                autoGainControl: false,
                channelCount: 2 // Stereo for better quality
              },
              preferCurrentTab: true
            });
            
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0) {
              throw new Error('No audio! Please check "Share tab audio" AND "Share system audio"');
            }
            
            console.log('Audio track settings:', audioTracks[0].getSettings());
            
            this.tabStream = stream;
            const lang = panel.querySelector('#cortexa-lang').value;
            
            // Start mic recognition
            this.micRecognition = this.createRecognition(lang);
            this.micRecognition.onresult = (evt) => {
              let interim = '', final = '';
              for (let i = evt.resultIndex; i < evt.results.length; ++i) {
                const res = evt.results[i];
                if (res.isFinal) final += res[0].transcript;
                else interim += res[0].transcript;
              }
              if (final) this.addEntry('You', final, 'me');
              if (interim) this.showInterim(interim);
            };
            this.micRecognition.onerror = (e) => {
              if (e.error !== 'aborted' && e.error !== 'no-speech') {
                console.error('Mic error:', e.error);
              }
            };
            this.micRecognition.onend = () => {
              if (this.running && this.mode === 'dual') {
                setTimeout(() => {
                  if (this.running && this.micRecognition) {
                    try { this.micRecognition.start(); } catch(e) {}
                  }
                }, 100);
              }
            };
            
            // Keep service worker alive
            this.keepAlivePort = chrome.runtime.connect({ name: 'keepAlive' });
            
            // Setup MediaRecorder with optimized settings
            const options = { 
              mimeType: 'audio/webm;codecs=opus',
              audioBitsPerSecond: 64000 // Lower bitrate for faster upload
            };
            
            this.mediaRecorder = new MediaRecorder(stream, options);
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (e) => {
              if (e.data.size > 0) {
                this.audioChunks.push(e.data);
              }
            };
            
            this.mediaRecorder.onstop = async () => {
              if (this.audioChunks.length > 0) {
                // Queue processing to avoid blocking
                this.processingQueue.push([...this.audioChunks]);
                this.audioChunks = [];
                this.processQueue();
              }
            };
            
            this.mediaRecorder.start();
            
            // Process audio every 2 seconds (optimized)
            this.audioProcessInterval = setInterval(() => {
              if (this.running && this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                this.mediaRecorder.stop();
                setTimeout(() => {
                  if (this.running && this.mediaRecorder) {
                    this.audioChunks = [];
                    try {
                      this.mediaRecorder.start();
                    } catch(e) {
                      console.error('Failed to restart recorder:', e);
                    }
                  }
                }, 50); // Minimal delay
              }
            }, this.chunkDuration);
            
            this.running = true;
            this.micRecognition.start();
            
            this.updateStatus('Dual Audio: Mic + Remote (2s)');
            this.showMessage('✅ Dual Audio active! Processing every 2 seconds.', 'success');
            updateButtons();
            
            // Handle tab sharing stop
            stream.getVideoTracks()[0].onended = () => {
              if (this.running) {
                this.showMessage('⚠️ Sharing stopped. Switching to Mic Only.', 'warning');
                this.stop();
                setTimeout(() => { 
                  this.mode = 'mic'; 
                  panel.querySelectorAll('.mode-btn').forEach(b => 
                    b.classList.toggle('active', b.dataset.mode === 'mic')
                  );
                  this.start(); 
                }, 500);
              }
            };
            
          } catch(err) {
            console.error('Tab capture failed:', err);
            this.showMessage(`❌ ${err.message}`, 'error');
            this.mode = 'mic';
            panel.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === 'mic'));
          }
        },
        
        async processQueue() {
          if (this.isProcessing || this.processingQueue.length === 0) return;
          
          this.isProcessing = true;
          const chunks = this.processingQueue.shift();
          
          await this.processRemoteAudio(chunks);
          
          this.isProcessing = false;
          
          // Process next in queue
          if (this.processingQueue.length > 0) {
            setTimeout(() => this.processQueue(), 10);
          }
        },
        
        async processRemoteAudio(chunks) {
          if (!chunks || chunks.length === 0) return;
          
          const startTime = performance.now();
          this.updateStatus('Processing remote audio...', true);
          
          try {
            const audioBlob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
            
            // Skip very small audio chunks
            if (audioBlob.size < 8000) {
              this.updateStatus('Dual Audio: Mic + Remote (2s)');
              return;
            }
            
            const lang = panel.querySelector('#cortexa-lang').value;
            const response = await chrome.runtime.sendMessage({
              action: 'transcribeAudio',
              audioBlob: audioBlob,
              language: lang
            });
            
            if (response.success && response.transcript) {
              const text = response.transcript.trim();
              
              // Filter out duplicates and very short text
              if (text && text.length > 3 && text !== this.lastRemoteText) {
                // Check if it's significantly different from last
                const similarity = this.calculateSimilarity(text, this.lastRemoteText);
                if (similarity < 0.8) { // Less than 80% similar
                  // ===================================================
                  // === ⭐️ KEY CHANGE HERE ⭐️ ===
                  // ===================================================
                  this.addEntry('User', text, 'remote'); 
                  // ===================================================

                  this.lastRemoteText = text;
                  
                  const processingTime = performance.now() - startTime;
                  console.log(`✅ Remote [${processingTime.toFixed(0)}ms]:`, text);
                }
              }
            } else if (response.error) {
              console.error('Transcription error:', response.error);
              if (!response.error.includes('timeout')) {
                this.showMessage(`⚠️ ${response.error}`, 'warning');
              }
            }
            
          } catch (err) {
            console.error('Processing error:', err);
          } finally {
            this.updateStatus('Dual Audio: Mic + Remote (2s)');
          }
        },
        
        calculateSimilarity(str1, str2) {
          if (!str1 || !str2) return 0;
          const longer = str1.length > str2.length ? str1 : str2;
          const shorter = str1.length > str2.length ? str2 : str1;
          if (longer.length === 0) return 1.0;
          const editDistance = this.levenshteinDistance(longer, shorter);
          return (longer.length - editDistance) / longer.length;
        },
        
        levenshteinDistance(str1, str2) {
          const matrix = [];
          for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
          }
          for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
          }
          for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
              if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
              } else {
                matrix[i][j] = Math.min(
                  matrix[i - 1][j - 1] + 1,
                  matrix[i][j - 1] + 1,
                  matrix[i - 1][j] + 1
                );
              }
            }
          }
          return matrix[str2.length][str1.length];
        },
        
        async start() {
          if (this.mode === 'dual') await this.startDualAudio();
          else await this.startMicOnly();
        },
        
        stop() {
          this.running = false;
          
          if (this.keepAlivePort) {
            try { this.keepAlivePort.disconnect(); } catch(e) {}
            this.keepAlivePort = null;
          }
          
          if (this.micRecognition) {
            try { this.micRecognition.stop(); } catch(e) {}
            this.micRecognition = null;
          }
          
          if (this.mediaRecorder) {
            try { 
              if (this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop(); 
              }
            } catch(e) {}
            this.mediaRecorder = null;
          }
          
          if (this.audioProcessInterval) {
            clearInterval(this.audioProcessInterval);
            this.audioProcessInterval = null;
          }
          
          if (this.tabStream) {
            this.tabStream.getTracks().forEach(t => t.stop());
            this.tabStream = null;
          }
          
          this.audioChunks = [];
          this.processingQueue = [];
          this.isProcessing = false;
          this.lastRemoteText = '';
          this.updateStatus('');
          updateButtons();
        },
        
        addEntry(speaker, text, type) {
          text = text.trim();
          if (!text) return;
          const time = new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', minute: '2-digit', second: '2-digit'
          });
          this.entries.push({ speaker, text, time, type });
          this.render();
        },
        
        render() {
          const div = panel.querySelector('#cortexa-transcript');
          const infoMsgs = Array.from(div.querySelectorAll('.info-box'));
          
          let html = infoMsgs.map(m => m.outerHTML).join('');
          
          if (this.entries.length === 0 && infoMsgs.length === 0) {
            html += '<div class="info-box info">Click <strong>Start</strong> to begin transcription.</div>';
          } else {
            this.entries.forEach(e => {
              const icon = e.type === 'me' ? '👤' : '👥';
              html += `
                <div class="transcript-entry ${e.type}">
                  <div class="transcript-speaker"><span class="speaker-icon">${icon}</span>${e.speaker}</div>
                  <div class="transcript-text">${e.text}</div>
                  <div class="transcript-time">${e.time}</div>
                </div>
              `;
            });
          }
          
          div.innerHTML = html;
          div.scrollTop = div.scrollHeight;
        },
        
        showInterim(text) {
          const div = panel.querySelector('#cortexa-transcript');
          let el = document.getElementById('cortexa-interim');
          if (!el && text) {
            el = document.createElement('div');
            el.id = 'cortexa-interim';
            div.appendChild(el);
          }
          if (el) {
            if (text) {
              el.textContent = `"${text}..."`;
              div.scrollTop = div.scrollHeight;
            } else {
              el.remove();
            }
          }
        },
        
        updateStatus(text, processing = false) {
          const status = panel.querySelector('#cortexa-status');
          if (text) {
            const cls = processing ? 'processing' : 'listening';
            status.innerHTML = `<span class="status-indicator ${cls}"></span>${text}`;
          } else {
            status.innerHTML = '';
          }
        },
        
        showMessage(msg, type = 'info') {
          const div = panel.querySelector('#cortexa-transcript');
          const m = document.createElement('div');
          m.className = `info-box ${type}`;
          m.innerHTML = msg;
          if (div.firstChild) div.insertBefore(m, div.firstChild);
          else div.appendChild(m);
          div.scrollTop = 0;
          if (type === 'info' || type === 'success') {
            setTimeout(() => { if (m.parentNode) m.remove(); }, 8000);
          }
        },
        
        clear() {
          this.entries = [];
          this.lastRemoteText = '';
          this.render();
          const el = document.getElementById('cortexa-interim');
          if (el) el.remove();
        },
        
        download() {
          if (this.entries.length === 0) {
            alert('No transcript to download');
            return;
          }
          let text = `Cortexa Transcript\nDate: ${new Date().toLocaleString()}\n${'='.repeat(60)}\n\n`;
          this.entries.forEach(e => {
            text += `[${e.time}] ${e.speaker}:\n${e.text}\n\n`;
          });
          const blob = new Blob([text], {type: 'text/plain'});
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `cortexa-${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.txt`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 100);
        }
      };

      function updateButtons() {
        const start = panel.querySelector('#cortexa-start');
        const stop = panel.querySelector('#cortexa-stop');
        const lang = panel.querySelector('#cortexa-lang');
        const modes = panel.querySelectorAll('.mode-btn');
        if (start) start.disabled = TranscriptManager.running;
        if (stop) stop.disabled = !TranscriptManager.running;
        if (lang) lang.disabled = TranscriptManager.running;
        modes.forEach(b => b.disabled = TranscriptManager.running);
      }

      // Event listeners
      panel.querySelector('#cortexa-start')?.addEventListener('click', (e) => {
        e.preventDefault();
        TranscriptManager.start();
      });
      
      panel.querySelector('#cortexa-stop')?.addEventListener('click', (e) => {
        e.preventDefault();
        TranscriptManager.stop();
      });
      
      panel.querySelector('#cortexa-clear')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (TranscriptManager.running) {
          if (!confirm('Stop and clear transcript?')) return;
          TranscriptManager.stop();
        }
        TranscriptManager.clear();
      });
      
      panel.querySelector('#cortexa-download')?.addEventListener('click', (e) => {
        e.preventDefault();
        TranscriptManager.download();
      });
      
      panel.querySelector('#cortexa-minimize')?.addEventListener('click', (e) => {
        e.preventDefault();
        const t = document.getElementById('cortexa-transcript');
        const f = document.getElementById('cortexa-footer');
        if (t && f) {
          if (t.style.display === 'none') {
            t.style.display = '';
            f.style.display = '';
            e.target.textContent = '−';
          } else {
            t.style.display = 'none';
            f.style.display = 'none';
            e.target.textContent = '+';
          }
        }
      });
      
      panel.querySelectorAll('.mode-btn').forEach(b => {
        b.addEventListener('click', () => {
          if (TranscriptManager.running) return;
          panel.querySelectorAll('.mode-btn').forEach(x => x.classList.remove('active'));
          b.classList.add('active');
          TranscriptManager.mode = b.dataset.mode;
        });
      });

      TranscriptManager.render();
      updateButtons();
      
      window.__cortexa = { panel, TranscriptManager };
      console.log('✅ Cortexa Enhanced loaded - Low latency mode');
    }
  }
})();