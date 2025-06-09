
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
      className="fixed inset-0 flex items-center justify-center z-50 p-4 font-normal"
      onClick={onClose} 
      aria-modal="true"
      role="dialog"
      aria-labelledby="group-setting-title"
    >
      <div 
        className="bg-slate-800 p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-md transform transition-all"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="group-setting-title" className="text-xl sm:text-2xl font-semibold text-sky-400">Choose Group Setting</h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            aria-label="Close group setting selection"
            title="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
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
              className={`w-full px-4 py-3 text-sm sm:text-base rounded-lg transition-all duration-150 ease-in-out focus:outline-none text-left
                          flex flex-col
                          ${currentSetting === settingOption.id
                            ? 'bg-sky-500 text-white font-semibold ring-2 ring-sky-300 ring-offset-2 ring-offset-slate-800 shadow-lg' 
                            : `bg-slate-700 hover:bg-slate-600 text-slate-200 font-normal 
                               ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:shadow-md focus:ring-2 focus:ring-sky-500 focus:ring-offset-1 focus:ring-offset-slate-800'}`
                          }
                          ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
              aria-pressed={currentSetting === settingOption.id}
              title={settingOption.description}
            >
              <span className="font-medium">{settingOption.label}</span>
              <span className={`text-xs ${currentSetting === settingOption.id ? 'text-sky-100' : 'text-slate-400'} font-normal mt-0.5`}>{settingOption.description}</span>
            </button>
          ))}
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
