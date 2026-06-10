import { useState, useEffect, useRef, useCallback } from 'react';
import { Send } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function Chat({ messages = [], onSendMessage, onModerate, onClose }) {
  const { activeTheme } = useAppContext();
  const themeTextColor = activeTheme === 'sor' ? '#ef4444' : '#3b82f6';
  const [input, setInput] = useState("");
  const timerRef = useRef(null);

  const resetInactivityTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onClose();
    }, 20000); // 20 seconds
  }, [onClose]);

  useEffect(() => {
    resetInactivityTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetInactivityTimer]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput("");
    resetInactivityTimer();
  };

  return (
    <div 
      className="glass-panel sidebar chat-sidebar"
      onMouseMove={resetInactivityTimer}
      onKeyDown={resetInactivityTimer}
      onClick={resetInactivityTimer}
      style={{ position: 'relative' }}
    >
      <div className="chat-header" style={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: '52px', boxSizing: 'border-box', borderBottom: '1px solid var(--glass-border)', padding: '12px 16px' }}>
        <button 
          onClick={onClose} 
          className="close-btn" 
          title="Collapse Chat"
          style={{ 
            position: 'absolute', 
            left: '16px', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          <svg 
            width="32" 
            height="32" 
            viewBox="0 0 328 259" 
            style={{ 
              transform: 'none',
              objectFit: 'contain'
            }}
          >
            <path 
              d="M 154.88 17.14 L 163.26 21.57 L 301.25 123.09 L 311.60 133.94 L 309.63 138.86 L 162.28 241.86 L 158.83 240.88 L 157.35 235.95 L 152.91 234.96 L 150.94 231.51 L 162.28 174.35 L 31.18 188.15 L 24.78 187.65 L 22.81 182.72 L 18.86 181.74 L 16.40 178.29 L 16.89 77.26 L 23.79 75.29 L 163.75 90.07 L 150.94 22.56 L 151.93 18.62 L 154.39 17.63 Z" 
              fill={themeTextColor} 
              stroke="#fbbf24" 
              strokeWidth="20" 
              strokeLinejoin="round" 
              strokeLinecap="round" 
            />
          </svg>
        </button>
        <h2 style={{ margin: '0 auto', fontFamily: "'Risque', serif", color: '#ffffff', fontSize: '1rem', fontWeight: 600, textAlign: 'center', width: '100%' }}>
          Chat
        </h2>
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
            onChange={(e) => {
              setInput(e.target.value);
              resetInactivityTimer();
            }}
          />
          <button type="submit" className="icon-btn">
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
