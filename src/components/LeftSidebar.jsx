import { useEffect, useRef, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
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
    setActiveGuestId,
    setGlobalMute,
    activeTheme
  } = useAppContext();

  const activeGuest = participants.find(p => p.id === activeGuestId);

  const inactivityTimerRef = useRef(null);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      setIsSidebarOpen(false);
    }, 20000); // 20 seconds
  }, [setIsSidebarOpen]);

  useEffect(() => {
    if (isSidebarOpen) {
      resetInactivityTimer();
    } else {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    }
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [isSidebarOpen, resetInactivityTimer]);

  // Automatically open the sidebar when a guest is selected
  useEffect(() => {
    if (activeGuestId !== null) {
      setIsSidebarOpen(true);
    }
  }, [activeGuestId, setIsSidebarOpen]);

  const mode = (activeGuestId === null || activeToolbox === 'instructor') ? 'ITO' : 'STO';

  // Auto-Muting / Routing Side Effects on Mode Shift
  useEffect(() => {
    if (mode === 'ITO') {
      setGlobalMute(true);
      console.log("Switching to Admin Channel: Main room stream muted.");
    } else {
      setGlobalMute(false);
      console.log("Switching to Stage Channel: Open broadcast restored.");
    }
  }, [mode, setGlobalMute]);

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
  
  const isSor = activeTheme === 'sor';

  // Dynamic border/glow styles
  const transmissionGlowStyle = mode === 'ITO' 
    ? { borderRight: '2px solid rgba(245, 158, 11, 0.7)', boxShadow: '0 0 15px rgba(245, 158, 11, 0.15)' }
    : { 
        borderRight: isSor 
          ? '2px solid rgba(239, 68, 68, 0.7)' // Red in SOR
          : '2px solid rgba(59, 130, 246, 0.7)', // Blue in Music
        boxShadow: isSor 
          ? '0 0 15px rgba(239, 68, 68, 0.15)' 
          : '0 0 15px rgba(59, 130, 246, 0.15)'
      };

  const panelGridBorderStyle = { 
    borderTop: mode === 'ITO' 
      ? '2.5px solid rgba(245, 158, 11, 0.7)' 
      : (isSor ? '2.5px solid #ef4444' : '2.5px solid #3b82f6')
  };


  return (
    <div 
      className="glass-panel sidebar" 
      onMouseMove={resetInactivityTimer}
      onClick={resetInactivityTimer}
      onKeyDown={resetInactivityTimer}
      style={{ 
        height: 'calc(100% + 10px)', 
        marginTop: '-10px',
        borderTop: 'none', 
        borderRadius: '0px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        width: '150px',
        transition: 'width 0.3s ease',
        background: 'rgba(11, 25, 46, 0.7)',
        ...transmissionGlowStyle
      }}
    >

      {/* 1. Instructor Tools (ITO) Section */}
      {showIto && (
        <div 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            borderBottom: showSto ? '1px solid var(--glass-border)' : 'none',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            transition: 'border-color 0.2s ease',
            ...panelGridBorderStyle
          }}
        >
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'rgba(11, 25, 46, 0.7)', overflow: 'hidden' }}>
            <InstructorToolbox />
          </div>
        </div>
      )}

      {/* 2. Student Tools (STO) Section */}
      {showSto && (
        <div 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            transition: 'border-color 0.2s ease',
            ...panelGridBorderStyle
          }}
        >
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'rgba(11, 25, 46, 0.7)', overflow: 'hidden' }}>
            <UnifiedToolbox 
              activeGuest={activeGuest}
              guestButtons={guestButtons}
              toggleGuestButton={handleToggleGuestButton}
              onAddSticker={handleAddSticker}
              onClose={() => setActiveGuestId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
