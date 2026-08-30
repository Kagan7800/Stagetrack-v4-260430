import { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import InstructorToolbox from './InstructorToolbox';

export default function LeftSidebar() {
  const {
    isSidebarOpen,
    setIsSidebarOpen,
    setActiveToolbox,
    setActiveItoSection,
    isInstructorVerified
  } = useAppContext();

  const isInstructorClient = isInstructorVerified;

  useEffect(() => {
    if (!isSidebarOpen || !isInstructorClient) return;

    const handleOutsideClick = (e) => {
      // 1. If click is inside the sidebar itself, do nothing
      const sidebarEl = document.querySelector('.glass-panel.sidebar');
      if (sidebarEl && sidebarEl.contains(e.target)) {
        return;
      }

      // 2. If click is on any element that opens or interacts with the sidebar, do nothing to prevent immediate close on toggle
      if (e.target.closest('.sidebar-handle') || e.target.closest('.video-cell')) {
        return;
      }

      // 3. If click is on any element inside the control deck / studio controls, do nothing (so they can use those controls)
      if (e.target.closest('.control-deck-outer') || e.target.closest('.control-deck') || e.target.closest('.studio-controls')) {
        return;
      }

      // Otherwise, close the sidebar and clean up states
      setIsSidebarOpen(false);
      setActiveToolbox(null);
      setActiveItoSection(null);
    };

    // Use a small timeout to register the listener so it doesn't fire on the same click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isSidebarOpen, isInstructorClient, setIsSidebarOpen, setActiveToolbox, setActiveItoSection]);

  if (!isInstructorClient) return null;

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
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="lucide lucide-chevron-right"
        >
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </div>
    );
  }

  return (
    <div 
      className="glass-panel sidebar" 
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
        borderRight: '2px solid rgba(245, 158, 11, 0.7)',
        boxShadow: '0 0 15px rgba(245, 158, 11, 0.15)'
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'rgba(11, 25, 46, 0.7)', overflow: 'hidden' }}>
        <InstructorToolbox />
      </div>
    </div>
  );
}
