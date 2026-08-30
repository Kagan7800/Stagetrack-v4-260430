// src/components/RoomVibeWidget.jsx
// Instructor Dashboard Widget: "Today's Room Vibe"
// Gives live instructor glanceable situational awareness of room energy and milestones.

import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { X, UserCheck, Smile } from 'lucide-react';
import './RoomVibeWidget.css';

const VIBE_DEFINITIONS = [
  { id: 'high_energy', emoji: '⚡', line1: 'High', line2: 'Energy', label: '⚡ High Energy', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.35)' },
  { id: 'low_energy', emoji: '🔋', line1: 'Tired /', line2: 'Low', label: '🔋 Tired / Low', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.35)' },
  { id: 'gentle_warmup', emoji: '🥺', line1: 'Needing', line2: 'Warm-Up', label: '🥺 Needing Warm-Up', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.35)' },
  { id: 'birthday', emoji: '🎉', line1: 'Birthday', line2: 'Today!', label: '🎉 Birthday Today!', color: '#facc15', bg: 'rgba(250, 204, 21, 0.15)', border: 'rgba(250, 204, 21, 0.35)' },
  { id: 'under_weather', emoji: '🤒', line1: 'Not Feeling', line2: 'Well', label: '🤒 Not Feeling Well', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.35)' },
  { id: 'focused', emoji: '🧩', line1: 'Deeply', line2: 'Focused', label: '🧩 Deeply Focused', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)' }
];

export default function RoomVibeWidget({ isOpen, onClose }) {
  const { pendingRequest, gcUsers, approveRequest } = useAppContext();

  // Active students in room (excluding instructor)
  const activeStudents = useMemo(() => {
    return (gcUsers || []).filter(u => !u.isInstructor && u.role !== 'ic' && u.uid !== 'instructor-ic');
  }, [gcUsers]);

  // Aggregate vibe statistics across lobby waiting & active students
  const vibeStats = useMemo(() => {
    const counts = {};
    VIBE_DEFINITIONS.forEach(v => { counts[v.id] = 0; });

    // Count pending
    if (pendingRequest && Array.isArray(pendingRequest.vibeChips)) {
      pendingRequest.vibeChips.forEach(chipId => {
        if (counts[chipId] !== undefined) counts[chipId]++;
      });
    }

    // Count active
    activeStudents.forEach(student => {
      if (Array.isArray(student.vibeChips)) {
        student.vibeChips.forEach(chipId => {
          if (counts[chipId] !== undefined) counts[chipId]++;
        });
      }
    });

    return counts;
  }, [pendingRequest, activeStudents]);

  const totalKidsCount = (pendingRequest ? 1 : 0) + activeStudents.length;

  if (!isOpen) return null;

  return (
    <div className="room-vibe-overlay" onClick={onClose}>
      <div className="room-vibe-drawer" onClick={e => e.stopPropagation()}>
        
        {/* Drawer Header */}
        <div className="vibe-drawer-header">
          <div className="vibe-header-title">
            <div className="vibe-title-row">
              <h2>Today's Room Vibe</h2>
              <span className="vibe-live-badge">
                <span className="vibe-live-pulse-dot" />
                Live
              </span>
            </div>
            <p className="vibe-subtitle">
              {totalKidsCount === 0 ? 'No children checked in yet' : `${totalKidsCount} child${totalKidsCount > 1 ? 'ren' : ''} checked in`}
            </p>
          </div>

          <button className="vibe-close-btn" onClick={onClose} title="Close drawer">
            <X size={18} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="vibe-drawer-body">
          
          {/* Summary Section / Room Energy Breakdown Grid */}
          <div className="vibe-summary-section">
            <h4 className="vibe-section-label">Room Energy Breakdown</h4>
            <div className="vibe-pc-grid">
              {VIBE_DEFINITIONS.map(def => {
                const count = vibeStats[def.id] || 0;
                return (
                  <div key={def.id} className={`vibe-grid-cell ${count > 0 ? 'active' : ''}`}>
                    <span className="vibe-cell-emoji">{def.emoji}</span>
                    <span className="vibe-cell-label">
                      <span>{def.line1}</span>
                      <span>{def.line2}</span>
                    </span>
                    {count > 0 && (
                      <span className="vibe-cell-count-badge">{count}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Roster Section */}
          <div className="vibe-roster-section">
            <h4 className="vibe-section-label">Child Roster &amp; States</h4>

            {/* PENDING LOBBY GUEST */}
            {pendingRequest && (
              <div className="vibe-guest-card pending">
                <div className="vibe-guest-top">
                  <div className="vibe-guest-identity">
                    <div className="vibe-guest-avatar" style={{ borderColor: pendingRequest.color || '#facc15' }}>
                      {pendingRequest.selectedIcon ? (
                        <img
                          src={`/assets/svg_stickers/${pendingRequest.selectedIcon}`}
                          alt=""
                          style={{ width: '28px', height: '28px', objectFit: 'contain' }}
                        />
                      ) : (
                        <span>{pendingRequest.myLittleOne?.[0] || 'C'}</span>
                      )}
                    </div>
                    <div className="vibe-guest-names">
                      <span className="vibe-guest-child-name">
                        {pendingRequest.myLittleOne || 'Little One'}
                      </span>
                      <span className="vibe-guest-adult-name">
                        Parent: {pendingRequest.myName || 'Adult'}
                      </span>
                    </div>
                  </div>
                  <span className="vibe-status-tag waiting">Lobby Waiting</span>
                </div>

                {/* Vibe Chips */}
                <div className="vibe-guest-chips">
                  {Array.isArray(pendingRequest.vibeChips) && pendingRequest.vibeChips.length > 0 ? (
                    pendingRequest.vibeChips.map(chipId => {
                      const def = VIBE_DEFINITIONS.find(v => v.id === chipId);
                      if (!def) return null;
                      return (
                        <span
                          key={chipId}
                          className="vibe-guest-chip-pill"
                          style={{ color: def.color, background: def.bg, borderColor: def.border }}
                        >
                          {def.label}
                        </span>
                      );
                    })
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#64748b', italic: 'true' }}>
                      No energy chips selected
                    </span>
                  )}
                </div>

                {/* Quick Admit Button */}
                <button
                  className="vibe-admit-btn"
                  onClick={async () => {
                    await approveRequest();
                  }}
                >
                  <UserCheck size={16} />
                  <span>Admit {pendingRequest.myLittleOne || 'Guest'} into Session</span>
                </button>
              </div>
            )}

            {/* ACTIVE IN-ROOM STUDENTS */}
            {activeStudents.length > 0 && (
              activeStudents.map(student => (
                <div key={student.uid || student.id} className="vibe-guest-card">
                  <div className="vibe-guest-top">
                    <div className="vibe-guest-identity">
                      <div className="vibe-guest-avatar" style={{ borderColor: student.color || '#3b82f6' }}>
                        {student.selectedIcon ? (
                          <img
                            src={`/assets/svg_stickers/${student.selectedIcon}`}
                            alt=""
                            style={{ width: '28px', height: '28px', objectFit: 'contain' }}
                          />
                        ) : (
                          <span>{student.name?.[0] || 'C'}</span>
                        )}
                      </div>
                      <div className="vibe-guest-names">
                        <span className="vibe-guest-child-name">{student.name}</span>
                        <span className="vibe-guest-adult-name">
                          Slot #{student.slotIndex || 1} · In Session
                        </span>
                      </div>
                    </div>
                    <span className="vibe-status-tag active">In Session</span>
                  </div>

                  {/* Vibe Chips */}
                  <div className="vibe-guest-chips">
                    {Array.isArray(student.vibeChips) && student.vibeChips.length > 0 ? (
                      student.vibeChips.map(chipId => {
                        const def = VIBE_DEFINITIONS.find(v => v.id === chipId);
                        if (!def) return null;
                        return (
                          <span
                            key={chipId}
                            className="vibe-guest-chip-pill"
                            style={{ color: def.color, background: def.bg, borderColor: def.border }}
                          >
                            {def.label}
                          </span>
                        );
                      })
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Standard Check-In
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Empty state */}
            {!pendingRequest && activeStudents.length === 0 && (
              <div className="vibe-empty-state">
                <Smile size={32} color="#475569" />
                <p>Waiting for children to check in from the lobby…</p>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
