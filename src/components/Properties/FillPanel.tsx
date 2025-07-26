// A reusable UI component for editing the fill properties (solid or gradient)
// of an object or the canvas.
import React from 'react';
import { IGradientOptions } from '../../types/types';
import { GradientPicker } from '../Panels/GradientPicker';
import { useColorPicker } from '../../hooks/useColorPicker';
import { ColorPicker } from '../Panels/ColorPicker';

interface FillPanelProps {
    isFillEnabled: boolean;
    onFillToggle: (enabled: boolean) => void;
    fillType: 'solid' | 'gradient';
    onFillTypeChange: (type: 'solid' | 'gradient') => void;
    solidColor: string;
    onSolidColorChange: (color: string) => void;
    gradient: IGradientOptions | null;
    onGradientChange: (gradient: IGradientOptions) => void;
    onGradientCommit: (gradient: IGradientOptions) => void;
    onCommit?: () => void;
}

export const FillPanel = (props: FillPanelProps) => {
    const { isFillEnabled, onFillToggle, fillType, onFillTypeChange, solidColor, onSolidColorChange, gradient, onGradientChange, onGradientCommit, onCommit } = props;
    const { isOpen, openPicker, closePicker, pickerRef, triggerRef, position } = useColorPicker(() => {
        if (onCommit) onCommit();
    });

    return (
        <div className="flex flex-col gap-3 border-b border-background-secondary pb-4">
            <div className="flex items-center justify-between">
                <label className="font-semibold text-text-muted select-none">Fill</label>
                <button
                    onClick={() => onFillToggle(!isFillEnabled)}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 ${isFillEnabled ? 'bg-accent-primary' : 'bg-border-secondary'}`}>
                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isFillEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
            {isFillEnabled && (
                <div className="pl-1 flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <button onClick={() => onFillTypeChange('solid')} className={`p-1.5 rounded-l-md ${fillType === 'solid' ? 'bg-accent-primary text-text-primary' : 'bg-background-tertiary hover:bg-border-secondary'}`}>Solid</button>
                        <button onClick={() => onFillTypeChange('gradient')} className={`p-1.5 rounded-r-md ${fillType === 'gradient' ? 'bg-accent-primary text-text-primary' : 'bg-background-tertiary hover:bg-border-secondary'}`}>Gradient</button>
                    </div>
                    {fillType === 'solid' ? (
                        <div className="flex items-center justify-between">
                            <label className="text-text-secondary select-none">Color</label>
                            <div className="flex items-center gap-2">
                                <button
                                    ref={triggerRef}
                                    onClick={openPicker}
                                    className="w-10 h-6 p-0 border border-border-secondary rounded-md bg-transparent cursor-pointer"
                                    style={{ backgroundColor: solidColor }}
                                />
                                {isOpen && (
                                    <ColorPicker
                                        ref={pickerRef}
                                        position={position}
                                        initialColor={solidColor}
                                        onChange={onSolidColorChange}
                                        onClose={closePicker}
                                    />
                                )}
                                <input type="text" value={solidColor} onChange={e => onSolidColorChange(e.target.value)} onBlur={() => onCommit && onCommit()} className="w-20 bg-background-secondary rounded p-1 text-text-primary text-center text-xs" />
                            </div>
                        </div>
                    ) : (
                        gradient && <GradientPicker gradient={gradient} onChange={onGradientChange} onCommit={onGradientCommit} />
                    )}
                </div>
            )}
        </div>
    );
};