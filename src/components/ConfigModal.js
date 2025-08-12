import React, { useState } from 'react';
import { Copy, Save } from 'lucide-react';

const ConfigModal = ({ config, onClose, onLoad }) => {
    const [jsonInput, setJsonInput] = useState(JSON.stringify(config, null, 2));
    const [copyButtonText, setCopyButtonText] = useState('Copy');

    const handleCopy = () => {
        navigator.clipboard.writeText(jsonInput);
        setCopyButtonText('Copied!');
        setTimeout(() => setCopyButtonText('Copy'), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl flex flex-col">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-cyan-400">Configuration Manager</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                    <div>
                         <div className="flex justify-between items-center mb-2">
                             <label className="block text-sm font-medium text-gray-300">Current Configuration (Copy or Edit)</label>
                             <a href="https://pastebin.com/raw/SLHiFP1M" target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400 hover:underline">
                                example
                            </a>
                        </div>
                        <textarea 
                            value={jsonInput}
                            onChange={e => setJsonInput(e.target.value)}
                            className="w-full h-64 bg-gray-900 text-gray-200 font-mono text-sm p-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                    </div>
                </div>
                <div className="p-4 border-t border-gray-700 flex justify-end gap-3">
                    <button onClick={handleCopy} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md">
                        <Copy size={16} /> {copyButtonText}
                    </button>
                    <button onClick={() => onLoad(jsonInput)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-md">
                        <Save size={16} /> Load This Config
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfigModal;