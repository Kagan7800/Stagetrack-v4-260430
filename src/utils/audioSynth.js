// Audio Synthesizer for Instrument Sounds
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

export const playSynthSound = (instrumentType) => {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  const now = audioCtx.currentTime;

  switch (instrumentType) {
    case 'piano':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(1, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1);
      osc.start(now);
      osc.stop(now + 1);
      break;
      
    case 'trumpet':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(349.23, now); // F4
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.8, now + 0.1);
      gainNode.gain.linearRampToValueAtTime(0.6, now + 0.3);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
      break;
      
    case 'drums':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.5);
      gainNode.gain.setValueAtTime(1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
      break;
      
    case 'guitar':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(329.63, now); // E4
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(1, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      osc.start(now);
      osc.stop(now + 1.5);
      break;

    case 'xylophone':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.50, now); // C6
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(1, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
      break;

    default: // default blip
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      gainNode.gain.setValueAtTime(0.5, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;
  }
};

export const playConfirmSound = () => {
  const audio = new Audio('/assets/sfx/ui-confirm.mp3');
  audio.play().catch(e => console.error("Audio play failed", e));
};
