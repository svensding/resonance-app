
import React, { useState } from 'react';
import { GroupSetting, GROUP_SETTINGS } from '../services/geminiService';

export interface Participant {
  id: string;
  name: string;
}

interface BottomToolbarProps {
  participants: Participant[];
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  activeParticipantId: string | null;
  setActiveParticipantId: (id: string | null) => void;
  onRemoveParticipant: (participantId: string) => void;
  groupSetting: GroupSetting;
  onOpenGroupSettingModal: () => void; 
  onOpenVoiceSettingsModal: () => void;
  onOpenDevLog: () => void;
  disabled?: boolean;
  showDevLogButton?: boolean;
}

export const BottomToolbar: React.FC<BottomToolbarProps> = ({ 
  participants, setParticipants, activeParticipantId, setActiveParticipantId, onRemoveParticipant, 
  groupSetting, onOpenGroupSettingModal, onOpenVoiceSettingsModal, onOpenDevLog, disabled, showDevLogButton = false 
}) => {
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [currentEditName, setCurrentEditName] = useState('');

  const handleAddParticipant = () => {
    if (disabled || participants.length >= 10) return;
    const newParticipantId = `participant-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setParticipants(prev => [...prev, { id: newParticipantId, name: '' }]);
    setActiveParticipantId(newParticipantId); 
    setEditingNameId(newParticipantId);  
    setCurrentEditName('');
  };

  const handleParticipantNameChange = (participantId: string, newName: string) => {
    setParticipants(prev => prev.map(p => p.id === participantId ? { ...p, name: newName } : p));
  };
  
  const handleNameInputBlur = (participantId: string) => {
    setEditingNameId(null);
  };

  const handleNameInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, participantId: string) => {
    if (event.key === 'Enter') {
      handleNameInputBlur(participantId);
    }
  };

  const startEditing = (participant: Participant) => {
    if (disabled) return;
    setEditingNameId(participant.id);
    setCurrentEditName(participant.name);
    setActiveParticipantId(participant.id); 
  };

  const removeParticipantHandler = (e: React.MouseEvent, participantId: string) => {
    e.stopPropagation(); 
    if (disabled) return;
    onRemoveParticipant(participantId);
  };

  const currentGroupSettingLabel = GROUP_SETTINGS.find(s => s.id === groupSetting)?.label || 'Setting';
  const isSoloMode = groupSetting === 'SOLO';
  const showSubduedAddButton = participants.length === 1 && participants[0].name.trim() === '' && !isSoloMode;

  return (
    <div className="px-2 sm:px-4 py-2 flex items-center justify-between space-x-2 md:space-x-4 w-full overflow-hidden font-normal">
        <div className="flex items-center space-x-2 md:space-x-3 overflow-x-auto scrollbar-thin flex-1">
            <button
                onClick={onOpenGroupSettingModal}
                disabled={disabled}
                className={`px-3 py-2 text-sm rounded-md transition-all duration-150 ease-in-out focus:outline-none whitespace-nowrap flex-shrink-0
                            bg-slate-600 hover:bg-slate-500 text-slate-200 font-normal shadow-sm
                            ${disabled ? 'cursor-not-allowed opacity-70' : 'hover:shadow-md focus:ring-2 focus:ring-sky-400 focus:ring-offset-1 focus:ring-offset-slate-800'}`}
                aria-label={`Current group setting: ${currentGroupSettingLabel}. Click to change.`}
                title={`Group Setting: ${currentGroupSettingLabel}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="inline-block h-4 w-4 mr-1.5 -ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="hidden xs:inline">Setting: </span>{currentGroupSettingLabel}
            </button>

            <div className="h-6 w-px bg-slate-600/70 flex-shrink-0"></div>

            <div className="flex items-center space-x-1 sm:space-x-2 flex-nowrap">
                {participants.filter((_, index) => !isSoloMode || index === 0).map((participant) => {
                const isUnnamed = participant.name.trim() === '';
                return (
                <div key={participant.id} className="flex-shrink-0 flex items-center space-x-1 sm:space-x-1.5">
                    {editingNameId === participant.id ? (
                    <input
                        type="text"
                        value={currentEditName}
                        onChange={(e) => {
                            setCurrentEditName(e.target.value);
                            handleParticipantNameChange(participant.id, e.target.value);
                        }}
                        onBlur={() => handleNameInputBlur(participant.id)}
                        onKeyDown={(e) => handleNameInputKeyDown(e, participant.id)}
                        placeholder="Set Name"
                        className={`px-3 py-1.5 text-sm rounded-md shadow-sm text-white w-28 sm:w-32 font-normal transition-colors duration-200
                        bg-transparent border border-slate-700 placeholder-slate-500
                        focus:bg-slate-700 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500
                        ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
                        autoFocus
                        disabled={disabled}
                        title="Enter participant name"
                    />
                    ) : (
                    <button
                        onClick={() => startEditing(participant)}
                        disabled={disabled}
                        className={`px-3 py-1.5 text-sm rounded-md transition-colors duration-150 truncate w-28 sm:w-32
                                    ${activeParticipantId === participant.id 
                                        ? 'bg-sky-500 text-white font-bold ring-1 sm:ring-2 ring-sky-300 ring-offset-1 ring-offset-slate-800' 
                                        : isUnnamed
                                        ? 'bg-slate-800/20 border border-slate-700 text-slate-400 font-normal hover:bg-slate-700'
                                        : 'bg-slate-600 hover:bg-slate-500 text-slate-200 font-normal'
                                    }
                                    ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
                        title={isUnnamed ? "Click to set participant name" : `Participant: ${participant.name.trim()}`}
                    >
                        {participant.name.trim() || "Set Name"}
                    </button>
                    )}
                    { (participants.length > 1 && !isSoloMode) && 
                        <button
                        onClick={(e) => removeParticipantHandler(e, participant.id)}
                        disabled={disabled}
                        className={`p-1.5 sm:p-2 rounded-full text-slate-400 transition-colors duration-150 flex-shrink-0
                                    ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-slate-500 hover:text-white'}`}
                        aria-label={`Remove participant ${participant.name.trim() || 'Set Name'}`}
                        title={`Remove participant ${participant.name.trim() || '(unnamed)'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    }
                </div>
                )})}
            </div>
            {!isSoloMode && (
              <button
                  onClick={handleAddParticipant}
                  disabled={disabled || participants.length >= 10} 
                  className={`p-2 sm:p-2.5 rounded-full text-white transition-colors duration-150 flex-shrink-0
                              ${disabled || participants.length >= 10 
                                  ? 'bg-slate-500 cursor-not-allowed opacity-70' 
                                  : showSubduedAddButton
                                  ? 'bg-slate-600/80 hover:bg-sky-600'
                                  : 'bg-sky-600 hover:bg-sky-500'}`}
                  aria-label="Add new participant"
                  title="Add new participant"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
              </button>
            )}
        </div>

        <div className="flex-shrink-0 flex items-center space-x-2 sm:space-x-3">
            <button
                onClick={onOpenVoiceSettingsModal}
                disabled={disabled}
                className={`p-2 rounded-full text-slate-400 transition-colors duration-150
                            ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-slate-600 hover:text-white'}`}
                aria-label="Open Voice and Audio Settings"
                title="Voice & Audio Settings"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
            </button>
            {showDevLogButton && (
                <button
                    onClick={onOpenDevLog}
                    disabled={disabled}
                    className={`p-2 rounded-full text-slate-400 transition-colors duration-150
                                ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-slate-600 hover:text-white'}`}
                    aria-label="Open Developer Log"
                    title="Developer Log"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.25278C12 6.25278 6.75 3 4.5 3C2.25 3 1.5 4.5 1.5 6.75C1.5 9 3.75 12 6.75 12H17.25C20.25 12 22.5 9 22.5 6.75C22.5 4.5 21.75 3 19.5 3C17.25 3 12 6.25278 12 6.25278Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 12V21" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 15L4.5 18" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 15L19.5 18" />
                    </svg>
                </button>
            )}
        </div>
    </div>
  );
};
