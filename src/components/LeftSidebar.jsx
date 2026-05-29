import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import InstructorToolbox from './InstructorToolbox';
import UnifiedToolbox from './UnifiedToolbox';

export default function LeftSidebar() {
  const {
    isSidebarOpen,
    setIsSidebarOpen,
    activeGuestId,
    activeToolbox,
    participants,
    guestButtons,
    handleToggleGuestButton,
    handleAddSticker,
    setActiveGuestId
  } = useAppContext();

  const [isItoExpanded, setIsItoExpanded] = useState(true);
  const [isStoExpanded, setIsStoExpanded] = useState(true);

  const activeGuest = participants.find(p => p.id === activeGuestId);

  // Automatically open the sidebar when a guest is selected
  useEffect(() => {
    if (activeGuestId !== null) {
      setIsSidebarOpen(true);
      setIsStoExpanded(true); // Automatically expand the student toolbox when selected
    }
  }, [activeGuestId, setIsSidebarOpen]);

  if (!isSidebarOpen) {
    return (
      <div 
        className="sidebar-handle closed" 
        onClick={() => setIsSidebarOpen(true)} 
        role="button" 
        aria-label="Open Sidebar" 
        tabIndex={0}
        style={{ zIndex: 100 }}
      >
        <ChevronRight size={20} />
      </div>
    );
  }

  // Determine flex values based on expansion states
  const showSto = activeGuestId !== null && activeGuest && activeToolbox === 'student';
  const showIto = activeGuestId === null || activeToolbox === 'instructor';
  
  return (
    <div 
      className="glass-panel sidebar" 
      style={{ 
        height: 'calc(100% + 10px)', 
        marginTop: '-10px',
        borderRight: '1px solid var(--glass-border)', 
        borderTop: 'none', 
        borderRadius: '0px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        width: '380px'
      }}
    >
      {/* 1. Instructor Tools (ITO) Section */}
      {showIto && (
        <div 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            borderBottom: showSto ? '1px solid var(--glass-border)' : 'none',
            flex: isItoExpanded ? (showSto && isStoExpanded ? 1 : 1) : '0 0 auto',
            minHeight: 0,
            overflow: 'hidden'
          }}
        >
          {isItoExpanded && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'rgba(0, 0, 0, 0.6)', overflow: 'hidden' }}>
              <InstructorToolbox />
            </div>
          )}
        </div>
      )}

      {/* 2. Student Tools (STO) Section */}
      {showSto && (
        <div 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            flex: isStoExpanded ? (isItoExpanded ? 1 : 1) : '0 0 auto',
            minHeight: 0,
            overflow: 'hidden'
          }}
        >
          <div 
            onClick={() => setIsStoExpanded(!isStoExpanded)}
            style={{ 
              padding: '14px 16px', 
              background: 'rgba(0, 0, 0, 0.6)',
              cursor: 'pointer', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              userSelect: 'none',
              borderBottom: '1px solid var(--glass-border)',
              position: 'relative'
            }}
          >
            <span style={{ fontSize: '1.02rem', fontWeight: 600, color: '#cbd5e1' }}>🎓 {activeGuest.name}'s Tools</span>
          </div>
          
          {isStoExpanded && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'rgba(0, 0, 0, 0.6)', overflow: 'hidden' }}>
              <UnifiedToolbox 
                activeGuest={activeGuest}
                guestButtons={guestButtons}
                toggleGuestButton={handleToggleGuestButton}
                onAddSticker={handleAddSticker}
                onClose={() => setActiveGuestId(null)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
