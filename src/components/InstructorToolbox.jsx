import { useAppContext } from '../context/AppContext';
import { X } from 'lucide-react';

export default function InstructorToolbox() {
  const {
    setIsSidebarOpen,
    activeItoSection, setActiveItoSection,
    showInstructorStickers, setShowInstructorStickers,
    setShowStudentStickers,
    setShowStudentFilters,
    activeTheme, setActiveTheme,
    resetStudentState,
    setActiveToolbox,
    activeGuestId,
    spotlightGuestId, setSpotlightGuestId,
    isPeoStickersOpen, setIsPeoStickersOpen,
    stageTimer, setStageTimer
  } = useAppContext();

  const isInstructorClient = sessionStorage.getItem('stagetrack_role') !== 'student';

  const isSor = activeTheme === 'sor';
  const themeTextShadow = isSor ? '0 0 8px rgba(239, 68, 68, 0.18)' : '0 0 8px rgba(59, 130, 246, 0.18)';

  const handleSectionClick = (section) => {
    if (!isInstructorClient) return;
    
    if (section === 'stickers') {
      const isAlreadyOpen = showInstructorStickers || activeItoSection === 'stickers' || isPeoStickersOpen;
      if (isAlreadyOpen) {
        setShowInstructorStickers(false);
        setIsPeoStickersOpen(false);
        setActiveItoSection(null);
      } else {
        setShowInstructorStickers(true);
        setActiveItoSection('stickers');
      }
      setShowStudentStickers(false);
      setShowStudentFilters(false);
      return;
    }

    const isNowActive = activeItoSection !== section;
    setActiveItoSection(isNowActive ? section : null);
    
    setShowStudentStickers(false);
    setShowStudentFilters(false);
    setShowInstructorStickers(false);
    setIsPeoStickersOpen(false);
  };

  if (!isInstructorClient) return null;

  return (
    <div className="glass-panel sidebar instructor-toolbox" style={{ height: '100%', borderRight: 'none', position: 'relative' }}>
      <div className="toolbox-header" style={{ minHeight: '52px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 16px' }}>
          <span style={{ color: '#ffffff', textShadow: themeTextShadow, fontSize: '0.8rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'normal', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', width: '100%', lineHeight: '1.2', textAlign: 'center' }} title="Instructor Tools">
            Instructor<br />Tools
          </span>
      </div>

      <div className="toolbox-content" style={{ padding: '16px' }}>
        <div className="toolbox-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button 
            className="ito-icon-btn"
            onClick={() => {
              setActiveToolbox(null);
              setIsSidebarOpen(false);
              setActiveItoSection(null);
            }}
            style={{ color: '#ef4444', borderColor: '#ef4444' }}
          >
            <div className="icon-wrapper">
              <X size={20} />
            </div>
            <span className="btn-label" style={{ color: '#ef4444', fontSize: '1.1rem', fontWeight: 'bold', whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.2' }}>Close<br/>Controls</span>
          </button>
          
          <button 
            className={`ito-section-btn ${activeItoSection === 'invite' ? 'active' : ''}`}
            onClick={() => handleSectionClick('invite')}
            style={{ 
              width: '100%', 
              padding: '12px', 
              background: activeItoSection === 'invite' ? 'rgba(255,255,255,0.15)' : 'transparent', 
              color: '#ffffff', 
              border: `1px solid ${activeItoSection === 'invite' ? 'rgba(255,255,255,0.4)' : 'transparent'}`,
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: activeItoSection === 'invite' ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'center',
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              lineHeight: '1.2'
            }}
          >
            Invite
          </button>

          {activeItoSection === 'invite' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '-8px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
              <button 
                onClick={async () => {
                  const params = new URLSearchParams(window.location.search);
                  const sid = params.get('session');
                  if (!sid) {
                    alert("No active session to invite to.");
                    return;
                  }
                  const inviteUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?session=' + sid;
                  try {
                    await navigator.clipboard.writeText(inviteUrl);
                    alert("Invite link copied to clipboard!");
                  } catch {
                    prompt("Copy this link:", inviteUrl);
                  }
                }}
                style={{ padding: '10px', fontSize: '0.9rem', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Copy Invite Link
              </button>
            </div>
          )}

          <button 
            className={`ito-section-btn ${spotlightGuestId === activeGuestId && activeGuestId ? 'active' : ''}`}
            onClick={() => {
              if (activeGuestId) {
                setSpotlightGuestId(spotlightGuestId === activeGuestId ? null : activeGuestId);
              }
            }}
            style={{ 
              width: '100%', 
              padding: '12px', 
              background: (spotlightGuestId === activeGuestId && activeGuestId) ? 'rgba(250,204,21,0.2)' : 'transparent', 
              color: (spotlightGuestId === activeGuestId && activeGuestId) ? '#facc15' : '#ffffff', 
              border: `1px solid ${(spotlightGuestId === activeGuestId && activeGuestId) ? 'rgba(250,204,21,0.5)' : 'transparent'}`,
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: (spotlightGuestId === activeGuestId && activeGuestId) ? 'bold' : 'normal',
              cursor: activeGuestId ? 'pointer' : 'not-allowed',
              opacity: activeGuestId ? 1 : 0.5,
              transition: 'all 0.2s',
              textAlign: 'center',
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              lineHeight: '1.2'
            }}
            disabled={!activeGuestId}
            title={activeGuestId ? "Spotlight the selected student" : "Select a student to spotlight"}
          >
            Spotlight
          </button>

          <button 
            className={`ito-section-btn ${activeItoSection === 'studio' ? 'active' : ''}`}
            onClick={() => handleSectionClick('studio')}
            style={{ 
              width: '100%', 
              padding: '12px', 
              background: activeItoSection === 'studio' ? 'rgba(255,255,255,0.15)' : 'transparent', 
              color: '#ffffff', 
              border: `1px solid ${activeItoSection === 'studio' ? 'rgba(255,255,255,0.4)' : 'transparent'}`,
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: activeItoSection === 'studio' ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'center',
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              lineHeight: '1.2'
            }}
          >
            Studio Controls
          </button>


          <button 
            className={`ito-section-btn ${(activeItoSection === 'stickers' || showInstructorStickers) ? 'active' : ''}`}
            onClick={() => handleSectionClick('stickers')}
            style={{ 
              width: '100%', 
              padding: '12px', 
              background: (activeItoSection === 'stickers' || showInstructorStickers) ? 'rgba(255,255,255,0.15)' : 'transparent', 
              color: '#ffffff', 
              border: `1px solid ${(activeItoSection === 'stickers' || showInstructorStickers) ? 'rgba(255,255,255,0.4)' : 'transparent'}`,
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: (activeItoSection === 'stickers' || showInstructorStickers) ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'center',
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              lineHeight: '1.2'
            }}
          >
            Stickers
          </button>
          
          <button 
            className={`ito-section-btn ${activeItoSection === 'timer' ? 'active' : ''}`}
            onClick={() => handleSectionClick('timer')}
            style={{ 
              width: '100%', 
              padding: '12px', 
              background: activeItoSection === 'timer' ? 'rgba(255,255,255,0.15)' : 'transparent', 
              color: '#ffffff', 
              border: `1px solid ${activeItoSection === 'timer' ? 'rgba(255,255,255,0.4)' : 'transparent'}`,
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: activeItoSection === 'timer' ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'center',
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              lineHeight: '1.2'
            }}
          >
            Stage Timer
          </button>

          {activeItoSection === 'timer' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '-8px', padding: '16px', background: 'rgba(0,0,0,0.35)', borderRadius: '8px', border: '1px solid var(--glass-border)', boxSizing: 'border-box', width: '100%' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {[60, 120, 300, 600].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => {
                      const endTime = Date.now() + sec * 1000;
                      setStageTimer({ endTime, duration: sec, isRunning: true });
                    }}
                    style={{
                      flex: '1 0 40%',
                      padding: '8px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    {sec / 60} Min
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <input
                  type="number"
                  placeholder="Min"
                  min="0"
                  max="60"
                  id="timer-custom-min"
                  style={{ width: '48px', padding: '6px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.4)', color: 'white', fontSize: '0.85rem', textAlign: 'center' }}
                />
                <span style={{ color: 'white', fontSize: '0.85rem' }}>:</span>
                <input
                  type="number"
                  placeholder="Sec"
                  min="0"
                  max="59"
                  id="timer-custom-sec"
                  style={{ width: '48px', padding: '6px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.4)', color: 'white', fontSize: '0.85rem', textAlign: 'center' }}
                />
                <button
                  onClick={() => {
                    const minVal = parseInt(document.getElementById('timer-custom-min')?.value || '0', 10);
                    const secVal = parseInt(document.getElementById('timer-custom-sec')?.value || '0', 10);
                    const totalSec = minVal * 60 + secVal;
                    if (totalSec > 0) {
                      const endTime = Date.now() + totalSec * 1000;
                      setStageTimer({ endTime, duration: totalSec, isRunning: true });
                    }
                  }}
                  style={{ padding: '6px 10px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
                >
                  Set
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
                <div style={{ fontSize: '0.85rem', color: stageTimer.isRunning ? '#22c55e' : stageTimer.duration > 0 ? '#fbbf24' : '#94a3b8', fontWeight: 'bold' }}>
                  {stageTimer.isRunning ? 'Timer Running' : stageTimer.duration > 0 ? 'Timer Paused' : 'No Active Timer'}
                </div>

                <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'center' }}>
                  {stageTimer.isRunning ? (
                    <button
                      onClick={() => {
                        const remaining = Math.max(0, Math.round((stageTimer.endTime - Date.now()) / 1000));
                        setStageTimer({ ...stageTimer, duration: remaining, isRunning: false });
                      }}
                      style={{ flex: 1, padding: '6px', background: '#fbbf24', color: '#000000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
                    >
                      Pause
                    </button>
                  ) : (
                    stageTimer.duration > 0 && (
                      <button
                        onClick={() => {
                          const endTime = Date.now() + stageTimer.duration * 1000;
                          setStageTimer({ ...stageTimer, endTime, isRunning: true });
                        }}
                        style={{ flex: 1, padding: '6px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
                      >
                        Resume
                      </button>
                    )
                  )}

                  {(stageTimer.isRunning || stageTimer.duration > 0) && (
                    <button
                      onClick={() => {
                        setStageTimer({ endTime: null, duration: 0, isRunning: false });
                      }}
                      style={{ flex: 1, padding: '6px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <button 
            className={`ito-section-btn ${activeItoSection === 'system' ? 'active' : ''}`}
            onClick={() => handleSectionClick('system')}
            style={{ 
              width: '100%', 
              padding: '12px', 
              background: activeItoSection === 'system' ? 'rgba(255,255,255,0.15)' : 'transparent', 
              color: '#ffffff', 
              border: `1px solid ${activeItoSection === 'system' ? 'rgba(255,255,255,0.4)' : 'transparent'}`,
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: activeItoSection === 'system' ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'center',
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              lineHeight: '1.2'
            }}
          >
            System & Theme
          </button>

          {activeItoSection === 'system' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '-8px', padding: '16px', background: 'rgba(0,0,0,0.35)', borderRadius: '8px', border: '1px solid var(--glass-border)', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select Theme</span>
                <div className="ito-theme-grid" style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <button 
                    className={`gb-btn ${activeTheme === 'music-fun' ? 'active active-music' : ''}`}
                    onClick={() => setActiveTheme('music-fun')}
                    style={{ flex: 1, padding: '8px', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    Music Theme
                  </button>
                  <button 
                    className={`gb-btn ${activeTheme === 'sor' ? 'active active-sor' : ''}`}
                    onClick={() => setActiveTheme('sor')}
                    style={{ flex: 1, padding: '8px', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    SOR Theme
                  </button>
                </div>
              </div>
              
              <div style={{ width: '100%', height: '1px', background: 'var(--glass-border)', margin: '4px 0' }} />
              
              <button 
                className="gb-btn"
                onClick={resetStudentState}
                style={{ width: '100%', padding: '10px', fontSize: '0.9rem', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white', fontWeight: 'bold' }}
              >
                Reset Room
              </button>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
