import { useState, useRef, useEffect } from 'react';
import { Send, Trash2 } from 'lucide-react';
import PermissionHeader from './PermissionHeader';

const COLORS = ['#F2994A', '#2FA6A0', '#5B3A8E', '#1E8ED2', '#E0546B', '#8E6BC4'];

function colorFor(name = '') {
  let sum = 0;
  for (const ch of name) sum += ch.charCodeAt(0);
  return COLORS[sum % COLORS.length];
}

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';
}

const STICKERS = ['🎵', '🥁', '🦒', '⭐', '🎉', '🔔', '❤️', '👏', '😄', '🌈', '🎈', '✨'];

export default function Chat({
  isOpen,
  isInstructor,
  activeTheme,
  messages = [],
  onSendMessage,
  onDeleteMessage,
  onClose
}) {
  const [input, setInput] = useState('');
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Auto-expand textarea upward as message wraps to multiple lines (min 54px for 2 rows, capped at 120px)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(54, Math.min(textareaRef.current.scrollHeight, 120))}px`;
    }
  }, [input]);

  // Reverse-chronological / newest at bottom auto-scroll on new message or open
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (e) => {
    if (e) e.preventDefault();
    const textToSend = input.trim();
    if (!textToSend) return;
    onSendMessage(textToSend);
    setInput('');
    setShowStickerPicker(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStickerClick = (sticker) => {
    setInput(prev => prev + sticker);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const isSor = activeTheme === 'sor';

  return (
    <div className={`chat-panel-inner ${isSor ? 'theme-sor' : ''}`} data-theme={activeTheme}>
      {/* Header: Purple-to-Blue gradient aesthetic or Red gradient in SOR mode */}
      <PermissionHeader 
        title="💬 Live Chat"
        isInstructor={isInstructor}
        onClose={onClose}
        closeTitle="Close Chat (Instructor Only)"
      />

      {/* Message list: reverse-chronological scroll with newest at bottom */}
      <div className="chat-messages" ref={messagesContainerRef}>
        {messages.map((m, idx) => {
          const msgName = m.name || m.senderName || (m.role === 'instructor' || m.senderRole === 'instructor' ? 'Ms. Rivera' : 'Guest');
          const msgTime = m.time || (m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
          const msgId = m.id || idx;

          return (
            <div key={msgId} className="msg">
              <div 
                className="avatar-square" 
                style={{ backgroundColor: colorFor(msgName) }}
              >
                {initials(msgName)}
              </div>
              <div className="msg-body">
                <div className="msg-top">
                  <span className="msg-name">{msgName}</span>
                  {msgTime && <span className="msg-time">{msgTime}</span>}
                </div>
                <div className="msg-text">{m.text}</div>
              </div>
              {isInstructor && (
                <button
                  type="button"
                  className="msg-delete"
                  onClick={() => onDeleteMessage(m.id)}
                  title="Delete message (instructor only)"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} style={{ height: '1px', flexShrink: 0 }} />
      </div>

      {/* Composer Area */}
      <div className="chat-composer">
        {showStickerPicker && (
          <div className="sticker-picker show">
            {STICKERS.map((s, idx) => (
              <button 
                type="button" 
                key={idx} 
                onClick={() => handleStickerClick(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <form className="composer-row" onSubmit={handleSend}>
          <button 
            type="button" 
            className="icon-btn" 
            onClick={() => setShowStickerPicker(!showStickerPicker)}
            title="Add sticker / icon"
          >
            😊
          </button>
          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            placeholder="Say something nice..."
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button 
            type="submit" 
            className="icon-btn send-btn"
            title="Send message"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
