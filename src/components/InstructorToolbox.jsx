import { useAppContext } from '../context/AppContext';
import { X } from 'lucide-react';

export default function InstructorToolbox() {
  const {
    setIsSidebarOpen,
    activeItoSection, setActiveItoSection,
    setShowInstructorStickers,
    setShowStudentStickers,
    setShowStudentFilters,
    activeTheme,
    setActiveToolbox,
    setIsPeoStickersOpen
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
            style={{ color: '#ffffff', borderColor: '#ffffff' }}
          >
            <div className="icon-wrapper">
              <X size={20} />
            </div>
            <span className="btn-label" style={{ color: '#ffffff', fontSize: '1.1rem', fontWeight: 'bold', whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.2' }}>Close<br/>ITO</span>
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



          
        </div>
      </div>
    </div>
  );
}
