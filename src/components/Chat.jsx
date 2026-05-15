import React, { useState } from 'react';
import { Send, Hand } from 'lucide-react';
import { playConfirmSound } from '../utils/audioSynth';

export default function Chat({ isHandRaised, setIsHandRaised }) {
  const [messages, setMessages] = useState([
    { id: 1, text: "Welcome to the Music Fun classroom!", sender: "system" }
  ]);
  const [input, setInput] = useState("");

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    setMessages([...messages, { id: Date.now(), text: input, sender: "self" }]);
    setInput("");
    
    // Simulate a reply
    setTimeout(() => {
      setMessages(prev => [...prev, { id: Date.now(), text: "That's great!", sender: "other" }]);
    }, 1500);
  };

  const toggleHand = () => {
    if (!isHandRaised) playConfirmSound();
    setIsHandRaised(!isHandRaised);
  };

  return (
    <div className="glass-panel sidebar">
      <div style={{ padding: '16px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: '600' }}>Classroom Chat</h2>
        <button 
          className={`icon-btn ${isHandRaised ? 'active' : ''}`} 
          onClick={toggleHand}
          title="Raise Hand"
        >
          <Hand size={20} />
        </button>
      </div>
      
      <div className="chat-container">
        <div className="chat-messages">
          {messages.map(msg => (
            <div key={msg.id} className={`chat-message ${msg.sender === 'system' ? 'other' : msg.sender}`}>
              {msg.text}
            </div>
          ))}
        </div>
        
        <form className="chat-input-wrapper" onSubmit={handleSend}>
          <input 
            type="text" 
            className="chat-input" 
            placeholder="Type a message..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="icon-btn" style={{ background: 'var(--primary-color)' }}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
