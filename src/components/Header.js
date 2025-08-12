import React from 'react';
import { RotateCcw, Settings, Download, Film, HelpCircle } from 'lucide-react';
import DropdownButton from './DropdownButton';

const Header = ({ onReset, onOpenModal, onOpenHelpModal, onDownloadGif, onDownloadSpritesheet, isRendering }) => {
    const spritesheetOptions = [
        { label: 'Full Size (1x)', onClick: () => onDownloadSpritesheet(1) },
        { label: 'Half Size (0.5x)', onClick: () => onDownloadSpritesheet(0.5) },
        { label: 'Quarter Size (0.25x)', onClick: () => onDownloadSpritesheet(0.25) },
    ];
    const gifOptions = [
        { label: 'Full Size (1x)', onClick: () => onDownloadGif(1) },
        { label: 'Half Size (0.5x)', onClick: () => onDownloadGif(0.5) },
        { label: 'Quarter Size (0.25x)', onClick: () => onDownloadGif(0.25) },
    ];

    return (
        <div className="flex flex-wrap justify-between items-center border-b border-gray-700 pb-4 gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-cyan-400 tracking-wider">Advanced Sprite Animator</h1>
            <div className="flex items-center gap-2">
                <button onClick={onOpenHelpModal} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white font-semibold py-2 px-4 rounded-lg shadow-md">
                    <HelpCircle size={18} /> Help
                </button>
                <button onClick={onOpenModal} className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 transition-colors text-white font-semibold py-2 px-4 rounded-lg shadow-md">
                    <Settings size={18} /> Manage Config
                </button>
                <DropdownButton label="Spritesheet" icon={<Film size={18} />} options={spritesheetOptions} disabled={isRendering} />
                <DropdownButton label="GIF" icon={<Download size={18} />} options={gifOptions} disabled={isRendering} />
                <button onClick={onReset} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 transition-colors text-white font-semibold py-2 px-4 rounded-lg shadow-md">
                    <RotateCcw size={18} /> Reset
                </button>
            </div>
        </div>
    );
};

export default Header;