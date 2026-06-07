import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Hand, MicOff, MessageSquare, X, Camera, Sparkles, Smile, Trash2, Star, ArrowLeftRight } from 'lucide-react';
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
    showStudentFilters, setShowStudentFilters,
    showStudentWhisper, setShowStudentWhisper,
    activeItoSection, setActiveItoSection,
    sendWhisper,
    spotlightGuestId, setSpotlightGuestId,
    setActiveToolbox,
    isPeoStickersOpen, setIsPeoStickersOpen
  } = useAppContext();
  const isInstructorClient = sessionStorage.getItem('stagetrack_role') !== 'student';
  const [whisperText, setWhisperText] = useState('');

  const isSor = activeTheme === 'sor';
  const themeTextColor = isSor ? '#ef4444' : '#3b82f6';
  const themeSubtextColor = isSor ? 'rgba(239, 68, 68, 0.7)' : 'rgba(59, 130, 246, 0.7)';
  const themeTextShadow = isSor ? '0 0 8px rgba(239, 68, 68, 0.18)' : '0 0 8px rgba(59, 130, 246, 0.18)';
  const timerRef = useRef(null);
  const filterTimerRef = useRef(null);

  const resetInactivityTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setShowStudentStickers(false);
    }, 20000);
  }, []);

  const resetFilterInactivityTimer = useCallback(() => {
    if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
    filterTimerRef.current = setTimeout(() => {
      setShowStudentFilters(false);
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

        const image = canvas.toDataURL('image/png');
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
      <div className="toolbox-header" style={{ minHeight: '52px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', textAlign: 'center', width: '100%' }}>
          <span style={{ color: '#ffffff', textShadow: themeTextShadow, fontSize: '0.8rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'normal', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', width: '100%', lineHeight: '1.2', textAlign: 'center' }} title={activeGuest && !activeGuest.isInstructor ? `${activeGuest.name}'s Tools` : "Student Tools"}>
            {activeGuest && !activeGuest.isInstructor ? (
              <>{activeGuest.name}'s<br/>Tools</>
            ) : (
              <>Student<br/>Tools</>
            )}
          </span>

        </div>
      </div>

      <div className="toolbox-content" style={{ marginTop: '0px' }}>
        {/* Guest Tools Section */}
        <div className="toolbox-section">
          <div className="gt-buttons-col">
            {/* Switch to Instructor Tools Button */}
            {isInstructorClient && (
              <button 
                className="gb-btn"
                onClick={() => {
                  setActiveToolbox("instructor");
                  setShowStudentStickers(false);
                  setShowStudentFilters(false);
                  setShowStudentWhisper(false);
                }}
                style={{ color: '#fbbf24', borderColor: '#fbbf24' }}
              >
                <ArrowLeftRight size={18} />
                <span>Change to<br />ITO</span>
              </button>
            )}

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
              className={`gb-btn ${(showStudentStickers || isPeoStickersOpen) ? 'active' : ''}`}
              onClick={() => {
                const isAlreadyOpen = showStudentStickers || isPeoStickersOpen;
                if (isAlreadyOpen) {
                  setShowStudentStickers(false);
                  setIsPeoStickersOpen(false);
                } else {
                  setShowStudentStickers(true);
                }
                setShowStudentFilters(false);
                setActiveItoSection(null);
              }}
            >
              <Smile size={18} />
              <span>Stickers</span>
            </button>

            <button 
              className="gb-btn screenshot-btn"
              onClick={handleScreenshot}
            >
              <Camera size={18} />
              <span>Take a Picture</span>
            </button>

          </div>
          
          {/* Whisper Section for Instructors */}
          {isInstructorClient && (
            <button 
              className={`gb-btn ${showStudentWhisper ? 'active' : ''}`}
              onClick={() => {
                const nextState = !showStudentWhisper;
                setShowStudentWhisper(nextState);
                setShowStudentStickers(false);
                setShowStudentFilters(false);
                setActiveItoSection(null);
                if (nextState) setIsSidebarOpen(false);
              }}
              style={{ marginTop: '16px' }}
            >
              <MessageSquare size={18} />
              <span>Private Whisper</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

