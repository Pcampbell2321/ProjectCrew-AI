import React, { useState, useEffect } from 'react';
import MessageHistory from './MessageHistory';
import ChatInput from './ChatInput';
import '../styles/chat.css';

const ChatInterface = ({ sessionId, userId, apiService }) => {
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState(false);

  // Load chat history on component mount
  useEffect(() => {
    if (sessionId) {
      loadChatHistory();
    }
  }, [sessionId]);

  const loadChatHistory = async () => {
    try {
      const history = await apiService.getChatHistory(sessionId);
      setMessages(history);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const handleSendMessage = async (message) => {
    if (typeof message === 'string' && !message.trim()) return;
    
    const content = typeof message === 'string' ? message : message.content;
    const mode = typeof message === 'object' ? message.mode : 'chat';
    const taskType = typeof message === 'object' ? message.taskType : null;
    const metadata = typeof message === 'object' ? message.metadata : null;
    
    // Add user message to UI immediately
    const userMessage = {
      role: 'user',
      type: 'user',
      content,
      timestamp: new Date().toISOString(),
      status: 'sent',
      metadata: {
        ...(metadata || {})
      }
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);
    
    // Show typing indicator after a short delay
    setTimeout(() => setTypingIndicator(true), 500);
    
    try {
      // Send to API
      const response = await apiService.sendChatMessage(
        userId, 
        sessionId, 
        {
          content,
          mode,
          taskType,
          metadata
        }
      );
      
      // Hide typing indicator
      setTypingIndicator(false);
      
      // Update user message status to delivered
      setMessages(prev => prev.map(msg => 
        msg === userMessage ? { ...msg, status: 'delivered' } : msg
      ));
      
      // Add assistant response
      const assistantMessage = {
        role: 'assistant',
        type: response.type === 'task' ? 'task' : 'system',
        taskType: response.type === 'task' ? (taskType || 'general') : null,
        content: response.response,
        timestamp: response.timestamp || new Date().toISOString(),
        status: 'delivered',
        metadata: response.metadata
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Add error message
      setMessages(prev => [
        ...prev, 
        {
          role: 'system',
          type: 'system',
          content: 'Failed to send message. Please try again.',
          timestamp: new Date().toISOString(),
          status: 'error'
        }
      ]);
    } finally {
      setIsProcessing(false);
      setTypingIndicator(false);
    }
  };

  return (
    <div className="chat-interface">
      <MessageHistory messages={messages} />
      
      {typingIndicator && (
        <div className="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      )}
      
      <ChatInput 
        onSend={handleSendMessage} 
        isProcessing={isProcessing}
        sessionId={sessionId}
      />
    </div>
  );
};

export default ChatInterface;
