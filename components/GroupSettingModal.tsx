
import React from 'react';
import { SocialContext, GroupSettingOption, AgeFilters, IntensityLevel, ALL_INTENSITY_LEVELS_INFO } from '../services/geminiService';

interface GroupSettingModalProps {
  currentSetting: SocialContext;
  onSettingChange: (setting: SocialContext) => void;
  onClose: () => void;
  groupSettingsOptions: GroupSettingOption[];
  disabled?: boolean;
  ageFilters: AgeFilters;
  onAgeFilterChange: (newFilters: AgeFilters) => void;
  selectedIntensityFilters: IntensityLevel[];
  onIntensityFilterChange: (newFilters: IntensityLevel[]) => void;
}

export const GroupSettingModal: React.FC<GroupSettingModalProps> = ({
  currentSetting,
  onSettingChange,
  onClose,
  groupSettingsOptions,
  disabled = false,
  ageFilters,
  onAgeFilterChange,
  selectedIntensityFilters,
  onIntensityFilterChange,
}) => {

  const handleAgeToggle = (filter: keyof AgeFilters) => {
    if (disabled) return;
    onAgeFilterChange({
      ...ageFilters,
      [filter]: !ageFilters[filter],
    });
  };

  const handleIntensityToggle = (level: IntensityLevel) => {
    if (disabled) return;
    const newFilters = selectedIntensityFilters.includes(level)
      ? selectedIntensityFilters.filter(l => l !== level)
      : [...selectedIntensityFilters, level];
    onIntensityFilterChange(newFilters);
  };

  const AgeFilterButton: React.FC<{
    label: string;
    filterKey: keyof AgeFilters;
  }> = ({ label, filterKey }) => (
    <button
      onClick={() => handleAgeToggle(filterKey)}
      disabled={disabled}
      className={`w-full p-2 text-[clamp(0.7rem,2vh,0.9rem)] rounded-md transition-all duration-150 ease-in-out
                flex items-center justify-center space-x-2
                ${ageFilters[filterKey]
                  ? 'bg-emerald-500 text-white font-bold ring-1 ring-emerald-300' 
                  : `bg-slate-600 hover:bg-slate-500 text-slate-200 font-normal 
                     ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:shadow-sm'}`
                }
                ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
      aria-pressed={ageFilters[filterKey]}
    >
      <div className={`w-4 h-4 rounded-sm border-2 ${ageFilters[filterKey] ? 'bg-white border-white' : 'border-slate-400'} flex items-center justify-center`}>
        {ageFilters[filterKey] && <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-emerald-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
      </div>
      <span>{label}</span>
    </button>
  );


  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-[3vw] font-normal"
      onClick={onClose} 
      aria-modal="true"
      role="dialog"
      aria-labelledby="group-setting-title"
    >
      <div 
        className="bg-slate-800 p-[3vw] sm:p-[4vw] rounded-xl shadow-2xl w-full max-w-[calc(100vw-6vw)] sm:max-w-xl md:max-w-2xl transform transition-all"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center mb-[1.5vh] sm:mb-[2.5vh]">
          <h2 id="group-setting-title" className="text-[clamp(1rem,2.8vh,1.6rem)] font-bold text-sky-400">Context & Settings</h2>
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

        <div className="space-y-6 max-h-[65vh] overflow-y-auto scrollbar-thin pr-2">
            <div>
              <h3 className="text-[clamp(0.8rem,2.2vh,1.1rem)] font-bold text-slate-300 mb-3">Group Setting</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {groupSettingsOptions.map(settingOption => {
                  const isRomanticAndMinors = settingOption.id === 'ROMANTIC' && (ageFilters.kids || ageFilters.teens);
                  const isDisabled = disabled || isRomanticAndMinors;
                  return (
                    <button
                      key={settingOption.id}
                      onClick={() => {
                        if (!isDisabled) {
                          onSettingChange(settingOption.id);
                        }
                      }}
                      disabled={isDisabled}
                      className={`w-full p-4 text-[clamp(0.7rem,2vh,0.95rem)] rounded-lg transition-all duration-150 ease-in-out focus:outline-none text-left
                                  flex flex-col items-start h-full
                                  ${currentSetting === settingOption.id && !isDisabled
                                    ? 'bg-sky-500 text-white font-bold ring-2 ring-sky-300 ring-offset-2 ring-offset-slate-800 shadow-lg' 
                                    : `bg-slate-700 text-slate-200 font-normal 
                                        ${isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-slate-600 hover:shadow-md focus:ring-2 focus:ring-sky-500 focus:ring-offset-1 focus:ring-offset-slate-800'}`
                                  }`}
                      aria-pressed={currentSetting === settingOption.id}
                      title={isRomanticAndMinors ? "Romantic setting is disabled when 'Kids' or 'Teens' are selected" : settingOption.description}
                    >
                      <span className="font-bold text-base">{settingOption.label}</span>
                      <span className={`text-xs ${currentSetting === settingOption.id && !isDisabled ? 'text-sky-100' : 'text-slate-400'} font-normal mt-auto pt-2 leading-snug`}>{settingOption.description}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="border-t border-slate-700/80 pt-6">
                <h3 className="text-[clamp(0.8rem,2.2vh,1.1rem)] font-bold text-slate-300 mb-3">Depth</h3>
                <div className="grid grid-cols-5 gap-2 sm:gap-3">
                    {ALL_INTENSITY_LEVELS_INFO.map(levelInfo => (
                        <button
                            key={levelInfo.id}
                            onClick={() => handleIntensityToggle(levelInfo.id)}
                            disabled={disabled}
                            title={levelInfo.description}
                            className={`w-full p-2 text-xs sm:text-sm rounded-lg transition-all duration-150 ease-in-out focus:outline-none flex flex-col items-center justify-center space-y-1 aspect-square
                                ${selectedIntensityFilters.includes(levelInfo.id)
                                ? 'bg-sky-500 text-white font-bold ring-2 ring-sky-300 ring-offset-2 ring-offset-slate-800 shadow-lg'
                                : `bg-slate-700 text-slate-200 font-normal ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-slate-600'}`
                                }`}
                            aria-pressed={selectedIntensityFilters.includes(levelInfo.id)}
                        >
                            <span className="text-xl sm:text-2xl" aria-hidden="true">{levelInfo.emoji}</span>
                            <span className="font-bold">{levelInfo.id}</span>
                        </button>
                    ))}
                </div>
                <p className="text-xs text-slate-400 mt-3">Select all depth levels you are open to exploring. This filters the available decks.</p>
            </div>


            <div className="border-t border-slate-700/80 pt-6">
               <h3 className="text-[clamp(0.8rem,2.2vh,1.1rem)] font-bold text-slate-300 mb-3">Age Suitability</h3>
               <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <AgeFilterButton label="Adults" filterKey="adults" />
                  <AgeFilterButton label="Teens (12-17)" filterKey="teens" />
                  <AgeFilterButton label="Kids (5-11)" filterKey="kids" />
               </div>
                <p className="text-xs text-slate-400 mt-3">Select all that apply. This hides decks with mature themes for younger audiences.</p>
            </div>
        </div>

      </div>
    </div>
  );
};
