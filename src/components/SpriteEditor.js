import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import Magnifier from './Magnifier';

const SpriteEditor = ({ image, parts, activePart, onPartsChange, animationParams, globalSeams, setGlobalSeams }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState([]);
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0, visible: false });
    const [isShiftPressed, setIsShiftPressed] = useState(false);
    const longPressTimer = useRef();
    const touchStartPos = useRef({ x: 0, y: 0 });
    const isMouseDownRef = useRef(false);

    const getCanvasPos = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY};
    };

    // Function to finalize the path and create the part - memoized with useCallback
    const finalizePath = useCallback(() => {
        if (!activePart || currentPath.length < 3) {
            setIsDrawing(false);
            setCurrentPath([]);
            setCursorPos(prev => ({...prev, visible: false}));
            return;
        }

        // If shift is pressed, we don't modify the part selection
        // The seams are now collected during drawing in the useEffect
        if (isShiftPressed) {
            setCurrentPath([]);
            setIsDrawing(false);
            return;
        }

        console.log(currentPath)



        // Normal path (no shift): update part selection
        const newPaths = { add: [currentPath], subtract: [] };

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        newPaths.add.forEach(path => path.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }));

        const boundingBox = (isFinite(minX)) ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY } : null;

        // Preserve the anchor point if it was manually set before
        let anchor;
        if (parts[activePart] && parts[activePart].anchor) {
            // Keep the existing anchor point
            anchor = parts[activePart].anchor;
        } else {
            // Calculate a new anchor point based on the bounding box
            anchor = boundingBox ? { x: minX + boundingBox.width / 2, y: minY + boundingBox.height / 2 } : {x:0, y:0};
        }

        // By default, no seams are created when not using shift
        const seamPixels = parts[activePart]?.seamPixels || [];

        onPartsChange({ ...parts, [activePart]: { paths: newPaths, anchor, boundingBox, seamPixels } });
        setCurrentPath([]);
        setIsDrawing(false);
    }, [activePart, currentPath, parts, onPartsChange, setCurrentPath, setIsDrawing, setCursorPos, isShiftPressed]);

    // Add global mouse event listeners
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isDrawing) {
                finalizePath();
            }
            isMouseDownRef.current = false;
        };

        // Add global event listeners
        window.addEventListener('mouseup', handleGlobalMouseUp);

        // Clean up
        return () => {
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [isDrawing, finalizePath]);

    // Add keyboard event listeners for shift key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Shift') {
                setIsShiftPressed(true);
            }
        };

        const handleKeyUp = (e) => {
            if (e.key === 'Shift') {
                setIsShiftPressed(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const handleMouseDown = (e) => {
        if (!activePart) return;
        e.preventDefault();
        isMouseDownRef.current = true;

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

        // Continue drawing if mouse is down and we're in drawing mode
        if (isDrawing && isMouseDownRef.current) {
            e.preventDefault();
            setCurrentPath(prev => [...prev, pos]);
        }
    };

    const handleMouseUp = (e) => {
        if (!isDrawing) {
            setCursorPos(prev => ({...prev, visible: false}));
            return;
        }

        e.preventDefault();
        // The actual finalization is handled by the global mouse up handler
        // This is just for when the mouse up happens inside the canvas
        finalizePath();
        setCursorPos(prev => ({...prev, visible: false}));
    };

    const handleMouseLeave = (e) => {
        // Only hide the cursor when mouse leaves, but don't end drawing
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
        setCursorPos({ x: currentPos.x, y: currentPos.y, visible: true, color: currentPos.color});

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

            // Draw the part with orange fill
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = 'orange';
            part.paths.add.forEach(path => {
                ctx.beginPath();
                if(path.length > 0) ctx.moveTo(path[0].x, path[0].y);
                path.forEach((p, i) => {
                    i !== 0 && ctx.lineTo(p.x, p.y)

                    const colorData = ctx.getImageData(p.x, p.y, 1,1).data;
                    if(colorData[3] > 0) {
                        // Create a color object with RGBA values
                        const color = {
                            r: colorData[0],
                            g: colorData[1],
                            b: colorData[2],
                            a: colorData[3] / 255
                        };

                        // Check if this pixel is already part of an existing seam
                        const existingSeamIndex = globalSeams.findIndex(seam => 
                            seam.pixels.some(pixel => 
                                Math.abs(pixel.x - p.x) < 5 && Math.abs(pixel.y - p.y) < 5
                            )
                        );

                        if (existingSeamIndex !== -1) {
                            // If this pixel is close to an existing seam, add this part to that seam's partKey array
                            const existingSeam = globalSeams[existingSeamIndex];
                            if (!existingSeam.partKey.includes(activePart)) {
                                existingSeam.partKey.push(activePart);
                            }

                            // Find the index of the pixel in the existing seam
                            const pixelIndex = existingSeam.pixels.findIndex(pixel => 
                                Math.abs(pixel.x - p.x) < 5 && Math.abs(pixel.y - p.y) < 5
                            );

                            // If the pixel is found, update its color
                            if (pixelIndex !== -1) {
                                // Initialize colors array if it doesn't exist
                                if (!existingSeam.colors) {
                                    existingSeam.colors = [];
                                }

                                // Ensure the colors array is at least as long as the pixels array
                                while (existingSeam.colors.length < existingSeam.pixels.length) {
                                    existingSeam.colors.push(null);
                                }

                                // Update the color at the pixel index
                                existingSeam.colors[pixelIndex] = color;
                            } else {
                                // If the pixel is not found (which shouldn't happen), add it and its color
                                existingSeam.pixels.push(p);
                                if (!existingSeam.colors) {
                                    existingSeam.colors = [];
                                }
                                existingSeam.colors.push(color);
                            }
                        } else {
                            // Otherwise, create a new seam with this part and store the color
                            globalSeams.push({
                                partKey: [activePart], // Make partKey an array
                                pixels: [p],
                                colors: [color] // Store the color with the pixel
                            });
                        }
                    };
                });
                ctx.fillStyle = 'orange';
                ctx.closePath();
                ctx.fill();
            });

            // Draw global seam pixels for this part in green if they exist
            const partSeams = globalSeams.filter(seam => Array.isArray(seam.partKey) ? seam.partKey.includes(activePart) : seam.partKey === activePart);
            if (partSeams.length > 0) {
                ctx.globalAlpha = 0.6;
                ctx.strokeStyle = 'green';
                ctx.lineWidth = 3;

                partSeams.forEach(seam => {
                    const pixels = seam.pixels;
                    if (pixels && pixels.length > 0) {
                        ctx.beginPath();
                        ctx.moveTo(pixels[0].x, pixels[0].y);
                        pixels.forEach((p, i) => i !== 0 && ctx.lineTo(p.x, p.y));
                        ctx.closePath();
                        ctx.stroke();
                    }
                });
            }

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
    }, [image, parts, activePart, isDrawing, currentPath, animationParams, globalSeams]);

    return (
        <div className="bg-gray-900 rounded-lg p-4 flex flex-col items-center justify-center relative">
            <div className="w-full mb-2">
                <h3 className="text-lg font-semibold text-gray-300">2. Editor</h3>
                <div className="text-xs text-gray-400 bg-gray-950 p-2 rounded-md flex items-start gap-2">
                    <AlertTriangle size={24} className="text-yellow-400 flex-shrink-0"/>
                    <div>
                        Draw to select. Hold <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-md">Alt</kbd> and click to set anchor. Long-press on mobile. 
                        Hold <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-md">Shift</kbd> while drawing to create seams (highlighted in green).
                    </div>
                </div>
            </div>
            <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown} 
                onMouseMove={handleMouseMove} 
                onMouseUp={handleMouseUp} 
                onMouseLeave={handleMouseLeave}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="max-w-full max-h-[80vh] min-h-[400px] object-contain cursor-crosshair"
                style={{ touchAction: 'none' }}
            />
            <Magnifier sourceCanvasRef={canvasRef} cursorPos={cursorPos} zoomLevel={4} />
        </div>
    );
};

export default SpriteEditor;
