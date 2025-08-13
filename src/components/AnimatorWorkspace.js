import React, { useState } from 'react';
import PartManager from './PartManager';
import AnimationControls from './AnimationControls';
import SpriteEditor from './SpriteEditor';
import AnimationPreview from './AnimationPreview';

const AnimatorWorkspace = ({ image, parts, partOrder, setPartOrder, onPartsChange, bitmaps, animationParams, setAnimationParams, globalSeams, setGlobalSeams, previewCanvasRef }) => {
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
                 <SpriteEditor 
                    image={image} 
                    parts={parts}
                    activePart={activePart}
                    onPartsChange={onPartsChange}
                    animationParams={animationParams}
                    globalSeams={globalSeams}
                    setGlobalSeams={setGlobalSeams}
                 />
                 <AnimationPreview 
                    bitmaps={bitmaps}
                    parts={parts}
                    partOrder={partOrder}
                    animationParams={animationParams}
                    globalSeams={globalSeams}
                    canvasRef={previewCanvasRef}
                 />
            </div>
        </div>
    );
};

export default AnimatorWorkspace;
