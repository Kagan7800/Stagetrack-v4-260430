

export function BanjoMascotState({ currentBeat, isPlaying, style }) {
  // Map current beat directly to BP-compliant psychological & theatrical actions
  const getMascotPose = () => {
    if (!isPlaying) return { pose: 'idle', label: 'Banjo is waiting for the music!' };
    
    switch (currentBeat) {
      case 1:
        /* Psychologist: No clap on 1 to preserve child's cognitive anchor.
           Disney: Anticipation frame-ears perked up, hands listening. */
        return {
          pose: 'listening-ears',
          animationClass: 'animate-anticipation',
          effect: null
        };
      case 2:
      case 3:
      case 4:
        /* Clapping synchronously on active beats to force motor skill mirroring */
        return {
          pose: 'clapping-hands',
          animationClass: 'animate-strike-pop',
          effect: '🌟' // Visual burst asset trigger
        };
      default:
        return { pose: 'idle', animationClass: '', effect: null };
    }
  };

  const { pose, animationClass, effect } = getMascotPose();

  return (
    <div className={`banjo-container ${animationClass}`} style={style}>
      {/* Structural placement left of the PC wheel card */}
      <div className={`banjo-character sprite-${pose}`}>
        <video 
          className="banjo-giraffe-img" 
          style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '16px' }}
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="/assets/MF_images/banjo.webm" type="video/webm" />
          <source src="/assets/MF_images/banjo.mp4" type="video/mp4" />
        </video>
        {effect && <span className="visual-rhythm-burst">{effect}</span>}
      </div>
    </div>
  );
}
