import React from 'react';
import { Upload } from 'lucide-react';

const ImageUploader = ({ onImageUpload, onLoadDefaults }) => (
    <div className="text-center p-8 border-2 border-dashed border-gray-600 rounded-xl bg-gray-900/50">
        <Upload className="mx-auto text-gray-500 mb-4" size={48} />
        <h2 className="text-xl font-semibold mb-2">Upload Your Character</h2>
        <p className="text-gray-400 mb-6">Use a PNG with a transparent background for the best results.</p>
        <div className="flex justify-center gap-4">
            <label htmlFor="file-upload" className="cursor-pointer bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-lg">
                Choose File
            </label>
            <input id="file-upload" type="file" className="hidden" accept="image/png, image/jpeg" onChange={onImageUpload} />
            <button onClick={onLoadDefaults} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-lg">
                Load Example
            </button>
        </div>
    </div>
);

export default ImageUploader;