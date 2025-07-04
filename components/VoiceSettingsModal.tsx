
import React, { useState } from 'react';
import { VoiceName, LanguageCode, VoicePersona } from '../services/geminiService';

interface VoiceSettingsModalProps {
  currentVoice: VoiceName;
  currentLanguage: LanguageCode;
  isMuted: boolean;
  onVoiceChange: (voice: VoiceName) => void;
  onLanguageChange: (language: LanguageCode) => void;
  onMuteChange: (muted: boolean) => void;
  onClose: () => void;
  voicePersonas: VoicePersona[];
}

const LanguageButton: React.FC<{
  code: string;
  label: string;
  isActive: boolean;
  onClick: (code: string) => void;
}> = ({ code, label, isActive, onClick }) => (
  <button
    onClick={() => onClick(code)}
    className={`px-3 py-2 text-sm rounded-md transition-colors w-full
      ${isActive
        ? 'bg-sky-500 text-white font-bold shadow-md'
        : 'bg-slate-600 hover:bg-slate-500 text-slate-200'
      }`}
  >
    {label}
  </button>
);

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  currentVoice,
  currentLanguage,
  isMuted,
  onVoiceChange,
  onLanguageChange,
  onMuteChange,
  onClose,
  voicePersonas,
}) => {
  const PRESET_LANGUAGES = [
    { code: 'en-US', label: 'English (US)' },
    { code: 'es-ES', label: 'Español' },
    { code: 'nl-NL', label: 'Nederlands' },
  ];
  const isCustomLanguage = !PRESET_LANGUAGES.some(p => p.code === currentLanguage);
  const [showCustomInput, setShowCustomInput] = useState(isCustomLanguage);

  const handleLanguageClick = (code: string) => {
    if (code === 'other') {
      setShowCustomInput(true);
    } else {
      setShowCustomInput(false);
      onLanguageChange(code);
    }
  };

  const getVoiceButtonLabel = (personaName: string): string => {
    const match = personaName.match(/\(([^)]+)\)/);
    return match ? match[1] : personaName;
  }

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-[3vw] font-normal"
      onClick={onClose} 
      aria-modal="true"
      role="dialog"
      aria-labelledby="voice-settings-title"
    >
      <div 
        className="bg-slate-800 p-[3vw] sm:p-[4vw] rounded-xl shadow-2xl w-full max-w-[90vw] sm:max-w-lg md:max-w-2xl lg:max-w-3xl xl:max-w-4xl transform transition-all flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center mb-[1.5vh] sm:mb-[2.5vh] flex-shrink-0">
          <h2 id="voice-settings-title" className="text-[clamp(1.1rem,2.5vh,1.5rem)] font-bold text-sky-400">Voice & Audio Settings</h2>
          <button 
            onClick={onClose} 
            className="p-[0.5vh] rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            aria-label="Close voice settings"
            title="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-[3vh] w-[3vh] max-h-6 max-w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-[2vh] sm:space-y-[3vh] overflow-y-auto scrollbar-thin pr-2 flex-grow">
          {/* Mute Button */}
          <div className="flex items-center justify-between">
            <label id="narrationLabel" className="text-[clamp(0.8rem,2vh,1rem)] font-bold text-slate-300">
              Narration
            </label>
            <button
              onClick={() => onMuteChange(!isMuted)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500
                ${isMuted ? 'bg-slate-600 text-slate-300' : 'bg-sky-500 text-white'}`}
              role="switch"
              aria-checked={!isMuted}
              aria-labelledby="narrationLabel"
            >
              <span className="text-sm font-semibold">{isMuted ? 'Muted' : 'On'}</span>
              {isMuted ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.076a1 1 0 011.09.217l3.707 3.707H17a1 1 0 011 1v4a1 1 0 01-1 1h-2.207l-3.707 3.707a1 1 0 01-1.707-.707V4a1 1 0 01.617-.924zM14 6.924a3.998 3.998 0 00-1.523-3.036 1 1 0 10-1.228 1.56A2 2 0 0112 8v4a2 2 0 01-.751 1.553 1 1 0 101.228 1.56A3.998 3.998 0 0014 13.076V6.924z" /></svg>
              )}
            </button>
          </div>

          {/* Language Selection */}
          <div>
            <label className="block text-[clamp(0.7rem,1.8vh,0.9rem)] font-bold text-slate-300 mb-2">
              Language
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_LANGUAGES.map(lang => (
                <LanguageButton key={lang.code} {...lang} isActive={!showCustomInput && currentLanguage === lang.code} onClick={handleLanguageClick} />
              ))}
              <LanguageButton code="other" label="Other..." isActive={showCustomInput} onClick={handleLanguageClick} />
            </div>
            {showCustomInput && (
              <div className="mt-3">
                <input
                  type="text"
                  value={currentLanguage}
                  onChange={(e) => onLanguageChange(e.target.value)}
                  placeholder="e.g., fr-FR"
                  className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-white placeholder-slate-400"
                />
                 <p className="text-[clamp(0.6rem,1.8vh,0.85rem)] text-slate-400 mt-1">Enter a BCP-47 language code.</p>
              </div>
            )}
          </div>
          
          {/* Voice Selection */}
          <div>
            <label className="block text-[clamp(0.8rem,2vh,1rem)] font-bold text-slate-300 mb-3">
              Narration Voice
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {voicePersonas.map(persona => (
                  <button
                    key={persona.id}
                    onClick={() => onVoiceChange(persona.voiceName)}
                    className={`w-full p-3 text-left rounded-lg transition-all duration-150 ease-in-out border flex flex-col h-full
                      ${currentVoice === persona.voiceName
                        ? 'bg-sky-600/20 border-sky-500 ring-2 ring-sky-500'
                        : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700 hover:border-slate-500'
                      }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-100">{getVoiceButtonLabel(persona.name)}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-600 text-slate-300">
                        {persona.gender}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 mt-auto pt-2">{persona.description}</p>
                  </button>
                ))}
            </div>
          </div>
        </div>

        <div className="mt-[2.5vh] sm:mt-[4vh] flex justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400"
            title="Done"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
