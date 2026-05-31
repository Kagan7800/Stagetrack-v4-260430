/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  // Detect if this is a fresh session (tab opened/restored or system restarted)
  if (typeof window !== 'undefined') {
    try {
      const sessionActive = sessionStorage.getItem('stagetrack_session_active');
      if (!sessionActive) {
        sessionStorage.setItem('stagetrack_session_active', 'true');
        // If there's no other active tab updating the heartbeat, clear session storage items in localStorage
        const lastActiveTime = localStorage.getItem('stagetrack_last_active_time');
        const isMultiTabSession = lastActiveTime && (Date.now() - Number(lastActiveTime) <= 8000);
        if (!isMultiTabSession) {
          localStorage.removeItem('stagetrack_guest_stickers');
          localStorage.removeItem('stagetrack_guest_buttons');
          localStorage.removeItem('stagetrack_global_pause');
          localStorage.removeItem('stagetrack_global_mute');
          localStorage.removeItem('stagetrack_lobby_request');
          localStorage.removeItem('stagetrack_lobby_response');
        }
      }
    } catch (e) {
      console.error('Session initialization error:', e);
    }
  }

  const MOCK_USER_COUNT = useMemo(() => {
    if (typeof window === 'undefined') return 12;
    try {
      const params = new URLSearchParams(window.location.search);
      const urlVal = params.get('users') || params.get('user') || params.get('count') || params.get('peo') || params.get('peos');
      if (urlVal) {
        const parsed = parseInt(urlVal, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 16) {
          return parsed;
        }
      }
    } catch { /* ignore */ }
    return 5;
  }, []);

  const totalSlots = MOCK_USER_COUNT === 1
    ? 3
    : (MOCK_USER_COUNT >= 4 
        ? (MOCK_USER_COUNT <= 4 ? 4 : (MOCK_USER_COUNT <= 8 ? 8 : (MOCK_USER_COUNT <= 12 ? 12 : 16)))
        : (MOCK_USER_COUNT % 2 !== 0 ? MOCK_USER_COUNT + 1 : MOCK_USER_COUNT)
      );

  const [isJoined, setIsJoined] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const hasUserParam = params.get('users') || params.get('user') || params.get('count') || params.get('peo') || params.get('peos');
      if (hasUserParam) {
        sessionStorage.setItem('stagetrack_role', 'instructor');
        return true;
      }

      const role = sessionStorage.getItem('stagetrack_role');
      if (role === 'instructor') {
        return true;
      }

      const res = localStorage.getItem('stagetrack_lobby_response');
      if (res && JSON.parse(res).status === 'accepted') {
        return true;
      }
    } catch { /* ignore */ }
    return false;
  });

  const [lobbyStatus, setLobbyStatus] = useState(() => {
    try {
      const saved = localStorage.getItem('stagetrack_lobby_response');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.status === 'pending') return 'waiting';
        if (parsed.status === 'denied') return 'denied';
      }
    } catch {}
    return 'initial';
  });
  const [pendingRequest, setPendingRequest] = useState(() => {
    try {
      const saved = localStorage.getItem('stagetrack_lobby_request');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const generateDefaultParticipants = useCallback((includeRestored = true) => {
    if (MOCK_USER_COUNT === 5 || MOCK_USER_COUNT === 6) {
      const list = new Array(8);
      const displayOrder = [0, 1, 4, 5, 2, 3, 6, 7];
      
      list[0] = { 
        id: 'instructor-ic', 
        name: 'Instructor', 
        color: '#3b82f6', 
        initial: 'I', 
        isInstructor: true 
      };
      
      list[1] = { 
        id: 'blank-1', 
        isBlank: true, 
        blankIndex: 1 
      };
      
      let blankCounter = 1;
      let userNumber = 2; // guest at idx 1 is Student 1, so mock starts at 2
      
      displayOrder.forEach(idx => {
        if (idx === 0 || idx === 1) return;
        
        let isBlank = false;
        if (MOCK_USER_COUNT === 5) {
          if (idx === 3 || idx === 7) isBlank = true;
        } else if (MOCK_USER_COUNT === 6) {
          if (idx === 3) isBlank = true;
        }
        
        if (isBlank) {
          blankCounter++;
          list[idx] = { id: `blank-${idx}`, isBlank: true, blankIndex: blankCounter };
        } else {
          const nameVal = String(userNumber);
          const mappedSlotNum = idx === 4 ? 3 : (idx === 5 ? 4 : (idx === 2 ? 5 : (idx === 3 ? 6 : (idx === 6 ? 7 : 8))));
          list[idx] = {
            id: mappedSlotNum,
            name: nameVal,
            color: `hsl(${(userNumber * 137.5) % 360}, 70%, 60%)`,
            initial: nameVal
          };
          userNumber++;
        }
      });
      return list;
    }

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

    // Force PEO 1 (index 0) to be Instructor Client
    list[0] = { 
      id: 'instructor-ic', 
      name: 'Instructor', 
      color: '#3b82f6', 
      initial: 'I', 
      isInstructor: true 
    };

    // Force PEO 2 (index 1) to be a blank slot (guest join destination)
    list[1] = { 
      id: 'blank-1', 
      isBlank: true, 
      blankIndex: 1 
    };

    let blankCounter = 1;

    for (let slotNum = 1; slotNum <= totalSlots; slotNum++) {
      const idx = getArrayIndex(slotNum);
      if (idx === 0 || idx === 1) {
        continue;
      }
      
      // Determine if this slot is a designated blank slot
      let isDesignatedBlank = false;
      if (MOCK_USER_COUNT === 3) {
        if (slotNum === 2) {
          isDesignatedBlank = true;
        }
      } else if (MOCK_USER_COUNT === 5) {
        if (slotNum === 6 || slotNum === 7 || slotNum === 8) {
          isDesignatedBlank = true;
        }
      } else if (MOCK_USER_COUNT === 6) {
        if (slotNum === 5 || slotNum === 8) {
          isDesignatedBlank = true;
        }
      } else if (MOCK_USER_COUNT === 7) {
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

      const customRulesMatch = [3, 6, 7, 9, 10, 11, 13, 14, 15].includes(MOCK_USER_COUNT);
      const isBlank = isDesignatedBlank || (!customRulesMatch && slotNum > MOCK_USER_COUNT);

      if (isBlank) {
        blankCounter++;
        list[idx] = { id: `blank-${idx}`, isBlank: true, blankIndex: blankCounter };
      } else {
        let nameVal = `${slotNum}`;
        if (MOCK_USER_COUNT === 3) {
          if (slotNum === 3) nameVal = "2";
          if (slotNum === 4) nameVal = "3";
        }
        list[idx] = {
          id: slotNum,
          name: nameVal,
          color: `hsl(${(slotNum * 137.5) % 360}, 70%, 60%)`,
          initial: nameVal
        };
      }
    }

    return list;
  }, [totalSlots, MOCK_USER_COUNT]);

  const [participants, setParticipants] = useState(() => generateDefaultParticipants(true));

  const [activeGuestId, setActiveGuestId] = useState(null);
  const [activeToolbox, setActiveToolbox] = useState('instructor');
  const [guestButtons, setGuestButtons] = useState(() => {
    try {
      const saved = localStorage.getItem('stagetrack_guest_buttons');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [guestStickers, setGuestStickers] = useState(() => {
    try {
      const saved = localStorage.getItem('stagetrack_guest_stickers');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [equippedSticker, setEquippedSticker] = useState(null);
  const [isDoodling, setIsDoodlingInternal] = useState(false);
  const [mediaUrl, setMediaUrlInternal] = useState(null);
  const [mediaType, setMediaTypeInternal] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [globalMute, setGlobalMute] = useState(() => {
    try {
      const saved = localStorage.getItem('stagetrack_global_mute');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [globalPause, setGlobalPause] = useState(() => {
    try {
      return localStorage.getItem('stagetrack_global_pause') === 'true';
    } catch {
      return false;
    }
  });
  const [activeTheme, setActiveTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('stagetrack_active_theme');
      return saved === 'sor' ? 'sor' : 'music-fun';
    } catch {
      return 'music-fun';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('stagetrack_active_theme', activeTheme);
    } catch { /* ignore */ }
  }, [activeTheme]);

  // Keep-alive heartbeat interval to identify active sessions across tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('stagetrack_last_active_time', String(Date.now()));
    } catch { /* ignore */ }

    const interval = setInterval(() => {
      try {
        localStorage.setItem('stagetrack_last_active_time', String(Date.now()));
      } catch { /* ignore */ }
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('stagetrack_guest_buttons', JSON.stringify(guestButtons));
    } catch { /* ignore */ }
  }, [guestButtons]);

  useEffect(() => {
    try {
      localStorage.setItem('stagetrack_guest_stickers', JSON.stringify(guestStickers));
    } catch { /* ignore */ }
  }, [guestStickers]);

  useEffect(() => {
    try {
      localStorage.setItem('stagetrack_global_mute', String(globalMute));
    } catch { /* ignore */ }
  }, [globalMute]);

  useEffect(() => {
    try {
      localStorage.setItem('stagetrack_global_pause', String(globalPause));
    } catch { /* ignore */ }
  }, [globalPause]);

  // Chat Moderation State
  const [messages, setMessages] = useState([
    { id: 'initial-1', text: "Hello! Here is a self message in darker purple.", sender: "self", status: "public" },
    { id: 'initial-2', text: "Hello there! This is a guest message in green.", sender: "other", senderName: "2", status: "public" },
    { id: 'initial-3', text: "I have a private question/pending issue in red.", sender: "other", senderName: "3", status: "pending" }
  ]);

  // Metronome State
  const [metronomeBpm, setMetronomeBpm] = useState(120);
  const [isMetronomePlaying, setIsMetronomePlaying] = useState(false);

  // Drawing Canvas Strokes
  const [drawingPaths, setDrawingPaths] = useState([]);
  const [blankCovers, setBlankCovers] = useState({});



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

  // Enforce active guest validity (cannot be blank)
  useEffect(() => {
    if (activeGuestId !== null) {
      const activeGuest = participants.find(p => p.id === activeGuestId);
      if (!activeGuest || activeGuest.isBlank) {
        setTimeout(() => {
          setActiveGuestId(null);
        }, 0);
      }
    }
  }, [activeGuestId, participants]);

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
    setGuestButtons(prev => {
      const current = prev[guestId] || { raiseHand: false, mute: false, chat: false };
      const nextVal = !current[btnName];
      const updated = { ...current, [btnName]: nextVal };
      
      const filterKeys = ['greenFilter', 'blueFilter', 'purpleFilter', 'orangeFilter'];
      if (filterKeys.includes(btnName) && nextVal) {
        filterKeys.forEach(k => {
          if (k !== btnName) {
            updated[k] = false;
          }
        });
      }
      
      return {
        ...prev,
        [guestId]: updated
      };
    });
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
      if (stickerName === 'Confetti.svg') {
        setGuestStickers(prev => {
          const nextStickers = { ...prev };
          
          // Check if any participant does NOT have confetti
          const anyoneMissingConfetti = participants.some(p => {
            const current = prev[p.id] || [];
            return !current.some(s => s.position === 'confetti');
          });

          participants.forEach(p => {
            let current = [...(prev[p.id] || [])];
            const existingConfettiIdx = current.findIndex(s => s.position === 'confetti');
            
            if (anyoneMissingConfetti) {
              if (existingConfettiIdx === -1) {
                current.push({ id: crypto.randomUUID(), name: 'Confetti.svg', position: 'confetti' });
              }
            } else {
              if (existingConfettiIdx !== -1) {
                current.splice(existingConfettiIdx, 1);
              }
            }
            nextStickers[p.id] = current;
          });
          
          return nextStickers;
        });
        return;
      }

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

      if (!isInstructor && stickerName === 'UNDO_LAST_PEO') {
        const lastPeoIndex = current.findLastIndex(s => typeof s.position === 'number');
        if (lastPeoIndex !== -1) {
          current.splice(lastPeoIndex, 1);
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

        if (stickerName === 'UNDO_ALL_IC') {
          const icUndoSlots = ['tc', 'tl-c', 'tr-c', 'lc', 'birthday', 'crown'];
          current = current.filter(s => !icUndoSlots.includes(s.position));
          return { ...prev, [targetId]: current };
        }

        if (stickerName === 'UNDO_ALL_PEO') {
          return { ...prev, [targetId]: [] };
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
        const isSun = stickerName === 'Sun with sunglasses.svg';

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
  }, [activeGuestId, participants]);

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

  const resetStudentState = useCallback(() => {
    // Clear sessionStorage
    sessionStorage.removeItem('stagetrack_guest_stickers');
    sessionStorage.removeItem('stagetrack_guest_buttons');
    sessionStorage.removeItem('stagetrack_is_doodling');
    sessionStorage.removeItem('stagetrack_media_url');
    sessionStorage.removeItem('stagetrack_media_type');
    sessionStorage.removeItem('stagetrack_is_chat_open');
    sessionStorage.removeItem('stagetrack_chat_messages');
    sessionStorage.removeItem('stagetrack_metronome_bpm');
    sessionStorage.removeItem('stagetrack_is_metronome_playing');
    sessionStorage.removeItem('stagetrack_drawing_paths');
    sessionStorage.removeItem('stagetrack_active_guest_id');
    sessionStorage.removeItem('stagetrack_role');

    // Reset state hooks
    setGuestStickers({});
    setGuestButtons({});
    setIsDoodlingInternal(false);
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    setMediaUrlInternal(null);
    setMediaTypeInternal(null);
    setIsChatOpen(false);
    setMessages([
      { id: 'initial-1', text: "Hello! Here is a self message in darker purple.", sender: "self", status: "public" },
      { id: 'initial-2', text: "Hello there! This is a guest message in green.", sender: "other", senderName: "2", status: "public" },
      { id: 'initial-3', text: "I have a private question/pending issue in red.", sender: "other", senderName: "3", status: "pending" }
    ]);
    setMetronomeBpm(120);
    setIsMetronomePlaying(false);
    setDrawingPaths([]);
    setActiveGuestId(null);
    setIsJoined(false);
    setLobbyStatus('initial');
    setEquippedSticker(null);
    setParticipants(generateDefaultParticipants(false));

    // Clear localStorage request/response
    localStorage.removeItem('stagetrack_lobby_request');
    localStorage.removeItem('stagetrack_lobby_response');
    localStorage.removeItem('stagetrack_guest_stickers');
    localStorage.removeItem('stagetrack_guest_buttons');
    localStorage.removeItem('stagetrack_global_mute');
    localStorage.removeItem('stagetrack_global_pause');
  }, [mediaUrl, generateDefaultParticipants]);

  // If not joined and we are in 'initial' lobby state, ensure student state is reset
  useEffect(() => {
    if (!isJoined && lobbyStatus === 'initial') {
      resetStudentState();
    }
  }, [isJoined, lobbyStatus, resetStudentState]);

  const requestAccess = useCallback((myName, myLittleOne, color, selectedIcon, selectedBorder) => {
    resetStudentState();
    sessionStorage.setItem('stagetrack_role', 'student');
    setLobbyStatus('waiting');
    const reqData = { myName, myLittleOne, color, selectedIcon, selectedBorder };
    console.log("Requesting access with data in student tab:", reqData);
    localStorage.setItem('stagetrack_lobby_request', JSON.stringify(reqData));
    localStorage.setItem('stagetrack_lobby_response', JSON.stringify({ status: 'pending' }));
  }, [resetStudentState]);

  const approveRequest = useCallback(() => {
    if (!pendingRequest) return;
    
    const activeId = `active-joined-${Date.now()}`;

    // Find the first blank participant
    setParticipants(prev => {
      const next = [...prev];
      const blankIdx = next.findIndex(p => p.isBlank);
      if (blankIdx !== -1) {
        next[blankIdx] = {
          id: activeId,
          name: `${pendingRequest.myName} & ${pendingRequest.myLittleOne}`,
          color: pendingRequest.color,
          selectedIcon: null,
          selectedBorder: pendingRequest.selectedBorder,
          initial: pendingRequest.myName[0] || '?'
        };
      }
      return next;
    });

    if (pendingRequest.selectedIcon) {
      setGuestStickers(prev => ({
        ...prev,
        [activeId]: [
          {
            id: crypto.randomUUID(),
            name: pendingRequest.selectedIcon,
            position: 1
          }
        ]
      }));
    }

    // Write accepted response
    localStorage.setItem('stagetrack_lobby_response', JSON.stringify({
      status: 'accepted',
      joinedUser: {
        id: activeId,
        myName: pendingRequest.myName,
        myLittleOne: pendingRequest.myLittleOne,
        color: pendingRequest.color,
        selectedIcon: pendingRequest.selectedIcon,
        selectedBorder: pendingRequest.selectedBorder
      }
    }));
    localStorage.removeItem('stagetrack_lobby_request');
    setPendingRequest(null);
  }, [pendingRequest]);

  const denyRequest = useCallback(() => {
    localStorage.setItem('stagetrack_lobby_response', JSON.stringify({ status: 'denied' }));
    localStorage.removeItem('stagetrack_lobby_request');
    setPendingRequest(null);
  }, []);

  // Listen to cross-tab storage actions
  useEffect(() => {
    const handleStorage = (e) => {
      console.log("Storage event fired:", e.key, "New value:", e.newValue);
      // For instructor: listen for new requests
      if (e.key === 'stagetrack_lobby_request') {
        console.log("Received lobby request event:", e.newValue);
        if (e.newValue) {
          setPendingRequest(JSON.parse(e.newValue));
        } else {
          setPendingRequest(null);
        }
      }
      // For student: listen for response
      if (e.key === 'stagetrack_lobby_response') {
        if (e.newValue) {
          const res = JSON.parse(e.newValue);
          if (res.status === 'accepted') {
            setLobbyStatus('initial');
            setIsJoined(true);
            const activeId = res.joinedUser.id || `active-joined-local`;
            setParticipants(prev => {
              const next = [...prev];
              const blankIdx = next.findIndex(p => p.isBlank);
              if (blankIdx !== -1) {
                next[blankIdx] = {
                  id: activeId,
                  name: `${res.joinedUser.myName} & ${res.joinedUser.myLittleOne}`,
                  color: res.joinedUser.color,
                  selectedIcon: null,
                  selectedBorder: res.joinedUser.selectedBorder,
                  initial: res.joinedUser.myName[0] || '?'
                };
              }
              return next;
            });

            if (res.joinedUser.selectedIcon) {
              setGuestStickers(prev => ({
                ...prev,
                [activeId]: [
                  {
                    id: crypto.randomUUID(),
                    name: res.joinedUser.selectedIcon,
                    position: 1
                  }
                ]
              }));
            }
          } else if (res.status === 'denied') {
            setLobbyStatus('denied');
            setIsJoined(false);
          }
        } else {
          // If lobby response was removed/deleted, kick student back to lobby
          setLobbyStatus('initial');
          setIsJoined(false);
        }
      }
      if (e.key === 'stagetrack_guest_stickers') {
        try {
          setGuestStickers(e.newValue ? JSON.parse(e.newValue) : {});
        } catch { /* ignore */ }
      }
      if (e.key === 'stagetrack_guest_buttons') {
        try {
          setGuestButtons(e.newValue ? JSON.parse(e.newValue) : {});
        } catch { /* ignore */ }
      }
      if (e.key === 'stagetrack_active_theme') {
        setActiveTheme(e.newValue === 'sor' ? 'sor' : 'music-fun');
      }
      if (e.key === 'stagetrack_global_mute') {
        setGlobalMute(e.newValue === 'true');
      }
      if (e.key === 'stagetrack_global_pause') {
        setGlobalPause(e.newValue === 'true');
      }
    };

    const handleBeforeUnload = () => {
      try {
        localStorage.removeItem('stagetrack_lobby_request');
        localStorage.removeItem('stagetrack_lobby_response');
      } catch { /* ignore */ }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Initial check on load: do not aggressively clear active requests to maintain tab status on reload
    try {
      // Clean up response if it was accepted in a previous session
      const savedResponse = localStorage.getItem('stagetrack_lobby_response');
      if (savedResponse && JSON.parse(savedResponse).status === 'accepted') {
        localStorage.removeItem('stagetrack_lobby_request');
        localStorage.removeItem('stagetrack_lobby_response');
      }
    } catch { /* ignore */ }

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const value = {
    MOCK_USER_COUNT,
    participants,
    activeGuestId, setActiveGuestId,
    activeToolbox, setActiveToolbox,
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
    drawingPaths, setDrawingPaths,
    blankCovers, setBlankCovers,
    isJoined, setIsJoined,
    lobbyStatus, setLobbyStatus,
    pendingRequest, setPendingRequest,
    requestAccess, approveRequest, denyRequest,
    resetStudentState,
    activeTheme, setActiveTheme
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useAppContext = () => useContext(AppContext);
