// Chat functionality
let currentSessionId = null;

// Helper functions
function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  setTimeout(() => errorDiv.style.display = 'none', 5000);
}

function showTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
  indicator.style.display = 'flex';
}

function hideTypingIndicator() {
  document.getElementById('typingIndicator').style.display = 'none';
}

function renderMarkdown(content) {
  return DOMPurify.sanitize(marked.parse(content));
}

// Enhanced appendMessage function
function appendMessage(role, content, attachments = []) {
  const historyDiv = document.getElementById('chatHistory');
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${role}-message`;
  
  // Message content
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.innerHTML = renderMarkdown(content);
  
  // Message metadata
  const metaDiv = document.createElement('div');
  metaDiv.className = 'message-meta';
  metaDiv.innerHTML = `
    <span>${role === 'user' ? 'You' : 'AI Assistant'}</span>
    <span>${new Date().toLocaleTimeString()}</span>
  `;

  // Attachments
  if (attachments && attachments.length > 0) {
    const attachmentsDiv = document.createElement('div');
    attachmentsDiv.className = 'attachments';
    attachments.forEach(file => {
      const attachment = document.createElement('div');
      attachment.className = 'attachment-preview';
      attachment.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
        <span>${file.name || 'Attachment'}</span>
      `;
      attachmentsDiv.appendChild(attachment);
    });
    messageDiv.appendChild(attachmentsDiv);
  }

  messageDiv.appendChild(contentDiv);
  messageDiv.appendChild(metaDiv);
  historyDiv.appendChild(messageDiv);
  
  // Smooth scroll
  historyDiv.scrollTo({
    top: historyDiv.scrollHeight,
    behavior: 'smooth'
  });
}

// Get CSRF token
async function getCsrfToken() {
  try {
    const response = await fetch('/api/csrf-token');
    const data = await response.json();
    return data.csrfToken;
  } catch (error) {
    console.error('Failed to get CSRF token:', error);
    showError('Security verification failed. Please refresh the page.');
    return null;
  }
}

// Enhanced sendMessage function
async function sendMessage(message) {
  try {
    if (!message.trim()) return;
    
    // Check for task command
    const isTask = message.startsWith('/task') || message.startsWith('/process');
    const cleanMessage = isTask ? message.replace(/^\/task\s*/i, '') : message;
    
    showTypingIndicator();
    const messageInput = document.getElementById('messageInput');
    messageInput.disabled = true;
    
    const formData = new FormData();
    formData.append('message', cleanMessage);
    formData.append('sessionId', currentSessionId);
    formData.append('isTask', isTask);
    
    // Handle file attachments
    const fileInput = document.getElementById('fileAttachment');
    if (fileInput.files.length > 0) {
      formData.append('attachment', fileInput.files[0]);
    }
    
    const csrfToken = await getCsrfToken();
    if (!csrfToken) {
      messageInput.disabled = false;
      hideTypingIndicator();
      return;
    }
    
    const response = await fetch('/api/chat/message', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    currentSessionId = data.sessionId;
    
    appendMessage('user', message, fileInput.files.length > 0 ? [{name: fileInput.files[0].name}] : []);
    
    if (isTask) {
      appendMessage('assistant', `
        <div class="task-result">
          <h4>Task Processed</h4>
          <div class="task-meta">
            <span>Model: ${data.model || 'Default'}</span>
            <span>Complexity: ${data.complexity || 'Standard'}</span>
            <span>Processing Time: ${data.duration || '0'}ms</span>
          </div>
          <div class="task-content">${data.response}</div>
        </div>
      `);
    } else {
      appendMessage('assistant', data.response);
    }
    
    // Reset file input and message input
    fileInput.value = '';
    messageInput.value = '';
    
  } catch (error) {
    showError(`Failed to send message: ${error.message}`);
    console.error('Send message error:', error);
  } finally {
    hideTypingIndicator();
    const messageInput = document.getElementById('messageInput');
    messageInput.disabled = false;
    messageInput.focus();
  }
}

// Update startNewChat with error handling
async function startNewChat() {
  try {
    document.getElementById('chatStatus').textContent = 'Starting new session...';
    
    const csrfToken = await getCsrfToken();
    if (!csrfToken) return;
    
    const response = await fetch('/api/chat/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      }
    });
    
    if (!response.ok) throw new Error('Failed to start session');
    
    const data = await response.json();
    currentSessionId = data.sessionId;
    document.getElementById('chatStatus').textContent = 'New chat session started';
    
    // Clear previous chat history
    const historyDiv = document.getElementById('chatHistory');
    if (historyDiv) historyDiv.innerHTML = '';
    
    // Add welcome message
    appendMessage('assistant', 'Hello! I\'m your ProjectCrew AI assistant. How can I help you today?');
    
    await loadChatHistory();
    
  } catch (error) {
    showError(`Session initialization failed: ${error.message}`);
    console.error('Session start error:', error);
  }
}

// Load chat history
async function loadChatHistory() {
  if (!currentSessionId) return;
  
  try {
    const csrfToken = await getCsrfToken();
    if (!csrfToken) return;
    
    const response = await fetch(`/api/chat/history?sessionId=${currentSessionId}`, {
      headers: {
        'X-CSRF-Token': csrfToken
      }
    });
    
    if (!response.ok) throw new Error('Failed to load chat history');
    
    const data = await response.json();
    
    // Clear existing messages
    const historyDiv = document.getElementById('chatHistory');
    if (historyDiv) historyDiv.innerHTML = '';
    
    // Add messages from history
    if (data.history && data.history.length > 0) {
      data.history.forEach(msg => {
        appendMessage(msg.role, msg.content, msg.attachments || []);
      });
      document.getElementById('chatStatus').textContent = 'Chat history loaded';
    } else {
      // Add welcome message if no history
      appendMessage('assistant', 'Hello! I\'m your ProjectCrew AI assistant. How can I help you today?');
      document.getElementById('chatStatus').textContent = 'New conversation started';
    }
    
  } catch (error) {
    showError(`Failed to load history: ${error.message}`);
    console.error('History load error:', error);
  }
}

// Initialize chat when document is ready
document.addEventListener('DOMContentLoaded', function() {
  // Set up chat form submission
  const chatForm = document.getElementById('chatForm');
  if (chatForm) {
    chatForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const messageInput = document.getElementById('messageInput');
      const message = messageInput.value.trim();
      if (message) {
        sendMessage(message);
      }
    });
  }
  
  // Start a new chat session
  startNewChat();
});
