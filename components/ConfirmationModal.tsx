import React from 'react';

interface ConfirmationModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  title, 
  message, 
  onConfirm, 
  onClose, 
  confirmText = "Proceed", 
  cancelText = "Cancel" 
}) => {
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-[3vw] font-normal"
      onClick={onClose} 
      aria-modal="true"
      role="dialog"
      aria-labelledby="confirmation-title"
    >
      <div 
        className="bg-slate-800 p-[3vw] sm:p-[4vw] rounded-xl shadow-2xl w-full max-w-[90vw] sm:max-w-md transform transition-all"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center mb-[1.5vh] sm:mb-[2.5vh]">
          <h2 id="confirmation-title" className="text-[clamp(1rem,2.8vh,1.6rem)] font-bold text-amber-400">{title}</h2>
          <button 
            onClick={onClose} 
            className="p-[0.5vh] rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            aria-label="Close confirmation"
            title={cancelText}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-[3vh] w-[3vh] max-h-6 max-w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-[1vh] sm:space-y-[1.5vh] text-slate-300 max-h-[60vh] overflow-y-auto scrollbar-thin pr-[0.5vw] sm:pr-[1vw]">
          <p className="text-[clamp(0.75rem,2.2vh,1rem)] whitespace-pre-wrap font-normal">{message}</p>
        </div>

        <div className="mt-[2.5vh] sm:mt-[4vh] flex justify-end space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="px-[2vw] py-[1vh] text-[clamp(0.7rem,2vh,0.9rem)] font-normal text-slate-300 bg-slate-600 hover:bg-slate-500 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
            title={cancelText}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-[2.5vw] py-[1.2vh] sm:px-[3vw] sm:py-[1.5vh] text-[clamp(0.8rem,2.3vh,1.1rem)] font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-800"
            title={confirmText}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
