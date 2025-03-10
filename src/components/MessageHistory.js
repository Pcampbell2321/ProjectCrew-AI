import React from 'react';

/**
 * Unified Message History Component
 * Displays both chat messages and task results
 */
const MessageHistory = ({ messages }) => {
  if (!messages || messages.length === 0) {
    return (
      <div className="empty-message-container">
        <p>No messages yet. Start a conversation or run a task.</p>
      </div>
    );
  }

  return (
    <div className="message-container">
      {messages.map((msg, index) => (
        <div key={index} className={`message ${msg.type || 'chat'}`}>
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
            </div>
          ) : (
            <div className="chat-message">
              <div className="message-header">
                <span className="role">{msg.role || 'assistant'}</span>
                {msg.metadata?.model && (
                  <span className="model-badge">{msg.metadata.model}</span>
                )}
              </div>
              <div className="message-content">
                {msg.content}
              </div>
            </div>
          )}
        </div>
      ))}
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
