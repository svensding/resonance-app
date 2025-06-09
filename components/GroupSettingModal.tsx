
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
      className="fixed inset-0 flex items-center justify-center z-50 p-[3vw] font-normal" // Base font set on body
      onClick={onClose} 
      aria-modal="true"
      role="dialog"
      aria-labelledby="group-setting-title"
    >
      <div 
        className="bg-slate-800 p-[3vw] sm:p-[4vw] rounded-xl shadow-2xl w-full max-w-[90vw] sm:max-w-[70vw] md:max-w-lg transform transition-all"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center mb-[2vh] sm:mb-[3vh]">
          <h2 id="group-setting-title" className="text-[clamp(1.1rem,3vh,1.75rem)] font-bold text-sky-400">Choose Group Setting</h2>
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

        <div className="space-y-[1vh] sm:space-y-[1.5vh]">
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
              className={`w-full px-[2vw] py-[1.2vh] sm:px-[2.5vw] sm:py-[1.5vh] text-[clamp(0.75rem,2.2vh,1rem)] rounded-lg transition-all duration-150 ease-in-out focus:outline-none text-left
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
              <span className="font-normal">{settingOption.label}</span> {/* Use normal for label, bold for selected button */}
              <span className={`text-[clamp(0.6rem,1.8vh,0.85rem)] ${currentSetting === settingOption.id ? 'text-sky-100' : 'text-slate-400'} font-normal mt-[0.3vh]`}>{settingOption.description}</span>
            </button>
          ))}
        </div>

        <div className="mt-[3vh] sm:mt-[4vh] flex justify-end">
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