/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useMemo, useCallback } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  const MOCK_USER_COUNT = 16; // Change this between 1 and 16 to test dynamic layouts
  const totalSlots = MOCK_USER_COUNT % 2 !== 0 ? MOCK_USER_COUNT + 1 : MOCK_USER_COUNT;

  const [participants] = useState(
    Array.from({ length: totalSlots }, (_, i) => {
      if (i >= MOCK_USER_COUNT) {
        return { id: `blank-${i}`, isBlank: true };
      }
      return {
        id: i + 1,
        name: i === 0 ? "You" : `Student ${i}`,
        color: `hsl(${(i * 137.5) % 360}, 70%, 60%)`,
        initial: i === 0 ? "Y" : "S"
      };
    })
  );

  const [activeGuestId, setActiveGuestId] = useState(null);
  const [guestButtons, setGuestButtons] = useState({});
  const [guestStickers, setGuestStickers] = useState({});
  // eslint-disable-next-line no-unused-vars
  const [instructorStickers, setInstructorStickers] = useState([]);
  const [equippedSticker, setEquippedSticker] = useState(null);
  
  const [isDoodling, setIsDoodlingInternal] = useState(false);
  const [mediaUrl, setMediaUrlInternal] = useState(null);
  const [mediaType, setMediaTypeInternal] = useState(null);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [globalMute, setGlobalMute] = useState(false);
  const [globalPause, setGlobalPause] = useState(false);

  // Chat Moderation State
  const [messages, setMessages] = useState([]);

  // MUTUAL EXCLUSIVITY: Doodling vs Upload
  const setIsDoodling = useCallback((val) => {
    setIsDoodlingInternal(val);
    if (val) {
      // Starting doodling clears upload
      if (mediaUrl) URL.revokeObjectURL(mediaUrl);
      setMediaUrlInternal(null);
      setMediaTypeInternal(null);
    }
  }, [mediaUrl]);

  const setMediaUpload = useCallback((url, type) => {
    setIsDoodlingInternal(false); // Starting upload clears doodling
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    setMediaUrlInternal(url);
    setMediaTypeInternal(type);
  }, [mediaUrl]);

  const clearMedia = useCallback(() => {
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    setMediaUrlInternal(null);
    setMediaTypeInternal(null);
  }, [mediaUrl]);

  const handleModerateMessage = useCallback((msgId, action) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === msgId) {
        if (action === 'show') return { ...msg, status: 'public' };
        if (action === 'ignore') return { ...msg, status: 'ignored' };
        if (action === 'reply_private') return { ...msg, status: 'private' };
      }
      return msg;
    }));

    if (action === 'show') {
      setIsChatOpen(true);
    } else if (action === 'reply_private') {
      setIsChatOpen(true);
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          { id: crypto.randomUUID(), text: "I will answer that privately.", sender: "self", status: "private" }
        ]);
      }, 500);
    }
  }, [setMessages, setIsChatOpen]);

  const handleSendChatMessage = useCallback((text) => {
    setMessages(prev => [...prev, { id: crypto.randomUUID(), text, sender: "self", status: "public" }]);
  }, [setMessages]);

  const toggleGuestButton = useCallback((guestId, btnName) => {
    setGuestButtons(prev => ({
      ...prev,
      [guestId]: {
        ...(prev[guestId] || { raiseHand: false, mute: false, chat: false }),
        [btnName]: !(prev[guestId]?.[btnName])
      }
    }));
  }, [setGuestButtons]);

  const handleToggleGuestButton = useCallback((guestId, btnName) => {
    const currentState = guestButtons[guestId]?.[btnName] || false;
    const newState = !currentState;
    toggleGuestButton(guestId, btnName);
    if (btnName === 'chat') {
      setIsChatOpen(newState);
    }
  }, [guestButtons, toggleGuestButton]);

  const handleAddSticker = useCallback((targetId, stickerName, isInstructor) => {
    if (isInstructor && targetId === 'instructor') {
      if (activeGuestId === null) return;
      targetId = activeGuestId;
    }

    setGuestStickers(prev => {
      let current = [...(prev[targetId] || [])];
      const isInterchangeable = ['Star.png', 'Star2.png', 'RealHeart.png', 'Heart2.png', 'Star_Green.png', 'Star_Pink.png'].includes(stickerName);

      if (stickerName === 'UNDO_IC') {
        const lastIcIndex = current.findLastIndex(s => typeof s.position === 'string' && s.position.startsWith('ic-slot-'));
        if (lastIcIndex !== -1) current.splice(lastIcIndex, 1);
        return { ...prev, [targetId]: current };
      }

      const existingIndex = current.findIndex(s => s.name === stickerName);
      if (existingIndex !== -1 && !isInterchangeable) {
        current.splice(existingIndex, 1);
        return { ...prev, [targetId]: current };
      }

      let pos;

      if (isInstructor) {
        if (stickerName === 'RealCrown.png') pos = 'crown';
        else if (stickerName === 'Happy_Birthday.png') {
          pos = 'birthday';
          current = current.filter(s => s.position !== 2);
        }
        else if (stickerName === 'Balloons.png') pos = 'balloons';
        else if (['Star.png', 'Star2.png', 'RealHeart.png', 'Heart2.png', 'Star_Green.png', 'Star_Pink.png'].includes(stickerName)) {
          const hasSun = current.some(s => s.position === 'sun');
          const hasHB = current.some(s => s.position === 'birthday');
          
          const hasPos1 = current.some(s => s.position === 1);
          const hasPos2 = current.some(s => s.position === 2);
          const hasPos3 = current.some(s => s.position === 3);
          const hasPos4 = current.some(s => s.position === 4);
          
          let icSlots = ['ic-slot-tl', 'ic-slot-tr', 'ic-slot-bl', 'ic-slot-br', 'ic-slot-rc', 'ic-slot-lc', 'ic-slot-tl-cl', 'ic-slot-bl-cl', 'ic-slot-tr-cr', 'ic-slot-br-cr', 'ic-slot-tc-r', 'ic-slot-tc-l', 'ic-slot-tc-hb'];
          
          if (hasSun) icSlots = icSlots.filter(s => s !== 'ic-slot-rc');
          if (hasHB) icSlots = icSlots.filter(s => s !== 'ic-slot-tc-hb');
          
          if (hasPos1) icSlots = icSlots.filter(s => s !== 'ic-slot-tl');
          if (hasPos2) icSlots = icSlots.filter(s => s !== 'ic-slot-tr');
          if (hasPos3) icSlots = icSlots.filter(s => s !== 'ic-slot-bl');
          if (hasPos4) icSlots = icSlots.filter(s => s !== 'ic-slot-br');

          const usedSlots = current.filter(s => icSlots.includes(s.position)).map(s => s.position);
          const available = icSlots.filter(s => !usedSlots.includes(s));
          
          if (available.length > 0) {
            pos = available[0];
          } else {
            const lcIndex = current.findIndex(s => s.position === 'ic-slot-lc');
            if (lcIndex !== -1) {
              pos = 'ic-slot-lc';
              current.splice(lcIndex, 1);
            } else {
              const oldestIndex = current.findIndex(s => icSlots.includes(s.position));
              if (oldestIndex !== -1) {
                pos = current[oldestIndex].position;
                current.splice(oldestIndex, 1);
              }
            }
          }
        }
        else if (stickerName === 'Confetti.svg') pos = 'confetti';

        current = current.filter(s => s.position !== pos);

        if (pos === 'balloons') current = current.filter(s => s.position !== 'ic-slot-lc');
        else if (pos === 'ic-slot-lc') current = current.filter(s => s.position !== 'balloons');

        if (pos === 'birthday') current = current.filter(s => s.position !== 'ic-slot-tc-hb');
        else if (pos === 'ic-slot-tc-hb') current = current.filter(s => s.position !== 'birthday');
      } else {
        const isSun = stickerName.toLowerCase().includes('sun');

        if (isSun) {
          pos = 'sun';
          current = current.filter(s => s.position !== 2 && s.position !== 4 && s.position !== 5 && s.position !== 'ic-slot-rc');
        } else {
          const hasSun = current.some(s => s.position === 'sun');
          const hasBirthday = current.some(s => s.position === 'birthday');
          
          let allowedPositions = [1, 2, 3, 4];
          if (hasSun) allowedPositions = allowedPositions.filter(p => p !== 2 && p !== 4);
          if (hasBirthday) allowedPositions = allowedPositions.filter(p => p !== 2);

          const maxAllowed = allowedPositions.length;
          const normalStickers = current.filter(s => typeof s.position === 'number');
          
          if (normalStickers.length >= maxAllowed) {
            const oldestNormalIndex = current.findIndex(s => typeof s.position === 'number');
            if (oldestNormalIndex !== -1) current.splice(oldestNormalIndex, 1);
          }

          const usedPositions = current.map(s => s.position).filter(p => typeof p === 'number');
          const availablePositions = allowedPositions.filter(p => !usedPositions.includes(p));
          pos = availablePositions[0];
        }
      }

      current.push({ id: crypto.randomUUID(), name: stickerName, position: pos });

      if (pos === 1) current = current.filter(s => s.position !== 'ic-slot-tl');
      else if (pos === 'ic-slot-tl') current = current.filter(s => s.position !== 1);

      if (pos === 2) current = current.filter(s => s.position !== 'ic-slot-tr');
      else if (pos === 'ic-slot-tr') current = current.filter(s => s.position !== 2);

      if (pos === 3) current = current.filter(s => s.position !== 'ic-slot-bl');
      else if (pos === 'ic-slot-bl') current = current.filter(s => s.position !== 3);

      if (pos === 4) current = current.filter(s => s.position !== 'ic-slot-br');
      else if (pos === 'ic-slot-br') current = current.filter(s => s.position !== 4);
      
      return { ...prev, [targetId]: current };
    });
  }, [activeGuestId]);

  const stickerNudges = useMemo(() => {
    const nudges = {};
    participants.forEach(p => nudges[p.id] = {});

    [0, participants.length / 2].forEach(gridStart => {
      // If we are in 1-column mode, there's no left/right to nudge, and up/down logic is different.
      // For safety, only apply grid nudges if we actually have 2 columns.
      if (participants.length <= 8) return;

      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 2; c++) {
          const topGuest = participants[gridStart + r * 2 + c];
          const bottomGuest = participants[gridStart + (r + 1) * 2 + c];
          
          if (!topGuest || !bottomGuest || topGuest.isBlank || bottomGuest.isBlank) continue;

          const topGuestId = topGuest.id;
          const bottomGuestId = bottomGuest.id;
          
          const topStickers = guestStickers[topGuestId] || [];
          const bottomStickers = guestStickers[bottomGuestId] || [];

          if (topStickers.some(s => s.position === 3) && bottomStickers.some(s => s.position === 1)) {
            nudges[topGuestId][3] = { ...nudges[topGuestId][3], y: (nudges[topGuestId][3]?.y || 0) - 20 };
            nudges[bottomGuestId][1] = { ...nudges[bottomGuestId][1], y: (nudges[bottomGuestId][1]?.y || 0) + 20 };
          }
          if (topStickers.some(s => s.position === 4) && bottomStickers.some(s => s.position === 2)) {
            nudges[topGuestId][4] = { ...nudges[topGuestId][4], y: (nudges[topGuestId][4]?.y || 0) - 20 };
            nudges[bottomGuestId][2] = { ...nudges[bottomGuestId][2], y: (nudges[bottomGuestId][2]?.y || 0) + 20 };
          }
        }
      }

      for (let r = 0; r < 4; r++) {
        const leftGuest = participants[gridStart + r * 2];
        const rightGuest = participants[gridStart + r * 2 + 1];

        if (!leftGuest || !rightGuest || leftGuest.isBlank || rightGuest.isBlank) continue;

        const leftGuestId = leftGuest.id;
        const rightGuestId = rightGuest.id;

        const leftStickers = guestStickers[leftGuestId] || [];
        const rightStickers = guestStickers[rightGuestId] || [];

        if (leftStickers.some(s => s.position === 2) && rightStickers.some(s => s.position === 1)) {
          nudges[leftGuestId][2] = { ...nudges[leftGuestId][2], x: (nudges[leftGuestId][2]?.x || 0) - 20 };
          nudges[rightGuestId][1] = { ...nudges[rightGuestId][1], x: (nudges[rightGuestId][1]?.x || 0) + 20 };
        }
        if (leftStickers.some(s => s.position === 4) && rightStickers.some(s => s.position === 3)) {
          nudges[leftGuestId][4] = { ...nudges[leftGuestId][4], x: (nudges[leftGuestId][4]?.x || 0) - 20 };
          nudges[rightGuestId][3] = { ...nudges[rightGuestId][3], x: (nudges[rightGuestId][3]?.x || 0) + 20 };
        }
      }
    });

    participants.forEach(p => {
       const stickers = guestStickers[p.id] || [];
       stickers.forEach(s => {
          if (s.position === 1) nudges[p.id][1] = { ...(nudges[p.id][1] || {}), x: (nudges[p.id][1]?.x || 0) + 20, y: (nudges[p.id][1]?.y || 0) + 20 };
          if (s.position === 2) nudges[p.id][2] = { ...(nudges[p.id][2] || {}), x: (nudges[p.id][2]?.x || 0) - 20, y: (nudges[p.id][2]?.y || 0) + 20 };
          if (s.position === 3) nudges[p.id][3] = { ...(nudges[p.id][3] || {}), x: (nudges[p.id][3]?.x || 0) + 20, y: (nudges[p.id][3]?.y || 0) - 20 };
          if (s.position === 4) nudges[p.id][4] = { ...(nudges[p.id][4] || {}), x: (nudges[p.id][4]?.x || 0) - 20, y: (nudges[p.id][4]?.y || 0) - 20 };
       });
    });

    return nudges;
  }, [participants, guestStickers]);

  const value = {
    participants,
    activeGuestId, setActiveGuestId,
    guestButtons, handleToggleGuestButton,
    guestStickers, handleAddSticker,
    stickerNudges,
    instructorStickers,
    isDoodling, setIsDoodling,
    mediaUrl, mediaType, setMediaUpload, clearMedia,
    isChatOpen, setIsChatOpen,
    isSidebarOpen, setIsSidebarOpen,
    globalMute, setGlobalMute,
    globalPause, setGlobalPause,
    messages, setMessages,
    handleModerateMessage,
    handleSendChatMessage,
    equippedSticker,
    setEquippedSticker
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useAppContext = () => useContext(AppContext);
