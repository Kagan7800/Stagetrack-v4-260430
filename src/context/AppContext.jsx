/* eslint-disable react-refresh/only-export-components */
// src/context/AppContext.jsx

import { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, setDoc, getDoc } from 'firebase/firestore';

export const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Session & User Identifiers
  const [sessionId, setSessionId] = useState(null);
  const [isJoined, setIsJoined] = useState(false);
  const [lobbyStatus, setLobbyStatus] = useState('initial'); // 'initial' | 'pending' | 'approved' | 'rejected'
  const [activeGuestId, setActiveGuestId] = useState(null);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [gcUsers, setGcUsers] = useState([]);

  // UI & Tool States
  const [participants, setParticipants] = useState([
    { id: 'instructor-ic', name: 'Instructor', isInstructor: true, color: '#3b82f6' }
  ]);
  const [drawingPaths, setDrawingPaths] = useState([]);
  const [mediaUrl, setMediaUrl] = useState('/assets/MF_images/Music_Fun_with_my_Little_One.jpg');
  const [mediaType, setMediaType] = useState('image');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeToolbox, setActiveToolbox] = useState(null);
  const [guestStickers, setGuestStickers] = useState({});
  const [guestButtons, setGuestButtons] = useState({});
  const [stickerNudges, setStickerNudges] = useState({});
  const [isDoodling, setIsDoodling] = useState(false);
  const [globalMute, setGlobalMute] = useState(false);
  const [globalPause, setGlobalPause] = useState(false);
  const [messages, setMessages] = useState([]);
  const [activeTheme, setActiveTheme] = useState('default');
  const [activeItoSection, setActiveItoSection] = useState(null);
  const [stageTimer, setStageTimer] = useState(null);
  const [curtainsOpen, setCurtainsOpen] = useState(true);
  const [showInstructorStickers, setShowInstructorStickers] = useState(false);
  const [showStudentStickers, setShowStudentStickers] = useState(false);
  const [showStudentFilters, setShowStudentFilters] = useState(false);
  const [isPeoStickersOpen, setIsPeoStickersOpen] = useState(false);
  const [isFirebaseUpdating, setIsFirebaseUpdating] = useState(false);

  // 1. EXTRACT SESSION ID & ENFORCE LOBBY STOPPER ON MOUNT
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paramSession = urlParams.get('session') || 'session-hm898y4nq';
    const roleParam = urlParams.get('role');

    const isStudent = sessionStorage.getItem('stagetrack_role') === 'student' || 
                      roleParam === 'guest' || 
                      roleParam === 'student';
    
    const timer = setTimeout(() => {
      setSessionId(paramSession);

      if (isStudent) {
        sessionStorage.setItem('stagetrack_role', 'student');

        // Check if session changed from saved session
        const savedSession = sessionStorage.getItem('stagetrack_session_id');
        if (paramSession !== savedSession) {
          sessionStorage.removeItem('stagetrack_lobby_response');
          sessionStorage.removeItem('stagetrack_active_guest_id');
          sessionStorage.setItem('stagetrack_session_id', paramSession);
        }

        // STRICT CHECK: Guest ONLY enters if explicitly approved in sessionStorage
        const savedRes = sessionStorage.getItem('stagetrack_lobby_response');
        if (savedRes) {
          try {
            const parsed = JSON.parse(savedRes);
            if ((parsed.status === 'approved' || parsed.status === 'accepted') && parsed.joinedUser) {
              setIsJoined(true);
              setLobbyStatus('approved');
              setActiveGuestId(parsed.joinedUser.id);
              return;
            }
          } catch { /* ignore parse error */ }
        }

        // IF NOT APPROVED -> FORCE GUEST TO STAY IN LOBBY OVERLAY
        setIsJoined(false);
        setLobbyStatus('initial');
      } else {
        // Instructor client is joined automatically
        setIsJoined(true);
        sessionStorage.setItem('stagetrack_role', 'instructor');
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // 1.5. INITIALIZE FIRESTORE SESSION DOCUMENT ON MOUNT FOR INSTRUCTOR (Preserves active session states on reload)
  useEffect(() => {
    if (!sessionId) return;
    const isInstructor = sessionStorage.getItem('stagetrack_role') === 'instructor';
    if (!isInstructor) return;

    const sessionRef = doc(db, "sessions", sessionId);
    const initDoc = async () => {
      try {
        const docSnap = await getDoc(sessionRef);
        if (!docSnap.exists()) {
          // Document does not exist, initialize it cleanly
          await setDoc(sessionRef, {
            createdAt: Date.now(),
            activeUsers: [
              {
                uid: 'instructor-ic',
                role: 'ic',
                isInstructor: true,
                joinedAt: Date.now(),
                slotIndex: 0,
                name: 'Instructor'
              }
            ],
            guestStickers: {},
            guestButtons: {},
            messages: [],
            lobbyRequest: null,
            lobbyResponse: null,
            globalMute: false,
            globalPause: false,
            activeTheme: 'default',
            isDoodling: false,
            mediaUrl: '/assets/MF_images/Music_Fun_with_my_Little_One.jpg',
            mediaType: 'image',
            curtainsOpen: true,
            stageTimer: null,
            drawingPaths: []
          });
          console.log("Session document initialized successfully in Firestore.");
        } else {
          // Document already exists, make sure instructor is in activeUsers if not already there
          const data = docSnap.data();
          const hasInstructor = (data.activeUsers || []).some(u => u.uid === 'instructor-ic' || u.isInstructor);
          if (!hasInstructor) {
            const instructorUser = {
              uid: 'instructor-ic',
              role: 'ic',
              isInstructor: true,
              joinedAt: Date.now(),
              slotIndex: 0,
              name: 'Instructor'
            };
            await updateDoc(sessionRef, {
              activeUsers: [instructorUser, ...(data.activeUsers || [])]
            });
            console.log("Instructor rejoined existing session document in Firestore.");
          } else {
            console.log("Instructor already present in existing session document.");
          }
        }
      } catch (err) {
        console.error("Failed to initialize session in Firestore:", err);
      }
    };
    initDoc();
  }, [sessionId]);

  // 2. FIRESTORE REALTIME SYNC (Handles Lobby Requests, Acceptances, and Room States)
  useEffect(() => {
    if (!sessionId) return;

    const sessionRef = doc(db, "sessions", sessionId);
    const unsubscribe = onSnapshot(sessionRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();

      // Instructor side: Catch incoming lobby requests
      const isInstructor = sessionStorage.getItem('stagetrack_role') === 'instructor';
      if (isInstructor) {
        if (data.lobbyRequest) {
          setPendingRequest(data.lobbyRequest);
        } else {
          setPendingRequest(null);
        }
      }

      // Guest side: Auto-restore pending status on reload/reconnect if lobbyRequest matches local ID
      if (!isInstructor && lobbyStatus === 'initial') {
        const myGuestId = sessionStorage.getItem('stagetrack_active_guest_id');
        if (myGuestId && data.lobbyRequest && data.lobbyRequest.id === myGuestId) {
          setLobbyStatus('pending');
        }
      }

      // Guest side: Catch approval from Instructor
      if (!isInstructor && lobbyStatus === 'pending') {
        const myGuestId = sessionStorage.getItem('stagetrack_active_guest_id');
        const approvedId = data.lobbyResponse?.approvedGuestId;
        // Robust matching: exact ID match OR both are guest prefixed IDs ('active-joined') to handle timestamp mismatches
        const isMatch = approvedId === myGuestId ||
          (myGuestId && approvedId && myGuestId.startsWith('active-joined') && approvedId.startsWith('active-joined'));

        if (data.lobbyResponse && isMatch) {
          const status = data.lobbyResponse.status;
          if (status === 'approved' || status === 'accepted') {
            const finalGuestId = approvedId || myGuestId || `active-joined-${Date.now()}`;
            const approvedUser = { id: finalGuestId, name: data.lobbyResponse.guestName || 'Guest' };
            sessionStorage.setItem('stagetrack_lobby_response', JSON.stringify({
              status: 'approved',
              joinedUser: approvedUser
            }));
            sessionStorage.setItem('stagetrack_active_guest_id', finalGuestId);
            setActiveGuestId(finalGuestId);
            setLobbyStatus('approved');
            setIsJoined(true);
          } else if (status === 'rejected' || status === 'denied') {
            setLobbyStatus('rejected');
            setIsJoined(false);
          }
        }
      }

      // Guest auto-disconnect check: reset client if guest kicked/room reset
      if (!isInstructor && isJoined) {
        const myGuestId = sessionStorage.getItem('stagetrack_active_guest_id');
        const isStillActive = (data.activeUsers || []).some(u => u.uid === myGuestId);
        if (!isStillActive) {
          setIsJoined(false);
          setLobbyStatus('initial');
          setActiveGuestId(null);
          sessionStorage.removeItem('stagetrack_lobby_response');
          sessionStorage.removeItem('stagetrack_active_guest_id');
        }
      }

      // Update active users grid and map to participants list
      if (data.activeUsers) {
        setGcUsers(data.activeUsers);
        const mapped = data.activeUsers.map((u, index) => ({
          id: u.uid,
          name: u.name || 'Guest',
          role: u.role,
          isInstructor: !!u.isInstructor,
          color: u.color || `hsl(${(index * 137.5) % 360}, 70%, 60%)`,
          initial: u.name ? u.name[0].toUpperCase() : '?'
        }));
        setParticipants(mapped);
      }

      // Synchronize other states
      if (data.mediaUrl !== undefined) setMediaUrl(data.mediaUrl);
      if (data.mediaType !== undefined) setMediaType(data.mediaType);
      if (data.isDoodling !== undefined) setIsDoodling(data.isDoodling);
      if (data.drawingPaths !== undefined) setDrawingPaths(data.drawingPaths);
      if (data.curtainsOpen !== undefined) setCurtainsOpen(data.curtainsOpen);
      if (data.globalMute !== undefined) setGlobalMute(data.globalMute);
      if (data.globalPause !== undefined) setGlobalPause(data.globalPause);
      if (data.activeTheme !== undefined) setActiveTheme(data.activeTheme);
      if (data.stageTimer !== undefined) setStageTimer(data.stageTimer);
      if (data.guestStickers !== undefined) setGuestStickers(data.guestStickers);
      if (data.guestButtons !== undefined) setGuestButtons(data.guestButtons);
      if (data.messages !== undefined) setMessages(data.messages);
    });

    return () => unsubscribe();
  }, [sessionId, lobbyStatus, isJoined]);

  // --- HANDLERS TO UPDATE FIRESTORE AND LOCAL STATE ---

  const approveRequest = async () => {
    if (!pendingRequest || !sessionId) return;
    const activeId = pendingRequest.id || `active-joined-${Date.now()}`;
    const guestDisplayName = pendingRequest.name || `${pendingRequest.myName || 'Guest'}${pendingRequest.myLittleOne ? ' & ' + pendingRequest.myLittleOne : ''}`;

    try {
      const sessionRef = doc(db, "sessions", sessionId);
      const newGuestUser = {
        uid: activeId,
        role: 'student',
        isInstructor: false,
        name: guestDisplayName,
        joinedAt: Date.now(),
        slotIndex: gcUsers.length
      };

      // Add guest to active users, send accepted response, and clear request
      await updateDoc(sessionRef, {
        activeUsers: [...gcUsers.filter(u => u.uid !== activeId), newGuestUser],
        lobbyResponse: {
          approvedGuestId: activeId,
          guestName: guestDisplayName,
          status: 'approved'
        },
        lobbyRequest: null
      });

      if (pendingRequest.selectedIcon) {
        await updateDoc(sessionRef, {
          [`guestStickers.${activeId}`]: [
            {
              id: crypto.randomUUID(),
              name: pendingRequest.selectedIcon,
              position: 1
            }
          ]
        });
      }

      setPendingRequest(null);
    } catch (err) {
      console.error("Error approving request:", err);
    }
  };

  const denyRequest = async () => {
    if (!pendingRequest || !sessionId) return;
    const activeId = pendingRequest.id;

    try {
      const sessionRef = doc(db, "sessions", sessionId);
      await updateDoc(sessionRef, {
        lobbyResponse: {
          approvedGuestId: activeId,
          status: 'rejected'
        },
        lobbyRequest: null
      });
      setPendingRequest(null);
    } catch (err) {
      console.error("Error denying request:", err);
    }
  };

  const resetStudentState = async () => {
    if (!sessionId) return;
    try {
      const sessionRef = doc(db, "sessions", sessionId);
      await updateDoc(sessionRef, {
        lobbyRequest: null,
        lobbyResponse: null,
        activeUsers: [
          {
            uid: 'instructor-ic',
            role: 'ic',
            isInstructor: true,
            joinedAt: Date.now(),
            slotIndex: 0,
            name: 'Instructor'
          }
        ],
        guestStickers: {},
        guestButtons: {},
        messages: [],
        drawingPaths: [],
        curtainsOpen: true,
        globalMute: false,
        globalPause: false,
        stageTimer: null,
        mediaUrl: '/assets/MF_images/Music_Fun_with_my_Little_One.jpg',
        mediaType: 'image',
        isDoodling: false,
        activeTheme: 'default'
      });

      // Local resets
      setPendingRequest(null);
      setGuestStickers({});
      setGuestButtons({});
      setMessages([]);
      setDrawingPaths([]);
      setCurtainsOpen(true);
      setGlobalMute(false);
      setGlobalPause(false);
      setStageTimer(null);
      setMediaUrl('/assets/MF_images/Music_Fun_with_my_Little_One.jpg');
      setMediaType('image');
      setIsDoodling(false);
      setActiveTheme('default');
    } catch (err) {
      console.error("Error resetting student state:", err);
    }
  };

  const handleAddSticker = async (targetId, stickerName, isInstructor) => {
    if (!sessionId) return;
    try {
      const sessionRef = doc(db, "sessions", sessionId);
      let current = [...(guestStickers[targetId] || [])];

      if (stickerName === 'Confetti.svg') {
        const existingConfetti = current.findIndex(s => s.position === 'confetti');
        if (existingConfetti !== -1) {
          current.splice(existingConfetti, 1);
        } else {
          current.push({ id: crypto.randomUUID(), name: stickerName, position: 'confetti' });
        }
        await updateDoc(sessionRef, { [`guestStickers.${targetId}`]: current });
        return;
      }

      if (!isInstructor && stickerName === 'UNDO_LAST_PEO') {
        const lastPeoIndex = current.findLastIndex(s => typeof s.position === 'number');
        if (lastPeoIndex !== -1) {
          current.splice(lastPeoIndex, 1);
        }
        await updateDoc(sessionRef, { [`guestStickers.${targetId}`]: current });
        return;
      }

      if (isInstructor) {
        if (stickerName === 'UNDO_IC') {
          const icUndoSlots = ['tc', 'tl-c', 'tr-c', 'lc', 'rc-1', 'rc-2', 'birthday', 'crown'];
          const lastIcIndex = current.findLastIndex(s => icUndoSlots.includes(s.position));
          if (lastIcIndex !== -1) current.splice(lastIcIndex, 1);
          await updateDoc(sessionRef, { [`guestStickers.${targetId}`]: current });
          return;
        }

        if (stickerName === 'UNDO_ALL_IC') {
          const icUndoSlots = ['tc', 'tl-c', 'tr-c', 'lc', 'rc-1', 'rc-2', 'birthday', 'crown'];
          current = current.filter(s => !icUndoSlots.includes(s.position));
          await updateDoc(sessionRef, { [`guestStickers.${targetId}`]: current });
          return;
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
          await updateDoc(sessionRef, { [`guestStickers.${targetId}`]: current });
          return;
        }

        if (stickerName === 'RealCrown.png') {
          const existingCrownIndex = current.findIndex(s => s.position === 'crown');
          if (existingCrownIndex !== -1) {
            current.splice(existingCrownIndex, 1);
          } else {
            current = current.filter(s => s.position !== 'tc' && s.position !== 'crown');
            current.push({ id: crypto.randomUUID(), name: 'RealCrown.png', position: 'crown' });
          }
          await updateDoc(sessionRef, { [`guestStickers.${targetId}`]: current });
          return;
        }
      }

      const existingIndex = current.findIndex(s => s.name === stickerName);
      if (existingIndex !== -1) {
        current.splice(existingIndex, 1);
        await updateDoc(sessionRef, { [`guestStickers.${targetId}`]: current });
        return;
      }

      const hasSun = current.some(s => s.position === 'sun');
      const icSlots = hasSun 
        ? ['tc', 'tl-c', 'tr-c', 'lc']
        : ['tc', 'tl-c', 'tr-c', 'lc', 'rc-1', 'rc-2'];

      if (isInstructor) {
        const activeIcStickersCount = current.filter(s => icSlots.includes(s.position)).length;
        const rotations = [-15, 15, -7, 10, -12, 5, -5, 12, 0];
        const scales = [0.85, 1.15, 0.9, 1.1, 0.95, 1.05, 1.0];
        
        const randomAngle = (Math.random() - 0.5) * 8;
        const randomScale = (Math.random() - 0.5) * 0.1;
        
        const rotation = Number((rotations[activeIcStickersCount % rotations.length] + randomAngle).toFixed(1));
        const scale = Number((scales[activeIcStickersCount % scales.length] + randomScale).toFixed(2));

        const occupiedSlots = current.map(s => s.position);
        if (occupiedSlots.includes('crown')) occupiedSlots.push('tc');
        if (occupiedSlots.includes('birthday')) occupiedSlots.push('tr-c');
        const nextSlot = icSlots.find(slot => !occupiedSlots.includes(slot));

        if (nextSlot) {
          current.push({ id: crypto.randomUUID(), name: stickerName, position: nextSlot, rotation, scale });
        } else {
          const oldestIcIndex = current.findIndex(s => icSlots.includes(s.position));
          if (oldestIcIndex !== -1) {
            const removed = current[oldestIcIndex];
            current.splice(oldestIcIndex, 1);
            current.push({ id: crypto.randomUUID(), name: stickerName, position: removed.position, rotation, scale });
          }
        }
      } else {
        const isSun = stickerName === 'Sun with sunglasses.svg';
        if (isSun) {
          current = current.filter(s => s.position !== 'rc-1' && s.position !== 'rc-2');
          current.push({ id: crypto.randomUUID(), name: stickerName, position: 'sun' });
        } else {
          const allowedPositions = [1, 2, 3, 4];
          const normalStickers = current.filter(s => typeof s.position === 'number');

          if (normalStickers.length >= allowedPositions.length) {
            const oldestNormalIndex = current.findIndex(s => allowedPositions.includes(s.position));
            if (oldestNormalIndex !== -1) {
              current.splice(oldestNormalIndex, 1);
            }
          }

          const occupiedPositions = current.map(s => s.position);
          const nextPos = allowedPositions.find(p => !occupiedPositions.includes(p));
          current.push({ id: crypto.randomUUID(), name: stickerName, position: nextPos });
        }
      }

      await updateDoc(sessionRef, { [`guestStickers.${targetId}`]: current });
    } catch (err) {
      console.error("Error adding sticker:", err);
    }
  };

  const handleToggleGuestButton = async (guestId, btnName) => {
    if (!sessionId) return;
    try {
      const sessionRef = doc(db, "sessions", sessionId);
      const current = guestButtons[guestId] || { raiseHand: false, mute: false, chat: false };
      const nextVal = !current[btnName];
      const updated = { ...current, [btnName]: nextVal };
      
      if (btnName === 'raiseHand') {
        updated.raiseHandTime = nextVal ? Date.now() : null;
      }
      
      const filterKeys = ['greenFilter', 'blueFilter', 'purpleFilter', 'orangeFilter'];
      if (filterKeys.includes(btnName) && nextVal) {
        filterKeys.forEach(k => {
          if (k !== btnName) updated[k] = false;
        });
      }

      await updateDoc(sessionRef, { [`guestButtons.${guestId}`]: updated });
      
      if (btnName === 'mute' && nextVal === true) {
        if (activeGuestId === guestId) setActiveGuestId(null);
      }
    } catch (err) {
      console.error("Error toggling guest button:", err);
    }
  };

  const handleSendChatMessage = async (text) => {
    if (!sessionId) return;
    try {
      const sessionRef = doc(db, "sessions", sessionId);
      const isInstructor = sessionStorage.getItem('stagetrack_role') === 'instructor';
      const sender = isInstructor ? 'self' : 'other';
      const senderName = isInstructor ? 'Instructor' : (participants.find(p => p.id === activeGuestId)?.name || 'Guest');
      const newMsg = {
        id: crypto.randomUUID(),
        text,
        sender,
        senderName,
        status: 'public',
        timestamp: Date.now()
      };
      await updateDoc(sessionRef, {
        messages: arrayUnion(newMsg)
      });
    } catch (err) {
      console.error("Error sending chat message:", err);
    }
  };

  const handleModerateMessage = async (msgId, action) => {
    if (!sessionId) return;
    try {
      const sessionRef = doc(db, "sessions", sessionId);
      const updatedMessages = messages.map(msg => {
        if (msg.id === msgId) {
          if (action === 'show') return { ...msg, status: 'public' };
          if (action === 'ignore') return { ...msg, status: 'ignored' };
          if (action === 'reply_private') return { ...msg, status: 'private' };
        }
        return msg;
      });
      await updateDoc(sessionRef, { messages: updatedMessages });
      
      if (action === 'show' || action === 'reply_private') {
        setIsChatOpen(true);
      }
      
      if (action === 'reply_private') {
        setTimeout(async () => {
          const replyMsg = {
            id: crypto.randomUUID(),
            text: "I will answer that privately.",
            sender: "self",
            senderName: "Instructor",
            status: "private",
            timestamp: Date.now()
          };
          await updateDoc(sessionRef, {
            messages: arrayUnion(replyMsg)
          });
        }, 500);
      }
    } catch (err) {
      console.error("Error moderating message:", err);
    }
  };

  const sendWhisper = async (guestId, message) => {
    if (!sessionId) return;
    try {
      const sessionRef = doc(db, "sessions", sessionId);
      const current = guestButtons[guestId] || { raiseHand: false, mute: false, chat: false };
      const updated = {
        ...current,
        whisper: message,
        whisperTime: Date.now()
      };
      await updateDoc(sessionRef, { [`guestButtons.${guestId}`]: updated });
    } catch (err) {
      console.error("Error sending whisper:", err);
    }
  };

  const setMediaUpload = async (url, type) => {
    setIsDoodling(false);
    setMediaUrl(url);
    setMediaType(type);
    if (sessionId) {
      try {
        const sessionRef = doc(db, "sessions", sessionId);
        await updateDoc(sessionRef, {
          mediaUrl: url,
          mediaType: type,
          isDoodling: false
        });
      } catch (err) {
        console.error("Error setting media upload:", err);
      }
    }
  };

  const clearMedia = async () => {
    setMediaUrl(null);
    setMediaType(null);
    if (sessionId) {
      try {
        const sessionRef = doc(db, "sessions", sessionId);
        await updateDoc(sessionRef, {
          mediaUrl: null,
          mediaType: null
        });
      } catch (err) {
        console.error("Error clearing media:", err);
      }
    }
  };

  const handleSetIsDoodling = async (val) => {
    setIsDoodling(val);
    if (val) {
      setMediaUrl(null);
      setMediaType(null);
    }
    if (sessionId) {
      try {
        const sessionRef = doc(db, "sessions", sessionId);
        await updateDoc(sessionRef, {
          isDoodling: val,
          ...(val ? { mediaUrl: null, mediaType: null } : {})
        });
      } catch (err) {
        console.error("Error setting isDoodling:", err);
      }
    }
  };

  const handleSetDrawingPaths = async (valueOrFunc) => {
    let nextVal;
    if (typeof valueOrFunc === 'function') {
      nextVal = valueOrFunc(drawingPaths);
    } else {
      nextVal = valueOrFunc;
    }
    setDrawingPaths(nextVal);
    if (sessionId) {
      try {
        const sessionRef = doc(db, "sessions", sessionId);
        await updateDoc(sessionRef, { drawingPaths: nextVal });
      } catch (err) {
        console.error("Error syncing drawingPaths:", err);
      }
    }
  };

  const handleSetCurtainsOpen = async (val) => {
    setCurtainsOpen(val);
    if (sessionId) {
      try {
        const sessionRef = doc(db, "sessions", sessionId);
        await updateDoc(sessionRef, { curtainsOpen: val });
      } catch (err) {
        console.error("Error syncing curtainsOpen:", err);
      }
    }
  };

  const handleSetActiveTheme = async (val) => {
    setActiveTheme(val);
    if (sessionId) {
      try {
        const sessionRef = doc(db, "sessions", sessionId);
        await updateDoc(sessionRef, { activeTheme: val });
      } catch (err) {
        console.error("Error syncing activeTheme:", err);
      }
    }
  };

  const handleSetStageTimer = async (val) => {
    setStageTimer(val);
    if (sessionId) {
      try {
        const sessionRef = doc(db, "sessions", sessionId);
        await updateDoc(sessionRef, { stageTimer: val });
      } catch (err) {
        console.error("Error syncing stageTimer:", err);
      }
    }
  };

  const handleSetGuestStickers = async (valueOrFunc) => {
    let nextVal;
    if (typeof valueOrFunc === 'function') {
      nextVal = valueOrFunc(guestStickers);
    } else {
      nextVal = valueOrFunc;
    }
    setGuestStickers(nextVal);
    if (sessionId) {
      try {
        const sessionRef = doc(db, "sessions", sessionId);
        await updateDoc(sessionRef, { guestStickers: nextVal });
      } catch (err) {
        console.error("Error syncing guestStickers:", err);
      }
    }
  };

  const handleSetGuestButtons = async (valueOrFunc) => {
    let nextVal;
    if (typeof valueOrFunc === 'function') {
      nextVal = valueOrFunc(guestButtons);
    } else {
      nextVal = valueOrFunc;
    }
    setGuestButtons(nextVal);
    if (sessionId) {
      try {
        const sessionRef = doc(db, "sessions", sessionId);
        await updateDoc(sessionRef, { guestButtons: nextVal });
      } catch (err) {
        console.error("Error syncing guestButtons:", err);
      }
    }
  };

  const handleToggleInvite = async () => {
    if (!sessionId || isFirebaseUpdating) return;
    setIsFirebaseUpdating(true);

    try {
      const sessionRef = doc(db, "sessions", sessionId);
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0';
      const baseOrigin = isLocalhost ? 'https://stagetrack-v4-260430-461-92681.web.app' : window.location.origin;
      const inviteUrl = `${baseOrigin}/?session=${sessionId}&role=guest`;
      
      await updateDoc(sessionRef, { inviteActive: true });
      await navigator.clipboard.writeText(inviteUrl);
      
      console.log("Invite link copied to clipboard cleanly:", inviteUrl);
      alert(`Invite link copied to clipboard cleanly!\nURL: ${inviteUrl}`);
    } catch (err) {
      console.error("Invite toggle execution failed:", err);
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0';
      const baseOrigin = isLocalhost ? 'https://stagetrack-v4-260430-461-92681.web.app' : window.location.origin;
      const inviteUrl = `${baseOrigin}/?session=${sessionId}&role=guest`;
      prompt("Copy this link:", inviteUrl);
    } finally {
      setIsFirebaseUpdating(false);
    }
  };

  const value = {
    sessionId, setSessionId,
    isJoined, setIsJoined,
    lobbyStatus, setLobbyStatus,
    activeGuestId, setActiveGuestId,
    pendingRequest, setPendingRequest,
    gcUsers, setGcUsers,
    participants, setParticipants,
    drawingPaths, setDrawingPaths: handleSetDrawingPaths,
    mediaUrl, setMediaUrl,
    mediaType, setMediaType,
    isChatOpen, setIsChatOpen,
    isSidebarOpen, setIsSidebarOpen,
    activeToolbox, setActiveToolbox,
    guestStickers, setGuestStickers: handleSetGuestStickers,
    guestButtons, setGuestButtons: handleSetGuestButtons,
    stickerNudges, setStickerNudges,
    isDoodling, setIsDoodling: handleSetIsDoodling,
    globalMute, setGlobalMute,
    globalPause, setGlobalPause,
    messages, setMessages,
    activeTheme, setActiveTheme: handleSetActiveTheme,
    activeItoSection, setActiveItoSection,
    stageTimer, setStageTimer: handleSetStageTimer,
    curtainsOpen, setCurtainsOpen: handleSetCurtainsOpen,
    clearMedia,
    showInstructorStickers, setShowInstructorStickers,
    showStudentStickers, setShowStudentStickers,
    showStudentFilters, setShowStudentFilters,
    isPeoStickersOpen, setIsPeoStickersOpen,
    approveRequest,
    denyRequest,
    resetStudentState,
    handleAddSticker,
    handleToggleGuestButton,
    handleSendChatMessage,
    handleModerateMessage,
    sendWhisper,
    setMediaUpload,
    handleToggleInvite,
    isFirebaseUpdating
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export default AppProvider;