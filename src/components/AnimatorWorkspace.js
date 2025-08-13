import React, { useState, useEffect } from 'react';
import PartManager from './PartManager';
import AnimationControls from './AnimationControls';
import SpriteEditor from './SpriteEditor';
import VertexEditor from './VertexEditor';
import AnimationPreview from './AnimationPreview';

const AnimatorWorkspace = ({ image, parts, partOrder, setPartOrder, onPartsChange, bitmaps, animationParams, setAnimationParams, previewCanvasRef, vertexGroups, setVertexGroups, activeVertexGroupIndex, setActiveVertexGroupIndex }) => {
    const [activePart, setActivePart] = useState(partOrder[0] || null);
    const [editorMode, setEditorMode] = useState('sprite'); // 'sprite' or 'vertex'

    // Create initial "whole" part when image is first loaded
    useEffect(() => {
        if (image && Object.keys(parts).length === 0) {
            // Create a canvas to trace the outline of the image
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');

            // Draw the image
            ctx.drawImage(image, 0, 0);

            // Trace the outline of the image considering transparency
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Find the bounding box of non-transparent pixels
            let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const alpha = data[(y * canvas.width + x) * 4 + 3];
                    if (alpha > 0) {
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                    }
                }
            }

            // Create a path around the bounding box
            const path = [
                { x: minX, y: minY },
                { x: maxX, y: minY },
                { x: maxX, y: maxY },
                { x: minX, y: maxY }
            ];

            // Create the "whole" part
            const wholePart = {
                paths: { add: [path], subtract: [] },
                anchor: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
                boundingBox: { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
            };

            // Create animation parameters for the "whole" part
            const wholePartAnimParams = {
                rotation: 0,
                moveX: 0,
                moveY: 0,
                scale: 1,
                speed: 1,
                offset: 0,
                tintColor: "#ff0000",
                tintIntensity: 0
            };

            // Update the parts, animation parameters, and part order
            onPartsChange({ "whole": wholePart });
            setAnimationParams(prev => ({ ...prev, "whole": wholePartAnimParams }));
            setPartOrder(["whole"]);
            setActivePart("whole");
        }
    }, [image, parts, onPartsChange, setAnimationParams, setPartOrder, setActivePart]);

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
        const newAnimParams = { ...animationParams, [trimmedName]: { rotation: 0, moveX: 0, moveY: 0, scale: 1, speed: 1, offset: 0, tintColor: "#ff0000", tintIntensity: 0 } };

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

        // Also remove vertices from this part from all vertex groups
        const newVertexGroups = vertexGroups.map(groupData => {
            const vertices = Array.isArray(groupData) ? groupData : groupData.vertices;
            const filteredVertices = vertices.filter(v => v.partId !== name);
            if (Array.isArray(groupData)) {
                return filteredVertices;
            }
            return { ...groupData, vertices: filteredVertices };
        });
        setVertexGroups(newVertexGroups);

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
            <div className="lg:col-span-2 grid lg:grid-cols-2 gap-6">
                <div className="flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                        <button 
                            className={`px-4 py-2 rounded-l-md ${editorMode === 'sprite' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                            onClick={() => setEditorMode('sprite')}
                        >
                            Sprite Editor
                        </button>
                        <button 
                            className={`px-4 py-2 rounded-r-md ${editorMode === 'vertex' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                            onClick={() => setEditorMode('vertex')}
                        >
                            Seam Editor
                        </button>
                    </div>

                    {editorMode === 'sprite' ? (
                        <SpriteEditor 
                            image={image} 
                            parts={parts}
                            activePart={activePart}
                            onPartsChange={onPartsChange}
                            animationParams={animationParams}
                        />
                    ) : (
                        <VertexEditor 
                            bitmaps={bitmaps}
                            parts={parts}
                            activePart={activePart}
                            onPartsChange={onPartsChange}
                            animationParams={animationParams}
                            vertexGroups={vertexGroups}
                            setVertexGroups={setVertexGroups}
                            activeVertexGroupIndex={activeVertexGroupIndex}
                            setActiveVertexGroupIndex={setActiveVertexGroupIndex}
                        />
                    )}
                </div>
                <AnimationPreview 
                    bitmaps={bitmaps}
                    parts={parts}
                    partOrder={partOrder}
                    animationParams={animationParams}
                    canvasRef={previewCanvasRef}
                    vertexGroups={vertexGroups}
                />
            </div>
        </div>
    );
};

export default AnimatorWorkspace;
