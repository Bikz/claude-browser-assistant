document.addEventListener('DOMContentLoaded', function() {
  const apiKeyInput = document.getElementById('apiKey');
  const showApiKeyBtn = document.getElementById('showApiKey');
  const displayWidthInput = document.getElementById('displayWidth');
  const displayHeightInput = document.getElementById('displayHeight');
  const saveBtn = document.getElementById('saveBtn');
  const statusDiv = document.getElementById('status');

  // Load saved settings
  chrome.storage.sync.get({
    apiKey: '',
    displayWidth: 1024,
    displayHeight: 768
  }, function(items) {
    apiKeyInput.value = items.apiKey;
    displayWidthInput.value = items.displayWidth;
    displayHeightInput.value = items.displayHeight;
  });

  // Toggle API key visibility
  showApiKeyBtn.addEventListener('mousedown', () => {
    apiKeyInput.type = 'text';
  });
  
  showApiKeyBtn.addEventListener('mouseup', () => {
    apiKeyInput.type = 'password';
  });
  
  showApiKeyBtn.addEventListener('mouseleave', () => {
    apiKeyInput.type = 'password';
  });

  function validateSettings(settings) {
    if (!settings.apiKey) {
      throw new Error('API key is required');
    }
    if (settings.displayWidth < 320 || settings.displayWidth > 3840) {
      throw new Error('Display width must be between 320 and 3840 pixels');
    }
    if (settings.displayHeight < 240 || settings.displayHeight > 2160) {
      throw new Error('Display height must be between 240 and 2160 pixels');
    }
    return settings;
  }

  saveBtn.addEventListener('click', function() {
    try {
      const settings = validateSettings({
        apiKey: apiKeyInput.value,
        displayWidth: parseInt(displayWidthInput.value),
        displayHeight: parseInt(displayHeightInput.value)
      });

      chrome.storage.sync.set(settings, function() {
        showStatus('Settings saved successfully!', 'success');
        
        // Notify background script of updated settings
        chrome.runtime.sendMessage({
          type: 'SETTINGS_UPDATED',
          settings: settings
        });
      });
    } catch (error) {
      showStatus(error.message, 'error');
    }
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = type;
    statusDiv.style.display = 'block';
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }
});
