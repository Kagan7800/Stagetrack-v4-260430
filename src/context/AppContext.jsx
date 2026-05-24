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
  const [equippedSticker, setEquippedSticker] = useState(null);
  
  const [isDoodling, setIsDoodlingInternal] = useState(false);
  const [mediaUrl, setMediaUrlInternal] = useState(null);
  const [mediaType, setMediaTypeInternal] = useState(null);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [globalMute, setGlobalMute] = useState(true);
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
    // If it's the instructor adding a sticker to the instructor container
    if (isInstructor && targetId === 'instructor') {
      if (activeGuestId === null) return;
      targetId = activeGuestId;
    }

    // Otherwise, guest/PEO stickers
    setGuestStickers(prev => {
      let current = [...(prev[targetId] || [])];

      if (stickerName === 'Confetti.svg') {
        const existingConfetti = current.findIndex(s => s.position === 'confetti');
        if (existingConfetti !== -1) {
          current.splice(existingConfetti, 1);
        } else {
          current.push({ id: crypto.randomUUID(), name: stickerName, position: 'confetti' });
        }
        return { ...prev, [targetId]: current };
      }

      // Check if the sticker already exists (toggle off)
      const existingIndex = current.findIndex(s => s.name === stickerName);
      if (existingIndex !== -1) {
        current.splice(existingIndex, 1);
        return { ...prev, [targetId]: current };
      }

      const icSlots = ['tl-c', 'tr-c', 'lc', 'rc-a', 'br-n', 'bl-n', 'lc-a', 'rc-b', 'lc-b'];

      if (isInstructor) {
        if (stickerName === 'UNDO_IC') {
          // Remove the last added instructor sticker (which occupies one of the 9 slots)
          const lastIcIndex = current.findLastIndex(s => icSlots.includes(s.position));
          if (lastIcIndex !== -1) current.splice(lastIcIndex, 1);
          return { ...prev, [targetId]: current };
        }

        // Calculate consecutive count of active instructor stickers to vary angle and size of each next added sticker
        const activeIcStickersCount = current.filter(s => icSlots.includes(s.position)).length;
        const rotations = [-15, 15, -7, 10, -12, 5, -5, 12, 0];
        const scales = [0.85, 1.15, 0.9, 1.1, 0.95, 1.05, 1.0];
        
        // Add slight random variations to angle and size to prevent identical overlapping and collisions
        const randomAngle = (Math.random() - 0.5) * 8; // -4 to +4 degrees variation
        const randomScale = (Math.random() - 0.5) * 0.1; // -0.05 to +0.05 scale variation
        
        const rotation = Number((rotations[activeIcStickersCount % rotations.length] + randomAngle).toFixed(1));
        const scale = Number((scales[activeIcStickersCount % scales.length] + randomScale).toFixed(2));

        // Find the first unoccupied slot among the 9 slots
        const occupiedSlots = current.map(s => s.position);
        const nextSlot = icSlots.find(slot => !occupiedSlots.includes(slot));

        if (nextSlot) {
          current.push({ id: crypto.randomUUID(), name: stickerName, position: nextSlot, rotation, scale });
        } else {
          // All 9 slots are full: remove the oldest instructor sticker (FIFO) and reuse its position
          const oldestIcIndex = current.findIndex(s => icSlots.includes(s.position));
          if (oldestIcIndex !== -1) {
            const removed = current[oldestIcIndex];
            current.splice(oldestIcIndex, 1);
            current.push({ id: crypto.randomUUID(), name: stickerName, position: removed.position, rotation, scale });
          }
        }
      } else {
        // Guest sticker logic
        const isSun = stickerName === 'Sun with sunglasses 2.svg';

        if (isSun) {
          // Sun always goes to position 4
          const targetPos = 4;
          const existingStickerAtTarget = current.find(s => s.position === targetPos);
          if (existingStickerAtTarget) {
            // Move the existing sticker at position 4 to one of the other 3 positions (1, 2, 3)
            const occupiedPositions = current.map(s => s.position);
            const emptyPos = [1, 2, 3].find(p => !occupiedPositions.includes(p));
            if (emptyPos !== undefined) {
              existingStickerAtTarget.position = emptyPos;
            } else {
              // All 4 positions are full (1, 2, 3, 4), so the replaced sticker disappears
              current = current.filter(s => s.id !== existingStickerAtTarget.id);
            }
          }
          current.push({ id: crypto.randomUUID(), name: stickerName, position: targetPos });
        } else {
          // Normal sticker
          const hasSun = current.some(s => s.name === 'Sun with sunglasses 2.svg');
          const allowedPositions = hasSun ? [1, 2, 3] : [1, 2, 3, 4];
          
          const normalStickers = current.filter(s => typeof s.position === 'number' && s.name !== 'Sun with sunglasses 2.svg');

          if (normalStickers.length >= allowedPositions.length) {
            // Remove the oldest normal sticker among allowed positions
            const oldestNormalIndex = current.findIndex(s => allowedPositions.includes(s.position) && s.name !== 'Sun with sunglasses 2.svg');
            if (oldestNormalIndex !== -1) {
              current.splice(oldestNormalIndex, 1);
            }
          }

          // Now find the first empty position among allowed positions
          const occupiedPositions = current.map(s => s.position);
          const nextPos = allowedPositions.find(p => !occupiedPositions.includes(p));
          current.push({ id: crypto.randomUUID(), name: stickerName, position: nextPos });
        }
      }

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
