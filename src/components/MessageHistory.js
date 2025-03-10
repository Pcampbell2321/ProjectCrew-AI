import React, { useRef, useEffect } from 'react';

/**
 * Unified Message History Component
 * Displays both chat messages and task results
 */
const MessageHistory = ({ messages }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!messages || messages.length === 0) {
    return (
      <div className="empty-message-container">
        <p>No messages yet. Start a conversation or run a task.</p>
      </div>
    );
  }

  // Format timestamp to HH:MM format
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="message-container">
      {messages.map((msg, index) => (
        <div key={index} className={`message ${msg.type || (msg.role === 'user' ? 'user' : 'system')}`}>
          {msg.type === 'task' ? (
            <div className="task-result">
              <div className="task-header">
                <span className="task-icon">⚙️</span>
                <h4>{msg.taskType || 'General'} Task</h4>
                <span className={`status ${msg.metadata?.status || 'success'}`}>
                  {msg.metadata?.status === 'error' ? '❌' : '✅'}
                </span>
              </div>
              
              {msg.metadata?.model && (
                <div className="model-info">
                  Processed by: {msg.metadata.model}
                </div>
              )}
              
              <div className="task-content">
                {renderTaskContent(msg)}
              </div>
              
              <div className="message-time">
                {formatTime(msg.timestamp)}
                {msg.status === 'sent' && ' ✓'}
                {msg.status === 'delivered' && ' ✓✓'}
              </div>
            </div>
          ) : (
            <div className="chat-message">
              <div className="message-content">
                <p>{msg.content}</p>
                
                {msg.metadata?.attachments && msg.metadata.attachments.length > 0 && (
                  <div className="attachments">
                    {msg.metadata.attachments.map((file, idx) => (
                      <div key={idx} className="file-attachment">
                        <span className="file-icon">📎</span>
                        <span className="file-name">{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="message-time">
                  {formatTime(msg.timestamp)}
                  {msg.status === 'sent' && ' ✓'}
                  {msg.status === 'delivered' && ' ✓✓'}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

/**
 * Render task content based on task type and format
 */
const renderTaskContent = (message) => {
  // Handle document creation tasks
  if (message.taskType === 'document_creation' && message.metadata?.documentUrl) {
    return (
      <>
        <p>{message.content}</p>
        <div className="document-link">
          <a href={message.metadata.documentUrl} target="_blank" rel="noopener noreferrer">
            View Document
          </a>
        </div>
      </>
    );
  }
  
  // Handle reasoning tasks with steps
  if (message.taskType === 'reasoning' && message.metadata?.steps) {
    return (
      <div className="reasoning-steps">
        <p className="reasoning-intro">{message.content}</p>
        <div className="steps-container">
          {message.metadata.steps.map((step, idx) => (
            <div key={idx} className="reasoning-step">
              <div className="step-number">{step.step}</div>
              <div className="step-content">{step.content}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Handle data analysis tasks
  if (message.taskType === 'data_analysis' && message.metadata?.charts) {
    return (
      <div className="analysis-result">
        <p>{message.content}</p>
        <div className="charts-container">
          {message.metadata.charts.map((chart, idx) => (
            <div key={idx} className="chart">
              <h5>{chart.title}</h5>
              <img src={chart.imageUrl} alt={chart.title} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Default rendering for other task types
  return <p>{message.content}</p>;
};

export default MessageHistory;
