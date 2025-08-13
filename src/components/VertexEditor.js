import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
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

const partColors = ['#4299E1', '#F56565', '#48BB78', '#ED8936', '#9F7AEA', '#38B2AC'];
const groupColors = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#F97316'];
const getColor = (index) => partColors[index % partColors.length];
const getGroupColor = (index) => groupColors[index % groupColors.length];
const VISUAL_OFFSET = 50;

const VertexEditor = ({ bitmaps, parts, activePart, onPartsChange, animationParams, vertexGroups, setVertexGroups, activeVertexGroupIndex, setActiveVertexGroupIndex }) => {
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

        if (e.altKey) {
            let partUnderCursor = null;
            let localPos = null;

            const partKeys = Object.keys(parts).reverse();
            for (const partId of partKeys) {
                const position = partPositions[partId];
                const imageData = partImageData[partId];

                if (imageData && position && pos.x >= position.x && pos.x <= position.x + imageData.width && pos.y >= position.y && pos.y <= position.y + imageData.height) {
                    const localX = Math.floor(pos.x - position.x);
                    const localY = Math.floor(pos.y - position.y);
                    const index = (localY * imageData.width + localX) * 4;
                    const alpha = imageData.data[index + 3];

                    if (alpha > 0) {
                        const r = imageData.data[index];
                        const g = imageData.data[index + 1];
                        const b = imageData.data[index + 2];
                        const a = alpha / 255;
                        const pickedColor = `rgba(${r}, ${g}, ${b}, ${a})`;

                        const newVertexGroups = [...vertexGroups];
                        const currentGroup = newVertexGroups[activeVertexGroupIndex] || { vertices: [], color: null };
                        
                        newVertexGroups[activeVertexGroupIndex] = {
                            vertices: Array.isArray(currentGroup) ? currentGroup : currentGroup.vertices,
                            color: pickedColor
                        };
                        setVertexGroups(newVertexGroups);
                        return; 
                    }
                }
            }
            return; 
        }

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
            const vertexData = { partId: closestPartId, pathType: closestPathType, pathIndex: closestPathIndex, vertexIndex: closestVertexIndex };
            const currentGroupData = vertexGroups[activeVertexGroupIndex] || { vertices: [], color: null };
            const currentVertices = Array.isArray(currentGroupData) ? currentGroupData : currentGroupData.vertices;

            const isSelected = currentVertices.some(v => 
                v.partId === vertexData.partId &&
                v.pathType === vertexData.pathType &&
                v.pathIndex === vertexData.pathIndex &&
                v.vertexIndex === vertexData.vertexIndex
            );

            let newVertices;

            if (isSelected) {
                if (isShiftPressed) {
                    newVertices = currentVertices.filter(v => 
                        !(v.partId === vertexData.partId &&
                        v.pathType === vertexData.pathType &&
                        v.pathIndex === vertexData.pathIndex &&
                        v.vertexIndex === vertexData.vertexIndex)
                    );
                } else {
                    newVertices = [];
                }
            } else {
                if (isShiftPressed) {
                    newVertices = [...currentVertices, vertexData];
                } else {
                    newVertices = [vertexData];
                }
            }
            const newVertexGroups = [...vertexGroups];
            newVertexGroups[activeVertexGroupIndex] = {
                vertices: newVertices,
                color: Array.isArray(currentGroupData) ? null : currentGroupData.color
            };
            setVertexGroups(newVertexGroups);

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

    const addGroup = () => {
        setVertexGroups([...vertexGroups, { vertices: [], color: null }]);
        setActiveVertexGroupIndex(vertexGroups.length);
    };

    const deleteGroup = (index) => {
        const newGroups = vertexGroups.filter((_, i) => i !== index);
        setVertexGroups(newGroups);
        if (activeVertexGroupIndex >= newGroups.length) {
            setActiveVertexGroupIndex(Math.max(0, newGroups.length - 1));
        }
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
                            let isSelectedInAnyGroup = false;
                            let selectionGroupIndex = -1;
                            vertexGroups.forEach((groupData, i) => {
                                const vertices = Array.isArray(groupData) ? groupData : groupData.vertices;
                                if (vertices.some(v => v.partId === partId && v.pathType === pathType && v.pathIndex === pathIndex && v.vertexIndex === vertexIndex)) {
                                    isSelectedInAnyGroup = true;
                                    selectionGroupIndex = i;
                                }
                            });

                            ctx.beginPath();
                            ctx.arc(point.x + position.x, point.y + position.y, isSelectedInAnyGroup ? 6 : 4, 0, 2 * Math.PI);
                            
                            if (isSelectedInAnyGroup) {
                                ctx.fillStyle = getGroupColor(selectionGroupIndex);
                                ctx.strokeStyle = '#1A365D';
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

        vertexGroups.forEach((groupData, groupIndex) => {
            const vertices = Array.isArray(groupData) ? groupData : groupData.vertices;
            const customColor = (groupData && !Array.isArray(groupData)) ? groupData.color : null;
            if (vertices.length >= 3) {
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = customColor || getGroupColor(groupIndex);
                ctx.strokeStyle = 'darkred';
                ctx.lineWidth = 2;
                
                ctx.beginPath();
                
                const vertexPoints = vertices.map(v => {
                    const part = parts[v.partId];
                    const position = partPositions[v.partId];
                    if (!part || !position) return null;
                    const path = v.pathType === 'add' ? part.paths.add[v.pathIndex] : (part.paths.subtract && part.paths.subtract[v.pathIndex]);
                    if (!path) return null;
                    const uniformVertices = createUniformVertices(path);
                    const vertex = uniformVertices[v.vertexIndex];
                    if (!vertex) return null;
                    return { x: vertex.x + position.x, y: vertex.y + position.y };
                }).filter(Boolean);

                if (vertexPoints.length >= 3) {
                    const hullVertices = createConvexHull([...vertexPoints]);
                    if (hullVertices.length < 3) return;

                    ctx.moveTo(hullVertices[0].x, hullVertices[0].y);
                    for (let i = 1; i < hullVertices.length; i++) {
                        ctx.lineTo(hullVertices[i].x, hullVertices[i].y);
                    }
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }
            }
        });
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
    }, [bitmaps, parts, activePart, animationParams, partPositions, draggingPart, partImageData, vertexGroups, activeVertexGroupIndex]);

    return (
        <div className="bg-gray-900 rounded-lg p-4 flex flex-col items-center justify-center relative">
            <div className="w-full mb-2">
                <h3 className="text-lg font-semibold text-gray-300">Vertex Editor</h3>
                <div className="flex items-center gap-2 mb-2">
                    {vertexGroups.map((groupData, index) => (
                        <div key={index} className="flex items-center">
                            <div 
                                className="w-6 h-8 rounded-l-md border-2 border-r-0 border-gray-600"
                                style={{ backgroundColor: (groupData && groupData.color) || 'transparent' }}
                            ></div>
                            <button
                                className={`px-3 py-1 text-sm ${
                                    activeVertexGroupIndex === index ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
                                } ${(groupData && groupData.color) ? '' : 'rounded-l-md'}`}
                                onClick={() => setActiveVertexGroupIndex(index)}
                            >
                                Group {index + 1}
                            </button>
                            <button
                                className="bg-red-600 text-white p-1.5 rounded-r-md hover:bg-red-700 disabled:bg-gray-500 flex-shrink-0"
                                onClick={() => deleteGroup(index)}
                                disabled={vertexGroups.length === 1}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                    <button
                        className="bg-green-600 text-white p-1.5 rounded-md hover:bg-green-700 flex-shrink-0"
                        onClick={addGroup}
                    >
                        <Plus size={16} />
                    </button>
                </div>
                <div className="text-xs text-gray-400 bg-gray-950 p-2 rounded-md flex items-start gap-2">
                    <AlertTriangle size={24} className="text-yellow-400 flex-shrink-0"/>
                    <div>
                        Click a part to drag it. Click a vertex to select it. Hold <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-md">Shift</kbd> to select multiple vertices.
                        Hold <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-md">Alt</kbd> and click a part to pick a color for the current group's polygon.
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
