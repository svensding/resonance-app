
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
  onOpenGroupSettingModal: () => void; // Changed from setGroupSetting
  disabled?: boolean; 
}

export const BottomToolbar: React.FC<BottomToolbarProps> = ({ 
  participants, setParticipants, activeParticipantId, setActiveParticipantId, onRemoveParticipant, 
  groupSetting, onOpenGroupSettingModal, disabled 
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

  return (
    <div className="px-1 py-1 xs:px-1.5 sm:px-2 md:px-4 sm:py-1.5 flex items-center space-x-1 xs:space-x-1.5 sm:space-x-2 md:space-x-3 w-full overflow-x-auto scrollbar-thin">
      {/* Group Setting Button */}
      <button
        onClick={onOpenGroupSettingModal}
        disabled={disabled}
        className={`px-2 py-1 text-[0.6rem] xs:px-2.5 xs:py-1.5 xs:text-xs sm:text-sm rounded-md transition-all duration-150 ease-in-out focus:outline-none whitespace-nowrap flex-shrink-0
                    bg-slate-600 hover:bg-slate-500 text-slate-200 font-semibold shadow-sm
                    ${disabled ? 'cursor-not-allowed opacity-70' : 'hover:shadow-md focus:ring-2 focus:ring-sky-400 focus:ring-offset-1 focus:ring-offset-slate-800'}`}
        aria-label={`Current group setting: ${currentGroupSettingLabel}. Click to change.`}
        title={`Group Setting: ${currentGroupSettingLabel}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="inline-block h-3 w-3 mr-1 -ml-0.5 xs:h-3.5 xs:w-3.5 sm:mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <span className="hidden xs:inline">Setting: </span>{currentGroupSettingLabel}
      </button>

      {/* Separator */}
      <div className="h-4 sm:h-5 w-px bg-slate-600/70 flex-shrink-0"></div>


      {/* Participant Management */}
      <div className="flex items-center space-x-0.5 xs:space-x-1 sm:space-x-2 flex-nowrap">
        {participants.map((participant) => (
          <div key={participant.id} className="flex-shrink-0 flex items-center space-x-0.5 xs:space-x-1">
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
                placeholder="Name"
                className={`px-1.5 py-0.5 text-[0.65rem] xs:px-2 xs:py-1 xs:text-xs sm:text-sm bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-white w-16 xs:w-20 sm:w-24 md:w-28 font-normal ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
                autoFocus
                disabled={disabled}
                title="Enter participant name"
              />
            ) : (
              <button
                onClick={() => startEditing(participant)}
                disabled={disabled}
                className={`px-1.5 py-0.5 text-[0.65rem] xs:px-2 xs:py-1 xs:text-xs sm:text-sm rounded-md transition-colors duration-150
                            ${activeParticipantId === participant.id ? 'bg-sky-500 text-white font-semibold ring-1 xs:ring-2 ring-sky-300 ring-offset-1 ring-offset-slate-800' : 'bg-slate-600 hover:bg-slate-500 text-slate-200 font-normal'}
                            truncate w-16 xs:w-20 sm:w-24 md:w-28 ${disabled ? 'cursor-not-allowed opacity-70' : 'hover:bg-slate-500'}`}
                title={participant.name.trim() ? `Participant: ${participant.name.trim()}` : "Click to set participant name"}
              >
                {participant.name.trim() || "Set Name"}
              </button>
            )}
            { (participants.length > 0) && 
                <button
                onClick={(e) => removeParticipantHandler(e, participant.id)}
                disabled={disabled}
                className={`p-0.5 xs:p-1 rounded-full text-slate-400 transition-colors duration-150 flex-shrink-0
                            ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-slate-500 hover:text-white'}`}
                aria-label={`Remove participant ${participant.name.trim() || 'Set Name'}`}
                title={`Remove participant ${participant.name.trim() || '(unnamed)'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 xs:h-3.5 xs:w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            }
          </div>
        ))}
      </div>
      <button
        onClick={handleAddParticipant}
        disabled={disabled || participants.length >= 10} 
        className={`p-1 xs:p-1.5 sm:p-2 rounded-full bg-sky-600 text-white transition-colors duration-150 ml-auto flex-shrink-0
                    ${disabled || participants.length >= 10 ? 'bg-slate-500 cursor-not-allowed opacity-70' : 'hover:bg-sky-500'}`}
        aria-label="Add new participant"
        title="Add new participant"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
};