

import React from 'react';
import { VoiceName, LanguageCode, VoiceOption, LanguageOption } from '../services/geminiService';
import { MusicSessionState } from '../services/musicService'; 

interface VoiceSettingsModalProps {
  currentVoice: VoiceName;
  currentLanguage: LanguageCode;
  isMuted: boolean;
  isMusicEnabled: boolean; 
  musicVolume: number; 
  onMusicVolumeChange: (volume: number) => void; 
  musicSessionState: MusicSessionState; 
  onVoiceChange: (voice: VoiceName) => void;
  onLanguageChange: (language: LanguageCode) => void;
  onMuteChange: (muted: boolean) => void;
  onMusicEnableChange: (enabled: boolean) => void; 
  onClose: () => void;
  voicesList: VoiceOption[];
  languagesList: LanguageOption[];
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  currentVoice,
  currentLanguage,
  isMuted,
  isMusicEnabled,
  musicVolume,
  onMusicVolumeChange,
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
      className="fixed inset-0 flex items-center justify-center z-50 p-[3vw] font-normal" 
      onClick={onClose} 
      aria-modal="true"
      role="dialog"
      aria-labelledby="voice-settings-title"
    >
      <div 
        className="bg-slate-800 p-[3vw] sm:p-[4vw] rounded-xl shadow-2xl w-full max-w-[90vw] sm:max-w-[70vw] md:max-w-lg transform transition-all"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center mb-[2vh] sm:mb-[3vh]">
          <h2 id="voice-settings-title" className="text-[clamp(1.1rem,3vh,1.75rem)] font-semibold text-sky-400">Voice & Audio Settings</h2>
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

        <div className="space-y-[1.8vh] sm:space-y-[2.2vh]">
          <div>
            <label htmlFor="voiceSelect" className="block text-[clamp(0.7rem,2vh,0.9rem)] font-medium text-slate-300 mb-[0.5vh]"> 
              Narration Voice
            </label>
            <select
              id="voiceSelect"
              value={currentVoice}
              onChange={(e) => onVoiceChange(e.target.value as VoiceName)}
              className="w-full px-[1.5vw] py-[1vh] text-[clamp(0.75rem,2.2vh,1rem)] bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-white appearance-none font-normal" 
              style={{ lineHeight: '1.5' }} 
            >
              {voicesList.map(voice => (
                <option 
                  key={voice.name} 
                  value={voice.name} 
                  className="py-[0.8vh] px-[0.5vw] bg-slate-700 text-white hover:bg-slate-600 font-normal" 
                  style={{ lineHeight: '1.5' }} 
                >
                  {voice.name} — {voice.characteristics} ({voice.gender})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="languageSelect" className="block text-[clamp(0.7rem,2vh,0.9rem)] font-medium text-slate-300 mb-[0.5vh]"> 
              Language for Prompt <span className="text-[clamp(0.6rem,1.8vh,0.8rem)] text-slate-400 font-normal">(Influences generated text & voice tone)</span>
            </label>
            <select
              id="languageSelect"
              value={currentLanguage}
              onChange={(e) => onLanguageChange(e.target.value as LanguageCode)}
              className="w-full px-[1.5vw] py-[1vh] text-[clamp(0.75rem,2.2vh,1rem)] bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-white appearance-none font-normal" 
               style={{ lineHeight: '1.5' }}
            >
              {languagesList.map(lang => (
                <option 
                  key={lang.code} 
                  value={lang.code}
                  className="py-[0.8vh] px-[0.5vw] bg-slate-700 text-white hover:bg-slate-600 font-normal" 
                  style={{ lineHeight: '1.5' }}
                >
                  {lang.name}
                </option>
              ))}
            </select>
             <p className="text-[clamp(0.6rem,1.7vh,0.8rem)] text-slate-500 mt-[0.5vh] font-normal">The selected voice might also influence the accent and language style.</p> 
          </div>
          
          <div>
            <label htmlFor="muteToggle" className="flex items-center justify-between cursor-pointer py-[0.5vh]">
              <span className="text-[clamp(0.7rem,2vh,0.9rem)] font-medium text-slate-300">Mute All Narration</span> 
              <div className="relative">
                <input 
                  type="checkbox" 
                  id="muteToggle" 
                  className="sr-only" 
                  checked={isMuted}
                  onChange={(e) => onMuteChange(e.target.checked)}
                />
                <div className={`block w-[5vw] h-[2.8vh] max-w-[2.5rem] max-h-[1.4rem] rounded-full transition-colors ${isMuted ? 'bg-sky-600' : 'bg-slate-600'}`}></div>
                <div className={`dot absolute left-[0.4vh] top-[0.4vh] bg-white w-[2vh] h-[2vh] max-w-[1rem] max-h-[1rem] rounded-full transition-transform ${isMuted ? 'translate-x-[2.2vw] sm:translate-x-[calc(5vw-2.8vh)] max-sm:translate-x-[calc(5vw-2.4vh)]' : ''}`}></div>
              </div>
            </label>
          </div>

          <hr className="border-slate-700"/>

          <div>
            <label htmlFor="musicEnableToggle" className="flex items-center justify-between cursor-pointer py-[0.5vh]">
                <span className="text-[clamp(0.7rem,2vh,0.9rem)] font-medium text-slate-300">
                    Generative Background Music
                    <span className="block text-[clamp(0.6rem,1.8vh,0.8rem)] text-slate-400 font-normal">
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
                    <div className={`block w-[5vw] h-[2.8vh] max-w-[2.5rem] max-h-[1.4rem] rounded-full transition-colors ${isMusicEnabled ? 'bg-teal-500' : 'bg-slate-600'}`}></div>
                    <div className={`dot absolute left-[0.4vh] top-[0.4vh] bg-white w-[2vh] h-[2vh] max-w-[1rem] max-h-[1rem] rounded-full transition-transform ${isMusicEnabled ? 'translate-x-[2.2vw] sm:translate-x-[calc(5vw-2.8vh)] max-sm:translate-x-[calc(5vw-2.4vh)]' : ''}`}></div>
                </div>
            </label>
            {isMusicEnabled && (
                <div className="mt-[1vh] space-y-[0.5vh]">
                    <p className="text-[clamp(0.6rem,1.8vh,0.8rem)] text-slate-500 font-normal">
                        Music status: <span className={`font-semibold ${
                            musicSessionState === 'PLAYING' ? 'text-green-400' : 
                            musicSessionState === 'ERROR' ? 'text-red-400' : 
                            musicSessionState === 'CONNECTING' || musicSessionState === 'LOADING_BUFFER' ? 'text-yellow-400' : 'text-slate-400'
                        }`}>{musicSessionState}</span>.
                    </p>
                    <div className="flex items-center space-x-[1vw]">
                        <label htmlFor="musicVolumeSlider" className="text-[clamp(0.6rem,1.8vh,0.8rem)] text-slate-400 font-normal whitespace-nowrap">Volume:</label>
                        <input
                            type="range"
                            id="musicVolumeSlider"
                            min="0"
                            max="1"
                            step="0.01"
                            value={musicVolume}
                            onChange={(e) => onMusicVolumeChange(parseFloat(e.target.value))}
                            className="w-full h-[1vh] max-h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!isMusicEnabled || isMuted}
                        />
                        <span className="text-[clamp(0.6rem,1.8vh,0.8rem)] text-slate-400 font-normal w-[5vw] max-w-[2.5rem] text-right">{Math.round(musicVolume * 100)}%</span>
                    </div>
                     <p className="text-[clamp(0.55rem,1.6vh,0.75rem)] text-slate-500 font-normal mt-[0.5vh]">
                        This feature is experimental and may have limitations or costs. Muting narration also mutes music.
                    </p>
                </div>
            )}
          </div>

        </div>

        <div className="mt-[3vh] sm:mt-[4vh] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-[2vw] py-[1vh] text-[clamp(0.7rem,2vh,0.9rem)] font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-800" 
            title="Done"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
