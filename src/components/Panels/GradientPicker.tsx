// A reusable UI component for creating and editing gradients (linear or radial).
// It allows for adding, removing, and modifying color stops and their positions.
import React from 'react';
import { IGradientOptions } from '../../types/types';
import { Trash2, Plus, ArrowRightLeft } from 'lucide-react';
import { uniqueId } from '../../utils/uniqueId';

interface GradientPickerProps {
    gradient: IGradientOptions | null;
    onChange: (gradient: IGradientOptions) => void;
    onCommit: (gradient: IGradientOptions) => void;
}

// The main component for the gradient editor panel.
// @param gradient - The current gradient object to be edited.
// @param onChange - Callback for live updates as the user interacts (e.g., dragging a slider).
// @param onCommit - Callback for when the change is finalized (e.g., on mouse up or color change).
export const GradientPicker = ({ gradient, onChange, onCommit }: GradientPickerProps) => {
    if (!gradient) return null;

    // Helper to call both onChange and onCommit for a finalized change.
    const handleCommit = (newGradient: IGradientOptions) => {
        onChange(newGradient);
        onCommit(newGradient);
    };

    const handleTypeChange = (type: 'linear' | 'radial') => {
        handleCommit({ ...gradient, type });
    };

    const handleColorChange = (index: number, color: string) => {
        const newStops = [...gradient.colorStops];
        newStops[index].color = color;
        handleCommit({ ...gradient, colorStops: newStops });
    };

    const handleOffsetChange = (index: number, offset: number) => {
        const newStops = [...gradient.colorStops];
        const prevStopOffset = index > 0 ? newStops[index - 1].offset : 0;
        const nextStopOffset = index < newStops.length - 1 ? newStops[index + 1].offset : 1;
        const clampedOffset = Math.max(prevStopOffset, Math.min(offset, nextStopOffset));
        newStops[index].offset = clampedOffset;
        // Use `onChange` for live preview without adding to history.
        onChange({ ...gradient, colorStops: newStops });
    };

    // Commits the changes after a slider is released, ensuring stops are sorted.
    const handleSliderMouseUp = () => {
        const newStops = [...gradient.colorStops];
        newStops.sort((a, b) => a.offset - b.offset);
        onCommit({ ...gradient, colorStops: newStops });
    };

    const addColorStop = () => {
        if (gradient.colorStops.length >= 5) return;
        const newStops = [...gradient.colorStops, { id: uniqueId(), offset: 0.5, color: '#000000' }];
        newStops.sort((a, b) => a.offset - b.offset);
        handleCommit({ ...gradient, colorStops: newStops });
    };

    const removeColorStop = (index: number) => {
        if (gradient.colorStops.length <= 2) return;
        const newStops = gradient.colorStops.filter((_, i) => i !== index);
        handleCommit({ ...gradient, colorStops: newStops });
    };


    const handleReverseGradient = () => {
        if (!gradient) return;
        const reversedStops = [...gradient.colorStops].reverse().map(stop => ({
            ...stop,
            offset: 1 - stop.offset,
        }));
        handleCommit({ ...gradient, colorStops: reversedStops });
    };

    const gradientCss = `linear-gradient(to right, ${[...gradient.colorStops].sort((a,b) => a.offset - b.offset).map(s => `${s.color} ${s.offset * 100}%`).join(', ')})`;

    return (
        <div className="flex flex-col gap-3 text-text-primary bg-background-tertiary rounded-lg p-3">
            <div className="flex items-center">
                <div className="flex items-center gap-2 text-xs">
                    <button
                        type="button"
                        onClick={() => handleTypeChange('linear')}
                        className={`px-3 py-1 rounded-md ${gradient.type === 'linear' ? 'bg-accent-primary text-text-primary' : 'bg-background-secondary hover:bg-border-secondary'}`}
                    >
                        Linear
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTypeChange('radial')}
                        className={`px-3 py-1 rounded-md ${gradient.type === 'radial' ? 'bg-accent-primary text-text-primary' : 'bg-background-secondary hover:bg-border-secondary'}`}
                    >
                        Radial
                    </button>
                </div>
                <div className="flex-grow" />
                <div className="flex items-center">
                    <button type="button" onClick={handleReverseGradient} className="p-1.5 hover:bg-border-secondary rounded-md" title="Reverse Gradient">
                        <ArrowRightLeft size={14} />
                    </button>
                    <button type="button" onClick={addColorStop} className="p-1.5 hover:bg-border-secondary rounded-md" title="Add Color Stop">
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            <div className="relative w-full h-6 rounded-md" style={{ background: gradientCss }} title="Gradient Preview">
                {gradient.colorStops.map((stop) => (
                    <div
                        key={stop.id}
                        className="absolute top-1/2 -translate-y-1/2 p-0.5 w-4 h-4 rounded-full bg-white shadow-md cursor-pointer"
                        style={{ left: `calc(${stop.offset * 100}% - 8px)` }}
                    >
                        <div className="w-full h-full rounded-full" style={{backgroundColor: stop.color}}/>
                    </div>
                ))}
            </div>

            <div className="flex flex-col gap-3">
                {gradient.colorStops.map((stop, index) => (
                    <div key={stop.id} className="flex flex-col gap-2 bg-background-secondary/50 p-2 rounded-md">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={stop.color}
                                    onChange={(e) => handleColorChange(index, e.target.value)}
                                    className="w-6 h-6 p-0 border-none bg-transparent cursor-pointer"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-text-muted w-8 text-center">{Math.round(stop.offset * 100)}%</span>
                                {gradient.colorStops.length > 2 && (
                                    <button onClick={() => removeColorStop(index)} className="p-1 text-text-muted hover:text-text-primary hover:bg-border-secondary rounded-md" title="Remove Color Stop">
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={stop.offset}
                            onChange={e => handleOffsetChange(index, parseFloat(e.target.value))}
                            onMouseUp={handleSliderMouseUp}
                            className="w-full h-2 bg-border-secondary rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};