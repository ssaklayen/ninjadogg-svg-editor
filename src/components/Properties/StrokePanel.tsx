// src/components/Properties/StrokePanel.tsx
import React from 'react';
import { useColorPicker } from '../../hooks/useColorPicker';
import { ColorPicker } from '../Panels/ColorPicker';

interface StrokePanelProps {
    isStrokeEnabled: boolean;
    onStrokeToggle: (enabled: boolean) => void;
    strokeColor: string;
    onStrokeColorChange: (color: string) => void;
    strokeWidth: number;
    onStrokeWidthChange: (width: number) => void;
    strokeWidthPlaceholder?: string;
    onCommit?: () => void;
}

export const StrokePanel = (props: StrokePanelProps) => {
    const { isStrokeEnabled, onStrokeToggle, strokeColor, onStrokeColorChange, strokeWidth, onStrokeWidthChange, strokeWidthPlaceholder, onCommit } = props;
    const { isOpen, openPicker, closePicker, pickerRef, triggerRef, position } = useColorPicker(() => {
        if (onCommit) onCommit();
    });

    return (
        <div className="flex flex-col gap-3 border-b border-background-secondary pb-4">
            <div className="flex items-center justify-between">
                <label className="font-semibold text-text-muted">Stroke</label>
                <button
                    onClick={() => onStrokeToggle(!isStrokeEnabled)}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 ${isStrokeEnabled ? 'bg-accent-primary' : 'bg-border-secondary'}`}>
                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isStrokeEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
            {isStrokeEnabled && (
                <div className="pl-1 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <label className="text-text-secondary">Color</label>
                        <div className="flex items-center gap-2">
                            <button
                                ref={triggerRef}
                                onClick={openPicker}
                                className="w-10 h-6 p-0 border border-border-secondary rounded-md bg-transparent cursor-pointer"
                                style={{ backgroundColor: strokeColor }}
                            />
                            {isOpen && (
                                <ColorPicker
                                    ref={pickerRef}
                                    position={position}
                                    initialColor={strokeColor}
                                    onChange={onStrokeColorChange}
                                    onClose={closePicker}
                                />
                            )}
                            <input type="text" value={strokeColor} onChange={e => onStrokeColorChange(e.target.value)} onBlur={() => onCommit && onCommit()} className="w-20 bg-background-secondary rounded p-1 text-text-primary text-center text-xs" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="text-text-secondary">Width</label>
                        <input
                            type="number"
                            min="0"
                            max="500"
                            value={strokeWidth}
                            onChange={e => onStrokeWidthChange(parseInt(e.target.value, 10))}
                            onBlur={() => onCommit && onCommit()}
                            placeholder={strokeWidthPlaceholder}
                            className="w-20 bg-background-secondary rounded p-1 text-text-primary text-center text-xs" />
                    </div>
                </div>
            )}
        </div>
    );
};