import React from 'react';
import { Wrench, MessageSquare, PlaySquare } from 'lucide-react';

export default function InstructorControlBar({ 
  isToolboxOpen, 
  setIsToolboxOpen, 
  isChatOpen, 
  setIsChatOpen,
  onSimulateGuestMessage
}) {
  return (
    <div className="instructor-control-bar">
      <span style={{ fontWeight: 'bold', marginRight: 'auto', color: 'var(--accent-color)' }}>
        Instructor View
      </span>
      
      <button 
        className={`ic-toggle-btn ${isToolboxOpen ? 'active' : ''}`}
        onClick={() => setIsToolboxOpen(!isToolboxOpen)}
      >
        <Wrench size={18} /> Toolbox
      </button>

      <button 
        className={`ic-toggle-btn ${isChatOpen ? 'active' : ''}`}
        onClick={() => setIsChatOpen(!isChatOpen)}
      >
        <MessageSquare size={18} /> Chat
      </button>

      {/* Debug button to simulate incoming guest message */}
      <button 
        className="ic-toggle-btn"
        style={{ marginLeft: 'auto', background: 'rgba(234, 179, 8, 0.2)', borderColor: '#eab308' }}
        onClick={onSimulateGuestMessage}
      >
        <PlaySquare size={18} /> Simulate Guest Chat
      </button>
    </div>
  );
}
