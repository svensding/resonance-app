
import React from 'react';

interface SvenAndLisaOnboardingModalProps {
  onClose: () => void;
  onConfirm: () => void; 
}

export const SvenAndLisaOnboardingModal: React.FC<SvenAndLisaOnboardingModalProps> = ({ onClose, onConfirm }) => {
  const title = "A Gentle Path for Sven & Lisa";
  const message = `Lisa & Sven, welcome to a special space within Resonance, just for you.

This mode is designed to make sharing and hearing each other a bit lighter and easier. The focus isn't on perfect understanding right away, but on simply expressing your own thoughts and feelings, and curiously witnessing each other.

Think of it as a relaxed conversation where:
• It’s okay if things aren’t crystal clear immediately.
• Mutual comprehension is a delightful bonus.

The prompts are chosen to help create new, positive moments of connection. Less pressure, more curiosity. Enjoy exploring!`;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-[3vw] font-normal" // Base font set on body
      onClick={onClose} 
      aria-modal="true"
      role="dialog"
      aria-labelledby="sven-lisa-onboarding-title"
    >
      <div 
        className="bg-slate-800 p-[3vw] sm:p-[4vw] rounded-xl shadow-2xl w-full max-w-[90vw] sm:max-w-lg transform transition-all"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center mb-[1.5vh] sm:mb-[2vh]">
          <h2 id="sven-lisa-onboarding-title" className="text-[clamp(1.1rem,3vh,1.75rem)] font-bold text-sky-400">{title}</h2>
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
            onClick={() => {
              onConfirm(); 
            }}
            className="px-[2.5vw] py-[1.2vh] sm:px-[3vw] sm:py-[1.5vh] text-[clamp(0.8rem,2.3vh,1.1rem)] font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-800"
            title="Got it! Let's begin."
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};