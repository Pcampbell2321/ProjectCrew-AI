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
  document.getElementById('typingIndicator').style.display = 'block';
}

function hideTypingIndicator() {
  document.getElementById('typingIndicator').style.display = 'none';
}

function renderMarkdown(content) {
  return DOMPurify.sanitize(marked.parse(content));
}

// Enhanced appendMessage function
function appendMessage(role, content, attachments = []) {
  const historyDiv = document.getElementById('chatHistory') || document.getElementById('aiOutput');
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${role}-message`;
  
  // Add markdown support
  messageDiv.innerHTML = renderMarkdown(content);
  
  // Add file attachments
  if (attachments && attachments.length > 0) {
    attachments.forEach(file => {
      const attachmentDiv = document.createElement('div');
      attachmentDiv.className = 'attachment-preview';
      attachmentDiv.textContent = `📎 ${file.name || 'Attachment'}`;
      messageDiv.appendChild(attachmentDiv);
    });
  }
  
  historyDiv.appendChild(messageDiv);
  historyDiv.scrollTop = historyDiv.scrollHeight;
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
    
    showTypingIndicator();
    const messageInput = document.getElementById('messageInput');
    messageInput.disabled = true;
    
    const formData = new FormData();
    formData.append('message', message);
    formData.append('sessionId', currentSessionId);
    
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
    appendMessage('assistant', data.response);
    
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
    const historyDiv = document.getElementById('chatHistory') || document.getElementById('aiOutput');
    if (historyDiv) historyDiv.innerHTML = '';
    
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
    const historyDiv = document.getElementById('chatHistory') || document.getElementById('aiOutput');
    if (historyDiv) historyDiv.innerHTML = '';
    
    // Add messages from history
    if (data.history && data.history.length > 0) {
      data.history.forEach(msg => {
        appendMessage(msg.role, msg.content);
      });
      document.getElementById('chatStatus').textContent = 'Chat history loaded';
    } else {
      document.getElementById('chatStatus').textContent = 'No previous messages';
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
