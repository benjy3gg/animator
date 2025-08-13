import React, { useState } from 'react';
import { Copy, Save, Image as ImageIcon } from 'lucide-react';

const ConfigModal = ({ config, onClose, onLoad, image }) => {
    const [jsonInput, setJsonInput] = useState(JSON.stringify(config, null, 2));
    const [copyConfigText, setCopyConfigText] = useState('Copy Config');
    const [copyImageText, setCopyImageText] = useState('Copy Image');

    const handleCopyConfig = () => {
        navigator.clipboard.writeText(jsonInput);
        setCopyConfigText('Copied!');
        setTimeout(() => setCopyConfigText('Copy Config'), 2000);
    };

    const handleCopyImageBase64 = () => {
        if (!image) {
            alert("No image is loaded to copy.");
            return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        const base64Image = canvas.toDataURL();
        navigator.clipboard.writeText(base64Image);
        setCopyImageText('Copied!');
        setTimeout(() => setCopyImageText('Copy Image'), 2000);
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
                    <button onClick={handleCopyConfig} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md">
                        <Copy size={16} /> {copyConfigText}
                    </button>
                    <button onClick={handleCopyImageBase64} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed" disabled={!image}>
                        <ImageIcon size={16} /> {copyImageText}
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