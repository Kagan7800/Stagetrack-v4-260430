import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, GraduationCap, Shield } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import InstructorToolbox from './InstructorToolbox';
import UnifiedToolbox from './UnifiedToolbox';

export default function LeftSidebar() {
  const {
    isSidebarOpen,
    setIsSidebarOpen,
    activeGuestId,
    activeToolbox,
    setActiveToolbox,
    participants,
    guestButtons,
    handleToggleGuestButton,
    handleAddSticker,
    setActiveGuestId,
    globalMute,
    setGlobalMute
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

  const isInstructorClient = sessionStorage.getItem('stagetrack_role') !== 'student';
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

  const handleSTO = () => {
    if (activeGuestId !== null) {
      setActiveToolbox('student');
    }
  };

  const handleITO = () => {
    setActiveToolbox('instructor');
  };

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
  
  const transmissionGlowClass = mode === 'ITO' ? 'sidebar-glow-ito' : 'sidebar-glow-sto';
  const panelGridBorder = mode === 'ITO' ? 'border-t-2-ito' : 'border-t-2-sto';

  return (
    <div 
      className={`glass-panel sidebar ${transmissionGlowClass}`} 
      style={{ 
        height: 'calc(100% + 10px)', 
        marginTop: '-10px',
        borderTop: 'none', 
        borderRadius: '0px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        width: '380px'
      }}
    >
      {/* 0. Tab switcher bar (Tools Grid) */}
      {isInstructorClient && (
        <div className="tools-grid-sleek">
          {/* STO Button (Dynamic Instructor/Student Name) */}
          <button
            onClick={handleSTO}
            disabled={activeGuestId === null}
            className={`tool-btn-sleek border-r-stone ${mode === 'STO' ? 'active-sto' : ''}`}
            title={activeGuestId === null ? "Select a student to access Student Tools" : "Switch to Student Tools"}
          >
            🎓 {activeGuest ? activeGuest.name : "Richard"}'s Tools
          </button>

          {/* ITO Button (Instructor Tools) */}
          <button
            onClick={handleITO}
            className={`tool-btn-sleek ${mode === 'ITO' ? 'active-ito' : ''}`}
            title="Switch to Instructor Tools"
          >
            🛡️ Instructor Tools
          </button>
        </div>
      )}

      {/* 1. Instructor Tools (ITO) Section */}
      {showIto && (
        <div 
          className={panelGridBorder}
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
          className={panelGridBorder}
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
            <span className="text-emerald-400-class" style={{ fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🎓 {activeGuest ? activeGuest.name : "Richard"}'s Console
            </span>
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
