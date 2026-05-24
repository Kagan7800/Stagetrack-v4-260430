/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  const MOCK_USER_COUNT = useMemo(() => {
    if (typeof window === 'undefined') return 12;
    try {
      const params = new URLSearchParams(window.location.search);
      const urlVal = params.get('users') || params.get('count');
      if (urlVal) {
        const parsed = parseInt(urlVal, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 16) {
          sessionStorage.setItem('stagetrack_mock_user_count', parsed.toString());
          return parsed;
        }
      }
      const saved = sessionStorage.getItem('stagetrack_mock_user_count');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 16) {
          return parsed;
        }
      }
    } catch { /* ignore */ }
    return 7;
  }, []);

  const totalSlots = MOCK_USER_COUNT >= 8 
    ? (MOCK_USER_COUNT <= 8 ? 8 : (MOCK_USER_COUNT <= 12 ? 12 : 16))
    : (MOCK_USER_COUNT % 2 !== 0 ? MOCK_USER_COUNT + 1 : MOCK_USER_COUNT);

  const [participants] = useState(() => {
    // Helper function to map 1-based display slot number to grid index
    const getArrayIndex = (slotNum) => {
      if (totalSlots < 8) {
        return slotNum - 1;
      }
      const halfLength = totalSlots / 2;
      const row = Math.floor((slotNum - 1) / 4);
      const col = (slotNum - 1) % 4;
      if (col < 2) {
        return row * 2 + col;
      } else {
        return halfLength + row * 2 + (col - 2);
      }
    };

    const list = new Array(totalSlots);
    let personCounter = 0;

    for (let slotNum = 1; slotNum <= totalSlots; slotNum++) {
      const idx = getArrayIndex(slotNum);
      
      // Determine if this slot is a designated blank slot
      let isDesignatedBlank = false;
      if (MOCK_USER_COUNT === 7) {
        if (slotNum === 8) {
          isDesignatedBlank = true;
        }
      } else if (MOCK_USER_COUNT === 9) {
        if (slotNum === 10 || slotNum === 11 || slotNum === 12) {
          isDesignatedBlank = true;
        }
      } else if (MOCK_USER_COUNT === 10) {
        if (slotNum === 9 || slotNum === 12) {
          isDesignatedBlank = true;
        }
      } else if (MOCK_USER_COUNT === 11) {
        if (slotNum === 12) {
          isDesignatedBlank = true;
        }
      } else if (MOCK_USER_COUNT === 13) {
        if (slotNum === 6 || slotNum === 15 || slotNum === 16) {
          isDesignatedBlank = true;
        }
      } else if (MOCK_USER_COUNT === 14) {
        if (slotNum === 13 || slotNum === 16) {
          isDesignatedBlank = true;
        }
      } else if (MOCK_USER_COUNT === 15) {
        if (slotNum === 16) {
          isDesignatedBlank = true;
        }
      }

      if (isDesignatedBlank || personCounter >= MOCK_USER_COUNT) {
        list[idx] = { id: `blank-${idx}`, isBlank: true };
      } else {
        const personId = personCounter + 1;
        list[idx] = {
          id: personId,
          name: `${personId}`,
          color: `hsl(${(personId * 137.5) % 360}, 70%, 60%)`,
          initial: `${personId}`
        };
        personCounter++;
      }
    }
    return list;
  });

  const [activeGuestId, setActiveGuestId] = useState(() => {
    try {
      const saved = sessionStorage.getItem('stagetrack_active_guest_id');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [guestButtons, setGuestButtons] = useState(() => {
    try {
      const saved = sessionStorage.getItem('stagetrack_guest_buttons');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [guestStickers, setGuestStickers] = useState(() => {
    try {
      const saved = sessionStorage.getItem('stagetrack_guest_stickers');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [equippedSticker, setEquippedSticker] = useState(null);
  
  const [isDoodling, setIsDoodlingInternal] = useState(() => {
    try {
      const saved = sessionStorage.getItem('stagetrack_is_doodling');
      return saved ? JSON.parse(saved) : false;
    } catch { return false; }
  });

  const [mediaUrl, setMediaUrlInternal] = useState(() => {
    try {
      const saved = sessionStorage.getItem('stagetrack_media_url');
      if (saved && saved.startsWith('blob:')) return null;
      return saved || null;
    } catch { return null; }
  });

  const [mediaType, setMediaTypeInternal] = useState(() => {
    try {
      const saved = sessionStorage.getItem('stagetrack_media_type');
      const url = sessionStorage.getItem('stagetrack_media_url');
      if (url && url.startsWith('blob:')) return null;
      return saved || null;
    } catch { return null; }
  });

  const [isChatOpen, setIsChatOpen] = useState(() => {
    try {
      const saved = sessionStorage.getItem('stagetrack_is_chat_open');
      return saved ? JSON.parse(saved) : false;
    } catch { return false; }
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    try {
      const saved = sessionStorage.getItem('stagetrack_is_sidebar_open');
      return saved ? JSON.parse(saved) : false;
    } catch { return false; }
  });

  const [globalMute, setGlobalMute] = useState(true);
  const [globalPause, setGlobalPause] = useState(() => {
    try {
      const saved = sessionStorage.getItem('stagetrack_global_pause');
      return saved ? JSON.parse(saved) : false;
    } catch { return false; }
  });

  // Chat Moderation State
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem('stagetrack_chat_messages');
      return saved ? JSON.parse(saved) : [
        { id: 'initial-1', text: "Hello! Here is a self message in darker purple.", sender: "self", status: "public" },
        { id: 'initial-2', text: "Hello there! This is a guest message in green.", sender: "other", senderName: "2", status: "public" },
        { id: 'initial-3', text: "I have a private question/pending issue in red.", sender: "other", senderName: "3", status: "pending" }
      ];
    } catch {
      return [];
    }
  });

  // Metronome State
  const [metronomeBpm, setMetronomeBpm] = useState(() => {
    try {
      const saved = sessionStorage.getItem('stagetrack_metronome_bpm');
      return saved ? parseInt(saved, 10) : 120;
    } catch { return 120; }
  });

  const [isMetronomePlaying, setIsMetronomePlaying] = useState(() => {
    try {
      const saved = sessionStorage.getItem('stagetrack_is_metronome_playing');
      return saved ? JSON.parse(saved) : false;
    } catch { return false; }
  });

  // Drawing Canvas Strokes
  const [drawingPaths, setDrawingPaths] = useState(() => {
    try {
      const saved = sessionStorage.getItem('stagetrack_drawing_paths');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Sync state changes to sessionStorage
  useEffect(() => {
    if (activeGuestId !== null) {
      sessionStorage.setItem('stagetrack_active_guest_id', JSON.stringify(activeGuestId));
    } else {
      sessionStorage.removeItem('stagetrack_active_guest_id');
    }
  }, [activeGuestId]);

  useEffect(() => {
    sessionStorage.setItem('stagetrack_guest_buttons', JSON.stringify(guestButtons));
  }, [guestButtons]);

  useEffect(() => {
    sessionStorage.setItem('stagetrack_guest_stickers', JSON.stringify(guestStickers));
  }, [guestStickers]);

  useEffect(() => {
    sessionStorage.setItem('stagetrack_is_doodling', JSON.stringify(isDoodling));
  }, [isDoodling]);

  useEffect(() => {
    if (mediaUrl) {
      sessionStorage.setItem('stagetrack_media_url', mediaUrl);
    } else {
      sessionStorage.removeItem('stagetrack_media_url');
    }
  }, [mediaUrl]);

  useEffect(() => {
    if (mediaType) {
      sessionStorage.setItem('stagetrack_media_type', mediaType);
    } else {
      sessionStorage.removeItem('stagetrack_media_type');
    }
  }, [mediaType]);

  useEffect(() => {
    sessionStorage.setItem('stagetrack_is_chat_open', JSON.stringify(isChatOpen));
  }, [isChatOpen]);

  useEffect(() => {
    sessionStorage.setItem('stagetrack_is_sidebar_open', JSON.stringify(isSidebarOpen));
  }, [isSidebarOpen]);

  useEffect(() => {
    sessionStorage.setItem('stagetrack_chat_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    sessionStorage.setItem('stagetrack_metronome_bpm', metronomeBpm.toString());
  }, [metronomeBpm]);

  useEffect(() => {
    sessionStorage.setItem('stagetrack_is_metronome_playing', JSON.stringify(isMetronomePlaying));
  }, [isMetronomePlaying]);

  useEffect(() => {
    sessionStorage.setItem('stagetrack_drawing_paths', JSON.stringify(drawingPaths));
  }, [drawingPaths]);

  useEffect(() => {
    sessionStorage.setItem('stagetrack_global_pause', JSON.stringify(globalPause));
  }, [globalPause]);

  // If global pause is activated, close the active student STO panel, clear all student stickers and buttons
  useEffect(() => {
    if (globalPause) {
      setTimeout(() => {
        setActiveGuestId(null);
        setGuestStickers({});
        setGuestButtons({});
      }, 0);
    }
  }, [globalPause]);

  // Enforce active guest validity (cannot be blank, muted, or active during global pause)
  useEffect(() => {
    if (activeGuestId !== null) {
      const activeGuest = participants.find(p => p.id === activeGuestId);
      const isMuted = guestButtons[activeGuestId]?.mute;
      if (!activeGuest || activeGuest.isBlank || isMuted || globalPause) {
        setTimeout(() => {
          setActiveGuestId(null);
        }, 0);
      }
    }
  }, [activeGuestId, participants, guestButtons, globalPause]);

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
    
    if (btnName === 'mute' && newState === true) {
      setActiveGuestId(null);
    }
    
    if (btnName === 'chat') {
      setIsChatOpen(newState);
    }
  }, [guestButtons, toggleGuestButton, setActiveGuestId]);

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

      if (isInstructor) {
        if (stickerName === 'UNDO_IC') {
          const icUndoSlots = ['tc', 'tl-c', 'tr-c', 'lc', 'birthday', 'crown'];
          const lastIcIndex = current.findLastIndex(s => icUndoSlots.includes(s.position));
          if (lastIcIndex !== -1) current.splice(lastIcIndex, 1);
          return { ...prev, [targetId]: current };
        }

        if (stickerName === 'Happy_Birthday.png') {
          const hasHb = current.some(s => s.position === 'birthday');
          if (hasHb) {
            current = current.filter(s => s.position !== 'birthday' && s.position !== 'crown');
          } else {
            current = current.filter(s => s.position !== 2 && s.position !== 'tr-c' && s.position !== 'tc' && s.position !== 'birthday' && s.position !== 'crown');
            current.push({ id: crypto.randomUUID(), name: 'Happy_Birthday.png', position: 'birthday' });
            current.push({ id: crypto.randomUUID(), name: 'RealCrown.png', position: 'crown' });
          }
          return { ...prev, [targetId]: current };
        }

        if (stickerName === 'RealCrown.png') {
          const existingCrownIndex = current.findIndex(s => s.position === 'crown');
          if (existingCrownIndex !== -1) {
            current.splice(existingCrownIndex, 1);
          } else {
            current = current.filter(s => s.position !== 'tc' && s.position !== 'crown');
            current.push({ id: crypto.randomUUID(), name: 'RealCrown.png', position: 'crown' });
          }
          return { ...prev, [targetId]: current };
        }
      }

      // Check if the sticker already exists (toggle off)
      const existingIndex = current.findIndex(s => s.name === stickerName);
      if (existingIndex !== -1) {
        current.splice(existingIndex, 1);
        return { ...prev, [targetId]: current };
      }

      const hasSun = current.some(s => s.position === 'sun');
      const icSlots = hasSun 
        ? ['tc', 'tl-c', 'tr-c', 'lc']
        : ['tc', 'tl-c', 'tr-c', 'lc', 'rc-1', 'rc-2'];

      if (isInstructor) {
        // Calculate consecutive count of active instructor stickers to vary angle and size of each next added sticker
        const activeIcStickersCount = current.filter(s => icSlots.includes(s.position)).length;
        const rotations = [-15, 15, -7, 10, -12, 5, -5, 12, 0];
        const scales = [0.85, 1.15, 0.9, 1.1, 0.95, 1.05, 1.0];
        
        // Add slight random variations to angle and size to prevent identical overlapping and collisions
        const randomAngle = (Math.random() - 0.5) * 8; // -4 to +4 degrees variation
        const randomScale = (Math.random() - 0.5) * 0.1; // -0.05 to +0.05 scale variation
        
        const rotation = Number((rotations[activeIcStickersCount % rotations.length] + randomAngle).toFixed(1));
        const scale = Number((scales[activeIcStickersCount % scales.length] + randomScale).toFixed(2));

        // Find the first unoccupied slot among the active slots
        const occupiedSlots = current.map(s => s.position);
        if (occupiedSlots.includes('crown')) {
          occupiedSlots.push('tc');
        }
        if (occupiedSlots.includes('birthday')) {
          occupiedSlots.push('tr-c');
        }
        const nextSlot = icSlots.find(slot => !occupiedSlots.includes(slot));

        if (nextSlot) {
          current.push({ id: crypto.randomUUID(), name: stickerName, position: nextSlot, rotation, scale });
        } else {
          // All active slots are full: remove the oldest instructor sticker (FIFO) and reuse its position
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
          // Remove any stars in the right-center slots
          current = current.filter(s => s.position !== 'rc-1' && s.position !== 'rc-2');
          current.push({ id: crypto.randomUUID(), name: stickerName, position: 'sun' });
        } else {
          // Normal sticker
          const allowedPositions = [1, 2, 3, 4];
          const normalStickers = current.filter(s => typeof s.position === 'number');

          if (normalStickers.length >= allowedPositions.length) {
            // Remove the oldest normal sticker among allowed positions
            const oldestNormalIndex = current.findIndex(s => allowedPositions.includes(s.position));
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

    const len = participants.length;
    if (len < 8) {
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
    }

    const halfLen = len / 2;
    const numRows = len / 4;

    [0, halfLen].forEach(gridStart => {
      // Vertical nudges
      for (let r = 0; r < numRows - 1; r++) {
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

      // Horizontal nudges
      for (let r = 0; r < numRows; r++) {
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
    MOCK_USER_COUNT,
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
    setEquippedSticker,
    metronomeBpm, setMetronomeBpm,
    isMetronomePlaying, setIsMetronomePlaying,
    drawingPaths, setDrawingPaths
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useAppContext = () => useContext(AppContext);
