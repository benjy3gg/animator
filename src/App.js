import React, { useState, useEffect, useCallback } from 'react';
import { loadScript } from './utils/loadScript';
import { generateGif, generateSpritesheet } from './utils/export';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import AnimatorWorkspace from './components/AnimatorWorkspace';
import FloatingPreview from './components/FloatingPreview';
import Footer from './components/Footer';
import ConfigModal from './components/ConfigModal';
import HelpModal from './components/HelpModal';

// Main App Component
const App = () => {
    // State Management
    const [image, setImage] = useState(null);
    const [parts, setParts] = useState({});
    const [partOrder, setPartOrder] = useState([]);
    const [bitmaps, setBitmaps] = useState({});
    const [animationParams, setAnimationParams] = useState({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    // Check if user has seen the help modal before
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(() => {
        try {
            return localStorage.getItem('hasSeenHelpModal') !== 'true';
        } catch (error) {
            // If localStorage is not available, default to showing the modal
            console.warn('localStorage is not available:', error);
            return true;
        }
    });
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

    // Function to update bitmaps based on user-drawn paths only
    const updateBitmaps = useCallback(async (newParts) => {
        if (!image) return;
        try {
            const newBitmaps = {};
            const { width, height } = image;

            const masterMaskCanvas = document.createElement('canvas');
            masterMaskCanvas.width = width;
            masterMaskCanvas.height = height;
            const masterMaskCtx = masterMaskCanvas.getContext('2d');

            for (const key in newParts) {
                const part = newParts[key];
                if (part.paths.add.length === 0) continue;

                const partMaskCanvas = document.createElement('canvas');
                partMaskCanvas.width = width;
                partMaskCanvas.height = height;
                const partMaskCtx = partMaskCanvas.getContext('2d');

                // Draw the user-defined paths directly without color-based expansion
                part.paths.add.forEach(path => {
                    partMaskCtx.beginPath();
                    if(path.length > 0) partMaskCtx.moveTo(path[0].x, path[0].y);
                    path.forEach(p => partMaskCtx.lineTo(p.x, p.y));
                    partMaskCtx.closePath();
                    partMaskCtx.fill();
                });

                const partCanvas = document.createElement('canvas');
                partCanvas.width = width;
                partCanvas.height = height;
                const partCtx = partCanvas.getContext('2d');
                partCtx.drawImage(image, 0, 0);
                partCtx.globalCompositeOperation = 'destination-in';
                partCtx.drawImage(partMaskCanvas, 0, 0);
                newBitmaps[key] = await createImageBitmap(partCanvas);

                masterMaskCtx.drawImage(partMaskCanvas, 0, 0);
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
                    onClose={() => {
                        try {
                            localStorage.setItem('hasSeenHelpModal', 'true');
                        } catch (error) {
                            console.warn('Could not save help modal preference:', error);
                        }
                        setIsHelpModalOpen(false);
                    }}
                />
            )}
        </div>
    );
};


export default App;
