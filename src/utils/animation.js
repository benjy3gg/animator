// Helper function to calculate distance between two points
const distance = (p1, p2) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

// Helper function to create uniformly spaced vertices along a path
const createUniformVertices = (path, spacing = 20) => {
    if (!path || path.length < 2) return path;

    let totalLength = 0;
    for (let i = 1; i < path.length; i++) {
        totalLength += distance(path[i-1], path[i]);
    }

    const numVertices = Math.max(4, Math.ceil(totalLength / spacing));
    const uniformVertices = [];
    const segmentLength = totalLength / (numVertices - 1);

    uniformVertices.push(path[0]);

    let currentDist = 0;
    let currentSegment = 0;
    let remainingDist = segmentLength;

    for (let i = 1; i < path.length; i++) {
        const segDist = distance(path[i-1], path[i]);

        while (segDist > remainingDist && currentSegment < numVertices - 2) {
            const ratio = remainingDist / segDist;
            const newX = path[i-1].x + ratio * (path[i].x - path[i-1].x);
            const newY = path[i-1].y + ratio * (path[i].y - path[i-1].y);

            uniformVertices.push({ x: newX, y: newY });
            currentSegment++;

            currentDist += remainingDist;
            remainingDist = segmentLength;
        }

        remainingDist -= segDist;
        currentDist += segDist;
    }

    uniformVertices.push(path[path.length - 1]);

    return uniformVertices;
};

// Helper function to create a convex hull from a set of points using the Monotone Chain algorithm
const createConvexHull = (points) => {
    // Need at least 3 points to form a hull
    if (points.length <= 3) {
        // For 3 or fewer points, sorting by angle is sufficient and simpler.
        const center = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
        center.x /= points.length;
        center.y /= points.length;
        return [...points].sort((a, b) => {
            const angleA = Math.atan2(a.y - center.y, a.x - center.x);
            const angleB = Math.atan2(b.y - center.y, b.x - center.x);
            return angleA - angleB;
        });
    }

    // Sort points lexicographically (by x, then y) to find the start and end points of the hull
    points.sort((a, b) => a.x - b.x || a.y - b.y);

    const crossProduct = (o, a, b) => {
        return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    };

    // Build the lower hull
    const lower = [];
    for (const p of points) {
        while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
            lower.pop();
        }
        lower.push(p);
    }

    // Build the upper hull
    const upper = [];
    for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i];
        while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
            upper.pop();
        }
        upper.push(p);
    }

    // Concatenate the lower and upper hulls, removing duplicate start/end points
    return lower.slice(0, -1).concat(upper.slice(0, -1));
};
        
// Animation drawing logic
export const drawFrame = (ctx, options) => {
    const { bitmaps, parts, animationParams, partOrder, time, vertexGroups = [] } = options;
    const ANIMATION_DURATION = 2000; // 2 seconds
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    //if(bitmaps.staticBody) ctx.drawImage(bitmaps.staticBody, 0, 0);

    const transformedParts = [];

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

    vertexGroups.forEach(groupData => {
        const group = Array.isArray(groupData) ? groupData : groupData.vertices;
        const customColor = (groupData && !Array.isArray(groupData)) ? groupData.color : null;

        if (!group || group.length < 3) return;

        const allTransformedVertices = [];
        const allOriginalVerticesWithBitmaps = [];

        group.forEach((vertexData) => {
            const transformedPart = transformedParts.find(p => p.key === vertexData.partId);
            if (!transformedPart) return;

            const { part, bitmap, transform } = transformedPart;
            const path = vertexData.pathType === 'add'
                ? part.paths.add[vertexData.pathIndex]
                : part.paths.subtract[vertexData.pathIndex];
            if (!path) return;

            const uniformVertices = createUniformVertices(path);
            const vertex = uniformVertices[vertexData.vertexIndex];
            if (!vertex) return;

            allOriginalVerticesWithBitmaps.push({ vertex, bitmap });
            const transformedVertex = transformPoints([vertex], transform, part.anchor)[0];
            if (transformedVertex) {
                allTransformedVertices.push(transformedVertex);
            }
        });

        if (allTransformedVertices.length >= 3) {
            const parseRgba = (rgba) => {
                const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
                if (!match) return {r: 0, g: 0, b: 0, a: 0};
                return {
                    r: parseInt(match[1], 10),
                    g: parseInt(match[2], 10),
                    b: parseInt(match[3], 10),
                    a: match[4] ? parseFloat(match[4]) : 1
                };
            };

            let polygonColor;
            if (customColor) {
                polygonColor = customColor;
            } else {
                let totalR = 0, totalG = 0, totalB = 0, totalA = 0;
                allOriginalVerticesWithBitmaps.forEach(({vertex, bitmap}) => {
                    const colorString = getColorAtPixel(bitmap, vertex.x, vertex.y);
                    const color = parseRgba(colorString);
                    totalR += color.r;
                    totalG += color.g;
                    totalB += color.b;
                    totalA += color.a;
                });
    
                const numVertices = allOriginalVerticesWithBitmaps.length;
                const avgR = Math.floor(totalR / numVertices);
                const avgG = Math.floor(totalG / numVertices);
                const avgB = Math.floor(totalB / numVertices);
                //const avgA = totalA / numVertices;
    
                polygonColor = `rgba(${avgR}, ${avgG}, ${avgB}, 1.0)`
            }

            const hullVertices = createConvexHull([...allTransformedVertices]);

            if (hullVertices.length >= 3) {
                const center = hullVertices.reduce((acc, p) => ({x: acc.x + p.x, y: acc.y + p.y}), {x: 0, y: 0});
                center.x /= hullVertices.length;
                center.y /= hullVertices.length;

                const scaleFactor = 1.2;
                const scaledHullVertices = hullVertices.map(p => ({
                    x: center.x + (p.x - center.x) * scaleFactor,
                    y: center.y + (p.y - center.y) * scaleFactor
                }));

                ctx.fillStyle = polygonColor;
                ctx.beginPath();
                ctx.moveTo(scaledHullVertices[0].x, scaledHullVertices[0].y);
                for (let i = 1; i < scaledHullVertices.length; i++) {
                    ctx.lineTo(scaledHullVertices[i].x, scaledHullVertices[i].y);
                }
                ctx.closePath();
                ctx.fill();
            }

        }
    });

    transformedParts.forEach(({ key, part, bitmap, params, transform }) => {
        const applyTint = params.tintIntensity > 0;
        const tintCycle = Math.abs(transform.cycle);
        const currentTintIntensity = params.tintIntensity * tintCycle;

        ctx.save();
        ctx.translate(transform.x, transform.y);
        ctx.rotate(transform.rotation);
        ctx.scale(transform.scale, transform.scale);

        ctx.drawImage(bitmap, -part.anchor.x, -part.anchor.y);

        if (applyTint && currentTintIntensity > 0) {
            const partWidth = bitmap.width;
            const partHeight = bitmap.height;

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = partWidth;
            tempCanvas.height = partHeight;
            const tempCtx = tempCanvas.getContext('2d');

            tempCtx.drawImage(bitmap, 0, 0);

            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.globalAlpha = currentTintIntensity;
            tempCtx.fillStyle = params.tintColor;
            tempCtx.fillRect(0, 0, partWidth, partHeight);

            ctx.drawImage(tempCanvas, -part.anchor.x, -part.anchor.y);
        }

        ctx.restore();
    });
};

export const getColorAtPixel = (bitmap, x, y) => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = bitmap.width;
    tempCanvas.height = bitmap.height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

    tempCtx.drawImage(bitmap, 0, 0);

    const safeX = Math.max(0, Math.min(bitmap.width - 1, Math.floor(x)));
    const safeY = Math.max(0, Math.min(bitmap.height - 1, Math.floor(y)));

    const data = tempCtx.getImageData(safeX, safeY, 1, 1).data;

    return `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${data[3] / 255})`;
};

export const findSeamBetweenParts = (partA, partB) => {
    const pathsA = partA.part.paths.add;
    const pathsB = partB.part.paths.add;

    let minDistance = Infinity;
    let closestPointsA = [];
    let closestPointsB = [];

    const boxA = partA.part.boundingBox;
    const boxB = partB.part.boundingBox;

    const boxDistance = Math.min(
        Math.abs(boxA.x - (boxB.x + boxB.width)),
        Math.abs(boxB.x - (boxA.x + boxA.width)),
        Math.abs(boxA.y - (boxB.y + boxB.height)),
        Math.abs(boxB.y - (boxA.y + boxA.height))
    );

    if (boxDistance > 30) {
        return null;
    }

    pathsA.forEach(pathA => {
        pathsB.forEach(pathB => {
            const sampleRateA = Math.max(1, Math.floor(pathA.length / 20));
            const sampleRateB = Math.max(1, Math.floor(pathB.length / 20));

            for (let i = 0; i < pathA.length; i += sampleRateA) {
                const pointA = pathA[i];

                for (let j = 0; j < pathB.length; j += sampleRateB) {
                    const pointB = pathB[j];

                    const distance = Math.sqrt(
                        Math.pow(pointA.x - pointB.x, 2) + 
                        Math.pow(pointA.y - pointB.y, 2)
                    );

                    if (distance < 20) {
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

    if (closestPointsA.length > 0 && closestPointsB.length > 0) {
        const seamPoints = [];

        const addedPoints = new Set();

        closestPointsA.forEach(({ point }) => {
            const key = `${Math.round(point.x)},${Math.round(point.y)}`;
            if (!addedPoints.has(key)) {
                seamPoints.push({...point});
                addedPoints.add(key);
            }
        });

        closestPointsB.forEach(({ point }) => {
            const key = `${Math.round(point.x)},${Math.round(point.y)}`;
            if (!addedPoints.has(key)) {
                seamPoints.push({...point});
                addedPoints.add(key);
            }
        });

        if (seamPoints.length >= 2) {
            try {
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

export const getAverageColor = (bitmapA, bitmapB) => {
    const tempCanvas = document.createElement('canvas');
    const size = 1;
    tempCanvas.width = size;
    tempCanvas.height = size;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

    tempCtx.drawImage(bitmapA, 0, 0, bitmapA.width, bitmapA.height, 0, 0, size, size);
    const dataA = tempCtx.getImageData(0, 0, 1, 1).data;

    tempCtx.clearRect(0, 0, size, size);
    tempCtx.drawImage(bitmapB, 0, 0, bitmapB.width, bitmapB.height, 0, 0, size, size);
    const dataB = tempCtx.getImageData(0, 0, 1, 1).data;

    const r = Math.floor((dataA[0] + dataB[0]) / 2);
    const g = Math.floor((dataA[1] + dataB[1]) / 2);
    const b = Math.floor((dataA[2] + dataB[2]) / 2);
    const a = Math.floor((dataA[3] + dataB[3]) / 2) / 255;

    return `rgba(${r}, ${g}, ${b}, ${a})`;
};

export const drawSeamPatch = (ctx, seam, partA, partB) => {
    try {
        const transformedPointsA = transformPoints(seam.points, partA.transform, partA.part.anchor);
        const transformedPointsB = transformPoints(seam.points, partB.transform, partB.part.anchor);

        if (transformedPointsA.length < 2 || transformedPointsB.length < 2) {
            return;
        }

        const sortPointsByAngle = (points) => {
            const center = points.reduce(
                (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
                { x: 0, y: 0 }
            );
            center.x /= points.length;
            center.y /= points.length;

            return [...points].sort((a, b) => {
                const angleA = Math.atan2(a.y - center.y, a.x - center.x);
                const angleB = Math.atan2(b.y - center.y, b.x - center.x);
                return angleA - angleB;
            });
        };

        const allPoints = [...transformedPointsA, ...transformedPointsB];
        const sortedPoints = sortPointsByAngle(allPoints);

        ctx.save();
        ctx.beginPath();

        if (sortedPoints.length > 0) {
            ctx.moveTo(sortedPoints[0].x, sortedPoints[0].y);

            for (let i = 1; i < sortedPoints.length; i++) {
                ctx.lineTo(sortedPoints[i].x, sortedPoints[i].y);
            }

            ctx.closePath();

            ctx.fillStyle = seam.color;

            ctx.shadowColor = seam.color;
            ctx.shadowBlur = 2;

            ctx.fill();
        }

        ctx.restore();
    } catch (error) {
        console.error("Error drawing seam patch:", error);
    }
};

export const transformPoints = (points, transform, anchor) => {
    if (!points || !points.length || !transform || !anchor) {
        return [];
    }

    const cos = Math.cos(transform.rotation);
    const sin = Math.sin(transform.rotation);

    return points.map(point => {
        try {
            const relX = point.x - anchor.x;
            const relY = point.y - anchor.y;

            const rotatedX = relX * cos - relY * sin;
            const rotatedY = relX * sin + relY * cos;

            const scaledX = rotatedX * transform.scale;
            const scaledY = rotatedY * transform.scale;

            return {
                x: scaledX + transform.x,
                y: scaledY + transform.y
            };
        } catch (error) {
            console.error("Error transforming point:", error, point);
            return { x: transform.x, y: transform.y };
        }
    });
};
