import { useCurtain } from './CurtainContext';

export default function CenterStage() {
  const { isCurtainOpen } = useCurtain();

  return (
    <div className="relative w-full max-w-5xl mx-auto aspect-video rounded-sm overflow-hidden border-[12px] border-blue-900/80 shadow-2xl bg-black">
      
      {/* Main Stage Image - 'object-cover' perfectly fills V3 16:9 container */}
      <img 
        src="/assets/music-fun-band.png" 
        alt="Animal Band" 
        className="absolute inset-0 w-full h-full object-cover z-0"
      />

      {/* Left Curtain */}
      <div 
        className={`absolute top-0 left-0 w-1/2 h-full bg-[#090514] z-10 transition-all duration-1000 ease-in-out border-[#1e1b4b] shadow-[5px_0_15px_rgba(0,0,0,0.6)] ${
          isCurtainOpen 
            ? '-translate-x-[93%] border-r-[8px]' // Pushed to 93% to match the thin black edge footprint
            : 'translate-x-0 border-r-4'
        }`}
        style={{ 
          backgroundImage: 'url(/assets/pc_container/Stage_curtains.png)',
          backgroundRepeat: 'no-repeat',
          // Squish the image folds using background size and bp
          backgroundSize: isCurtainOpen ? '40% 100%' : '200% 100%',
          backgroundPosition: isCurtainOpen ? 'right center' : 'left center',
          // Curve the inner edge to simulate a tied-back drape
          borderRadius: isCurtainOpen ? '0 15% 65% 0' : '0'
        }}
      ></div>

      {/* Right Curtain */}
      <div 
        className={`absolute top-0 right-0 w-1/2 h-full bg-[#090514] z-10 transition-all duration-1000 ease-in-out border-[#1e1b4b] shadow-[-5px_0_15px_rgba(0,0,0,0.6)] ${
          isCurtainOpen 
            ? 'translate-x-[93%] border-l-[8px]' // Pushed to 93% to match the thin black edge footprint
            : 'translate-x-0 border-l-4'
        }`}
        style={{ 
          backgroundImage: 'url(/assets/pc_container/Stage_curtains.png)',
          backgroundRepeat: 'no-repeat',
          // Squish the image folds using background size and bp
          backgroundSize: isCurtainOpen ? '40% 100%' : '200% 100%',
          backgroundPosition: isCurtainOpen ? 'left center' : 'right center',
          // Curve the inner edge to simulate a tied-back drape
          borderRadius: isCurtainOpen ? '15% 0 0 65%' : '0'
        }}
      ></div>
    </div>
  );
}
