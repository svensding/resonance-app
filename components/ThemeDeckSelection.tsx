

import React from 'react';
import { 
    ThemeIdentifier, CustomThemeData, DeckSet, DECK_SETS,
    getCustomDeckById, getDeckSetById 
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
    const [fromColor, toColor] = baseColor.split(' '); 
    const darken = (colorClass: string) => {
      if (!colorClass) return '';
      const parts = colorClass.split('-'); 
      if (parts.length < 2) return colorClass;
      const shade = parseInt(parts[parts.length -1]);
      if (isNaN(shade)) return colorClass;
      const newShade = Math.min(900, shade + 100); 
      return parts.slice(0, -1).join('-') + `-${newShade}`;
    }
    return `hover:${darken(fromColor)} hover:${darken(toColor)}`;
  };

  const deckButtonContainerStyle = "flex-shrink-0 aspect-[5/7] max-h-[calc(var(--header-height-actual)_*_0.85)] min-w-[calc(var(--header-height-actual)_*_0.85_*_5/7_*_0.7)] max-w-[calc(var(--header-height-actual)_*_0.85_*_5/7)] w-[calc(var(--header-height-actual)_*_0.85_*_5/7)] sm:w-[calc(var(--header-height-actual)_*_0.85_*_5/7_*_1.1)] sm:max-w-[calc(var(--header-height-actual)_*_0.85_*_5/7_*_1.1)] md:w-[calc(var(--header-height-actual)_*_0.85_*_5/7_*_1.2)] md:max-w-[calc(var(--header-height-actual)_*_0.85_*_5/7_*_1.2)]";


  const drawActionDisabled = isDrawingInProgress || interactionsDisabled;
  const utilityActionsDisabled = interactionsDisabled;

  const itemsToDisplay: (DeckSet | CustomThemeData | "RANDOM")[] = [
    "RANDOM", // Moved to the beginning
    ...DECK_SETS,
    ...customDecks
  ];

  return (
    <div className="w-full h-full flex items-end relative bg-transparent" > 
      <div 
        ref={scrollContainerRef} 
        className="flex overflow-x-auto hide-scrollbar space-x-[2vw] px-[2vw] pb-[1.5vh] justify-start items-end cursor-grab active:cursor-grabbing bg-transparent w-full"
        style={{ isolation: 'isolate' }} 
      >
        {itemsToDisplay.map(item => {
          let itemId: DeckSet['id'] | CustomThemeData['id'] | "RANDOM";
          let itemName: string;
          let baseColorClass: string;
          let isRandom = false;
          let isCustom = false;
          let itemForInfo: DeckSet | CustomThemeData | null = null;
          let itemIsDeckSet = false;

          if (item === "RANDOM") {
            itemId = "RANDOM";
            itemName = "Surprise Me!";
            baseColorClass = "from-indigo-400 to-violet-500"; 
            isRandom = true;
          } else if (typeof item === 'object' && item.id && typeof item.id === 'string' && item.id.startsWith("CUSTOM_")) {
            const customDeck = item as CustomThemeData;
            itemId = customDeck.id;
            itemName = customDeck.name;
            baseColorClass = customDeck.colorClass;
            isCustom = true;
            itemForInfo = customDeck;
          } else if (typeof item === 'object' && 'colorClass' in item && 'description' in item && Object.values(DECK_SETS).some(ds => ds.id === item.id)) { 
            const deckSet = item as DeckSet;
            itemId = deckSet.id;
            itemName = deckSet.name;
            baseColorClass = deckSet.colorClass;
            itemForInfo = deckSet;
            itemIsDeckSet = true;
          } else {
            console.warn("Unknown item type in ThemeDeckSelection:", item);
            return null; 
          }
          
          const hoverColorClass = getHoverColorClass(baseColorClass);
          const effectiveColorClass = `${baseColorClass} ${hoverColorClass}`;

          return (
            <div key={itemId} className={deckButtonContainerStyle}> 
              <ThemedDeckButton
                itemId={itemId} 
                itemName={itemName}
                colorClass={effectiveColorClass}
                onDrawClick={() => onDraw(itemId)}
                drawActionDisabled={drawActionDisabled}
                utilityActionsDisabled={utilityActionsDisabled}
                isRandomButton={isRandom}
                customDeckData={isCustom ? (item as CustomThemeData) : undefined}
                onEditCustomDeck={isCustom ? onEditCustomDeck : undefined}
                onShowInfo={itemForInfo ? () => onShowDeckInfo(itemId as DeckSet['id'] | CustomThemeData['id']) : undefined}
                isDeckSet={itemIsDeckSet}
              />
            </div>
          );
        })}
        
        <div className={`${deckButtonContainerStyle} flex items-center justify-center`}>
            <button
                onClick={onAddCustomDeck}
                disabled={drawActionDisabled} 
                className={`w-full h-full flex flex-col items-center justify-center bg-slate-700 rounded-lg border-2 border-dashed border-slate-500 text-slate-400 transition-all duration-200 p-[1vh] focus:outline-none 
                            ${drawActionDisabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-slate-600 hover:border-sky-400 hover:text-sky-300 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900'}`}
                aria-label="Add new custom deck"
                title="Add a new custom deck"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-[5vh] w-[5vh] max-h-10 max-w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-[clamp(0.6rem,1.8vh,0.85rem)] font-semibold mt-[0.5vh] text-center">Add Deck</span>
            </button>
        </div>
      </div>
    </div>
  );
};
