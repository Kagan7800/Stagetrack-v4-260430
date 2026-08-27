import { Eraser, Undo2, Redo2, Trash2, Play, Pause, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function DoodleChoiceBar() {
  const {
    isDoodling,
    doodleColor, setDoodleColor,
    doodleBrushSize, setDoodleBrushSize,
    setDoodleTriggerAction,
    drawingPaths,
    mediaType, mediaUrl,
    videoControlState, setVideoTriggerAction
  } = useAppContext();

  const isVideoActive = mediaType === 'video' || (mediaUrl && mediaUrl.match(/\.(mp4|webm|ogg|mov)$/i));

  if (!isDoodling && !isVideoActive) return null;

  const popularColors = [
    { name: 'Pink', value: '#ec4899' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Yellow', value: '#f59e0b' },
    { name: 'Green', value: '#10b981' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'White', value: '#ffffff' },
    { name: 'Black', value: '#000000' }
  ];

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div 
      className="doodle-choice-bar-container studio-controls-styled"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '6px',
        padding: '6px 10px',
        background: 'linear-gradient(135deg, rgba(58, 45, 187, 0.45), rgba(122, 79, 217, 0.45))',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        borderRadius: '10px',
        boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.35)',
        color: 'white',
        fontFamily: "'Georgia', serif",
        zIndex: 40,
        transition: 'all 0.3s ease',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        flexShrink: 0,
        flexGrow: 0,
        overflow: 'hidden'
      }}
    >
      {/* VIDEO CONTROLS (Row if video active) */}
      {isVideoActive && (
        <div 
          style={{ 
            display: 'flex', 
            flexDirection: 'row', 
            flexWrap: 'wrap', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px', 
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}
        >
          <button
            onClick={() => setVideoTriggerAction(videoControlState.isPlaying ? 'pause' : 'play')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
            title={videoControlState.isPlaying ? 'Pause Video' : 'Play Video'}
          >
            {videoControlState.isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{videoControlState.isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={() => setVideoTriggerAction(videoControlState.isMuted ? 'unmute' : 'mute')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px 8px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              cursor: 'pointer'
            }}
            title={videoControlState.isMuted ? 'Unmute' : 'Mute'}
          >
            {videoControlState.isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>

          <button
            onClick={() => setVideoTriggerAction('restart')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px 8px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              cursor: 'pointer'
            }}
            title="Restart Video"
          >
            <RotateCcw size={14} />
          </button>

          <span style={{ fontSize: '0.7rem', color: '#e2e8f0', fontWeight: 'bold' }}>
            {formatTime(videoControlState.currentTime)} / {formatTime(videoControlState.duration)}
          </span>
        </div>
      )}

      {/* DIVIDER IF BOTH VIDEO & DOODLING ACTIVE */}
      {isVideoActive && isDoodling && (
        <div style={{ width: '90%', height: '1px', background: 'rgba(255, 255, 255, 0.2)', margin: '2px 0' }}></div>
      )}

      {/* DOODLING CONTROLS (Controlled Rows with flex-wrap) */}
      {isDoodling && (
        <>
          {/* ROW 1: Color Dots Palette + Eraser */}
          <div 
            style={{ 
              display: 'flex', 
              flexDirection: 'row', 
              flexWrap: 'wrap', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '6px', 
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {popularColors.map((color) => (
                <button
                  key={color.value}
                  className={`color-dot ${doodleColor === color.value ? 'active' : ''}`}
                  style={{ 
                    backgroundColor: color.value,
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: doodleColor === color.value ? '2px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: doodleColor === color.value ? '0 0 8px ' + color.value : 'none',
                    transform: doodleColor === color.value ? 'scale(1.15)' : 'scale(1)',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                  onClick={() => setDoodleColor(color.value)}
                  title={color.name}
                />
              ))}
            </div>

            <button
              className={`eraser-btn ${doodleColor === 'eraser' ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3px 8px',
                borderRadius: '6px',
                background: doodleColor === 'eraser' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                border: doodleColor === 'eraser' ? '1.5px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.2)',
                color: doodleColor === 'eraser' ? '#ef4444' : '#ffffff',
                cursor: 'pointer',
                flexShrink: 0
              }}
              onClick={() => setDoodleColor('eraser')}
              title="Eraser"
            >
              <Eraser size={14} />
            </button>
          </div>

          {/* ROW 2: Brush Size Slider + Undo / Redo / Clear Actions */}
          <div 
            style={{ 
              display: 'flex', 
              flexDirection: 'row', 
              flexWrap: 'wrap', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px', 
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }} title={`Brush Size: ${doodleBrushSize}px`}>
              <input 
                type="range"
                min="2"
                max="20"
                value={doodleBrushSize}
                onChange={(e) => setDoodleBrushSize(parseInt(e.target.value, 10))}
                style={{ width: '48px', cursor: 'pointer', accentColor: '#ffd700' }}
              />
              <span style={{ color: '#e2e8f0', fontSize: '0.7rem', fontWeight: 'bold' }}>{doodleBrushSize}px</span>
            </div>

            <div style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.2)', flexShrink: 0 }}></div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <button 
                onClick={() => setDoodleTriggerAction('undo')} 
                disabled={!drawingPaths || drawingPaths.length === 0} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '3px 6px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  cursor: (!drawingPaths || drawingPaths.length === 0) ? 'not-allowed' : 'pointer',
                  opacity: (!drawingPaths || drawingPaths.length === 0) ? 0.4 : 1
                }}
                title="Undo"
              >
                <Undo2 size={13} />
              </button>
              
              <button 
                onClick={() => setDoodleTriggerAction('redo')} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '3px 6px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
                title="Redo"
              >
                <Redo2 size={13} />
              </button>
              
              <button 
                onClick={() => setDoodleTriggerAction('clear')} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '3px 7px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#f87171',
                  cursor: 'pointer'
                }}
                title="Clear Canvas"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
