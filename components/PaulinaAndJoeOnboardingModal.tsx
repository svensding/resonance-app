
import React from 'react';

interface PaulinaAndJoeOnboardingModalProps {
  onClose: () => void;
  onConfirm: () => void; 
}

export const PaulinaAndJoeOnboardingModal: React.FC<PaulinaAndJoeOnboardingModalProps> = ({ onClose, onConfirm }) => {
  const title = "Paulina & Joe's Roadtrip Resonance!";
  const message = `Hey Paulina & Joe, Sven here! 👋

Welcome to your very own special corner of Resonance, tailored for your awesome roadtrip! 
I've tweaked things a bit to match your adventurous spirit.

Expect prompts that are:
• **Playful & Edgy:** Designed to spark some fun, maybe even a little mischief.
• **Banter-Ready:** Paulina, I hear you love good banter – let's see what unfolds!
• **Roadtrip Themed:** Think open roads, quirky discoveries, and shared journey vibes.

The goal is to laugh, connect, and make some memorable moments. Less pressure, more spontaneous fun. 
Wishing you an amazing trip! Enjoy the ride and the reflections.`;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-[3vw] font-normal"
      onClick={onClose} 
      aria-modal="true"
      role="dialog"
      aria-labelledby="paulina-joe-onboarding-title"
    >
      <div 
        className="bg-slate-800 p-[3vw] sm:p-[4vw] rounded-xl shadow-2xl w-full max-w-[90vw] sm:max-w-lg transform transition-all"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center mb-[1.5vh] sm:mb-[2vh]">
          <h2 id="paulina-joe-onboarding-title" className="text-[clamp(1.1rem,3vh,1.75rem)] font-bold text-sky-400">{title}</h2>
          <button 
            onClick={onClose} 
            className="p-[0.5vh] rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            aria-label="Close onboarding message"
            title="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-[3vh] w-[3vh] max-h-6 max-w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-[1vh] sm:space-y-[1.5vh] text-slate-300 max-h-[60vh] sm:max-h-[70vh] overflow-y-auto scrollbar-thin pr-[0.5vw] sm:pr-[1vw]">
          <p className="text-[clamp(0.75rem,2.2vh,1rem)] whitespace-pre-wrap font-normal">{message}</p>
        </div>

        <div className="mt-[2vh] sm:mt-[3vh] flex justify-end">
          <button
            type="button"
            onClick={onConfirm}
            className="px-[2.5vw] py-[1.2vh] sm:px-[3vw] sm:py-[1.5vh] text-[clamp(0.8rem,2.3vh,1.1rem)] font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-800"
            title="Let the roadtrip games begin!"
          >
            Let's Go!
          </button>
        </div>
      </div>
    </div>
  );
};
