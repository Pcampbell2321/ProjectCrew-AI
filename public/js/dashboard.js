class AIDashboard {
  constructor() {
    this.csrfToken = null;
    this.currentTask = null;
    this.currentResult = null;
    this.taskHistory = [];
    
    this.initElements();
    this.initEventListeners();
    this.loadUserInfo();
    this.fetchCsrfToken();
    this.loadHistory();
  }
  
  initElements() {
    // Task elements
    this.taskContentEl = document.getElementById('taskContent');
    this.requireReasoningEl = document.getElementById('requireReasoning');
    this.complexityOverrideEl = document.getElementById('complexityOverride');
    this.submitTaskBtn = document.getElementById('submitTaskBtn');
    
    // Result elements
    this.modelUsedEl = document.getElementById('modelUsed');
    this.complexityScoreEl = document.getElementById('complexityScore');
    this.processingTimeEl = document.getElementById('processingTime');
    this.aiOutputEl = document.getElementById('aiOutput');
    
    // Action buttons
    this.saveToDriveBtn = document.getElementById('saveToDriveBtn');
    this.exportToZohoBtn = document.getElementById('exportToZohoBtn');
    this.copyBtn = document.getElementById('copyBtn');
    
    // Navigation
    this.newTaskBtn = document.getElementById('newTaskBtn');
    this.refreshBtn = document.getElementById('refreshBtn');
    this.navLinks = document.querySelectorAll('.nav-links a');
  }
  
  initEventListeners() {
    // Task submission
    this.submitTaskBtn.addEventListener('click', () => this.submitTask());
    
    // Action buttons
    this.saveToDriveBtn.addEventListener('click', () => this.saveToDrive());
    this.exportToZohoBtn.addEventListener('click', () => this.exportToZoho());
    this.copyBtn.addEventListener('click', () => this.copyToClipboard());
    
    // Navigation
    this.newTaskBtn.addEventListener('click', () => this.showTaskInput());
    this.refreshBtn.addEventListener('click', () => this.refreshDashboard());
    
    // Nav links
    this.navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = e.target.getAttribute('href').substring(1);
        this.navigateTo(target);
      });
    });
  }
  
  async fetchCsrfToken() {
    try {
      const response = await fetch('/api/csrf-token');
      const data = await response.json();
      this.csrfToken = data.csrfToken;
    } catch (error) {
      this.showNotification('Failed to fetch CSRF token', 'error');
    }
  }
  
  loadUserInfo() {
    // In a real app, this would fetch user info from the server
    // For now, we'll use placeholder data
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    
    userAvatar.src = '/img/default-avatar.png';
    userName.textContent = 'User';
  }
  
  async submitTask() {
    const taskContent = this.taskContentEl.value.trim();
    if (!taskContent) {
      this.showNotification('Please enter a task description', 'warning');
      return;
    }
    
    if (taskContent.length < 10) {
      this.showNotification('Task description is too short', 'warning');
      return;
    }
    
    this.submitTaskBtn.disabled = true;
    this.submitTaskBtn.textContent = 'Processing...';
    this.aiOutputEl.innerHTML = '<div class="loading">Processing your request</div>';
    
    const task = {
      content: taskContent
    };
    
    const context = {
      requiresReasoning: this.requireReasoningEl.checked,
      complexityOverride: this.complexityOverrideEl.value
    };
    
    try {
      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.csrfToken
        },
        body: JSON.stringify({ task, context })
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      const result = await response.json();
      this.displayResults(result);
      this.currentTask = task;
      this.currentResult = result;
      this.saveToLocalHistory({ task, result, timestamp: new Date().toISOString() });
    } catch (error) {
      this.showError(error);
    } finally {
      this.submitTaskBtn.disabled = false;
      this.submitTaskBtn.textContent = 'Process Task';
    }
  }
  
  displayResults(result) {
    this.modelUsedEl.textContent = `Model: ${result.model || 'Unknown'}`;
    this.complexityScoreEl.textContent = `Complexity: ${result.complexity || 'N/A'}`;
    this.processingTimeEl.textContent = `Processed in ${result.duration || 0}ms`;
    
    // Sanitize and render markdown
    const sanitizedContent = DOMPurify.sanitize(marked.parse(result.content || ''));
    this.aiOutputEl.innerHTML = sanitizedContent;
    
    // Enable action buttons
    this.saveToDriveBtn.disabled = false;
    this.exportToZohoBtn.disabled = false;
    this.copyBtn.disabled = false;
  }
  
  async saveToDrive() {
    if (!this.currentTask || !this.currentResult) {
      this.showNotification('No content to save', 'warning');
      return;
    }
    
    try {
      const content = {
        task: this.currentTask,
        result: this.currentResult,
        timestamp: new Date().toISOString()
      };
      
      const response = await fetch('/api/ai/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.csrfToken
        },
        body: JSON.stringify(content)
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      const data = await response.json();
      this.showNotification('Saved to Google Drive successfully', 'success');
    } catch (error) {
      this.showNotification('Failed to save to Drive: ' + error.message, 'error');
    }
  }
  
  exportToZoho() {
    // To be implemented
    this.showNotification('Export to Zoho feature coming soon', 'info');
  }
  
  copyToClipboard() {
    if (!this.currentResult || !this.currentResult.content) {
      this.showNotification('No content to copy', 'warning');
      return;
    }
    
    navigator.clipboard.writeText(this.currentResult.content)
      .then(() => this.showNotification('Copied to clipboard', 'success'))
      .catch(err => this.showNotification('Failed to copy: ' + err.message, 'error'));
  }
  
  saveToLocalHistory(item) {
    // Get existing history from localStorage
    let history = JSON.parse(localStorage.getItem('taskHistory') || '[]');
    
    // Add new item at the beginning
    history.unshift(item);
    
    // Keep only the last 20 items
    if (history.length > 20) {
      history = history.slice(0, 20);
    }
    
    // Save back to localStorage
    localStorage.setItem('taskHistory', JSON.stringify(history));
    
    // Update the instance variable
    this.taskHistory = history;
    
    // Update the UI if history view is active
    this.updateHistoryUI();
  }
  
  loadHistory() {
    this.taskHistory = JSON.parse(localStorage.getItem('taskHistory') || '[]');
    this.updateHistoryUI();
  }
  
  updateHistoryUI() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    historyList.innerHTML = '';
    
    if (this.taskHistory.length === 0) {
      historyList.innerHTML = '<p>No history yet</p>';
      return;
    }
    
    this.taskHistory.forEach((item, index) => {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      historyItem.dataset.index = index;
      
      const date = new Date(item.timestamp);
      const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
      
      historyItem.innerHTML = `
        <div class="history-item-header">
          <span class="history-item-model">${item.result?.model || 'Unknown model'}</span>
          <span class="history-item-date">${formattedDate}</span>
        </div>
        <div class="history-item-content">${item.task?.content || 'No content'}</div>
      `;
      
      historyItem.addEventListener('click', () => this.loadHistoryItem(index));
      historyList.appendChild(historyItem);
    });
  }
  
  loadHistoryItem(index) {
    const item = this.taskHistory[index];
    if (!item) return;
    
    this.currentTask = item.task;
    this.currentResult = item.result;
    
    // Update the task input
    this.taskContentEl.value = item.task?.content || '';
    
    // Display the result
    this.displayResults(item.result);
    
    // Switch to task view
    this.navigateTo('tasks');
  }
  
  navigateTo(target) {
    // Update active nav link
    this.navLinks.forEach(link => {
      const linkTarget = link.getAttribute('href').substring(1);
      if (linkTarget === target) {
        link.parentElement.classList.add('active');
      } else {
        link.parentElement.classList.remove('active');
      }
    });
    
    // Show/hide containers
    const taskContainer = document.querySelector('.task-container');
    const historyContainer = document.querySelector('.history-container');
    
    switch (target) {
      case 'tasks':
        taskContainer.style.display = 'grid';
        historyContainer.style.display = 'none';
        break;
      case 'history':
        taskContainer.style.display = 'none';
        historyContainer.style.display = 'block';
        this.updateHistoryUI();
        break;
      case 'drive':
        // To be implemented
        this.showNotification('Drive files view coming soon', 'info');
        break;
      case 'settings':
        // To be implemented
        this.showNotification('Settings view coming soon', 'info');
        break;
    }
  }
  
  showTaskInput() {
    // Clear the form and results
    this.taskContentEl.value = '';
    this.requireReasoningEl.checked = false;
    this.complexityOverrideEl.value = 'auto';
    
    this.aiOutputEl.innerHTML = '';
    this.modelUsedEl.textContent = '';
    this.complexityScoreEl.textContent = '';
    this.processingTimeEl.textContent = '';
    
    // Disable action buttons
    this.saveToDriveBtn.disabled = true;
    this.exportToZohoBtn.disabled = true;
    this.copyBtn.disabled = true;
    
    // Navigate to tasks view
    this.navigateTo('tasks');
    
    // Focus on the textarea
    this.taskContentEl.focus();
  }
  
  refreshDashboard() {
    window.location.reload();
  }
  
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Show with animation
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }
  
  showError(error) {
    console.error('Error:', error);
    this.aiOutputEl.innerHTML = `
      <div class="error-message">
        <h3>Error</h3>
        <p>${error.message || 'An unknown error occurred'}</p>
      </div>
    `;
    this.showNotification(error.message || 'An error occurred', 'error');
  }
}

// Initialize the dashboard when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.dashboard = new AIDashboard();
});
