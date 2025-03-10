import React from 'react';

const MessageBubble = ({ message }) => {
  // Format timestamp to HH:MM format
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`message ${message.type || (message.role === 'user' ? 'user' : 'system')}`}>
      <div className="message-content">
        <p>{message.content}</p>
        <div className="message-time">
          {formatTime(message.timestamp)}
          {message.status === 'sent' && ' ✓'}
          {message.status === 'delivered' && ' ✓✓'}
        </div>
      </div>
      {message.metadata?.attachments && message.metadata.attachments.length > 0 && (
        <div className="attachments">
          {message.metadata.attachments.map((file, index) => (
            <div key={index} className="file-attachment">
              <span className="file-icon">📎</span>
              <span className="file-name">{file.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
