import React, { useRef, useEffect } from 'react';

const FloatingPreview = ({ bitmaps, parts, partOrder, animationParams, globalSeams = [], previewCanvasRef }) => {
    const canvasRef = useRef(null);
    const animationFrameId = useRef();

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!bitmaps.staticBody || !previewCanvasRef || !previewCanvasRef.current) {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        // Set canvas dimensions to match the source canvas
        const sourceCanvas = previewCanvasRef.current;
        canvas.width = sourceCanvas.width;
        canvas.height = sourceCanvas.height;

        const copyCanvas = () => {
            // Copy the content from the AnimationPreview canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(sourceCanvas, 0, 0);
            animationFrameId.current = requestAnimationFrame(copyCanvas);
        };

        animationFrameId.current = requestAnimationFrame(copyCanvas);
        return () => cancelAnimationFrame(animationFrameId.current);
    }, [bitmaps, previewCanvasRef]);

    return (
        <div className="fixed bottom-20 right-4 md:bottom-4 bg-gray-900/50 border-2 border-gray-700 rounded-lg shadow-2xl p-2 z-50">
            <canvas 
                ref={canvasRef}     
                style={{ 
                    maxWidth: '128px',
                    maxHeight: '128px',
                    objectFit: 'contain',
                    display: 'block'
                }}
            />
        </div>
    );
};

export default FloatingPreview;
