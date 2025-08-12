import React from 'react';
import { RotateCcw, Play, Zap } from 'lucide-react';

const AnimationControls = ({ partKey, params, setAnimationParams }) => {
    const handleParamChange = (param, value) => {
        setAnimationParams(prev => ({
            ...prev,
            [partKey]: { ...prev[partKey], [param]: param === 'tintColor' ? value : Number(value) }
        }));
    };

    const Control = ({ param, label, icon, min, max, step }) => (
        <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                {icon} {label} ({params[param]})
            </label>
            <input
                type="range"
                min={min} max={max} step={step || 1} value={params[param]}
                onChange={(e) => handleParamChange(param, e.target.value)}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
        </div>
    );

    const ColorControl = ({ param, label, icon }) => (
        <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                {icon} {label}
            </label>
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    value={params[param]}
                    onChange={(e) => handleParamChange(param, e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-gray-600"
                />
                <span className="text-sm text-gray-300">{params[param]}</span>
            </div>
        </div>
    );

    return (
        <div className="bg-gray-900/50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-cyan-300 mb-3">3. Animate '{partKey}'</h3>
            <div className="space-y-4">
                <Control param="rotation" label="Rotation (°)" icon={<RotateCcw size={16} />} min="-45" max="45" step="1" />
                <Control param="moveX" label="Horizontal Move" icon={<Play className="rotate-0" size={16} />} min="-10" max="10" step="0.1" />
                <Control param="moveY" label="Vertical Move" icon={<Play className="-rotate-90" size={16} />} min="-10" max="10" step="0.1" />
                <Control param="scale" label="Scale" icon={<Zap size={16} />} min="0.5" max="2" step="0.05" />
                <Control param="speed" label="Speed" icon={<Zap size={16} />} min="1" max="5" step="0.5" />
                <Control param="offset" label="Phase Offset" icon={<Play className="rotate-180" size={16} />} min="0" max="360" />

                <div className="border-t border-gray-700 pt-4 mt-4">
                    <h4 className="text-md font-semibold text-cyan-300 mb-3">Color Effects</h4>
                    <div className="space-y-4">
                        <ColorControl param="tintColor" label="Tint Color" icon={<Zap size={16} />} />
                        <Control param="tintIntensity" label="Tint Intensity" icon={<Zap size={16} />} min="0" max="1" step="0.05" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnimationControls;