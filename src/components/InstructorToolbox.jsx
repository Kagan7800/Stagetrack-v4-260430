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
    <div className="glass-panel sidebar instructor-toolbox" style={{ height: '100%', borderRight: 'none', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <div className="toolbox-header" style={{ minHeight: '52px', borderBottom: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '12px 16px' }}>
          <span style={{ color: '#ffffff', textShadow: themeTextShadow, fontSize: '0.8rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'normal', overflow: 'hidden', display: 'block', width: '100%', lineHeight: '1.2', textAlign: 'center' }} title="Session Content">
            Session<br />Content
          </span>
          <div style={{ color: '#ffffff', fontSize: '0.65rem', fontWeight: '600', marginTop: '4px', textTransform: 'none', letterSpacing: 'normal' }}>
            {new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}
          </div>
      </div>

      <div className="toolbox-content" style={{ padding: '16px', flex: 1, overflowY: 'auto', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      </div>

      <div className="toolbox-footer" style={{ padding: '0px 16px 25px 16px', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', background: 'rgba(11, 25, 46, 0.9)' }}>
        <button 
          className={`ito-section-btn ${activeItoSection === 'studio' ? 'active' : ''}`}
          onClick={() => handleSectionClick('studio')}
          style={{ 
            width: '100%', 
            padding: '10px 12px', 
            marginBottom: '0px',
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

        <div style={{ width: '100%', height: '1px', background: 'var(--glass-border)', opacity: 0.5, marginTop: '4.5px', marginBottom: '4.5px' }} />

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
            padding: '0px',
            marginTop: '0px'
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
          title="Close Session Content"
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
  );
}
