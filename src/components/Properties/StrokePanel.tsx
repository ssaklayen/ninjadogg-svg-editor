import React, { useState, useRef, useEffect } from 'react';
import { useColorPicker } from '../../hooks/useColorPicker';
import { ColorPicker } from '../Panels/ColorPicker';

interface StrokePanelProps {
    isStrokeEnabled: boolean;
    onStrokeToggle: (enabled: boolean) => void;
    strokeColor: string | undefined;
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
    const [isEditingHex, setIsEditingHex] = useState(false);
    const [editingHexValue, setEditingHexValue] = useState((strokeColor ?? '#000000').substring(1).toUpperCase());
    const hexInputRef = useRef<HTMLInputElement>(null);

    const displayColor = strokeColor ?? '#000000';
    const isMixedValue = strokeColor === undefined;

    useEffect(() => {
        if (!isEditingHex) {
            setEditingHexValue(displayColor.substring(1).toUpperCase());
        }
    }, [strokeColor, isEditingHex, displayColor]);

    useEffect(() => {
        if (isEditingHex && hexInputRef.current) {
            hexInputRef.current.focus();
            hexInputRef.current.select();
        }
    }, [isEditingHex]);

    const handleHexDoubleClick = () => {
        setEditingHexValue(displayColor.substring(1).toUpperCase());
        setIsEditingHex(true);
    };

    const handleHexBlur = () => {
        setIsEditingHex(false);
    };

    const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const sanitizedValue = e.target.value.replace(/[^0-9A-F]/gi, '').toUpperCase().slice(0, 6);
        setEditingHexValue(sanitizedValue);
    };

    const handleHexKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const finalHex = editingHexValue.padStart(6, '0');
            onStrokeColorChange(`#${finalHex}`);
            if (onCommit) {
                onCommit();
            }
            hexInputRef.current?.blur();
        } else if (e.key === 'Escape') {
            hexInputRef.current?.blur();
        }
    }

    return (
        <div className="flex flex-col gap-3 border-b border-background-secondary pb-4">
            <div className="flex items-center justify-between">
                <label className="font-semibold text-text-muted select-none">Stroke</label>
                <button
                    onClick={() => onStrokeToggle(!isStrokeEnabled)}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 ${isStrokeEnabled ? 'bg-accent-primary' : 'bg-border-secondary'}`}>
                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isStrokeEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
            {isStrokeEnabled && (
                <div className="pl-1 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <label className="text-text-secondary select-none">Color</label>
                        <div className="flex items-center gap-2">
                            <button
                                ref={triggerRef}
                                onClick={openPicker}
                                className="w-10 h-6 p-0 border border-border-secondary rounded-md bg-transparent cursor-pointer"
                                style={{ background: isMixedValue ? 'linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)' : displayColor }}
                            />
                            {isOpen && (
                                <ColorPicker
                                    ref={pickerRef}
                                    position={position}
                                    initialColor={displayColor}
                                    onChange={onStrokeColorChange}
                                    onClose={closePicker}
                                />
                            )}
                            <div className="relative" onDoubleClick={handleHexDoubleClick}>
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted select-none text-xs">#</span>
                                <input
                                    ref={hexInputRef}
                                    type="text"
                                    value={isEditingHex ? editingHexValue : (isMixedValue ? '' : displayColor.substring(1).toUpperCase())}
                                    placeholder={isMixedValue ? 'Multi' : ''}
                                    onBlur={handleHexBlur}
                                    onChange={handleHexChange}
                                    onKeyDown={handleHexKeyDown}
                                    readOnly={!isEditingHex}
                                    className={`w-20 bg-background-secondary rounded p-1 text-text-primary text-center text-xs font-mono placeholder:text-text-muted ${!isEditingHex ? 'select-none cursor-default' : ''}`}
                                    maxLength={6}
                                    tabIndex={!isEditingHex ? -1 : 0}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="text-text-secondary select-none">Width</label>
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