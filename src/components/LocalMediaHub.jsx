import { useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';

export default function LocalMediaHub() {
  const {
    localFiles,
    currentLocalFileIndex,
    localVideoPlaying,
    setLocalVideoPlaying,
    localVideoVolume,
    localVideoMuted,
    localVideoPlaybackRate,
    setLocalVideoCurrentTime,
    setLocalVideoDuration,
    setLocalVideoResolution,
    localVideoSeekTime,
    localImageScale,
    setLocalImageScale,
    localImageOffset,
    setLocalImageOffset,
    addLocalFiles
  } = useAppContext();

  const activeFile = localFiles[currentLocalFileIndex] || null;
  const videoRef = useRef(null);

  // Sync video element play/pause
  useEffect(() => {
    if (!videoRef.current) return;
    if (localVideoPlaying) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [localVideoPlaying]);

  // Sync volume
  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.volume = localVideoVolume;
  }, [localVideoVolume]);

  // Sync mute
  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = localVideoMuted;
  }, [localVideoMuted]);

  // Sync speed
  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = localVideoPlaybackRate;
  }, [localVideoPlaybackRate]);

  // Sync scrubbing time
  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = localVideoSeekTime.time;
  }, [localVideoSeekTime]);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Auto-reload on active file change
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      if (localVideoPlaying) {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [currentLocalFileIndex, localVideoPlaying]);

  if (!activeFile) {
    return (
      <div 
        style={{ 
          width: '100%', 
          height: '100%', 
          backgroundColor: '#05070c'
        }}
      />
    );
  }

  // Capturing drag-to-pan / scrollwheel-zoom on stage (updates context)
  const handleImageWheel = (e) => {
    e.preventDefault();
    setLocalImageScale((prev) => {
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      const nextScale = Math.max(1, Math.min(5, prev + delta));
      if (nextScale === 1) {
        setLocalImageOffset({ x: 0, y: 0 });
      }
      return nextScale;
    });
  };

  const handleImageMouseDown = (e) => {
    if (localImageScale <= 1) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - localImageOffset.x, y: e.clientY - localImageOffset.y };
  };

  const handleImageMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    setLocalImageOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleImageMouseUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div 
      style={{ 
        width: '100%', 
        height: '100%', 
        backgroundColor: '#000', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        overflow: 'hidden',
        position: 'relative'
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          addLocalFiles(e.dataTransfer.files);
        }
      }}
    >
      {activeFile.type === 'image' ? (
        <div
          onWheel={handleImageWheel}
          onMouseDown={handleImageMouseDown}
          onMouseMove={handleImageMouseMove}
          onMouseUp={handleImageMouseUp}
          onMouseLeave={handleImageMouseUp}
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            cursor: localImageScale > 1 ? 'grab' : 'default'
          }}
        >
          <img
            src={activeFile.objectUrl}
            alt={activeFile.name}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              pointerEvents: 'none',
              transform: `translate(${localImageOffset.x}px, ${localImageOffset.y}px) scale(${localImageScale})`,
              userSelect: 'none',
              transition: 'none'
            }}
          />
        </div>
      ) : (
        <div
          onWheel={handleImageWheel}
          onMouseDown={handleImageMouseDown}
          onMouseMove={handleImageMouseMove}
          onMouseUp={handleImageMouseUp}
          onMouseLeave={handleImageMouseUp}
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            cursor: localImageScale > 1 ? 'grab' : 'default'
          }}
        >
          <video
            ref={videoRef}
            src={activeFile.objectUrl}
            onPlay={() => setLocalVideoPlaying(true)}
            onPause={() => setLocalVideoPlaying(false)}
            onTimeUpdate={() => {
              if (videoRef.current) {
                setLocalVideoCurrentTime(videoRef.current.currentTime);
              }
            }}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                setLocalVideoDuration(videoRef.current.duration);
                setLocalVideoResolution(`${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
              }
            }}
            autoPlay
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              transform: `translate(${localImageOffset.x}px, ${localImageOffset.y}px) scale(${localImageScale})`,
              transition: 'none'
            }}
          />
        </div>
      )}
    </div>
  );
}
