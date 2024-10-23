// Configuration
// const ANTHROPIC_API_KEY = 'your-api-key'; // Store this securely

let settings = {
  apiKey: '',
  displayWidth: 1024,
  displayHeight: 768
};

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequests: 10,
  timeWindow: 60000, // 1 minute
  requests: new Set() // Use Set instead of Array for better performance
};

// Add to existing configuration section
const activeRequests = new Map();

// Add conversation history tracking
const conversations = new Map();

// Load settings when background script starts
chrome.storage.sync.get({
  apiKey: '',  // Remove hardcoded test key
  displayWidth: 1024,
  displayHeight: 768
}, function(items) {
  settings = items;
});

function checkRateLimit() {
  const now = Date.now();
  RATE_LIMIT.requests = new Set(
    Array.from(RATE_LIMIT.requests).filter(time => now - time < RATE_LIMIT.timeWindow)
  );
  
  if (RATE_LIMIT.requests.size >= RATE_LIMIT.maxRequests) {
    throw new Error('Rate limit exceeded. Please wait before making more requests.');
  }
  
  RATE_LIMIT.requests.add(now);
}

async function handleToolUse(toolUse) {
  try {
    if (toolUse.name === 'computer') {
      const result = await handleComputerTool(toolUse.input);
      // If result is an error message, return it as a string
      if (typeof result === 'string' && result.startsWith('Error:')) {
        return result;
      }
      return result;
    }
    throw new Error(`Unknown tool: ${toolUse.name}`);
  } catch (error) {
    console.error('Tool use error:', error);
    return `Error: ${error.message}`;
  }
}

async function handleComputerTool(input) {
  switch (input.action) {
    case 'screenshot':
      return takeScreenshot();
    case 'mouse_move':
      return moveMouse(input.coordinate);
    case 'left_click':
      return mouseClick();
    case 'type':
      if (input.target === 'url_bar') {
        await focusUrlBar();
        await new Promise(resolve => setTimeout(resolve, 100));
        return navigateToUrl(input.text);
      }
      return typeText(input.text);
    case 'scroll':
      return scroll(input.direction || 'vertical', input.amount || 100);
    case 'navigate':
      return navigateToUrl(input.url);
    default:
      console.error(`Unknown computer action: ${input.action}`);
      return `Error: Unknown computer action: ${input.action}`;
  }
}

async function takeScreenshot() {
  try {
    const tab = await getCurrentTab();
    const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png'
    });

    return [{
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/png',
        data: screenshot.split(',')[1]
      }
    }];
  } catch (error) {
    console.error('Screenshot error:', error);
    return `Error: Unable to capture screenshot - ${error.message}`;
  }
}

async function moveMouse(coordinate) {
  try {
    const tab = await getCurrentTab();
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (coord) => {
        const event = new MouseEvent('mousemove', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: coord.x,
          clientY: coord.y
        });
        document.elementFromPoint(coord.x, coord.y)?.dispatchEvent(event);
      },
      args: [coordinate]
    });

    return "Mouse moved to coordinates " + JSON.stringify(coordinate);
  } catch (error) {
    console.error('Mouse move error:', error);
    return `Error: ${error.message}`;
  }
}

async function mouseClick() {
  try {
    const tab = await getCurrentTab();
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const element = document.activeElement || document.elementFromPoint(window.mouseX, window.mouseY);
        if (element) {
          const events = ['mousedown', 'mouseup', 'click'].map(type => new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            view: window
          }));
          
          events.forEach(event => element.dispatchEvent(event));
        }
      }
    });

    return "Mouse click performed";
  } catch (error) {
    console.error('Mouse click error:', error);
    return `Error: ${error.message}`;
  }
}

async function scroll(direction, amount) {
  try {
    const tab = await getCurrentTab();
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (scrollData) => {
        if (scrollData.direction === 'vertical') {
          window.scrollBy(0, scrollData.amount);
        } else {
          window.scrollBy(scrollData.amount, 0);
        }
      },
      args: [{ direction, amount }]
    });

    return `Scrolled ${direction} by ${amount} pixels`;
  } catch (error) {
    console.error('Scroll error:', error);
    return `Error: ${error.message}`;
  }
}

async function typeText(text) {
  try {
    const tab = await getCurrentTab();
    
    // Check if we need to type in the URL bar
    if (text.startsWith('url:')) {
      const url = text.substring(4).trim();
      return navigateToUrl(url);
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (inputText) => {
        const element = document.activeElement;
        if (element && (element.isContentEditable || 
            ['input', 'textarea'].includes(element.tagName.toLowerCase()))) {
          if (element.isContentEditable) {
            element.innerText = inputText;
          } else {
            element.value = inputText;
          }
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
      },
      args: [text]
    });

    return "Text entered: " + text;
  } catch (error) {
    console.error('Type text error:', error);
    return `Error: ${error.message}`;
  }
}

async function navigateToUrl(url) {
  try {
    const tab = await getCurrentTab();
    
    // Handle search queries vs URLs
    let finalUrl = url;
    if (!url.includes('.') || url.includes(' ')) {
      // Treat as search query
      finalUrl = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
    } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
      finalUrl = 'https://' + url;
    }

    // Update the current tab's URL
    await chrome.tabs.update(tab.id, { url: finalUrl });
    
    // Wait for navigation to complete
    await new Promise(resolve => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      });
    });

    return `Navigated to ${finalUrl}`;
  } catch (error) {
    console.error('Navigation error:', error);
    return `Error: ${error.message}`;
  }
}

async function sendToClaudeAPI(userInstruction, requestId, retryCount = 0) {
  if (!settings.apiKey) {
    throw new Error('API key not configured. Please visit the extension settings.');
  }

  checkRateLimit();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    if (requestId) {
      activeRequests.set(requestId, controller);
    }

    // Get or initialize conversation history
    let messages = conversations.get(requestId) || [];
    
    // Add new message to history
    if (typeof userInstruction === 'string') {
      messages = [{ role: 'user', content: userInstruction }];  // Start fresh for new instructions
    } else {
      messages.push(userInstruction);  // Add tool result to existing conversation
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'computer-use-2024-10-22',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        tools: [{
          type: 'computer_20241022',
          name: 'computer',
          display_width_px: settings.displayWidth,
          display_height_px: settings.displayHeight,
          display_number: 1
        }],
        messages: messages
      })
    });

    clearTimeout(timeoutId);

    const responseData = await response.json();

    if (!response.ok) {
      activeRequests.delete(requestId);
      throw new Error(`API Error: ${responseData.error?.message || response.statusText}`);
    }

    if (responseData.stop_reason === 'tool_use' && 
        responseData.content.some(c => c.type === 'tool_use')) {
      const toolUse = responseData.content.find(c => c.type === 'tool_use');
      const toolResult = await handleToolUse(toolUse);

      // Store the current conversation state
      messages.push({
        role: 'assistant',
        content: responseData.content
      });
      conversations.set(requestId, messages);

      // Send tool result
      return sendToClaudeAPI({
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: toolResult
        }]
      }, requestId);
    }

    // Clean up when conversation is complete
    conversations.delete(requestId);
    activeRequests.delete(requestId);

    return responseData;
  } catch (error) {
    activeRequests.delete(requestId);
    conversations.delete(requestId);
    
    if (error.name === 'AbortError') {
      throw new Error('REQUEST_CANCELLED');
    }
    
    const networkErrors = ['TimeoutError', 'NetworkError', '429'];
    const shouldRetry = retryCount < 3 && networkErrors.some(e => 
      error.name === e || error.message.includes(e)
    );

    if (shouldRetry) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return sendToClaudeAPI(userInstruction, requestId, retryCount + 1);
    }
    
    throw error;
  }
}

const messageQueue = {
  queue: [],  // Change back to array for proper ordering
  processing: false,
  
  async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    const { message, sendResponse } = this.queue.shift();  // Use shift() for FIFO queue
    
    try {
      const response = await sendToClaudeAPI(message.instruction, message.requestId);
      sendResponse({ success: true, data: response });
    } catch (error) {
      console.error('Processing error:', error);
      sendResponse({ success: false, error: error.message });
    } finally {
      this.processing = false;
      this.process(); // Process next in queue
    }
  },
  
  add(message, sendResponse) {
    this.queue.push({ message, sendResponse });  // Use push() to add to queue
    this.process();
  }
};

// Update message listener to ensure long-lived connections
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'EXECUTE_INSTRUCTION':
      messageQueue.add(request, sendResponse);
      return true;  // Will respond asynchronously
    case 'CANCEL_INSTRUCTION':
      const controller = activeRequests.get(request.requestId);
      if (controller) {
        controller.abort();
        activeRequests.delete(request.requestId);
      }
      sendResponse({ success: true });
      return false;  // Responding synchronously
    case 'SETTINGS_UPDATED':
      settings = request.settings;
      sendResponse({ success: true });
      return false;  // Responding synchronously
    default:
      sendResponse({ success: false, error: 'Unknown request type' });
      return false;
  }
});

// Add this helper function
function isAllowedUrl(url) {
  // Allow all URLs except chrome:// and chrome-extension://
  return url && !url.startsWith('chrome://') && !url.startsWith('chrome-extension://');
}

// Update the tab query functions
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) throw new Error('No active tab found');
  if (!isAllowedUrl(tab.url)) throw new Error('Cannot interact with this type of page');
  return tab;
}

// Add this new function to handle URL bar interactions
async function focusUrlBar() {
  try {
    const tab = await getCurrentTab();
    // Use chrome.tabs.update to highlight the URL bar
    await chrome.tabs.update(tab.id, { highlighted: true });
    return "URL bar focused";
  } catch (error) {
    console.error('Focus URL bar error:', error);
    return `Error: ${error.message}`;
  }
}
