
import React from 'react';
import { VoiceName, LanguageCode, VoiceOption, LanguageOption } from '../services/geminiService';
import { MusicSessionState } from '../services/musicService'; // Import MusicSessionState

interface VoiceSettingsModalProps {
  currentVoice: VoiceName;
  currentLanguage: LanguageCode;
  isMuted: boolean;
  isMusicEnabled: boolean; // New prop
  musicSessionState: MusicSessionState; // New prop
  onVoiceChange: (voice: VoiceName) => void;
  onLanguageChange: (language: LanguageCode) => void;
  onMuteChange: (muted: boolean) => void;
  onMusicEnableChange: (enabled: boolean) => void; // New prop
  onClose: () => void;
  voicesList: VoiceOption[];
  languagesList: LanguageOption[];
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  currentVoice,
  currentLanguage,
  isMuted,
  isMusicEnabled,
  musicSessionState,
  onVoiceChange,
  onLanguageChange,
  onMuteChange,
  onMusicEnableChange,
  onClose,
  voicesList,
  languagesList,
}) => {
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-4 font-normal" 
      onClick={onClose} 
      aria-modal="true"
      role="dialog"
      aria-labelledby="voice-settings-title"
    >
      <div 
        className="bg-slate-800 p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-md transform transition-all"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="voice-settings-title" className="text-xl sm:text-2xl font-semibold text-sky-400">Voice & Audio Settings</h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            aria-label="Close voice settings"
            title="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="voiceSelect" className="block text-sm font-medium text-slate-300 mb-1"> 
              Narration Voice
            </label>
            <select
              id="voiceSelect"
              value={currentVoice}
              onChange={(e) => onVoiceChange(e.target.value as VoiceName)}
              className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-white appearance-none font-normal" 
              style={{ lineHeight: '1.5' }} 
            >
              {voicesList.map(voice => (
                <option 
                  key={voice.name} 
                  value={voice.name} 
                  className="py-2 px-1 bg-slate-700 text-white hover:bg-slate-600 font-normal" 
                  style={{ lineHeight: '1.5' }} 
                >
                  {voice.name} — {voice.characteristics} ({voice.gender})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="languageSelect" className="block text-sm font-medium text-slate-300 mb-1"> 
              Language for Prompt <span className="text-xs text-slate-400 font-normal">(Influences generated text & voice tone)</span>
            </label>
            <select
              id="languageSelect"
              value={currentLanguage}
              onChange={(e) => onLanguageChange(e.target.value as LanguageCode)}
              className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-white appearance-none font-normal" 
               style={{ lineHeight: '1.5' }}
            >
              {languagesList.map(lang => (
                <option 
                  key={lang.code} 
                  value={lang.code}
                  className="py-2 px-1 bg-slate-700 text-white hover:bg-slate-600 font-normal" 
                  style={{ lineHeight: '1.5' }}
                >
                  {lang.name}
                </option>
              ))}
            </select>
             <p className="text-xs text-slate-500 mt-1 font-normal">The selected voice might also influence the accent and language style.</p> 
          </div>
          
          <div>
            <label htmlFor="muteToggle" className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium text-slate-300">Mute All Narration</span> 
              <div className="relative">
                <input 
                  type="checkbox" 
                  id="muteToggle" 
                  className="sr-only" 
                  checked={isMuted}
                  onChange={(e) => onMuteChange(e.target.checked)}
                />
                <div className={`block w-10 h-6 rounded-full transition-colors ${isMuted ? 'bg-sky-600' : 'bg-slate-600'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isMuted ? 'translate-x-4' : ''}`}></div>
              </div>
            </label>
          </div>

          <hr className="border-slate-700"/>

          <div>
            <label htmlFor="musicEnableToggle" className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium text-slate-300">
                    Generative Background Music
                    <span className="block text-xs text-slate-400 font-normal">
                        (Experimental - Lyria API)
                    </span>
                </span>
                <div className="relative">
                    <input 
                        type="checkbox" 
                        id="musicEnableToggle" 
                        className="sr-only" 
                        checked={isMusicEnabled}
                        onChange={(e) => onMusicEnableChange(e.target.checked)}
                    />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${isMusicEnabled ? 'bg-teal-500' : 'bg-slate-600'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isMusicEnabled ? 'translate-x-4' : ''}`}></div>
                </div>
            </label>
            {isMusicEnabled && (
                <p className="text-xs text-slate-500 mt-1 font-normal">
                    Music status: <span className={`font-semibold ${
                        musicSessionState === 'PLAYING' ? 'text-green-400' : 
                        musicSessionState === 'ERROR' ? 'text-red-400' : 
                        musicSessionState === 'CONNECTING' ? 'text-yellow-400' : 'text-slate-400'
                    }`}>{musicSessionState}</span>. 
                    This feature is experimental and may have limitations or costs.
                </p>
            )}
          </div>

        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-800" 
            title="Done"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
