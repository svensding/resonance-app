
import React from 'react';
import { CustomThemeData, DeckSet } from '../services/geminiService'; // ThemeIdentifier removed, itemId is used
import { CornerGlyphGrid } from './CornerGlyphGrid';

interface ThemedDeckButtonProps {
  itemId: DeckSet['id'] | CustomThemeData['id'] | "RANDOM"; // DeckSetId, CustomThemeId, or "RANDOM"
  itemName: string;
  colorClass: string;
  onDrawClick: () => void; 
  drawActionDisabled?: boolean; 
  utilityActionsDisabled?: boolean; 
  isRandomButton?: boolean;
  customDeckData?: CustomThemeData; 
  onEditCustomDeck?: (deck: CustomThemeData) => void; 
  onShowInfo?: () => void; // Simplified: just a callback, itemId is known by parent
  isDeckSet?: boolean; // True if this button represents a DeckSet
}

export const ThemedDeckButton: React.FC<ThemedDeckButtonProps> = ({ 
  itemId,
  itemName, 
  colorClass, 
  onDrawClick, 
  drawActionDisabled = false,
  utilityActionsDisabled = false,
  isRandomButton = false,
  customDeckData,
  onEditCustomDeck,
  onShowInfo,
  isDeckSet = false,
}) => {
  const baseBg = colorClass.split(' ')[0] + " " + colorClass.split(' ')[1];
  
  const handleMainAction = () => {
    if (!drawActionDisabled) {
        onDrawClick(); 
    }
  };
  
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (customDeckData && onEditCustomDeck && !utilityActionsDisabled) {
      onEditCustomDeck(customDeckData);
    }
  };

  const handleInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShowInfo && !utilityActionsDisabled) { 
        onShowInfo();
    }
  };

  const mainButtonLabel = isRandomButton ? "Draw a Random Card" : `Draw a card from ${itemName}`;
  const mainButtonTitle = isRandomButton ? "Draw a Random Card" : `Draw from: ${itemName}`;

  const utilityButtonBaseClasses = "p-1 rounded-full text-white/70 hover:text-white z-30 transition-all duration-200 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100 bg-black/40 hover:bg-black/60";
  const utilityButtonIconSize = "h-3.5 w-3.5 sm:h-4 sm:w-4";
  const deckGlyphSize = "text-sm sm:text-base"; 
  const deckGlyphGap = "gap-px sm:gap-0.5";
  const glyphColor = "text-white/70";

  return (
    <div
      role="button"
      tabIndex={drawActionDisabled ? -1 : 0}
      onClick={handleMainAction}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleMainAction();}}
      aria-disabled={drawActionDisabled}
      aria-label={mainButtonLabel}
      title={mainButtonTitle}
      className={`relative w-full h-full group
                  transition-all duration-300 ease-out
                  focus:outline-none 
                  ${drawActionDisabled ? 'cursor-not-allowed opacity-70' : 'hover:scale-105 active:scale-95 focus:ring-2 focus:ring-white/50 focus:ring-offset-1 focus:ring-offset-slate-800 rounded-lg cursor-pointer'}
                  `}
    >
      <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
        {!isRandomButton && (
          <div
            className={`absolute w-full h-full rounded-lg bg-gradient-to-br ${baseBg} opacity-50 transform rotate-[-6deg] translate-x-[-2px] translate-y-[2px] shadow-sm group-hover:shadow-md transition-all duration-300 ease-out border border-black/10`}
          ></div>
        )}
        {!isRandomButton && (
           <div
            className={`absolute w-full h-full rounded-lg bg-gradient-to-br ${baseBg} opacity-75 transform rotate-[4deg] translate-x-[1px] translate-y-[-1px] shadow-md group-hover:shadow-lg transition-all duration-300 ease-out border border-black/15`}
          ></div>
        )}
       
        <div 
          className={`relative w-full h-full rounded-lg bg-gradient-to-br ${colorClass} shadow-lg group-hover:shadow-xl
                      flex flex-col justify-center items-center text-center p-2 sm:p-2.5 
                      border ${isRandomButton ? 'border-dashed border-indigo-300' : 'border-white/80'} 
                      transition-all duration-300 ease-out overflow-hidden
                      `}
        >
          <div className="absolute inset-0 bg-slate-800/40 rounded-lg z-10"></div>
          <div className={`relative z-20 flex flex-col items-center justify-center flex-grow w-full h-full 
                           ${drawActionDisabled ? 'opacity-70' : ''}
                          `}>
            
            {!isRandomButton && (
              <>
                <CornerGlyphGrid position="top-left" glyphColorClass={glyphColor} glyphSizeClass={deckGlyphSize} gridGapClass={deckGlyphGap} />
                <CornerGlyphGrid position="bottom-right" glyphColorClass={glyphColor} glyphSizeClass={deckGlyphSize} gridGapClass={deckGlyphGap} />
              </>
            )}

            {customDeckData && onEditCustomDeck && (
              <button
                onClick={handleEditClick}
                disabled={utilityActionsDisabled}
                className={`absolute top-1 right-1 ${utilityButtonBaseClasses} ${utilityActionsDisabled ? 'cursor-not-allowed !opacity-50' : ''}`}
                aria-label={`Edit ${itemName} deck`}
                title={`Edit ${itemName}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={utilityButtonIconSize} viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            )}

            {(isDeckSet || customDeckData) && onShowInfo && ( 
               <button
                onClick={handleInfoClick}
                disabled={utilityActionsDisabled}
                className={`absolute ${customDeckData ? 'top-1 left-1' : 'top-1 right-1'} ${utilityButtonBaseClasses} ${utilityActionsDisabled ? 'cursor-not-allowed !opacity-50' : ''}`}
                aria-label={`Info about ${itemName}`}
                title={`Info: ${itemName}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={utilityButtonIconSize} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </button>
            )}

            <div className={`flex flex-col items-center justify-center flex-grow overflow-hidden w-full px-1`}>
              <h3 
                className={`font-semibold ${isRandomButton ? 'text-lg sm:text-xl mt-4' : 'text-sm sm:text-base md:text-lg mt-2'} text-white break-words`}
                style={{ lineHeight: '1.2' }}
              >
                {itemName}
              </h3>
            </div>
            
            {isRandomButton && (
              <div className={`absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 text-lg sm:text-xl font-playfair font-normal select-none text-white/40`} aria-hidden="true">
                ⦾ 
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
