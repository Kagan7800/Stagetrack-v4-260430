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
      { id: crypto.randomUUID(), text: "Hello! I have a question.", sender: "guest", status: "pending", senderName: "Student 3" }
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
          { id: crypto.randomUUID(), text: "I will answer that privately.", sender: "self", status: "private" }
        ]);
      }, 500);
    }
  };

  const handleSendChatMessage = (text) => {
    setMessages(prev => [...prev, { id: crypto.randomUUID(), text, sender: "self", status: "public" }]);
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

  const getStickerCategory = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes('sun')) return { cat: 'sun', pos: 'sun' };
    if (lower.includes('birthday')) return { cat: 'birthday', pos: 'birthday' };
    if (lower.includes('crown')) return { cat: 'crown', pos: 'crown' };
    if (lower.includes('star')) return { cat: 'star', pos: 'star' };
    if (lower.includes('magic') || lower.includes('sparkle')) return { cat: 'magic', pos: 'magic' };
    if (lower.includes('guitar') || lower.includes('piano') || lower.includes('drum') || 
        lower.includes('trumpet') || lower.includes('xylophone') || 
        lower.includes('boat') || lower.includes('truck')) return { cat: 'theme', pos: 'theme-br' };
    return { cat: 'theme', pos: 'theme-bc' };
  };

  const handleAddSticker = (targetId, stickerName, isInstructor) => {
    if (isInstructor) {
      setInstructorStickers(prev => {
        let newStickers = [...prev];
        const nextPos = newStickers.length % 4 + 1; // 1,2,3,4
        if (newStickers.length >= 4) {
          newStickers.shift(); // remove oldest
        }
        newStickers.push({ id: crypto.randomUUID(), name: stickerName, position: nextPos });
        return newStickers;
      });
    } else {
      setGuestStickers(prev => {
        let current = [...(prev[targetId] || [])];
        const { cat, pos } = getStickerCategory(stickerName);
        
        // Remove existing sticker of SAME CATEGORY to enforce 1-of-a-type rule
        current = current.filter(s => {
           const existingCat = getStickerCategory(s.name).cat;
           if (existingCat === cat) return false;
           // Birthday overrides Crown
           if (cat === 'birthday' && existingCat === 'crown') return false;
           return true;
        });

        // Crown is ignored if Birthday is active
        if (cat === 'crown' && current.some(s => getStickerCategory(s.name).cat === 'birthday')) {
           return prev;
        }

        current.push({ id: crypto.randomUUID(), name: stickerName, position: pos, category: cat });
        
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
      {/* Top Banner */}
      <div className="top-banner">
        <img src="/banner.png" alt="Music Fun Banner" />
      </div>

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
              onMediaUpload={(url, type) => { 
                if (mediaUrl) URL.revokeObjectURL(mediaUrl);
                setMediaUrl(url); 
                setMediaType(type); 
              }}
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
                onClearMedia={() => {
                  if (mediaUrl) URL.revokeObjectURL(mediaUrl);
                  setMediaUrl(null); 
                  setMediaType(null);
                }}
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
