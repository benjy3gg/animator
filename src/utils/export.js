import { drawFrame } from './animation';

// GIF Generation Logic
export const generateGif = async (options) => {
    // Defensive check to ensure options and required properties are present
    if (!options || !options.bitmaps || !options.bitmaps.staticBody) {
        alert("Cannot generate GIF without a loaded image.");
        return;
    }
    const { bitmaps, parts, animationParams, partOrder, vertexGroups, setIsRendering, scale = 1 } = options;

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
            drawFrame(tempCtx, { bitmaps, parts, animationParams, partOrder, time, vertexGroups });

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
export const generateSpritesheet = (options) => {
    // Defensive check to ensure options and required properties are present
    if (!options || !options.bitmaps || !options.bitmaps.staticBody) {
        alert("Cannot generate spritesheet without a loaded image.");
        return;
    }
    const { bitmaps, parts, animationParams, partOrder, vertexGroups, setIsRendering, scale = 1 } = options;

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
        drawFrame(tempCtx, { bitmaps, parts, animationParams, partOrder, time, vertexGroups });

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