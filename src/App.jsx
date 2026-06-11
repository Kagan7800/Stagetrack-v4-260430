// file:///c:/0-Music%20Fun/Backups/backup%20for%20firestore/src/App.jsx
import { useState, useEffect, useRef } from 'react';
import PresentationContainer from './components/PresentationContainer';
import Chat from './components/Chat';
import GuestContainer from './components/GuestContainer';
import LeftSidebar from './components/LeftSidebar';
import LobbyOverlay from './components/LobbyOverlay';
import { useAppContext } from './context/AppContext';
import UnifiedToolbox from './components/UnifiedToolbox';
import InstructorToolbox from './components/InstructorToolbox';
import ControlDeck from './components/ControlDeck';

function StageTimerDisplay({ stageTimer, setStageTimer, isInstructorClient }) {
  const [timeLeft, setTimeLeft] = useState(() => {
    if (!stageTimer) return 0;
    if (!stageTimer.isRunning) return stageTimer.duration || 0;
    return Math.max(0, Math.round((stageTimer.endTime - Date.now()) / 1000));
  });

  useEffect(() => {
    if (!stageTimer) return;
    if (!stageTimer.isRunning) {
      const duration = stageTimer.duration || 0;
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev === duration ? prev : duration);
      }, 0);
      return () => clearTimeout(timer);
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.round((stageTimer.endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      
      if (remaining <= 0 && isInstructorClient) {
        setStageTimer({ endTime: null, duration: 0, isRunning: false });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [stageTimer, isInstructorClient, setStageTimer]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeStr = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div 
      className="stage-timer-display"
      style={{
        position: 'absolute',
        right: '20px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'transparent',
        border: 'none',
        borderRadius: '20px',
        padding: '6px 16px',
        color: timeLeft <= 10 ? '#ef4444' : '#22c55e',
        fontFamily: 'monospace',
        fontSize: '2.4rem',
        fontWeight: 'bold',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: 'none'
      }}
    >
      {timeStr}
    </div>
  );
}

function App() {
  const {
    MOCK_USER_COUNT,
    participants,
    activeGuestId, setActiveGuestId,
    activeToolbox, setActiveToolbox,
    guestButtons, setGuestButtons, handleToggleGuestButton,
    guestStickers, setGuestStickers, handleAddSticker, stickerNudges,
    isDoodling,
    mediaUrl, mediaType, clearMedia,
    isChatOpen, setIsChatOpen,
    isSidebarOpen, setIsSidebarOpen,
    globalMute,
    globalPause,
    messages, handleModerateMessage, handleSendChatMessage,
    isJoined,
    activeTheme,
    activeItoSection, setActiveItoSection,
    showInstructorStickers,
    showStudentStickers,
    showStudentFilters,
    isPeoStickersOpen,
    stageTimer, setStageTimer
  } = useAppContext();

  const isRhythmWheel = mediaType === 'iframe' && mediaUrl && (mediaUrl.includes('1,2,3,4_wheel.html') || mediaUrl.includes('1,2,3,4_click.html'));

  const [isPortrait, setIsPortrait] = useState(
    typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const updatePeoHeight = () => {
      const peoElement = document.querySelector('.right-peos-sidebar .video-cell') || document.querySelector('.side-peos .video-cell');
      if (peoElement) {
        const height = peoElement.getBoundingClientRect().height;
        if (height > 0) {
          document.documentElement.style.setProperty('--peo-height', `${height}px`);
        }
      }
    };

    const handleUpdate = () => {
      requestAnimationFrame(updatePeoHeight);
    };

    handleUpdate();

    window.addEventListener('resize', handleUpdate);
    const timer1 = setTimeout(handleUpdate, 150);
    const timer2 = setTimeout(handleUpdate, 350);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [participants, isSidebarOpen, isChatOpen, activeItoSection]);

  const isInstructorClient = sessionStorage.getItem('stagetrack_role') !== 'student';
  const isInstructorSidebarVisible = true;
  const activeGuest = participants.find(p => p.id === activeGuestId);

  const ic = participants.find(p => p.isInstructor) || participants[0];
  const loggedInGc = participants.find(p => p.id && String(p.id).startsWith('active-joined')) ||
                     participants.find(p => !p.isInstructor && !p.isBlank && p.id !== 'instructor-ic');

  const otherGcs = participants.filter(p => 
    !p.isBlank && 
    !p.isInstructor && 
    p.id !== (loggedInGc ? loggedInGc.id : null)
  );

  const isStoOpen = isSidebarOpen && activeToolbox === 'student';
  const isItoOpen = isSidebarOpen && activeToolbox === 'instructor';
  const isAnyPanelOpen = isChatOpen || isItoOpen || isStoOpen;
  const [activityKey, setActivityKey] = useState(0);

  const resetInactivity = () => {
    setActivityKey(prev => prev + 1);
  };

  // Inactivity timer for all portrait panels (Chat, ITO, STO)
  useEffect(() => {
    if (!isPortrait || !isAnyPanelOpen) return;

    window.addEventListener('mousemove', resetInactivity);
    window.addEventListener('mousedown', resetInactivity);
    window.addEventListener('touchstart', resetInactivity);
    window.addEventListener('keydown', resetInactivity);

    const timer = setTimeout(() => {
      setIsChatOpen(false);
      setIsSidebarOpen(false);
    }, 20000); // 20 seconds

    return () => {
      window.removeEventListener('mousemove', resetInactivity);
      window.removeEventListener('mousedown', resetInactivity);
      window.removeEventListener('touchstart', resetInactivity);
      window.removeEventListener('keydown', resetInactivity);
      clearTimeout(timer);
    };
  }, [isPortrait, isAnyPanelOpen, activityKey, setIsChatOpen, setIsSidebarOpen]);

  let rightParticipants = [];
  if (isPortrait) {
    const pSlot1 = ic;
    const pSlot2 = loggedInGc || { id: 'portrait-blank-top', isBlank: true };
    if (isAnyPanelOpen) {
      // Remove all 4 PEO containers in view when a utility panel is opened
      rightParticipants = [];
    } else {
      const pOther = [...otherGcs];
      if (pOther.length % 2 !== 0) {
        pOther.push({ id: 'portrait-blank-end', isBlank: true });
      }
      rightParticipants = [pSlot1, pSlot2, ...pOther];
    }
  }

  const halfLength = participants.length / 2;
  const activeCount = participants.filter(p => !p.isBlank).length;
  const isThreePeo = Number(MOCK_USER_COUNT) === 3 || (participants.length === 4 && activeCount === 3);

  const leftParticipants = isThreePeo 
    ? [participants[0], participants[1]] 
    : participants.slice(0, halfLength);
  const rightParticipantsLandscape = isThreePeo 
    ? [participants[2], participants[3]] 
    : participants.slice(halfLength);

  const toggleITO = () => {
    setIsChatOpen(false); // Close chat if toggling ITO
    if (isSidebarOpen && activeToolbox === 'instructor') {
      setIsSidebarOpen(false);
      setActiveToolbox(null);
      setActiveItoSection(null);
    } else {
      setIsSidebarOpen(true);
      setActiveToolbox('instructor');
      setActiveGuestId(null);
    }
  };

  const toggleSTO = () => {
    setIsChatOpen(false); // Close chat if toggling STO
    if (isSidebarOpen && activeToolbox === 'student') {
      setIsSidebarOpen(false);
      setActiveToolbox(null);
      setActiveGuestId(null);
    } else {
      setIsSidebarOpen(true);
      setActiveToolbox('student');
      if (activeGuestId === null) {
        const firstGuest = participants.find(p => !p.isBlank && !p.isInstructor);
        if (firstGuest) {
          setActiveGuestId(firstGuest.id);
        }
      }
    }
  };

  const stateRef = useRef({ activeGuestId, isSidebarOpen, activeToolbox });
  useEffect(() => {
    stateRef.current = { activeGuestId, isSidebarOpen, activeToolbox };
  }, [activeGuestId, isSidebarOpen, activeToolbox]);

  const handleDoubleClick = (p) => {
    const { activeGuestId: currentGuestId, isSidebarOpen: currentSidebarOpen, activeToolbox: currentToolbox } = stateRef.current;
    
    if (!isInstructorClient) return;
    if (p.isBlank) return;

    if (currentGuestId === p.id && currentSidebarOpen) {
      if (currentToolbox === "instructor") {
        setActiveToolbox("student");
      } else if (currentToolbox === "student") {
        setIsSidebarOpen(false);
        setGuestStickers(prev => ({ ...prev, [p.id]: [] }));
        setGuestButtons(prev => ({ ...prev, [p.id]: {} }));
      } else {
        setActiveToolbox("instructor");
      }
    } else {
      setActiveGuestId(p.id);
      setActiveToolbox("instructor");
      setIsSidebarOpen(true);
    }
  };

  const isConfettiActive = Object.values(guestStickers || {}).some(stickersList => 
    Array.isArray(stickersList) && stickersList.some(s => s.position === 'confetti' || s.name === 'Confetti.svg')
  );

  return (
    <div className="app-container" style={{ position: 'relative', overflow: 'hidden' }}>
      {!isJoined && <LobbyOverlay />}

      {/* LAYER 0: BASE MUSIC FUN BACKGROUND */}
      {activeTheme !== 'sor' && (
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            backgroundImage: "url('/assets/background_modern (2).png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            pointerEvents: 'none',
            opacity: 0.7
          }}
        />
      )}

      {/* LAYER 1: SOR BACKGROUND BASE */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: "url('/assets/SOR/sor_bottom_bg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          zIndex: 1, 
          pointerEvents: 'none',
          opacity: activeTheme === 'sor' ? 1 : 0
        }}
      />


      {/* LAYER 1.5: GLOBAL CONFETTI OVERLAY FOR SOR THEME */}
      {activeTheme === 'sor' && isConfettiActive && (
        <div className="global-confetti-container">
          <div className="confetti-mover" />
        </div>
      )}

      {/* LAYER 2: INTERACTIVE UI HOUSING */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      {/* Top Banner */}
      {!isPortrait ? (
        activeTheme !== 'sor' ? (
          <div className="top-banner" style={{ backgroundImage: "url('/banner.png')", backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', position: 'relative' }}>
            {/* Left Side Logo */}
            <div style={{ position: 'absolute', left: '70px', height: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
              <img 
                src="/greenStagetrack_studio.png" 
                alt="Stagetrack Studio" 
                style={{ 
                  height: '70%', 
                  maxWidth: '100%', 
                  objectFit: 'contain',
                  filter: 'drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.25))'
                }} 
              />
            </div>

            <img 
              src="/assets/logo_modern.png" 
              alt="Music Fun Logo" 
              style={{ 
                height: '100%', 
                width: 'auto', 
                objectFit: 'contain',
                filter: 'drop-shadow(0px 3px 6px rgba(0, 0, 0, 0.3))'
              }} 
            />

            {stageTimer && (stageTimer.isRunning || stageTimer.duration > 0) && (
              <StageTimerDisplay stageTimer={stageTimer} setStageTimer={setStageTimer} isInstructorClient={isInstructorClient} />
            )}
          </div>
        ) : (
          <div className="top-banner" style={{ backgroundImage: "radial-gradient(ellipse at top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0) 70%), linear-gradient(to bottom, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.1) 100%), url('/assets/SOR/1ui_sor top banner-052826 3.png')", backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', position: 'relative' }}>
            <img 
              src="/assets/SOR/2logo-sor-053126.png" 
              alt="School of Rock Logo" 
              style={{ 
                height: '100%', 
                width: 'calc(10.4vh * 32768 / 6180)', 
                objectFit: 'fill',
                zIndex: 1000
              }} 
            />
            <div className="gradient-divider-bar" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '6px' }}></div>

            {stageTimer && (stageTimer.isRunning || stageTimer.duration > 0) && (
              <StageTimerDisplay stageTimer={stageTimer} setStageTimer={setStageTimer} isInstructorClient={isInstructorClient} />
            )}
          </div>
        )
      ) : activeTheme === 'sor' ? (
        <div className="top-banner" style={{ backgroundImage: "radial-gradient(ellipse at top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0) 70%), linear-gradient(to bottom, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.1) 100%), url('/assets/SOR/1ui_sor top banner-052826 3.png')", backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', position: 'relative' }}>
          <img 
            src="/assets/SOR/2logo-sor-053126.png" 
            alt="School of Rock Logo" 
            style={{ 
              height: '100%', 
              width: 'calc(10.4vh * 32768 / 6180)', 
              objectFit: 'fill',
              zIndex: 1000
            }} 
          />
          <div className="gradient-divider-bar" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '6px' }}></div>

          {stageTimer && (stageTimer.isRunning || stageTimer.duration > 0) && (
            <StageTimerDisplay stageTimer={stageTimer} setStageTimer={setStageTimer} isInstructorClient={isInstructorClient} />
          )}
        </div>
      ) : (
        <div className="top-banner" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            padding: '12px 30px',
            backgroundColor: 'rgba(11, 25, 46, 0.75)', 
            borderTop: '2.5px solid #facc15', 
            borderBottom: '2.5px solid #facc15',
            borderRadius: '4px'
          }}>
            <img 
              src="/assets/All/mftext_only.png" 
              alt="Music Fun" 
              style={{ 
                height: 'auto',
                maxHeight: '8.6vh', 
                maxWidth: '80%', 
                objectFit: 'contain',
                filter: 'brightness(0) saturate(100%) invert(86%) sepia(87%) saturate(588%) hue-rotate(346deg) brightness(104%) contrast(97%) drop-shadow(0px 2px 4px rgba(0,0,0,0.25))'
              }} 
            />
          </div>

          {stageTimer && (stageTimer.isRunning || stageTimer.duration > 0) && (
            <StageTimerDisplay stageTimer={stageTimer} setStageTimer={setStageTimer} isInstructorClient={isInstructorClient} />
          )}
        </div>
      )}

      {/* Main Content Layout */}
      <div className="main-content">
        {/* Left Sidebar containing both ITO and STO accordions */}
        {isInstructorSidebarVisible && !isPortrait && (
          <div className={`instructor-left-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
            <LeftSidebar />
          </div>
        )}

        {/* Center Grid */}
        {isPortrait ? (
          <div 
            className="center-grid-area" 
            data-columns="1" 
            data-total-peos={participants.length}
            data-sidebar-open={isSidebarOpen ? "true" : "false"}
            data-chat-open={isChatOpen ? "true" : "false"}
          >
            <div className="center-wrapper" style={{ justifyContent: 'center' }}>
              <div className={`pc-width-keeper ${isSidebarOpen || isChatOpen ? 'pc-sidebar-open' : ''}`}>
                 <div 
                  className={`pc-gt-unified ${mediaType === 'iframe' || mediaType === 'metronome' ? 'metronome-active' : ''} ${isRhythmWheel ? 'rhythm-wheel-container' : 'presentation-container-parent'}`}
                 >
                    <PresentationContainer 
                      isDoodling={isDoodling}
                      mediaUrl={mediaUrl}
                      mediaType={mediaType}
                      onClearMedia={clearMedia}
                    />
                </div>
              </div>
            </div>
            
            <div 
              className="portrait-bottom-container"
              onMouseMove={resetInactivity}
              onClick={resetInactivity}
              onTouchStart={resetInactivity}
            >
              {!isAnyPanelOpen ? (
                /* Show all 4 PEO containers when no panel is open */
                <div className="side-peos right-peos-sidebar">
                  {rightParticipants.map(p => {
                    const isMe = p.id && String(p.id).startsWith('active-joined');
                    return (
                      <GuestContainer 
                        key={p.id}
                        participant={p}
                        isActive={activeGuestId === p.id}
                        onClick={() => {
                          if (isMe) {
                            if (isSidebarOpen && activeToolbox === 'student') {
                              setIsSidebarOpen(false);
                            } else {
                              setIsSidebarOpen(true);
                              setActiveGuestId(p.id);
                              setActiveToolbox("student");
                            }
                            return;
                          }
                          if (!isInstructorClient && p.id !== loggedInGc?.id) return;
                          if (p.isBlank) return;
                          setActiveGuestId(p.id);
                          setActiveToolbox("student");
                          setIsSidebarOpen(true);
                        }}
                        onDoubleClick={() => handleDoubleClick(p)}
                        stickers={guestStickers[p.id] || []}
                        buttons={guestButtons[p.id] || {}}
                        nudges={stickerNudges[p.id] || {}}
                        isDoodling={isDoodling}
                        globalMute={globalMute}
                        globalPause={globalPause}
                      />
                    );
                  })}
                </div>
              ) : (
                /* Show the opened panel instead of PEOs */
                <div className="portrait-active-panel-wrapper">
                  {isChatOpen && (
                    <div className="portrait-chat-panel">
                      <div className="toolbox-header-custom">
                        <span>Chat</span>
                        <button className="close-panel-btn" onClick={() => setIsChatOpen(false)}>✕</button>
                      </div>
                      <Chat 
                        messages={messages} 
                        onSendMessage={handleSendChatMessage} 
                        onModerate={handleModerateMessage}
                        onClose={() => setIsChatOpen(false)} 
                      />
                    </div>
                  )}
                  
                  {isItoOpen && (
                    <div className="portrait-ito-panel">
                      <div className="toolbox-header-custom">
                        <span>Instructor Tools</span>
                        <button className="close-panel-btn" onClick={() => setIsSidebarOpen(false)}>✕</button>
                      </div>
                      <InstructorToolbox />
                    </div>
                  )}

                  {isStoOpen && activeGuest && (
                    <div className="portrait-sto-panel">
                      <div className="toolbox-header-custom">
                        <span>Student Tools</span>
                        <button className="close-panel-btn" onClick={() => setIsSidebarOpen(false)}>✕</button>
                      </div>
                      <UnifiedToolbox 
                        activeGuest={activeGuest}
                        guestButtons={guestButtons}
                        toggleGuestButton={handleToggleGuestButton}
                        onAddSticker={handleAddSticker}
                        onClose={() => setIsSidebarOpen(false)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Small square buttons at the bottom for Chat, ITO, STO (for portrait view) */}
              <div className="portrait-buttons-row">
                <button 
                  className={`square-action-btn ${isChatOpen ? 'active' : ''}`}
                  onClick={() => {
                    setIsChatOpen(p => !p);
                    setIsSidebarOpen(false); // Close other panels
                  }}
                  title="Chat"
                >
                  Chat
                </button>
                <button 
                  className={`square-action-btn ${isSidebarOpen && activeToolbox === 'instructor' ? 'active' : ''}`}
                  onClick={toggleITO}
                  title="ITO"
                >
                  ITO
                </button>
                <button 
                  className={`square-action-btn ${isSidebarOpen && activeToolbox === 'student' ? 'active' : ''}`}
                  onClick={toggleSTO}
                  title="STO"
                >
                  STO
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Center Grid (Landscape/Desktop) */
          <div className={`center-grid-area ${isSidebarOpen || isChatOpen ? 'sidebars-open' : ''}`} data-columns={halfLength <= 3 ? "1" : "2"} data-left-open={isSidebarOpen} data-right-open={isChatOpen}>
             <div className="side-peos" data-columns={halfLength <= 3 ? "1" : "2"}>
               {leftParticipants.map(p => {
                 return (
                   <GuestContainer 
                     key={p.id}
                     participant={p}
                     isActive={activeGuestId === p.id}
                     onClick={() => {
                       if (!isInstructorClient && p.id !== loggedInGc?.id) return;
                       if (p.isBlank) return;
                        if (activeGuestId === p.id && activeToolbox === "student" && isSidebarOpen) {
                          setIsSidebarOpen(false);
                        } else {
                          setActiveGuestId(p.id);
                          setActiveToolbox("student");
                          setIsSidebarOpen(true);
                        }
                     }}
                     onDoubleClick={() => handleDoubleClick(p)}
                     stickers={guestStickers[p.id] || []}
                     buttons={guestButtons[p.id] || {}}
                     nudges={stickerNudges[p.id] || {}}
                     isDoodling={isDoodling}
                     globalMute={globalMute}
                     globalPause={globalPause}
                   />
                 );
               })}
             </div>

              <div className="center-wrapper" style={{ position: 'relative', alignSelf: 'flex-start' }}>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  width: 'fit-content', 
                  alignItems: 'center', 
                  height: '100%', 
                  justifyContent: ((isInstructorClient && showInstructorStickers) || showStudentStickers || showStudentFilters || isPeoStickersOpen || (isInstructorClient && activeItoSection === 'studio')) ? 'space-between' : 'center' 
                }}>
                 <div className={`pc-width-keeper ${isSidebarOpen || isChatOpen ? 'pc-sidebar-open' : ''}`}>
                    <div 
                      className={`pc-gt-unified ${mediaType === 'iframe' || mediaType === 'metronome' ? 'metronome-active' : ''} ${isRhythmWheel ? 'rhythm-wheel-container' : 'presentation-container-parent'}`}
                    >
                       <PresentationContainer 
                         isDoodling={isDoodling}
                         mediaUrl={mediaUrl}
                         mediaType={mediaType}
                         onClearMedia={clearMedia}
                       />
                   </div>
                 </div>
                 <ControlDeck />
               </div>
             </div>
             
             <div className="side-peos" data-columns={halfLength <= 3 ? "1" : "2"}>
               {rightParticipantsLandscape.map(p => {
                 return (
                   <GuestContainer 
                     key={p.id}
                     participant={p}
                     isActive={activeGuestId === p.id}
                     onClick={() => {
                       if (!isInstructorClient && p.id !== loggedInGc?.id) return;
                       if (p.isBlank) return;
                        if (activeGuestId === p.id && activeToolbox === "student" && isSidebarOpen) {
                          setIsSidebarOpen(false);
                        } else {
                          setActiveGuestId(p.id);
                          setActiveToolbox("student");
                          setIsSidebarOpen(true);
                        }
                     }}
                     onDoubleClick={() => handleDoubleClick(p)}
                     stickers={guestStickers[p.id] || []}
                     buttons={guestButtons[p.id] || {}}
                     nudges={stickerNudges[p.id] || {}}
                     isDoodling={isDoodling}
                     globalMute={globalMute}
                     globalPause={globalPause}
                   />
                 );
               })}
              </div>
          </div>
        )}

        {/* Right Sidebar (only for landscape view) */}
        {isChatOpen && !isPortrait && (
          <div className="right-sidebar">
             <Chat 
               messages={messages} 
               onSendMessage={handleSendChatMessage} 
               onModerate={handleModerateMessage}
               onClose={() => setIsChatOpen(false)} 
             />
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

export default App;
