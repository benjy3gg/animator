// Animation drawing logic
export const drawFrame = (ctx, bitmaps, parts, animationParams, partOrder, time) => {
    const ANIMATION_DURATION = 2000; // 2 seconds
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if(bitmaps.staticBody) ctx.drawImage(bitmaps.staticBody, 0, 0);

    // Store transformed part data for seam detection
    const transformedParts = [];

    // First pass: Calculate transformed positions for all parts
    [...partOrder].reverse().forEach(key => {
        const part = parts[key];
        const bitmap = bitmaps[key];
        const params = animationParams[key];
        if (!part || !bitmap || !params || !part.anchor) return;

        const cycle = Math.sin((time / ANIMATION_DURATION) * 2 * Math.PI * params.speed + (params.offset * Math.PI / 180));
        const currentRotation = (params.rotation * Math.PI / 180) * cycle;
        const currentMoveX = params.moveX * cycle;
        const currentMoveY = params.moveY * cycle;
        const currentScale = 1 + (params.scale - 1) * Math.abs(cycle);

        // Store transformed part data
        transformedParts.push({
            key,
            part,
            bitmap,
            params,
            transform: {
                x: part.anchor.x + currentMoveX,
                y: part.anchor.y + currentMoveY,
                rotation: currentRotation,
                scale: currentScale,
                cycle
            }
        });
    });

    // Second pass: Draw seam patches between adjacent parts (disabled)
    // Seam patch creation is currently disabled
    /*
    for (let i = 0; i < transformedParts.length; i++) {
        for (let j = i + 1; j < transformedParts.length; j++) {
            const partA = transformedParts[i];
            const partB = transformedParts[j];

            // Skip if parts don't have paths or bounding boxes
            if (!partA.part.paths?.add?.length || !partB.part.paths?.add?.length ||
                !partA.part.boundingBox || !partB.part.boundingBox) {
                continue;
            }

            // Find potential seam between parts
            const seam = findSeamBetweenParts(partA, partB);
            if (seam && seam.points.length >= 2) {
                // Draw seam patch
                drawSeamPatch(ctx, seam, partA, partB);
            }
        }
    }
    */

    // Third pass: Draw the parts as before
    transformedParts.forEach(({ key, part, bitmap, params, transform }) => {
        const applyTint = params.tintIntensity > 0;
        const tintCycle = Math.abs(transform.cycle);
        const currentTintIntensity = params.tintIntensity * tintCycle;

        ctx.save();
        ctx.translate(transform.x, transform.y);
        ctx.rotate(transform.rotation);
        ctx.scale(transform.scale, transform.scale);

        // Draw the part
        ctx.drawImage(bitmap, -part.anchor.x, -part.anchor.y);

        // Apply color tint as an overlay if tintIntensity > 0
        if (applyTint && currentTintIntensity > 0) {
            const partWidth = bitmap.width;
            const partHeight = bitmap.height;

            // Create a temporary canvas for the tint effect
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = partWidth;
            tempCanvas.height = partHeight;
            const tempCtx = tempCanvas.getContext('2d');

            // Draw the part on the temporary canvas
            tempCtx.drawImage(bitmap, 0, 0);

            // Apply the tint color with globalCompositeOperation
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.globalAlpha = currentTintIntensity;
            tempCtx.fillStyle = params.tintColor;
            tempCtx.fillRect(0, 0, partWidth, partHeight);

            // Draw the tinted part back to the main canvas
            ctx.drawImage(tempCanvas, -part.anchor.x, -part.anchor.y);
        }

        ctx.restore();
    });
};

// Function to find a seam between two parts
export const findSeamBetweenParts = (partA, partB) => {
    // Get the paths from both parts
    const pathsA = partA.part.paths.add;
    const pathsB = partB.part.paths.add;

    // Find the closest points between the two parts' paths
    let minDistance = Infinity;
    let closestPointsA = [];
    let closestPointsB = [];

    // Check if bounding boxes are close to each other (optimization)
    const boxA = partA.part.boundingBox;
    const boxB = partB.part.boundingBox;

    const boxDistance = Math.min(
        Math.abs(boxA.x - (boxB.x + boxB.width)),
        Math.abs(boxB.x - (boxA.x + boxA.width)),
        Math.abs(boxA.y - (boxB.y + boxB.height)),
        Math.abs(boxB.y - (boxA.y + boxA.height))
    );

    // If bounding boxes are too far apart, skip detailed analysis
    if (boxDistance > 30) {
        return null;
    }

    // For each path in part A
    pathsA.forEach(pathA => {
        // For each path in part B
        pathsB.forEach(pathB => {
            // Sample points from paths to reduce computation
            // For longer paths, we don't need to check every point
            const sampleRateA = Math.max(1, Math.floor(pathA.length / 20));
            const sampleRateB = Math.max(1, Math.floor(pathB.length / 20));

            // For each point in path A (sampled)
            for (let i = 0; i < pathA.length; i += sampleRateA) {
                const pointA = pathA[i];

                // For each point in path B (sampled)
                for (let j = 0; j < pathB.length; j += sampleRateB) {
                    const pointB = pathB[j];

                    // Calculate distance between points
                    const distance = Math.sqrt(
                        Math.pow(pointA.x - pointB.x, 2) + 
                        Math.pow(pointA.y - pointB.y, 2)
                    );

                    // If points are close (within 20 pixels), consider them part of a seam
                    if (distance < 20) {
                        // Store these points as potential seam points
                        closestPointsA.push({
                            point: pointA,
                            pathIndex: i,
                            path: pathA
                        });

                        closestPointsB.push({
                            point: pointB,
                            pathIndex: j,
                            path: pathB
                        });

                        if (distance < minDistance) {
                            minDistance = distance;
                        }
                    }
                }
            }
        });
    });

    // If we found close points, create a seam
    if (closestPointsA.length > 0 && closestPointsB.length > 0) {
        // Sort points to create a continuous seam
        const seamPoints = [];

        // Add unique points to avoid duplicates
        const addedPoints = new Set();

        // First add points from part A
        closestPointsA.forEach(({ point }) => {
            const key = `${Math.round(point.x)},${Math.round(point.y)}`;
            if (!addedPoints.has(key)) {
                seamPoints.push({...point}); // Clone to avoid reference issues
                addedPoints.add(key);
            }
        });

        // Then add points from part B
        closestPointsB.forEach(({ point }) => {
            const key = `${Math.round(point.x)},${Math.round(point.y)}`;
            if (!addedPoints.has(key)) {
                seamPoints.push({...point}); // Clone to avoid reference issues
                addedPoints.add(key);
            }
        });

        // If we have at least 2 points, we can create a seam
        if (seamPoints.length >= 2) {
            try {
                // Sample the color at the seam from the original image
                const seamColor = getAverageColor(partA.bitmap, partB.bitmap);

                return {
                    points: seamPoints,
                    color: seamColor
                };
            } catch (error) {
                console.error("Error creating seam:", error);
                return null;
            }
        }
    }

    return null;
};

// Function to get the average color between two bitmaps
export const getAverageColor = (bitmapA, bitmapB) => {
    // Create a temporary canvas to sample colors
    const tempCanvas = document.createElement('canvas');
    const size = 1;
    tempCanvas.width = size;
    tempCanvas.height = size;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

    // Draw a small portion of each bitmap
    tempCtx.drawImage(bitmapA, 0, 0, bitmapA.width, bitmapA.height, 0, 0, size, size);
    const dataA = tempCtx.getImageData(0, 0, 1, 1).data;

    tempCtx.clearRect(0, 0, size, size);
    tempCtx.drawImage(bitmapB, 0, 0, bitmapB.width, bitmapB.height, 0, 0, size, size);
    const dataB = tempCtx.getImageData(0, 0, 1, 1).data;

    // Calculate average color
    const r = Math.floor((dataA[0] + dataB[0]) / 2);
    const g = Math.floor((dataA[1] + dataB[1]) / 2);
    const b = Math.floor((dataA[2] + dataB[2]) / 2);
    const a = Math.floor((dataA[3] + dataB[3]) / 2) / 255;

    return `rgba(${r}, ${g}, ${b}, ${a})`;
};

// Function to draw a patch between two parts
export const drawSeamPatch = (ctx, seam, partA, partB) => {
    try {
        // Apply transformations to seam points based on part transformations
        const transformedPointsA = transformPoints(seam.points, partA.transform, partA.part.anchor);
        const transformedPointsB = transformPoints(seam.points, partB.transform, partB.part.anchor);

        // Skip if we don't have enough points
        if (transformedPointsA.length < 2 || transformedPointsB.length < 2) {
            return;
        }

        // Sort points to create a more natural polygon
        // We'll sort points by their angle from the center to create a convex hull-like shape
        const sortPointsByAngle = (points) => {
            // Calculate center point
            const center = points.reduce(
                (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
                { x: 0, y: 0 }
            );
            center.x /= points.length;
            center.y /= points.length;

            // Sort points by angle
            return [...points].sort((a, b) => {
                const angleA = Math.atan2(a.y - center.y, a.x - center.x);
                const angleB = Math.atan2(b.y - center.y, b.x - center.x);
                return angleA - angleB;
            });
        };

        // Create a combined set of points and sort them
        const allPoints = [...transformedPointsA, ...transformedPointsB];
        const sortedPoints = sortPointsByAngle(allPoints);

        // Draw a polygon connecting the transformed points
        ctx.save();
        ctx.beginPath();

        // Start with the first point
        if (sortedPoints.length > 0) {
            ctx.moveTo(sortedPoints[0].x, sortedPoints[0].y);

            // Draw lines through all sorted points
            for (let i = 1; i < sortedPoints.length; i++) {
                ctx.lineTo(sortedPoints[i].x, sortedPoints[i].y);
            }

            // Close the path
            ctx.closePath();

            // Fill with the seam color
            ctx.fillStyle = seam.color;

            // Use a slight blur for smoother edges
            ctx.shadowColor = seam.color;
            ctx.shadowBlur = 2;

            ctx.fill();
        }

        ctx.restore();
    } catch (error) {
        console.error("Error drawing seam patch:", error);
    }
};

// Function to transform points based on part transformation
export const transformPoints = (points, transform, anchor) => {
    if (!points || !points.length || !transform || !anchor) {
        return [];
    }

    // Cache trigonometric calculations for better performance
    const cos = Math.cos(transform.rotation);
    const sin = Math.sin(transform.rotation);

    return points.map(point => {
        try {
            // Calculate point relative to anchor
            const relX = point.x - anchor.x;
            const relY = point.y - anchor.y;

            // Apply rotation
            const rotatedX = relX * cos - relY * sin;
            const rotatedY = relX * sin + relY * cos;

            // Apply scale
            const scaledX = rotatedX * transform.scale;
            const scaledY = rotatedY * transform.scale;

            // Apply translation and return
            return {
                x: scaledX + transform.x,
                y: scaledY + transform.y
            };
        } catch (error) {
            console.error("Error transforming point:", error, point);
            // Return a safe default if transformation fails
            return { x: transform.x, y: transform.y };
        }
    });
};