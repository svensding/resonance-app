
import React from 'react';

interface SvenAndLisaOnboardingModalProps {
  onClose: () => void;
  onConfirm: () => void; // Called when "Got it" is clicked
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
      className="fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 font-normal"
      onClick={onClose} 
      aria-modal="true"
      role="dialog"
      aria-labelledby="sven-lisa-onboarding-title"
    >
      <div 
        className="bg-slate-800 p-4 sm:p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-md sm:max-w-lg transform transition-all"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 id="sven-lisa-onboarding-title" className="text-lg sm:text-xl md:text-2xl font-semibold text-sky-400 font-playfair">{title}</h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            aria-label="Close onboarding message"
            title="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-2 sm:space-y-3 text-slate-300 max-h-[60vh] sm:max-h-[70vh] overflow-y-auto scrollbar-thin pr-1 sm:pr-2">
          <p className="text-xs sm:text-sm md:text-base whitespace-pre-wrap">{message}</p>
        </div>

        <div className="mt-4 sm:mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => {
              onConfirm(); 
            }}
            className="px-4 py-2 sm:px-6 sm:py-2.5 text-sm sm:text-base font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-800"
            title="Got it! Let's begin."
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};