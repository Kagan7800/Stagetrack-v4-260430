import PresentationContainer from './components/PresentationContainer';
import Chat from './components/Chat';
import GuestContainer from './components/GuestContainer';
import LeftSidebar from './components/LeftSidebar';
import LobbyOverlay from './components/LobbyOverlay';
import { useAppContext } from './context/AppContext';

function App() {
  const {
    MOCK_USER_COUNT,
    participants,
    activeGuestId, setActiveGuestId,
    setActiveToolbox,
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

  const isInstructorClient = sessionStorage.getItem('stagetrack_role') !== 'student';
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
          pointerEvents: 'none',
          opacity: 0.7
        }}
      />

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
        <>
          <div className="top-banner" style={{ backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.2)), url('/assets/SOR/1ui_sor top banner-052826 3.png')", backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', height: '95px', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '0px', marginTop: '7px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '95px', transform: 'scale(1.05)', transformOrigin: 'center', zIndex: 1000 }}>
              <img 
                src="/assets/SOR/1ui_sor logo-052826.png" 
                alt="School of Rock Alpharetta" 
                style={{ 
                  height: '95px', 
                  maxHeight: '95px', 
                  width: 'auto', 
                  objectFit: 'contain',
                  filter: 'drop-shadow(0px -1px 0px #fcf6ba) drop-shadow(0px 1px 0px #aa771c) drop-shadow(-1px 0px 0px #bf953f) drop-shadow(1px 0px 0px #bf953f) drop-shadow(0 0 4px #b38728) drop-shadow(2px 2px 3px rgba(0,0,0,0.85))'
                }} 
              />
              <img 
                src="/assets/SOR/1logo_sor.png" 
                alt="School of Rock Icon" 
                style={{ 
                  position: 'absolute',
                  height: '42px',
                  width: 'auto',
                  objectFit: 'contain',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  top: '22px'
                }} 
              />
            </div>
          </div>
          <div className="gradient-divider-bar"></div>
        </>
      )}

      {/* Main Content Layout */}
      <div className="main-content">
        {/* Left Sidebar containing both ITO and STO accordions */}
        {isInstructorSidebarVisible && (
          <div className={`instructor-left-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
            <LeftSidebar />
          </div>
        )}

        {/* Center Grid */}
        <div className="center-grid-area" data-columns={halfLength <= 2 ? "1" : "2"}>
           <div className="side-peos" data-columns={halfLength <= 2 ? "1" : "2"}>
             {leftParticipants.map(p => {
               return (
                 <GuestContainer 
                   key={p.id}
                   participant={p}
                   isActive={activeGuestId === p.id}
                   onClick={() => {
                     if (!isInstructorClient) return;
                     const isMuted = guestButtons[p.id]?.mute;
                     if (globalPause || isMuted || p.isBlank) return;
                      setActiveGuestId(p.id);
                      setActiveToolbox("student");
                   }}
                   onDoubleClick={() => {
                     if (!isInstructorClient) return;
                     const isMuted = guestButtons[p.id]?.mute;
                     if (globalPause || isMuted || p.isBlank) return;
                      setActiveGuestId(p.id);
                      setActiveToolbox("instructor");
                   }}
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

           <div className="center-wrapper" style={{ justifyContent: 'center' }}>
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
           </div>
           
           <div className="side-peos" data-columns={halfLength <= 2 ? "1" : "2"}>
             {rightParticipants.map(p => {
               return (
                 <GuestContainer 
                   key={p.id}
                   participant={p}
                   isActive={activeGuestId === p.id}
                   onClick={() => {
                     if (!isInstructorClient) return;
                     const isMuted = guestButtons[p.id]?.mute;
                     if (globalPause || isMuted || p.isBlank) return;
                      setActiveGuestId(p.id);
                      setActiveToolbox("student");
                   }}
                   onDoubleClick={() => {
                     if (!isInstructorClient) return;
                     const isMuted = guestButtons[p.id]?.mute;
                     if (globalPause || isMuted || p.isBlank) return;
                      setActiveGuestId(p.id);
                      setActiveToolbox("instructor");
                   }}
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
