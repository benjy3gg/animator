import React from 'react';

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

export default HelpModal;