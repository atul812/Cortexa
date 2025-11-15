// popup.js - store OpenAI key (optional) and Groq key (used for summarization)
document.addEventListener('DOMContentLoaded', async () => {
  const openBtn = document.getElementById('open-page');
  const readmeBtn = document.getElementById('open-readme');
  const openaiInput = document.getElementById('openaiKey');
  const groqInput = document.getElementById('groqKey');
  const saveBtn = document.getElementById('saveKeys');
  const clearBtn = document.getElementById('clearKeys');
  const status = document.getElementById('keyStatus');

  function setStatus(text, color = '#333') {
    status.textContent = text;
    status.style.color = color;
  }

  openBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://meet.google.com' });
  });

  readmeBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('README.md') }).catch(() => {
      alert('README available inside the unpacked extension folder.');
    });
  });

  // load stored keys
  chrome.storage.local.get(['openai_api_key', 'groq_api_key'], (items) => {
    if (items.openai_api_key) openaiInput.value = items.openai_api_key;
    if (items.groq_api_key) groqInput.value = items.groq_api_key;
    if (items.groq_api_key) setStatus('Groq key loaded (summarization enabled)', '#0b63d3');
    else setStatus('Groq key not set — summarization disabled', '#92400e');
  });

  saveBtn.addEventListener('click', () => {
    const openaiKey = openaiInput.value.trim();
    const groqKey = groqInput.value.trim();
    chrome.storage.local.set({ openai_api_key: openaiKey, groq_api_key: groqKey }, () => {
      setStatus(groqKey ? 'Keys saved. Groq summarization enabled.' : 'Keys saved. Groq not set.', '#0b63d3');
    });
  });

  clearBtn.addEventListener('click', () => {
    openaiInput.value = '';
    groqInput.value = '';
    chrome.storage.local.remove(['openai_api_key', 'groq_api_key'], () => {
      setStatus('Keys removed; summarization disabled', '#92400e');
    });
  });
});
