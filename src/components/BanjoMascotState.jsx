

export function BanjoMascotState({ currentBeat, isPlaying }) {
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
    <div className={`banjo-container ${animationClass}`}>
      {/* Structural placement left of the PC wheel card */}
      <div className={`banjo-character sprite-${pose}`}>
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Left Floppy Ear */}
          <path className="ear left-ear" d="M 50,70 C 10,70 10,130 45,110 Z" fill="#78350f" />
          {/* Right Floppy Ear */}
          <path className="ear right-ear" d="M 150,70 C 190,70 190,130 155,110 Z" fill="#78350f" />
          {/* Body / Neck Collar */}
          <path d="M 75,145 L 125,145 L 140,180 L 60,180 Z" fill="#b91c1c" />
          {/* Main Dog Head Circle */}
          <circle cx="100" cy="100" r="50" fill="#f59e0b" />
          {/* Cheek Patches */}
          <circle cx="65" cy="115" r="8" fill="#f43f5e" opacity="0.3" />
          <circle cx="135" cy="115" r="8" fill="#f43f5e" opacity="0.3" />
          {/* Snout Cream Oval */}
          <ellipse cx="100" cy="118" rx="22" ry="16" fill="#fef08a" />
          {/* Nose Triangle */}
          <polygon points="94,112 106,112 100,121" fill="#1e293b" />
          {/* Mouth Smile */}
          <path d="M 90,123 Q 100,132 110,123" fill="none" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
          {/* Left Eye */}
          <circle cx="82" cy="94" r="7" fill="#1e293b" />
          <circle cx="80" cy="91" r="2.5" fill="#ffffff" />
          {/* Right Eye */}
          <circle cx="118" cy="94" r="7" fill="#1e293b" />
          <circle cx="116" cy="91" r="2.5" fill="#ffffff" />
          {/* Left Hand/Arm */}
          <path className="arm left-arm" d="M 55,140 C 35,150 35,170 65,160 Z" fill="#d97706" />
          {/* Right Hand/Arm */}
          <path className="arm right-arm" d="M 145,140 C 165,150 165,170 135,160 Z" fill="#d97706" />
        </svg>
        {effect && <span className="visual-rhythm-burst">{effect}</span>}
      </div>
    </div>
  );
}
