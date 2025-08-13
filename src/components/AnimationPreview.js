import React, { useRef, useEffect } from 'react';
import { drawFrame } from '../utils/animation';

const AnimationPreview = ({ bitmaps, parts, partOrder, animationParams, globalSeams, canvasRef }) => {
    // Use the provided canvasRef or create a local one if not provided
    const localCanvasRef = useRef(null);
    const actualCanvasRef = canvasRef || localCanvasRef;
    const animationFrameId = useRef();

    useEffect(() => {
        const canvas = actualCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!bitmaps.staticBody) {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        };
        canvas.width = bitmaps.staticBody.width;
        canvas.height = bitmaps.staticBody.height;

        const animate = (time) => {
            drawFrame(ctx, bitmaps, parts, animationParams, partOrder, time, globalSeams);
            animationFrameId.current = requestAnimationFrame(animate);
        };
        animationFrameId.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrameId.current);
    }, [bitmaps, parts, animationParams, partOrder, globalSeams]);

    return (
        <div className="bg-gray-900 rounded-lg p-4 flex flex-col items-center justify-center">
            <h3 className="text-lg font-semibold text-gray-300 mb-2 self-start">4. Live Preview</h3>
            <canvas ref={actualCanvasRef} className="max-w-full max-h-[80vh] min-h-[400px] object-contain" />
        </div>
    );
};

export default AnimationPreview;
