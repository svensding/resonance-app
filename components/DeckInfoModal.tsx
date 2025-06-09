
import React from 'react';
import { DeckSet, CustomThemeData } from '../services/geminiService';

interface DeckInfoModalProps {
  item: DeckSet | CustomThemeData; // Can be a DeckSet or a CustomThemeData
  onClose: () => void;
}

export const DeckInfoModal: React.FC<DeckInfoModalProps> = ({ item, onClose }) => {
  // The description for DeckSet is user-facing.
  // For CustomThemeData, 'description' is also user-provided and suitable.
  const descriptionParts = item.description.split(/Inspired by:/i);
  const mainDescription = descriptionParts[0].trim();
  const inspiredByText = descriptionParts.length > 1 ? descriptionParts[1].trim() : null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 font-normal"
      onClick={onClose} 
      aria-modal="true"
      role="dialog"
      aria-labelledby="deck-info-title"
    >
      <div 
        className="bg-slate-800 p-4 sm:p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-md transform transition-all"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 id="deck-info-title" className="text-lg sm:text-xl md:text-2xl font-semibold text-sky-400 font-playfair">{item.name}</h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            aria-label="Close deck info"
            title="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-2 sm:space-y-3 text-slate-300 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1 sm:pr-2">
          <p className="text-xs sm:text-sm md:text-base whitespace-pre-wrap">{mainDescription}</p>
          
          {inspiredByText && (
            <div className="mt-2 pt-2 sm:mt-3 sm:pt-3 border-t border-slate-700">
              <h4 className="text-xs sm:text-sm font-semibold text-sky-300 mb-0.5 sm:mb-1">Inspired by:</h4>
              <p className="text-xs sm:text-sm md:text-base whitespace-pre-wrap">{inspiredByText}</p>
            </div>
          )}
        </div>

        <div className="mt-4 sm:mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-800"
            title="Close"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};