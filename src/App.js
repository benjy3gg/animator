import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Scissors, Pin, Play, Wind, RotateCcw, Trash2, PlusCircle, Zap, MousePointer, AlertTriangle, Download, Settings, Copy, Save, GripVertical, ArrowUp, ArrowDown, Film, HelpCircle } from 'lucide-react';

const loadScript = (src) => {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Script load error for ${src}`));
        document.body.appendChild(script);
    });
};

// Helper function to calculate color distance
const colorDistance = (r1, g1, b1, r2, g2, b2) => {
    // A simple and fast Euclidean distance calculation for RGB colors
    return Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2));
};


// Main App Component
const App = () => {
    // State Management
    const [image, setImage] = useState(null);
    const [parts, setParts] = useState({});
    const [partOrder, setPartOrder] = useState([]);
    const [bitmaps, setBitmaps] = useState({});
    const [animationParams, setAnimationParams] = useState({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [isRendering, setIsRendering] = useState(false);
    const [isLoadingDefaults, setIsLoadingDefaults] = useState(true);

    useEffect(() => {
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js')
            .catch(err => console.error(err));

        // Fetch default data on initial load from URLs
        const fetchDefaults = async () => {
            try {
                const [configRes, imageRes] = await Promise.all([
                    fetch('https://gist.githubusercontent.com/benjy3gg/ab4b3248df5c0494a0c3a39c77a26e05/raw/4744457b6398432fea9151481d73c0bdc06dc25e/gistfile1.txt'),
                    fetch('https://gist.githubusercontent.com/benjy3gg/5092a16e7ac274d59cad7638b318a00a/raw/459148419a0838b0298ce32f20aa26a7d966c8d7/gistfile1.txt')
                ]);

                if (!configRes.ok || !imageRes.ok) {
                    throw new Error('Failed to fetch default data.');
                }

                const configJson = await configRes.json();
                const imageBase64 = await imageRes.text();

                const { parts: newParts, animationParams: newAnimParams, partOrder: newPartOrder } = configJson;

                if (newParts && newAnimParams && newPartOrder) {
                    const img = new Image();
                    img.onload = () => {
                        setImage(img);
                        setAnimationParams(newAnimParams);
                        setPartOrder(newPartOrder);
                        // Important: Set parts state and then let useEffect trigger bitmap update
                        setParts(newParts); 
                    };
                    img.src = imageBase64;
                } else {
                     throw new Error('Invalid configuration format.');
                }
            } catch (error) {
                console.error("Could not load default data:", error);
                // If fetching fails, start with a blank slate
                setIsLoadingDefaults(false); 
            }
        };

        fetchDefaults();
    }, []);

    // Function to update bitmaps with smart, color-based selection
    const updateBitmaps = useCallback(async (newParts) => {
        if (!image) return;
        try {
            const newBitmaps = {};
            const { width, height } = image;

            const originalImageCanvas = document.createElement('canvas');
            originalImageCanvas.width = width;
            originalImageCanvas.height = height;
            const originalImageCtx = originalImageCanvas.getContext('2d');
            originalImageCtx.drawImage(image, 0, 0);
            const originalImageData = originalImageCtx.getImageData(0, 0, width, height).data;

            const masterMaskCanvas = document.createElement('canvas');
            masterMaskCanvas.width = width;
            masterMaskCanvas.height = height;
            const masterMaskCtx = masterMaskCanvas.getContext('2d');

            for (const key in newParts) {
                const part = newParts[key];
                if (part.paths.add.length === 0) continue;

                const coreMaskCanvas = document.createElement('canvas');
                coreMaskCanvas.width = width;
                coreMaskCanvas.height = height;
                const coreMaskCtx = coreMaskCanvas.getContext('2d');

                part.paths.add.forEach(path => {
                    coreMaskCtx.beginPath();
                    if(path.length > 0) coreMaskCtx.moveTo(path[0].x, path[0].y);
                    path.forEach(p => coreMaskCtx.lineTo(p.x, p.y));
                    coreMaskCtx.closePath();
                    coreMaskCtx.fill();
                });
                const coreMask = coreMaskCtx.getImageData(0, 0, width, height);

                const borderPixels = [];
                for (let y = 1; y < height - 1; y++) {
                    for (let x = 1; x < width - 1; x++) {
                        const index = (y * width + x) * 4;
                        if (coreMask.data[index + 3] > 0) {
                            if (coreMask.data[index - 4 + 3] === 0 || coreMask.data[index + 4 + 3] === 0 || coreMask.data[index - width * 4 + 3] === 0 || coreMask.data[index + width * 4 + 3] === 0) {
                                borderPixels.push({x, y});
                            }
                        }
                    }
                }

                const finalPartMaskCanvas = document.createElement('canvas');
                finalPartMaskCanvas.width = width;
                finalPartMaskCanvas.height = height;
                const finalPartMaskCtx = finalPartMaskCanvas.getContext('2d');
                finalPartMaskCtx.putImageData(coreMask, 0, 0);
                const finalPartMaskData = finalPartMaskCtx.getImageData(0, 0, width, height);

                const NEIGHBORHOOD = 8;
                const TOLERANCE = 45;

                borderPixels.forEach(({x, y}) => {
                    const borderIndex = (y * width + x) * 4;
                    const r1 = originalImageData[borderIndex];
                    const g1 = originalImageData[borderIndex + 1];
                    const b1 = originalImageData[borderIndex + 2];

                    for (let ny = -NEIGHBORHOOD; ny <= NEIGHBORHOOD; ny++) {
                        for (let nx = -NEIGHBORHOOD; nx <= NEIGHBORHOOD; nx++) {
                            const currentX = x + nx;
                            const currentY = y + ny;

                            if (currentX >= 0 && currentX < width && currentY >= 0 && currentY < height) {
                                const neighborIndex = (currentY * width + currentX) * 4;
                                if (originalImageData[neighborIndex + 3] > 0 && finalPartMaskData.data[neighborIndex + 3] === 0) {
                                    const r2 = originalImageData[neighborIndex];
                                    const g2 = originalImageData[neighborIndex + 1];
                                    const b2 = originalImageData[neighborIndex + 2];

                                    if (colorDistance(r1, g1, b1, r2, g2, b2) < TOLERANCE) {
                                        finalPartMaskData.data[neighborIndex + 3] = 255;
                                    }
                                }
                            }
                        }
                    }
                });
                finalPartMaskCtx.putImageData(finalPartMaskData, 0, 0);

                const partCanvas = document.createElement('canvas');
                partCanvas.width = width;
                partCanvas.height = height;
                const partCtx = partCanvas.getContext('2d');
                partCtx.drawImage(image, 0, 0);
                partCtx.globalCompositeOperation = 'destination-in';
                partCtx.drawImage(finalPartMaskCanvas, 0, 0);
                newBitmaps[key] = await createImageBitmap(partCanvas);

                masterMaskCtx.drawImage(finalPartMaskCanvas, 0, 0);
            }

            const bodyCanvas = document.createElement('canvas');
            bodyCanvas.width = width;
            bodyCanvas.height = height;
            const bodyCtx = bodyCanvas.getContext('2d');
            bodyCtx.drawImage(image, 0, 0);
            bodyCtx.globalCompositeOperation = 'destination-out';
            bodyCtx.drawImage(masterMaskCanvas, 0, 0); 

            newBitmaps.staticBody = await createImageBitmap(bodyCanvas);
            setBitmaps(newBitmaps);
            setIsLoadingDefaults(false);
        } catch (error) {
            console.error("Error creating bitmaps:", error);
            setIsLoadingDefaults(false);
        }
    }, [image]);

    useEffect(() => {
        if(image && Object.keys(parts).length > 0) {
            updateBitmaps(parts);
        }
    }, [parts, image, updateBitmaps]);


    const handlePartsChange = (newParts) => {
        setParts(newParts);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Reset state for the new image
            handleReset();

            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    setImage(img);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleReset = () => {
        setImage(null);
        setParts({});
        setBitmaps({});
        setAnimationParams({});
        setPartOrder([]);
        setIsLoadingDefaults(false); // Fix: Ensure we show the uploader after reset
    };

    const loadConfig = (config) => {
        try {
            const { parts: newParts, animationParams: newAnimParams, partOrder: newPartOrder } = JSON.parse(config);
            if (newParts && newAnimParams && newPartOrder) {
                setAnimationParams(newAnimParams);
                setPartOrder(newPartOrder);
                setParts(newParts);
                setIsModalOpen(false);
            } else {
                alert("Invalid configuration format.");
            }
        } catch (e) {
            alert("Failed to parse JSON. Please check the format.");
            console.error(e);
        }
    };

    const loadDefaults = async () => {
        try {
            setIsLoadingDefaults(true);
            const [configRes, imageRes] = await Promise.all([
                fetch('https://gist.githubusercontent.com/benjy3gg/ab4b3248df5c0494a0c3a39c77a26e05/raw/4744457b6398432fea9151481d73c0bdc06dc25e/gistfile1.txt'),
                fetch('https://gist.githubusercontent.com/benjy3gg/5092a16e7ac274d59cad7638b318a00a/raw/459148419a0838b0298ce32f20aa26a7d966c8d7/gistfile1.txt')
            ]);

            if (!configRes.ok || !imageRes.ok) {
                throw new Error('Failed to fetch default data.');
            }

            const configJson = await configRes.json();
            const imageBase64 = await imageRes.text();

            const { parts: newParts, animationParams: newAnimParams, partOrder: newPartOrder } = configJson;

            if (newParts && newAnimParams && newPartOrder) {
                const img = new Image();
                img.onload = () => {
                    setImage(img);
                    setAnimationParams(newAnimParams);
                    setPartOrder(newPartOrder);
                    setParts(newParts); 
                };
                img.src = imageBase64;
            } else {
                 throw new Error('Invalid configuration format.');
            }
        } catch (error) {
            console.error("Could not load default data:", error);
            alert("Failed to load default data. Please check the console for errors.");
            setIsLoadingDefaults(false);
        }
    };

    return (
        <div className="bg-gray-900 text-white min-h-screen font-sans flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-7xl bg-gray-800 rounded-2xl shadow-2xl p-6 md:p-8 space-y-6">
                <Header 
                    onReset={handleReset} 
                    onOpenModal={() => setIsModalOpen(true)}
                    onOpenHelpModal={() => setIsHelpModalOpen(true)}
                    isRendering={isRendering}
                    onDownloadGif={(scale) => {
                        if (window.GIF) {
                            generateGif(bitmaps, parts, animationParams, partOrder, setIsRendering, scale);
                        } else {
                            alert("GIF library not loaded yet. Please try again in a moment.");
                        }
                    }}
                    onDownloadSpritesheet={(scale) => generateSpritesheet(bitmaps, parts, animationParams, partOrder, setIsRendering, scale)}
                />
                {isLoadingDefaults ? (
                    <div className="text-center p-8">Loading default sprite...</div>
                ) : !image ? (
                    <ImageUploader onImageUpload={handleImageUpload} onLoadDefaults={loadDefaults} />
                ) : (
                    <AnimatorWorkspace
                        image={image}
                        parts={parts}
                        partOrder={partOrder}
                        setPartOrder={setPartOrder}
                        onPartsChange={handlePartsChange}
                        bitmaps={bitmaps}
                        animationParams={animationParams}
                        setAnimationParams={setAnimationParams}
                    />
                )}
            </div>
            {image && <FloatingPreview bitmaps={bitmaps} parts={parts} partOrder={partOrder} animationParams={animationParams} />}
            <Footer />
            {isModalOpen && (
                <ConfigModal 
                    config={{ parts, animationParams, partOrder }}
                    onClose={() => setIsModalOpen(false)}
                    onLoad={loadConfig}
                />
            )}
            {isHelpModalOpen && (
                <HelpModal 
                    onClose={() => setIsHelpModalOpen(false)}
                />
            )}
        </div>
    );
};

// Dropdown Button Component
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

// Header Component
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


// ImageUploader Component
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

// Main Workspace Component
const AnimatorWorkspace = ({ image, parts, partOrder, setPartOrder, onPartsChange, bitmaps, animationParams, setAnimationParams }) => {
    const [activePart, setActivePart] = useState(partOrder[0] || null);

    const addPart = (name) => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            alert("Please enter a part name.");
            return;
        }
        if (trimmedName.toLowerCase() === 'body') {
            alert("The name 'body' is reserved. Please choose a different name.");
            return;
        }
        if (parts[trimmedName]) {
            alert("A part with this name already exists.");
            return;
        }

        const newParts = { ...parts, [trimmedName]: { paths: { add: [] }, anchor: null, boundingBox: null } };
        const newAnimParams = { ...animationParams, [trimmedName]: { rotation: 0, moveX: 0, moveY: 0, scale: 1, speed: 1, offset: 0 } };

        onPartsChange(newParts);
        setAnimationParams(newAnimParams);
        setPartOrder([...partOrder, trimmedName]);
        setActivePart(trimmedName);
    };

    const deletePart = (name) => {
        const { [name]: _, ...remainingParts } = parts;
        const { [name]: __, ...remainingParams } = animationParams;

        onPartsChange(remainingParts);
        setAnimationParams(remainingParams);
        setPartOrder(partOrder.filter(p => p !== name));

        if (activePart === name) {
            setActivePart(partOrder.filter(p => p !== name)[0] || null);
        }
    };

    const duplicatePart = (nameToDuplicate) => {
        let newName = `${nameToDuplicate}_copy`;
        let counter = 1;
        while (parts[newName]) {
            newName = `${nameToDuplicate}_copy_${counter++}`;
        }

        const newParts = { ...parts, [newName]: JSON.parse(JSON.stringify(parts[nameToDuplicate])) };
        const newAnimParams = { ...animationParams, [newName]: { ...animationParams[nameToDuplicate] } };

        onPartsChange(newParts);
        setAnimationParams(newAnimParams);
        const index = partOrder.indexOf(nameToDuplicate);
        const newPartOrder = [...partOrder];
        newPartOrder.splice(index + 1, 0, newName);
        setPartOrder(newPartOrder);
        setActivePart(newName);
    };

    return (
        <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 flex flex-col gap-6">
                <PartManager 
                    parts={parts}
                    partOrder={partOrder}
                    setPartOrder={setPartOrder}
                    activePart={activePart} 
                    setActivePart={setActivePart} 
                    addPart={addPart} 
                    deletePart={deletePart}
                    duplicatePart={duplicatePart}
                />
                {activePart && animationParams[activePart] && (
                    <AnimationControls 
                        partKey={activePart}
                        params={animationParams[activePart]}
                        setAnimationParams={setAnimationParams}
                    />
                )}
            </div>
            <div className="lg:col-span-2 grid md:grid-cols-2 gap-6">
                 <SpriteEditor 
                    image={image} 
                    parts={parts}
                    activePart={activePart}
                    onPartsChange={onPartsChange}
                    animationParams={animationParams}
                 />
                 <AnimationPreview 
                    bitmaps={bitmaps}
                    parts={parts}
                    partOrder={partOrder}
                    animationParams={animationParams}
                 />
            </div>
        </div>
    );
};

// PartManager Component
const PartManager = ({ parts, partOrder, setPartOrder, activePart, setActivePart, addPart, deletePart, duplicatePart }) => {
    const [newName, setNewName] = useState('');

    const handleAdd = (e) => {
        e.preventDefault();
        addPart(newName);
        setNewName('');
    };

    const movePart = (index, direction) => {
        if ((index === 0 && direction === -1) || (index === partOrder.length - 1 && direction === 1)) {
            return;
        }
        const newPartOrder = [...partOrder];
        const [movedItem] = newPartOrder.splice(index, 1);
        newPartOrder.splice(index + direction, 0, movedItem);
        setPartOrder(newPartOrder);
    };

    return (
        <div className="bg-gray-900/50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-cyan-300 mb-3">1. Manage Parts & Layers</h3>
            <form onSubmit={handleAdd} className="flex gap-2 mb-3">
                <input 
                    type="text" 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                    placeholder="New part name..."
                    className="flex-grow bg-gray-700 text-white rounded-md px-3 py-2 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 p-2 rounded-md"><PlusCircle size={20}/></button>
            </form>
            <div className="space-y-2 max-h-48 overflow-y-auto">
                {partOrder.length === 0 && <p className="text-gray-500 text-sm p-2">No parts added yet.</p>}
                {partOrder.map((partKey, index) => (
                    <div key={partKey} className={`w-full p-2 rounded-lg transition-all duration-200 flex items-center justify-between ${activePart === partKey ? 'bg-cyan-500 ring-2 ring-cyan-300' : 'bg-gray-700'}`}>
                        <button onClick={() => setActivePart(partKey)} className="flex-grow text-left flex items-center gap-3">
                            <MousePointer size={18} /> {partKey}
                        </button>
                        <div className="flex items-center">
                            <button onClick={() => movePart(index, -1)} disabled={index === 0} className="p-1 disabled:opacity-20"><ArrowUp size={18}/></button>
                            <button onClick={() => movePart(index, 1)} disabled={index === partOrder.length - 1} className="p-1 disabled:opacity-20"><ArrowDown size={18}/></button>
                            <button onClick={() => duplicatePart(partKey)} className="text-blue-400 hover:text-blue-300 p-1"><Copy size={18}/></button>
                            <button onClick={() => deletePart(partKey)} className="text-red-400 hover:text-red-300 p-1"><Trash2 size={18}/></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// SpriteEditor (Lasso Selection) Component
const SpriteEditor = ({ image, parts, activePart, onPartsChange, animationParams }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState([]);
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0, visible: false });
    const longPressTimer = useRef();
    const touchStartPos = useRef({ x: 0, y: 0 });

    const getCanvasPos = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    };

    const handleMouseDown = (e) => {
        if (!activePart) return;
        e.preventDefault();

        if (e.altKey) {
            const pos = getCanvasPos(e);
            const updatedPart = { ...parts[activePart], anchor: pos };
            onPartsChange({ ...parts, [activePart]: updatedPart });
        } else {
            setIsDrawing(true);
            setCurrentPath([getCanvasPos(e)]);
        }
    };

    const handleMouseMove = (e) => {
        const pos = getCanvasPos(e);
        setCursorPos({ x: pos.x, y: pos.y, visible: true });
        if (!isDrawing) return;
        e.preventDefault();
        setCurrentPath(prev => [...prev, pos]);
    };

    const handleMouseUp = (e) => {
        if (!isDrawing) {
            setCursorPos(prev => ({...prev, visible: false}));
            return;
        }
        if (!activePart || currentPath.length < 3) {
            setIsDrawing(false);
            setCurrentPath([]);
            setCursorPos(prev => ({...prev, visible: false}));
            return;
        }
        e.preventDefault();
        setIsDrawing(false);

        const newPaths = { add: [currentPath], subtract: [] };

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        newPaths.add.forEach(path => path.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }));

        const boundingBox = (isFinite(minX)) ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY } : null;
        const anchor = boundingBox ? { x: minX + boundingBox.width / 2, y: minY + boundingBox.height / 2 } : {x:0, y:0};

        onPartsChange({ ...parts, [activePart]: { paths: newPaths, anchor, boundingBox } });
        setCurrentPath([]);
        setCursorPos(prev => ({...prev, visible: false}));
    };

    // Touch event handlers
    const handleTouchStart = (e) => {
        if (!activePart) return;
        e.preventDefault();
        touchStartPos.current = getCanvasPos(e);

        longPressTimer.current = setTimeout(() => {
            // Long press detected: set anchor and cancel drawing
            const updatedPart = { ...parts[activePart], anchor: touchStartPos.current };
            onPartsChange({ ...parts, [activePart]: updatedPart });
            setIsDrawing(false);
            setCurrentPath([]);
        }, 500); // 500ms for long press

        setIsDrawing(true);
        setCurrentPath([touchStartPos.current]);
    };

    const handleTouchMove = (e) => {
        e.preventDefault();
        const currentPos = getCanvasPos(e);
        setCursorPos({ x: currentPos.x, y: currentPos.y, visible: true });

        // If finger moves too far, cancel the long press timer
        const dist = Math.hypot(currentPos.x - touchStartPos.current.x, currentPos.y - touchStartPos.current.y);
        if (dist > 10) {
            clearTimeout(longPressTimer.current);
        }

        if (isDrawing) {
            setCurrentPath(prev => [...prev, currentPos]);
        }
    };

    const handleTouchEnd = (e) => {
        clearTimeout(longPressTimer.current);
        handleMouseUp(e); // Reuse the same logic as mouse up
    };

    useEffect(() => {
        if (!image) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);

        if (parts[activePart]) {
            const part = parts[activePart];
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = 'orange';
            part.paths.add.forEach(path => {
                ctx.beginPath();
                if(path.length > 0) ctx.moveTo(path[0].x, path[0].y);
                path.forEach((p, i) => i !== 0 && ctx.lineTo(p.x, p.y));
                ctx.closePath();
                ctx.fill();
            });
            ctx.globalAlpha = 1.0;

            if (part.anchor) {
                const params = animationParams[activePart];
                if (params) {
                    ctx.save();
                    ctx.setLineDash([4, 4]);
                    ctx.strokeStyle = '#34D399';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.ellipse(part.anchor.x, part.anchor.y, Math.abs(params.moveX), Math.abs(params.moveY), 0, 0, 2 * Math.PI);
                    ctx.stroke();
                    ctx.restore();
                }

                ctx.strokeStyle = '#34D399';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(part.anchor.x - 6, part.anchor.y);
                ctx.lineTo(part.anchor.x + 6, part.anchor.y);
                ctx.moveTo(part.anchor.x, part.anchor.y - 6);
                ctx.lineTo(part.anchor.x, part.anchor.y + 6);
                ctx.stroke();
            }
        }

        if (isDrawing && currentPath.length > 1) {
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            ctx.beginPath();
            currentPath.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
            ctx.stroke();
        }
    }, [image, parts, activePart, isDrawing, currentPath, animationParams]);

    return (
        <div className="bg-gray-900 rounded-lg p-4 flex flex-col items-center justify-center relative">
            <div className="w-full mb-2">
                <h3 className="text-lg font-semibold text-gray-300">2. Editor</h3>
                <div className="text-xs text-gray-400 bg-gray-950 p-2 rounded-md flex items-start gap-2">
                    <AlertTriangle size={24} className="text-yellow-400 flex-shrink-0"/>
                    <div>
                        Draw to select. Hold <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-md">Alt</kbd> and click to set anchor. Long-press on mobile.
                    </div>
                </div>
            </div>
            <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown} 
                onMouseMove={handleMouseMove} 
                onMouseUp={handleMouseUp} 
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="max-w-full max-h-[50vh] object-contain cursor-crosshair"
                style={{ touchAction: 'none' }}
            />
            <Magnifier sourceCanvasRef={canvasRef} cursorPos={cursorPos} zoomLevel={4} />
        </div>
    );
};

// Magnifier Component
const Magnifier = ({ sourceCanvasRef, cursorPos, zoomLevel }) => {
    const magnifierCanvasRef = useRef(null);
    const MAGNIFIER_SIZE = 100;
    const SOURCE_SIZE = MAGNIFIER_SIZE / zoomLevel;

    useEffect(() => {
        if (!cursorPos.visible || !sourceCanvasRef.current || !magnifierCanvasRef.current) return;

        const sourceCanvas = sourceCanvasRef.current;
        const magnifierCanvas = magnifierCanvasRef.current;
        const ctx = magnifierCanvas.getContext('2d');

        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, MAGNIFIER_SIZE, MAGNIFIER_SIZE);

        const sx = cursorPos.x - SOURCE_SIZE / 2;
        const sy = cursorPos.y - SOURCE_SIZE / 2;

        ctx.drawImage(sourceCanvas, sx, sy, SOURCE_SIZE, SOURCE_SIZE, 0, 0, MAGNIFIER_SIZE, MAGNIFIER_SIZE);

        // Draw crosshair
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(MAGNIFIER_SIZE / 2, 0);
        ctx.lineTo(MAGNIFIER_SIZE / 2, MAGNIFIER_SIZE);
        ctx.moveTo(0, MAGNIFIER_SIZE / 2);
        ctx.lineTo(MAGNIFIER_SIZE, MAGNIFIER_SIZE / 2);
        ctx.stroke();

    }, [cursorPos, sourceCanvasRef, zoomLevel]);

    if (!cursorPos.visible) return null;

    // Calculate position to be above the cursor
    const canvasRect = sourceCanvasRef.current.getBoundingClientRect();
    const scaleX = canvasRect.width / sourceCanvasRef.current.width;
    const scaleY = canvasRect.height / sourceCanvasRef.current.height;

    const style = {
        position: 'absolute',
        left: `${cursorPos.x * scaleX - MAGNIFIER_SIZE / 2}px`,
        top: `${cursorPos.y * scaleY - MAGNIFIER_SIZE - 10}px`, // 10px offset above cursor
        width: `${MAGNIFIER_SIZE}px`,
        height: `${MAGNIFIER_SIZE}px`,
        border: '2px solid white',
        borderRadius: '50%',
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 100,
    };

    return (
        <div style={style}>
            <canvas ref={magnifierCanvasRef} width={MAGNIFIER_SIZE} height={MAGNIFIER_SIZE} />
        </div>
    );
};

// Animation drawing logic
const drawFrame = (ctx, bitmaps, parts, animationParams, partOrder, time) => {
    const ANIMATION_DURATION = 2000; // 2 seconds
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if(bitmaps.staticBody) ctx.drawImage(bitmaps.staticBody, 0, 0);

    // Draw parts from bottom to top of the list (reverse order)
    [...partOrder].reverse().forEach(key => {
        const part = parts[key];
        const bitmap = bitmaps[key];
        const params = animationParams[key];
        if (!part || !bitmap || !params || !part.anchor) return;

        const cycle = Math.sin((time / ANIMATION_DURATION) * 2 * Math.PI * params.speed + (params.offset * Math.PI / 180));
        const currentRotation = (params.rotation * Math.PI / 180) * cycle;
        const currentMoveX = params.moveX * cycle;
        const currentMoveY = params.moveY * cycle;
        const currentScale = 1 + (params.scale - 1) * Math.abs(cycle);

        ctx.save();
        ctx.translate(part.anchor.x + currentMoveX, part.anchor.y + currentMoveY);
        ctx.rotate(currentRotation);
        ctx.scale(currentScale, currentScale);
        ctx.drawImage(bitmap, -part.anchor.x, -part.anchor.y);
        ctx.restore();
    });
};

// AnimationPreview Component
const AnimationPreview = ({ bitmaps, parts, partOrder, animationParams }) => {
    const canvasRef = useRef(null);
    const animationFrameId = useRef();

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!bitmaps.staticBody) {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        };
        canvas.width = bitmaps.staticBody.width;
        canvas.height = bitmaps.staticBody.height;

        const animate = (time) => {
            drawFrame(ctx, bitmaps, parts, animationParams, partOrder, time);
            animationFrameId.current = requestAnimationFrame(animate);
        };
        animationFrameId.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrameId.current);
    }, [bitmaps, parts, animationParams, partOrder]);

    return (
        <div className="bg-gray-900 rounded-lg p-4 flex flex-col items-center justify-center">
            <h3 className="text-lg font-semibold text-gray-300 mb-2 self-start">4. Live Preview</h3>
            <canvas ref={canvasRef} className="max-w-full max-h-[50vh] object-contain" />
        </div>
    );
};

// FloatingPreview Component
const FloatingPreview = ({ bitmaps, parts, partOrder, animationParams }) => {
    const canvasRef = useRef(null);
    const animationFrameId = useRef();

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!bitmaps.staticBody) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        const animate = (time) => {
            ctx.save();
            ctx.clearRect(0, 0, 128, 128);
            const { width, height } = bitmaps.staticBody;
            const scale = Math.min(128 / width, 128 / height);
            const offsetX = (128 - width * scale) / 2;
            const offsetY = (128 - height * scale) / 2;
            ctx.translate(offsetX, offsetY);
            ctx.scale(scale, scale);
            drawFrame(ctx, bitmaps, parts, animationParams, partOrder, time);
            ctx.restore();
            animationFrameId.current = requestAnimationFrame(animate);
        };
        animationFrameId.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrameId.current);
    }, [bitmaps, parts, animationParams, partOrder]);

    return (
        <div className="fixed bottom-20 right-4 md:bottom-4 bg-gray-900/50 border-2 border-gray-700 rounded-lg shadow-2xl p-2 z-50">
            <canvas ref={canvasRef} width="128" height="128" />
        </div>
    );
};


// AnimationControls Component
const AnimationControls = ({ partKey, params, setAnimationParams }) => {
    const handleParamChange = (param, value) => {
        setAnimationParams(prev => ({
            ...prev,
            [partKey]: { ...prev[partKey], [param]: Number(value) }
        }));
    };

    const Control = ({ param, label, icon, min, max, step }) => (
        <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                {icon} {label} ({params[param]})
            </label>
            <input
                type="range"
                min={min} max={max} step={step || 1} value={params[param]}
                onChange={(e) => handleParamChange(param, e.target.value)}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
        </div>
    );

    return (
        <div className="bg-gray-900/50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-cyan-300 mb-3">3. Animate '{partKey}'</h3>
            <div className="space-y-4">
                <Control param="rotation" label="Rotation (°)" icon={<RotateCcw size={16} />} min="-45" max="45" step="1" />
                <Control param="moveX" label="Horizontal Move" icon={<Play className="rotate-0" size={16} />} min="-10" max="10" step="0.1" />
                <Control param="moveY" label="Vertical Move" icon={<Play className="-rotate-90" size={16} />} min="-10" max="10" step="0.1" />
                <Control param="scale" label="Scale" icon={<Zap size={16} />} min="0.5" max="2" step="0.05" />
                <Control param="speed" label="Speed" icon={<Zap size={16} />} min="1" max="5" step="0.5" />
                <Control param="offset" label="Phase Offset" icon={<Play className="rotate-180" size={16} />} min="0" max="360" />
            </div>
        </div>
    );
};

// ConfigModal Component
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

// GIF Generation Logic
const generateGif = async (bitmaps, parts, animationParams, partOrder, setIsRendering, scale = 1) => {
    if (!bitmaps.staticBody) {
        alert("Cannot generate GIF without a loaded image.");
        return;
    }
    setIsRendering(true);

    let workerUrl = null;
    try {
        const workerResponse = await fetch('https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js');
        if (!workerResponse.ok) throw new Error('Network response for worker script was not ok.');
        const workerScriptText = await workerResponse.text();
        const workerBlob = new Blob([workerScriptText], { type: 'application/javascript' });
        workerUrl = URL.createObjectURL(workerBlob);

        const gif = new window.GIF({
            workers: 2,
            quality: 5,
            width: bitmaps.staticBody.width * scale,
            height: bitmaps.staticBody.height * scale,
            workerScript: workerUrl,
            transparent: 'rgba(0,0,0,0)',
        });

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = bitmaps.staticBody.width;
        tempCanvas.height = bitmaps.staticBody.height;
        const tempCtx = tempCanvas.getContext('2d');

        const DURATION = 2000; 
        const FPS = 25;
        const FRAME_DELAY = 1000 / FPS;
        const TOTAL_FRAMES = DURATION / FRAME_DELAY;

        for (let i = 0; i < TOTAL_FRAMES; i++) {
            const time = i * FRAME_DELAY;
            drawFrame(tempCtx, bitmaps, parts, animationParams, partOrder, time);

            if (scale !== 1) {
                const scaledCanvas = document.createElement('canvas');
                scaledCanvas.width = tempCanvas.width * scale;
                scaledCanvas.height = tempCanvas.height * scale;
                const scaledCtx = scaledCanvas.getContext('2d');
                scaledCtx.imageSmoothingEnabled = false;
                scaledCtx.drawImage(tempCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
                gif.addFrame(scaledCanvas, { copy: true, delay: FRAME_DELAY });
            } else {
                gif.addFrame(tempCtx, { copy: true, delay: FRAME_DELAY });
            }
        }

        gif.on('finished', function(blob) {
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = 'sprite-animation.gif';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);
            setIsRendering(false);
            if (workerUrl) {
                URL.revokeObjectURL(workerUrl);
            }
        });

        gif.render();

    } catch (error) {
        console.error("Failed to generate GIF:", error);
        alert("An error occurred while preparing the GIF renderer. Please check the console for details.");
        setIsRendering(false);
        if (workerUrl) {
            URL.revokeObjectURL(workerUrl);
        }
    }
};

// Spritesheet Generation Logic
const generateSpritesheet = (bitmaps, parts, animationParams, partOrder, setIsRendering, scale = 1) => {
    if (!bitmaps.staticBody) {
        alert("Cannot generate spritesheet without a loaded image.");
        return;
    }
    setIsRendering(true);

    const frameWidth = bitmaps.staticBody.width;
    const frameHeight = bitmaps.staticBody.height;
    const scaledWidth = frameWidth * scale;
    const scaledHeight = frameHeight * scale;
    const cols = 5;
    const rows = 2;
    const totalFrames = cols * rows;

    const spritesheetCanvas = document.createElement('canvas');
    spritesheetCanvas.width = scaledWidth * cols;
    spritesheetCanvas.height = scaledHeight * rows;
    const sheetCtx = spritesheetCanvas.getContext('2d');
    sheetCtx.imageSmoothingEnabled = false;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = frameWidth;
    tempCanvas.height = frameHeight;
    const tempCtx = tempCanvas.getContext('2d');

    const DURATION = 2000; // 2 second animation loop

    for (let i = 0; i < totalFrames; i++) {
        const time = (DURATION / (totalFrames - 1)) * i; // Ensure the last frame is at the end of the duration
        drawFrame(tempCtx, bitmaps, parts, animationParams, partOrder, time);

        const col = i % cols;
        const row = Math.floor(i / cols);

        sheetCtx.drawImage(tempCanvas, col * scaledWidth, row * scaledHeight, scaledWidth, scaledHeight);
    }

    const dataUrl = spritesheetCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'spritesheet.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setIsRendering(false);
};


// HelpModal Component
const HelpModal = ({ onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl flex flex-col">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-cyan-400">How to Create an Animation</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                    <div className="space-y-4">
                        <div className="bg-gray-900 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-cyan-300 mb-2">Step 1: Start Fresh</h3>
                            <p className="text-gray-300">Click the <span className="bg-red-500 text-white px-2 py-1 rounded">Reset</span> button to clear any existing work and start with a blank canvas.</p>
                        </div>

                        <div className="bg-gray-900 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-cyan-300 mb-2">Step 2: Load Your Image</h3>
                            <p className="text-gray-300">Upload a PNG image with transparency for best results. This will be the base for your animation.</p>
                            <p className="text-gray-400 mt-2 text-sm">Tip: Use images with clear, distinct parts that you want to animate separately.</p>
                        </div>

                        <div className="bg-gray-900 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-cyan-300 mb-2">Step 3: Create Body Parts</h3>
                            <p className="text-gray-300">Enter a name for each body part you want to animate (e.g., "HEAD", "ARM", "LEG") and click the <span className="bg-cyan-600 text-white px-2 py-1 rounded">+</span> button or press Enter.</p>
                            <p className="text-gray-400 mt-2 text-sm">Each part will be independently animatable. Create as many as you need.</p>
                        </div>

                        <div className="bg-gray-900 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-cyan-300 mb-2">Step 4: Define Part Boundaries</h3>
                            <p className="text-gray-300">In the Editor, select a part from the list and draw around the area you want to include in that part.</p>
                            <p className="text-gray-400 mt-2 text-sm">Hold Alt and click to set the anchor point (rotation center) for the selected part. On mobile, use a long press.</p>
                        </div>

                        <div className="bg-gray-900 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-cyan-300 mb-2">Step 5: Animate Your Parts</h3>
                            <p className="text-gray-300">Use the sliders in the Animation Controls section to set how each part moves:</p>
                            <ul className="list-disc pl-5 text-gray-300 mt-2 space-y-1">
                                <li>Rotation: How much the part rotates</li>
                                <li>Horizontal/Vertical Move: How far the part moves in each direction</li>
                                <li>Scale: How much the part grows and shrinks</li>
                                <li>Speed: How fast the animation cycles</li>
                                <li>Phase Offset: Timing offset relative to other parts</li>
                            </ul>
                        </div>

                        <div className="bg-gray-900 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-cyan-300 mb-2">Step 6: Export Your Animation</h3>
                            <p className="text-gray-300">When you're happy with your animation, you can:</p>
                            <ul className="list-disc pl-5 text-gray-300 mt-2 space-y-1">
                                <li>Download as a Spritesheet (recommended)</li>
                                <li>Download as a GIF (experimental)</li>
                            </ul>
                            <p className="text-gray-400 mt-2 text-sm">Note: The GIF export feature is still in development and may not work perfectly yet.</p>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-gray-700 flex justify-end">
                    <button onClick={onClose} className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-4 rounded-lg">
                        Got it!
                    </button>
                </div>
            </div>
        </div>
    );
};

const Footer = () => (
    <p className="text-center text-sm text-gray-500 mt-6">Created with React & Tailwind CSS.</p>
);

export default App;
