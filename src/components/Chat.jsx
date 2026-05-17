import React, { useState } from 'react';
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
    <div className="glass-panel sidebar">
      <div style={{ padding: '16px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: '600' }}>Classroom Chat</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>
      
      <div className="chat-container">
        <div className="chat-messages">
          {messages.filter(m => m.status !== 'ignored').map(msg => (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div className={`chat-message ${msg.sender === 'system' ? 'other' : msg.sender === 'self' ? 'self' : 'other'}`} style={{ alignSelf: msg.sender === 'self' ? 'flex-end' : 'flex-start' }}>
                {msg.senderName && (
                  <span style={{ fontSize: '0.7rem', opacity: 0.8, display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                    {msg.senderName}
                  </span>
                )}
                {msg.text}
                {msg.status === 'private' && (
                  <span style={{ fontSize: '0.7rem', display: 'block', color: '#fcd34d', marginTop: '4px' }}>
                    (Private Reply)
                  </span>
                )}
              </div>
              
              {msg.status === 'pending' && (
                <div style={{ display: 'flex', gap: '6px', alignSelf: 'flex-start', marginTop: '2px', background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '8px' }}>
                  <button onClick={() => onModerate(msg.id, 'show')} style={{ fontSize: '0.7rem', padding: '4px 8px', background: '#22c55e', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white', fontWeight: 'bold' }}>
                    Show
                  </button>
                  <button onClick={() => onModerate(msg.id, 'ignore')} style={{ fontSize: '0.7rem', padding: '4px 8px', background: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white', fontWeight: 'bold' }}>
                    Ignore
                  </button>
                  <button onClick={() => onModerate(msg.id, 'reply_private')} style={{ fontSize: '0.7rem', padding: '4px 8px', background: '#f59e0b', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white', fontWeight: 'bold' }}>
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
