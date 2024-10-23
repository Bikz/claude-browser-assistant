document.addEventListener('DOMContentLoaded', function() {
  const instructionInput = document.getElementById('instructionInput');
  const executeBtn = document.getElementById('executeBtn');
  const stopBtn = document.getElementById('stopBtn');
  const statusDiv = document.getElementById('status');
  const resultDiv = document.getElementById('result');
  const settingsBtn = document.getElementById('settingsBtn');

  let currentRequestId = null;

  function showLoading(isLoading) {
    executeBtn.style.display = isLoading ? 'none' : 'block';
    stopBtn.style.display = isLoading ? 'block' : 'none';
    executeBtn.disabled = isLoading;
  }

  function validateInstruction(instruction) {
    if (instruction.length < 3) {
      throw new Error('Instruction too short');
    }
    if (instruction.length > 1000) {
      throw new Error('Instruction too long');
    }
    return instruction;
  }

  executeBtn.addEventListener('click', async () => {
    try {
      showLoading(true);
      const instruction = validateInstruction(instructionInput.value.trim());
      
      if (!instruction) {
        showStatus('Please enter an instruction', 'error');
        return;
      }

      showStatus('Executing instruction...', 'info');
      
      // Generate a unique request ID
      currentRequestId = Date.now().toString();

      const response = await chrome.runtime.sendMessage({
        type: 'EXECUTE_INSTRUCTION',
        instruction: instruction,
        requestId: currentRequestId
      });

      if (response.success) {
        showStatus('Instruction executed successfully', 'success');
        displayResult(response.data);
      } else {
        showStatus('Error: ' + response.error, 'error');
      }
    } catch (error) {
      if (error.message === 'REQUEST_CANCELLED') {
        showStatus('Execution stopped by user', 'info');
      } else {
        showStatus('Error: ' + error.message, 'error');
      }
    } finally {
      showLoading(false);
      currentRequestId = null;
    }
  });

  stopBtn.addEventListener('click', async () => {
    if (currentRequestId) {
      await chrome.runtime.sendMessage({
        type: 'CANCEL_INSTRUCTION',
        requestId: currentRequestId
      });
      showStatus('Stopping execution...', 'info');
    }
  });

  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
    statusDiv.className = `status ${type}`;
  }

  function displayResult(data) {
    let formattedContent = '';
    
    if (data.content) {
      formattedContent = data.content.map(block => {
        switch (block.type) {
          case 'text':
            return `<div class="text-block">${block.text}</div>`;
          case 'tool_use':
            return `<div class="tool-block">
              <strong>Action:</strong> ${block.input.action}<br>
              <strong>Details:</strong> ${JSON.stringify(block.input, null, 2)}
            </div>`;
          case 'tool_result':
            if (block.content?.type === 'image') {
              return `<div class="image-block">
                <img src="data:${block.content.source.media_type};base64,${block.content.source.data}" 
                     style="max-width: 100%; height: auto;">
              </div>`;
            }
            return `<div class="result-block">
              <pre>${JSON.stringify(block.content, null, 2)}</pre>
            </div>`;
          default:
            return '';
        }
      }).join('\n');
    }
    
    resultDiv.innerHTML = formattedContent || '<i>No content to display</i>';
  }
});
