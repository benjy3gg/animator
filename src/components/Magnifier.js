import React, { useRef, useEffect } from 'react';

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

    }, [cursorPos, sourceCanvasRef, zoomLevel, SOURCE_SIZE, MAGNIFIER_SIZE]);

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

export default Magnifier;