
import React from 'react';

export const ApiKeyMessage: React.FC = () => {
  return (
    <div className="bg-red-800 border border-red-600 text-red-100 px-4 py-3 rounded-lg shadow-md relative max-w-md w-full text-center" role="alert">
      <strong className="font-bold block sm:inline">API Key Missing!</strong>
      <span className="block sm:inline"> Please set your <code className="bg-red-700 px-1 rounded">API_KEY</code> environment variable to use Gemini features.</span>
    </div>
  );
};
    