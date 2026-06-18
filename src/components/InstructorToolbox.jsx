import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function InstructorToolbox() {
  const {
    setIsSidebarOpen,
    activeItoSection, setActiveItoSection,
    setShowInstructorStickers,
    setShowStudentStickers,
    setShowStudentFilters,
    activeTheme,
    setActiveToolbox,
    setIsPeoStickersOpen,
    setMediaUpload,
    mediaUrl
  } = useAppContext();

  const isInstructorClient = sessionStorage.getItem('stagetrack_role') !== 'student';

  const isSor = activeTheme === 'sor';
  const themeTextShadow = isSor ? '0 0 8px rgba(239, 68, 68, 0.18)' : '0 0 8px rgba(59, 130, 246, 0.18)';

  const handleSectionClick = (section) => {
    if (!isInstructorClient) return;
    
    const isNowActive = activeItoSection !== section;
    setActiveItoSection(isNowActive ? section : null);
    
    setShowStudentStickers(false);
    setShowStudentFilters(false);
    setShowInstructorStickers(false);
    setIsPeoStickersOpen(false);
  };

  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const [isMakeMusicDropdownOpen, setIsMakeMusicDropdownOpen] = useState(false);
  const [isCountingDropdownOpen, setIsCountingDropdownOpen] = useState(false);
  const [bpmValue, setBpmValue] = useState(() => {
    const saved = sessionStorage.getItem('last_counting_bpm');
    return saved ? parseInt(saved) : 60;
  });

  const dropdownItemStyle = {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '0.85rem',
    textAlign: 'left',
    padding: '6px 8px',
    cursor: 'pointer',
    borderRadius: '4px',
    transition: 'all 0.2s ease',
    width: '100%',
    fontFamily: 'inherit',
    boxSizing: 'border-box'
  };

  const getDropdownItemStyle = (isActive) => {
    return {
      ...dropdownItemStyle,
      color: isActive ? '#ffe600' : 'rgba(255, 255, 255, 0.8)',
      fontWeight: isActive ? 'bold' : 'normal'
    };
  };

  const handleItemMouseEnter = (e) => {
    const isActive = e.currentTarget.getAttribute('data-active') === 'true';
    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
    e.currentTarget.style.color = isActive ? '#ffe600' : '#ffffff';
    e.currentTarget.style.paddingLeft = '12px';
  };

  const handleItemMouseLeave = (e) => {
    const isActive = e.currentTarget.getAttribute('data-active') === 'true';
    e.currentTarget.style.background = 'transparent';
    e.currentTarget.style.color = isActive ? '#ffe600' : 'rgba(255, 255, 255, 0.8)';
    e.currentTarget.style.paddingLeft = '8px';
  };

  if (!isInstructorClient) return null;

  return (
    <div className="glass-panel sidebar instructor-toolbox" style={{ height: '100%', borderRight: 'none', position: 'relative' }}>
      <div className="toolbox-header" style={{ minHeight: '52px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 16px' }}>
          <span style={{ color: '#ffffff', textShadow: themeTextShadow, fontSize: '0.8rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'normal', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', width: '100%', lineHeight: '1.2', textAlign: 'center' }} title="Class Content">
            Class<br />Content
          </span>
      </div>

      <div className="toolbox-content" style={{ padding: '16px', height: 'calc(100% - 52px)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', textAlign: 'center', marginBottom: '12px', fontWeight: '600', letterSpacing: '0.03em' }}>
          Today's Class {new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}
        </div>

        {/* Thin line under date */}
        <div style={{ width: '100%', height: '1px', background: 'var(--glass-border)', margin: '4px 0 12px 0', opacity: 0.5 }} />

        {/* 1st Class Dropdown */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box', marginBottom: '16px' }}>
          <button 
            onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              color: isClassDropdownOpen ? '#ffe600' : 'white',
              fontSize: '0.95rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'inherit'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          >
            <span>1st Class</span>
            {isClassDropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {isClassDropdownOpen && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              marginTop: '8px',
              paddingLeft: '8px',
              borderLeft: '1px solid var(--glass-border)',
              boxSizing: 'border-box'
            }}>
              <button
                onClick={() => setMediaUpload('/assets/MF_images/Music_Fun_with_my_Little_One.jpg', 'image')}
                style={getDropdownItemStyle(mediaUrl === '/assets/MF_images/Music_Fun_with_my_Little_One.jpg')}
                data-active={mediaUrl === '/assets/MF_images/Music_Fun_with_my_Little_One.jpg' ? "true" : "false"}
                onMouseEnter={handleItemMouseEnter}
                onMouseLeave={handleItemMouseLeave}
              >
                Welcome page
              </button>
              <button
                onClick={() => setMediaUpload('/assets/MF_images/banjo.mp4', 'video')}
                style={getDropdownItemStyle(mediaUrl === '/assets/MF_images/banjo.mp4')}
                data-active={mediaUrl === '/assets/MF_images/banjo.mp4' ? "true" : "false"}
                onMouseEnter={handleItemMouseEnter}
                onMouseLeave={handleItemMouseLeave}
              >
                Intro video
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box' }}>
                <button
                  onClick={() => {
                    const nextOpenState = !isCountingDropdownOpen;
                    setIsCountingDropdownOpen(nextOpenState);
                    if (nextOpenState) {
                      setMediaUpload('/assets/Activities/1,2,3,4_wheel.html', 'iframe');
                    }
                  }}
                  style={{
                    ...dropdownItemStyle,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    color: isCountingDropdownOpen ? '#ffe600' : 'rgba(255, 255, 255, 0.8)',
                    fontWeight: isCountingDropdownOpen ? 'bold' : 'normal'
                  }}
                  data-active={isCountingDropdownOpen ? "true" : "false"}
                  onMouseEnter={handleItemMouseEnter}
                  onMouseLeave={handleItemMouseLeave}
                >
                  <span>Counting Activity</span>
                  {isCountingDropdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {isCountingDropdownOpen && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    marginTop: '4px',
                    paddingLeft: '12px',
                    borderLeft: '1px solid var(--glass-border)',
                    boxSizing: 'border-box'
                  }}>
                    <button
                      onClick={() => setMediaUpload('/assets/Activities/1,2,3,4_wheel.html?mode=spacebar', 'iframe')}
                      style={getDropdownItemStyle(mediaUrl === '/assets/Activities/1,2,3,4_wheel.html?mode=spacebar')}
                      data-active={mediaUrl === '/assets/Activities/1,2,3,4_wheel.html?mode=spacebar' ? "true" : "false"}
                      onMouseEnter={handleItemMouseEnter}
                      onMouseLeave={handleItemMouseLeave}
                    >
                      Spacebar
                    </button>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                      <button
                        onClick={() => setMediaUpload(`/assets/Activities/1,2,3,4_wheel.html?mode=bpm&bpm=${bpmValue}`, 'iframe')}
                        style={getDropdownItemStyle(mediaUrl && mediaUrl.includes('mode=bpm'))}
                        data-active={(mediaUrl && mediaUrl.includes('mode=bpm')) ? "true" : "false"}
                        onMouseEnter={handleItemMouseEnter}
                        onMouseLeave={handleItemMouseLeave}
                      >
                        BPM
                      </button>
                      {mediaUrl && mediaUrl.includes('mode=bpm') && (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'flex-start',
                          alignItems: 'center',
                          padding: '4px 8px',
                          marginTop: '2px',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}>
                          <input
                            type="number"
                            value={bpmValue}
                            min="1"
                            max="300"
                            placeholder="#"
                            onChange={(e) => {
                              const val = Math.max(1, Math.min(300, parseInt(e.target.value) || 60));
                              setBpmValue(val);
                              sessionStorage.setItem('last_counting_bpm', val.toString());
                              setMediaUpload(`/assets/Activities/1,2,3,4_wheel.html?mode=bpm&bpm=${val}`, 'iframe');
                              const iframe = document.querySelector('.central-stage-deck iframe');
                              if (iframe && iframe.contentWindow) {
                                iframe.contentWindow.postMessage({ type: 'SET_BPM', bpm: val }, '*');
                              }
                            }}
                            style={{
                              width: '60px',
                              background: 'rgba(0, 0, 0, 0.3)',
                              border: '1px solid var(--glass-border)',
                              borderRadius: '4px',
                              color: '#fff',
                              fontSize: '0.8rem',
                              padding: '2px 4px',
                              outline: 'none',
                              textAlign: 'center'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box' }}>
                <button
                  onClick={() => setIsMakeMusicDropdownOpen(!isMakeMusicDropdownOpen)}
                  style={{
                    ...dropdownItemStyle,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    color: isMakeMusicDropdownOpen ? '#ffe600' : 'rgba(255, 255, 255, 0.8)',
                    fontWeight: isMakeMusicDropdownOpen ? 'bold' : 'normal'
                  }}
                  data-active={isMakeMusicDropdownOpen ? "true" : "false"}
                  onMouseEnter={handleItemMouseEnter}
                  onMouseLeave={handleItemMouseLeave}
                >
                  <span>Make Music</span>
                  {isMakeMusicDropdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {isMakeMusicDropdownOpen && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    marginTop: '4px',
                    paddingLeft: '12px',
                    borderLeft: '1px solid var(--glass-border)',
                    boxSizing: 'border-box'
                  }}>
                    <button
                      onClick={() => setMediaUpload('/assets/class_1/household_Items.png', 'image')}
                      style={getDropdownItemStyle(mediaUrl === '/assets/class_1/household_Items.png')}
                      data-active={mediaUrl === '/assets/class_1/household_Items.png' ? "true" : "false"}
                      onMouseEnter={handleItemMouseEnter}
                      onMouseLeave={handleItemMouseLeave}
                    >
                      Household Items
                    </button>
                    <button
                      onClick={() => setMediaUpload('/assets/Activities/1,2,3,4_click.html', 'iframe')}
                      style={getDropdownItemStyle(mediaUrl === '/assets/Activities/1,2,3,4_click.html')}
                      data-active={mediaUrl === '/assets/Activities/1,2,3,4_click.html' ? "true" : "false"}
                      onMouseEnter={handleItemMouseEnter}
                      onMouseLeave={handleItemMouseLeave}
                    >
                      Interactive Game
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setMediaUpload('/assets/Activities/Class_all/goodbye.jpg', 'image')}
                style={getDropdownItemStyle(mediaUrl === '/assets/Activities/Class_all/goodbye.jpg')}
                data-active={mediaUrl === '/assets/Activities/Class_all/goodbye.jpg' ? "true" : "false"}
                onMouseEnter={handleItemMouseEnter}
                onMouseLeave={handleItemMouseLeave}
              >
                Closing page
              </button>
            </div>
          )}
        </div>
        <div className="toolbox-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
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
              lineHeight: '1.2',
              marginTop: 'auto',
              position: 'relative',
              top: '15px'
            }}
          >
            Studio Controls
          </button>

          <div style={{ width: '100%', height: '1px', background: 'var(--glass-border)', margin: '4px 0', opacity: 0.5, position: 'relative', top: '0px' }} />

          <button 
            onClick={() => {
              setActiveToolbox(null);
              setIsSidebarOpen(false);
              setActiveItoSection(null);
            }}
            style={{ 
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              padding: '4px 0',
              position: 'relative',
              top: '-15px'
            }}
            onMouseEnter={(e) => {
              const img = e.currentTarget.querySelector('img');
              if (img) {
                img.style.filter = 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.6))';
                img.style.transform = 'scaleX(-1) scale(1.1)';
              }
            }}
            onMouseLeave={(e) => {
              const img = e.currentTarget.querySelector('img');
              if (img) {
                img.style.filter = 'none';
                img.style.transform = 'scaleX(-1) scale(1)';
              }
            }}
            title="Close Class Content"
          >
            <img 
              src="/assets/Lobby/Arrow.svg" 
              alt="Close" 
              style={{ 
                width: '40px', 
                height: '30px',
                transform: 'scaleX(-1)',
                transition: 'filter 0.2s ease, transform 0.2s ease',
                objectFit: 'contain'
              }} 
            />
          </button>
        </div>
      </div>
    </div>
  );
}
