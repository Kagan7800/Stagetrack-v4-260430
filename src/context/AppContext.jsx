/* eslint-disable react-refresh/only-export-components */
// src/context/AppContext.jsx

import { createContext, useContext, useState, useEffect, useRef } from 'react';
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
    { id: 'instructor-ic', name: 'Instructor', isInstructor: true, color: '#3b82f6' },
    ...Array.from({ length: 7 }, (_, i) => ({
      id: `blank-${i + 1}`,
      name: `Blank ${i + 1}`,
      isBlank: true,
      blankIndex: i + 1
    }))
  ]);
  const [drawingPaths, setDrawingPaths] = useState([]);
  const isFirebaseDrawingUpdatingRef = useRef(false);
  const pendingDrawingPathsRef = useRef(null);
  const [mediaUrl, setMediaUrl] = useState('/assets/MF_images/Music_Fun_with_my_Little_One.jpg');
  const [mediaType, setMediaType] = useState('image');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeToolbox, setActiveToolbox] = useState(null);
  const [guestStickers, setGuestStickers] = useState({});
  const [guestButtons, setGuestButtons] = useState({});
  const [stickerNudges, setStickerNudges] = useState({});
  const [isDoodling, setIsDoodling] = useState(false);
  const [doodleColor, setDoodleColor] = useState('#ec4899');
  const [doodleBrushSize, setDoodleBrushSize] = useState(4);
  const [doodleTriggerAction, setDoodleTriggerAction] = useState(null);
  const [videoControlState, setVideoControlState] = useState({ isPlaying: true, isMuted: false, currentTime: 0, duration: 0 });
  const [videoTriggerAction, setVideoTriggerAction] = useState(null);
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
  const [activeCdTab, setActiveCdTab] = useState(null);
  const [isCountingDropdownOpen, setIsCountingDropdownOpen] = useState(false);
  const [isMakeMusicDropdownOpen, setIsMakeMusicDropdownOpen] = useState(false);

  // 1. EXTRACT SESSION ID & ENFORCE LOBBY STOPPER ON MOUNT
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paramSession = urlParams.get('session') || 'session-hm898y4nq';
    const roleParam = urlParams.get('role');

    const savedRole = sessionStorage.getItem('stagetrack_role');
    const isStudent = savedRole === 'student' || 
                      roleParam === 'guest' || 
                      roleParam === 'student' ||
                      (!savedRole && roleParam !== 'instructor');
    
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
          // Document already exists, make sure instructor is in activeUsers and reset any leftover drawing paths
          const data = docSnap.data();
          const hasInstructor = (data.activeUsers || []).some(u => u.uid === 'instructor-ic' || u.isInstructor);
          const instructorUser = {
            uid: 'instructor-ic',
            role: 'ic',
            isInstructor: true,
            joinedAt: Date.now(),
            slotIndex: 0,
            name: 'Instructor'
          };
          
          await updateDoc(sessionRef, {
            ...(!hasInstructor ? { activeUsers: [instructorUser, ...(data.activeUsers || [])] } : {}),
            drawingPaths: [],
            isDoodling: false
          });
          setDrawingPaths([]);
          setIsDoodling(false);
          console.log("Session document updated cleanly in Firestore (drawingPaths reset).");
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
      
      console.log("[Lobby Sync] Snapshot listener fired:", {
        isInstructor,
        lobbyStatus,
        isJoined,
        lobbyRequest: data.lobbyRequest,
        lobbyResponse: data.lobbyResponse
      });

      if (isInstructor) {
        if (data.lobbyRequest) {
          console.log("[Lobby Sync] Instructor detected pending request:", data.lobbyRequest);
          setPendingRequest(data.lobbyRequest);
        } else {
          setPendingRequest(null);
        }
      }

      // Guest side: Auto-restore pending status on reload/reconnect if lobbyRequest matches local ID
      if (!isInstructor && lobbyStatus === 'initial') {
        const myGuestId = sessionStorage.getItem('stagetrack_active_guest_id');
        console.log("[Lobby Sync] Auto-restore check:", { myGuestId, lobbyRequestExists: !!data.lobbyRequest, requestId: data.lobbyRequest?.id });
        if (myGuestId && data.lobbyRequest && data.lobbyRequest.id === myGuestId) {
          console.log("[Lobby Sync] Restoring pending lobby status...");
          setLobbyStatus('pending');
        }
      }

      // Guest side: Catch approval from Instructor
      if (!isInstructor && lobbyStatus === 'pending') {
        const myGuestId = sessionStorage.getItem('stagetrack_active_guest_id');
        const approvedId = data.lobbyResponse?.approvedGuestId;
        const isMatch = approvedId === myGuestId;

        console.log("[Lobby Sync] Guest approval matching check:", { myGuestId, approvedId, isMatch, responseStatus: data.lobbyResponse?.status });

        if (data.lobbyResponse && isMatch) {
          const status = data.lobbyResponse.status;
          if (status === 'approved' || status === 'accepted') {
            console.log("[Lobby Sync] MATCH APPROVED! Admitting guest into session...");
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
            console.log("[Lobby Sync] Guest REJECTED/DENIED.");
            setLobbyStatus('rejected');
            setIsJoined(false);
          }
        }
      }

      // Guest auto-disconnect check: reset client if guest kicked/room reset
      if (!isInstructor && isJoined) {
        const myGuestId = sessionStorage.getItem('stagetrack_active_guest_id');
        const isStillActive = (data.activeUsers || []).some(u => u.uid === myGuestId);
        console.log("[Lobby Sync] Guest auto-disconnect validation:", { myGuestId, isStillActive, activeUsers: data.activeUsers });
        if (!isStillActive) {
          console.log("[Lobby Sync] Guest is no longer in activeUsers list. Disconnecting...");
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
        
        // Find instructor
        const dbInstructor = data.activeUsers.find(u => u.isInstructor || u.role === 'ic' || u.uid === 'instructor-ic');
        const instructorUser = {
          id: dbInstructor?.uid || 'instructor-ic',
          name: dbInstructor?.name || 'Instructor',
          role: 'ic',
          isInstructor: true,
          color: dbInstructor?.color || '#3b82f6',
          initial: 'I'
        };

        // Find joined guests (non-instructors)
        const joinedGuests = data.activeUsers.filter(u => u.uid !== instructorUser.id && !u.isInstructor && u.role !== 'ic');

        // Map to 7 slots (indices 1 to 7)
        const guestSlots = Array.from({ length: 7 }, (_, i) => {
          const slotIndex = i + 1;
          const guest = joinedGuests.find(g => g.slotIndex === slotIndex) || joinedGuests.find(g => !g.slotIndex && joinedGuests.indexOf(g) === i);
          if (guest) {
            return {
              id: guest.uid,
              name: guest.name || 'Guest',
              role: 'student',
              isInstructor: false,
              color: guest.color || `hsl(${(slotIndex * 137.5) % 360}, 70%, 60%)`,
              initial: guest.name ? guest.name[0].toUpperCase() : '?',
              slotIndex: slotIndex,
              selectedBorder: guest.selectedBorder || '',
              selectedIcon: guest.selectedIcon || null
            };
          } else {
            return {
              id: `blank-${slotIndex}`,
              name: `Blank ${slotIndex}`,
              isBlank: true,
              blankIndex: slotIndex
            };
          }
        });

        setParticipants([instructorUser, ...guestSlots]);
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
      if (data.isChatOpen !== undefined) setIsChatOpen(Boolean(data.isChatOpen));
      if (data.messages !== undefined && Array.isArray(data.messages)) {
        setMessages(prev => {
          const firestoreMsgs = data.messages || [];
          const firestoreIds = new Set(firestoreMsgs.map(m => m.id));
          // Keep local recent messages not yet reflected in Firestore
          const localRecent = (prev || []).filter(m => m && m.id && !firestoreIds.has(m.id) && (Date.now() - (m.timestamp || 0) < 60000));
          return [...firestoreMsgs, ...localRecent].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        });
      }
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
      
      // Find the first available slotIndex between 1 and 7
      const occupiedSlots = gcUsers.map(u => u.slotIndex).filter(idx => idx !== undefined && idx !== null && idx !== 0);
      let nextSlotIndex = 1;
      for (let i = 1; i <= 7; i++) {
        if (!occupiedSlots.includes(i)) {
          nextSlotIndex = i;
          break;
        }
      }

      const newGuestUser = {
        uid: activeId,
        role: 'student',
        isInstructor: false,
        name: guestDisplayName,
        joinedAt: Date.now(),
        slotIndex: nextSlotIndex,
        color: pendingRequest.color || pendingRequest.selectedBorder || `hsl(${(nextSlotIndex * 137.5) % 360}, 70%, 60%)`,
        selectedBorder: pendingRequest.selectedBorder || '',
        selectedIcon: pendingRequest.selectedIcon || null,
        vibeChips: pendingRequest.vibeChips || []
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
      const genId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      if (stickerName === 'Confetti.svg') {
        const existingConfetti = current.findIndex(s => s.position === 'confetti');
        if (existingConfetti !== -1) {
          current.splice(existingConfetti, 1);
        } else {
          current.push({ id: genId(), name: stickerName, position: 'confetti' });
        }
        setGuestStickers(prev => ({ ...prev, [targetId]: current }));
        await updateDoc(sessionRef, { [`guestStickers.${targetId}`]: current });
        return;
      }

      if (!isInstructor && stickerName === 'UNDO_LAST_PEO') {
        const lastPeoIndex = current.findLastIndex(s => typeof s.position === 'number');
        if (lastPeoIndex !== -1) {
          current.splice(lastPeoIndex, 1);
        }
        setGuestStickers(prev => ({ ...prev, [targetId]: current }));
        await updateDoc(sessionRef, { [`guestStickers.${targetId}`]: current });
        return;
      }

      if (isInstructor) {
        if (stickerName === 'UNDO_IC') {
          const icUndoSlots = ['tc', 'tl-c', 'tr-c', 'lc', 'rc-1', 'rc-2', 'birthday', 'crown'];
          const lastIcIndex = current.findLastIndex(s => icUndoSlots.includes(s.position));
          if (lastIcIndex !== -1) current.splice(lastIcIndex, 1);
          setGuestStickers(prev => ({ ...prev, [targetId]: current }));
          await updateDoc(sessionRef, { [`guestStickers.${targetId}`]: current });
          return;
        }

        if (stickerName === 'UNDO_ALL_IC') {
          const icUndoSlots = ['tc', 'tl-c', 'tr-c', 'lc', 'rc-1', 'rc-2', 'birthday', 'crown'];
          current = current.filter(s => !icUndoSlots.includes(s.position));
          setGuestStickers(prev => ({ ...prev, [targetId]: current }));
          await updateDoc(sessionRef, { [`guestStickers.${targetId}`]: current });
          return;
        }

        if (stickerName === 'Happy_Birthday.png') {
          const hasHb = current.some(s => s.position === 'birthday');
          if (hasHb) {
            current = current.filter(s => s.position !== 'birthday' && s.position !== 'crown');
          } else {
            current = current.filter(s => s.position !== 2 && s.position !== 'tr-c' && s.position !== 'tc' && s.position !== 'birthday' && s.position !== 'crown');
            current.push({ id: genId(), name: 'Happy_Birthday.png', position: 'birthday' });
            current.push({ id: genId(), name: 'RealCrown.png', position: 'crown' });
          }
          setGuestStickers(prev => ({ ...prev, [targetId]: current }));
          await updateDoc(sessionRef, { [`guestStickers.${targetId}`]: current });
          return;
        }

        if (stickerName === 'RealCrown.png') {
          const existingCrownIndex = current.findIndex(s => s.position === 'crown');
          if (existingCrownIndex !== -1) {
            current.splice(existingCrownIndex, 1);
          } else {
            current = current.filter(s => s.position !== 'tc' && s.position !== 'crown');
            current.push({ id: genId(), name: 'RealCrown.png', position: 'crown' });
          }
          setGuestStickers(prev => ({ ...prev, [targetId]: current }));
          await updateDoc(sessionRef, { [`guestStickers.${targetId}`]: current });
          return;
        }
      }

      const existingIndex = current.findIndex(s => s.name === stickerName);
      if (existingIndex !== -1) {
        current.splice(existingIndex, 1);
        setGuestStickers(prev => ({ ...prev, [targetId]: current }));
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
          current.push({ id: genId(), name: stickerName, position: nextSlot, rotation, scale });
        } else {
          const oldestIcIndex = current.findIndex(s => icSlots.includes(s.position));
          if (oldestIcIndex !== -1) {
            const removed = current[oldestIcIndex];
            current.splice(oldestIcIndex, 1);
            current.push({ id: genId(), name: stickerName, position: removed.position, rotation, scale });
          }
        }
      } else {
        const isSun = stickerName === 'Sun with sunglasses.svg';
        if (isSun) {
          current = current.filter(s => s.position !== 'rc-1' && s.position !== 'rc-2');
          current.push({ id: genId(), name: stickerName, position: 'sun' });
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
          current.push({ id: genId(), name: stickerName, position: nextPos });
        }
      }

      setGuestStickers(prev => ({ ...prev, [targetId]: current }));
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

  const handleToggleChat = async (forceState) => {
    const role = sessionStorage.getItem('stagetrack_role');
    const isInstructor = role !== 'student';
    if (!isInstructor) {
      console.warn("Permission denied: Only instructors can open or close the chat.");
      return;
    }
    const nextVal = forceState !== undefined ? forceState : !isChatOpen;
    setIsChatOpen(nextVal);
    if (sessionId) {
      try {
        const sessionRef = doc(db, "sessions", sessionId);
        await updateDoc(sessionRef, { isChatOpen: nextVal });
      } catch (err) {
        console.error("Error syncing chat visibility:", err);
      }
    }
  };

  const handleSendChatMessage = async (text) => {
    if (!text || !text.trim()) return;
    const role = sessionStorage.getItem('stagetrack_role');
    const isInstructor = role !== 'student';
    
    let senderName = 'Guest';
    if (isInstructor) {
      senderName = 'Ms. Rivera';
    } else {
      const myName = sessionStorage.getItem('stagetrack_username');
      const guestP = participants.find(p => p.id && String(p.id).startsWith('active-joined')) ||
                     participants.find(p => !p.isInstructor && !p.isBlank);
      senderName = myName || guestP?.name || 'Parent / Student';
    }

    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: senderName,
      text: text.trim(),
      time,
      timestamp: Date.now(),
      role: isInstructor ? 'instructor' : 'student'
    };

    // 1. Immediately update local state
    setMessages(prev => [...(prev || []), newMsg]);

    // 2. Persist to Firestore session with merge
    if (sessionId) {
      try {
        const sessionRef = doc(db, "sessions", sessionId);
        await setDoc(sessionRef, {
          messages: arrayUnion(newMsg)
        }, { merge: true });
      } catch (err) {
        console.error("Error sending chat message:", err);
      }
    }
  };

  const handleDeleteChatMessage = async (msgId) => {
    const role = sessionStorage.getItem('stagetrack_role');
    const isInstructor = role !== 'student';
    if (!isInstructor) {
      console.warn("Permission denied: Only instructors can delete messages.");
      return;
    }

    const updated = (messages || []).filter(m => m && m.id !== msgId);
    setMessages(updated);

    if (sessionId) {
      try {
        const sessionRef = doc(db, "sessions", sessionId);
        await updateDoc(sessionRef, { messages: updated });
      } catch (err) {
        console.error("Error deleting chat message:", err);
      }
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
    
    if (!sessionId) return;

    if (isFirebaseDrawingUpdatingRef.current) {
      pendingDrawingPathsRef.current = nextVal;
      return;
    }

    isFirebaseDrawingUpdatingRef.current = true;

    const syncToFirebase = async (val) => {
      try {
        const sessionRef = doc(db, "sessions", sessionId);
        await updateDoc(sessionRef, { drawingPaths: val });
      } catch (err) {
        console.error("Error syncing drawingPaths:", err);
      } finally {
        isFirebaseDrawingUpdatingRef.current = false;
        if (pendingDrawingPathsRef.current !== null) {
          const nextValToSync = pendingDrawingPathsRef.current;
          pendingDrawingPathsRef.current = null;
          isFirebaseDrawingUpdatingRef.current = true;
          syncToFirebase(nextValToSync);
        }
      }
    };

    syncToFirebase(nextVal);
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
    doodleColor, setDoodleColor,
    doodleBrushSize, setDoodleBrushSize,
    doodleTriggerAction, setDoodleTriggerAction,
    videoControlState, setVideoControlState,
    videoTriggerAction, setVideoTriggerAction,
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
    handleToggleChat,
    handleSendChatMessage,
    handleDeleteChatMessage,
    sendWhisper,
    setMediaUpload,
    handleToggleInvite,
    isFirebaseUpdating,
    activeCdTab, setActiveCdTab,
    isCountingDropdownOpen, setIsCountingDropdownOpen,
    isMakeMusicDropdownOpen, setIsMakeMusicDropdownOpen
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