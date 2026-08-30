import { useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { syncWheelBeatToFirebase } from '../firebase';

const isRhythmWheelActivity = (url) => {
  return url && url.includes('1,2,3,4_wheel');
};

export function CentralStageDeck({ mediaUrl, onClick }) {
  return (
    <div 
      className="central-stage-deck" 
      onClick={onClick}
      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div className="central-stage-inner" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', maxWidth: 'none', gap: 0 }}>
        {/* Centered wheel frame */}
        <div className="central-stage-column" style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <iframe 
            src={mediaUrl} 
            title="Rhythm Wheel"
            style={{ 
              height: '100%', 
              aspectRatio: '1 / 1', 
              maxWidth: '100%', 
              maxHeight: '100%', 
              border: 'none', 
              background: 'transparent',
              overflow: 'visible'
            }}
            allowtransparency="true"
          />
        </div>
      </div>
    </div>
  );
}

export default function PresentationContainer({ 
  isDoodling,
  mediaUrl, 
  mediaType: propMediaType
}) {
  const { 
    mediaType: globalMediaType, sessionId, rhythmBeat, curtainsOpen,
    setVideoControlState, videoTriggerAction, setVideoTriggerAction
  } = useAppContext();
  const mediaType = propMediaType || globalMediaType;

  const videoRef = useRef(null);

  const displayUrl = mediaUrl || '/assets/MF_images/Music_Fun_with_my_Little_One.jpg';
  const displayType = mediaUrl ? mediaType : (mediaType === 'metronome' ? 'metronome' : 'image');

  const renderedUrl = displayUrl;
  const renderedType = displayType;
  const isCurtainOpen = Boolean(curtainsOpen);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'RHYTHM_UPDATE') {
        // Sync to Firebase if we are the instructor client
        const isInstructorClient = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('stagetrack_role') !== 'student' : true;
        if (isInstructorClient && sessionId) {
          syncWheelBeatToFirebase(event.data.currentStep, sessionId);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [sessionId]);

  // Student Sync: Snap iframe step when Firestore updates
  useEffect(() => {
    const isStudent = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('stagetrack_role') === 'student' : false;
    if (isStudent && rhythmBeat !== undefined) {
      const iframe = document.querySelector('.media-container iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'SET_STEP', step: rhythmBeat }, '*');
      }
    }
  }, [rhythmBeat]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.key === ' ' || e.keyCode === 32) {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
        
        if (displayUrl && (displayUrl.includes('1,2,3,4_click.html') || displayUrl.includes('mode=spacebar'))) {
          e.preventDefault();
          const iframe = document.querySelector('.media-container iframe');
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'ADVANCE_STEP' }, '*');
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayUrl]);

  const handleDeckClick = () => {
    if (isDoodling) return;
    if (displayUrl && (displayUrl.includes('1,2,3,4_click.html') || displayUrl.includes('mode=spacebar'))) {
      const iframe = document.querySelector('.media-container iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'ADVANCE_STEP' }, '*');
      }
    }
  };



  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (videoTriggerAction === 'play') {
      video.play();
      setVideoControlState(prev => ({ ...prev, isPlaying: true }));
      setVideoTriggerAction(null);
    } else if (videoTriggerAction === 'pause') {
      video.pause();
      setVideoControlState(prev => ({ ...prev, isPlaying: false }));
      setVideoTriggerAction(null);
    } else if (videoTriggerAction === 'mute') {
      video.muted = true;
      setVideoControlState(prev => ({ ...prev, isMuted: true }));
      setVideoTriggerAction(null);
    } else if (videoTriggerAction === 'unmute') {
      video.muted = false;
      setVideoControlState(prev => ({ ...prev, isMuted: false }));
      setVideoTriggerAction(null);
    } else if (videoTriggerAction === 'restart') {
      video.currentTime = 0;
      video.play();
      setVideoControlState(prev => ({ ...prev, isPlaying: true, currentTime: 0 }));
      setVideoTriggerAction(null);
    }
  }, [videoTriggerAction, setVideoControlState, setVideoTriggerAction]);



  return (
    <div 
      className="pc-canvas-area" 
      onClick={handleDeckClick} 
      style={{ 
        position: 'relative', 
        overflow: 'hidden', 
        width: '100%', 
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
        {/* 1. Underlying Stage Scenes */}
        <div className="scene-content" style={{ width: '100%', height: '100%' }}>
          {/* Media Layer */}
          {(renderedUrl || renderedType === 'metronome') && (
            <div 
              className={`media-container ${renderedType === 'video' ? 'video-active' : ''} ${renderedType === 'image' ? 'instructor-view-tile' : ''}`}
              style={isRhythmWheelActivity(renderedUrl, renderedType) ? {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                height: '100%',
                maxWidth: '100%',
                maxHeight: '100%',
                borderRadius: 0,
                zIndex: 20,
                background: 'transparent',
                overflow: 'visible'
              } : renderedType === 'iframe' ? { 
                position: 'absolute',
                top: '50%',
                left: 0,
                transform: 'translateY(-50%)',
                width: '100%', 
                height: 0,
                paddingBottom: '56.25%',
                maxWidth: '100%', 
                maxHeight: 'none', 
                borderRadius: 0, 
                zIndex: 20
              } : renderedType === 'video' || renderedType === 'metronome' ? {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                height: '100%',
                maxWidth: '100%',
                maxHeight: '100%',
                borderRadius: 0,
                zIndex: 20
              } : {}}
            >

              {isRhythmWheelActivity(renderedUrl, renderedType) ? (
                <CentralStageDeck 
                  mediaUrl={renderedUrl} 
                  onClick={handleDeckClick}
                />
              ) : renderedType === 'video' ? (
                <video 
                  ref={videoRef}
                  src={renderedUrl} 
                  controls 
                  autoPlay 
                  onTimeUpdate={(e) => {
                    setVideoControlState(prev => ({
                      ...prev,
                      currentTime: e.currentTarget.currentTime,
                      duration: e.currentTarget.duration || 0
                    }));
                  }}
                  onPlay={() => setVideoControlState(prev => ({ ...prev, isPlaying: true }))}
                  onPause={() => setVideoControlState(prev => ({ ...prev, isPlaying: false }))}
                />
              ) : renderedType === 'iframe' ? (
                <iframe 
                  src={renderedUrl} 
                  allowtransparency="true"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', background: 'transparent', backgroundColor: 'transparent' }} 
                  allowFullScreen 
                  loading="eager"
                  fetchPriority="high"
                />
              ) : renderedType === 'metronome' ? (
                null
              ) : (
                <img 
                  src={renderedUrl} 
                  alt="Uploaded Media" 
                />
              )}
            </div>
          )}
        </div>

        {/* 3. Static Curtain Overlay */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: isCurtainOpen ? 'none' : 'auto',
            zIndex: 9998,
            overflow: 'hidden'
          }}
        >
          {/* LEFT CURTAIN PANEL */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: '50.2%',
              transition: 'transform 1.2s cubic-bezier(0.25, 1, 0.5, 1)',
              transformOrigin: 'left',
              willChange: 'transform',
              transform: isCurtainOpen ? 'translateX(-100%)' : 'translateX(0)',
              overflow: 'hidden',
              backgroundImage: 'url(/assets/pc_container/Stage_curtains.png)',
              backgroundPosition: 'left center',
              backgroundSize: '200% 100%',
              backgroundRepeat: 'no-repeat'
            }}
          />

          {/* RIGHT CURTAIN PANEL */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              height: '100%',
              width: '50.2%',
              transition: 'transform 1.2s cubic-bezier(0.25, 1, 0.5, 1)',
              transformOrigin: 'right',
              willChange: 'transform',
              transform: isCurtainOpen ? 'translateX(100%)' : 'translateX(0)',
              overflow: 'hidden',
              backgroundImage: 'url(/assets/pc_container/Stage_curtains.png)',
              backgroundPosition: 'right center',
              backgroundSize: '200% 100%',
              backgroundRepeat: 'no-repeat'
            }}
          />
        </div>
      </div>
  );
}