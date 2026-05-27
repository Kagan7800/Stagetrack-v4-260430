import PresentationContainer from './components/PresentationContainer';
import Chat from './components/Chat';
import GuestContainer from './components/GuestContainer';
import UnifiedToolbox from './components/UnifiedToolbox';
import InstructorToolbox from './components/InstructorToolbox';
import LobbyOverlay from './components/LobbyOverlay';
import { useAppContext } from './context/AppContext';

function App() {
  const {
    MOCK_USER_COUNT,
    participants,
    activeGuestId, setActiveGuestId,
    guestButtons, handleToggleGuestButton,
    guestStickers, handleAddSticker, stickerNudges,
    isDoodling, setIsDoodling,
    mediaUrl, mediaType, setMediaUpload, clearMedia,
    isChatOpen, setIsChatOpen,
    isSidebarOpen, setIsSidebarOpen,
    globalMute, setGlobalMute,
    globalPause, setGlobalPause,
    messages, handleModerateMessage, handleSendChatMessage,
    isJoined,
    activeTheme
  } = useAppContext();

  const isInstructorSidebarVisible = true;
  const activeGuest = participants.find(p => p.id === activeGuestId);

  const halfLength = participants.length / 2;
  const activeCount = participants.filter(p => !p.isBlank).length;
  const isThreePeo = Number(MOCK_USER_COUNT) === 3 || (participants.length === 4 && activeCount === 3);

  const leftParticipants = isThreePeo 
    ? [participants[0], participants[1]] 
    : participants.slice(0, halfLength);
  const rightParticipants = isThreePeo 
    ? [participants[2], participants[3]] 
    : participants.slice(halfLength);

  const isConfettiActive = Object.values(guestStickers || {}).some(stickersList => 
    Array.isArray(stickersList) && stickersList.some(s => s.position === 'confetti' || s.name === 'Confetti.svg')
  );

  return (
    <div className="app-container" style={{ position: 'relative', overflow: 'hidden' }}>
      {!isJoined && <LobbyOverlay />}

      {/* LAYER 0: BASE MUSIC FUN BACKGROUND */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          backgroundImage: "url('/assets/background_modern.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          pointerEvents: 'none'
        }}
      />

      {/* LAYER 1: SOR BACKGROUND OVERLAY */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: "url('/assets/ui-SOR_bkgd.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
          zIndex: 1, 
          pointerEvents: 'none',
          transition: 'opacity 0.5s ease-in-out',
          opacity: activeTheme === 'sor' ? 1 : 0
        }}
      />

      {/* LAYER 1.5: GLOBAL CONFETTI OVERLAY FOR SOR THEME */}
      {activeTheme === 'sor' && isConfettiActive && (
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 5,
            pointerEvents: 'none',
            overflow: 'hidden',
            backgroundImage: "url('/assets/svg_stickers/Confetti.svg')",
            backgroundSize: '250px 250px',
            backgroundRepeat: 'repeat'
          }}
        />
      )}

      {/* LAYER 2: INTERACTIVE UI HOUSING */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      {/* Top Banner */}
      {activeTheme !== 'sor' ? (
        <div className="top-banner" style={{ backgroundImage: "url('/banner.png')", backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', position: 'relative' }}>
          {/* Left Side Logo */}
          <div style={{ position: 'absolute', left: '70px', height: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
            <img src="/greenStagetrack_studio.png" alt="Stagetrack Studio" style={{ height: '70%', maxWidth: '100%', objectFit: 'contain' }} />
          </div>

          <img src="/assets/logo_modern.png" alt="Music Fun Logo" style={{ height: '100%', width: 'auto', objectFit: 'contain' }} />
        </div>
      ) : (
        <div className="top-banner" style={{ background: 'transparent', height: '15vh' }} />
      )}

      {/* Main Content Layout */}
      <div className="main-content">
        {/* Left Sidebar for Instructor Tools */}
        {isInstructorSidebarVisible && (
          <div className={`instructor-left-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
            <InstructorToolbox 
               onAddSticker={handleAddSticker}
               isDoodling={isDoodling}
               setIsDoodling={setIsDoodling}
               globalMute={globalMute}
               setGlobalMute={setGlobalMute}
               globalPause={globalPause}
               setGlobalPause={setGlobalPause}
               isSidebarOpen={isSidebarOpen}
               setIsSidebarOpen={setIsSidebarOpen}
               onMediaUpload={setMediaUpload}
            />
          </div>
        )}

        {/* Center Grid */}
        <div className="center-grid-area" data-columns={halfLength <= 2 ? "1" : "2"}>
           <div className="side-peos" data-columns={halfLength <= 2 ? "1" : "2"}>
             {leftParticipants.map(p => (
               <GuestContainer 
                 key={p.id}
                 participant={p}
                 isActive={activeGuestId === p.id}
                 onClick={() => {
                   const isMuted = guestButtons[p.id]?.mute;
                   if (globalPause || isMuted || p.isBlank) return;
                   setActiveGuestId(p.id);
                 }}
                 stickers={guestStickers[p.id] || []}
                 buttons={guestButtons[p.id] || {}}
                 nudges={stickerNudges[p.id] || {}}
                 isDoodling={isDoodling}
                 globalMute={globalMute}
                 globalPause={globalPause}
               />
             ))}
           </div>

           <div className="center-wrapper" style={{ justifyContent: activeGuestId !== null ? 'flex-start' : 'center' }}>
             <div className="pc-width-keeper">
                <div 
                  className={`pc-gt-unified ${mediaType === 'iframe' || mediaType === 'metronome' ? 'metronome-active' : ''}`}
                  style={{ borderColor: activeTheme === 'sor' ? '#dc2626' : '#22c55e' }}
                >
                   <PresentationContainer 
                     isDoodling={isDoodling}
                     mediaUrl={mediaUrl}
                     mediaType={mediaType}
                     onClearMedia={clearMedia}
                   />
               </div>
             </div>

             {/* Unified Toolbox Overlay (STO) */}
             {activeGuestId !== null && activeGuest && (
               <div className="toolbox-panel">
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
           
           <div className="side-peos" data-columns={halfLength <= 2 ? "1" : "2"}>
             {rightParticipants.map(p => (
               <GuestContainer 
                 key={p.id}
                 participant={p}
                 isActive={activeGuestId === p.id}
                 onClick={() => {
                   const isMuted = guestButtons[p.id]?.mute;
                   if (globalPause || isMuted || p.isBlank) return;
                   setActiveGuestId(p.id);
                 }}
                 stickers={guestStickers[p.id] || []}
                 buttons={guestButtons[p.id] || {}}
                 nudges={stickerNudges[p.id] || {}}
                 isDoodling={isDoodling}
                 globalMute={globalMute}
                 globalPause={globalPause}
               />
             ))}
            </div>
        </div>

        {/* Right Sidebar */}
        {isChatOpen && (
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
