import React, { useState } from 'react';
import PresentationContainer from './components/PresentationContainer';
import Chat from './components/Chat';
import GuestContainer from './components/GuestContainer';
import UnifiedToolbox from './components/UnifiedToolbox';

function App() {
  const [participants] = useState(
    Array.from({ length: 16 }, (_, i) => ({
      id: i + 1,
      name: i === 0 ? "You" : `Student ${i}`,
      color: `hsl(${(i * 137.5) % 360}, 70%, 60%)`,
      initial: i === 0 ? "Y" : "S"
    }))
  );

  const [activeGuestId, setActiveGuestId] = useState(null);
  const [guestButtons, setGuestButtons] = useState({});
  const [guestStickers, setGuestStickers] = useState({});
  const [instructorStickers, setInstructorStickers] = useState([]);
  const [isDoodling, setIsDoodling] = useState(false);
  const [mediaUrl, setMediaUrl] = useState(null);
  const [mediaType, setMediaType] = useState(null);

  const [isChatOpen, setIsChatOpen] = useState(false);

  // Chat Moderation State
  const [messages, setMessages] = useState([
    { id: 1, text: "Welcome to the Music Fun classroom!", sender: "system", status: "public" }
  ]);

  const handleSimulateGuestMessage = () => {
    setMessages(prev => [
      ...prev,
      { id: Date.now(), text: "Hello! I have a question.", sender: "guest", status: "pending", senderName: "Student 3" }
    ]);
  };

  const handleModerateMessage = (msgId, action) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === msgId) {
        if (action === 'show') return { ...msg, status: 'public' };
        if (action === 'ignore') return { ...msg, status: 'ignored' };
        if (action === 'reply_private') return { ...msg, status: 'private' };
      }
      return msg;
    }));

    if (action === 'show') {
      setIsChatOpen(true); // Open chat globally when a message is approved
    } else if (action === 'reply_private') {
      setIsChatOpen(true); // Open chat for IC to type reply
      // Simulate reply being added
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          { id: Date.now(), text: "I will answer that privately.", sender: "self", status: "private" }
        ]);
      }, 500);
    }
  };

  const handleSendChatMessage = (text) => {
    setMessages(prev => [...prev, { id: Date.now(), text, sender: "self", status: "public" }]);
  };

  const toggleGuestButton = (guestId, btnName) => {
    setGuestButtons(prev => ({
      ...prev,
      [guestId]: {
        ...(prev[guestId] || { raiseHand: false, mute: false, chat: false }),
        [btnName]: !(prev[guestId]?.[btnName])
      }
    }));
  };

  const handleAddSticker = (targetId, stickerName, isInstructor) => {
    if (isInstructor) {
      setInstructorStickers(prev => {
        let newStickers = [...prev];
        const nextPos = newStickers.length % 4 + 1; // 1,2,3,4
        if (newStickers.length >= 4) {
          newStickers.shift(); // remove oldest
        }
        newStickers.push({ id: Date.now() + Math.random(), name: stickerName, position: nextPos });
        return newStickers;
      });
    } else {
      setGuestStickers(prev => {
        let current = prev[targetId] || [];
        
        if (stickerName.includes("Sun with sunglasses")) {
           current = current.filter(s => s.position !== 'sun');
           current.push({ id: Date.now() + Math.random(), name: stickerName, position: 'sun' });
        } else {
           const usedPositions = current.map(s => s.position).filter(p => p !== 'sun');
           let pos = 1;
           for (let i = 1; i <= 4; i++) {
             if (!usedPositions.includes(i)) { pos = i; break; }
           }
           
           if (usedPositions.length === 4) {
             const oldestIdx = current.findIndex(s => s.position !== 'sun');
             if (oldestIdx !== -1) current.splice(oldestIdx, 1);
           }
           current.push({ id: Date.now() + Math.random(), name: stickerName, position: pos });
        }
        
        if (current.length > 5) {
          current.shift();
        }
        
        return { ...prev, [targetId]: current };
      });
    }
  };

  const activeGuest = participants.find(p => p.id === activeGuestId);
  const isInstructor = activeGuestId === 1;

  // Toggle chat if 'chat' button is pressed by a guest or instructor
  const handleToggleGuestButton = (guestId, btnName) => {
    toggleGuestButton(guestId, btnName);
    if (btnName === 'chat') {
      setIsChatOpen(true);
    }
  };

  return (
    <div className="app-container">
      {/* Main Content Layout */}
      <div className="main-content">
        {/* Left Sidebar: Unified Toolbox (visible when a guest/instructor is selected) */}
        {activeGuestId !== null && (
          <div className="left-sidebar">
            <UnifiedToolbox 
              activeGuest={activeGuest}
              guestButtons={guestButtons}
              toggleGuestButton={handleToggleGuestButton}
              onAddSticker={handleAddSticker}
              isInstructor={isInstructor}
              isDoodling={isDoodling}
              setIsDoodling={setIsDoodling}
              onMediaUpload={(url, type) => { setMediaUrl(url); setMediaType(type); }}
              onClose={() => setActiveGuestId(null)}
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
               />
             ))}
           </div>

           <div className="pc-gt-unified">
              <PresentationContainer 
                isDoodling={isDoodling}
                mediaUrl={mediaUrl}
                mediaType={mediaType}
                onClearMedia={() => {setMediaUrl(null); setMediaType(null);}}
                instructorStickers={instructorStickers}
              />
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
