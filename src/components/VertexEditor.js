import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import Magnifier from './Magnifier';

// Function to calculate distance between two points
const distance = (p1, p2) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

// Function to create uniformly spaced vertices along a path
const createUniformVertices = (path, spacing = 20) => {
    if (!path || path.length < 2) return path;

    // Calculate the total length of the path
    let totalLength = 0;
    for (let i = 1; i < path.length; i++) {
        totalLength += distance(path[i-1], path[i]);
    }

    // Calculate how many vertices we need
    const numVertices = Math.max(4, Math.ceil(totalLength / spacing));

    // Create uniformly spaced vertices
    const uniformVertices = [];
    const segmentLength = totalLength / (numVertices - 1);

    // Add the first point
    uniformVertices.push(path[0]);

    let currentDist = 0;
    let currentSegment = 0;
    let remainingDist = segmentLength;

    for (let i = 1; i < path.length; i++) {
        const segDist = distance(path[i-1], path[i]);

        // If this segment is longer than what we need for the next vertex
        while (segDist > remainingDist && currentSegment < numVertices - 2) {
            // Calculate the position of the new vertex
            const ratio = remainingDist / segDist;
            const newX = path[i-1].x + ratio * (path[i].x - path[i-1].x);
            const newY = path[i-1].y + ratio * (path[i].y - path[i-1].y);

            uniformVertices.push({ x: newX, y: newY });
            currentSegment++;

            // Update remaining distance for the next vertex
            currentDist += remainingDist;
            remainingDist = segmentLength;
        }

        // Update remaining distance for the next segment
        remainingDist -= segDist;
        currentDist += segDist;
    }

    // Add the last point
    uniformVertices.push(path[path.length - 1]);

    return uniformVertices;
};


const partColors = ['#4299E1', '#F56565', '#48BB78', '#ED8936', '#9F7AEA', '#38B2AC'];
const getColor = (index) => partColors[index % partColors.length];
const VISUAL_OFFSET = 50;

const VertexEditor = ({ bitmaps, parts, activePart, onPartsChange, animationParams }) => {
    const canvasRef = useRef(null);
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0, visible: false });
    const [isShiftPressed, setIsShiftPressed] = useState(false);
    const [partPositions, setPartPositions] = useState({});
    const [draggingPart, setDraggingPart] = useState(null);
    const [partImageData, setPartImageData] = useState({});

    const partIds = Object.keys(parts).sort().join(',');

    useEffect(() => {
        if (!bitmaps) return;
        const newData = {};
        Object.keys(bitmaps).forEach(partId => {
            const bitmap = bitmaps[partId];
            if (bitmap) {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = bitmap.width;
                tempCanvas.height = bitmap.height;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(bitmap, 0, 0);
                newData[partId] = tempCtx.getImageData(0, 0, bitmap.width, bitmap.height);
            }
        });
        setPartImageData(newData);
    }, [bitmaps]);

    useEffect(() => {
        setPartPositions(prev => {
            const newPos = { ...prev };
            const currentPartIds = Object.keys(parts);
            const posIds = Object.keys(prev);

            currentPartIds.forEach((partId, index) => {
                if (!newPos[partId]) {
                    newPos[partId] = { x: index * VISUAL_OFFSET, y: index * VISUAL_OFFSET };
                }
            });

            posIds.forEach(posId => {
                if (!parts[posId]) {
                    delete newPos[posId];
                }
            });
            return newPos;
        });
    }, [partIds]);

    const selectedVertices = [];
    Object.keys(parts).forEach((partId) => {
        const part = parts[partId];
        const visualOffset = partPositions[partId] || { x: 0, y: 0 };
        if (part && part.selectedVertices) {
            part.selectedVertices.forEach(v => {
                const path = v.pathType === 'add' ? part.paths.add[v.pathIndex] : part.paths.subtract[v.pathIndex];
                if (path) {
                    const uniformVertices = createUniformVertices(path);
                    const vertex = uniformVertices[v.vertexIndex];
                    if (vertex) {
                        selectedVertices.push({
                            key: `${partId}-${v.pathType}-${v.pathIndex}-${v.vertexIndex}`,
                            partId: partId,
                            pathType: v.pathType,
                            pathIndex: v.pathIndex,
                            vertexIndex: v.vertexIndex,
                            vertex: { x: vertex.x + visualOffset.x, y: vertex.y + visualOffset.y }
                        });
                    }
                }
            });
        }
    });

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
        e.preventDefault();
        const pos = getCanvasPos(e);

        let closestVertex = null;
        let closestDistance = Infinity;
        let closestPartId = null;
        let closestPathType = null;
        let closestPathIndex = null;
        let closestVertexIndex = null;

        Object.keys(parts).forEach((partId) => {
            const part = parts[partId];
            if (!part) return;

            const visualOffset = partPositions[partId] || { x: 0, y: 0 };

            const findClosest = (paths, pathType) => {
                paths.forEach((path, pathIndex) => {
                    const uniformVertices = createUniformVertices(path);
                    uniformVertices.forEach((vertex, vertexIndex) => {
                        const d = distance({ x: vertex.x + visualOffset.x, y: vertex.y + visualOffset.y }, pos);
                        if (d < closestDistance && d < 10) {
                            closestVertex = vertex;
                            closestDistance = d;
                            closestPartId = partId;
                            closestPathType = pathType;
                            closestPathIndex = pathIndex;
                            closestVertexIndex = vertexIndex;
                        }
                    });
                });
            };

            findClosest(part.paths.add, 'add');
            if (part.paths.subtract) {
                findClosest(part.paths.subtract, 'subtract');
            }
        });

        if (closestVertex) {
            const vertexKey = `${closestPartId}-${closestPathType}-${closestPathIndex}-${closestVertexIndex}`;
            const isSelected = selectedVertices.some(v => v.key === vertexKey);

            let newSelectedVertices;

            if (isSelected) {
                if (isShiftPressed) {
                    newSelectedVertices = selectedVertices.filter(v => v.key !== vertexKey);
                } else {
                    newSelectedVertices = [];
                }
            } else {
                const newSelection = {
                    key: vertexKey,
                    partId: closestPartId,
                    pathType: closestPathType,
                    pathIndex: closestPathIndex,
                    vertexIndex: closestVertexIndex,
                    vertex: closestVertex
                };
                if (isShiftPressed) {
                    newSelectedVertices = [...selectedVertices, newSelection];
                } else {
                    newSelectedVertices = [newSelection];
                }
            }

            const newParts = { ...parts };
            Object.keys(newParts).forEach(pId => {
                if (newParts[pId]) {
                    newParts[pId].selectedVertices = [];
                }
            });

            newSelectedVertices.forEach(v => {
                if (!newParts[v.partId].selectedVertices) {
                    newParts[v.partId].selectedVertices = [];
                }
                newParts[v.partId].selectedVertices.push({
                    pathType: v.pathType,
                    pathIndex: v.pathIndex,
                    vertexIndex: v.vertexIndex
                });
            });

            onPartsChange(newParts);
        } else {
            let partToDrag = null;
            Object.keys(parts).reverse().forEach(partId => {
                if (partToDrag) return;
                const position = partPositions[partId];
                const imageData = partImageData[partId];

                if (imageData && position && pos.x >= position.x && pos.x <= position.x + imageData.width && pos.y >= position.y && pos.y <= position.y + imageData.height) {
                    const localX = Math.floor(pos.x - position.x);
                    const localY = Math.floor(pos.y - position.y);
                    const index = (localY * imageData.width + localX) * 4;
                    const alpha = imageData.data[index + 3];

                    if (alpha > 0) {
                        partToDrag = partId;
                    }
                }
            });

            if (partToDrag) {
                setDraggingPart({
                    partId: partToDrag,
                    offset: {
                        x: pos.x - partPositions[partToDrag].x,
                        y: pos.y - partPositions[partToDrag].y
                    }
                });
            } else {
                const newParts = { ...parts };
                let selectionChanged = false;
                Object.keys(newParts).forEach(pId => {
                    if (newParts[pId] && newParts[pId].selectedVertices && newParts[pId].selectedVertices.length > 0) {
                        newParts[pId].selectedVertices = [];
                        selectionChanged = true;
                    }
                });
                if (selectionChanged) {
                    onPartsChange(newParts);
                }
            }
        }
    };

    const handleMouseMove = (e) => {
        const pos = getCanvasPos(e);
        setCursorPos({ x: pos.x, y: pos.y, visible: true });

        if (draggingPart) {
            setPartPositions(prev => ({
                ...prev,
                [draggingPart.partId]: {
                    x: pos.x - draggingPart.offset.x,
                    y: pos.y - draggingPart.offset.y
                }
            }));
        }
    };

    const handleMouseUp = (e) => {
        setDraggingPart(null);
    };

    const handleMouseLeave = (e) => {
        setDraggingPart(null);
        setCursorPos(prev => ({...prev, visible: false}));
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !bitmaps || Object.keys(partPositions).length === 0) return;

        const ctx = canvas.getContext('2d');
        const partKeys = Object.keys(parts);
        let maxWidth = 0;
        let maxHeight = 0;

        partKeys.forEach((partId) => {
            const bitmap = bitmaps[partId];
            const position = partPositions[partId];
            if (bitmap && position) {
                maxWidth = Math.max(maxWidth, position.x + bitmap.width);
                maxHeight = Math.max(maxHeight, position.y + bitmap.height);
            }
        });

        canvas.width = Math.max(maxWidth, 500);
        canvas.height = Math.max(maxHeight, 500);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        partKeys.forEach((partId, partIndex) => {
            const part = parts[partId];
            const bitmap = bitmaps[partId];
            const position = partPositions[partId];
            if (!part || !bitmap || !position) return;

            ctx.drawImage(bitmap, position.x, position.y);

            const partColor = getColor(partIndex);
            const isPartActive = partId === activePart;

            ctx.globalAlpha = isPartActive ? 0.9 : 0.6;
            ctx.lineWidth = 1;

            const drawVertices = (paths, pathType) => {
                paths.forEach((path, pathIndex) => {
                    if (path.length > 0) {
                        const uniformVertices = createUniformVertices(path);
                        uniformVertices.forEach((point, vertexIndex) => {
                            const isSelected = selectedVertices.some(
                                v => v.key === `${partId}-${pathType}-${pathIndex}-${vertexIndex}`
                            );

                            ctx.beginPath();
                            ctx.arc(point.x + position.x, point.y + position.y, isSelected ? 6 : 4, 0, 2 * Math.PI);
                            
                            if (isSelected) {
                                ctx.fillStyle = '#F59E0B';
                                ctx.strokeStyle = '#B45309';
                            } else {
                                ctx.fillStyle = partColor;
                                ctx.strokeStyle = '#1A365D';
                            }
                            
                            ctx.fill();
                            ctx.stroke();
                        });
                    }
                });
            };

            drawVertices(part.paths.add, 'add');
            if (part.paths.subtract) {
                drawVertices(part.paths.subtract, 'subtract');
            }
        });

        if (selectedVertices && selectedVertices.length >= 3) {
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = 'red';
            ctx.strokeStyle = 'darkred';
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            
            const vertexPoints = selectedVertices.map(v => v.vertex).filter(Boolean);
            
            if (vertexPoints.length >= 3) {
                ctx.moveTo(vertexPoints[0].x, vertexPoints[0].y);
                for (let i = 1; i < vertexPoints.length; i++) {
                    ctx.lineTo(vertexPoints[i].x, vertexPoints[i].y);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        }

        ctx.globalAlpha = 1.0;

        if (parts[activePart] && parts[activePart].anchor) {
            const part = parts[activePart];
            const params = animationParams[activePart];
            const position = partPositions[activePart];

            if (params && position) {
                ctx.save();
                ctx.setLineDash([4, 4]);
                ctx.strokeStyle = '#34D399';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.ellipse(part.anchor.x + position.x, part.anchor.y + position.y, Math.abs(params.moveX), Math.abs(params.moveY), 0, 0, 2 * Math.PI);
                ctx.stroke();
                ctx.restore();
            }

            if (position) {
                ctx.strokeStyle = '#34D399';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(part.anchor.x + position.x - 6, part.anchor.y + position.y);
                ctx.lineTo(part.anchor.x + position.x + 6, part.anchor.y + position.y);
                ctx.moveTo(part.anchor.x + position.x, part.anchor.y + position.y - 6);
                ctx.lineTo(part.anchor.x + position.x, part.anchor.y + position.y + 6);
                ctx.stroke();
            }
        }
    }, [bitmaps, parts, activePart, animationParams, partPositions, draggingPart]);

    return (
        <div className="bg-gray-900 rounded-lg p-4 flex flex-col items-center justify-center relative">
            <div className="w-full mb-2">
                <h3 className="text-lg font-semibold text-gray-300">Vertex Editor</h3>
                <div className="text-xs text-gray-400 bg-gray-950 p-2 rounded-md flex items-start gap-2">
                    <AlertTriangle size={24} className="text-yellow-400 flex-shrink-0"/>
                    <div>
                        Click and drag on a part to move it. Click the background to deselect all vertices. Hold <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-md">Shift</kbd> to select multiple vertices. 
                        Selected vertices will be used to create a polygon for animation.
                    </div>
                </div>
            </div>
            <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown} 
                onMouseMove={handleMouseMove} 
                onMouseUp={handleMouseUp} 
                onMouseLeave={handleMouseLeave}
                className="max-w-full max-h-[80vh] min-h-[400px] object-contain cursor-grab"
                style={{ touchAction: 'none' }}
            />
            <Magnifier sourceCanvasRef={canvasRef} cursorPos={cursorPos} zoomLevel={4} />
        </div>
    );
};

export default VertexEditor;
