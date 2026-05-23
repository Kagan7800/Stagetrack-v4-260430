import PresentationContainer from './components/PresentationContainer';
import Chat from './components/Chat';
import GuestContainer from './components/GuestContainer';
import UnifiedToolbox from './components/UnifiedToolbox';
import InstructorToolbox from './components/InstructorToolbox';
import { useAppContext } from './context/AppContext';

function App() {
  const {
    participants,
    activeGuestId, setActiveGuestId,
    guestButtons, handleToggleGuestButton,
    guestStickers, handleAddSticker, stickerNudges,
    instructorStickers,
    isDoodling, setIsDoodling,
    mediaUrl, mediaType, setMediaUpload, clearMedia,
    isChatOpen, setIsChatOpen,
    isSidebarOpen, setIsSidebarOpen,
    globalMute, setGlobalMute,
    globalPause, setGlobalPause,
    messages, handleModerateMessage, handleSendChatMessage
  } = useAppContext();

  const isInstructorSidebarVisible = true;
  const activeGuest = participants.find(p => p.id === activeGuestId);

  return (
    <div className="app-container">
      {/* Top Banner */}
      <div className="top-banner" style={{ backgroundImage: "url('/banner.png')", backgroundSize: '100% 100%', position: 'relative' }}>
        
        {/* Left Side Logo */}
        <div style={{ position: 'absolute', left: '70px', height: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
          <img src="/greenStagetrack_studio.png" alt="Stagetrack Studio" style={{ height: '70%', maxWidth: '100%', objectFit: 'contain' }} />
        </div>

        <img src="/new_logo.png" alt="Music Fun Logo" style={{ height: '100%', width: 'auto', objectFit: 'contain' }} />
      </div>

      {/* Main Content Layout */}
      <div className="main-content">
        {/* Left Sidebar for Instructor Tools */}
        {isInstructorSidebarVisible && (
          <div className={`instructor-left-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
            <InstructorToolbox 
               instructorStickers={instructorStickers}
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
        <div className="center-grid-area">
           <div className="side-peos">
             {participants.slice(0, 8).map(p => (
               <GuestContainer 
                 key={p.id}
                 participant={p}
                 isActive={activeGuestId === p.id}
                 onClick={() => setActiveGuestId(p.id)}
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
               <div className={`pc-gt-unified ${mediaType === 'iframe' ? 'metronome-active' : ''}`}>
                   <PresentationContainer 
                     isDoodling={isDoodling}
                     mediaUrl={mediaUrl}
                     mediaType={mediaType}
                     instructorStickers={instructorStickers}
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
           
           <div className="side-peos">
             {participants.slice(8, 16).map(p => (
               <GuestContainer 
                 key={p.id}
                 participant={p}
                 isActive={activeGuestId === p.id}
                 onClick={() => setActiveGuestId(p.id)}
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
  );
}

export default App;
