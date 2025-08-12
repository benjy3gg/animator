import React, { useState } from 'react';
import { PlusCircle, MousePointer, ArrowUp, ArrowDown, Copy, Trash2 } from 'lucide-react';

const PartManager = ({ parts, partOrder, setPartOrder, activePart, setActivePart, addPart, deletePart, duplicatePart }) => {
    const [newName, setNewName] = useState('');

    const handleAdd = (e) => {
        e.preventDefault();
        addPart(newName);
        setNewName('');
    };

    const movePart = (index, direction) => {
        if ((index === 0 && direction === -1) || (index === partOrder.length - 1 && direction === 1)) {
            return;
        }
        const newPartOrder = [...partOrder];
        const [movedItem] = newPartOrder.splice(index, 1);
        newPartOrder.splice(index + direction, 0, movedItem);
        setPartOrder(newPartOrder);
    };

    return (
        <div className="bg-gray-900/50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-cyan-300 mb-3">1. Manage Parts & Layers</h3>
            <form onSubmit={handleAdd} className="flex gap-2 mb-3">
                <input 
                    type="text" 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                    placeholder="New part name..."
                    className="flex-grow bg-gray-700 text-white rounded-md px-3 py-2 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 p-2 rounded-md"><PlusCircle size={20}/></button>
            </form>
            <div className="space-y-2 max-h-48 overflow-y-auto">
                {partOrder.length === 0 && <p className="text-gray-500 text-sm p-2">No parts added yet.</p>}
                {partOrder.map((partKey, index) => (
                    <div key={partKey} className={`w-full p-2 rounded-lg transition-all duration-200 flex items-center justify-between ${activePart === partKey ? 'bg-cyan-500 ring-2 ring-cyan-300' : 'bg-gray-700'}`}>
                        <button onClick={() => setActivePart(partKey)} className="flex-grow text-left flex items-center gap-3">
                            <MousePointer size={18} /> {partKey}
                        </button>
                        <div className="flex items-center">
                            <button onClick={() => movePart(index, -1)} disabled={index === 0} className="p-1 disabled:opacity-20"><ArrowUp size={18}/></button>
                            <button onClick={() => movePart(index, 1)} disabled={index === partOrder.length - 1} className="p-1 disabled:opacity-20"><ArrowDown size={18}/></button>
                            <button onClick={() => duplicatePart(partKey)} className="text-blue-400 hover:text-blue-300 p-1"><Copy size={18}/></button>
                            <button onClick={() => deletePart(partKey)} className="text-red-400 hover:text-red-300 p-1"><Trash2 size={18}/></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PartManager;