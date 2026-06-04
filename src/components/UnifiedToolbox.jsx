import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Hand, MicOff, MessageSquare, X, Camera, Sparkles, Smile, Trash2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useAppContext } from '../context/AppContext';

export default function UnifiedToolbox({ 
  activeGuest, 
  guestButtons, 
  toggleGuestButton, 
  onAddSticker,
  onClose
}) {
  const { 
    setIsChatOpen, 
    setIsSidebarOpen, 
    activeTheme,
    showStudentStickers, setShowStudentStickers,
    showStudentFilters, setShowStudentFilters
  } = useAppContext();
  const isInstructorClient = sessionStorage.getItem('stagetrack_role') !== 'student';

  const isSor = activeTheme === 'sor';
  const themeTextColor = isSor ? '#ef4444' : '#3b82f6';
  const themeSubtextColor = isSor ? 'rgba(239, 68, 68, 0.7)' : 'rgba(59, 130, 246, 0.7)';
  const themeTextShadow = isSor ? '0 0 8px rgba(239, 68, 68, 0.18)' : '0 0 8px rgba(59, 130, 246, 0.18)';
  const timerRef = useRef(null);
  const filterTimerRef = useRef(null);

  const resetInactivityTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setShowStickerPicker(false);
    }, 20000);
  }, []);

  const resetFilterInactivityTimer = useCallback(() => {
    if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
    filterTimerRef.current = setTimeout(() => {
      setShowFilterPicker(false);
    }, 20000);
  }, []);

  useEffect(() => {
    if (showStudentStickers) {
      resetInactivityTimer();
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [showStudentStickers, resetInactivityTimer]);

  useEffect(() => {
    if (showStudentFilters) {
      resetFilterInactivityTimer();
    } else {
      if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
    }
    return () => {
      if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
    };
  }, [showStudentFilters, resetFilterInactivityTimer]);

  const handleScreenshot = () => {
    const target = document.querySelector('.app-container');
    if (!target) return;

    // Select the panels to hide immediately on the screen before the picture is taken
    const toolbox = document.querySelector('.toolbox-panel');
    const chatSidebar = document.querySelector('.right-sidebar');
    const itoSidebar = document.querySelector('.instructor-left-sidebar');
    const closeMedia = document.querySelector('.close-media-btn');
    
    if (toolbox) toolbox.style.display = 'none';
    if (chatSidebar) chatSidebar.style.display = 'none';
    if (itoSidebar) itoSidebar.style.display = 'none';
    if (closeMedia) closeMedia.style.display = 'none';

    setTimeout(() => {
      html2canvas(target, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#090d16',
        scale: 2
      }).then((canvas) => {
        // Restore DOM styles in case of re-render/cleanup
        if (toolbox) toolbox.style.display = '';
        if (chatSidebar) chatSidebar.style.display = '';
        if (itoSidebar) itoSidebar.style.display = '';
        if (closeMedia) closeMedia.style.display = '';

        // Close them on their screen permanently
        onClose(); // Closes STO
        setIsChatOpen(false); // Closes chat
        setIsSidebarOpen(false); // Closes ITO

        // Create a mirrored canvas
        const mirrorCanvas = document.createElement('canvas');
        mirrorCanvas.width = canvas.width;
        mirrorCanvas.height = canvas.height;
        const ctx = mirrorCanvas.getContext('2d');
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(canvas, 0, 0);

        const image = mirrorCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `screenshot-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
        link.href = image;
        link.click();
      }).catch((err) => {
        console.error("Screenshot failed:", err);
        if (toolbox) toolbox.style.display = '';
        if (chatSidebar) chatSidebar.style.display = '';
        if (itoSidebar) itoSidebar.style.display = '';
        if (closeMedia) closeMedia.style.display = '';
      });
    }, 50);
  };



  if (!activeGuest) return null;

  const buttons = guestButtons[activeGuest.id] || { raiseHand: false, mute: false, chat: false };

  return (
    <div className={`unified-toolbox glass-panel ${activeTheme === 'sor' ? 'theme-sor' : 'theme-music'}`} style={{ height: '100%', width: '100%' }}>
      <div className="toolbox-header" style={{ minHeight: '52px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 16px', position: 'relative' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', textAlign: 'center', maxWidth: '160px', width: '100%' }}>
          <span style={{ color: '#ffffff', textShadow: themeTextShadow, fontSize: '0.92rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', width: '100%' }} title={activeGuest && !activeGuest.isInstructor ? `${activeGuest.name}'s Tools` : "Student Tools"}>
            {activeGuest && !activeGuest.isInstructor ? `${activeGuest.name}'s Tools` : "Student Tools"}
          </span>
          {isInstructorClient && (
            <span style={{ fontSize: '12px', color: '#ffffff', textTransform: 'lowercase', letterSpacing: '-0.02em', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', width: '100%' }}>
              double-click for ITO
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0 2px 0' }}>
        <button onClick={onClose} className="close-btn" style={{ position: 'static', transform: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <svg 
            width="32" 
            height="32" 
            viewBox="0 0 328 259" 
            style={{ 
              transform: 'rotate(180deg)',
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
      </div>

      <div className="toolbox-content" style={{ marginTop: '-15px' }}>
        {/* Guest Tools Section */}
        <div className="toolbox-section">
          <div className="gt-buttons-col">
            <button 
              className={`gb-btn ${buttons.raiseHand ? 'active' : ''}`}
              onClick={() => toggleGuestButton(activeGuest.id, 'raiseHand')}
            >
              <Hand size={18} />
              <span>Raise Hand</span>
            </button>
            <button 
              className={`gb-btn ${buttons.mute ? 'active' : ''}`}
              onClick={() => toggleGuestButton(activeGuest.id, 'mute')}
            >
              <MicOff size={18} />
              <span>Mute/Pause</span>
            </button>
            <button 
              className={`gb-btn ${buttons.chat ? 'active' : ''}`}
              onClick={() => toggleGuestButton(activeGuest.id, 'chat')}
            >
              <MessageSquare size={18} />
              <span>Chat</span>
            </button>
            <button 
              className={`gb-btn ${showStudentStickers ? 'active' : ''}`}
              onClick={() => {
                const nextState = !showStudentStickers;
                setShowStudentStickers(nextState);
                setShowStudentFilters(false);
                if (nextState) setIsSidebarOpen(false);
              }}
            >
              <Smile size={18} />
              <span>Stickers</span>
            </button>
            <button 
              className={`gb-btn ${(showStudentFilters || buttons.greenFilter || buttons.blueFilter || buttons.purpleFilter || buttons.orangeFilter) ? 'active' : ''}`}
              onClick={() => {
                const nextState = !showStudentFilters;
                setShowStudentFilters(nextState);
                setShowStudentStickers(false);
                if (nextState) setIsSidebarOpen(false);
              }}
            >
              <Sparkles size={18} />
              <span>Filters</span>
            </button>
            <button 
              className="gb-btn screenshot-btn"
              onClick={handleScreenshot}
            >
              <Camera size={18} />
              <span>Take a Picture</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

