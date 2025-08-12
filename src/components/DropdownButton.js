import React, { useState, useRef, useEffect } from 'react';

const DropdownButton = ({ label, icon, options, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleOptionClick = (callback) => {
        callback();
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                disabled={disabled} 
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 transition-colors text-white font-semibold py-2 px-4 rounded-lg shadow-md disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
                {disabled ? <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div> : icon}
                {disabled ? 'Rendering...' : label}
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg z-20">
                    <div className="py-1">
                        {options.map(option => (
                            <a
                                key={option.label}
                                href="#"
                                onClick={(e) => { e.preventDefault(); handleOptionClick(option.onClick); }}
                                className="block px-4 py-2 text-sm text-gray-200 hover:bg-gray-600"
                            >
                                {option.label}
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DropdownButton;