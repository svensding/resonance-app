
import React, { useState, useEffect, useRef } from 'react';

interface CountdownTimerProps {
  duration: number; // in seconds
  onEnd: () => void;
}

type TimerStatus = 'idle' | 'running' | 'paused';

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ duration, onEnd }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [status, setStatus] = useState<TimerStatus>('idle');
  
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  useEffect(() => {
    if (status !== 'running') return;

    if (timeLeft <= 0) {
      onEndRef.current();
      return;
    }

    const intervalId = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timeLeft, status]);

  const handleReset = () => {
    setTimeLeft(duration);
    setStatus('idle');
  };

  const handlePlayPause = () => {
    setStatus(prev => {
        if (prev === 'running') return 'paused';
        return 'running';
    });
  };

  const radius = 28;
  const strokeWidth = 4;
  const size = (radius + strokeWidth) * 2;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (timeLeft / duration) * circumference;

  const textSize = 'text-xl';
  const buttonSizeClass = 'h-8 w-8';
  const iconSizeClass = 'h-5 w-5';

  return (
    <div className="flex items-center justify-center space-x-4 p-3">
      <button onClick={handleReset} title="Reset Timer" className={`flex items-center justify-center rounded-full bg-slate-700/80 text-slate-300 hover:bg-slate-600 hover:text-white transition-colors ${buttonSizeClass}`}>
        <span className={`${iconSizeClass} flex items-center justify-center text-xl`}>↻</span>
      </button>

      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <circle className="text-slate-600/50" stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" r={radius} cx={size / 2} cy={size / 2} />
          <circle
            className="text-sky-400"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
            style={{ strokeDasharray: circumference, strokeDashoffset: strokeOffset, transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center font-bold font-atkinson-mono text-white ${textSize}`}>
          {timeLeft}
        </span>
      </div>

      <button onClick={handlePlayPause} title={status === 'running' ? "Pause" : "Start"} className={`flex items-center justify-center rounded-full bg-sky-600/90 text-white hover:bg-sky-500 transition-colors ${buttonSizeClass}`}>
        {status === 'running' ? (
          <svg xmlns="http://www.w3.org/2000/svg" className={iconSizeClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className={iconSizeClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          </svg>
        )}
      </button>
    </div>
  );
};
