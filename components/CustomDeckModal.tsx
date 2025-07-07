
import React, { useState, useEffect } from 'react';
import { 
    CustomThemeData, 
    CoreTheme, 
    CardType, 
    IntensityLevel,
    ALL_CORE_THEMES_INFO,
    ALL_CARD_TYPES_INFO,
    ALL_INTENSITY_LEVELS_INFO,
    CoreThemeInfo,
    CardTypeInfo,
    IntensityLevelInfo
} from '../services/geminiService';

interface CustomDeckModalProps {
  onClose: () => void;
  onSave: (
    name: string, 
    description: string, 
    options: { 
        themes: CoreTheme[], 
        cardTypes: CardType[], 
        intensity: IntensityLevel[]
    }
  ) => void;
  initialData?: CustomThemeData;
  interactionsDisabled?: boolean; 
}

const BuildingBlockSelector = <T extends string | number>({ title, items, selectedItems, onToggle, disabled }: {
    title: string;
    items: { id: T, name: string }[];
    selectedItems: T[];
    onToggle: (item: T) => void;
    disabled: boolean;
}) => (
    <div>
        <h4 className="block text-[clamp(0.7rem,2vh,0.9rem)] font-bold text-slate-300 mb-[0.8vh]">
            {title} <span className="font-normal text-slate-400">(Optional)</span>
        </h4>
        <div className="max-h-32 overflow-y-auto scrollbar-thin bg-slate-700/50 p-2 rounded-md border border-slate-600">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {items.map(item => (
                <label key={item.id} className={`flex items-center space-x-2 p-1.5 rounded-md text-xs transition-colors ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-slate-600'}`}>
                    <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => onToggle(item.id)}
                        disabled={disabled}
                        className="form-checkbox h-4 w-4 rounded bg-slate-800 border-slate-500 text-sky-500 focus:ring-sky-500 disabled:opacity-50"
                    />
                    <span className="text-slate-200">{item.name}</span>
                </label>
            ))}
            </div>
        </div>
    </div>
);


export const CustomDeckModal: React.FC<CustomDeckModalProps> = ({ onClose, onSave, initialData, interactionsDisabled = false }) => {
  const [deckName, setDeckName] = useState('');
  const [deckDescription, setDeckDescription] = useState('');
  const [selectedThemes, setSelectedThemes] = useState<CoreTheme[]>([]);
  const [selectedCardTypes, setSelectedCardTypes] = useState<CardType[]>([]);
  const [selectedIntensity, setSelectedIntensity] = useState<IntensityLevel[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setDeckName(initialData.name);
      setDeckDescription(initialData.description);
      setSelectedThemes(initialData.themes || []);
      setSelectedCardTypes(initialData.cardTypes || []);
      setSelectedIntensity(initialData.intensity || []);
    } else {
      setDeckName('');
      setDeckDescription('');
      setSelectedThemes([]);
      setSelectedCardTypes([]);
      setSelectedIntensity([]);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (interactionsDisabled) return;
    if (!deckName.trim()) {
      setError('Deck name is required.');
      return;
    }
    if (!deckDescription.trim()) {
      setError('Deck prompt description is required.');
      return;
    }
    if (deckDescription.trim().length < 20) {
        setError('Deck prompt description should be at least 20 characters long to guide the AI effectively.');
        return;
    }
    setError('');
    onSave(deckName.trim(), deckDescription.trim(), {
        themes: selectedThemes,
        cardTypes: selectedCardTypes,
        intensity: selectedIntensity.sort((a,b) => a-b)
    });
  };
  
  const handleToggle = <T,>(item: T, selected: T[], setSelected: React.Dispatch<React.SetStateAction<T[]>>) => {
      setSelected(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  }

  const modalTitle = initialData ? "Edit Custom Deck" : "Create Custom Deck";
  const saveButtonText = initialData ? "Update Deck" : "Save Deck";

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-[3vw] font-normal"
      onClick={onClose} 
    >
      <div 
        className="bg-slate-800 p-[3vw] sm:p-[4vw] rounded-xl shadow-2xl w-full max-w-[90vw] sm:max-w-[70vw] md:max-w-lg transform transition-all max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center mb-[2vh] sm:mb-[2.5vh] flex-shrink-0">
          <h2 className="text-[clamp(1.1rem,3vh,1.75rem)] font-bold text-sky-400">{modalTitle}</h2>
          <button 
            onClick={onClose} 
            className="p-[0.5vh] rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            aria-label="Close modal"
            title="Close modal"
            disabled={interactionsDisabled}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-[3vh] w-[3vh] max-h-6 max-w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-[1.5vh] overflow-y-auto scrollbar-thin pr-2 flex-grow">
          <div>
            <label htmlFor="deckName" className="block text-[clamp(0.7rem,2vh,0.9rem)] font-normal text-slate-300 mb-[0.5vh]">
              Deck Name
            </label>
            <input
              type="text"
              id="deckName"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              placeholder="e.g., My Deep Thoughts"
              className={`w-full px-[1.5vw] py-[1vh] text-[clamp(0.75rem,2.2vh,1rem)] bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-white placeholder-slate-400 font-normal ${interactionsDisabled ? 'opacity-70 cursor-not-allowed' : ''}`}
              maxLength={50}
              disabled={interactionsDisabled}
            />
          </div>
          <div>
            <label htmlFor="deckDescription" className="block text-[clamp(0.7rem,2vh,0.9rem)] font-normal text-slate-300 mb-[0.5vh]">
              Deck Prompt Description <span className="font-bold text-slate-400">(Required)</span>
            </label>
            <textarea
              id="deckDescription"
              value={deckDescription}
              onChange={(e) => setDeckDescription(e.target.value)}
              placeholder="Describe the kind of prompts this deck should generate. e.g., 'Profound questions about life's purpose and personal growth.'"
              rows={3}
              className={`w-full px-[1.5vw] py-[1vh] text-[clamp(0.75rem,2.2vh,1rem)] bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-white placeholder-slate-400 scrollbar-thin font-normal ${interactionsDisabled ? 'opacity-70 cursor-not-allowed' : ''}`}
              maxLength={300}
              disabled={interactionsDisabled}
            />
            <p className="text-[clamp(0.6rem,1.8vh,0.85rem)] text-slate-400 mt-[0.5vh] font-normal">This guides the AI. Be descriptive (min 20 chars).</p>
          </div>
          
          <BuildingBlockSelector<CoreTheme>
            title="Core Themes" 
            items={ALL_CORE_THEMES_INFO}
            selectedItems={selectedThemes}
            onToggle={(item) => handleToggle(item, selectedThemes, setSelectedThemes)}
            disabled={interactionsDisabled}
          />
          <BuildingBlockSelector<CardType>
            title="Card Types" 
            items={ALL_CARD_TYPES_INFO}
            selectedItems={selectedCardTypes}
            onToggle={(item) => handleToggle(item, selectedCardTypes, setSelectedCardTypes)}
            disabled={interactionsDisabled}
          />
          <BuildingBlockSelector<IntensityLevel>
            title="Intensity Levels" 
            items={ALL_INTENSITY_LEVELS_INFO}
            selectedItems={selectedIntensity}
            onToggle={(item) => handleToggle(item, selectedIntensity, setSelectedIntensity)}
            disabled={interactionsDisabled}
          />

          {error && <p className="text-[clamp(0.65rem,1.9vh,0.9rem)] text-red-400 font-normal">{error}</p>}

          <div className="flex justify-end space-x-[1vw] pt-2 mt-4 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={interactionsDisabled}
              className={`px-[2vw] py-[1vh] text-[clamp(0.7rem,2vh,0.9rem)] font-normal text-slate-300 bg-slate-600 hover:bg-slate-500 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 ${interactionsDisabled ? 'opacity-70 cursor-not-allowed' : ''}`}
              title="Cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={interactionsDisabled}
              className={`px-[2vw] py-[1vh] text-[clamp(0.7rem,2vh,0.9rem)] font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 ${interactionsDisabled ? 'opacity-70 cursor-not-allowed' : ''}`}
              title={saveButtonText}
            >
              {saveButtonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
