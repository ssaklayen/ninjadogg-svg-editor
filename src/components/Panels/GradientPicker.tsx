// FILE: src\components\Panels\GradientPicker.tsx
import React from 'react';
import { IGradientOptions, IGradientColorStop } from '../../types/types';
import { Trash2, Plus, ArrowRightLeft } from 'lucide-react';
import { uniqueId } from '../../utils/uniqueId';
import { useColorPicker } from '../../hooks/useColorPicker';
import { ColorPicker } from './ColorPicker';

interface GradientPickerProps {
    gradient: IGradientOptions | null;
    onChange: (gradient: IGradientOptions) => void;
    onCommit: (gradient: IGradientOptions) => void;
}

interface ColorStopItemProps {
    stop: IGradientColorStop;
    index: number;
    isRemovable: boolean;
    onColorChange: (index: number, color: string) => void;
    onOffsetChange: (index: number, offset: number) => void;
    onSliderMouseUp: () => void;
    onRemove: (index: number) => void;
}

const ColorStopItem = ({ stop, index, isRemovable, onColorChange, onOffsetChange, onSliderMouseUp, onRemove }: ColorStopItemProps) => {
    const { isOpen, openPicker, closePicker, pickerRef, triggerRef, position } = useColorPicker(() => onSliderMouseUp());

    return (
        <div className="flex flex-col gap-2 bg-background-secondary/50 p-2 rounded-md">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        ref={triggerRef}
                        type="button"
                        onClick={openPicker}
                        className="w-6 h-6 p-0 border border-border-secondary rounded-md cursor-pointer"
                        style={{ backgroundColor: stop.color }}
                    />
                    {isOpen && (
                        <ColorPicker
                            ref={pickerRef}
                            position={position}
                            initialColor={stop.color}
                            onChange={(color) => onColorChange(index, color)}
                            onClose={closePicker}
                        />
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted w-8 text-center">{Math.round(stop.offset * 100)}%</span>
                    {isRemovable && (
                        <button onClick={() => onRemove(index)} className="p-1 text-text-muted hover:text-text-primary hover:bg-border-secondary rounded-md" title="Remove Color Stop">
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
                onChange={e => onOffsetChange(index, parseFloat(e.target.value))}
                onMouseUp={onSliderMouseUp}
                className="w-full h-1.5 bg-border-secondary rounded-lg appearance-none cursor-pointer accent-accent-primary-hover"
            />
        </div>
    );
};

export const GradientPicker = ({ gradient, onChange, onCommit }: GradientPickerProps) => {
    if (!gradient) return null;

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
        onChange({ ...gradient, colorStops: newStops });
    };

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
                    <ColorStopItem
                        key={stop.id}
                        stop={stop}
                        index={index}
                        isRemovable={gradient.colorStops.length > 2}
                        onColorChange={handleColorChange}
                        onOffsetChange={handleOffsetChange}
                        onSliderMouseUp={handleSliderMouseUp}
                        onRemove={removeColorStop}
                    />
                ))}
            </div>
        </div>
    );
};