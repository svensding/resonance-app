
import React from 'react';
import { 
    ThemeIdentifier, CustomThemeData, DeckSet, DECK_SETS,
    getCustomDeckById, getDeckSetById // Added these
} from '../services/geminiService';
import { ThemedDeckButton } from './ThemedDeckButton';
import { useDragToScroll } from '../hooks/useDragToScroll'; 

interface ThemeDeckSelectionProps {
  onDraw: (itemId: DeckSet['id'] | CustomThemeData['id'] | "RANDOM") => void;
  isDrawingInProgress?: boolean;
  interactionsDisabled?: boolean;
  customDecks: CustomThemeData[];
  onAddCustomDeck: () => void;
  onEditCustomDeck: (deck: CustomThemeData) => void; 
  onShowDeckInfo: (itemId: DeckSet['id'] | CustomThemeData['id']) => void;
}

export const ThemeDeckSelection: React.FC<ThemeDeckSelectionProps> = ({ 
    onDraw, 
    isDrawingInProgress = false,
    interactionsDisabled = false,
    customDecks, 
    onAddCustomDeck,
    onEditCustomDeck,
    onShowDeckInfo
}) => {
  const scrollContainerRef = useDragToScroll<HTMLDivElement>(); 

  const getHoverColorClass = (baseColor: string | undefined): string => {
    if (!baseColor) return "hover:from-gray-700 hover:to-gray-800";
    const [fromColor, toColor] = baseColor.split(' '); // e.g. "from-sky-400", "to-cyan-400"
    const darken = (colorClass: string) => {
      if (!colorClass) return '';
      const parts = colorClass.split('-'); // e.g. ["from", "sky", "400"]
      if (parts.length < 2) return colorClass;
      const shade = parseInt(parts[parts.length -1]);
      if (isNaN(shade)) return colorClass;
      const newShade = Math.min(900, shade + 100); // Darken by 100, max 900
      return parts.slice(0, -1).join('-') + `-${newShade}`;
    }
    return `hover:${darken(fromColor)} hover:${darken(toColor)}`;
  };

  const deckHeight = "h-28 xs:h-32 sm:h-36 md:h-40 lg:h-44"; 
  const deckWidth = "w-20 xs:w-24 sm:w-28 md:w-32";
  const drawActionDisabled = isDrawingInProgress || interactionsDisabled;
  const utilityActionsDisabled = interactionsDisabled;

  // Order: DeckSets, RANDOM, Add Custom, CustomDecks
  const itemsToDisplay: (DeckSet | CustomThemeData | "RANDOM")[] = [
    ...DECK_SETS,
    "RANDOM",
    ...customDecks
  ];

  return (
    <div className="w-full py-1.5 sm:py-2 md:py-3 relative bg-transparent"> 
      <div 
        ref={scrollContainerRef} 
        className="flex overflow-x-auto hide-scrollbar pb-2 sm:pb-3 md:pb-4 space-x-2 xs:space-x-3 sm:space-x-4 px-1.5 xs:px-2 sm:px-4 justify-start items-end cursor-grab active:cursor-grabbing bg-transparent"
        style={{ isolation: 'isolate' }} 
      >
        {itemsToDisplay.map(item => {
          let itemId: DeckSet['id'] | CustomThemeData['id'] | "RANDOM";
          let itemName: string;
          let baseColorClass: string;
          let isRandom = false;
          let isCustom = false;
          let itemForInfo: DeckSet | CustomThemeData | null = null;

          if (item === "RANDOM") {
            itemId = "RANDOM";
            itemName = "Surprise Me!";
            baseColorClass = "from-indigo-400 to-violet-500"; // Distinct color for Random
            isRandom = true;
          } else if ('belongs_to_set' in item || 'internal_name' in item && !('colorClass' in item) ) { // Heuristic for DeckSet (actually MicroDeck, but we show Sets)
            // This logic block is tricky. The itemsToDisplay contains DeckSet objects.
            const deckSet = item as DeckSet;
            itemId = deckSet.id;
            itemName = deckSet.name;
            baseColorClass = deckSet.colorClass;
            itemForInfo = deckSet;
          } else { // CustomThemeData
            const customDeck = item as CustomThemeData;
            itemId = customDeck.id;
            itemName = customDeck.name;
            baseColorClass = customDeck.colorClass;
            isCustom = true;
            itemForInfo = customDeck;
          }
          
          const hoverColorClass = getHoverColorClass(baseColorClass);
          const effectiveColorClass = `${baseColorClass} ${hoverColorClass}`;

          return (
            <div key={itemId} className={`flex-shrink-0 ${deckHeight} ${deckWidth}`}> 
              <ThemedDeckButton
                itemId={itemId} // Now DeckSetId, CustomThemeId, or "RANDOM"
                itemName={itemName}
                colorClass={effectiveColorClass}
                onDrawClick={() => onDraw(itemId)}
                drawActionDisabled={drawActionDisabled}
                utilityActionsDisabled={utilityActionsDisabled}
                isRandomButton={isRandom}
                customDeckData={isCustom ? (item as CustomThemeData) : undefined}
                onEditCustomDeck={isCustom ? onEditCustomDeck : undefined}
                onShowInfo={itemForInfo ? () => onShowDeckInfo(itemId as DeckSet['id'] | CustomThemeData['id']) : undefined}
                isDeckSet={!isRandom && !isCustom}
              />
            </div>
          );
        })}
        
        {/* Add Deck Button (always visible after other items) */}
        <div className={`flex-shrink-0 ${deckHeight} ${deckWidth} flex items-center justify-center`}>
            <button
                onClick={onAddCustomDeck}
                disabled={drawActionDisabled} // Add deck can be considered a draw-like setup action
                className={`w-full h-full flex flex-col items-center justify-center bg-slate-700 rounded-lg border-2 border-dashed border-slate-500 text-slate-400 transition-all duration-200 p-1.5 sm:p-2 focus:outline-none 
                            ${drawActionDisabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-slate-600 hover:border-sky-400 hover:text-sky-300 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900'}`}
                aria-label="Add new custom deck"
                title="Add a new custom deck"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 xs:h-8 xs:w-8 sm:h-10 sm:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-[0.6rem] xs:text-xs sm:text-sm font-semibold mt-1 sm:mt-1.5 text-center">Add Deck</span>
            </button>
        </div>
      </div>
    </div>
  );
};