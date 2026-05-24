import { useState } from 'react';
import { Send, X } from 'lucide-react';

export default function Chat({ messages = [], onSendMessage, onModerate, onClose }) {
  const [input, setInput] = useState("");

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput("");
  };

  return (
    <div className="glass-panel sidebar chat-sidebar">
      <div className="chat-header">
        <h2>Chat</h2>
        <button onClick={onClose} className="close-btn">
          <X size={20} />
        </button>
      </div>
      
      <div className="chat-container">
        <div className="chat-messages">
          {messages.filter(m => m.status !== 'ignored').map(msg => (
            <div key={msg.id} className="chat-message-wrapper">
              <div className={`chat-message ${msg.sender === 'system' ? 'system' : msg.sender === 'self' ? 'self' : 'other'} ${msg.status || ''}`}>
                {msg.senderName && (
                  <span className="chat-sender-name">
                    {msg.senderName}
                  </span>
                )}
                {msg.text}
                {msg.status === 'private' && (
                  <span className="chat-private-note">
                    (Private Reply)
                  </span>
                )}
              </div>
              
              {msg.status === 'pending' && (
                <div className="chat-mod-actions">
                  <button onClick={() => onModerate(msg.id, 'show')} className="mod-btn show">
                    Show
                  </button>
                  <button onClick={() => onModerate(msg.id, 'ignore')} className="mod-btn ignore">
                    Ignore
                  </button>
                  <button onClick={() => onModerate(msg.id, 'reply_private')} className="mod-btn reply">
                    Private Reply
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <form className="chat-input-wrapper" onSubmit={handleSend}>
          <input 
            type="text" 
            className="chat-input" 
            placeholder="Type..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="icon-btn">
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
