// Popup script for Cortexa extension
document.addEventListener('DOMContentLoaded', () => {
  const openBtn = document.getElementById('open-page');
  const docsBtn = document.getElementById('docs');
  
  if (openBtn) {
    openBtn.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({url: 'https://meet.google.com'});
    });
  }
  
  if (docsBtn) {
    docsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({url: chrome.runtime.getURL('README.md')}).catch(() => {
        alert('README available inside the Cortexa folder (unpacked extension).');
      });
    });
  }
});

