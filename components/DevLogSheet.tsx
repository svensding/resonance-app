
import React, { useState, useEffect, useRef } from 'react';

export interface DevLogEntry {
    type: 'chat-front' | 'chat-back' | 'tts' | 'session-init' | 'user-feedback';
    requestTimestamp: number;
    responseTimestamp: number;
    data: {
        input: any;
        output: any;
        error?: string | null;
    }
}

interface DevLogSheetProps {
    history: DevLogEntry[];
    onClose: () => void;
}

const DevLogSheetComponent: React.FC<DevLogSheetProps> = ({ history, onClose }) => {
    const [copyButtonText, setCopyButtonText] = useState('Copy');
    const mainContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (mainContentRef.current) {
            mainContentRef.current.scrollTop = mainContentRef.current.scrollHeight;
        }
    }, [history]);

    const handleExport = () => {
        const dataStr = JSON.stringify(history, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `resonance-log-${new Date().toISOString()}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const handleCopy = () => {
        const dataStr = JSON.stringify(history, null, 2);
        navigator.clipboard.writeText(dataStr).then(() => {
            setCopyButtonText('Copied!');
            setTimeout(() => setCopyButtonText('Copy'), 2000);
        }, (err) => {
            console.error('Could not copy text: ', err);
            setCopyButtonText('Failed!');
            setTimeout(() => setCopyButtonText('Copy'), 2000);
        });
    };
    
    const getEntryStyles = (type: DevLogEntry['type']) => {
        switch(type) {
            case 'chat-front': return { bg: 'bg-slate-800', border: 'border-slate-600', text: 'text-slate-400', title: 'Card Front Generation' };
            case 'chat-back': return { bg: 'bg-slate-800/60', border: 'border-slate-700', text: 'text-slate-500', title: 'Card Back Generation' };
            case 'tts': return { bg: 'bg-sky-900/40', border: 'border-sky-700', text: 'text-sky-400', title: 'TTS Audio Generation' };
            case 'session-init': return { bg: 'bg-purple-900/40', border: 'border-purple-700', text: 'text-purple-400', title: 'Session Initialization' };
            case 'user-feedback': return { bg: 'bg-amber-900/40', border: 'border-amber-700', text: 'text-amber-400', title: 'User Feedback Sent' };
            default: return { bg: 'bg-gray-800', border: 'border-gray-600', text: 'text-gray-400', title: 'Log Entry' };
        }
    };

    const renderJson = (json: any) => {
        if (typeof json === 'string') return json;
        try {
            return JSON.stringify(json, null, 2);
        } catch {
            return "Could not stringify object.";
        }
    }

    return (
        <div className="w-full h-full bg-slate-900/95 flex flex-col font-normal"
            aria-modal="true" role="dialog" aria-labelledby="dev-log-title"
        >
            <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
                <h2 id="dev-log-title" className="text-xl font-bold text-sky-400">Gemini Session Log</h2>
                <div className="flex items-center space-x-2 sm:space-x-4">
                    <button
                        onClick={handleCopy}
                        className="px-3 py-1.5 text-sm font-semibold text-white bg-slate-600 hover:bg-slate-500 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 w-20"
                        title="Copy Log to Clipboard"
                    >
                        {copyButtonText}
                    </button>
                    <button
                        onClick={handleExport}
                        className="px-3 py-1.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400"
                        title="Export Log as JSON"
                    >
                        Export
                    </button>
                    <button 
                        onClick={onClose} 
                        className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        aria-label="Close Developer Log"
                        title="Close"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </header>

            <main ref={mainContentRef} className="flex-grow overflow-y-auto scrollbar-thin p-4">
                <div className="space-y-6">
                    {history.map((entry, index) => {
                        const styles = getEntryStyles(entry.type);
                        const requestTime = new Date(entry.requestTimestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false
                        });
                         const responseTime = new Date(entry.responseTimestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false
                        });
                        return (
                        <div key={`${entry.requestTimestamp}-${index}`} className={`p-4 rounded-lg shadow-md ${styles.bg} border-l-4 ${styles.border}`}>
                            <div className="flex justify-between items-baseline mb-3">
                                <h3 className={`text-sm font-bold uppercase tracking-wider ${styles.text}`}>
                                    {styles.title}
                                </h3>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between items-baseline">
                                        <h4 className="text-xs font-semibold text-slate-400 mb-1">INPUT</h4>
                                        <span className="text-xs text-slate-500 font-atkinson-mono">{requestTime}</span>
                                    </div>
                                    <pre className="text-xs text-slate-300 font-atkinson-mono whitespace-pre-wrap break-words bg-black/20 p-2 rounded-md">
                                        {renderJson(entry.data.input)}
                                    </pre>
                                </div>
                                 <div>
                                    <div className="flex justify-between items-baseline">
                                        <h4 className="text-xs font-semibold text-slate-400 mb-1">OUTPUT</h4>
                                        <span className="text-xs text-slate-500 font-atkinson-mono">{responseTime}</span>
                                    </div>
                                    <pre className="text-xs text-slate-300 font-atkinson-mono whitespace-pre-wrap break-words bg-black/20 p-2 rounded-md">
                                        {renderJson(entry.data.output)}
                                    </pre>
                                </div>
                                {entry.data.error && (
                                     <div>
                                        <h4 className="text-xs font-semibold text-red-400 mb-1">ERROR</h4>
                                        <pre className="text-xs text-red-300 font-atkinson-mono whitespace-pre-wrap break-words bg-red-900/20 p-2 rounded-md">
                                            {entry.data.error}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </div>
                    )})}
                    {history.length === 0 && (
                        <div className="text-center text-slate-400 p-8">
                            <p>No log entries yet for this session.</p>
                            <p className="text-sm mt-2">Draw a card to start the conversation with the AI.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export const DevLogSheet = React.memo(DevLogSheetComponent);