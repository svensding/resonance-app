
import React, { useState, useEffect } from 'react';
import { CustomThemeData } from '../services/geminiService';

interface CustomDeckModalProps {
  onClose: () => void;
  onSave: (name: string, description: string) => void;
  initialData?: CustomThemeData;
  interactionsDisabled?: boolean; 
}

export const CustomDeckModal: React.FC<CustomDeckModalProps> = ({ onClose, onSave, initialData, interactionsDisabled = false }) => {
  const [deckName, setDeckName] = useState('');
  const [deckDescription, setDeckDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setDeckName(initialData.name);
      setDeckDescription(initialData.description);
    } else {
      setDeckName('');
      setDeckDescription('');
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
    onSave(deckName.trim(), deckDescription.trim());
  };

  const modalTitle = initialData ? "Edit Custom Deck" : "Create Custom Deck";
  const saveButtonText = initialData ? "Update Deck" : "Save Deck";

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-[3vw] font-normal" // Base font set on body
      onClick={onClose} 
    >
      <div 
        className="bg-slate-800 p-[3vw] sm:p-[4vw] rounded-xl shadow-2xl w-full max-w-[90vw] sm:max-w-[70vw] md:max-w-lg transform transition-all"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center mb-[2vh] sm:mb-[2.5vh]">
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

        <form onSubmit={handleSubmit} className="space-y-[1.5vh]">
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
              Deck Prompt Description
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

          {error && <p className="text-[clamp(0.65rem,1.9vh,0.9rem)] text-red-400 font-normal">{error}</p>}

          <div className="flex justify-end space-x-[1vw] pt-[0.5vh]">
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