

import React from 'react';
import { GroupSetting, GroupSettingOption } from '../services/geminiService';

interface GroupSettingModalProps {
  currentSetting: GroupSetting;
  onSettingChange: (setting: GroupSetting) => void;
  onClose: () => void;
  groupSettingsOptions: GroupSettingOption[];
  disabled?: boolean;
}

export const GroupSettingModal: React.FC<GroupSettingModalProps> = ({
  currentSetting,
  onSettingChange,
  onClose,
  groupSettingsOptions,
  disabled = false,
}) => {
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-[3vw] font-normal"
      onClick={onClose} 
      aria-modal="true"
      role="dialog"
      aria-labelledby="group-setting-title"
    >
      <div 
        className="bg-slate-800 p-[3vw] sm:p-[4vw] rounded-xl shadow-2xl w-full max-w-[calc(100vw-6vw)] sm:max-w-xs md:max-w-sm transform transition-all"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center mb-[1.5vh] sm:mb-[2.5vh]">
          <h2 id="group-setting-title" className="text-[clamp(1rem,2.8vh,1.6rem)] font-bold text-sky-400">Choose Group Setting</h2>
          <button 
            onClick={onClose} 
            className="p-[0.5vh] rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            aria-label="Close group setting selection"
            title="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-[3vh] w-[3vh] max-h-6 max-w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-[0.8vh] sm:space-y-[1.2vh] max-h-[60vh] overflow-y-auto scrollbar-thin">
          {groupSettingsOptions.map(settingOption => (
            <button
              key={settingOption.id}
              onClick={() => {
                if (!disabled) {
                  onSettingChange(settingOption.id);
                  onClose(); 
                }
              }}
              disabled={disabled}
              className={`w-full px-[2vw] py-[1vh] sm:px-[2vw] sm:py-[1.2vh] text-[clamp(0.7rem,2vh,0.95rem)] rounded-lg transition-all duration-150 ease-in-out focus:outline-none text-left
                          flex flex-col
                          ${currentSetting === settingOption.id
                            ? 'bg-sky-500 text-white font-bold ring-2 ring-sky-300 ring-offset-2 ring-offset-slate-800 shadow-lg' 
                            : `bg-slate-700 hover:bg-slate-600 text-slate-200 font-normal 
                               ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:shadow-md focus:ring-2 focus:ring-sky-500 focus:ring-offset-1 focus:ring-offset-slate-800'}`
                          }
                          ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
              aria-pressed={currentSetting === settingOption.id}
              title={settingOption.description}
            >
              <span className="font-normal">{settingOption.label}</span>
              <span className={`text-[clamp(0.55rem,1.7vh,0.8rem)] ${currentSetting === settingOption.id ? 'text-sky-100' : 'text-slate-400'} font-normal mt-[0.2vh] leading-snug`}>{settingOption.description}</span>
            </button>
          ))}
        </div>

        <div className="mt-[2.5vh] sm:mt-[3.5vh] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-[2vw] py-[1vh] text-[clamp(0.7rem,2vh,0.9rem)] font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-800"
            title="Done"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
