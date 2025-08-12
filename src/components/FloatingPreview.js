import React, { useRef, useEffect } from 'react';
import { drawFrame } from '../utils/animation';

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

export default FloatingPreview;