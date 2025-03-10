import React, { useState, useEffect, useRef } from 'react';
import { detectTaskIntent } from '../utils/taskUtils';

/**
 * Unified Chat/Task Input Component
 * Handles both conversational messages and task commands
 */
const ChatInput = ({ onSend, isProcessing, sessionId }) => {
  const [input, setInput] = useState('');
  const [inputMode, setInputMode] = useState('chat'); // 'chat' or 'task'
  const [taskType, setTaskType] = useState(null);
  const [taskSuggestions, setTaskSuggestions] = useState([]);
  const textareaRef = useRef(null);

  // Task command suggestions
  const commonTasks = [
    { command: '/document', description: 'Create a new document' },
    { command: '/analyze', description: 'Analyze data or text' },
    { command: '/reason', description: 'Step-by-step reasoning' },
    { command: '/summarize', description: 'Summarize content' }
  ];

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Detect task intent when input changes
  useEffect(() => {
    const detectIntent = async () => {
      if (input.startsWith('/')) {
        setInputMode('task');
        
        // Show command suggestions
        const typed = input.split(' ')[0].toLowerCase();
        const matches = commonTasks.filter(task => 
          task.command.toLowerCase().includes(typed)
        );
        setTaskSuggestions(matches);
        
        // Set task type if it's a complete command
        const commandMatch = input.match(/^\/([a-z-]+)(?:\s+.*)?$/i);
        if (commandMatch) {
          setTaskType(commandMatch[1].toLowerCase());
        }
      } else if (input.includes('<<TASK>>') || input.includes('[[TASK]]')) {
        setInputMode('task');
        
        // Extract task type from markup
        const taskMatch = input.match(/<<TASK:([a-z_]+)>>|[[TASK:([a-z_]+)]]/i);
        if (taskMatch) {
          setTaskType(taskMatch[1] || taskMatch[2] || 'general');
        } else {
          setTaskType('general');
        }
        
        setTaskSuggestions([]);
      } else {
        // Only switch back to chat mode if we're not empty (to preserve mode on send)
        if (input.trim()) {
          const detection = await detectTaskIntent(input);
          if (detection.isTask) {
            setInputMode('task');
            setTaskType(detection.type);
          } else {
            setInputMode('chat');
            setTaskType(null);
          }
        }
        
        setTaskSuggestions([]);
      }
    };
    
    detectIntent();
  }, [input]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isProcessing) return;
    
    // Final task detection before sending
    const detection = await detectTaskIntent(input);
    const isTaskMessage = inputMode === 'task' || detection.isTask;
    
    onSend({
      content: input,
      mode: isTaskMessage ? 'task' : 'chat',
      taskType: isTaskMessage ? (taskType || detection.type) : null,
      metadata: detection.parameters
    });

    // Clear input but maintain mode for next message
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const selectTaskSuggestion = (command) => {
    setInput(command + ' ');
    setTaskSuggestions([]);
  };

  return (
    <form className="chat-input-container" onSubmit={handleSubmit}>
      <div className="input-mode-indicator">
        {inputMode === 'task' ? (
          <span className="task-mode">
            💼 Task Mode {taskType ? `(${taskType})` : ''}
          </span>
        ) : (
          <span className="chat-mode">💬 Chat Mode</span>
        )}
      </div>

      <div className="input-wrapper">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            inputMode === 'task' 
              ? "Enter task (e.g., '/document Title: My Doc')" 
              : "Type a message..."
          }
          className="message-input"
          rows={1}
          maxLength="2000"
        />
        
        <div className="input-controls">
          <button type="button" className="emoji-picker">
            😊
          </button>
          <button 
            type="submit"
            disabled={isProcessing}
            className="send-button"
          >
            {isProcessing ? '...' : '➤'}
          </button>
        </div>
      </div>

      {taskSuggestions.length > 0 && (
        <div className="task-suggestions">
          {taskSuggestions.map((task, index) => (
            <div 
              key={index} 
              className="task-suggestion-item"
              onClick={() => selectTaskSuggestion(task.command)}
            >
              <span className="command">{task.command}</span>
              <span className="description">{task.description}</span>
            </div>
          ))}
        </div>
      )}

      <div className="input-actions">
        <button
          className={`mode-toggle ${inputMode}`}
          onClick={() => setInputMode(prev => prev === 'chat' ? 'task' : 'chat')}
          type="button"
        >
          {inputMode === 'chat' ? 'Switch to Task' : 'Switch to Chat'}
        </button>
      </div>
    </form>
  );
};

export default ChatInput;
