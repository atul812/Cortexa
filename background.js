// Cortexa Background Service Worker - Optimized for Low Latency
// ==============================================================

// ⚠️ IMPORTANT: Add your OpenAI API key here
// Get it from: https://platform.openai.com/api-keys
const OPENAI_API_KEY = 'openaikey';

// Configuration for optimal performance
const CONFIG = {
  // Use smaller chunks for faster processing (2 seconds instead of 5)
  CHUNK_DURATION: 2000,
  
  // Whisper API optimizations
  WHISPER_MODEL: 'whisper-1',
  
  // Temperature affects randomness (0-1, lower = more deterministic)
  TEMPERATURE: 0.2,
  
  // Enable prompt for better accuracy in conversations
  USE_PROMPT: true,
  PROMPT_TEXT: 'Video call conversation. Multiple speakers discussing. Clear speech.'
};

chrome.runtime.onInstalled.addListener(() => {
  console.log('✅ Cortexa Enhanced installed - Optimized for low latency');
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'transcribeAudio') {
    transcribeWithWhisper(request.audioBlob, request.language)
      .then(result => {
        sendResponse({ success: true, transcript: result });
      })
      .catch(error => {
        console.error('Transcription error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'checkApiKey') {
    const isConfigured = OPENAI_API_KEY && 
                        OPENAI_API_KEY !== 'your_openai_api_key_here' &&
                        OPENAI_API_KEY.length > 20;
    sendResponse({ configured: isConfigured });
    return true;
  }
  
  if (request.action === 'getConfig') {
    sendResponse({ config: CONFIG });
    return true;
  }
});

// Optimized transcription with OpenAI Whisper API
async function transcribeWithWhisper(audioBlob, language = 'en') {
  // Validate API key
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
    throw new Error('OpenAI API key not configured');
  }
  
  // Skip very small audio files (< 0.5 seconds worth of data)
  if (audioBlob.size < 8000) {
    console.log('⏭️ Skipping tiny audio chunk');
    return '';
  }
  
  try {
    const startTime = performance.now();
    
    // Create FormData for multipart upload
    const formData = new FormData();
    
    // Convert blob to file with proper format
    const audioFile = new File([audioBlob], 'audio.webm', { 
      type: 'audio/webm;codecs=opus' 
    });
    formData.append('file', audioFile);
    formData.append('model', CONFIG.WHISPER_MODEL);
    
    // Set language for faster processing (auto-detect adds latency)
    if (language && language !== 'auto') {
      formData.append('language', language);
    }
    
    // Lower temperature for more deterministic, faster results
    formData.append('temperature', CONFIG.TEMPERATURE.toString());
    
    // Add prompt for better context and accuracy
    if (CONFIG.USE_PROMPT) {
      formData.append('prompt', CONFIG.PROMPT_TEXT);
    }
    
    // Use response_format=text for faster parsing (no JSON overhead)
    formData.append('response_format', 'text');
    
    console.log('🎤 Sending audio to Whisper...', {
      size: `${(audioBlob.size / 1024).toFixed(1)}KB`,
      language: language || 'auto'
    });
    
    // Call OpenAI Whisper API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: formData,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMsg;
      try {
        const errorData = JSON.parse(errorText);
        errorMsg = errorData.error?.message || `API error: ${response.status}`;
      } catch {
        errorMsg = `API error: ${response.status}`;
      }
      throw new Error(errorMsg);
    }
    
    // response_format=text returns plain text directly
    const transcriptText = await response.text();
    
    const processingTime = performance.now() - startTime;
    console.log(`✅ Transcription completed in ${processingTime.toFixed(0)}ms:`, transcriptText);
    
    return transcriptText.trim();
    
  } catch (error) {
    console.error('❌ Whisper API error:', error);
    
    // Provide helpful error messages
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - audio chunk too long or network slow');
    } else if (error.message.includes('API key') || error.message.includes('Incorrect')) {
      throw new Error('Invalid API key');
    } else if (error.message.includes('quota') || error.message.includes('insufficient')) {
      throw new Error('API quota exceeded');
    } else if (error.message.includes('network') || error.message.includes('Failed to fetch')) {
      throw new Error('Network error');
    }
    
    throw error;
  }
}

// Keep service worker alive during active transcription
let keepAliveInterval;

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'keepAlive') {
    port.onDisconnect.addListener(() => {
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
    });
    
    if (!keepAliveInterval) {
      keepAliveInterval = setInterval(() => {
        console.log('🔄 Keep alive ping');
      }, 20000);
    }
  }
});

console.log('🚀 Cortexa background service worker loaded - Low latency mode');