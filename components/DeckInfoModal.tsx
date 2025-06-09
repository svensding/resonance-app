
import React from 'react';
import { DeckSet, CustomThemeData } from '../services/geminiService';

interface DeckInfoModalProps {
  item: DeckSet | CustomThemeData; 
  onClose: () => void;
}

export const DeckInfoModal: React.FC<DeckInfoModalProps> = ({ item, onClose }) => {
  const descriptionParts = item.description.split(/Inspired by:/i);
  const mainDescription = descriptionParts[0].trim();
  const inspiredByText = descriptionParts.length > 1 ? descriptionParts[1].trim() : null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-[3vw] font-normal"
      onClick={onClose} 
      aria-modal="true"
      role="dialog"
      aria-labelledby="deck-info-title"
    >
      <div 
        className="bg-slate-800 p-[3vw] sm:p-[4vw] rounded-xl shadow-2xl w-full max-w-[90vw] sm:max-w-[70vw] md:max-w-lg transform transition-all"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center mb-[1.5vh] sm:mb-[2vh]">
          <h2 id="deck-info-title" className="text-[clamp(1.1rem,3vh,1.75rem)] font-semibold text-sky-400 font-playfair">{item.name}</h2>
          <button 
            onClick={onClose} 
            className="p-[0.5vh] rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            aria-label="Close deck info"
            title="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-[3vh] w-[3vh] max-h-6 max-w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-[1vh] sm:space-y-[1.5vh] text-slate-300 max-h-[60vh] overflow-y-auto scrollbar-thin pr-[0.5vw] sm:pr-[1vw]">
          <p className="text-[clamp(0.75rem,2.2vh,1rem)] whitespace-pre-wrap">{mainDescription}</p>
          
          {inspiredByText && (
            <div className="mt-[1vh] pt-[1vh] sm:mt-[1.5vh] sm:pt-[1.5vh] border-t border-slate-700">
              <h4 className="text-[clamp(0.7rem,2vh,0.9rem)] font-semibold text-sky-300 mb-[0.3vh] sm:mb-[0.5vh]">Inspired by:</h4>
              <p className="text-[clamp(0.75rem,2.2vh,1rem)] whitespace-pre-wrap">{inspiredByText}</p>
            </div>
          )}
        </div>

        <div className="mt-[2vh] sm:mt-[3vh] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-[2vw] py-[1vh] text-[clamp(0.7rem,2vh,0.9rem)] font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-800"
            title="Close"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
