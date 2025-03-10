const driveService = require('../utils/googleDriveService');

class ChatSession {
  constructor(userId, sessionId = null) {
    this.userId = userId;
    this.sessionId = sessionId || `chat-${Date.now()}`;
    this.history = [];
    this.context = {};
  }

  async initialize() {
    if (!this.sessionId) {
      await this._createNewSession();
    } else {
      await this._loadExistingSession();
    }
    return this;
  }

  async addMessage(role, content) {
    const message = {
      role,
      content,
      timestamp: new Date().toISOString()
    };
    
    this.history.push(message);
    await this._saveToDrive();
    return message;
  }

  async getContextualPrompt(task) {
    return [
      "Chat History:",
      ...this.history.slice(-6).map(m => `${m.role}: ${m.content}`),
      "Current Task:",
      task
    ].join('\n');
  }

  async getHistory() {
    return this.history;
  }

  /**
   * Get compact conversation history for AI context
   * @returns {Array} Last 3 exchanges (user + assistant pairs) with truncated content
   */
  async getCompactHistory() {
    // Ensure we have fresh data
    if (!this.history || this.history.length === 0) {
      await this._loadExistingSession();
    }

    // Ensure history exists and is an array
    if (!Array.isArray(this.history)) {
      this.history = [];
    }

    // Return last 6 messages with safe truncation
    return this.history
      .slice(-6) // Keep last 3 exchanges (6 messages - 3 user + 3 assistant)
      .map(msg => ({
        role: msg.role || 'user', // Default role
        content: msg.content 
          ? String(msg.content).slice(0, 500) + (String(msg.content).length > 500 ? '...' : '')
          : ''
      }));
  }

  async _createNewSession() {
    this.sessionId = `chat-${Date.now()}-${this.userId}`;
    this.history = [{
      role: 'system',
      content: 'Chat session initialized',
      timestamp: new Date().toISOString()
    }];
    await this._saveToDrive();
  }

  async _loadExistingSession() {
    try {
      const content = await driveService.readFile(this.sessionId);
      const data = JSON.parse(content);
      this.history = data.history;
      this.context = data.context;
    } catch (error) {
      console.error('Error loading session:', error);
      await this._createNewSession();
    }
  }

  async _saveToDrive() {
    const sessionData = {
      history: this.history,
      context: this.context,
      metadata: {
        userId: this.userId,
        lastUpdated: new Date().toISOString(),
        platform: 'ProjectCrew AI'
      }
    };

    await driveService.createOrUpdateFile(
      `${this.sessionId}.json`,
      JSON.stringify(sessionData, null, 2),
      'application/json',
      `project-crew-ai/chats/${this.userId}`
    );
  }
}

module.exports = ChatSession;
